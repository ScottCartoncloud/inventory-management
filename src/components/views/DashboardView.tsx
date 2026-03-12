import { Card } from "@/components/ui/card";
import { LOCATIONS } from "@/data/locations";
import { PRODUCTS } from "@/data/products";
import { ORDERS } from "@/data/orders";
import { getSOH, getStockStatus } from "@/data/inventory-utils";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { MapPin, AlertTriangle, ClipboardCheck } from "lucide-react";

interface DashboardViewProps {
  onNavigate: (tab: string, location?: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const totalSKUs = PRODUCTS.length;
  const totalQty = PRODUCTS.reduce((s, p) => s + p.syd + p.mel + p.bne + p.per, 0);
  const lowStockItems = PRODUCTS.filter(p => ["syd", "mel", "bne", "per"].some(loc => (p as any)[loc] > 0 && (p as any)[loc] < p.minQty));
  const outOfStockInstances = PRODUCTS.reduce((s, p) => s + ["syd", "mel", "bne", "per"].filter(loc => (p as any)[loc] === 0).length, 0);
  const activeOrders = ORDERS.filter(o => o.status !== "completed").length;

  const locStats = LOCATIONS.map(loc => ({
    ...loc,
    totalSKUs: PRODUCTS.filter(p => (p as any)[loc.id] > 0).length,
    totalQty: PRODUCTS.reduce((s, p) => s + ((p as any)[loc.id] || 0), 0),
    lowStock: PRODUCTS.filter(p => (p as any)[loc.id] > 0 && (p as any)[loc.id] < p.minQty).length,
    orders: ORDERS.filter(o => o.location === loc.id && o.status !== "completed").length,
  }));

  const allLowAlerts = PRODUCTS.flatMap(p =>
    LOCATIONS.map(loc => {
      const qty = (p as any)[loc.id] as number;
      if (qty === 0) return { ...p, locId: loc.id, locName: loc.name, qty, type: "out" as const };
      if (qty < p.minQty) return { ...p, locId: loc.id, locName: loc.name, qty, type: "low" as const };
      return null;
    }).filter(Boolean)
  ).slice(0, 8) as Array<any>;

  const recentOrders = [...ORDERS].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  const stats = [
    { label: "Total SKUs", value: totalSKUs, sub: "Across all locations", cls: "text-[hsl(210,100%,40%)]" },
    { label: "Total Units on Hand", value: totalQty.toLocaleString(), sub: "All locations combined", cls: "" },
    { label: "Low / Out of Stock", value: `${lowStockItems.length} SKUs`, sub: `${outOfStockInstances} location instances`, cls: "text-[hsl(38,92%,50%)]" },
    { label: "Active Orders", value: activeOrders, sub: `${ORDERS.filter(o => o.status === "in_progress").length} in progress`, cls: "text-[hsl(142,76%,36%)]" },
  ];

  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto animate-in fade-in duration-200">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
        {stats.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">{s.label}</div>
            <div className={`text-3xl font-bold leading-none ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Location Cards */}
      <div>
        <div className="mb-2.5 font-semibold text-[0.9375rem] flex items-center gap-2">
          <MapPin size={15} className="text-[hsl(210,100%,40%)]" />
          CartonCloud Locations
        </div>
        <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
          {locStats.map(loc => (
            <Card
              key={loc.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate("inventory", loc.id)}
            >
              <div className="p-3.5 text-white" style={{ background: loc.color }}>
                <div className="text-[0.6875rem] font-bold px-1.5 py-0.5 rounded bg-white/20 inline-block mb-1">{loc.code}</div>
                <div className="font-semibold text-[0.9375rem]">{loc.name}</div>
                <div className="text-xs opacity-75">{loc.totalSKUs} active SKUs</div>
              </div>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[0.8125rem] text-muted-foreground">Units on Hand</span>
                  <span className="text-[0.9375rem] font-semibold">{loc.totalQty.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (loc.totalQty / totalQty) * 100 * 3)}%`, background: loc.color }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.8125rem] text-muted-foreground">Low Stock SKUs</span>
                  <span className={`text-[0.9375rem] font-semibold ${loc.lowStock > 0 ? "text-[hsl(38,92%,50%)]" : "text-[hsl(142,76%,36%)]"}`}>{loc.lowStock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.8125rem] text-muted-foreground">Active Orders</span>
                  <span className="text-[0.9375rem] font-semibold text-[hsl(210,100%,40%)]">{loc.orders}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-2 gap-4 max-[1100px]:grid-cols-1">
        {/* Stock Alerts */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-[0.9375rem] font-semibold flex items-center gap-2">
              <AlertTriangle size={15} className="text-[hsl(38,92%,50%)]" />
              Stock Alerts
              <span className="inline-flex items-center justify-center min-w-[1.375rem] h-[1.375rem] px-1.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground">{allLowAlerts.length}</span>
            </span>
            <button className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-md transition-colors" onClick={() => onNavigate("inventory", "all")}>View All</button>
          </div>
          {allLowAlerts.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted transition-colors" onClick={() => onNavigate("inventory", item.locId)}>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.type === "out" ? "hsl(0,84%,60%)" : "hsl(38,92%,50%)" }} />
                <div>
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.locName} · {item.unit}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className={`text-sm font-semibold ${item.type === "out" ? "text-destructive" : "text-[hsl(38,92%,50%)]"}`}>{item.qty === 0 ? "Out" : item.qty.toLocaleString()}</div>
                <div className="text-[0.7rem] text-muted-foreground">min {item.minQty}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Recent Orders */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-[0.9375rem] font-semibold flex items-center gap-2">
              <ClipboardCheck size={15} className="text-[hsl(210,100%,40%)]" />
              Recent Orders
            </span>
            <button className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-md transition-colors" onClick={() => onNavigate("orders", "all")}>View All</button>
          </div>
          {recentOrders.map((order, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2.5">
                <LocationChip locationId={order.location} />
                <div>
                  <div className="text-sm font-medium">{order.id}</div>
                  <div className="text-xs text-muted-foreground">{order.customer} · {order.product}</div>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
