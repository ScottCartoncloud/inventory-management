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
    id: "8455", sku: "12935-700", name: "Dark Matter Spiced Rum 6pk", category: "General", unit: "Bottle", minQty: 50, syd: 120, mel: 85, bne: 60, per: 40,
    barcode: "9310071129350", supplier: "Bibendum Wine Co.", costPrice: 38.00, sellPrice: 52.99, taxRate: 10,
    weight: 4.8, weightUnit: "kg", length: 32, width: 22, height: 28, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "6-Pack", qty: 6 }, { name: "Carton", qty: 24 }],
    notes: "Store upright. Keep away from direct sunlight."
  },
  {
    id: "8456", sku: "17081-750", name: "2016 Laughing Jack Greenock Shiraz 12pk", category: "General", unit: "Bottle", minQty: 30, syd: 72, mel: 48, bne: 36, per: 0,
    barcode: "9310071170810", supplier: "Bibendum Wine Co.", costPrice: 220.00, sellPrice: 310.00, taxRate: 10,
    weight: 14.2, weightUnit: "kg", length: 34, width: 26, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "12-Pack", qty: 12 }],
    notes: "Premium wine. Handle with care. Optimal storage 14-16°C."
  },
  {
    id: "8457", sku: "17082-750", name: "Bondar Mataro 2018 6pk", category: "General", unit: "Bottle", minQty: 20, syd: 45, mel: 0, bne: 30, per: 18,
    barcode: "9310071170827", supplier: "Bibendum Wine Co.", costPrice: 142.00, sellPrice: 198.00, taxRate: 10,
    weight: 7.1, weightUnit: "kg", length: 34, width: 18, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "6-Pack", qty: 6 }],
    notes: "Limited allocation. Reorder lead time 4-6 weeks."
  },
  {
    id: "8458", sku: "17105-750", name: "Bondar Fiano 2019 6pk", category: "General", unit: "Bottle", minQty: 25, syd: 68, mel: 52, bne: 0, per: 22,
    barcode: "9310071171053", supplier: "Bibendum Wine Co.", costPrice: 98.00, sellPrice: 139.95, taxRate: 10,
    weight: 7.0, weightUnit: "kg", length: 34, width: 18, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "6-Pack", qty: 6 }],
    notes: "White wine. Store at 10-12°C."
  },
  {
    id: "8459", sku: "18286-750", name: "2018 Laughing Jack Jack's Grenache Shiraz Mourvedre 12pk", category: "General", unit: "Bottle", minQty: 20, syd: 38, mel: 92, bne: 55, per: 0,
    barcode: "9310071182860", supplier: "Bibendum Wine Co.", costPrice: 165.00, sellPrice: 235.00, taxRate: 10,
    weight: 14.0, weightUnit: "kg", length: 34, width: 26, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "12-Pack", qty: 12 }],
    notes: "GSM blend. Optimal cellaring 5-10 years."
  },
  {
    id: "8460", sku: "18287-750", name: "2017 Laughing Jack Jack's Semillon 12pk", category: "General", unit: "Bottle", minQty: 15, syd: 24, mel: 36, bne: 18, per: 12,
    barcode: "9310071182877", supplier: "Bibendum Wine Co.", costPrice: 130.00, sellPrice: 185.00, taxRate: 10,
    weight: 13.8, weightUnit: "kg", length: 34, width: 26, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "12-Pack", qty: 12 }],
    notes: "White wine. Ideal serving temperature 8-10°C."
  },
  {
    id: "9319", sku: "18293-750", name: "2018 Laughing Jack Moppa Hill Block 6 Shiraz 12pk", category: "General", unit: "Bottle", minQty: 25, syd: 56, mel: 44, bne: 32, per: 20,
    barcode: "9310071182938", supplier: "Bibendum Wine Co.", costPrice: 195.00, sellPrice: 275.00, taxRate: 10,
    weight: 14.4, weightUnit: "kg", length: 34, width: 26, height: 32, dimUnit: "cm",
    uoms: [{ name: "Bottle", qty: 1 }, { name: "12-Pack", qty: 12 }],
    notes: "Single vineyard Shiraz. Premium product."
  },
];
