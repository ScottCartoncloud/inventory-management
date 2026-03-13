

## CartonCloud API Integration — Phase 1

### Prerequisites

This project currently has **no backend**. We need either Lovable Cloud or a Supabase connection to create database tables and edge functions. Before implementation can begin, you'll need to connect a Supabase project (or enable Lovable Cloud).

Once a backend is connected, here's the plan:

---

### Step 1: Database Schema

Create two tables via migrations:

**`connections`** — replaces the hardcoded `LOCATIONS` array
- `id` (uuid PK), `name`, `code`, `color`, `api_endpoint`, `tenant_id`, `client_id`, `client_secret`, `is_active`, `created_at`, `updated_at`
- Seed with the four existing locations (SYD, MEL, BNE, PER) with empty credentials
- RLS: authenticated users can read/write (refine later with roles)

**`connection_tokens`** — cached OAuth tokens
- `id` (uuid PK), `connection_id` (FK), `access_token`, `expires_at`, `created_at`
- RLS: no direct client access (only edge function via service role)

---

### Step 2: Edge Function — `cartoncloud-proxy`

A single Supabase Edge Function that:

1. Receives `{ connectionId, method, path, body? }` from the frontend
2. Looks up connection credentials from `connections` table (via service role key)
3. Checks `connection_tokens` for a valid (non-expired) token for that connection
4. If missing/expired, calls `POST https://{endpoint}/uaa/oauth/token` with Basic Auth (`clientId:clientSecret`), body `grant_type=client_credentials`, stores the new token
5. Proxies the request to `https://{endpoint}/{path}` with `Authorization: Bearer {token}` and `Accept-Version: 1`
6. Returns the CartonCloud response + pagination headers to the frontend

Special route: when `path` is `"test-connection"`, just do the token fetch and return success/failure (used by Settings page "Test Connection" button).

---

### Step 3: Frontend — Settings Page Updates

**`src/data/locations.ts`** — keep as a fallback type definition but add a React Query hook `useConnections()` that fetches from the `connections` table

**`src/components/settings/LocationConnectionCard.tsx`** — wire Save/Update to upsert into `connections` table, wire "Test Connection" to call the edge function with `path: "test-connection"`

**`src/components/views/SettingsView.tsx`** — use `useConnections()` instead of hardcoded `LOCATIONS`

**Other components using `LOCATIONS`** (LocationPills, LocationChip, OrdersView, etc.) — update to use `useConnections()` with the hardcoded array as fallback when no DB connections exist

---

### Step 4: Frontend — Live Orders Fetch

**New hook: `src/hooks/useOrders.ts`**
- Uses `useConnections()` to get active connections
- For each active connection with credentials, calls the edge function with `path: "tenants/{tenantId}/outbound-orders/search"` in parallel via `Promise.allSettled`
- Transforms CartonCloud responses into the existing `Order` interface shape
- Maps CC statuses: DRAFT/AWAITING_PICK_PACK → pending, PACKING_IN_PROGRESS/PACKED → in_progress, DISPATCHED → completed, REJECTED → on_hold
- Tags each order with `location` (connection code) and `connectionId`
- Returns `{ orders, isLoading, errors }` where errors is per-connection

**`src/components/views/OrdersView.tsx`** — use `useOrders()` instead of importing `ORDERS`
- Show skeleton loading state while fetching
- If no connections configured, show mock data with a banner: "Showing demo data — configure connections in Settings"
- If some connections fail, show partial results + error indicator per failed location
- Search/filter/location pills work the same on the merged dataset

---

### Files Created/Modified Summary

| File | Action |
|------|--------|
| `supabase/migrations/001_connections.sql` | Create `connections` + `connection_tokens` tables |
| `supabase/functions/cartoncloud-proxy/index.ts` | New edge function |
| `supabase/config.toml` | Register edge function, `verify_jwt = false` |
| `src/hooks/useConnections.ts` | New — query `connections` table |
| `src/hooks/useOrders.ts` | New — fetch orders via proxy |
| `src/data/locations.ts` | Keep as fallback type |
| `src/components/settings/LocationConnectionCard.tsx` | Wire to DB + edge function |
| `src/components/views/SettingsView.tsx` | Use `useConnections()` |
| `src/components/views/OrdersView.tsx` | Use `useOrders()`, add loading/error/fallback states |
| `src/components/LocationPills.tsx` | Use `useConnections()` |
| `src/components/LocationChip.tsx` | Use `useConnections()` |

### Next Step

**To proceed, we need to connect a Supabase project to this app.** Would you like to connect an existing Supabase project, or shall I enable Lovable Cloud?

