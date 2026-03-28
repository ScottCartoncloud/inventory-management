import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertTriangle, Cloud, Monitor, FileText, ChevronDown } from "lucide-react";
import { CreateOrderView } from "@/components/views/CreateOrderView";
import { PDFExtractOrderView } from "@/components/views/PDFExtractOrderView";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaleOrders, type SaleOrder } from "@/hooks/useSaleOrders";
import { OrderDetailDrawer } from "@/components/OrderDetailDrawer";

interface OrdersViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function getItemsSummary(order: SaleOrder): string {
  const items = order.items || [];
  if (items.length === 0) return "—";
  const first = items[0].product_name || items[0].cc_product_code || "Item";
  if (items.length === 1) return first;
  return `${first} + ${items.length - 1} more`;
}

export function OrdersView({ activeLocation, onLocationChange }: OrdersViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mode, setMode] = useState<"list" | "create" | "extract">("list");
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { orders, isLoading, isUsingMockData } = useSaleOrders();

  const filtered = useMemo(() => orders.filter(o => {
    const matchLoc = activeLocation === "all" || o.connection_id === activeLocation;
    const matchSearch = !search || [o.order_number, o.cc_numeric_id, o.customer_name, o.deliver_address, o.deliver_company]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
  }), [orders, search, statusFilter, activeLocation]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(orders.map(o => o.status));
    return Array.from(set).sort();
  }, [orders]);

  function handleRowClick(order: SaleOrder) {
    setSelectedOrder(order);
    setDrawerOpen(true);
  }

  if (mode === "create") {
    return <CreateOrderView onBack={() => setMode("list")} />;
  }
  if (mode === "extract") {
    return <PDFExtractOrderView onBack={() => setMode("list")} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {isUsingMockData && (
        <div className="bg-accent/50 border-b border-border px-5 py-2 flex items-center gap-2 text-sm">
          <AlertTriangle size={14} className="text-primary" />
          <span>No orders yet — configure CartonCloud webhook in <strong>Settings</strong> to receive live orders.</span>
        </div>
      )}

      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-sm font-semibold">Sales Orders</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">Real-time</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus size={14} />
              New Order
              <ChevronDown size={12} className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMode("create")}>
              <Plus size={14} className="mr-2" />
              Manual Entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode("extract")}>
              <FileText size={14} className="mr-2" />
              From Invoice / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="Reference, customer, address…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {uniqueStatuses.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Address</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Dispatched</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3 opacity-30">📋</div>
                  <div className="font-semibold mb-1">No orders found</div>
                  <div className="text-sm">Try adjusting your filters</div>
                </TableCell></TableRow>
              ) : filtered.map(order => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleRowClick(order)}
                >
                  <TableCell>
                    <div className="font-medium">{order.order_number || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{order.cc_numeric_id || order.cc_order_id?.substring(0, 8)}</div>
                  </TableCell>
                  <TableCell>{order.customer_name || "—"}</TableCell>
                  <TableCell className="text-[0.8125rem] max-w-[250px] truncate" title={order.deliver_address || ""}>
                    {order.deliver_address || "—"}
                  </TableCell>
                  <TableCell className="text-center">{order.total_items}</TableCell>
                  <TableCell className="text-right font-semibold">{order.total_qty.toLocaleString()}</TableCell>
                  <TableCell><LocationChip locationId={order.connection_id} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs gap-1">
                      {order.source === "portal" ? (
                        <><Monitor size={10} /> Portal</>
                      ) : (
                        <><Cloud size={10} /> CC</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[0.8125rem]">{formatDate(order.cc_created_at)}</TableCell>
                  <TableCell className="text-muted-foreground text-[0.8125rem]">{formatDate(order.cc_dispatched_at)}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OrderDetailDrawer order={selectedOrder} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
