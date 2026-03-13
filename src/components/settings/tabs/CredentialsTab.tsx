import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useUpsertConnection, useTestConnection, type Connection } from "@/hooks/useConnections";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CredentialsTabProps {
  connection: Connection;
}

export function CredentialsTab({ connection }: CredentialsTabProps) {
  const hasCredentials = !!(connection.client_id && connection.client_secret && connection.tenant_id);
  const [isEditing, setIsEditing] = useState(!hasCredentials);
  const [showSecret, setShowSecret] = useState(false);

  const [tenantId, setTenantId] = useState(connection.tenant_id || "");
  const [clientId, setClientId] = useState(connection.client_id || "");
  const [clientSecret, setClientSecret] = useState(connection.client_secret || "");
  const [endpoint, setEndpoint] = useState(connection.api_endpoint || "https://api.cartoncloud.com");
  const [customerId, setCustomerId] = useState(connection.cc_customer_id || "");
  const [warehouseName, setWarehouseName] = useState(connection.cc_warehouse_name || "Default");

  const upsertMutation = useUpsertConnection();
  const testMutation = useTestConnection();

  const mask = (val: string) => val ? "••••••••" : "";
  const canSave = !!(tenantId && clientId && clientSecret);

  const handleTestConnection = async () => {
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

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id,
        name: connection.name,
        code: connection.code,
        color: connection.color,
        api_endpoint: endpoint,
        tenant_id: tenantId,
        client_id: clientId,
        client_secret: clientSecret,
        is_active: true,
        logo_url: connection.logo_url,
        cc_customer_id: customerId || null,
        cc_warehouse_name: warehouseName || "Default",
      });
      setIsEditing(false);
      toast({ title: "Saved", description: `Connection for ${connection.code} updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id,
        name: connection.name,
        code: connection.code,
        color: connection.color,
        api_endpoint: endpoint,
        tenant_id: null,
        client_id: null,
        client_secret: null,
        is_active: true,
        logo_url: connection.logo_url,
      });
      setTenantId("");
      setClientId("");
      setClientSecret("");
      setIsEditing(true);
      toast({ title: "Disconnected", description: `${connection.code} credentials removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label>API Endpoint</Label>
        <Select value={endpoint} onValueChange={setEndpoint} disabled={!isEditing}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="https://api.cartoncloud.com">api.cartoncloud.com (AU/Global)</SelectItem>
            <SelectItem value="https://api.na.cartoncloud.com">api.na.cartoncloud.com (North America)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Tenant ID</Label>
        <Input
          placeholder="Enter Tenant ID"
          value={isEditing ? tenantId : mask(tenantId)}
          onChange={e => setTenantId(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Client ID</Label>
        <Input
          placeholder="Enter Client ID"
          value={isEditing ? clientId : mask(clientId)}
          onChange={e => setClientId(e.target.value)}
          disabled={!isEditing}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Client Secret</Label>
        <div className="relative">
          <Input
            type={showSecret ? "text" : "password"}
            placeholder="Enter Client Secret"
            value={isEditing ? clientSecret : mask(clientSecret)}
            onChange={e => setClientSecret(e.target.value)}
            disabled={!isEditing}
            className="pr-10"
          />
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testMutation.isPending || (!isEditing && !hasCredentials) || (isEditing && !canSave)}
        >
          {testMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Test Connection
        </Button>
        {isEditing ? (
          <Button size="sm" onClick={handleSave} disabled={!canSave || upsertMutation.isPending}>
            {upsertMutation.isPending && <Loader2 size={14} className="animate-spin mr-1" />}
            {hasCredentials ? "Update Credentials" : "Save & Connect"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Update Credentials</Button>
          </>
        )}
      </div>

      {hasCredentials && !isEditing && (
        <div className="pt-4 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Disconnect</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect {connection.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all API credentials for this connection. Product mappings will be preserved but sync will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
