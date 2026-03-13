import { Card } from "@/components/ui/card";
import { useConnections, isConnectionConfigured, type Connection } from "@/hooks/useConnections";
import { useOrders } from "@/hooks/useOrders";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { MapPin, AlertTriangle, ClipboardCheck, Cloud, PackageOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardViewProps {
  onNavigate: (tab: string, location?: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const { orders, isLoading: ordersLoading } = useOrders();
  const { purchaseOrders, isLoading: poLoading } = usePurchaseOrders();

  const configuredConnections = (connections || []).filter(c => c.is_active && isConnectionConfigured(c));
  const activeOrders = orders.filter(o => o.status !== "completed").length;
  const inProgressOrders = orders.filter(o => o.status === "in_progress").length;
  const pendingInbound = purchaseOrders.filter(o => !["RECEIVED", "VERIFIED", "ALLOCATED"].includes(o.status)).length;

  const locStats = configuredConnections.map(conn => {
    const connOrders = orders.filter(o => o.location === conn.code.toLowerCase());
    const connPOs = purchaseOrders.filter(o => o.location === conn.code.toLowerCase());
    return {
      ...conn,
      activeOrders: connOrders.filter(o => o.status !== "completed").length,
      totalOrders: connOrders.length,
      pendingInbound: connPOs.filter(o => !["RECEIVED", "VERIFIED", "ALLOCATED"].includes(o.status)).length,
    };
  });

  const recentOrders = [...orders].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  const stats = [
    { label: "Connected Locations", value: configuredConnections.length, sub: `${(connections || []).length} total configured`, cls: "text-primary" },
    { label: "Total Orders", value: orders.length, sub: "From all connections", cls: "" },
    { label: "Active Orders", value: activeOrders, sub: `${inProgressOrders} in progress`, cls: "text-[hsl(142,76%,36%)]" },
    { label: "Pending", value: orders.filter(o => o.status === "pending").length, sub: "Awaiting pick & pack", cls: "text-[hsl(38,92%,50%)]" },
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
          <MapPin size={15} className="text-primary" />
          CartonCloud Locations
        </div>
        {connectionsLoading ? (
          <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : configuredConnections.length === 0 ? (
          <Card className="p-8 text-center">
            <Cloud size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No connected locations yet. Go to Settings → Connections to set up a CartonCloud connection.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
            {locStats.map(loc => (
              <Card
                key={loc.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onNavigate("orders", loc.code.toLowerCase())}
              >
                <div className="p-3.5 text-white" style={{ background: loc.color }}>
                  <div className="flex items-center gap-2.5 mb-1">
                    {loc.logo_url ? (
                      <img src={loc.logo_url} alt={loc.name} className="w-9 h-9 rounded-md object-contain bg-white/90 p-1" />
                    ) : (
                      <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold">{loc.code}</div>
                    )}
                    <div>
                      <div className="font-semibold text-[0.9375rem] leading-tight">{loc.name}</div>
                      <div className="text-xs opacity-75">{loc.api_endpoint.replace("https://", "")}</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] text-muted-foreground">Active Orders</span>
                    <span className="text-[0.9375rem] font-semibold text-primary">{loc.activeOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] text-muted-foreground">Total Orders</span>
                    <span className="text-[0.9375rem] font-semibold">{loc.totalOrders}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-2 gap-4 max-[1100px]:grid-cols-1">
        {/* Recent Orders */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-[0.9375rem] font-semibold flex items-center gap-2">
              <ClipboardCheck size={15} className="text-primary" />
              Recent Orders
            </span>
            <button className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-md transition-colors" onClick={() => onNavigate("orders", "all")}>View All</button>
          </div>
          {ordersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No orders loaded yet.</div>
          ) : (
            recentOrders.map((order, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2.5">
                  <LocationChip locationId={order.location} />
                  <div>
                    <div className="text-sm font-medium">{order.ref || order.id}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{order.deliveryAddress || order.id}</div>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>
            ))
          )}
        </Card>

        {/* Connection Status */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-3.5 border-b border-border">
            <span className="text-[0.9375rem] font-semibold flex items-center gap-2">
              <Cloud size={15} className="text-primary" />
              Connection Status
            </span>
            <button className="text-sm text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-md transition-colors" onClick={() => onNavigate("settings")}>Manage</button>
          </div>
          {(connections || []).map((conn, i) => {
            const configured = isConnectionConfigured(conn);
            return (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center overflow-hidden text-white font-bold text-[0.625rem] shrink-0 border"
                    style={{
                      background: conn.logo_url ? 'hsl(var(--background))' : conn.color,
                      borderColor: conn.color,
                    }}
                  >
                    {conn.logo_url ? (
                      <img src={conn.logo_url} alt={conn.name} className="w-full h-full object-contain" />
                    ) : (
                      conn.code
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{conn.name}</div>
                    <div className="text-xs text-muted-foreground">{conn.code}</div>
                  </div>
                </div>
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  configured
                    ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {configured ? "Connected" : "Not Configured"}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
