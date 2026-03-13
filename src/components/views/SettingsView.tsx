import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { PRODUCTS } from "@/data/products";
import { LocationConnectionCard } from "@/components/settings/LocationConnectionCard";
import { Settings, Plus, Cloud, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsView() {
  const { data: connections, isLoading } = useConnections();

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

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {(connections || []).map(conn => {
                    const configured = isConnectionConfigured(conn);
                    return (
                      <AccordionItem key={conn.id} value={conn.id}>
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3 flex-1 mr-4">
                            <div
                              className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0"
                              style={{ background: conn.color }}
                            >
                              {conn.code}
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">{conn.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {conn.api_endpoint.replace("https://", "")}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={configured
                                ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent"
                                : "bg-muted text-muted-foreground border-transparent"
                              }
                            >
                              {configured ? "Connected" : "Not Configured"}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <LocationConnectionCard connection={conn} />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}

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
