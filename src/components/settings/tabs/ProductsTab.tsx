import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { type Connection, isConnectionConfigured, useUpdateProductSyncSettings } from "@/hooks/useConnections";
import { useConnectionMappings } from "@/hooks/useConnectionMappings";
import { useDeleteProductMapping } from "@/hooks/useProducts";
import { ProductSyncDialog } from "@/components/ProductSyncDialog";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ProductsTabProps {
  connection: Connection;
}

export function ProductsTab({ connection }: ProductsTabProps) {
  const configured = isConnectionConfigured(connection);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const updateSettings = useUpdateProductSyncSettings();
  const { data: mappings = [], isLoading: mappingsLoading } = useConnectionMappings(connection.id);
  const deleteMapping = useDeleteProductMapping();

  const [syncMode, setSyncMode] = useState(connection.product_sync_mode || "pull");
  const [autoImport, setAutoImport] = useState(connection.product_auto_import ?? false);
  const [matchStrategy, setMatchStrategy] = useState(connection.product_match_strategy || "sku");

  const settingsChanged =
    syncMode !== connection.product_sync_mode ||
    autoImport !== connection.product_auto_import ||
    matchStrategy !== connection.product_match_strategy;

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        id: connection.id,
        product_sync_mode: syncMode,
        product_auto_import: autoImport,
        product_match_strategy: matchStrategy,
      });
      toast({ title: "Saved", description: "Product sync settings updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemoveOverride = async (mapping: typeof mappings[0]) => {
    try {
      await deleteMapping.mutateAsync({ product_id: mapping.product_id, connection_id: mapping.connection_id });
      toast({ title: "Override removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-4xl opacity-30">🔗</div>
        <div className="font-semibold">Connection Required</div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Configure API credentials in the Credentials tab before setting up product sync.
        </p>
      </div>
    );
  }

  const lastSynced = connection.product_last_synced_at
    ? new Date(connection.product_last_synced_at).toLocaleString()
    : "Never synced";

  return (
    <div className="space-y-6">
      {/* Sync Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Sync Settings</h3>

        <div className="space-y-1.5">
          <Label className="text-xs">Sync Mode</Label>
          <Select value={syncMode} onValueChange={setSyncMode}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pull">Pull from CartonCloud</SelectItem>
              <SelectItem value="push" disabled>Push to CartonCloud (Coming soon)</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {syncMode === "pull" && "Import products from CartonCloud into the portal."}
            {syncMode === "push" && "Push portal products to CartonCloud."}
            {syncMode === "disabled" && "No product sync for this connection."}
          </p>
        </div>

        <div className="flex items-center justify-between max-w-xs">
          <div>
            <Label className="text-xs">Auto-import new products</Label>
            <p className="text-xs text-muted-foreground">New products found during sync are automatically added</p>
          </div>
          <Switch checked={autoImport} onCheckedChange={setAutoImport} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Code Matching Strategy</Label>
          <Select value={matchStrategy} onValueChange={setMatchStrategy}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sku">SKU Code (exact match)</SelectItem>
              <SelectItem value="barcode" disabled>Barcode match (Coming soon)</SelectItem>
              <SelectItem value="manual">Manual mapping only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settingsChanged && (
          <Button size="sm" onClick={handleSaveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 size={14} className="animate-spin" />}
            Save Settings
          </Button>
        )}
      </div>

      <Separator />

      {/* Sync Status */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Sync Status</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Last synced</span>
            <div className="font-medium">{lastSynced}</div>
          </div>
          {connection.product_last_synced_at && (
            <>
              <div>
                <span className="text-xs text-muted-foreground">Matched</span>
                <div className="font-medium text-[hsl(142,76%,36%)]">{connection.product_last_sync_matched ?? 0}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Unmatched (in CC)</span>
                <div className="font-medium text-[hsl(38,92%,50%)]">{connection.product_last_sync_unmatched_cc ?? 0}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Unmatched (in Portal)</span>
                <div className="font-medium text-muted-foreground">{connection.product_last_sync_unmatched_portal ?? 0}</div>
              </div>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSyncDialog(true)} disabled={syncMode === "disabled"}>
          <RefreshCw size={14} /> Sync Now
        </Button>
      </div>

      <Separator />

      {/* Product Mappings Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Product Mappings</h3>

        {mappingsLoading ? (
          <div className="text-sm text-muted-foreground">Loading mappings…</div>
        ) : mappings.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-border rounded-md">
            <div className="text-3xl mb-2 opacity-30">📋</div>
            <div className="font-medium mb-1">No product mappings yet</div>
            <div className="text-xs">Click "Sync Now" to match products with this CartonCloud tenant.</div>
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="text-xs">Portal SKU</TableHead>
                  <TableHead className="text-xs">Portal Name</TableHead>
                  <TableHead className="text-xs">CC Code</TableHead>
                  <TableHead className="text-xs">CC Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Last Synced</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map(mapping => (
                  <TableRow key={mapping.id}>
                    <TableCell className="text-xs font-mono">{mapping.products?.sku ?? "—"}</TableCell>
                    <TableCell className="text-xs">{mapping.products?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{mapping.cc_product_code}</TableCell>
                    <TableCell className="text-xs">{mapping.cc_product_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[0.65rem] py-0 ${mapping.is_override ? "text-[hsl(38,92%,50%)]" : "text-[hsl(142,76%,36%)]"}`}>
                        {mapping.is_override ? "Override" : "Auto"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {mapping.last_synced_at ? new Date(mapping.last_synced_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {mapping.is_override && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveOverride(mapping)}>
                          <Trash2 size={12} className="text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ProductSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        connection={connection}
      />
    </div>
  );
}
