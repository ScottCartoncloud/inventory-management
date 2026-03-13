// TODO: Replace hardcoded PRODUCTS with live CartonCloud SOH queries per location when ready
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LOCATIONS } from "@/data/locations";
import { PRODUCTS } from "@/data/products";
import { getSOH, getStockStatus } from "@/data/inventory-utils";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { QtyCell } from "@/components/QtyCell";
import { SummaryBar } from "@/components/SummaryBar";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function InventoryView({ activeLocation, onLocationChange }: InventoryViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const filtered = useMemo(() => PRODUCTS.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    const soh = getSOH(p, activeLocation);
    const status = getStockStatus(soh, p.minQty);
    return matchSearch && matchCat && (stockFilter === "all" || status === stockFilter);
  }), [search, categoryFilter, stockFilter, activeLocation]);

  const totalOnHand = filtered.reduce((s, p) => s + getSOH(p, activeLocation), 0);
  const showCols = activeLocation === "all";

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-base font-semibold">Stock on Hand</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="Search SKU or product…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
          </select>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
            <option value="all">All Stock</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <Button variant="outline" size="sm"><Download size={14} />Export CSV</Button>
        </div>
      </div>

      <SummaryBar items={[
        { label: "Showing", value: `${filtered.length} of ${PRODUCTS.length} SKUs` },
        { label: "Total Units", value: totalOnHand.toLocaleString() },
        { label: "Low Stock", value: String(filtered.filter(p => getStockStatus(getSOH(p, activeLocation), p.minQty) === "low").length), className: "text-[hsl(38,92%,50%)]" },
        { label: "Out of Stock", value: String(filtered.filter(p => getSOH(p, activeLocation) === 0).length), className: "text-destructive" },
      ]} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Product / SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              {showCols ? (
                <>
                  {LOCATIONS.map(loc => <TableHead key={loc.id} className="text-right" style={{ color: loc.color }}>{loc.code}</TableHead>)}
                  <TableHead className="text-right">Total</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Min Qty</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={showCols ? 9 : 6} className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-3 opacity-30">📦</div>
                <div className="font-semibold mb-1">No products found</div>
                <div className="text-sm">Try adjusting your filters</div>
              </TableCell></TableRow>
            ) : filtered.map(product => {
              const qty = getSOH(product, activeLocation);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">{product.category}</span></TableCell>
                  <TableCell className="text-muted-foreground text-[0.8125rem]">{product.unit}</TableCell>
                  {showCols ? (
                    <>
                      {LOCATIONS.map(loc => <TableCell key={loc.id} className="text-right"><QtyCell qty={(product as any)[loc.id]} minQty={product.minQty} locationId={loc.id} /></TableCell>)}
                      <TableCell className="text-right font-semibold">{qty.toLocaleString()}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right"><QtyCell qty={qty} minQty={product.minQty} locationId={activeLocation} /></TableCell>
                      <TableCell className="text-right text-muted-foreground text-[0.8125rem]">{product.minQty}</TableCell>
                    </>
                  )}
                  <TableCell><StatusBadge status={getStockStatus(qty, product.minQty)} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
