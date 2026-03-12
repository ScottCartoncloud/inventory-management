import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Location } from "@/data/locations";

interface LocationConnectionCardProps {
  location: Location;
}

export function LocationConnectionCard({ location }: LocationConnectionCardProps) {
  const [isConnected, setIsConnected] = useState(location.isConnected);
  const [isSaved, setIsSaved] = useState(location.isConnected);
  const [isEditing, setIsEditing] = useState(!location.isConnected);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [tenantId, setTenantId] = useState(location.isConnected ? "tenant-" + location.id : "");
  const [clientId, setClientId] = useState(location.isConnected ? "client-" + location.id : "");
  const [clientSecret, setClientSecret] = useState(location.isConnected ? "secret-" + location.id : "");
  const [endpoint, setEndpoint] = useState(location.endpoint);

  const mask = (val: string) => val ? "••••••••" : "";

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1500));
    const success = tenantId && clientId && clientSecret;
    setTestResult(success ? "success" : "error");
    setIsTesting(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setIsEditing(false);
    setIsConnected(true);
    setTestResult(null);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsSaved(false);
    setIsEditing(true);
    setTenantId("");
    setClientId("");
    setClientSecret("");
    setTestResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>API Endpoint</Label>
        <Select value={endpoint} onValueChange={setEndpoint} disabled={!isEditing}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="api.cartoncloud.com">api.cartoncloud.com (AU/Global)</SelectItem>
            <SelectItem value="api.na.cartoncloud.com">api.na.cartoncloud.com (North America)</SelectItem>
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

      {testResult && (
        <div className={`flex items-center gap-2 text-sm rounded-md p-3 ${
          testResult === "success"
            ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]"
            : "bg-destructive/10 text-destructive"
        }`}>
          {testResult === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult === "success" ? "Connection successful!" : "Connection failed. Please check your credentials."}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting || !tenantId || !clientId || !clientSecret}
            >
              {isTesting && <Loader2 size={14} className="animate-spin" />}
              Test Connection
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!tenantId || !clientId || !clientSecret}>
              {isSaved ? "Update Credentials" : "Save & Connect"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Update Credentials</Button>
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>Disconnect</Button>
          </>
        )}
      </div>
    </div>
  );
}
