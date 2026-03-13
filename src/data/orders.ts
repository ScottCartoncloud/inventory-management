export interface Order {
  id: string;
  numericId: string;
  ref: string;
  customer: string;
  qty: number;
  location: string;
  status: string;
  created: string;
  eta: string;
  consignment: string;
  deliveryAddress: string;
}

export const ORDERS: Order[] = [];

export interface PurchaseOrder {
  id: string;
  ref: string;
  supplier: string;
  sku: string;
  product: string;
  qty: number;
  location: string;
  status: string;
  ordered: string;
  expectedArrival: string;
  asn: string;
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [];
