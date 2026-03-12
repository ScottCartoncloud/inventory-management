import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LOCATIONS } from "@/data/locations";
import { PRODUCTS } from "@/data/products";
import { StatusBadge } from "@/components/StatusBadge";
import { CartonCloudIntegration } from "@/components/settings/CartonCloudIntegration";
import { Filter, Settings, Plus } from "lucide-react";

export function SettingsView() {
  return (
    <div className="flex-1 overflow-y-auto animate-in fade-in duration-200">
      <div className="p-5 max-w-3xl mx-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="integration">CartonCloud Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Settings size={16} className="text-primary" />
                <span className="font-semibold text-base">Report Preferences</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Configure default SOH report settings and alert thresholds.</p>
              {[
                { label: "Low Stock Threshold Override", desc: "Use product-level min quantities (recommended)", value: "Product Level" },
                { label: "SOH Report Default Location", desc: "Default location shown on load", value: "All Locations" },
                { label: "Auto-refresh Interval", desc: "How often orders data refreshes", value: "60 seconds" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-border">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <span className="text-sm text-primary font-medium">{item.value}</span>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={16} className="text-primary" />
                <span className="font-semibold text-base">CartonCloud Locations</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Manage which CartonCloud warehouses are linked to this portal.</p>
              {LOCATIONS.map(loc => (
                <div key={loc.id} className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-xs" style={{ background: loc.color }}>{loc.code}</div>
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">Connected · {PRODUCTS.filter(p => (p as any)[loc.id] > 0).length} active SKUs</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status="ok" />
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              ))}
              <div className="mt-5">
                <Button><Plus size={14} />Add Location</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integration">
            <CartonCloudIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
