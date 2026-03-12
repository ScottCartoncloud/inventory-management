import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LOCATIONS } from "@/data/locations";
import { ORDERS } from "@/data/orders";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { Search } from "lucide-react";

interface OrdersViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function OrdersView({ activeLocation, onLocationChange }: OrdersViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => ORDERS.filter(o => {
    const matchLoc = activeLocation === "all" || o.location === activeLocation;
    const matchSearch = !search || [o.id, o.customer, o.ref, o.consignment].some(v => v.toLowerCase().includes(search.toLowerCase()));
    return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
  }), [search, statusFilter, activeLocation]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <span className="text-base font-semibold">Orders</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
            <span className="text-xs text-muted-foreground">Real-time</span>
          </div>
          <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="Order ID, customer, consignment…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Order ID</TableHead>
              <TableHead>PO Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product / SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Consignment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>ETA</TableHead>
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
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell className="text-muted-foreground text-[0.8125rem]">{order.ref}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{order.product}</span>
                    <span className="text-xs text-muted-foreground font-mono">{order.sku}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{order.qty.toLocaleString()}</TableCell>
                <TableCell><LocationChip locationId={order.location} /></TableCell>
                <TableCell><a href="#" className="text-[hsl(210,100%,40%)] font-medium hover:underline">{order.consignment}</a></TableCell>
                <TableCell className="text-muted-foreground text-[0.8125rem]">{order.created}</TableCell>
                <TableCell className="text-[0.8125rem]">{order.eta}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
