import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryBar } from "@/components/SummaryBar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Download, RefreshCw, Loader2, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSOHSummary,
  useRefreshAllSOH,
  getSOHFreshnessStatus,
  getSOHFreshnessLabel,
  type SOHProductSummary,
} from "@/hooks/useStockOnHand";
import { isConnectionConfigured } from "@/hooks/useConnections";
import { toast } from "@/hooks/use-toast";

interface InventoryViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function InventoryView({ activeLocation, onLocationChange }: InventoryViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { summary, isLoading, hasData, connections } = useSOHSummary();
  const refreshAll = useRefreshAllSOH();

  const configuredConnections = connections.filter(c => c.is_active && isConnectionConfigured(c));
  const freshness = getSOHFreshnessStatus(connections);
  const freshnessLabel = getSOHFreshnessLabel(connections);

  const categories = useMemo(() => {
    const cats = new Set(summary.map(p => p.product_category));
    return ["all", ...Array.from(cats)];
  }, [summary]);

  const getQty = (p: SOHProductSummary, loc: string): number => {
    if (loc === "all") return p.total_qty;
    const conn = p.connections.find(c => c.connection_code.toLowerCase() === loc);
    return conn?.total_qty ?? 0;
  };

  const getStockStatus = (qty: number, minQty: number): "ok" | "low" | "out" => {
    if (qty === 0) return "out";
    if (qty < minQty) return "low";
    return "ok";
  };

  const filtered = useMemo(() => summary.filter(p => {
    const matchSearch = !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.product_category === categoryFilter;
    const qty = getQty(p, activeLocation);
    const status = getStockStatus(qty, p.product_min_qty);
    return matchSearch && matchCat && (stockFilter === "all" || status === stockFilter);
  }), [search, categoryFilter, stockFilter, activeLocation, summary]);

  const totalOnHand = filtered.reduce((s, p) => s + getQty(p, activeLocation), 0);
  const showCols = activeLocation === "all";
  const colCount = showCols ? 5 + configuredConnections.length : 7;

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Check if a product has any non-available stock across relevant connections */
  const productHasNonAvailable = (product: SOHProductSummary): boolean => {
    if (activeLocation === "all") {
      return product.connections.some(c => c.has_non_available);
    }
    const conn = product.connections.find(c => c.connection_code.toLowerCase() === activeLocation);
    return conn?.has_non_available ?? false;
  };

  /** Get the breakdown rows to display when expanded */
  const getExpandedBreakdown = (product: SOHProductSummary): { connection_code: string; connection_color: string; status: string; qty: number; uom: string }[] => {
    const rows: { connection_code: string; connection_color: string; status: string; qty: number; uom: string }[] = [];
    const relevantConns = activeLocation === "all"
      ? product.connections
      : product.connections.filter(c => c.connection_code.toLowerCase() === activeLocation);

    for (const conn of relevantConns) {
      for (const b of conn.status_breakdown) {
        if (b.qty > 0) {
          rows.push({
            connection_code: conn.connection_code,
            connection_color: conn.connection_color,
            status: b.status,
            qty: b.qty,
            uom: product.product_unit,
          });
        }
      }
    }
    return rows;
  };

  const handleRefresh = async () => {
    try {
      const result = await refreshAll.mutateAsync();
      const successCount = result.successes.length;
      const failCount = result.failures.length;
      if (failCount === 0) {
        toast({
          title: "SOH Refreshed",
          description: `${result.totalMatched} products updated across ${successCount} location${successCount !== 1 ? "s" : ""}.`,
        });
      } else {
        const failedNames = result.failures.map((f: any) => f.connection?.code || "Unknown").join(", ");
        toast({
          title: "SOH Partially Refreshed",
          description: `${successCount} succeeded. Failed: ${failedNames}`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    }
  };

  const freshnessColor = freshness === "fresh"
    ? "hsl(142,76%,36%)"
    : freshness === "stale"
      ? "hsl(38,92%,50%)"
      : "hsl(0,84%,60%)";

  const hasSOHCapableConnections = configuredConnections.some(c => (c as any).cc_customer_id);

  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  const isAvailableStatus = (s: string) => s === "AVAILABLE" || s === "OK";

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-base font-semibold">Stock on Hand</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-default">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: freshnessColor }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {freshness === "never" ? "No data" : freshness === "fresh" ? "Live" : freshness === "stale" ? "Stale" : "Old"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{freshnessLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshAll.isPending || !hasSOHCapableConnections}>
            {refreshAll.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh SOH
          </Button>
          <Button variant="outline" size="sm"><Download size={14} />Export CSV</Button>
        </div>
      </div>

      <SummaryBar items={[
        { label: "Showing", value: `${filtered.length} of ${summary.length} SKUs` },
        { label: "Total Units", value: totalOnHand.toLocaleString() },
        { label: "Low Stock", value: String(filtered.filter(p => getStockStatus(getQty(p, activeLocation), p.product_min_qty) === "low").length), className: "text-[hsl(38,92%,50%)]" },
        { label: "Out of Stock", value: String(filtered.filter(p => getQty(p, activeLocation) === 0).length), className: "text-destructive" },
      ]} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!hasData && !isLoading && !hasSOHCapableConnections ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="text-5xl opacity-30">📦</div>
            <div className="font-semibold text-lg">Connect a CartonCloud warehouse to see live stock levels</div>
            <p className="text-sm text-muted-foreground max-w-md">
              Go to Settings → Connections and configure a connection with a Customer ID to enable Stock on Hand reporting.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="w-8" />
                <TableHead>Product / SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                {showCols ? (
                  <>
                    {configuredConnections.map(conn => (
                      <TableHead key={conn.id} className="text-right" style={{ color: conn.color }}>
                        {conn.code}
                      </TableHead>
                    ))}
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-12">
                    <Loader2 className="mx-auto animate-spin text-muted-foreground" size={24} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3 opacity-30">📦</div>
                    <div className="font-semibold mb-1">No products found</div>
                    <div className="text-sm">Try adjusting your filters</div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(product => {
                const qty = getQty(product, activeLocation);
                const status = getStockStatus(qty, product.product_min_qty);
                const hasWarning = productHasNonAvailable(product);
                const isExpanded = expandedRows.has(product.product_id);
                const breakdown = getExpandedBreakdown(product);

                return (
                  <>
                    <TableRow key={product.product_id} className={hasWarning ? "cursor-pointer hover:bg-muted/50" : ""} onClick={hasWarning ? () => toggleExpand(product.product_id) : undefined}>
                      <TableCell className="w-8 px-2">
                        {hasWarning && (
                          <button
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                            onClick={e => { e.stopPropagation(); toggleExpand(product.product_id); }}
                          >
                            {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{product.product_name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{product.product_sku}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">{product.product_category}</span></TableCell>
                      <TableCell className="text-muted-foreground text-[0.8125rem]">{product.product_unit}</TableCell>
                      {showCols ? (
                        <>
                          {configuredConnections.map(conn => {
                            const connData = product.connections.find(c => c.connection_id === conn.id);
                            const connQty = connData?.total_qty ?? 0;
                            const connHasWarning = connData?.has_non_available ?? false;
                            return (
                              <TableCell key={conn.id} className="text-right">
                                <SOHCell qty={connQty} minQty={product.product_min_qty} hasWarning={connHasWarning} />
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold">{qty.toLocaleString()}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right">
                            {(() => {
                              const connData = product.connections.find(c => c.connection_code.toLowerCase() === activeLocation);
                              return <SOHCell qty={qty} minQty={product.product_min_qty} hasWarning={connData?.has_non_available ?? false} />;
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-[0.8125rem]">{product.product_min_qty}</TableCell>
                        </>
                      )}
                      <TableCell><StatusBadge status={status} /></TableCell>
                    </TableRow>
                    {isExpanded && hasWarning && (
                      <TableRow key={`${product.product_id}-detail`} className="bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={colCount - 1} className="py-2">
                          <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs">
                            {breakdown.map((b, i) => (
                              <div key={i} className="flex items-center gap-2">
                                {activeLocation === "all" && (
                                  <span className="font-medium" style={{ color: b.connection_color }}>{b.connection_code}</span>
                                )}
                                <span className={isAvailableStatus(b.status) ? "text-foreground" : "text-[hsl(38,92%,50%)] font-medium"}>
                                  {formatStatus(b.status)}:
                                </span>
                                <span className="font-mono">{b.qty.toLocaleString()} {b.uom}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SOHCell({ qty, minQty, hasWarning }: {
  qty: number;
  minQty: number;
  hasWarning: boolean;
}) {
  if (qty === 0) {
    return <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">—</span>;
  }

  const color = qty < minQty ? "text-[hsl(38,92%,50%)] font-semibold" : "text-foreground font-medium";

  return (
    <span className={`${color} inline-flex items-center gap-1`}>
      {qty.toLocaleString()}
      {hasWarning && <AlertTriangle size={12} className="text-[hsl(38,92%,50%)]" />}
    </span>
  );
}
