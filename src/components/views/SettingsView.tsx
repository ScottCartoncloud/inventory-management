import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConnections, isConnectionConfigured, useTestConnection, type Connection } from "@/hooks/useConnections";
import { ConnectionSettingsModal } from "@/components/settings/ConnectionSettingsModal";
import { Settings, Plus, Cloud, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export function SettingsView() {
  const { data: connections, isLoading } = useConnections();
  const [managingConnection, setManagingConnection] = useState<Connection | null>(null);

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
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(connections || []).map(conn => (
                    <ConnectionSummaryRow
                      key={conn.id}
                      connection={conn}
                      onManage={() => setManagingConnection(conn)}
                    />
                  ))}
                </div>
              )}

              <div className="mt-5">
                <Button><Plus size={14} /> Add Connection</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {managingConnection && (
        <ConnectionSettingsModal
          open={!!managingConnection}
          onOpenChange={(open) => { if (!open) setManagingConnection(null); }}
          connection={managingConnection}
        />
      )}
    </div>
  );
}

function ConnectionSummaryRow({ connection, onManage }: { connection: Connection; onManage: () => void }) {
  const configured = isConnectionConfigured(connection);
  const testMutation = useTestConnection();

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!configured) return;
    try {
      await testMutation.mutateAsync(connection.id);
      toast({ 
        title: "✓ Connection Successful", 
        description: `Successfully connected to ${connection.name}.`,
      });
    } catch {
      toast({ 
        title: "✗ Connection Failed", 
        description: "Unable to connect. Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center overflow-hidden font-bold text-xs shrink-0 border-2"
        style={{
          background: connection.logo_url ? 'hsl(var(--background))' : connection.color,
          borderColor: connection.color,
          color: connection.logo_url ? connection.color : 'white',
        }}
      >
        {connection.logo_url ? (
          <img src={connection.logo_url} alt={connection.name} className="w-full h-full object-contain" />
        ) : (
          connection.code.substring(0, 2).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{connection.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{connection.code}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {connection.api_endpoint.replace("https://", "")}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={configured
            ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent"
            : "bg-muted text-muted-foreground border-transparent"
          }
        >
          {configured ? "Connected" : "Not Configured"}
        </Badge>

        {configured && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleTest}
            disabled={testMutation.isPending}
          >
            {testMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Test"}
          </Button>
        )}

        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onManage}>
          Manage
        </Button>
      </div>
    </div>
  );
}
