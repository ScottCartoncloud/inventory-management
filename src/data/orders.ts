export interface Order {
  id: string;
  numericId: string;
  ref: string;
  customer: string;
  qty: number;
  location: string;
  status: string;
  created: string;
  consignment: string;
  deliveryAddress: string;
}

export const ORDERS: Order[] = [];

export interface PurchaseOrder {
  id: string;
  numericId: string;
  ref: string;
  qty: number;
  location: string;
  status: string;
  ordered: string;
  expectedArrival: string;
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [];
