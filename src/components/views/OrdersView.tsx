import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { PurchaseOrdersView } from "@/components/views/PurchaseOrdersView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { CreateOrderView } from "@/components/views/CreateOrderView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/useOrders";

interface OrdersViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function OrdersView({ activeLocation, onLocationChange }: OrdersViewProps) {
  const [orderType, setOrderType] = useState<"sales" | "purchase">("sales");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mode, setMode] = useState<"list" | "create">("list");

  const { orders, isLoading, errors, isUsingMockData } = useOrders();

  const filtered = useMemo(() => orders.filter(o => {
    const matchLoc = activeLocation === "all" || o.location === activeLocation;
    const matchSearch = !search || [o.id, o.ref, o.consignment, o.deliveryAddress].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
  }), [orders, search, statusFilter, activeLocation]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(orders.map(o => o.status));
    return Array.from(set).sort();
  }, [orders]);

  if (mode === "create") {
    return <CreateOrderView onBack={() => setMode("list")} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {isUsingMockData && (
        <div className="bg-accent/50 border-b border-border px-5 py-2 flex items-center gap-2 text-sm">
          <AlertTriangle size={14} className="text-primary" />
          <span>Showing demo data — configure CartonCloud connections in <strong>Settings</strong> to see live orders.</span>
        </div>
      )}

      {errors.length > 0 && errors.map((err, i) => (
        <div key={i} className="bg-destructive/10 border-b border-destructive/20 px-5 py-2 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle size={14} />
          <span>Could not load orders from <strong>{err.connectionCode}</strong> — {err.message}</span>
        </div>
      ))}

      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <Select value={orderType} onValueChange={(v) => setOrderType(v as "sales" | "purchase")}>
            <SelectTrigger className="h-8 w-44 text-sm font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales Orders</SelectItem>
              <SelectItem value="purchase">Purchase Orders</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">{isUsingMockData ? "Demo" : "Real-time"}</span>
          </div>
        </div>
        <Button size="sm" onClick={() => setMode("create")} className="gap-1.5">
          <Plus size={14} />
          New Order
        </Button>
      </div>

      {orderType === "sales" && (
        <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-8 w-56 text-sm" placeholder="Reference, address, consignment…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {orderType === "purchase" ? (
        <PurchaseOrdersView activeLocation={activeLocation} onLocationChange={onLocationChange} />
      ) : (
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Reference</TableHead>
                  <TableHead>CartonCloud ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3 opacity-30">📋</div>
                    <div className="font-semibold mb-1">No orders found</div>
                    <div className="text-sm">Try adjusting your filters</div>
                  </TableCell></TableRow>
                ) : filtered.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.ref || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-[0.8125rem]">{order.id}</TableCell>
                    <TableCell className="text-[0.8125rem] max-w-[300px] truncate" title={order.deliveryAddress}>{order.deliveryAddress || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{order.qty.toLocaleString()}</TableCell>
                    <TableCell><LocationChip locationId={order.location} /></TableCell>
                    <TableCell className="text-muted-foreground text-[0.8125rem]">{order.created || "—"}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
