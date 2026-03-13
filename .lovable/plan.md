

Remove the "Fetch from CC" button from the ProductsView toolbar while preserving all imported data.

**Approach:**
1. View current ProductsView.tsx to identify the button and related imports/code
2. Remove only the button and its directly supporting code (imports, state, handler)
3. Keep the useProducts hook and all product data display logic intact

**Changes needed:**
- Remove `Cloud`, `Loader2` icon imports
- Remove `useConnections`, `isConnectionConfigured` imports
- Remove `supabase` import
- Remove `useQueryClient` import  
- Remove `isFetching` state
- Remove `handleFetchFromCC` function
- Remove `configuredConnections` variable
- Remove the "Fetch from CC" button from toolbar
- Update empty state message to remove "Click 'Fetch from CC' to import products" reference

**Data preservation:**
- The `useProducts()` hook will continue fetching from the database
- All existing products in the `products` table remain untouched
- The `product_uoms` and `product_mappings` data remains intact

