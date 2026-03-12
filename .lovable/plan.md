

## Add Sales / Purchase Order Sub-Navigation

### Overview

Add a dropdown under the "Orders" nav item that lets the user switch between **Sales Orders** (existing outbound orders view) and **Purchase Orders** (new inbound orders view).

### Changes

**1. `src/data/orders.ts`** — Add `PURCHASE_ORDERS` array with sample inbound data. Same `Order` interface but with a `supplier` field label context (we can reuse `customer` field as the counterparty — for POs it represents the supplier). Add a `type` discriminator or just keep them as separate arrays.

**2. `src/components/views/OrdersView.tsx`** — Add a dropdown/select at the top of the toolbar (before search) that toggles between "Sales Orders" and "Purchase Orders". When "Purchase Orders" is selected, render the `PurchaseOrdersView`. When "Sales Orders" is selected, render the existing table. This can be done inline with a state variable `orderType: "sales" | "purchase"`.

**3. `src/components/views/PurchaseOrdersView.tsx`** — New component, similar structure to the sales orders table but with columns appropriate for inbound: PO ID, Supplier, Product/SKU, Qty, Location (destination warehouse), Expected Arrival, Status (e.g. `ordered`, `in_transit`, `received`, `partial`), ASN Reference.

**4. Sample purchase order data** — ~6-8 rows of inbound POs from wine/spirits suppliers arriving at the four warehouses, using Bibendum-relevant products.

### UI Detail

The dropdown sits in the Orders toolbar as a `Select` component styled to match the existing status filter. The label changes the heading between "Sales Orders" and "Purchase Orders". Both sub-views share the same location pills and search pattern.

