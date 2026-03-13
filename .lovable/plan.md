

## Plan: Align Purchase Orders View with Sales Orders View

### Changes

#### 1. Update `PurchaseOrder` interface (`src/data/orders.ts`)
- Remove: `supplier`, `sku`, `product`, `asn`
- Add: `customer`, `deliveryAddress`, `numericId`
- Keep: `id`, `ref`, `qty`, `location`, `status`, `ordered`, `expectedArrival`

#### 2. Update `PurchaseOrdersView.tsx`
- **Column order** (matching sales orders pattern):
  1. Reference (`ref`) — first column
  2. CartonCloud ID (`id`) — second column
  3. Customer
  4. Delivery Address
  5. Qty
  6. Destination (Location)
  7. Ordered
  8. Expected Arrival
  9. Status
- Remove Product/SKU, Supplier, ASN columns
- Update search to filter on `ref`, `id`, `customer`, `deliveryAddress`
- Update `colSpan` on empty state
- Update search placeholder

#### Files to modify
1. `src/data/orders.ts` — update `PurchaseOrder` interface
2. `src/components/views/PurchaseOrdersView.tsx` — new columns, reorder, remove old ones

