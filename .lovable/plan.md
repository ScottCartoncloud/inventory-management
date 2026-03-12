

## Add "Create Order" Flow

### Architecture

The OrdersView manages a `mode` state: `"list" | "create"`. When `mode === "create"`, the entire orders content is replaced with a `CreateOrderView` component. The "+ New Order" button goes in the existing toolbar. No routing changes needed.

### New File: `src/components/views/CreateOrderView.tsx`

Single large component (~400 lines) containing:

**Header bar** — Back arrow + "Back to Orders" link, title "New Order", "Save as Draft" (outline) + "Submit Order" (primary, disabled until qty > 0 on any line)

**Order Details card** — Location selector (Select dropdown with color dots + full names from LOCATIONS), Customer Reference input, Requested Delivery Date (shadcn Popover+Calendar datepicker), Notes textarea, Attachments dropzone (UI-only mock — tracks filenames in state, no real upload)

**Custom Fields card** (collapsible via Collapsible component) — Batch Number (text), Expiry Date (datepicker), Temperature Zone (select: Ambient/Chilled/Frozen), Priority (select: Standard/Express/Urgent). Muted note about 3PL-defined fields.

**Line Items card** — Shows after location selected. Filters products by stock > 0 at selected location. Search input + category filter + count indicator. Table: Product/SKU, Category, Available SOH, UOM (select from product.uoms), Qty to Order (number input). Rows with qty > 0 get `bg-blue-50` highlight. Paginated 10/page. Running summary: "X items · Y units".

**Order Summary footer** (sticky bottom) — Location chip, line item count, total units, Submit button.

**Interactions:**
- Location change with existing quantities triggers an AlertDialog confirmation, resets quantities on confirm
- Submit shows success toast ("Order ORD-XXXXX submitted successfully") and calls `onBack()`
- All state local to component

### Changes to `src/components/views/OrdersView.tsx`

- Add `mode` state (`"list" | "create"`)
- Add "+ New Order" button in the top toolbar (right side, next to real-time indicator)
- When `mode === "create"`, render `<CreateOrderView onBack={() => setMode("list")} />` instead of the list/filters

### No other file changes needed

Products data and locations data already have everything needed (UOMs, per-location stock, location colors/names).

