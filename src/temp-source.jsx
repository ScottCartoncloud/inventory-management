import { useState, useMemo } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const LOCATIONS = [
    { id: "syd", name: "Sydney — Rosehill", code: "SYD", color: "#0070cc" },
    { id: "mel", name: "Melbourne — Laverton", code: "MEL", color: "#10b981" },
    { id: "bne", name: "Brisbane — Yatala", code: "BNE", color: "#f59e0b" },
    { id: "per", name: "Perth — Welshpool", code: "PER", color: "#8b5cf6" },
];

const PRODUCTS = [
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

const ORDERS = [
    { id: "ORD-10041", ref: "PO-88201", customer: "Woolworths Distribution", sku: "SKU-0041", product: "Chilled Sauces 6pk", qty: 200, location: "syd", status: "in_progress", created: "2026-03-07", eta: "2026-03-10", consignment: "CC-29841" },
    { id: "ORD-10042", ref: "PO-88205", customer: "Coles Supply Chain", sku: "SKU-0334", product: "Ambient Beverages 24pk", qty: 500, location: "mel", status: "pending", created: "2026-03-08", eta: "2026-03-11", consignment: "CC-29850" },
    { id: "ORD-10043", ref: "PO-88199", customer: "IGA Distributors", sku: "SKU-0203", product: "Frozen Meals 12pk", qty: 120, location: "bne", status: "completed", created: "2026-03-06", eta: "2026-03-09", consignment: "CC-29812" },
    { id: "ORD-10044", ref: "PO-88210", customer: "Metcash Ltd", sku: "SKU-0498", product: "Personal Care Bundle", qty: 80, location: "syd", status: "pending", created: "2026-03-09", eta: "2026-03-12", consignment: "CC-29861" },
    { id: "ORD-10045", ref: "PO-88198", customer: "Harris Farm Markets", sku: "SKU-0552", product: "Frozen Veg 6kg", qty: 150, location: "syd", status: "completed", created: "2026-03-05", eta: "2026-03-08", consignment: "CC-29800" },
    { id: "ORD-10046", ref: "PO-88215", customer: "Aldi Australia", sku: "SKU-0082", product: "Dry Goods Mixed Pallet", qty: 30, location: "mel", status: "on_hold", created: "2026-03-09", eta: "2026-03-13", consignment: "CC-29870" },
    { id: "ORD-10047", ref: "PO-88190", customer: "Costco Wholesale", sku: "SKU-0119", product: "Cleaning Supplies — Heavy", qty: 300, location: "per", status: "in_progress", created: "2026-03-07", eta: "2026-03-11", consignment: "CC-29835" },
    { id: "ORD-10048", ref: "PO-88221", customer: "Dan Murphy's", sku: "SKU-0617", product: "Snack Assortment Box", qty: 60, location: "bne", status: "pending", created: "2026-03-09", eta: "2026-03-14", consignment: "CC-29875" },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function getSOH(product, locationId) {
    if (locationId === "all") return product.syd + product.mel + product.bne + product.per;
    return product[locationId] ?? 0;
}

function getStockStatus(qty, minQty) {
    if (qty === 0) return "out";
    if (qty < minQty) return "low";
    return "ok";
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --background: hsl(210, 20%, 98%);
    --foreground: hsl(215, 35%, 15%);
    --card: hsl(0, 0%, 100%);
    --primary: hsl(215, 50%, 23%);
    --primary-fg: hsl(0, 0%, 100%);
    --accent: hsl(210, 100%, 40%);
    --accent-fg: hsl(0, 0%, 100%);
    --muted: hsl(210, 30%, 95%);
    --muted-fg: hsl(215, 20%, 50%);
    --border: hsl(214, 20%, 88%);
    --header-bg: hsl(206, 95%, 36%);
    --header-fg: hsl(0, 0%, 100%);
    --success: hsl(142, 76%, 36%);
    --warning: hsl(38, 92%, 50%);
    --destructive: hsl(0, 84%, 60%);
    --radius: 0.5rem;
    --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-card-hover: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
  body { font-family: 'Inter', system-ui, sans-serif; background: var(--background); color: var(--foreground); -webkit-font-smoothing: antialiased; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  /* Header */
  .header { background: var(--header-bg); color: var(--header-fg); }
  .header-top { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .header-brand { display: flex; align-items: center; gap: 0.5rem; }
  .brand-icon { width: 2rem; height: 2rem; background: var(--accent); border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; }
  .brand-title { font-size: 1.125rem; font-weight: 600; line-height: 1.2; }
  .brand-sub { font-size: 0.625rem; opacity: 0.6; line-height: 1; }
  .header-right { display: flex; align-items: center; gap: 1rem; }
  .header-user { font-size: 0.875rem; }
  .header-badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; background: rgba(255,255,255,0.1); border-radius: 0.25rem; }
  .header-nav { display: flex; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.375rem 1rem; }
  .nav-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; background: transparent; border: none; color: var(--header-fg); transition: background 0.15s; font-family: inherit; }
  .nav-btn:hover { background: rgba(255,255,255,0.1); }
  .nav-btn.active { background: rgba(255,255,255,0.15); font-weight: 600; }
  .nav-divider { color: rgba(255,255,255,0.3); font-size: 1rem; }
  /* Toolbar */
  .toolbar { background: var(--card); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; gap: 1rem; flex-wrap: wrap; }
  .toolbar-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; flex-wrap: wrap; }
  .toolbar-right { display: flex; align-items: center; gap: 0.5rem; }
  .toolbar-title { font-size: 1rem; font-weight: 600; }
  /* Search */
  .search-wrap { position: relative; }
  .search-input { padding: 0.375rem 0.75rem 0.375rem 2rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--background); font-size: 0.875rem; font-family: inherit; color: var(--foreground); outline: none; width: 14rem; transition: border-color 0.15s, box-shadow 0.15s; }
  .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px hsl(210 100% 40% / 0.15); }
  .search-input::placeholder { color: var(--muted-fg); }
  /* Location Pills */
  .loc-pills { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .loc-pill { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 500; cursor: pointer; border: 1.5px solid var(--border); background: var(--card); color: var(--muted-fg); transition: all 0.15s; font-family: inherit; }
  .loc-pill:hover { border-color: var(--accent); color: var(--accent); }
  .loc-pill.active { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
  .loc-pill-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-right: 0.3rem; vertical-align: middle; }
  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.875rem; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; }
  .btn-primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
  .btn-primary:hover { background: hsl(210, 100%, 35%); }
  .btn-outline { background: var(--card); color: var(--foreground); border-color: var(--border); }
  .btn-outline:hover { background: var(--muted); }
  .btn-ghost { background: transparent; color: var(--muted-fg); border-color: transparent; }
  .btn-ghost:hover { background: var(--muted); color: var(--foreground); }
  .btn-sm { padding: 0.25rem 0.625rem; font-size: 0.8125rem; }
  /* Card */
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); }
  .card-hover:hover { box-shadow: var(--shadow-card-hover); }
  /* Select */
  .select-input { padding: 0.375rem 2rem 0.375rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); font-size: 0.875rem; font-family: inherit; color: var(--foreground); outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.625rem center; transition: border-color 0.15s; }
  .select-input:focus { border-color: var(--accent); }
  /* Dashboard */
  .dashboard { padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; overflow-y: auto; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .stat-card { padding: 1.125rem 1.25rem; }
  .stat-label { font-size: 0.75rem; color: var(--muted-fg); font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.375rem; }
  .stat-value { font-size: 1.875rem; font-weight: 700; color: var(--foreground); line-height: 1; }
  .stat-sub { font-size: 0.75rem; color: var(--muted-fg); margin-top: 0.25rem; }
  .stat-accent { color: var(--accent); } .stat-success { color: var(--success); } .stat-warning { color: var(--warning); } .stat-destructive { color: var(--destructive); }
  .section-head { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.25rem; border-bottom: 1px solid var(--border); }
  .section-title { font-size: 0.9375rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
  .section-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.375rem; height: 1.375rem; padding: 0 0.375rem; background: var(--muted); border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: var(--muted-fg); }
  .loc-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .loc-card { overflow: hidden; }
  .loc-card-top { padding: 0.875rem 1rem; }
  .loc-card-name { font-weight: 600; font-size: 0.9375rem; }
  .loc-card-code { font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: rgba(255,255,255,0.2); color: #fff; display: inline-block; margin-bottom: 0.25rem; }
  .loc-card-sub { font-size: 0.75rem; opacity: 0.75; }
  .loc-card-body { padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .loc-stat-row { display: flex; justify-content: space-between; align-items: center; }
  .loc-stat-lbl { font-size: 0.8125rem; color: var(--muted-fg); }
  .loc-stat-val { font-size: 0.9375rem; font-weight: 600; }
  .dashboard-lower { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .alert-row { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.12s; }
  .alert-row:last-child { border-bottom: none; }
  .alert-row:hover { background: var(--muted); }
  .alert-left { display: flex; align-items: center; gap: 0.625rem; }
  .alert-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; }
  .alert-name { font-size: 0.875rem; font-weight: 500; }
  .alert-loc { font-size: 0.75rem; color: var(--muted-fg); }
  .alert-qty { font-size: 0.875rem; font-weight: 600; }
  .prog-bar { height: 0.375rem; background: var(--muted); border-radius: 9999px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 9999px; transition: width 0.3s; }
  /* Table */
  .inventory-page, .orders-page, .products-page { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .table-container { flex: 1; overflow-y: auto; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  thead { background: var(--muted); position: sticky; top: 0; z-index: 1; }
  th { padding: 0.625rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-fg); white-space: nowrap; }
  td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: hsl(210 100% 40% / 0.03); }
  .th-right { text-align: right; } .td-right { text-align: right; }
  .sku-cell { display: flex; flex-direction: column; gap: 0.125rem; }
  .sku-name { font-weight: 500; }
  .sku-code { font-size: 0.75rem; color: var(--muted-fg); font-family: 'Courier New', monospace; }
  /* Badges */
  .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .badge-ok { background: hsl(142 76% 36% / 0.1); color: var(--success); }
  .badge-low { background: hsl(38 92% 50% / 0.12); color: var(--warning); }
  .badge-out { background: hsl(0 84% 60% / 0.1); color: var(--destructive); }
  .badge-pending { background: hsl(210 100% 40% / 0.1); color: var(--accent); }
  .badge-inprog { background: hsl(215 50% 23% / 0.1); color: var(--primary); }
  .badge-completed { background: hsl(142 76% 36% / 0.1); color: var(--success); }
  .badge-hold { background: hsl(38 92% 50% / 0.12); color: var(--warning); }
  .cat-tag { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; background: var(--muted); color: var(--muted-fg); }
  .qty-ok { color: var(--foreground); font-weight: 500; }
  .qty-low { color: var(--warning); font-weight: 600; }
  .qty-out { color: var(--muted-fg); font-weight: 400; }
  .qty-out-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; background: hsl(0 84% 60% / 0.08); color: var(--destructive); font-size: 0.75rem; }
  .loc-chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 600; padding: 0.125rem 0.375rem; border-radius: 0.25rem; background: var(--muted); }
  .loc-chip-dot { width: 0.4rem; height: 0.4rem; border-radius: 50%; }
  .cc-link { color: var(--accent); font-weight: 500; text-decoration: none; }
  .cc-link:hover { text-decoration: underline; }
  .live-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--success); animation: pulse-dot 2s infinite; }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)} }
  .empty { text-align: center; padding: 3rem 1rem; color: var(--muted-fg); }
  .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.3; }
  .empty-title { font-weight: 600; margin-bottom: 0.25rem; }
  .empty-sub { font-size: 0.875rem; }
  .fade-in { animation: fadeIn 0.2s ease-out; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted-fg); }

  /* ── Summary bar ── */
  .sumbar { background: var(--muted); padding: 0.5rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; gap: 2rem; flex-wrap: wrap; }
  .sumbar-item { display: flex; gap: 0.375rem; align-items: baseline; }
  .sumbar-lbl { font-size: 0.75rem; color: var(--muted-fg); }
  .sumbar-val { font-size: 0.8125rem; font-weight: 600; }

  /* ── Products page layout (table + drawer side-by-side) ── */
  .products-body { flex: 1; display: flex; overflow: hidden; }
  .products-table-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; transition: all 0.25s ease; }
  .products-table-area.drawer-open { flex: 0 0 55%; }

  /* Row hover & selected state */
  .product-row { cursor: pointer; }
  .product-row.selected td { background: hsl(210 100% 40% / 0.06) !important; }
  .product-row:hover td { background: hsl(210 100% 40% / 0.04); }

  /* ── Drawer ── */
  .product-drawer {
    width: 0; overflow: hidden;
    border-left: 1px solid var(--border);
    background: var(--card);
    display: flex; flex-direction: column;
    transition: width 0.25s ease;
    flex-shrink: 0;
  }
  .product-drawer.open { width: 45%; min-width: 380px; }
  .drawer-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .drawer-title { font-size: 1rem; font-weight: 700; line-height: 1.3; }
  .drawer-sku { font-size: 0.75rem; color: var(--muted-fg); font-family: 'Courier New', monospace; margin-top: 0.125rem; }
  .drawer-close { background: none; border: none; cursor: pointer; color: var(--muted-fg); padding: 0.25rem; border-radius: 0.25rem; display: flex; align-items: center; }
  .drawer-close:hover { background: var(--muted); color: var(--foreground); }

  /* Drawer tabs */
  .drawer-tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .drawer-tab {
    flex: 1; padding: 0.625rem 0.5rem; font-size: 0.8125rem; font-weight: 500;
    background: none; border: none; cursor: pointer; color: var(--muted-fg);
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: all 0.15s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 0.35rem;
  }
  .drawer-tab:hover { color: var(--foreground); background: var(--muted); }
  .drawer-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

  /* Drawer body */
  .drawer-body { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

  /* Drawer field groups */
  .field-group { display: flex; flex-direction: column; gap: 0.75rem; }
  .field-group-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-fg); padding-bottom: 0.375rem; border-bottom: 1px solid var(--border); }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; }
  .field-label { font-size: 0.7rem; font-weight: 600; color: var(--muted-fg); text-transform: uppercase; letter-spacing: 0.04em; }
  .field-value { font-size: 0.875rem; font-weight: 500; color: var(--foreground); }
  .field-value.mono { font-family: 'Courier New', monospace; font-size: 0.8125rem; }
  .field-value.price { font-size: 1rem; font-weight: 700; color: var(--foreground); }
  .field-value.muted { color: var(--muted-fg); font-weight: 400; }

  /* Notes field */
  .notes-box { background: var(--muted); border-radius: var(--radius); padding: 0.75rem; font-size: 0.8125rem; color: var(--foreground); line-height: 1.5; min-height: 3rem; }
  .notes-box.empty { color: var(--muted-fg); font-style: italic; }

  /* SOH mini table in drawer */
  .soh-mini { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .soh-mini-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.875rem; border-bottom: 1px solid var(--border); }
  .soh-mini-row:last-child { border-bottom: none; }
  .soh-mini-loc { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; }
  .soh-mini-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; }
  .soh-mini-qty { font-size: 0.875rem; font-weight: 700; }

  /* UOM table */
  .uom-table { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .uom-row { display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 0.5rem 0.875rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
  .uom-row:last-child { border-bottom: none; }
  .uom-row.header { background: var(--muted); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted-fg); }
  .uom-qty { font-weight: 700; color: var(--accent); }

  /* Drawer footer */
  .drawer-footer { padding: 0.875rem 1.25rem; border-top: 1px solid var(--border); display: flex; gap: 0.5rem; flex-shrink: 0; }

  /* Settings */
  .settings-page { flex: 1; overflow-y: auto; }
  .settings-body { padding: 1.25rem; max-width: 680px; display: flex; flex-direction: column; gap: 1.25rem; }

  @media (max-width: 1100px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .loc-cards { grid-template-columns: repeat(2, 1fr); }
    .dashboard-lower { grid-template-columns: 1fr; }
    .products-table-area.drawer-open { flex: 0 0 50%; }
    .product-drawer.open { min-width: 320px; }
  }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 16, color = "currentColor", style: s }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}>
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);

const ICONS = {
    dashboard: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
    inventory: ["M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", "M3.27 6.96 12 12.01l8.73-5.05", "M12 22.08V12"],
    orders: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
    products: ["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"],
    settings: ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"],
    search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
    filter: "M22 3H2l8 9.46V19l4 2v-8.54z",
    refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    alert: ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
    logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
    chevdown: "M6 9l6 6 6-6",
    boxes: ["M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42z", "M7 16.5l-4.74-2.85", "M7 16.5l5-3", "M7 16.5V21", "M12 13.5l4.74-2.85", "M16 17l4-6.93l-4.03-2.42L12 10.5l-5-3L12 13.5z"],
    mappin: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
    close: "M18 6L6 18M6 6l12 12",
    tag: ["M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z", "M7 7h.01"],
    dollar: ["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
    ruler: ["M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z", "m7.5 10.5 3 3", "m10.5 7.5 3 3", "m13.5 4.5 3 3", "m4.5 13.5 3 3"],
    layers: ["M12 2 2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
    edit: ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
};

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        pending: { cls: "badge-pending", label: "Pending" },
        in_progress: { cls: "badge-inprog", label: "In Progress" },
        completed: { cls: "badge-completed", label: "Completed" },
        on_hold: { cls: "badge-hold", label: "On Hold" },
        ok: { cls: "badge-ok", label: "In Stock" },
        low: { cls: "badge-low", label: "Low Stock" },
        out: { cls: "badge-out", label: "Out of Stock" },
    };
    const { cls, label } = map[status] || { cls: "", label: status };
    return <span className={`badge ${cls}`}>{label}</span>;
}

function LocationChip({ locationId }) {
    const loc = LOCATIONS.find(l => l.id === locationId);
    if (!loc) return null;
    return (
        <span className="loc-chip">
            <span className="loc-chip-dot" style={{ background: loc.color }} />
            {loc.code}
        </span>
    );
}

function QtyCell({ qty, minQty, locationId }) {
    if (locationId === "all") {
        const cls = qty === 0 ? "qty-out" : qty < minQty ? "qty-low" : "qty-ok";
        return <span className={cls}>{qty.toLocaleString()}</span>;
    }
    if (qty === 0) return <span className="qty-out-badge">—</span>;
    if (qty < minQty) return <span className="qty-low">{qty.toLocaleString()}</span>;
    return <span className="qty-ok">{qty.toLocaleString()}</span>;
}

// ─── Product Drawer ───────────────────────────────────────────────────────────

function ProductDrawer({ product, onClose }) {
    const [tab, setTab] = useState("details");

    if (!product) return <div className="product-drawer" />;

    const totalSOH = getSOH(product, "all");
    const status = getStockStatus(totalSOH, product.minQty);
    const margin = product.sellPrice > 0
        ? (((product.sellPrice - product.costPrice) / product.sellPrice) * 100).toFixed(1)
        : "0.0";

    const TABS = [
        { id: "details", label: "Details", icon: ICONS.tag },
        { id: "pricing", label: "Pricing", icon: ICONS.dollar },
        { id: "dimensions", label: "Dimensions & UOM", icon: ICONS.ruler },
    ];

    return (
        <div className="product-drawer open fade-in">
            {/* Header */}
            <div className="drawer-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <div className="drawer-title">{product.name}</div>
                        <StatusBadge status={status} />
                    </div>
                    <div className="drawer-sku">{product.sku} · {product.barcode}</div>
                </div>
                <button className="drawer-close" onClick={onClose}>
                    <Icon d={ICONS.close} size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="drawer-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`drawer-tab ${tab === t.id ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        <Icon d={t.icon} size={13} color="currentColor" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Body */}
            <div className="drawer-body">

                {/* ── Details Tab ── */}
                {tab === "details" && (
                    <>
                        <div className="field-group">
                            <div className="field-group-title">Product Information</div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">SKU</div>
                                    <div className="field-value mono">{product.sku}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Category</div>
                                    <div className="field-value"><span className="cat-tag">{product.category}</span></div>
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Barcode</div>
                                    <div className="field-value mono">{product.barcode}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Base Unit</div>
                                    <div className="field-value">{product.unit}</div>
                                </div>
                            </div>
                            <div className="field">
                                <div className="field-label">Supplier</div>
                                <div className="field-value">{product.supplier}</div>
                            </div>
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Stock on Hand by Location</div>
                            <div className="soh-mini">
                                {LOCATIONS.map(loc => {
                                    const qty = product[loc.id];
                                    const st = getStockStatus(qty, product.minQty);
                                    return (
                                        <div key={loc.id} className="soh-mini-row">
                                            <div className="soh-mini-loc">
                                                <span className="soh-mini-dot" style={{ background: loc.color }} />
                                                {loc.name}
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                                <span className="soh-mini-qty" style={{
                                                    color: st === "out" ? "var(--muted-fg)" : st === "low" ? "var(--warning)" : "var(--foreground)"
                                                }}>
                                                    {qty === 0 ? "—" : qty.toLocaleString()}
                                                </span>
                                                <StatusBadge status={st} />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="soh-mini-row" style={{ background: "var(--muted)" }}>
                                    <div className="soh-mini-loc" style={{ fontWeight: 700 }}>Total</div>
                                    <div className="soh-mini-qty">{totalSOH.toLocaleString()} {product.unit}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--muted-fg)" }}>
                                <span>Min reorder qty: <strong style={{ color: "var(--foreground)" }}>{product.minQty}</strong></span>
                                <span>{totalSOH < product.minQty ? "⚠️ Below minimum" : "✓ Healthy levels"}</span>
                            </div>
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Notes</div>
                            <div className={`notes-box ${!product.notes ? "empty" : ""}`}>
                                {product.notes || "No notes recorded."}
                            </div>
                        </div>
                    </>
                )}

                {/* ── Pricing Tab ── */}
                {tab === "pricing" && (
                    <>
                        <div className="field-group">
                            <div className="field-group-title">Pricing</div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Cost Price</div>
                                    <div className="field-value price">${product.costPrice.toFixed(2)}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Sell Price</div>
                                    <div className="field-value price" style={{ color: "var(--accent)" }}>${product.sellPrice.toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Tax Rate</div>
                                    <div className="field-value">{product.taxRate}% {product.taxRate === 0 ? "(GST-Free)" : "(GST)"}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Gross Margin</div>
                                    <div className="field-value" style={{ color: parseFloat(margin) > 30 ? "var(--success)" : "var(--warning)" }}>
                                        {margin}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Price Breakdown</div>
                            {[
                                { label: "Ex-Tax Sell Price", value: `$${product.sellPrice.toFixed(2)}` },
                                { label: "Tax Amount", value: `$${(product.sellPrice * product.taxRate / 100).toFixed(2)}` },
                                { label: "Inc-Tax Sell Price", value: `$${(product.sellPrice * (1 + product.taxRate / 100)).toFixed(2)}`, bold: true },
                                { label: "Gross Profit / Unit", value: `$${(product.sellPrice - product.costPrice).toFixed(2)}`, color: "var(--success)" },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.875rem" }}>
                                    <span style={{ color: "var(--muted-fg)" }}>{row.label}</span>
                                    <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || "var(--foreground)" }}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Inventory Value</div>
                            {[
                                { label: "Total Units (all locations)", value: totalSOH.toLocaleString() },
                                { label: "Value at Cost", value: `$${(totalSOH * product.costPrice).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` },
                                { label: "Value at Sell", value: `$${(totalSOH * product.sellPrice).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, bold: true, color: "var(--accent)" },
                            ].map((row, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.875rem" }}>
                                    <span style={{ color: "var(--muted-fg)" }}>{row.label}</span>
                                    <span style={{ fontWeight: row.bold ? 700 : 600, color: row.color || "var(--foreground)" }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Dimensions & UOM Tab ── */}
                {tab === "dimensions" && (
                    <>
                        <div className="field-group">
                            <div className="field-group-title">Physical Dimensions</div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Weight</div>
                                    <div className="field-value">{product.weight} {product.weightUnit}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Dimensions</div>
                                    <div className="field-value">{product.length} × {product.width} × {product.height} {product.dimUnit}</div>
                                </div>
                            </div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Volume</div>
                                    <div className="field-value muted">
                                        {((product.length * product.width * product.height) / 1000000).toFixed(4)} m³
                                    </div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Cubic Weight</div>
                                    <div className="field-value muted">
                                        {((product.length * product.width * product.height) / 1000000 * 250).toFixed(2)} kg
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Units of Measure</div>
                            <div className="uom-table">
                                <div className="uom-row header">
                                    <span>UOM Name</span>
                                    <span>Qty per Base Unit</span>
                                </div>
                                {product.uoms.map((uom, i) => (
                                    <div key={i} className="uom-row">
                                        <span style={{ fontWeight: i === 0 ? 500 : 400 }}>
                                            {uom.name} {i === 0 && <span style={{ fontSize: "0.7rem", color: "var(--muted-fg)", marginLeft: "0.25rem" }}>(base)</span>}
                                        </span>
                                        <span className="uom-qty">{uom.qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="field-group">
                            <div className="field-group-title">Carton Configuration</div>
                            <div className="field-row">
                                <div className="field">
                                    <div className="field-label">Base Unit</div>
                                    <div className="field-value">{product.unit}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Units per Pallet Layer</div>
                                    <div className="field-value muted">—</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer actions */}
            <div className="drawer-footer">
                <button className="btn btn-primary btn-sm">
                    <Icon d={ICONS.edit} size={13} />
                    Edit Product
                </button>
                <button className="btn btn-outline btn-sm">
                    <Icon d={ICONS.download} size={13} />
                    Export
                </button>
            </div>
        </div>
    );
}

// ─── Products View ────────────────────────────────────────────────────────────

function ProductsView() {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedProduct, setSelectedProduct] = useState(null);

    const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

    const filtered = useMemo(() => PRODUCTS.filter(p => {
        const matchSearch = !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.supplier?.toLowerCase().includes(search.toLowerCase()) ||
            p.barcode?.includes(search);
        const matchCat = categoryFilter === "all" || p.category === categoryFilter;
        return matchSearch && matchCat;
    }), [search, categoryFilter]);

    const drawerOpen = !!selectedProduct;

    function handleRowClick(product) {
        setSelectedProduct(prev => prev?.id === product.id ? null : product);
    }

    const totalValue = PRODUCTS.reduce((s, p) => s + getSOH(p, "all") * p.costPrice, 0);

    return (
        <div className="products-page fade-in">
            {/* Toolbar */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <span className="toolbar-title">Products</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
                        {PRODUCTS.length} total · click any row to inspect
                    </span>
                </div>
                <div className="toolbar-right">
                    <div className="search-wrap">
                        <Icon d={ICONS.search} size={14} color="var(--muted-fg)" style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input className="search-input" placeholder="Name, SKU, barcode, supplier…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="select-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
                    </select>
                    <button className="btn btn-outline btn-sm">
                        <Icon d={ICONS.download} size={14} />
                        Export
                    </button>
                    <button className="btn btn-primary btn-sm">
                        + Add Product
                    </button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="sumbar">
                {[
                    { label: "Products", value: `${filtered.length} of ${PRODUCTS.length}` },
                    { label: "Total SOH", value: PRODUCTS.reduce((s, p) => s + getSOH(p, "all"), 0).toLocaleString() + " units" },
                    { label: "Stock Value", value: `$${totalValue.toLocaleString("en-AU", { minimumFractionDigits: 0 })}`, cls: "stat-accent" },
                    { label: "Low / Out", value: PRODUCTS.filter(p => getStockStatus(getSOH(p, "all"), p.minQty) !== "ok").length + " SKUs", cls: "stat-warning" },
                ].map((s, i) => (
                    <div key={i} className="sumbar-item">
                        <span className="sumbar-lbl">{s.label}:</span>
                        <span className={`sumbar-val ${s.cls || ""}`}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Body: table + drawer */}
            <div className="products-body">
                <div className={`products-table-area ${drawerOpen ? "drawer-open" : ""}`}>
                    <div className="table-container">
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product / SKU</th>
                                        <th>Category</th>
                                        <th>Supplier</th>
                                        <th>Unit</th>
                                        <th className="th-right">Total SOH</th>
                                        <th className="th-right">Cost</th>
                                        <th className="th-right">Sell</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={8}>
                                            <div className="empty">
                                                <div className="empty-icon">📦</div>
                                                <div className="empty-title">No products found</div>
                                                <div className="empty-sub">Try adjusting your search or filters</div>
                                            </div>
                                        </td></tr>
                                    ) : filtered.map(product => {
                                        const totalSOH = getSOH(product, "all");
                                        const status = getStockStatus(totalSOH, product.minQty);
                                        const isSelected = selectedProduct?.id === product.id;
                                        return (
                                            <tr
                                                key={product.id}
                                                className={`product-row ${isSelected ? "selected" : ""}`}
                                                onClick={() => handleRowClick(product)}
                                            >
                                                <td>
                                                    <div className="sku-cell">
                                                        <span className="sku-name">{product.name}</span>
                                                        <span className="sku-code">{product.sku}</span>
                                                    </div>
                                                </td>
                                                <td><span className="cat-tag">{product.category}</span></td>
                                                <td style={{ fontSize: "0.8125rem", color: "var(--muted-fg)" }}>{product.supplier}</td>
                                                <td style={{ fontSize: "0.8125rem", color: "var(--muted-fg)" }}>{product.unit}</td>
                                                <td className="td-right">
                                                    <QtyCell qty={totalSOH} minQty={product.minQty} locationId="all" />
                                                </td>
                                                <td className="td-right" style={{ fontSize: "0.8125rem" }}>${product.costPrice.toFixed(2)}</td>
                                                <td className="td-right" style={{ fontWeight: 600 }}>${product.sellPrice.toFixed(2)}</td>
                                                <td><StatusBadge status={status} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Drawer */}
                <ProductDrawer
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            </div>
        </div>
    );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ onNavigate }) {
    const totalSKUs = PRODUCTS.length;
    const totalQty = PRODUCTS.reduce((s, p) => s + p.syd + p.mel + p.bne + p.per, 0);
    const lowStockItems = PRODUCTS.filter(p => ["syd", "mel", "bne", "per"].some(loc => p[loc] > 0 && p[loc] < p.minQty));
    const outOfStockInstances = PRODUCTS.reduce((s, p) => s + ["syd", "mel", "bne", "per"].filter(loc => p[loc] === 0).length, 0);
    const activeOrders = ORDERS.filter(o => o.status !== "completed").length;
    const locStats = LOCATIONS.map(loc => ({
        ...loc,
        totalSKUs: PRODUCTS.filter(p => p[loc.id] > 0).length,
        totalQty: PRODUCTS.reduce((s, p) => s + (p[loc.id] || 0), 0),
        lowStock: PRODUCTS.filter(p => p[loc.id] > 0 && p[loc.id] < p.minQty).length,
        orders: ORDERS.filter(o => o.location === loc.id && o.status !== "completed").length,
    }));
    const allLowAlerts = PRODUCTS.flatMap(p =>
        LOCATIONS.map(loc => {
            const qty = p[loc.id];
            if (qty === 0) return { ...p, locId: loc.id, locName: loc.name, qty, type: "out" };
            if (qty < p.minQty) return { ...p, locId: loc.id, locName: loc.name, qty, type: "low" };
            return null;
        }).filter(Boolean)
    ).slice(0, 8);
    const recentOrders = [...ORDERS].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

    return (
        <div className="dashboard fade-in">
            <div className="stats-grid">
                {[
                    { label: "Total SKUs", value: totalSKUs, sub: "Across all locations", cls: "stat-accent" },
                    { label: "Total Units on Hand", value: totalQty.toLocaleString(), sub: "All locations combined", cls: "" },
                    { label: "Low / Out of Stock", value: `${lowStockItems.length} SKUs`, sub: `${outOfStockInstances} location instances`, cls: "stat-warning" },
                    { label: "Active Orders", value: activeOrders, sub: `${ORDERS.filter(o => o.status === "in_progress").length} in progress`, cls: "stat-success" },
                ].map((s, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-label">{s.label}</div>
                        <div className={`stat-value ${s.cls}`}>{s.value}</div>
                        <div className="stat-sub">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div>
                <div style={{ marginBottom: "0.625rem", fontWeight: 600, fontSize: "0.9375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icon d={ICONS.mappin} size={15} color="var(--accent)" />
                    CartonCloud Locations
                </div>
                <div className="loc-cards">
                    {locStats.map(loc => (
                        <div key={loc.id} className="card loc-card card-hover" style={{ cursor: "pointer" }} onClick={() => onNavigate("inventory", loc.id)}>
                            <div className="loc-card-top" style={{ background: loc.color, color: "#fff" }}>
                                <div className="loc-card-code">{loc.code}</div>
                                <div className="loc-card-name">{loc.name}</div>
                                <div className="loc-card-sub">{loc.totalSKUs} active SKUs</div>
                            </div>
                            <div className="loc-card-body">
                                <div className="loc-stat-row"><span className="loc-stat-lbl">Units on Hand</span><span className="loc-stat-val">{loc.totalQty.toLocaleString()}</span></div>
                                <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.min(100, (loc.totalQty / totalQty) * 100 * 3)}%`, background: loc.color }} /></div>
                                <div className="loc-stat-row"><span className="loc-stat-lbl">Low Stock SKUs</span><span className="loc-stat-val" style={{ color: loc.lowStock > 0 ? "var(--warning)" : "var(--success)" }}>{loc.lowStock}</span></div>
                                <div className="loc-stat-row"><span className="loc-stat-lbl">Active Orders</span><span className="loc-stat-val" style={{ color: "var(--accent)" }}>{loc.orders}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="dashboard-lower">
                <div className="card" style={{ overflow: "hidden" }}>
                    <div className="section-head">
                        <span className="section-title"><Icon d={ICONS.alert} size={15} color="var(--warning)" />Stock Alerts<span className="section-badge">{allLowAlerts.length}</span></span>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("inventory", "all")}>View All</button>
                    </div>
                    {allLowAlerts.map((item, i) => (
                        <div key={i} className="alert-row" onClick={() => onNavigate("inventory", item.locId)}>
                            <div className="alert-left">
                                <div className="alert-dot" style={{ background: item.type === "out" ? "var(--destructive)" : "var(--warning)" }} />
                                <div><div className="alert-name">{item.name}</div><div className="alert-loc">{item.locName} · {item.unit}</div></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.125rem" }}>
                                <div className="alert-qty" style={{ color: item.type === "out" ? "var(--destructive)" : "var(--warning)" }}>{item.qty === 0 ? "Out" : item.qty.toLocaleString()}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--muted-fg)" }}>min {item.minQty}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="card" style={{ overflow: "hidden" }}>
                    <div className="section-head">
                        <span className="section-title"><Icon d={ICONS.orders} size={15} color="var(--accent)" />Recent Orders</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("orders", "all")}>View All</button>
                    </div>
                    {recentOrders.map((order, i) => (
                        <div key={i} className="alert-row">
                            <div className="alert-left">
                                <LocationChip locationId={order.location} />
                                <div><div className="alert-name">{order.id}</div><div className="alert-loc">{order.customer} · {order.product}</div></div>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Inventory View ───────────────────────────────────────────────────────────

function InventoryView({ activeLocation, onLocationChange }) {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");
    const categories = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
    const filtered = useMemo(() => PRODUCTS.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === "all" || p.category === categoryFilter;
        const soh = getSOH(p, activeLocation);
        const status = getStockStatus(soh, p.minQty);
        return matchSearch && matchCat && (stockFilter === "all" || status === stockFilter);
    }), [search, categoryFilter, stockFilter, activeLocation]);
    const totalOnHand = filtered.reduce((s, p) => s + getSOH(p, activeLocation), 0);
    const showCols = activeLocation === "all";

    return (
        <div className="inventory-page fade-in">
            <div className="toolbar">
                <div className="toolbar-left">
                    <span className="toolbar-title">Stock on Hand</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><span className="live-dot" /><span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>Live</span></div>
                    <div className="loc-pills">
                        <button className={`loc-pill ${activeLocation === "all" ? "active" : ""}`} onClick={() => onLocationChange("all")}>All Locations</button>
                        {LOCATIONS.map(loc => (
                            <button key={loc.id} className={`loc-pill ${activeLocation === loc.id ? "active" : ""}`} onClick={() => onLocationChange(loc.id)}>
                                <span className="loc-pill-dot" style={{ background: loc.color }} />{loc.code}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="search-wrap">
                        <Icon d={ICONS.search} size={14} color="var(--muted-fg)" style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input className="search-input" placeholder="Search SKU or product…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="select-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
                    </select>
                    <select className="select-input" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                        <option value="all">All Stock</option>
                        <option value="ok">In Stock</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                    <button className="btn btn-outline btn-sm"><Icon d={ICONS.download} size={14} />Export CSV</button>
                </div>
            </div>
            <div className="sumbar">
                {[
                    { label: "Showing", value: `${filtered.length} of ${PRODUCTS.length} SKUs` },
                    { label: "Total Units", value: totalOnHand.toLocaleString() },
                    { label: "Low Stock", value: filtered.filter(p => getStockStatus(getSOH(p, activeLocation), p.minQty) === "low").length, cls: "stat-warning" },
                    { label: "Out of Stock", value: filtered.filter(p => getSOH(p, activeLocation) === 0).length, cls: "stat-destructive" },
                ].map((s, i) => (
                    <div key={i} className="sumbar-item">
                        <span className="sumbar-lbl">{s.label}:</span>
                        <span className={`sumbar-val ${s.cls || ""}`}>{s.value}</span>
                    </div>
                ))}
            </div>
            <div className="table-container">
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Product / SKU</th><th>Category</th><th>Unit</th>
                                {showCols ? <>{LOCATIONS.map(loc => <th key={loc.id} className="th-right" style={{ color: loc.color }}>{loc.code}</th>)}<th className="th-right">Total</th></> : <><th className="th-right">On Hand</th><th className="th-right">Min Qty</th></>}
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={showCols ? 9 : 6}><div className="empty"><div className="empty-icon">📦</div><div className="empty-title">No products found</div><div className="empty-sub">Try adjusting your filters</div></div></td></tr>
                            ) : filtered.map(product => {
                                const qty = getSOH(product, activeLocation);
                                return (
                                    <tr key={product.id}>
                                        <td><div className="sku-cell"><span className="sku-name">{product.name}</span><span className="sku-code">{product.sku}</span></div></td>
                                        <td><span className="cat-tag">{product.category}</span></td>
                                        <td style={{ color: "var(--muted-fg)", fontSize: "0.8125rem" }}>{product.unit}</td>
                                        {showCols ? <>{LOCATIONS.map(loc => <td key={loc.id} className="td-right"><QtyCell qty={product[loc.id]} minQty={product.minQty} locationId={loc.id} /></td>)}<td className="td-right" style={{ fontWeight: 600 }}>{qty.toLocaleString()}</td></> : <><td className="td-right"><QtyCell qty={qty} minQty={product.minQty} locationId={activeLocation} /></td><td className="td-right" style={{ color: "var(--muted-fg)", fontSize: "0.8125rem" }}>{product.minQty}</td></>}
                                        <td><StatusBadge status={getStockStatus(qty, product.minQty)} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Orders View ──────────────────────────────────────────────────────────────

function OrdersView({ activeLocation, onLocationChange }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const filtered = useMemo(() => ORDERS.filter(o => {
        const matchLoc = activeLocation === "all" || o.location === activeLocation;
        const matchSearch = !search || [o.id, o.customer, o.ref, o.consignment].some(v => v.toLowerCase().includes(search.toLowerCase()));
        return matchLoc && matchSearch && (statusFilter === "all" || o.status === statusFilter);
    }), [search, statusFilter, activeLocation]);

    return (
        <div className="orders-page fade-in">
            <div className="toolbar">
                <div className="toolbar-left">
                    <span className="toolbar-title">Orders</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><span className="live-dot" /><span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>Real-time</span></div>
                    <div className="loc-pills">
                        <button className={`loc-pill ${activeLocation === "all" ? "active" : ""}`} onClick={() => onLocationChange("all")}>All Locations</button>
                        {LOCATIONS.map(loc => (
                            <button key={loc.id} className={`loc-pill ${activeLocation === loc.id ? "active" : ""}`} onClick={() => onLocationChange(loc.id)}>
                                <span className="loc-pill-dot" style={{ background: loc.color }} />{loc.code}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="search-wrap">
                        <Icon d={ICONS.search} size={14} color="var(--muted-fg)" style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }} />
                        <input className="search-input" placeholder="Order ID, customer, consignment…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="select-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button className="btn btn-ghost btn-sm"><Icon d={ICONS.refresh} size={14} /></button>
                </div>
            </div>
            <div style={{ background: "var(--muted)", padding: "0.5rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {["pending", "in_progress", "on_hold", "completed"].map(s => {
                    const count = ORDERS.filter(o => o.status === s && (activeLocation === "all" || o.location === activeLocation)).length;
                    const map = { pending: "badge-pending", in_progress: "badge-inprog", on_hold: "badge-hold", completed: "badge-completed" };
                    const labels = { pending: "Pending", in_progress: "In Progress", on_hold: "On Hold", completed: "Completed" };
                    return (
                        <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                            className={`badge ${map[s]}`} style={{ cursor: "pointer", border: statusFilter === s ? "1.5px solid currentColor" : "1.5px solid transparent" }}>
                            {labels[s]} · {count}
                        </button>
                    );
                })}
            </div>
            <div className="table-container">
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Location</th><th className="th-right">Qty</th><th>Consignment</th><th>Created</th><th>ETA</th><th>Status</th></tr></thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9}><div className="empty"><div className="empty-icon">📋</div><div className="empty-title">No orders found</div><div className="empty-sub">Try adjusting your filters</div></div></td></tr>
                            ) : filtered.map(order => (
                                <tr key={order.id}>
                                    <td><div className="sku-cell"><span className="sku-name">{order.id}</span><span className="sku-code">{order.ref}</span></div></td>
                                    <td style={{ fontWeight: 500 }}>{order.customer}</td>
                                    <td><div className="sku-cell"><span className="sku-name" style={{ fontWeight: 400 }}>{order.product}</span><span className="sku-code">{order.sku}</span></div></td>
                                    <td><LocationChip locationId={order.location} /></td>
                                    <td className="td-right" style={{ fontWeight: 600 }}>{order.qty.toLocaleString()}</td>
                                    <td><a href="#" className="cc-link">{order.consignment}</a></td>
                                    <td style={{ color: "var(--muted-fg)", fontSize: "0.8125rem" }}>{order.created}</td>
                                    <td style={{ fontSize: "0.8125rem" }}>{order.eta}</td>
                                    <td><StatusBadge status={order.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView() {
    return (
        <div className="settings-page fade-in">
            <div className="settings-body">
                <div className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <Icon d={ICONS.filter} size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 600, fontSize: "1rem" }}>CartonCloud Locations</span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.25rem" }}>Manage which CartonCloud warehouses are linked to this portal.</p>
                    {LOCATIONS.map(loc => (
                        <div key={loc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.375rem", background: loc.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>{loc.code}</div>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{loc.name}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>Connected · {PRODUCTS.filter(p => p[loc.id] > 0).length} active SKUs</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <span className="badge badge-ok">Connected</span>
                                <button className="btn btn-outline btn-sm">Configure</button>
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: "1.25rem" }}><button className="btn btn-primary"><Icon d="M12 5v14M5 12h14" size={14} />Add Location</button></div>
                </div>
                <div className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <Icon d={ICONS.settings} size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 600, fontSize: "1rem" }}>Report Preferences</span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", marginBottom: "1.25rem" }}>Configure default SOH report settings and alert thresholds.</p>
                    {[
                        { label: "Low Stock Threshold Override", desc: "Use product-level min quantities (recommended)", value: "Product Level" },
                        { label: "SOH Report Default Location", desc: "Default location shown on load", value: "All Locations" },
                        { label: "Auto-refresh Interval", desc: "How often orders data refreshes", value: "60 seconds" },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                            <div>
                                <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.label}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>{item.desc}</div>
                            </div>
                            <span style={{ fontSize: "0.875rem", color: "var(--accent)", fontWeight: 500 }}>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [activeLocation, setActiveLocation] = useState("all");

    function handleNavigate(tab, location) {
        setActiveTab(tab);
        if (location) setActiveLocation(location);
    }

    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
        { id: "inventory", label: "Stock on Hand", icon: ICONS.inventory },
        { id: "orders", label: "Orders", icon: ICONS.orders },
        { id: "products", label: "Products", icon: ICONS.products },
        { id: "settings", label: "Settings", icon: ICONS.settings },
    ];

    return (
        <>
            <style>{styles}</style>
            <div className="app">
                <header className="header">
                    <div className="header-top">
                        <div className="header-brand">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div className="brand-icon"><Icon d={ICONS.boxes} size={18} color="#fff" /></div>
                                <div><div className="brand-title">Acme Foods Pty Ltd</div><div className="brand-sub">Inventory Management</div></div>
                                <Icon d={ICONS.chevdown} size={14} color="rgba(255,255,255,0.6)" />
                            </div>
                        </div>
                        <div className="header-right">
                            <span className="header-user">sarah.jones@acmefoods.com.au</span>
                            <span className="header-badge">Customer Admin</span>
                            <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,0.8)", borderColor: "transparent" }}>
                                <Icon d={ICONS.logout} size={14} color="currentColor" />Log Out
                            </button>
                        </div>
                    </div>
                    <nav className="header-nav">
                        {navItems.map((item, i) => (
                            <span key={item.id} style={{ display: "contents" }}>
                                {i > 0 && <span className="nav-divider">|</span>}
                                <button className={`nav-btn ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
                                    <Icon d={item.icon} size={15} color="currentColor" />{item.label}
                                </button>
                            </span>
                        ))}
                    </nav>
                </header>
                <main className="main-content">
                    {activeTab === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
                    {activeTab === "inventory" && <InventoryView activeLocation={activeLocation} onLocationChange={setActiveLocation} />}
                    {activeTab === "orders" && <OrdersView activeLocation={activeLocation} onLocationChange={setActiveLocation} />}
                    {activeTab === "products" && <ProductsView />}
                    {activeTab === "settings" && <SettingsView />}
                </main>
            </div>
        </>
    );
}