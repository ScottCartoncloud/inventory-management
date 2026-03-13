export interface Order {
  id: string;
  ref: string;
  customer: string;
  sku: string;
  product: string;
  qty: number;
  location: string;
  status: string;
  created: string;
  eta: string;
  consignment: string;
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

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PO-5001", ref: "INB-70201", supplier: "Dark Matter Distillers", sku: "SKU-DM01", product: "Dark Matter Spiced Rum 6pk", qty: 300, location: "syd", status: "in_transit", ordered: "2026-03-05", expectedArrival: "2026-03-12", asn: "ASN-40121" },
  { id: "PO-5002", ref: "INB-70205", supplier: "Laughing Jack Wines", sku: "SKU-LJ01", product: "Laughing Jack Greenock Shiraz 12pk", qty: 150, location: "mel", status: "ordered", ordered: "2026-03-08", expectedArrival: "2026-03-15", asn: "ASN-40135" },
  { id: "PO-5003", ref: "INB-70198", supplier: "Tread Softly Wines", sku: "SKU-TS01", product: "Tread Softly Pinot Noir 12pk", qty: 200, location: "bne", status: "received", ordered: "2026-03-03", expectedArrival: "2026-03-09", asn: "ASN-40098" },
  { id: "PO-5004", ref: "INB-70210", supplier: "Apothecary Spirits", sku: "SKU-AP01", product: "Apothecary Rose Gin 6pk", qty: 80, location: "per", status: "partial", ordered: "2026-03-07", expectedArrival: "2026-03-13", asn: "ASN-40142" },
  { id: "PO-5005", ref: "INB-70212", supplier: "SC Pannell", sku: "SKU-SC01", product: "SC Pannell Grenache 12pk", qty: 120, location: "syd", status: "ordered", ordered: "2026-03-09", expectedArrival: "2026-03-16", asn: "ASN-40150" },
  { id: "PO-5006", ref: "INB-70195", supplier: "Modus Operandi", sku: "SKU-MO01", product: "Modus Operandi Pale Ale 24pk", qty: 400, location: "mel", status: "received", ordered: "2026-03-02", expectedArrival: "2026-03-08", asn: "ASN-40085" },
  { id: "PO-5007", ref: "INB-70218", supplier: "Four Pillars Gin", sku: "SKU-FP01", product: "Four Pillars Rare Dry Gin 6pk", qty: 60, location: "bne", status: "in_transit", ordered: "2026-03-08", expectedArrival: "2026-03-14", asn: "ASN-40160" },
  { id: "PO-5008", ref: "INB-70220", supplier: "Tar & Roses", sku: "SKU-TR01", product: "Tar & Roses Sangiovese 12pk", qty: 90, location: "per", status: "ordered", ordered: "2026-03-10", expectedArrival: "2026-03-17", asn: "ASN-40168" },
];
