import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Upload, X } from "lucide-react";
import { useUpsertConnection, useTestConnection, type Connection } from "@/hooks/useConnections";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LocationConnectionCardProps {
  connection: Connection;
}

const PRESET_COLORS = [
  "hsl(206, 100%, 40%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(258, 90%, 66%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 68%, 50%)",
  "hsl(190, 90%, 40%)",
  "hsl(340, 82%, 52%)",
];

function getAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function LocationConnectionCard({ connection }: LocationConnectionCardProps) {
  const hasCredentials = !!(connection.client_id && connection.client_secret && connection.tenant_id);
  const [isEditing, setIsEditing] = useState(!hasCredentials);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const [name, setName] = useState(connection.name);
  const [color, setColor] = useState(connection.color);
  const [logoUrl, setLogoUrl] = useState(connection.logo_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tenantId, setTenantId] = useState(connection.tenant_id || "");
  const [clientId, setClientId] = useState(connection.client_id || "");
  const [clientSecret, setClientSecret] = useState(connection.client_secret || "");
  const [endpoint, setEndpoint] = useState(connection.api_endpoint || "https://api.cartoncloud.com");

  const upsertMutation = useUpsertConnection();
  const testMutation = useTestConnection();

  const mask = (val: string) => val ? "••••••••" : "";
  const canSave = !!(tenantId && clientId && clientSecret);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${connection.id}.${ext}`;

      // Remove old logo if exists
      await supabase.storage.from("connection-logos").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("connection-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("connection-logos")
        .getPublicUrl(filePath);

      const newUrl = publicData.publicUrl + "?t=" + Date.now();
      setLogoUrl(newUrl);

      // Save immediately
      await upsertMutation.mutateAsync({
        id: connection.id,
        name,
        code: connection.code,
        color,
        api_endpoint: endpoint,
        tenant_id: connection.tenant_id,
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        is_active: connection.is_active,
        logo_url: newUrl,
      });

      toast({ title: "Logo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const ext = logoUrl.split("/").pop()?.split("?")[0]?.split(".").pop();
      if (ext) {
        await supabase.storage.from("connection-logos").remove([`${connection.id}.${ext}`]);
      }
      setLogoUrl("");
      await upsertMutation.mutateAsync({
        id: connection.id,
        name,
        code: connection.code,
        color,
        api_endpoint: endpoint,
        tenant_id: connection.tenant_id,
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        is_active: connection.is_active,
        logo_url: null,
      });
      toast({ title: "Logo removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      await testMutation.mutateAsync(connection.id);
      setTestResult("success");
    } catch {
      setTestResult("error");
    }
  };

  const handleSaveAppearance = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id,
        name,
        code: connection.code,
        color,
        api_endpoint: connection.api_endpoint,
        tenant_id: connection.tenant_id,
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        is_active: connection.is_active,
        logo_url: logoUrl || null,
      });
      toast({ title: "Saved", description: "Connection appearance updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id,
        name,
        code: connection.code,
        color,
        api_endpoint: endpoint,
        tenant_id: tenantId,
        client_id: clientId,
        client_secret: clientSecret,
        is_active: true,
        logo_url: logoUrl || null,
      });
      setIsEditing(false);
      setTestResult(null);
      toast({ title: "Saved", description: `Connection for ${connection.code} updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id,
        name,
        code: connection.code,
        color,
        api_endpoint: endpoint,
        tenant_id: null,
        client_id: null,
        client_secret: null,
        is_active: true,
        logo_url: logoUrl || null,
      });
      setTenantId("");
      setClientId("");
      setClientSecret("");
      setIsEditing(true);
      setTestResult(null);
      toast({ title: "Disconnected", description: `${connection.code} credentials removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const appearanceChanged = name !== connection.name || color !== connection.color;

  return (
    <div className="space-y-5">
      {/* Appearance Section */}
      <div className="space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</span>

        <div className="flex items-start gap-4">
          {/* Logo / Tile Preview */}
          <div className="space-y-2">
            <Label className="text-xs">Logo / Tile</Label>
            <div className="relative group">
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0 cursor-pointer"
                style={{ background: logoUrl ? "transparent" : color }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">{getAbbreviation(name)}</span>
                )}
              </div>
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-primary hover:underline"
            >
              {logoUrl ? "Change" : "Upload"}
            </button>
          </div>

          {/* Name + Color */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Connection name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tile Color</Label>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-md border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: c === color ? "hsl(var(--foreground))" : "transparent",
                      transform: c === color ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {appearanceChanged && (
          <Button size="sm" onClick={handleSaveAppearance} disabled={upsertMutation.isPending || !name.trim()}>
            {upsertMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Save Appearance
          </Button>
        )}
      </div>

      <Separator />

      {/* Credentials Section */}
      <div className="space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Credentials</span>

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
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>Disconnect</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
