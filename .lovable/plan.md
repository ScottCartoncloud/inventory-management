

## Refactor Settings to Per-Location CartonCloud Connections

The current integration tab treats CartonCloud as a single global connection. Based on the architecture context, each Location is an independent CartonCloud tenant with its own API credentials. The Settings page needs to reflect this.

### Changes

**Merge "Locations" and "CartonCloud Integration" tabs into one "Connections" tab**

The current split doesn't make sense in the per-entity model. Each location row IS a CartonCloud connection. The new tab shows all connected entities and lets you add/configure each one.

**Redesign the Connections tab:**
- List of connected CartonCloud entities, each showing: color badge, location name, warehouse address, endpoint, connection status badge, last sync timestamp
- Each row has a "Configure" button that expands (or opens an inline card / accordion) showing that entity's credentials (Tenant ID, Client ID, Client Secret, API Endpoint) — reusing the same masked/edit/test/disconnect pattern from `CartonCloudIntegration`
- "Add Connection" button at the bottom opens a form to link a new CartonCloud entity (name, warehouse, endpoint, credentials) — this effectively adds a new location to the portal

**File changes:**

1. **`src/data/locations.ts`** — Add `endpoint` and `isConnected` fields to the `Location` interface (default all to connected with `api.cartoncloud.com`)

2. **`src/components/settings/CartonCloudIntegration.tsx`** — Refactor to accept a `location` prop so it renders credentials for a specific entity. Rename to `LocationConnectionCard.tsx`.

3. **`src/components/views/SettingsView.tsx`** — Replace the two tabs (Locations + Integration) with a single "Connections" tab. Render an accordion of `LocationConnectionCard` items, one per location. Keep the "General" tab as-is.

### Tab structure
- **General** — Report Preferences (unchanged)
- **Connections** — Per-location CartonCloud entity management with expandable credential sections and "Add Connection"

