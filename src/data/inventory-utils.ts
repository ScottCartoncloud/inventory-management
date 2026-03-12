import type { Product } from "./products";

export function getSOH(product: Product, locationId: string): number {
  if (locationId === "all") return product.syd + product.mel + product.bne + product.per;
  return (product as any)[locationId] ?? 0;
}

export function getStockStatus(qty: number, minQty: number): "ok" | "low" | "out" {
  if (qty === 0) return "out";
  if (qty < minQty) return "low";
  return "ok";
}
