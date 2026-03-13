// TODO: Replace hardcoded PRODUCTS with live CartonCloud SOH queries when ready
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { PRODUCTS } from "@/data/products";
import { getSOH } from "@/data/inventory-utils";
import { LocationChip } from "@/components/LocationChip";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon, FileUp, Search, Upload, X } from "lucide-react";
import { format } from "date-fns";

interface CreateOrderViewProps {
  onBack: () => void;
}

const CATEGORIES = ["All Categories", "General"];
const PAGE_SIZE = 10;

export function CreateOrderView({ onBack }: CreateOrderViewProps) {
  const { data: connections } = useConnections();
  const configuredConnections = (connections || []).filter(c => c.is_active && isConnectionConfigured(c));
  // Order details
  const [selectedLocation, setSelectedLocation] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);


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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Products filtered by location stock > 0
  const availableProducts = useMemo(() => {
    if (!selectedLocation) return [];
    return PRODUCTS.filter(p => getSOH(p, selectedLocation) > 0);
  }, [selectedLocation]);

  // Filtered + sorted products
  const filteredProducts = useMemo(() => {
    let list = availableProducts.filter(p => {
      const matchSearch = !lineSearch || [p.name, p.sku, p.barcode].some(v => v.toLowerCase().includes(lineSearch.toLowerCase()));
      const matchCat = categoryFilter === "All Categories" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name") cmp = a.name.localeCompare(b.name);
      else if (sortCol === "category") cmp = a.category.localeCompare(b.category);
      else cmp = getSOH(a, selectedLocation) - getSOH(b, selectedLocation);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [availableProducts, lineSearch, categoryFilter, sortCol, sortDir, selectedLocation]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary
  const selectedItems = Object.entries(quantities).filter(([, q]) => q > 0);
  const totalItems = selectedItems.length;
  const totalUnits = selectedItems.reduce((sum, [, q]) => sum + q, 0);
  const canSubmit = totalItems > 0;

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
      const names = Array.from(files).map(f => f.name);
      setAttachments(prev => [...prev, ...names]);
    }
    e.target.value = "";
  }

  function toggleSort(col: "name" | "category" | "soh") {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function handleSubmit() {
    const orderId = `ORD-${10049 + Math.floor(Math.random() * 100)}`;
    toast({ title: "Order submitted", description: `Order ${orderId} submitted successfully` });
    onBack();
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
          <Button variant="outline" size="sm">Save as Draft</Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>Submit Order</Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">

            {/* Column 1: Order Details + Custom Fields */}
            <div className="space-y-5">
              {/* Order Details */}
              <Card className="p-5 space-y-4">
                <h2 className="font-semibold text-base">Order Details</h2>

                {/* Location selector */}
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
                  <p className="text-xs text-muted-foreground">Order will be placed against this CartonCloud entity</p>
                </div>

                {/* Reference fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer Reference / PO Number</label>
                    <Input value={customerRef} onChange={e => setCustomerRef(e.target.value)} placeholder="e.g. PO-2024-001" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Requested Delivery Date</label>
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
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes & Instructions</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery instructions, special handling notes…" rows={3} />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors w-full justify-center"
                  >
                    <Upload size={16} />
                    Attach Documents
                  </button>
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded">
                          <FileUp size={14} className="text-muted-foreground" />
                          <span className="flex-1 truncate">{name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
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
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No products match your search</TableCell>
                        </TableRow>
                      ) : pagedProducts.map(product => {
                        const qty = quantities[product.id] || 0;
                        const soh = getSOH(product, selectedLocation);
                        const selectedUom = uomSelections[product.id] || product.uoms[0]?.name || product.unit;
                        return (
                          <TableRow key={product.id} className={qty > 0 ? "bg-primary/5" : ""}>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded bg-muted">{product.category}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{soh.toLocaleString()}</TableCell>
                            <TableCell>
                              <Select value={selectedUom} onValueChange={v => handleUomChange(product.id, v)}>
                                <SelectTrigger className="h-8 w-28 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {product.uoms.map(u => (
                                    <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 w-24 text-sm text-right"
                                value={qty || ""}
                                placeholder="0"
                                onChange={e => handleQtyChange(product.id, e.target.value)}
                              />
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

      {/* Sticky footer summary */}
      {selectedLocation && (
        <div className="bg-card border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <LocationChip locationId={selectedLocation} />
            <span className="text-muted-foreground">{totalItems} line item{totalItems !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold">{totalUnits.toLocaleString()} units</span>
          </div>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>Submit Order</Button>
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
    </div>
  );
}
