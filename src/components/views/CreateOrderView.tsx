import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { useProducts, type DBProduct } from "@/hooks/useProducts";
import { useStockOnHand, type StockOnHandRow } from "@/hooks/useStockOnHand";
import { useConnectionMappings } from "@/hooks/useConnectionMappings";
import { useIncrementAddressUse } from "@/hooks/useAddresses";
import { LocationChip } from "@/components/LocationChip";
import { AddressPicker, type SelectedAddress } from "@/components/AddressPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon, FileUp, Search, Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface CreateOrderViewProps {
  onBack: () => void;
}

const PAGE_SIZE = 10;

function getAvailableSOH(sohRows: StockOnHandRow[], productId: string, connectionId: string): number {
  return sohRows
    .filter(r => r.product_id === productId && r.connection_id === connectionId && (r.product_status === "AVAILABLE" || r.product_status === "OK"))
    .reduce((sum, r) => sum + r.qty, 0);
}

async function generateOrderReference(orgId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("sale_orders")
      .select("order_number")
      .eq("source", "portal")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.order_number) {
      const match = data.order_number.match(/(\d+)$/);
      if (match) {
        const next = String(parseInt(match[1]) + 1).padStart(match[1].length, "0");
        return `SO-${next}`;
      }
    }
  } catch {}
  return "SO-00000001";
}

export function CreateOrderView({ onBack }: CreateOrderViewProps) {
  const { data: connections } = useConnections();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: sohRows = [], isLoading: sohLoading } = useStockOnHand();
  const configuredConnections = (connections || []).filter(c => c.is_active && isConnectionConfigured(c));
  const incrementAddressUse = useIncrementAddressUse();

  // Order details
  const [selectedLocation, setSelectedLocation] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [deliveryAddress, setDeliveryAddress] = useState<SelectedAddress | null>(null);
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [deliverMethod, setDeliverMethod] = useState("SHIPPING");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Line items
  const [lineSearch, setLineSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [uomSelections, setUomSelections] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<"name" | "category" | "soh">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Location change confirmation
  const [pendingLocation, setPendingLocation] = useState("");
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);

  // Confirm & submit
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningErrors, setWarningErrors] = useState<string[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product mappings for the selected connection
  const { data: mappings = [] } = useConnectionMappings(selectedLocation || undefined);
  const mappingLookup = useMemo(() => {
    const map: Record<string, string> = {};
    mappings.forEach(m => { map[m.product_id] = m.cc_product_code; });
    return map;
  }, [mappings]);

  // Auto-generate order reference
  useEffect(() => {
    const conn = configuredConnections[0];
    const orgId = conn?.org_id || "";
    generateOrderReference(orgId).then(ref => setOrderReference(ref));
  }, []);

  // Categories
  const allCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ["All Categories", ...Array.from(cats).sort()];
  }, [products]);

  // Products with mapping at this connection AND stock
  const availableProducts = useMemo(() => {
    if (!selectedLocation) return [];
    const mappedProductIds = new Set(mappings.map(m => m.product_id));
    return products.filter(p =>
      mappedProductIds.has(p.id) && getAvailableSOH(sohRows, p.id, selectedLocation) > 0
    );
  }, [selectedLocation, products, sohRows, mappings]);

  // Filtered + sorted
  const filteredProducts = useMemo(() => {
    let list = availableProducts.filter(p => {
      const matchSearch = !lineSearch || [p.name, p.sku, p.barcode || ""].some(v => v.toLowerCase().includes(lineSearch.toLowerCase()));
      const matchCat = categoryFilter === "All Categories" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
    list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name") cmp = a.name.localeCompare(b.name);
      else if (sortCol === "category") cmp = a.category.localeCompare(b.category);
      else cmp = getAvailableSOH(sohRows, a.id, selectedLocation) - getAvailableSOH(sohRows, b.id, selectedLocation);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [availableProducts, lineSearch, categoryFilter, sortCol, sortDir, selectedLocation, sohRows]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary
  const selectedItems = Object.entries(quantities).filter(([, q]) => q > 0);
  const totalItems = selectedItems.length;
  const totalUnits = selectedItems.reduce((sum, [, q]) => sum + q, 0);

  const selectedConnection = configuredConnections.find(c => c.id === selectedLocation);

  // Validation
  const canSubmit = totalItems > 0 && !!selectedLocation && !!orderReference && !!deliveryAddress;

  const isLoading = productsLoading || sohLoading;

  function handleLocationChange(loc: string) {
    if (selectedLocation && totalItems > 0) {
      setPendingLocation(loc);
      setShowLocationConfirm(true);
    } else {
      setSelectedLocation(loc);
      setQuantities({});
      setUomSelections({});
      setCurrentPage(1);
    }
  }

  function confirmLocationChange() {
    setSelectedLocation(pendingLocation);
    setQuantities({});
    setUomSelections({});
    setCurrentPage(1);
    setShowLocationConfirm(false);
  }

  function handleQtyChange(productId: string, val: string) {
    const num = Math.max(0, parseInt(val) || 0);
    setQuantities(prev => ({ ...prev, [productId]: num }));
  }

  function handleUomChange(productId: string, uom: string) {
    setUomSelections(prev => ({ ...prev, [productId]: uom }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      const file = files[0];
      if (file) setAttachments([file]);
    }
    e.target.value = "";
  }

  function toggleSort(col: "name" | "category" | "soh") {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  // Build order items for submission
  function buildOrderItems() {
    return selectedItems.map(([productId, qty]) => {
      const product = products.find(p => p.id === productId)!;
      const uom = uomSelections[productId] || product.product_uoms?.[0]?.name || product.unit;
      return {
        ccProductCode: mappingLookup[productId] || product.sku,
        productId,
        productName: product.name,
        quantity: qty,
        unitOfMeasure: uom,
      };
    });
  }

  function handleSubmitClick() {
    setShowConfirmDialog(true);
  }

  async function handleConfirmSubmit() {
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const items = buildOrderItems();
      const addr = deliveryAddress!;

      // Convert attachment to base64 if present
      let attachmentBase64: string | undefined;
      let attachmentFilename: string | undefined;
      let attachmentMimeType: string | undefined;

      if (attachments.length > 0) {
        const file = attachments[0];
        attachmentFilename = file.name;
        attachmentMimeType = file.type || "application/pdf";
        attachmentBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const { data, error } = await supabase.functions.invoke("cartoncloud-create-order", {
        body: {
          connectionId: selectedLocation,
          attachmentBase64,
          attachmentFilename,
          attachmentMimeType,
          order: {
            reference: orderReference,
            urgent,
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
            deliverInstructions: notes || "",
            deliverRequiredDate: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : undefined,
            deliverMethod,
            allowSplitting: true,
            invoiceValue: 0,
            items,
          },
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create order");
      }

      // Increment address use count
      if (addr.id) {
        incrementAddressUse.mutate(addr.id);
      }

      if (data.warning && data.errors?.length) {
        setWarningErrors(data.errors);
        setCreatedOrderId(data.order?.id || null);
        setShowWarningDialog(true);
      } else {
        toast({
          title: "Order placed successfully",
          description: `Order ${data.order?.order_number} — ${data.order?.total_items} items, ${data.order?.total_qty} units`,
        });
        onBack();
      }
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

  // Products with stock warnings
  function getStockWarning(productId: string, qty: number): string | null {
    if (!selectedLocation || qty <= 0) return null;
    const soh = getAvailableSOH(sohRows, productId, selectedLocation);
    if (qty > soh) return `Only ${soh} available — order may be rejected`;
    return null;
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
          <h1 className="text-lg font-semibold">New Order</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmitClick}>
            {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Placing Order…</> : "Place Order"}
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">

            {/* Column 1: Order Details */}
            <div className="space-y-5">
              <Card className="p-5 space-y-4">
                <h2 className="font-semibold text-base">Order Details</h2>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location <span className="text-destructive">*</span></label>
                  <Select value={selectedLocation} onValueChange={handleLocationChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a location…" />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredConnections.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: loc.color }} />
                            {loc.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Reference */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Order Reference <span className="text-destructive">*</span></label>
                  <Input value={orderReference} onChange={e => setOrderReference(e.target.value)} placeholder="SO-00000001" />
                  <p className="text-xs text-muted-foreground">Your reference for this order (sent to CartonCloud)</p>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Address <span className="text-destructive">*</span></label>
                  <AddressPicker value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Search delivery address…" />
                </div>

                {/* Delivery Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Required Delivery Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
                        {deliveryDate ? format(deliveryDate, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Delivery Method */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Method</label>
                  <Select value={deliverMethod} onValueChange={setDeliverMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHIPPING">Shipping</SelectItem>
                      <SelectItem value="PICKUP">Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgent */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Urgent</label>
                  <Switch checked={urgent} onCheckedChange={setUrgent} />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Instructions</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Leave by front door, call on arrival…" rows={3} />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors w-full justify-center"
                  >
                    <Upload size={16} />
                    Attach Document (PDF, max 1 file)
                  </button>
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded">
                          <FileUp size={14} className="text-muted-foreground" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => setAttachments([])} className="text-muted-foreground hover:text-destructive">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Column 2: Line Items */}
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold text-base">Line Items</h2>

              {!selectedLocation ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-3 opacity-30">📦</div>
                  <div className="font-semibold mb-1">Select a location above</div>
                  <div className="text-sm">to see available products</div>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading products…</span>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-8 h-8 w-56 text-sm" placeholder="Search products, SKU, barcode…" value={lineSearch} onChange={e => { setLineSearch(e.target.value); setCurrentPage(1); }} />
                      </div>
                      <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-8 w-44 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-xs text-muted-foreground">{filteredProducts.length} of {availableProducts.length} products</span>
                  </div>

                  {/* Summary strip */}
                  {totalItems > 0 && (
                    <div className="flex items-center gap-3 text-sm bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                      <span className="font-semibold text-primary">{totalItems} item{totalItems !== 1 ? "s" : ""} selected</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{totalUnits.toLocaleString()} total units</span>
                    </div>
                  )}

                  {/* Table */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                            Product / SKU {sortCol === "name" && (sortDir === "asc" ? "↑" : "↓")}
                          </TableHead>
                          <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>
                            Category {sortCol === "category" && (sortDir === "asc" ? "↑" : "↓")}
                          </TableHead>
                          <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("soh")}>
                            Available SOH {sortCol === "soh" && (sortDir === "asc" ? "↑" : "↓")}
                          </TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead className="w-32">Qty to Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {availableProducts.length === 0
                                ? "No products with available stock at this location. Refresh SOH from the Inventory view."
                                : "No products match your search"}
                            </TableCell>
                          </TableRow>
                        ) : pagedProducts.map(product => {
                          const qty = quantities[product.id] || 0;
                          const soh = getAvailableSOH(sohRows, product.id, selectedLocation);
                          const uoms = product.product_uoms || [];
                          const selectedUom = uomSelections[product.id] || uoms[0]?.name || product.unit;
                          const warning = getStockWarning(product.id, qty);
                          return (
                            <TableRow key={product.id} className={qty > 0 ? "bg-primary/5" : ""}>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                                  {!mappingLookup[product.id] && (
                                    <span className="text-xs text-destructive">No CC mapping</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded bg-muted">{product.category}</span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{soh.toLocaleString()}</TableCell>
                              <TableCell>
                                {uoms.length > 0 ? (
                                  <Select value={selectedUom} onValueChange={v => handleUomChange(product.id, v)}>
                                    <SelectTrigger className="h-8 w-28 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {uoms.map(u => (
                                        <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm text-muted-foreground">{product.unit}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="h-8 w-24 text-sm text-right"
                                    value={qty || ""}
                                    placeholder="0"
                                    onChange={e => handleQtyChange(product.id, e.target.value)}
                                  />
                                  {warning && (
                                    <div className="flex items-center gap-1 text-xs text-amber-600">
                                      <AlertTriangle size={10} />
                                      <span>{warning}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>

          </div>{/* end grid */}
        </div>
      </div>

      {/* Sticky footer */}
      {selectedLocation && (
        <div className="bg-card border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <LocationChip locationId={selectedLocation} />
            <span className="text-muted-foreground">{totalItems} line item{totalItems !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold">{totalUnits.toLocaleString()} units</span>
            {deliveryAddress && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground truncate max-w-[200px]">→ {deliveryAddress.company_name || deliveryAddress.address1}</span>
              </>
            )}
          </div>
          <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmitClick}>
            {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Placing Order…</> : "Place Order"}
          </Button>
        </div>
      )}

      {/* Location change confirmation */}
      <AlertDialog open={showLocationConfirm} onOpenChange={setShowLocationConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change location?</AlertDialogTitle>
            <AlertDialogDescription>Changing location will reset your line items. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLocationChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>This order will be sent to CartonCloud for fulfilment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs font-medium">Location</div>
                <div className="font-medium">{selectedConnection?.name || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs font-medium">Reference</div>
                <div className="font-medium">{orderReference}</div>
              </div>
            </div>
            {deliveryAddress && (
              <div className="text-sm">
                <div className="text-muted-foreground text-xs font-medium mb-1">Deliver to</div>
                {deliveryAddress.company_name && <div className="font-medium">{deliveryAddress.company_name}</div>}
                <div className="text-muted-foreground">
                  {[deliveryAddress.address1, deliveryAddress.suburb, deliveryAddress.state_code, deliveryAddress.postcode].filter(Boolean).join(", ")}
                </div>
              </div>
            )}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs">UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildOrderItems().map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{item.productName}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unitOfMeasure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-3 text-sm bg-muted px-4 py-2 rounded-lg">
              <span>{totalItems} items</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">{totalUnits} total units</span>
              {urgent && <Badge variant="destructive" className="text-xs ml-auto">Urgent</Badge>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmSubmit}>Confirm & Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning dialog for rejected orders */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={18} />
              Order Created with Issues
            </DialogTitle>
            <DialogDescription>
              The order was created in CartonCloud but was flagged by the warehouse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {warningErrors.map((err, i) => (
              <div key={i} className="text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 text-amber-800 dark:text-amber-200">
                {err}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowWarningDialog(false); onBack(); }}>
              Go to Orders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
