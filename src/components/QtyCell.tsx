export function QtyCell({ qty, minQty, locationId }: { qty: number; minQty: number; locationId: string }) {
  if (locationId === "all") {
    const cls = qty === 0 ? "text-muted-foreground font-normal" : qty < minQty ? "text-[hsl(38,92%,50%)] font-semibold" : "text-foreground font-medium";
    return <span className={cls}>{qty.toLocaleString()}</span>;
  }
  if (qty === 0) return <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">—</span>;
  if (qty < minQty) return <span className="text-[hsl(38,92%,50%)] font-semibold">{qty.toLocaleString()}</span>;
  return <span className="text-foreground font-medium">{qty.toLocaleString()}</span>;
}
