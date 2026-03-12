import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LOCATIONS } from "@/data/locations";
import { PRODUCTS } from "@/data/products";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationConnectionCard } from "@/components/settings/LocationConnectionCard";
import { Settings, Plus, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SettingsView() {
  return (
    <div className="flex-1 overflow-y-auto animate-in fade-in duration-200">
      <div className="p-5 max-w-3xl mx-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
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

          <TabsContent value="connections">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={16} className="text-primary" />
                <span className="font-semibold text-base">CartonCloud Connections</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Each location connects to an independent CartonCloud tenant with its own API credentials.
              </p>

              <Accordion type="single" collapsible className="w-full">
                {LOCATIONS.map(loc => (
                  <AccordionItem key={loc.id} value={loc.id}>
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 flex-1 mr-4">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ background: loc.color }}
                        >
                          {loc.code}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium">{loc.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {loc.endpoint} · {PRODUCTS.filter(p => (p as any)[loc.id] > 0).length} active SKUs
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={loc.isConnected
                            ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent"
                            : "bg-muted text-muted-foreground border-transparent"
                          }
                        >
                          {loc.isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <LocationConnectionCard location={loc} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-5">
                <Button><Plus size={14} /> Add Connection</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
