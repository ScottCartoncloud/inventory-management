

## Plan: Fix Order List View — 5 Changes

### 1. Remove "Customer" column
The customer name (e.g. "Clean Collective") should become the delivery address name. The `customer` field from CartonCloud is actually the warehouse customer, not the delivery recipient. Remove the Customer column entirely.

### 2. Fix `[object Object]` in Delivery Address
The `formatAddress` function likely receives an object that isn't being destructured properly — the CartonCloud address fields may be nested objects themselves, or the `deliver` field structure differs from expected. Will add safety checks (stringify protection) and also prepend the delivery contact/company name to the address string if available.

### 3. Reorder & rename columns
- **Column 1**: "Reference" (was "PO Ref" / `order.ref`)
- **Column 2**: "CartonCloud ID" (was "Order ID" / `order.id`)
- Remove Customer column
- Keep: Delivery Address, Qty, Location, Created, Status
- **Remove ETA column**

### 4. Show raw CartonCloud status instead of mapped status
Instead of mapping to `pending/in_progress/completed/on_hold`, pass through the raw CartonCloud status (e.g. `AWAITING_PICK_PACK`, `DISPATCHED`, `PACKED`). Update `StatusBadge` to handle these raw statuses with appropriate colors, and format them nicely (e.g. "Awaiting Pick Pack").

### 5. Update Order interface
- Remove `eta` field
- Change `status` to store raw CC status
- Remove `customer` field (no longer displayed)

### Files to modify
1. **`src/data/orders.ts`** — remove `eta`, `customer` from Order interface
2. **`src/hooks/useOrders.ts`** — stop mapping status, remove eta, fix address formatting, remove customer
3. **`src/components/views/OrdersView.tsx`** — reorder columns, remove Customer/ETA, rename headers
4. **`src/components/StatusBadge.tsx`** — add CartonCloud raw statuses with formatted labels and colors
5. **`src/components/views/DashboardView.tsx`** — update any references to removed fields

