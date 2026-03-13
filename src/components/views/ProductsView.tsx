import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, useCreateProduct, useBulkUpsertMappings, type DBProduct } from "@/hooks/useProducts";
import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { SummaryBar } from "@/components/SummaryBar";
import { ProductDrawer } from "@/components/ProductDrawer";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Plus, Cloud, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<DBProduct | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const { data: products = [], isLoading } = useProducts();
  const { data: connections = [] } = useConnections();
  const queryClient = useQueryClient();

  const configuredConnections = connections.filter(c => c.is_active && isConnectionConfigured(c));

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  }), [search, categoryFilter, products]);

  const totalValue = products.reduce((s, p) => s + p.cost_price, 0);

  async function handleFetchFromCC() {
    if (configuredConnections.length === 0) {
      toast({ title: "No connections", description: "Configure a CartonCloud connection in Settings first.", variant: "destructive" });
      return;
    }

    setIsFetching(true);
    let totalImported = 0;

    try {
      for (const conn of configuredConnections) {
        // POST to warehouse-products/search with empty search to get all
        const { data, error } = await supabase.functions.invoke("cartoncloud-proxy", {
          body: {
            connectionId: conn.id,
            method: "POST",
            path: "warehouse-products/search",
            body: { condition: { type: "AndCondition", conditions: [] } },
          },
        });

        if (error) {
          console.error(`Error fetching from ${conn.name}:`, error);
          toast({ title: `Error from ${conn.name}`, description: error.message, variant: "destructive" });
          continue;
        }

        const ccProducts = Array.isArray(data) ? data : [];
        const existingSkus = new Set(products.map(p => p.sku.toLowerCase()));

        for (const cc of ccProducts) {
          const code = cc.code || cc.product?.code;
          const name = cc.name || cc.product?.name || code;
          if (!code) continue;
          if (existingSkus.has(code.toLowerCase())) continue; // skip duplicates

          // Insert product
          const weight = cc.weight || cc.product?.weight;
          const width = cc.width || cc.product?.width;
          const height = cc.height || cc.product?.height;
          const length = cc.length || cc.product?.length;
          const barcode = cc.barcode || cc.product?.barcode;

          const uomsRaw = cc.unitsOfMeasure || cc.product?.unitsOfMeasure || [];
          const uoms = uomsRaw.map((u: any, i: number) => ({
            name: u.name || u.type || "Each",
            qty: u.quantity || 1,
            sort_order: i,
          }));

          const { data: newProduct, error: insertErr } = await supabase
            .from("products")
            .insert({
              sku: code,
              name,
              category: "General",
              unit: "CTN",
              min_qty: 0,
              barcode: barcode || null,
              cost_price: 0,
              sell_price: 0,
              tax_rate: 10,
              weight: weight || null,
              weight_unit: "kg",
              length: length ? length * 100 : null,
              width: width ? width * 100 : null,
              height: height ? height * 100 : null,
              dim_unit: "cm",
            })
            .select()
            .single();

          if (insertErr) {
            console.warn(`Skipping ${code}:`, insertErr.message);
            continue;
          }

          // Insert UOMs
          if (uoms.length > 0 && newProduct) {
            await supabase.from("product_uoms").insert(
              uoms.map((u: any) => ({ ...u, product_id: newProduct.id }))
            );
          }

          // Create mapping
          if (newProduct) {
            await supabase.from("product_mappings").upsert({
              product_id: newProduct.id,
              connection_id: conn.id,
              cc_product_code: code,
              cc_product_id: cc.id || null,
              is_override: false,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "product_id,connection_id" });
          }

          existingSkus.add(code.toLowerCase());
          totalImported++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Import complete", description: `${totalImported} products imported from CartonCloud.` });
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-base font-semibold">Products</span>
          <span className="text-xs text-muted-foreground">{products.length} total · click any row to inspect</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="Name, SKU, barcode, supplier…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleFetchFromCC} disabled={isFetching || configuredConnections.length === 0}>
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
            {isFetching ? "Importing…" : "Fetch from CC"}
          </Button>
          <Button variant="outline" size="sm"><Download size={14} />Export</Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus size={14} />Add Product</Button>
        </div>
      </div>

      <SummaryBar items={[
        { label: "Products", value: `${filtered.length} of ${products.length}` },
        { label: "Stock Value", value: `$${totalValue.toLocaleString("en-AU", { minimumFractionDigits: 0 })}`, className: "text-[hsl(210,100%,40%)]" },
      ]} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Product / SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3 opacity-30">📦</div>
                  <div className="font-semibold mb-1">No products found</div>
                  <div className="text-sm">{products.length === 0 ? "Click 'Fetch from CC' to import products from CartonCloud" : "Try adjusting your search or filters"}</div>
                </TableCell></TableRow>
              ) : filtered.map(product => {
                const isSelected = selectedProduct?.id === product.id;
                return (
                  <TableRow
                    key={product.id}
                    className={`cursor-pointer ${isSelected ? "bg-[hsl(210,100%,40%)]/[0.06]" : ""}`}
                    onClick={() => setSelectedProduct(prev => prev?.id === product.id ? null : product)}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">{product.category}</span></TableCell>
                    <TableCell className="text-muted-foreground text-[0.8125rem]">{product.supplier || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-[0.8125rem]">{product.unit}</TableCell>
                    <TableCell className="text-right text-[0.8125rem]">${product.cost_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${product.sell_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]">Active</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <ProductFormDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
