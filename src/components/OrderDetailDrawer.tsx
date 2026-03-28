import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { LocationChip } from "@/components/LocationChip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Cloud, Monitor, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { SaleOrder } from "@/hooks/useSaleOrders";

interface OrderDetailDrawerProps {
  order: SaleOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderDetailDrawer({ order, open, onOpenChange }: OrderDetailDrawerProps) {
  const [resubmitting, setResubmitting] = useState(false);

  if (!order) return null;

  const items = order.items || [];
  const canResubmit = order.status === "REJECTED";

  async function handleResubmit() {
    if (!order) return;
    setResubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cartoncloud-resubmit-order", {
        body: { orderId: order.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Resubmit failed");

      if (data.warning) {
        toast({
          title: "Order resubmitted but flagged",
          description: `Order ${data.order?.order_number} was created with status: ${data.order?.status}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Order resubmitted successfully",
          description: `Order ${data.order?.order_number} — status: ${data.order?.status}`,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to resubmit order",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setResubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">
              {order.order_number || order.cc_numeric_id || order.cc_order_id}
            </SheetTitle>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <LocationChip locationId={order.connection_id} />
            <Badge variant="outline" className="text-xs gap-1">
              {order.source === "cartoncloud" ? (
                <><Cloud size={10} /> CartonCloud</>
              ) : (
                <><Monitor size={10} /> Portal</>
              )}
            </Badge>
            {order.urgent && (
              <Badge variant="destructive" className="text-xs">Urgent</Badge>
            )}
          </div>
          {canResubmit && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResubmit}
                disabled={resubmitting}
                className="gap-1.5"
              >
                {resubmitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Resubmitting…</>
                ) : (
                  <><RefreshCw size={14} /> Resubmit to CartonCloud</>
                )}
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-5 pt-5">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Order Number" value={order.order_number} />
            <Field label="CC ID" value={order.cc_numeric_id} />
            <Field label="Customer" value={order.customer_name} />
            <Field label="Total Qty" value={order.total_qty?.toLocaleString()} />
            <Field label="Items" value={String(order.total_items)} />
            <Field label="Delivery Method" value={order.deliver_method} />
            <Field label="Required Date" value={
              order.raw_payload?.details?.deliver?.requiredDate
                ? new Date(order.raw_payload.details.deliver.requiredDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                : null
            } />
            <Field label="Invoice Value" value={
              order.invoice_amount != null ? `$${Number(order.invoice_amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })} ${order.invoice_currency || ""}` : null
            } />
          </div>

          {/* Delivery Address */}
          {order.deliver_address && (
            <div className="text-sm">
              <div className="text-muted-foreground text-xs font-medium mb-1">Delivery Address</div>
              <div>{order.deliver_company && <div className="font-medium">{order.deliver_company}</div>}</div>
              <div className="text-muted-foreground">{order.deliver_address}</div>
            </div>
          )}

          {/* Collection Address */}
          {order.collect_address && (
            <div className="text-sm">
              <div className="text-muted-foreground text-xs font-medium mb-1">Collection Address</div>
              {order.collect_company && <div className="font-medium">{order.collect_company}</div>}
              <div className="text-muted-foreground">{order.collect_address}</div>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Items ({items.length})</div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs">UOM</TableHead>
                    <TableHead className="text-xs">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                        No items
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{item.product_name || "—"}</div>
                          {item.cc_product_code && (
                            <div className="text-xs text-muted-foreground font-mono">{item.cc_product_code}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.unit_of_measure || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.expiry_date || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Created" value={formatDate(order.cc_created_at)} />
            <Field label="Modified" value={formatDate(order.cc_modified_at)} />
            <Field label="Packed" value={formatDate(order.cc_packed_at)} />
            <Field label="Dispatched" value={formatDate(order.cc_dispatched_at)} />
          </div>

          {/* Last Synced & Raw payload */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Last synced: {formatDate(order.updated_at)}</span>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown size={12} />
              Raw Payload
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64 text-muted-foreground">
                {JSON.stringify(order.raw_payload, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
