import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PRODUCTS } from "@/data/products";
import { getSOH, getStockStatus } from "@/data/inventory-utils";
import { StatusBadge } from "@/components/StatusBadge";
import { QtyCell } from "@/components/QtyCell";
import { SummaryBar } from "@/components/SummaryBar";
import { ProductDrawer } from "@/components/ProductDrawer";
import { Search, Download } from "lucide-react";
import type { Product } from "@/data/products";

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const filtered = useMemo(() => PRODUCTS.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  }), [search, categoryFilter]);

  const totalValue = PRODUCTS.reduce((s, p) => s + getSOH(p, "all") * p.costPrice, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-base font-semibold">Products</span>
          <span className="text-xs text-muted-foreground">{PRODUCTS.length} total · click any row to inspect</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="Name, SKU, barcode, supplier…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
          </select>
          <Button variant="outline" size="sm"><Download size={14} />Export</Button>
          <Button size="sm">+ Add Product</Button>
        </div>
      </div>

      <SummaryBar items={[
        { label: "Products", value: `${filtered.length} of ${PRODUCTS.length}` },
        { label: "Total SOH", value: PRODUCTS.reduce((s, p) => s + getSOH(p, "all"), 0).toLocaleString() + " units" },
        { label: "Stock Value", value: `$${totalValue.toLocaleString("en-AU", { minimumFractionDigits: 0 })}`, className: "text-[hsl(210,100%,40%)]" },
        { label: "Low / Out", value: PRODUCTS.filter(p => getStockStatus(getSOH(p, "all"), p.minQty) !== "ok").length + " SKUs", className: "text-[hsl(38,92%,50%)]" },
      ]} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Product / SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Total SOH</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Sell</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-3 opacity-30">📦</div>
                <div className="font-semibold mb-1">No products found</div>
                <div className="text-sm">Try adjusting your search or filters</div>
              </TableCell></TableRow>
            ) : filtered.map(product => {
              const totalSOH = getSOH(product, "all");
              const status = getStockStatus(totalSOH, product.minQty);
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
                  <TableCell className="text-muted-foreground text-[0.8125rem]">{product.supplier}</TableCell>
                  <TableCell className="text-muted-foreground text-[0.8125rem]">{product.unit}</TableCell>
                  <TableCell className="text-right"><QtyCell qty={totalSOH} minQty={product.minQty} locationId="all" /></TableCell>
                  <TableCell className="text-right text-[0.8125rem]">${product.costPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">${product.sellPrice.toFixed(2)}</TableCell>
                  <TableCell><StatusBadge status={status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
