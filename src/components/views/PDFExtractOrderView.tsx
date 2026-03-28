import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { useIncrementAddressUse } from "@/hooks/useAddresses";
import { AddressPicker, type SelectedAddress } from "@/components/AddressPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Upload, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, X, Sparkles
} from "lucide-react";

interface PDFExtractOrderViewProps {
  onBack: () => void;
}

interface ExtractedLineItem {
  ccProductCode: string | null;
  productId: string | null;
  productName: string;
  extractedCode: string;
  quantity: number;
  unitOfMeasure: string;
  matched: boolean;
  removed?: boolean;
}

interface ExtractedOrder {
  reference: string;
  deliverAddress: {
    companyName?: string;
    contactName?: string;
    address1: string;
    address2?: string;
    suburb?: string;
    stateCode?: string;
    postcode?: string;
    countryCode?: string;
  };
  deliverRequiredDate: string | null;
  deliverInstructions: string;
  urgent: boolean;
  invoiceValue: number | null;
  items: ExtractedLineItem[];
  confidence: "high" | "medium" | "low";
  notes: string;
}

export function PDFExtractOrderView({ onBack }: PDFExtractOrderViewProps) {
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extractionHintsOverride, setExtractionHintsOverride] = useState("");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedOrder | null>(null);

  const [reference, setReference] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState<SelectedAddress | null>(null);
  const [deliverRequiredDate, setDeliverRequiredDate] = useState("");
  const [deliverInstructions, setDeliverInstructions] = useState("");
  const [lineItems, setLineItems] = useState<ExtractedLineItem[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [invoiceValue, setInvoiceValue] = useState<string>("");
  const [includeUrgent, setIncludeUrgent] = useState(true);
  const [includeInvoiceValue, setIncludeInvoiceValue] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: connections } = useConnections();
  const incrementAddressUse = useIncrementAddressUse();

  const configuredConnections = (connections || []).filter(c => c.is_active && isConnectionConfigured(c));
  const selectedConnection = configuredConnections.find(c => c.id === selectedConnectionId);

  const activeItems = lineItems.filter(i => !i.removed);
  const matchedItems = activeItems.filter(i => i.matched);
  const unmatchedItems = activeItems.filter(i => !i.matched);
  const canSubmit = !!selectedConnectionId && !!reference && !!deliveryAddress && matchedItems.length > 0;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(file));
    // Reset extraction when new file is selected
    setExtracted(null);
    setLineItems([]);
  }

  function removeItem(index: number) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, removed: true } : item));
  }

  async function handleExtract() {
    if (!pdfFile || !selectedConnectionId) return;
    setExtracting(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });

      const { data, error } = await supabase.functions.invoke("cartoncloud-extract-order", {
        body: {
          pdfBase64: base64,
          connectionId: selectedConnectionId,
          extractionHints: extractionHintsOverride || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const result: ExtractedOrder = data.extracted;
      setExtracted(result);
      setReference(result.reference || "");
      setDeliverInstructions(result.deliverInstructions || "");
      setDeliverRequiredDate(result.deliverRequiredDate || "");
      setLineItems(result.items || []);
      setUrgent(result.urgent ?? false);
      setInvoiceValue(result.invoiceValue != null ? String(result.invoiceValue) : "");
      if (result.deliverAddress?.address1) {
        setDeliveryAddress({
          id: undefined,
          company_name: result.deliverAddress.companyName || null,
          contact_name: result.deliverAddress.contactName || null,
          address1: result.deliverAddress.address1,
          address2: result.deliverAddress.address2 || null,
          suburb: result.deliverAddress.suburb || null,
          state_code: result.deliverAddress.stateCode || null,
          postcode: result.deliverAddress.postcode || null,
          country_code: result.deliverAddress.countryCode || "AU",
          state_name: null,
          city: null,
          source: "ai-extract",
        });
      }

      if (result.confidence !== "high") {
        setHintsOpen(true);
      }
    } catch (err: any) {
      toast({
        title: "Extraction failed",
        description: err.message || "Could not extract order from PDF",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const addr = deliveryAddress!;
      const items = matchedItems
        .filter(i => i.ccProductCode)
        .map(i => ({
          ccProductCode: i.ccProductCode!,
          productId: i.productId || undefined,
          productName: i.productName,
          quantity: i.quantity,
          unitOfMeasure: i.unitOfMeasure,
        }));

      const { data, error } = await supabase.functions.invoke("cartoncloud-create-order", {
        body: {
          connectionId: selectedConnectionId,
          order: {
            reference,
            deliverAddress: {
              companyName: addr.company_name || "",
              contactName: addr.contact_name || "",
              address1: addr.address1,
              address2: addr.address2 || "",
              suburb: addr.suburb || "",
              stateCode: addr.state_code || "",
              postcode: addr.postcode || "",
              countryCode: addr.country_code || "AU",
            },
            deliverInstructions,
            deliverRequiredDate: deliverRequiredDate || undefined,
            deliverMethod: "SHIPPING",
            allowSplitting: true,
            urgent: includeUrgent ? urgent : false,
            invoiceValue: includeInvoiceValue ? (parseFloat(invoiceValue) || 0) : 0,
            items,
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create order");

      if (addr.id) incrementAddressUse.mutate(addr.id);

      toast({
        title: "Order placed successfully",
        description: `Order ${data.order?.order_number} — ${items.length} items`,
      });
      onBack();
    } catch (err: any) {
      toast({
        title: "Failed to place order",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-card border-b border-border flex items-center justify-between px-5 py-3 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back to Orders
          </button>
          <span className="text-border">|</span>
          <h1 className="text-lg font-semibold">New Order from Invoice</h1>
        </div>
        <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Placing Order…</> : "Place Order"}
        </Button>
      </div>

      {/* Body: side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Upload + PDF preview */}
        <div className="w-1/2 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 flex-shrink-0">
            {/* Connection selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Warehouse</label>
              <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a warehouse…" />
                </SelectTrigger>
                <SelectContent>
                  {configuredConnections.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors w-full justify-center"
            >
              <Upload size={16} />
              {pdfFile ? pdfFile.name : "Upload invoice PDF"}
            </button>

            {/* Extraction hints */}
            <Collapsible open={hintsOpen} onOpenChange={setHintsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown size={12} className={`transition-transform ${hintsOpen ? "rotate-0" : "-rotate-90"}`} />
                Extraction hints
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  value={extractionHintsOverride || selectedConnection?.extraction_hints || ""}
                  onChange={e => setExtractionHintsOverride(e.target.value)}
                  placeholder="Help the AI extract correctly…"
                  rows={3}
                  className="text-xs"
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Extract button */}
            <Button
              className="w-full gap-1.5"
              disabled={!pdfFile || !selectedConnectionId || extracting}
              onClick={handleExtract}
            >
              {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {extracting ? "Extracting…" : "Extract from PDF"}
            </Button>
          </div>

          {/* PDF preview */}
          <div className="flex-1 overflow-hidden bg-muted/30">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                <Upload size={32} className="opacity-30" />
                <span>Upload a PDF to preview</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Extracted order */}
        <div className="flex-1 overflow-auto">
          {!extracted ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <Sparkles size={32} className="opacity-30" />
              <span>Upload a PDF and click Extract to get started</span>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Confidence banner */}
              {extracted.confidence === "high" && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                  <CheckCircle2 size={16} />
                  Extraction complete — high confidence
                </div>
              )}
              {extracted.confidence === "medium" && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle size={16} />
                  Extraction complete — some fields may need review
                </div>
              )}
              {extracted.confidence === "low" && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle size={16} />
                  Low confidence extraction — please review all fields carefully
                </div>
              )}
              {extracted.notes && (
                <p className="text-xs text-muted-foreground">{extracted.notes}</p>
              )}

              {/* Order Details */}
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold text-sm">Order Details</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reference</label>
                  <Input value={reference} onChange={e => setReference(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Address</label>
                  <AddressPicker value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Search delivery address…" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Required Date</label>
                  <Input type="date" value={deliverRequiredDate} onChange={e => setDeliverRequiredDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Instructions</label>
                  <Textarea value={deliverInstructions} onChange={e => setDeliverInstructions(e.target.value)} rows={2} />
                </div>

                {/* Urgent toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={includeUrgent} onCheckedChange={setIncludeUrgent} className="scale-75" />
                    <label className="text-sm font-medium">Urgent</label>
                  </div>
                  {includeUrgent && (
                    <Switch checked={urgent} onCheckedChange={setUrgent} />
                  )}
                </div>

                {/* Invoice Value */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Switch checked={includeInvoiceValue} onCheckedChange={setIncludeInvoiceValue} className="scale-75" />
                    <label className="text-sm font-medium">Invoice Value</label>
                  </div>
                  {includeInvoiceValue && (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceValue}
                      onChange={e => setInvoiceValue(e.target.value)}
                      placeholder="0.00"
                    />
                  )}
                </div>
              </Card>

              {/* Line Items */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Product</th>
                        <th className="pb-2 font-medium text-muted-foreground">Extracted Code</th>
                        <th className="pb-2 font-medium text-muted-foreground w-20">Qty</th>
                        <th className="pb-2 font-medium text-muted-foreground w-24">UOM</th>
                        <th className="pb-2 font-medium text-muted-foreground">Status</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => {
                        if (item.removed) return null;
                        return (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-2 pr-2">
                              <Input
                                value={item.productName}
                                onChange={e => {
                                  setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, productName: e.target.value } : it));
                                }}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <span className="font-mono text-xs text-muted-foreground">{item.extractedCode}</span>
                            </td>
                            <td className="py-2 pr-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={e => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                                }}
                                className="h-8 text-sm w-20"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <Input
                                value={item.unitOfMeasure}
                                onChange={e => {
                                  setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, unitOfMeasure: e.target.value } : it));
                                }}
                                className="h-8 text-sm w-24"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              {item.matched ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Matched</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                                  <AlertTriangle size={10} />Unmatched
                                </Badge>
                              )}
                            </td>
                            <td className="py-2">
                              <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-xs text-muted-foreground">
                  {matchedItems.length} of {activeItems.length} items matched
                </div>

                {unmatchedItems.length > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span>Unmatched items will not be submitted. Remove them or update their product codes to match a mapped product.</span>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
