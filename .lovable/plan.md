

## Inventory Management System — Tailwind + shadcn/ui Port

Recreate the existing single-file React inventory app using the project's Tailwind + shadcn/ui stack, preserving all functionality, mock data, and visual design.

### Structure

**Data & Utilities** (`src/data/`)
- `locations.ts` — LOCATIONS array with id, name, code, color
- `products.ts` — PRODUCTS array with all fields (pricing, dimensions, UOMs, per-location stock)
- `orders.ts` — ORDERS array
- `inventory-utils.ts` — `getSOH()`, `getStockStatus()` helpers

**Layout & Header** (`src/components/`)
- `AppHeader.tsx` — Blue header bar with brand ("Acme Foods Pty Ltd"), user info badge, and tab navigation (Dashboard, Stock on Hand, Orders, Products, Settings). Uses lucide-react icons. Custom blue background (`bg-[hsl(206,95%,36%)]`).
- `LocationPills.tsx` — Reusable pill selector for All / SYD / MEL / BNE / PER with colored dots

**Shared Components**
- `StatusBadge.tsx` — Color-coded badges (In Stock / Low / Out / Pending / In Progress / Completed / On Hold) using shadcn Badge
- `LocationChip.tsx` — Small colored location tag
- `QtyCell.tsx` — Quantity display with color coding
- `SummaryBar.tsx` — Muted bar with inline stats

**Tab Views** (`src/components/views/`)

1. **DashboardView** — 4 stat cards (Total SKUs, Units on Hand, Low/Out, Active Orders) in a grid, location cards with colored headers and progress bars, stock alerts list, recent orders list. Clicking location cards navigates to Stock on Hand filtered.

2. **InventoryView** (Stock on Hand) — Toolbar with location pills, search, category/stock filters, export button. Summary bar. Data table showing per-location columns when "All" selected, or single on-hand + min qty when filtered. Uses shadcn Table.

3. **OrdersView** — Same toolbar pattern with location pills, search, status filter. Table with order ID, PO ref, customer, product, qty, location chip, consignment link, dates, status badge.

4. **ProductsView** — Toolbar with search, category filter, export, add button. Summary bar. Table with product/SKU, category, supplier, unit, total SOH, cost, sell, status. **Slide-out drawer** using shadcn Sheet (side panel) with 3 tabs:
   - Details: product info fields, SOH by location mini-table, notes
   - Pricing: cost/sell/tax/margin, price breakdown, inventory value
   - Dimensions & UOM: weight, dimensions, volume, UOM table

5. **SettingsView** — Cards for location management (list of connected locations with status badges) and report preferences (threshold, default location, refresh interval).

**Main Page** (`src/pages/Index.tsx`)
- State for activeTab and activeLocation
- Renders AppHeader + active view
- Navigation handler for cross-tab linking (dashboard → inventory with location pre-selected)

### Design Details
- Blue header: `hsl(206, 95%, 36%)` with white text and semi-transparent hover states
- Location colors: SYD blue, MEL green, BNE amber, PER purple
- Stat cards use shadcn Card with uppercase labels, large bold values
- Tables use shadcn Table with sticky headers, hover rows
- Product drawer uses shadcn Sheet with internal tabs (shadcn Tabs)
- All transitions/animations preserved (fade-in on tab switch)
- Responsive: 2-col stat grid and location cards below 1100px

