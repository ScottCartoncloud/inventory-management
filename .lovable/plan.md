

## Plan: Fix Order Search and Revamp Order List View

### Problem
The CartonCloud search API requires a `condition` object with a `type` field. Currently we send `{ condition: {} }` which returns a 400 error: `"Missing field: type, from search condition."`.

### Changes

#### 1. Fix the search condition in `useOrders.ts`
- Change the search body to use a valid condition format:
  ```json
  { "condition": { "type": "AndCondition", "conditions": [] } }
  ```
  An empty `AndCondition` with no sub-conditions should return all orders.

#### 2. Update the Order data model (`src/data/orders.ts`)
- Remove `sku` and `product` fields from the `Order` interface
- Add `deliveryAddress` field (string) to show delivery address info
- Add `numericId` field for the CartonCloud numeric reference
- Keep: `id`, `ref`, `customer`, `qty`, `location`, `status`, `created`, `eta`, `consignment`, `deliveryAddress`

#### 3. Update the order transformer in `useOrders.ts`
- Extract delivery address from `ccOrder.details?.deliver?.address` and format as a single-line string (street, suburb, state)
- Map `timestamps.created.time` to `created` field
- Map `details.deliver.requiredDate` or `details.collect.requiredDate` to `eta`
- Remove product/SKU mapping
- Calculate `qty` from items total

#### 4. Update `OrdersView.tsx` table columns
- Remove "Product / SKU" column
- Add "Delivery Address" column in its place
- Update column count in empty state `colSpan`
- Update skeleton loader to match new column count

### Technical Details
- CartonCloud outbound order search response includes: `id`, `type`, `references`, `customer`, `warehouse`, `details` (with `deliver.address`), `status`, `items`, `version`, `timestamps`
- Address object has fields like `street1`, `street2`, `city/suburb`, `state`, `postcode`, `country`
- The search endpoint returns full order objects by default (without `Prefer: return=minimal` header)

### Files to modify
1. `src/data/orders.ts` -- update Order interface
2. `src/hooks/useOrders.ts` -- fix search condition, update transformer
3. `src/components/views/OrdersView.tsx` -- update table columns

