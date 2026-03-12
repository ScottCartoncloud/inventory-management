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

export const ORDERS: Order[] = [
  { id: "ORD-10041", ref: "PO-88201", customer: "Woolworths Distribution", sku: "SKU-0041", product: "Chilled Sauces 6pk", qty: 200, location: "syd", status: "in_progress", created: "2026-03-07", eta: "2026-03-10", consignment: "CC-29841" },
  { id: "ORD-10042", ref: "PO-88205", customer: "Coles Supply Chain", sku: "SKU-0334", product: "Ambient Beverages 24pk", qty: 500, location: "mel", status: "pending", created: "2026-03-08", eta: "2026-03-11", consignment: "CC-29850" },
  { id: "ORD-10043", ref: "PO-88199", customer: "IGA Distributors", sku: "SKU-0203", product: "Frozen Meals 12pk", qty: 120, location: "bne", status: "completed", created: "2026-03-06", eta: "2026-03-09", consignment: "CC-29812" },
  { id: "ORD-10044", ref: "PO-88210", customer: "Metcash Ltd", sku: "SKU-0498", product: "Personal Care Bundle", qty: 80, location: "syd", status: "pending", created: "2026-03-09", eta: "2026-03-12", consignment: "CC-29861" },
  { id: "ORD-10045", ref: "PO-88198", customer: "Harris Farm Markets", sku: "SKU-0552", product: "Frozen Veg 6kg", qty: 150, location: "syd", status: "completed", created: "2026-03-05", eta: "2026-03-08", consignment: "CC-29800" },
  { id: "ORD-10046", ref: "PO-88215", customer: "Aldi Australia", sku: "SKU-0082", product: "Dry Goods Mixed Pallet", qty: 30, location: "mel", status: "on_hold", created: "2026-03-09", eta: "2026-03-13", consignment: "CC-29870" },
  { id: "ORD-10047", ref: "PO-88190", customer: "Costco Wholesale", sku: "SKU-0119", product: "Cleaning Supplies — Heavy", qty: 300, location: "per", status: "in_progress", created: "2026-03-07", eta: "2026-03-11", consignment: "CC-29835" },
  { id: "ORD-10048", ref: "PO-88221", customer: "Dan Murphy's", sku: "SKU-0617", product: "Snack Assortment Box", qty: 60, location: "bne", status: "pending", created: "2026-03-09", eta: "2026-03-14", consignment: "CC-29875" },
];
