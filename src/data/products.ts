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

export const PRODUCTS: Product[] = [
  {
    id: "P001", sku: "SKU-0041", name: "Chilled Sauces 6pk", category: "Food & Bev", unit: "CTN", minQty: 100, syd: 480, mel: 320, bne: 210, per: 95,
    barcode: "9310071041234", supplier: "Acme Sauce Co.", costPrice: 18.50, sellPrice: 24.99, taxRate: 10,
    weight: 4.2, weightUnit: "kg", length: 32, width: 22, height: 18, dimUnit: "cm",
    uoms: [{ name: "Each", qty: 1 }, { name: "6-Pack", qty: 6 }, { name: "Carton", qty: 24 }],
    notes: "Keep refrigerated below 4°C. Check expiry on receipt."
  },
  {
    id: "P002", sku: "SKU-0082", name: "Dry Goods Mixed Pallet", category: "FMCG", unit: "PLT", minQty: 10, syd: 72, mel: 48, bne: 36, per: 0,
    barcode: "9310071082001", supplier: "Metro Distributors", costPrice: 420.00, sellPrice: 580.00, taxRate: 10,
    weight: 320, weightUnit: "kg", length: 120, width: 100, height: 150, dimUnit: "cm",
    uoms: [{ name: "Each", qty: 1 }, { name: "Pallet", qty: 1 }],
    notes: "Mixed SKU pallet. Manifest attached to wrap."
  },
  {
    id: "P003", sku: "SKU-0119", name: "Cleaning Supplies — Heavy", category: "Industrial", unit: "CTN", minQty: 200, syd: 904, mel: 0, bne: 412, per: 220,
    barcode: "9310071119876", supplier: "CleanTech AU", costPrice: 31.00, sellPrice: 44.95, taxRate: 10,
    weight: 9.8, weightUnit: "kg", length: 48, width: 36, height: 30, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "Carton", qty: 12 }, { name: "Pallet", qty: 96 }],
    notes: "Hazardous materials. Store away from food products. SDS available on request."
  },
  {
    id: "P004", sku: "SKU-0203", name: "Frozen Meals 12pk", category: "Food & Bev", unit: "CTN", minQty: 150, syd: 612, mel: 440, bne: 189, per: 78,
    barcode: "9310071203445", supplier: "FreshFrozen Pty Ltd", costPrice: 22.40, sellPrice: 31.99, taxRate: 10,
    weight: 3.6, weightUnit: "kg", length: 40, width: 30, height: 12, dimUnit: "cm",
    uoms: [{ name: "Each", qty: 1 }, { name: "12-Pack", qty: 12 }, { name: "Carton", qty: 48 }],
    notes: "Must remain frozen at all times. -18°C storage required."
  },
  {
    id: "P005", sku: "SKU-0287", name: "Paper Goods Bulk Box", category: "Office", unit: "BOX", minQty: 50, syd: 38, mel: 92, bne: 65, per: 41,
    barcode: "9310071287002", supplier: "OfficeNation", costPrice: 14.20, sellPrice: 21.00, taxRate: 10,
    weight: 5.0, weightUnit: "kg", length: 50, width: 40, height: 30, dimUnit: "cm",
    uoms: [{ name: "Ream", qty: 1 }, { name: "Box", qty: 5 }, { name: "Carton", qty: 20 }],
    notes: ""
  },
  {
    id: "P006", sku: "SKU-0334", name: "Ambient Beverages 24pk", category: "Food & Bev", unit: "CTN", minQty: 300, syd: 1204, mel: 880, bne: 560, per: 290,
    barcode: "9310071334678", supplier: "Bev Corp AU", costPrice: 16.80, sellPrice: 23.50, taxRate: 10,
    weight: 8.4, weightUnit: "kg", length: 42, width: 28, height: 20, dimUnit: "cm",
    uoms: [{ name: "Can", qty: 1 }, { name: "6-Pack", qty: 6 }, { name: "24-Pack", qty: 24 }, { name: "Pallet", qty: 288 }],
    notes: "Ambient storage. No direct sunlight."
  },
  {
    id: "P007", sku: "SKU-0411", name: "Hardware Assorted Kit", category: "Industrial", unit: "KIT", minQty: 25, syd: 18, mel: 31, bne: 9, per: 0,
    barcode: "9310071411990", supplier: "HardwareHub", costPrice: 58.00, sellPrice: 84.95, taxRate: 10,
    weight: 2.1, weightUnit: "kg", length: 25, width: 20, height: 10, dimUnit: "cm",
    uoms: [{ name: "Kit", qty: 1 }, { name: "Box of 10", qty: 10 }],
    notes: "Contains small parts. Keep away from children."
  },
  {
    id: "P008", sku: "SKU-0498", name: "Personal Care Bundle", category: "FMCG", unit: "CTN", minQty: 80, syd: 245, mel: 310, bne: 155, per: 88,
    barcode: "9310071498332", supplier: "CareWorks Pty Ltd", costPrice: 27.60, sellPrice: 39.95, taxRate: 10,
    weight: 3.2, weightUnit: "kg", length: 35, width: 25, height: 18, dimUnit: "cm",
    uoms: [{ name: "Each", qty: 1 }, { name: "Bundle", qty: 4 }, { name: "Carton", qty: 16 }],
    notes: ""
  },
  {
    id: "P009", sku: "SKU-0552", name: "Frozen Veg 6kg", category: "Food & Bev", unit: "CTN", minQty: 200, syd: 330, mel: 0, bne: 140, per: 55,
    barcode: "9310071552107", supplier: "VegFresh AU", costPrice: 11.50, sellPrice: 17.99, taxRate: 0,
    weight: 6.2, weightUnit: "kg", length: 38, width: 28, height: 14, dimUnit: "cm",
    uoms: [{ name: "Bag", qty: 1 }, { name: "Carton", qty: 6 }],
    notes: "GST-free item. Frozen storage -18°C."
  },
  {
    id: "P010", sku: "SKU-0617", name: "Snack Assortment Box", category: "Food & Bev", unit: "CTN", minQty: 120, syd: 89, mel: 204, bne: 133, per: 72,
    barcode: "9310071617551", supplier: "SnackWorld AU", costPrice: 19.90, sellPrice: 28.50, taxRate: 10,
    weight: 2.8, weightUnit: "kg", length: 36, width: 26, height: 16, dimUnit: "cm",
    uoms: [{ name: "Each", qty: 1 }, { name: "Display Box", qty: 12 }, { name: "Carton", qty: 36 }],
    notes: "Bestseller. Reorder at 150 units."
  },
];
