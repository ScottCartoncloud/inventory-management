

## AI Chat Landing Page — Implementation Plan

### What We're Building
A full-screen AI chat interface as the new landing page. Users can query stock, orders, and place orders via natural language. The existing tabs remain unchanged.

### Prerequisites
- **ANTHROPIC_API_KEY** must be added as a backend secret before the edge function will work. I'll use the `add_secret` tool to request this from you during implementation.

### Files to Create

**1. `src/components/views/ChatView.tsx`**
- Full-height chat UI with blue gradient background
- Welcome screen with branding when no messages, suggestion chips below input
- Message thread: user bubbles (white, right-aligned), assistant bubbles (semi-transparent white, left-aligned)
- Animated loading dots while waiting for AI
- Confirmation UI for order placement (Yes/Cancel buttons)
- On confirm: calls existing `cartoncloud-create-order` edge function directly
- Uses `useConnections` hook to pass connection context to the AI

**2. `supabase/functions/cartoncloud-ai-chat/index.ts`**
- Agentic loop calling Anthropic Claude with tool use
- Three tools:
  - `get_stock_on_hand` — queries `stock_on_hand` joined with `products` and `connections`
  - `get_orders` — proxies to `cartoncloud-proxy` for sale orders
  - `create_order_confirmation` — returns confirmation payload to frontend (does NOT create the order)
- Max 5 tool-use iterations, then returns final text + optional confirmation payload
- System prompt includes serialized connections for warehouse context

### Files to Modify

**3. `src/pages/Index.tsx`**
- Default `activeTab` changed from `"dashboard"` to `"chat"`
- Add `ChatView` rendering for `activeTab === "chat"`

**4. `src/components/AppHeader.tsx`**
- Add `{ id: "chat", label: "AI Assistant", icon: Sparkles }` as first nav item
- Import `Sparkles` from `lucide-react`

**5. `supabase/config.toml`**
- Add `[functions.cartoncloud-ai-chat]` with `verify_jwt = false`

### Architecture

```text
User types message
       │
       ▼
 ChatView.tsx ──invoke──▶ cartoncloud-ai-chat (edge fn)
       │                        │
       │                   Anthropic API
       │                   (tool use loop)
       │                        │
       │                  ┌─────┼─────┐
       │            get_stock  get_orders  create_order_confirmation
       │            (Supabase)  (proxy)    (return payload)
       │                        │
       ◀────── JSON response ───┘
       │
       ▼ (if confirmation)
 User clicks "Yes"
       │
       ▼
 invoke cartoncloud-create-order (existing)
```

### No Other Files Changed
All existing functionality (Dashboard, Orders, SOH, Products, etc.) remains untouched.

