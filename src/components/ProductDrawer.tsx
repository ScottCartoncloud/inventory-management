import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tag, DollarSign, Ruler, Pencil, Download, Link2 } from "lucide-react";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { ProductMappingsTab } from "@/components/ProductMappingsTab";
import type { DBProduct } from "@/hooks/useProducts";

interface ProductDrawerProps {
  product: DBProduct | null;
  onClose: () => void;
}

export function ProductDrawer({ product, onClose }: ProductDrawerProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!product) return null;

  const margin = product.sell_price > 0
    ? (((product.sell_price - product.cost_price) / product.sell_price) * 100).toFixed(1)
    : "0.0";

  const weight = product.weight ?? 0;
  const length = product.length ?? 0;
  const width = product.width ?? 0;
  const height = product.height ?? 0;

  return (
    <>
      <Sheet open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-[45%] min-w-[380px] sm:max-w-none p-0 flex flex-col">
          <SheetHeader className="px-5 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <SheetTitle className="text-base font-bold">{product.name}</SheetTitle>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]">Active</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">{product.sku} · {product.barcode || "No barcode"}</div>
          </SheetHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
              <TabsTrigger value="details" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(210,100%,40%)] data-[state=active]:text-[hsl(210,100%,40%)] data-[state=active]:shadow-none gap-1.5 py-2.5 text-[0.8125rem]">
                <Tag size={13} />Details
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(210,100%,40%)] data-[state=active]:text-[hsl(210,100%,40%)] data-[state=active]:shadow-none gap-1.5 py-2.5 text-[0.8125rem]">
                <DollarSign size={13} />Pricing
              </TabsTrigger>
              <TabsTrigger value="dimensions" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(210,100%,40%)] data-[state=active]:text-[hsl(210,100%,40%)] data-[state=active]:shadow-none gap-1.5 py-2.5 text-[0.8125rem]">
                <Ruler size={13} />Dimensions & UOM
              </TabsTrigger>
              <TabsTrigger value="mappings" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(210,100%,40%)] data-[state=active]:text-[hsl(210,100%,40%)] data-[state=active]:shadow-none gap-1.5 py-2.5 text-[0.8125rem]">
                <Link2 size={13} />Mappings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-5">
              <TabsContent value="details" className="mt-0 flex flex-col gap-4">
                <FieldGroup title="Product Information">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="SKU" value={product.sku} mono />
                    <Field label="Category"><span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">{product.category}</span></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Barcode" value={product.barcode || "—"} mono />
                    <Field label="Base Unit" value={product.unit} />
                  </div>
                  <Field label="Supplier" value={product.supplier || "—"} />
                </FieldGroup>

                <FieldGroup title="Stock on Hand">
                  <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[hsl(38,92%,50%)]" />
                      <span className="font-medium text-foreground">SOH data pending</span>
                    </div>
                    SOH data will be available when CartonCloud sync is configured and live stock queries are enabled.
                  </div>
                </FieldGroup>

                <FieldGroup title="Notes">
                  <div className={`bg-muted rounded-md p-3 text-[0.8125rem] leading-relaxed min-h-[3rem] ${!product.notes ? "text-muted-foreground italic" : "text-foreground"}`}>
                    {product.notes || "No notes recorded."}
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 flex flex-col gap-4">
                <FieldGroup title="Pricing">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cost Price"><span className="text-base font-bold">${product.cost_price.toFixed(2)}</span></Field>
                    <Field label="Sell Price"><span className="text-base font-bold text-[hsl(210,100%,40%)]">${product.sell_price.toFixed(2)}</span></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tax Rate" value={`${product.tax_rate}% ${product.tax_rate === 0 ? "(GST-Free)" : "(GST)"}`} />
                    <Field label="Gross Margin">
                      <span style={{ color: parseFloat(margin) > 30 ? "hsl(142,76%,36%)" : "hsl(38,92%,50%)" }}>{margin}%</span>
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup title="Price Breakdown">
                  {[
                    { label: "Ex-Tax Sell Price", value: `$${product.sell_price.toFixed(2)}` },
                    { label: "Tax Amount", value: `$${(product.sell_price * product.tax_rate / 100).toFixed(2)}` },
                    { label: "Inc-Tax Sell Price", value: `$${(product.sell_price * (1 + product.tax_rate / 100)).toFixed(2)}`, bold: true },
                    { label: "Gross Profit / Unit", value: `$${(product.sell_price - product.cost_price).toFixed(2)}`, color: "hsl(142,76%,36%)" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-border text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || undefined }}>{row.value}</span>
                    </div>
                  ))}
                </FieldGroup>
              </TabsContent>

              <TabsContent value="dimensions" className="mt-0 flex flex-col gap-4">
                <FieldGroup title="Physical Dimensions">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Weight" value={weight ? `${weight} ${product.weight_unit || "kg"}` : "—"} />
                    <Field label="Dimensions" value={length ? `${length} × ${width} × ${height} ${product.dim_unit || "cm"}` : "—"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Volume" muted value={length ? `${((length * width * height) / 1000000).toFixed(4)} m³` : "—"} />
                    <Field label="Cubic Weight" muted value={length ? `${((length * width * height) / 1000000 * 250).toFixed(2)} kg` : "—"} />
                  </div>
                </FieldGroup>

                <FieldGroup title="Units of Measure">
                  {product.product_uoms.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No UOMs configured.</div>
                  ) : (
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] items-center px-3.5 py-2 bg-muted text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>UOM Name</span>
                        <span>Qty per Base Unit</span>
                      </div>
                      {product.product_uoms.map((uom, i) => (
                        <div key={uom.id} className="grid grid-cols-[1fr_auto] items-center px-3.5 py-2 border-b border-border last:border-b-0 text-sm">
                          <span style={{ fontWeight: i === 0 ? 500 : 400 }}>
                            {uom.name} {i === 0 && <span className="text-[0.7rem] text-muted-foreground ml-1">(base)</span>}
                          </span>
                          <span className="font-bold text-[hsl(210,100%,40%)]">{uom.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </FieldGroup>
              </TabsContent>

              <TabsContent value="mappings" className="mt-0">
                <ProductMappingsTab product={product} />
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-border flex gap-2 shrink-0">
            <Button size="sm" onClick={() => setShowEditDialog(true)}><Pencil size={13} />Edit Product</Button>
            <Button variant="outline" size="sm"><Download size={13} />Export</Button>
          </div>
        </SheetContent>
      </Sheet>

      <ProductFormDialog open={showEditDialog} onOpenChange={setShowEditDialog} product={product} />
    </>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.06em] text-muted-foreground pb-1.5 border-b border-border">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, mono, muted, children }: { label: string; value?: string; mono?: boolean; muted?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      {children ?? <div className={`text-sm font-medium ${mono ? "font-mono text-[0.8125rem]" : ""} ${muted ? "text-muted-foreground font-normal" : "text-foreground"}`}>{value}</div>}
    </div>
  );
}
