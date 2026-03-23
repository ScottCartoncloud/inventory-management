import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Package, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, useCreateProduct, useBulkUpsertMappings, type DBProduct } from "@/hooks/useProducts";
import type { Connection } from "@/hooks/useConnections";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CCProduct {
  id: string;
  code?: string;
  name: string;
  description?: string;
  barcode?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  references?: { code?: string; numericId?: string };
  unitsOfMeasure?: { type: string; name: string; quantity: number }[];
}

interface ProductSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection;
}

export function ProductSyncDialog({ open, onOpenChange, connection }: ProductSyncDialogProps) {
  const { data: products = [] } = useProducts();
  const createProduct = useCreateProduct();
  const bulkUpsertMappings = useBulkUpsertMappings();
  const queryClient = useQueryClient();

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ matched: number; created: number } | null>(null);

  async function fetchAllCCProducts(): Promise<CCProduct[]> {
    const allProducts: CCProduct[] = [];
    let page = 1;

    while (true) {
      const { data, error } = await supabase.functions.invoke("cartoncloud-proxy", {
        body: {
          connectionId: connection.id,
          method: "POST",
          path: `warehouse-products/search?page=${page}&size=50`,
          body: { condition: { type: "AndCondition", conditions: [] } },
        },
      });
      if (error) throw error;
      const items = Array.isArray(data) ? data : [];
      // Extract product info from warehouse-product response structure
      const mapped: CCProduct[] = items.map((wp: any) => ({
        id: wp.details?.product?.id || wp.id,
        code: wp.details?.product?.references?.code,
        name: wp.details?.product?.name || wp.name || "",
        description: wp.description,
        barcode: wp.barcode,
        weight: wp.weight,
        width: wp.width,
        height: wp.height,
        length: wp.length,
        references: wp.details?.product?.references || wp.references,
        unitsOfMeasure: wp.details?.unitOfMeasure
          ? [{ type: wp.details.unitOfMeasure.type, name: wp.details.unitOfMeasure.name, quantity: 1 }]
          : [],
      }));
      allProducts.push(...mapped);
      if (items.length < 50 || page >= 100) break;
      page++;
    }

    return allProducts;
  }

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const ccProducts = await fetchAllCCProducts();

      // Build lookup by SKU (references.code) and deduplicate CC products by code
      const portalBySku = new Map<string, DBProduct>();
      for (const p of products) {
        portalBySku.set(p.sku.toLowerCase(), p);
      }

      // Deduplicate CC products by code (keep first occurrence)
      const seenCodes = new Set<string>();
      const dedupedCCProducts = ccProducts.filter(cc => {
        const code = (cc.references?.code || cc.code || "").toLowerCase();
        if (!code || seenCodes.has(code)) return false;
        seenCodes.add(code);
        return true;
      });

      let matched = 0;
      let created = 0;
      const allMappings: {
        product_id: string;
        connection_id: string;
        cc_product_code: string;
        cc_product_id: string | null;
        is_override: boolean;
      }[] = [];

      for (const cc of dedupedCCProducts) {
        const ccCode = cc.references?.code || cc.code || "";
        if (!ccCode) {
          console.warn("Skipping CC product with no code:", cc.id, cc.name);
          continue;
        }
        const portal = portalBySku.get(ccCode.toLowerCase());

        if (portal) {
          // Match found
          allMappings.push({
            product_id: portal.id,
            connection_id: connection.id,
            cc_product_code: ccCode,
            cc_product_id: cc.id,
            is_override: false,
          });
          matched++;
        } else {
          // No match — create new product
          const uoms = (cc.unitsOfMeasure || []).map((u, i) => ({
            name: u.name,
            qty: u.quantity,
            sort_order: i,
          }));

          const newProduct = await createProduct.mutateAsync({
            product: {
              sku: ccCode,
              name: cc.name || ccCode,
              category: "General",
              unit: "CTN",
              min_qty: 0,
              barcode: cc.barcode || null,
              supplier: null,
              cost_price: 0,
              sell_price: 0,
              tax_rate: 10,
              weight: cc.weight || null,
              weight_unit: "kg",
              length: cc.length ? cc.length * 100 : null,
              width: cc.width ? cc.width * 100 : null,
              height: cc.height ? cc.height * 100 : null,
              dim_unit: "cm",
              notes: cc.description || null,
            },
            uoms,
          });

          allMappings.push({
            product_id: newProduct.id,
            connection_id: connection.id,
            cc_product_code: ccCode,
            cc_product_id: cc.id,
            is_override: false,
          });
          created++;
        }
      }

      // Bulk upsert all mappings (deduplicate by product_id+connection_id)
      const dedupKey = (m: typeof allMappings[0]) => `${m.product_id}::${m.connection_id}`;
      const dedupMap = new Map(allMappings.map(m => [dedupKey(m), m]));
      const uniqueMappings = Array.from(dedupMap.values());
      if (uniqueMappings.length > 0) {
        await bulkUpsertMappings.mutateAsync(uniqueMappings);
      }

      // Update connection sync stats
      await supabase
        .from("connections")
        .update({
          product_last_synced_at: new Date().toISOString(),
          product_last_sync_matched: matched,
          product_last_sync_unmatched_cc: created,
          product_last_sync_unmatched_portal: 0,
        })
        .eq("id", connection.id);

      queryClient.invalidateQueries({ queryKey: ["connections"] });

      setResult({ matched, created });
      toast({
        title: "Sync complete",
        description: `${matched} matched, ${created} new products created.`,
      });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!syncing) { onOpenChange(v); if (!v) setResult(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} />
            Sync Products — {connection.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 gap-4">
          {result ? (
            <>
              <CheckCircle size={36} className="text-[hsl(142,76%,36%)]" />
              <div className="text-center">
                <div className="font-semibold text-sm mb-1">Sync Complete</div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{result.matched}</span> matched · <span className="font-medium text-foreground">{result.created}</span> new products created
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Fetch all products from <strong>{connection.name}</strong>, match by SKU, and auto-create any new products.
              </p>
              <Button onClick={handleSync} disabled={syncing} size="lg">
                {syncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Syncing…
                  </>
                ) : (
                  "Sync Now"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
