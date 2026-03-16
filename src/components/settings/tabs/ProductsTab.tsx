import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { type Connection, isConnectionConfigured, useUpdateProductSyncSettings } from "@/hooks/useConnections";
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

  const [syncMode, setSyncMode] = useState(connection.product_sync_mode || "pull");

  const settingsChanged = syncMode !== connection.product_sync_mode;

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        id: connection.id,
        product_sync_mode: syncMode,
        product_auto_import: true,
        product_match_strategy: "sku",
      });
      toast({ title: "Saved", description: "Product sync settings updated." });
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
    : "Never";

  const matched = connection.product_last_sync_matched ?? 0;
  const created = connection.product_last_sync_unmatched_cc ?? 0;

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
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {syncMode === "pull" && "Products are matched by SKU or auto-created during sync."}
            {syncMode === "disabled" && "No product sync for this connection."}
          </p>
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
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Last synced</span>
            <div className="font-medium">{lastSynced}</div>
          </div>
          {connection.product_last_synced_at && (
            <>
              <div>
                <span className="text-xs text-muted-foreground">Matched</span>
                <div className="font-medium text-[hsl(142,76%,36%)]">{matched}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Created</span>
                <div className="font-medium text-[hsl(210,100%,40%)]">{created}</div>
              </div>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSyncDialog(true)} disabled={syncMode === "disabled"}>
          <RefreshCw size={14} /> Sync Now
        </Button>
      </div>

      <ProductSyncDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        connection={connection}
      />
    </div>
  );
}
