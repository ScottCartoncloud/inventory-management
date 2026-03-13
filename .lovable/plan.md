

## Plan: Purchase Orders — CartonCloud Integration + Separate Nav Tab

### Overview
Add a dedicated "Purchase Orders" tab in main navigation that fetches inbound orders from CartonCloud using the existing proxy edge function. Follows the same architecture as Sales Orders.

### Files to Create

#### 1. `src/hooks/usePurchaseOrders.ts`
New hook mirroring `useOrders.ts` but for inbound orders:
- Fetches from all active connections in parallel via `cartoncloud-proxy` with path `inbound-orders/search`
- Same `Promise.allSettled` pattern for resilient multi-tenant fetching
- Transforms CartonCloud inbound order response into `PurchaseOrder` interface
- Status mapping: DRAFT→Draft(grey), AWAITING_ARRIVAL→Awaiting Arrival(blue), ARRIVED→Arrived(blue), RECEIVING_IN_PROGRESS→Receiving(amber), RECEIVED→Received(amber), VERIFIED→Verified(green), ALLOCATED→Allocated(green), REJECTED→Rejected(red)
- Returns `{ purchaseOrders, isLoading, errors, isUsingMockData }`

#### 2. Updated `PurchaseOrder` interface in `src/data/orders.ts`
```typescript
interface PurchaseOrder {
  id: string;           // CC UUID
  ref: string;          // references.customer
  numericId: string;    // references.numericId
  customer: string;     // customer.name
  product: string;      // items[0].details.product.name
  sku: string;          // items[0].details.product.code
  itemCount: number;    // items.length
  qty: number;          // sum of items[].measures.quantity
  location: string;     // connection code
  connectionId: string;
  status: string;       // mapped status
  cartoncloudStatus: string;
  arrivalDate: string;
  urgent: boolean;
  instructions: string;
  items: PurchaseOrderItem[];
  properties: Record<string, any>;
}
```

### Files to Modify

#### 3. `src/components/StatusBadge.tsx`
Add inbound-specific statuses to the status map:
- `AWAITING_ARRIVAL` → blue
- `ARRIVED` → blue
- `RECEIVING_IN_PROGRESS` → amber
- `RECEIVED` → green (already exists but remap)
- `VERIFIED` → green
- `ALLOCATED` → green

#### 4. `src/components/views/PurchaseOrdersView.tsx` — Full rewrite
- Remove the sub-view pattern (no longer embedded in OrdersView)
- Standalone view with own toolbar: title, live indicator, location pills, search, status filter
- Summary bar with status chip counts
- Loading skeletons, error banners, mock data banner (same pattern as OrdersView)
- Table columns: PO/Reference, Customer, Product(s) (with "+X more"), Location chip, Qty, Arrival Date, Urgent badge, Status
- Uses `usePurchaseOrders()` hook

#### 5. `src/components/views/OrdersView.tsx`
- Remove the Sales/Purchase toggle selector — this view is now Sales Orders only
- Remove PurchaseOrdersView import and rendering
- Clean up: remove `orderType` state, always show sales order toolbar/table

#### 6. `src/components/AppHeader.tsx`
- Add nav item `{ id: "purchase-orders", label: "Purchase Orders", icon: PackageOpen }` between Orders and Products

#### 7. `src/pages/Index.tsx`
- Import and render `PurchaseOrdersView` when `activeTab === "purchase-orders"`
- Pass `activeLocation` / `onLocationChange` props

#### 8. `src/components/views/DashboardView.tsx`
- Import `usePurchaseOrders`
- Add a "Pending Inbound" stat card showing count of POs not yet in RECEIVED/VERIFIED/ALLOCATED status
- Update location cards to show inbound order counts alongside outbound

### Technical Notes
- The proxy edge function already supports any CartonCloud path — no changes needed there
- Search body uses `{ condition: { type: "AndCondition", conditions: [] } }` (empty = fetch all), same as outbound
- Product column: show `items[0].details.product.name (items[0].details.product.code)` + `"+N more"` if `items.length > 1`
- Urgent column: render a small red `Badge` with "Urgent" text when `details.urgent === true`

