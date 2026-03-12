import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";

export function CartonCloudIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [endpoint, setEndpoint] = useState("api.cartoncloud.com");

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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-primary" />
          <span className="font-semibold text-base">CartonCloud Integration</span>
        </div>
        <Badge
          variant="outline"
          className={isConnected
            ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent"
            : "bg-muted text-muted-foreground border-transparent"
          }
        >
          {isConnected ? "Connected" : "Not Connected"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Connect your CartonCloud account to sync warehouse data, inventory levels, and order information.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="endpoint">API Endpoint</Label>
          <Select value={endpoint} onValueChange={setEndpoint} disabled={!isEditing}>
            <SelectTrigger id="endpoint">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api.cartoncloud.com">api.cartoncloud.com (AU/Global)</SelectItem>
              <SelectItem value="api.na.cartoncloud.com">api.na.cartoncloud.com (North America)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input
            id="tenantId"
            placeholder="Enter your Tenant ID"
            value={isEditing ? tenantId : mask(tenantId)}
            onChange={e => setTenantId(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            placeholder="Enter your Client ID"
            value={isEditing ? clientId : mask(clientId)}
            onChange={e => setClientId(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <div className="relative">
            <Input
              id="clientSecret"
              type={showSecret ? "text" : "password"}
              placeholder="Enter your Client Secret"
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
                onClick={handleTestConnection}
                disabled={isTesting || !tenantId || !clientId || !clientSecret}
              >
                {isTesting && <Loader2 size={14} className="animate-spin" />}
                Test Connection
              </Button>
              <Button onClick={handleSave} disabled={!tenantId || !clientId || !clientSecret}>
                {isSaved ? "Update Credentials" : "Save Settings"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>Update Credentials</Button>
              <Button variant="destructive" onClick={handleDisconnect}>Disconnect</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
