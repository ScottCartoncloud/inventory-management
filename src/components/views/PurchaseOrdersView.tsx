import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";

interface PurchaseOrdersViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function PurchaseOrdersView({ activeLocation, onLocationChange }: PurchaseOrdersViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { purchaseOrders, isLoading, errors, isUsingMockData } = usePurchaseOrders();

  const filtered = useMemo(() => purchaseOrders.filter(o => {
    const matchLoc = activeLocation === "all" || o.location === activeLocation;
    const matchSearch = !search || [o.ref, o.numericId, o.customer].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
  }), [purchaseOrders, search, statusFilter, activeLocation]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(purchaseOrders.map(o => o.status));
    return Array.from(set).sort();
  }, [purchaseOrders]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const locationFiltered = purchaseOrders.filter(o => activeLocation === "all" || o.location === activeLocation);
    const counts: Record<string, number> = {};
    for (const o of locationFiltered) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [purchaseOrders, activeLocation]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {isUsingMockData && (
        <div className="bg-accent/50 border-b border-border px-5 py-2 flex items-center gap-2 text-sm">
          <AlertTriangle size={14} className="text-primary" />
          <span>Showing demo data — configure CartonCloud connections in <strong>Settings</strong> to see live purchase orders.</span>
        </div>
      )}

      {errors.length > 0 && errors.map((err, i) => (
        <div key={i} className="bg-destructive/10 border-b border-destructive/20 px-5 py-2 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle size={14} />
          <span>Could not load purchase orders from <strong>{err.connectionCode}</strong> — {err.message}</span>
        </div>
      ))}

      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-sm font-semibold">Purchase Orders</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">{isUsingMockData ? "Demo" : "Real-time"}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="PO reference, customer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {uniqueStatuses.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status summary chips */}
      {Object.keys(statusCounts).length > 0 && (
        <div className="bg-card border-b border-border px-5 py-2 flex items-center gap-2 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              className="flex items-center gap-1.5"
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <StatusBadge status={status} />
              <span className="text-xs text-muted-foreground font-medium">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Reference / ID</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Arrival Date</TableHead>
                <TableHead>Urgent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3 opacity-30">📦</div>
                  <div className="font-semibold mb-1">No purchase orders found</div>
                  <div className="text-sm">Try adjusting your filters</div>
                </TableCell></TableRow>
              ) : filtered.map(order => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.ref || "—"}</div>
                    <div className="text-xs text-muted-foreground">{order.numericId ? `PO-${order.numericId}` : order.id.substring(0, 8)}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[0.8125rem]">{order.itemCount} {order.itemCount === 1 ? "product" : "products"}</span>
                  </TableCell>
                  <TableCell><LocationChip locationId={order.location} /></TableCell>
                  <TableCell className="text-right font-semibold">{order.qty.toLocaleString()}</TableCell>
                  <TableCell className="text-[0.8125rem] text-muted-foreground">{order.arrivalDate || "—"}</TableCell>
                  <TableCell>
                    {order.urgent && (
                      <Badge variant="outline" className="text-xs font-medium bg-destructive/10 text-destructive border-transparent">
                        Urgent
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
