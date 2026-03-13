import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { type Connection, isConnectionConfigured } from "@/hooks/useConnections";
import { useRefreshSOH } from "@/hooks/useStockOnHand";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

interface SOHTabProps {
  connection: Connection;
}

export function SOHTab({ connection }: SOHTabProps) {
  const configured = isConnectionConfigured(connection);
  const hasCustomerId = !!(connection as any).cc_customer_id;
  const refreshMutation = useRefreshSOH();
  const qc = useQueryClient();
  const [interval, setInterval] = useState((connection as any).soh_refresh_interval || "manual");

  const handleRefresh = async () => {
    try {
      const result = await refreshMutation.mutateAsync(connection.id);
      toast({
        title: "SOH Refreshed",
        description: `${result.summary.matched_to_portal} products matched, ${result.summary.unmatched} unmatched from ${result.summary.total_rows_from_cc} rows.`,
      });
    } catch (err: any) {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleIntervalChange = async (val: string) => {
    setInterval(val);
    await supabase
      .from("connections")
      .update({ soh_refresh_interval: val } as any)
      .eq("id", connection.id);
    qc.invalidateQueries({ queryKey: ["connections"] });
  };

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-4xl opacity-30">📊</div>
        <div className="font-semibold">Connection Required</div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Configure API credentials in the Credentials tab before using SOH reports.
        </p>
      </div>
    );
  }

  if (!hasCustomerId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-4xl opacity-30">📊</div>
        <div className="font-semibold">Customer ID Required</div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add your CartonCloud Customer ID in the Credentials tab to enable Stock on Hand reports.
        </p>
      </div>
    );
  }

  const lastRefreshed = (connection as any).soh_last_refreshed_at
    ? new Date((connection as any).soh_last_refreshed_at).toLocaleString()
    : "Never";

  return (
    <div className="space-y-6 max-w-lg">
      {/* Refresh Status */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">SOH Status</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Last refreshed</span>
            <div className="font-medium">{lastRefreshed}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshMutation.isPending}>
          {refreshMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh Now
        </Button>
      </div>

      <Separator />

      {/* Refresh Interval */}
      <div className="space-y-1.5">
        <Label className="text-xs">Auto-Refresh Interval</Label>
        <Select value={interval} onValueChange={handleIntervalChange}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual only</SelectItem>
            <SelectItem value="5min" disabled>Every 5 minutes (coming soon)</SelectItem>
            <SelectItem value="15min" disabled>Every 15 minutes (coming soon)</SelectItem>
            <SelectItem value="30min" disabled>Every 30 minutes (coming soon)</SelectItem>
            <SelectItem value="60min" disabled>Every 60 minutes (coming soon)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How often SOH data is automatically refreshed from CartonCloud.
        </p>
      </div>
    </div>
  );
}
