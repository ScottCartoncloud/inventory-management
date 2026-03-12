

## Update Settings Page to Tabbed Layout with CartonCloud Integration

Redesign the Settings page to match the Dock Scheduler's pattern: centered tabbed layout with a dedicated CartonCloud Integration tab.

### Layout Change

Replace the current single-scroll card layout with shadcn `Tabs` centered on the page (`max-w-3xl mx-auto`). Three tabs:

1. **General** — Report Preferences card (existing content)
2. **Locations** — CartonCloud Locations card (existing content, moved here)
3. **CartonCloud Integration** — New tab with credential management UI

### CartonCloud Integration Tab

A card containing:
- **Connection Status** indicator (connected/disconnected badge)
- **Tenant ID** field (text input)
- **Client ID** field (text input, masked with `••••••••` when saved)
- **Client Secret** field (password input with show/hide toggle, masked when saved)
- **API Endpoint** selector (dropdown: `api.cartoncloud.com`, `api.na.cartoncloud.com`)
- Action buttons: **Test Connection**, **Save Settings** / **Update Credentials**, **Disconnect**

Since there's no backend yet, this will be a fully functional UI with local state (values stored in component state / mock). The credential fields will demonstrate the masked/unmasked pattern from the dock scheduler — showing `••••••••` placeholders when "saved", with an "Update Credentials" button to switch to edit mode.

### File Changes

- **`src/components/views/SettingsView.tsx`** — Refactor to use `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`. Center the content. Move existing cards into their respective tabs. Add the new Integration tab content.
- **`src/components/settings/CartonCloudIntegration.tsx`** — New component for the integration UI with local state for credential management, connection testing (mock), and the masked/edit flow.

### Design Details
- Tabs bar uses shadcn default styling, centered within a `max-w-3xl mx-auto` container
- Cards within tabs keep existing styling
- Integration card uses the same blue accent (`hsl(210,100%,40%)`) for status indicators
- Eye icon toggle for secret visibility using lucide `Eye`/`EyeOff`

