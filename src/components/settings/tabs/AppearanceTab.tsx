import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useUpsertConnection, type Connection } from "@/hooks/useConnections";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

interface AppearanceTabProps {
  connection: Connection;
}

export function AppearanceTab({ connection }: AppearanceTabProps) {
  const [name, setName] = useState(connection.name);
  const [color, setColor] = useState(connection.color);
  const [logoUrl, setLogoUrl] = useState(connection.logo_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upsertMutation = useUpsertConnection();
  const appearanceChanged = name !== connection.name || color !== connection.color;

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
      await supabase.storage.from("connection-logos").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("connection-logos").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("connection-logos").getPublicUrl(filePath);
      const newUrl = publicData.publicUrl + "?t=" + Date.now();
      setLogoUrl(newUrl);
      await upsertMutation.mutateAsync({
        id: connection.id, name, code: connection.code, color,
        api_endpoint: connection.api_endpoint, tenant_id: connection.tenant_id,
        client_id: connection.client_id, client_secret: connection.client_secret,
        is_active: connection.is_active, logo_url: newUrl,
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
      if (ext) await supabase.storage.from("connection-logos").remove([`${connection.id}.${ext}`]);
      setLogoUrl("");
      await upsertMutation.mutateAsync({
        id: connection.id, name, code: connection.code, color,
        api_endpoint: connection.api_endpoint, tenant_id: connection.tenant_id,
        client_id: connection.client_id, client_secret: connection.client_secret,
        is_active: connection.is_active, logo_url: null,
      });
      toast({ title: "Logo removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveAppearance = async () => {
    try {
      await upsertMutation.mutateAsync({
        id: connection.id, name, code: connection.code, color,
        api_endpoint: connection.api_endpoint, tenant_id: connection.tenant_id,
        client_id: connection.client_id, client_secret: connection.client_secret,
        is_active: connection.is_active, logo_url: logoUrl || null,
      });
      toast({ title: "Saved", description: "Connection appearance updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-start gap-4">
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
              <button onClick={handleRemoveLogo} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">
            {logoUrl ? "Change" : "Upload"}
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Display Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Connection name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tile Color</Label>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-md border-2 transition-all"
                  style={{ background: c, borderColor: c === color ? "hsl(var(--foreground))" : "transparent", transform: c === color ? "scale(1.15)" : "scale(1)" }}
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
  );
}
