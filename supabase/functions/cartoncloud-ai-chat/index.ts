import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Tool definitions ──

const tools = [
  {
    type: "function",
    function: {
      name: "get_stock_on_hand",
      description:
        "Get current stock on hand from the portal database. Can filter by product name, SKU, or connection (warehouse).",
      parameters: {
        type: "object",
        properties: {
          connectionId: {
            type: "string",
            description: "Connection ID to filter by. Omit to query all.",
          },
          productSearch: {
            type: "string",
            description: "Search term to filter by product name or SKU.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_orders",
      description:
        "Get sale orders from the portal database. Returns order reference, status, deliver address, items, and connection info.",
      parameters: {
        type: "object",
        properties: {
          connectionId: {
            type: "string",
            description: "Required. Connection ID to query orders for.",
          },
          status: {
            type: "string",
            description: "Optional status filter e.g. PENDING, PROCESSING, COMPLETED.",
          },
          limit: {
            type: "number",
            description: "Max orders to return. Default 10.",
          },
        },
        required: ["connectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order_confirmation",
      description:
        "Use when the user wants to place an order AND you have all required info. This returns a confirmation to the user — do NOT call unless you have product, quantity, delivery address, and warehouse.",
      parameters: {
        type: "object",
        properties: {
          connectionId: { type: "string" },
          connectionName: { type: "string" },
          productName: { type: "string" },
          ccProductCode: { type: "string" },
          quantity: { type: "number" },
          unitOfMeasure: { type: "string", description: "e.g. EACH, CARTON" },
          deliverAddress: {
            type: "object",
            properties: {
              companyName: { type: "string" },
              address1: { type: "string" },
              suburb: { type: "string" },
              stateCode: { type: "string" },
              postcode: { type: "string" },
              countryCode: { type: "string" },
            },
            required: ["address1"],
          },
          reference: { type: "string" },
        },
        required: ["connectionId", "ccProductCode", "quantity", "deliverAddress", "reference"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_addresses",
      description:
        "Search the saved address book for a delivery address. Call this whenever the user mentions any delivery location — a company name, suburb, postcode, or street — before asking them to provide address details manually. Returns matching addresses ordered by most frequently used.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term — company name, suburb, postcode, or partial street address.",
          },
        },
        required: ["query"],
      },
    },
  },
];

// ── Tool handlers ──

async function handleGetStockOnHand(
  supabase: any,
  args: { connectionId?: string; productSearch?: string }
) {
  let query = supabase
    .from("stock_on_hand")
    .select("qty, product_status, unit_of_measure, cc_product_code, connection_id, product_id, products(name, sku), connections(name)")
    .order("qty", { ascending: false })
    .limit(50);

  if (args.connectionId) {
    query = query.eq("connection_id", args.connectionId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  let results = (data || []).map((row: any) => ({
    productName: row.products?.name ?? "Unknown",
    sku: row.products?.sku ?? row.cc_product_code,
    qty: row.qty,
    productStatus: row.product_status,
    unitOfMeasure: row.unit_of_measure,
    connectionName: row.connections?.name ?? "Unknown",
  }));

  if (args.productSearch) {
    const search = args.productSearch.toLowerCase();
    results = results.filter(
      (r: any) =>
        r.productName.toLowerCase().includes(search) ||
        r.sku.toLowerCase().includes(search)
    );
  }

  return { stockItems: results, count: results.length };
}

async function handleGetOrders(
  supabase: any,
  args: { connectionId: string; status?: string; limit?: number }
) {
  const limit = args.limit || 10;
  let query = supabase
    .from("sale_orders")
    .select("id, order_number, status, customer_name, deliver_company, deliver_address, total_items, total_qty, cc_created_at, connection_id, connections(name)")
    .eq("connection_id", args.connectionId)
    .order("cc_created_at", { ascending: false })
    .limit(limit);

  if (args.status) {
    query = query.eq("status", args.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    orders: (data || []).map((o: any) => ({
      orderNumber: o.order_number,
      status: o.status,
      customerName: o.customer_name,
      deliverTo: o.deliver_company || o.deliver_address,
      totalItems: o.total_items,
      totalQty: o.total_qty,
      createdAt: o.cc_created_at,
      connectionName: o.connections?.name,
    })),
    count: (data || []).length,
  };
}

function handleCreateOrderConfirmation(args: any) {
  const addr = args.deliverAddress || {};
  const addrStr = [addr.companyName, addr.address1, addr.suburb, addr.stateCode, addr.postcode]
    .filter(Boolean)
    .join(", ");

  return {
    requiresConfirmation: true,
    summary: `Order ${args.quantity}x ${args.productName || args.ccProductCode} (${args.unitOfMeasure || "EA"}) from ${args.connectionName || "warehouse"} → ${addrStr}. Ref: ${args.reference}`,
    confirmationPayload: {
      connectionId: args.connectionId,
      summary: `${args.quantity}x ${args.productName || args.ccProductCode} → ${addrStr}`,
      order: {
        connectionId: args.connectionId,
        reference: args.reference,
        items: [
          {
            productCode: args.ccProductCode,
            quantity: args.quantity,
            unitOfMeasure: args.unitOfMeasure || "EACH",
          },
        ],
        deliverAddress: args.deliverAddress,
      },
    },
  };
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, history, connections } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build system prompt
    const connectionsInfo = (connections || [])
      .map((c: any) => `- ${c.name} (code: ${c.code}, id: ${c.id}, warehouse: ${c.cc_warehouse_name || "Default"})`)
      .join("\n");

    const systemPrompt = `You are an AI assistant for a logistics inventory management portal connected to CartonCloud WMS.

You have access to the user's CartonCloud connections (warehouses):
${connectionsInfo || "No connections configured yet."}

You can help users:
- Check stock on hand for specific products or SKUs
- List sale orders and purchase orders
- Place new sale orders into CartonCloud

CRITICAL RULES — ALWAYS USE YOUR TOOLS:
- When the user mentions ANY product (by name, SKU, or description), IMMEDIATELY call get_stock_on_hand to look it up. Do NOT ask the user for product codes — find them yourself.
- When the user mentions ANY delivery location (company name, suburb, address, postcode), IMMEDIATELY call search_addresses to find it. Do NOT ask the user for address details — search first.
- When placing an order, you should call BOTH get_stock_on_hand and search_addresses in parallel to gather the information you need, then use create_order_confirmation.
- Only ask for clarification if the tools return no results or multiple ambiguous matches.
- Always confirm with the user before placing an order. Summarise exactly what you're about to do.
- If the user mentions a warehouse by name or location, match it to the nearest connection.
- Keep responses concise and friendly. Use plain language, not jargon.
- When showing stock or order data, format it clearly using markdown tables or lists.
- If you can't find a product or connection that matches, say so clearly.`;

    // Build messages for the AI
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-20),
      { role: "user", content: message },
    ];

    // Agentic loop (max 5 iterations)
    let confirmationResult: any = null;

    for (let i = 0; i < 5; i++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("AI gateway error:", resp.status, errText);
        if (resp.status === 429) return json({ reply: "I'm receiving too many requests right now. Please try again in a moment." }, 429);
        if (resp.status === 402) return json({ reply: "AI credits have been exhausted. Please add funds to continue." }, 402);
        throw new Error(`AI gateway error: ${resp.status}`);
      }

      const completion = await resp.json();
      const choice = completion.choices?.[0];
      if (!choice) throw new Error("No response from AI");

      const assistantMessage = choice.message;
      aiMessages.push(assistantMessage);

      // Check for tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let args: any;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          let result: any;

          if (fnName === "get_stock_on_hand") {
            result = await handleGetStockOnHand(supabase, args);
          } else if (fnName === "get_orders") {
            result = await handleGetOrders(supabase, args);
          } else if (fnName === "create_order_confirmation") {
            result = handleCreateOrderConfirmation(args);
            confirmationResult = result;
          } else if (fnName === "search_addresses") {
            const pattern = `%${args.query}%`;
            const { data: addresses, error: addrErr } = await supabase
              .from("addresses")
              .select("id, company_name, contact_name, address1, address2, suburb, state_code, postcode, country_code, use_count, last_used_at")
              .eq("is_active", true)
              .or(`company_name.ilike.${pattern},suburb.ilike.${pattern},address1.ilike.${pattern},postcode.ilike.${pattern}`)
              .order("use_count", { ascending: false })
              .limit(5);

            if (addrErr) {
              result = { error: addrErr.message };
            } else if (!addresses || addresses.length === 0) {
              result = { found: false, message: "No matching addresses found in the address book." };
            } else {
              result = {
                found: true,
                count: addresses.length,
                addresses: addresses.map((a: any) => ({
                  id: a.id,
                  companyName: a.company_name,
                  contactName: a.contact_name,
                  address1: a.address1,
                  address2: a.address2,
                  suburb: a.suburb,
                  stateCode: a.state_code,
                  postcode: a.postcode,
                  countryCode: a.country_code,
                  useCount: a.use_count,
                  lastUsedAt: a.last_used_at,
                })),
              };
            }
          } else {
            result = { error: `Unknown tool: ${fnName}` };
          }

          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        // Continue loop to let AI process tool results
        continue;
      }

      // No tool calls — final response
      const reply = assistantMessage.content || "I'm not sure how to help with that.";

      if (confirmationResult) {
        return json({
          reply,
          requiresConfirmation: true,
          confirmationPayload: confirmationResult.confirmationPayload,
        });
      }

      return json({ reply });
    }

    // Max iterations reached
    const lastMsg = aiMessages[aiMessages.length - 1];
    return json({ reply: lastMsg?.content || "I ran into a complex query. Could you try rephrasing?" });
  } catch (err) {
    console.error("cartoncloud-ai-chat error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
