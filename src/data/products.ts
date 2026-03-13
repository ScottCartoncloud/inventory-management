export interface UOM {
  name: string;
  qty: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minQty: number;
  syd: number;
  mel: number;
  bne: number;
  per: number;
  barcode: string;
  supplier: string;
  costPrice: number;
  sellPrice: number;
  taxRate: number;
  weight: number;
  weightUnit: string;
  length: number;
  width: number;
  height: number;
  dimUnit: string;
  uoms: UOM[];
  notes: string;
}

export const PRODUCTS: Product[] = [];
