import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PURCHASE_ORDERS } from "@/data/orders";
import { LocationPills } from "@/components/LocationPills";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { Search } from "lucide-react";

interface PurchaseOrdersViewProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function PurchaseOrdersView({ activeLocation, onLocationChange }: PurchaseOrdersViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => PURCHASE_ORDERS.filter(o => {
    const matchLoc = activeLocation === "all" || o.location === activeLocation;
    const matchSearch = !search || [o.id, o.ref].some(v => v.toLowerCase().includes(search.toLowerCase()));
    return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
  }), [search, statusFilter, activeLocation]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <LocationPills activeLocation={activeLocation} onLocationChange={onLocationChange} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 w-56 text-sm" placeholder="PO ID, ref, customer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 px-3 pr-8 border border-border rounded-md bg-card text-sm outline-none cursor-pointer appearance-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="ordered">Ordered</option>
            <option value="in_transit">In Transit</option>
            <option value="received">Received</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead>Reference</TableHead>
            <TableHead>PO ID</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Expected Arrival</TableHead>
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
              <TableCell className="text-muted-foreground text-[0.8125rem]">{order.ref}</TableCell>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell className="text-right font-semibold">{order.qty.toLocaleString()}</TableCell>
              <TableCell><LocationChip locationId={order.location} /></TableCell>
              <TableCell className="text-muted-foreground text-[0.8125rem]">{order.ordered}</TableCell>
              <TableCell className="text-[0.8125rem]">{order.expectedArrival}</TableCell>
              <TableCell><StatusBadge status={order.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
