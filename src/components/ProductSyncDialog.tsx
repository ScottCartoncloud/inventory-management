import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, Package, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, useCreateProduct, useBulkUpsertMappings, type DBProduct } from "@/hooks/useProducts";
import type { Connection } from "@/hooks/useConnections";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface CCProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  barcode?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  unitsOfMeasure?: { type: string; name: string; quantity: number }[];
}

interface ProductSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection;
}

type SyncState = "idle" | "fetching" | "reconciling" | "saving";

interface ReconciliationResult {
  matched: { ccProduct: CCProduct; portalProduct: DBProduct }[];
  unmatchedInCC: CCProduct[];
  unmatchedInPortal: DBProduct[];
}

export function ProductSyncDialog({ open, onOpenChange, connection }: ProductSyncDialogProps) {
  const { data: products = [] } = useProducts();
  const createProduct = useCreateProduct();
  const bulkUpsertMappings = useBulkUpsertMappings();

  const [state, setState] = useState<SyncState>("idle");
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  async function fetchAllCCProducts(): Promise<CCProduct[]> {
    const allProducts: CCProduct[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const { data, error } = await supabase.functions.invoke("cartoncloud-proxy", {
        body: { connectionId: connection.id, path: `products?page=${page}&size=50` },
      });
      if (error) throw error;

      // The proxy forwards Total-Pages header but functions.invoke doesn't give us headers easily
      // So we parse the data directly - if it's an array, use it
      const items = Array.isArray(data) ? data : [];
      allProducts.push(...items);

      // If we got fewer than 50, we're done
      if (items.length < 50) break;
      page++;
      // Safety limit
      if (page > 100) break;
    }

    return allProducts;
  }

  async function handleSync() {
    setState("fetching");
    try {
      const ccProducts = await fetchAllCCProducts();
      setState("reconciling");

      // Build lookup by code (SKU)
      const portalBySku = new Map<string, DBProduct>();
      for (const p of products) {
        portalBySku.set(p.sku.toLowerCase(), p);
      }

      const matched: ReconciliationResult["matched"] = [];
      const unmatchedInCC: CCProduct[] = [];
      const matchedCCCodes = new Set<string>();

      for (const cc of ccProducts) {
        const portal = portalBySku.get(cc.code.toLowerCase());
        if (portal) {
          matched.push({ ccProduct: cc, portalProduct: portal });
          matchedCCCodes.add(portal.sku.toLowerCase());
        } else {
          unmatchedInCC.push(cc);
        }
      }

      const unmatchedInPortal = products.filter(p => !matchedCCCodes.has(p.sku.toLowerCase()));

      setReconciliation({ matched, unmatchedInCC, unmatchedInPortal });
      setState("idle");
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
      setState("idle");
    }
  }

  function toggleImport(ccId: string) {
    setSelectedImports(prev => {
      const next = new Set(prev);
      if (next.has(ccId)) next.delete(ccId);
      else next.add(ccId);
      return next;
    });
  }

  function selectAllImports() {
    if (!reconciliation) return;
    if (selectedImports.size === reconciliation.unmatchedInCC.length) {
      setSelectedImports(new Set());
    } else {
      setSelectedImports(new Set(reconciliation.unmatchedInCC.map(p => p.id)));
    }
  }

  async function handleConfirm() {
    if (!reconciliation) return;
    setIsSaving(true);

    try {
      // 1. Create auto-matched mapping rows
      const matchedMappings = reconciliation.matched.map(m => ({
        product_id: m.portalProduct.id,
        connection_id: connection.id,
        cc_product_code: m.ccProduct.code,
        cc_product_id: m.ccProduct.id,
        is_override: false,
      }));

      // 2. Import selected unmatched CC products
      const importedMappings: typeof matchedMappings = [];
      for (const ccId of selectedImports) {
        const cc = reconciliation.unmatchedInCC.find(p => p.id === ccId);
        if (!cc) continue;

        // Convert CC dimensions from metres to cm
        const uoms = (cc.unitsOfMeasure || []).map((u, i) => ({
          name: u.name,
          qty: u.quantity,
          sort_order: i,
        }));

        const newProduct = await createProduct.mutateAsync({
          product: {
            sku: cc.code,
            name: cc.name || cc.code,
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
            length: cc.length ? cc.length * 100 : null, // metres to cm
            width: cc.width ? cc.width * 100 : null,
            height: cc.height ? cc.height * 100 : null,
            dim_unit: "cm",
            notes: cc.description || null,
          },
          uoms,
        });

        importedMappings.push({
          product_id: newProduct.id,
          connection_id: connection.id,
          cc_product_code: cc.code,
          cc_product_id: cc.id,
          is_override: false,
        });
      }

      // 3. Bulk upsert all mappings
      const allMappings = [...matchedMappings, ...importedMappings];
      if (allMappings.length > 0) {
        await bulkUpsertMappings.mutateAsync(allMappings);
      }

      toast({
        title: "Sync complete",
        description: `${matchedMappings.length} matched, ${importedMappings.length} imported.`,
      });
      onOpenChange(false);
      setReconciliation(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const isFetching = state === "fetching" || state === "reconciling";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isFetching && !isSaving) { onOpenChange(v); if (!v) setReconciliation(null); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} />
            Sync Products — {connection.name}
          </DialogTitle>
        </DialogHeader>

        {!reconciliation ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              This will fetch all products from <strong>{connection.name}</strong> and compare them against the portal product catalog by SKU code.
            </p>
            <Button onClick={handleSync} disabled={isFetching} size="lg">
              {isFetching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {state === "fetching" ? "Fetching products…" : "Reconciling…"}
                </>
              ) : (
                <>
                  <Download size={16} /> Start Sync
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Matched */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[hsl(142,76%,36%)]/10 rounded-md">
              <CheckCircle size={16} className="text-[hsl(142,76%,36%)]" />
              <span className="text-sm font-medium">{reconciliation.matched.length} matched</span>
              <span className="text-xs text-muted-foreground">— auto-mapped by SKU</span>
            </div>

            {/* Unmatched in CC */}
            {reconciliation.unmatchedInCC.length > 0 && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[hsl(38,92%,50%)]" />
                    <span className="text-sm font-medium">{reconciliation.unmatchedInCC.length} in CartonCloud, not in Portal</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={selectAllImports}>
                    {selectedImports.size === reconciliation.unmatchedInCC.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <ScrollArea className="flex-1 border border-border rounded-md max-h-[30vh]">
                  {reconciliation.unmatchedInCC.map(cc => (
                    <div key={cc.id} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted">
                      <Checkbox
                        checked={selectedImports.has(cc.id)}
                        onCheckedChange={() => toggleImport(cc.id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{cc.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{cc.code}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">Import</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Unmatched in Portal */}
            {reconciliation.unmatchedInPortal.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">{reconciliation.unmatchedInPortal.length} portal products not in this tenant</span>
                </div>
                <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                  These products won't have SOH data from {connection.name}. No action needed.
                </div>
              </div>
            )}
          </div>
        )}

        {reconciliation && (
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReconciliation(null); }} disabled={isSaving}>
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Confirm & Save ({reconciliation.matched.length + selectedImports.size} mappings)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
