import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConnections, isConnectionConfigured, useTestConnection, useUpsertConnection, type Connection } from "@/hooks/useConnections";
import { ConnectionSettingsModal } from "@/components/settings/ConnectionSettingsModal";
import { Settings, Plus, Cloud, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsView() {
  const { data: connections, isLoading } = useConnections();
  const [managingConnection, setManagingConnection] = useState<Connection | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

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
                <Button onClick={() => setShowNewDialog(true)}><Plus size={14} /> Add Connection</Button>
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

      <NewConnectionDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(conn) => {
          setShowNewDialog(false);
          setManagingConnection(conn);
        }}
      />
    </div>
  );
}

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function NewConnectionDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (conn: Connection) => void;
}) {
  const upsert = useUpsertConnection();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      const result = await upsert.mutateAsync({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        color,
        api_endpoint: "https://api.cartoncloud.com.au",
      });
      toast({ title: "Connection created", description: `${name} has been added.` });
      setName("");
      setCode("");
      setColor(COLORS[0]);
      onCreated(result as unknown as Connection);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Connection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="conn-name">Name</Label>
            <Input id="conn-name" placeholder="e.g. Sydney Warehouse" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conn-code">Code</Label>
            <Input id="conn-code" placeholder="e.g. SYD" value={code} onChange={e => setCode(e.target.value)} className="uppercase" />
            <p className="text-xs text-muted-foreground">Short identifier used in order prefixes</p>
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || !code.trim() || upsert.isPending}>
            {upsert.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Create Connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
          connection.name.substring(0, 2).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{connection.name}</span>
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