import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { useCreateProduct, useUpdateProduct, useDeleteProduct, type DBProduct } from "@/hooks/useProducts";
import { toast } from "@/hooks/use-toast";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: DBProduct | null;
}

const CATEGORIES = ["General", "Frozen", "Chilled", "Dry Goods", "Beverages", "Fresh", "Ambient"];

interface UomRow {
  name: string;
  qty: number;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("CTN");
  const [minQty, setMinQty] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [supplier, setSupplier] = useState("");
  const [costPrice, setCostPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [weight, setWeight] = useState<number | "">("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [length, setLength] = useState<number | "">("");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [dimUnit, setDimUnit] = useState("cm");
  const [notes, setNotes] = useState("");
  const [uoms, setUoms] = useState<UomRow[]>([{ name: "Each", qty: 1 }]);

  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setCategory(product.category);
      setUnit(product.unit);
      setMinQty(product.min_qty);
      setBarcode(product.barcode || "");
      setSupplier(product.supplier || "");
      setCostPrice(product.cost_price);
      setSellPrice(product.sell_price);
      setTaxRate(product.tax_rate);
      setWeight(product.weight ?? "");
      setWeightUnit(product.weight_unit || "kg");
      setLength(product.length ?? "");
      setWidth(product.width ?? "");
      setHeight(product.height ?? "");
      setDimUnit(product.dim_unit || "cm");
      setNotes(product.notes || "");
      setUoms(product.product_uoms.length > 0 ? product.product_uoms.map(u => ({ name: u.name, qty: u.qty })) : [{ name: "Each", qty: 1 }]);
    } else {
      setSku(""); setName(""); setCategory("General"); setUnit("CTN"); setMinQty(0);
      setBarcode(""); setSupplier(""); setCostPrice(0); setSellPrice(0); setTaxRate(10);
      setWeight(""); setWeightUnit("kg"); setLength(""); setWidth(""); setHeight("");
      setDimUnit("cm"); setNotes(""); setUoms([{ name: "Each", qty: 1 }]);
    }
  }, [product, open]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSave() {
    if (!sku.trim() || !name.trim()) {
      toast({ title: "Missing fields", description: "SKU and Name are required.", variant: "destructive" });
      return;
    }

    const productData = {
      sku: sku.trim(),
      name: name.trim(),
      category,
      unit,
      min_qty: minQty,
      barcode: barcode.trim() || null,
      supplier: supplier.trim() || null,
      cost_price: costPrice,
      sell_price: sellPrice,
      tax_rate: taxRate,
      weight: weight === "" ? null : Number(weight),
      weight_unit: weightUnit,
      length: length === "" ? null : Number(length),
      width: width === "" ? null : Number(width),
      height: height === "" ? null : Number(height),
      dim_unit: dimUnit,
      notes: notes.trim() || null,
    };

    const uomData = uoms.filter(u => u.name.trim()).map((u, i) => ({ name: u.name.trim(), qty: u.qty, sort_order: i }));

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: product.id, product: productData, uoms: uomData });
        toast({ title: "Product updated" });
      } else {
        await createMutation.mutateAsync({ product: productData as any, uoms: uomData });
        toast({ title: "Product created" });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!product) return;
    try {
      await deleteMutation.mutateAsync(product.id);
      toast({ title: "Product deleted" });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic Info */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Information</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SKU <span className="text-destructive">*</span></Label>
                  <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. SKU-0001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Name <span className="text-destructive">*</span></Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Base Unit</Label>
                  <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="CTN" />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Qty</Label>
                  <Input type="number" min={0} value={minQty} onChange={e => setMinQty(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Barcode</Label>
                  <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="e.g. 9310071..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Supplier</Label>
                  <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
                </div>
              </div>
            </fieldset>

            {/* Pricing */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pricing</legend>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Cost Price ($)</Label>
                  <Input type="number" min={0} step={0.01} value={costPrice} onChange={e => setCostPrice(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sell Price ($)</Label>
                  <Input type="number" min={0} step={0.01} value={sellPrice} onChange={e => setSellPrice(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" min={0} step={0.5} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </fieldset>

            {/* Dimensions */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dimensions & Weight</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Weight</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} step={0.01} value={weight} onChange={e => setWeight(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="0.00" className="flex-1" />
                    <Select value={weightUnit} onValueChange={setWeightUnit}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="lb">lb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Dimensions (L × W × H)</Label>
                  <div className="flex gap-1.5 items-center">
                    <Input type="number" min={0} step={0.1} value={length} onChange={e => setLength(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="L" />
                    <span className="text-muted-foreground">×</span>
                    <Input type="number" min={0} step={0.1} value={width} onChange={e => setWidth(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="W" />
                    <span className="text-muted-foreground">×</span>
                    <Input type="number" min={0} step={0.1} value={height} onChange={e => setHeight(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="H" />
                    <Select value={dimUnit} onValueChange={setDimUnit}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* UOMs */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Units of Measure</legend>
              <div className="space-y-2">
                {uoms.map((uom, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical size={14} className="text-muted-foreground" />
                    <Input value={uom.name} onChange={e => { const next = [...uoms]; next[i].name = e.target.value; setUoms(next); }} placeholder="UOM name" className="flex-1" />
                    <Input type="number" min={1} value={uom.qty} onChange={e => { const next = [...uoms]; next[i].qty = parseInt(e.target.value) || 1; setUoms(next); }} className="w-24" />
                    {uoms.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUoms(uoms.filter((_, j) => j !== i))}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setUoms([...uoms, { name: "", qty: 1 }])}>
                  <Plus size={14} /> Add UOM
                </Button>
              </div>
            </fieldset>

            {/* Notes */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</legend>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" rows={3} />
            </fieldset>
          </div>

          <DialogFooter className="flex justify-between mt-4">
            <div>
              {isEdit && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending}>
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{product?.name}</strong>? This will also remove all UOMs and tenant mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
