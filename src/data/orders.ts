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

export interface PurchaseOrderItem {
  product: string;
  sku: string;
  qty: number;
  expiryDate: string;
  batch: string;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  ref: string;
  numericId: string;
  customer: string;
  product: string;
  sku: string;
  itemCount: number;
  qty: number;
  location: string;
  connectionId: string;
  status: string;
  cartoncloudStatus: string;
  arrivalDate: string;
  urgent: boolean;
  instructions: string;
  items: PurchaseOrderItem[];
  properties: Record<string, any>;
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [];
