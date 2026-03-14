import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Connection } from "@/hooks/useConnections";
import { Copy, Check, RefreshCw, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WebhooksTabProps {
  connection: Connection;
}

export function WebhooksTab({ connection }: WebhooksTabProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);

  const webhookSecret = (connection as any).webhook_secret as string | null;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = webhookSecret
    ? `https://${projectId}.supabase.co/functions/v1/cartoncloud-webhook/${connection.id}?secret=${webhookSecret}`
    : null;

  async function generateSecret() {
    setGenerating(true);
    try {
      const secret = crypto.randomUUID().replace(/-/g, "");
      const { error } = await supabase
        .from("connections")
        .update({ webhook_secret: secret } as any)
        .eq("id", connection.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast({ title: "Webhook URL generated", description: "Copy the URL and paste it into CartonCloud." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateSecret() {
    setShowRegenConfirm(false);
    await generateSecret();
  }

  function copyUrl() {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Recent webhook events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["webhook-events", connection.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("connection_id", connection.id)
        .order("received_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  async function reprocessEvent(eventId: string) {
    const event = events?.find(e => e.id === eventId);
    if (!event) return;

    try {
      // Re-invoke the webhook function with the stored payload
      const url = `https://${projectId}.supabase.co/functions/v1/cartoncloud-webhook/${connection.id}?secret=${webhookSecret}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.payload),
      });
      if (res.ok) {
        toast({ title: "Event reprocessed" });
        queryClient.invalidateQueries({ queryKey: ["webhook-events", connection.id] });
        queryClient.invalidateQueries({ queryKey: ["sale-orders"] });
      } else {
        toast({ title: "Reprocess failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Reprocess failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Webhook URL Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Webhook URL</h3>
        <p className="text-sm text-muted-foreground">
          Paste this URL into your CartonCloud tenant's webhook configuration for outbound order events.
        </p>

        {!webhookSecret ? (
          <Button onClick={generateSecret} disabled={generating} className="gap-2">
            <Link2 size={14} />
            {generating ? "Generating…" : "Generate Webhook URL"}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl || ""}
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyUrl} className="shrink-0">
                {copied ? <Check size={14} className="text-[hsl(142,76%,36%)]" /> : <Copy size={14} />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowRegenConfirm(true)}
            >
              <RefreshCw size={12} className="mr-1" />
              Regenerate URL
            </Button>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recent Webhook Events</h3>
        {eventsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No webhook events received yet.
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {events.map((evt) => (
              <div key={evt.id} className="px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={evt.processed
                        ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent text-[0.65rem]"
                        : "bg-destructive/10 text-destructive border-transparent text-[0.65rem]"
                      }
                    >
                      {evt.processed ? "✓" : "✗"}
                    </Badge>
                    <span className="font-mono text-xs truncate">{evt.cc_order_id || "—"}</span>
                    <span className="text-xs text-muted-foreground">{evt.event_type}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(evt.received_at).toLocaleString()}
                    </span>
                    {!evt.processed && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => reprocessEvent(evt.id)}>
                        Reprocess
                      </Button>
                    )}
                  </div>
                </div>
                {evt.processing_error && (
                  <div className="mt-1 text-xs text-destructive bg-destructive/5 rounded px-2 py-1">
                    {evt.processing_error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regenerate confirmation */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Webhook URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current webhook URL. You'll need to update the URL in CartonCloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={regenerateSecret}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
