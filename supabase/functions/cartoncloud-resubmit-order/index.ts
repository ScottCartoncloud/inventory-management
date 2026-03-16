import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConnectionRow {
  id: string;
  api_endpoint: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
  cc_customer_id: string;
  cc_warehouse_name: string;
}

interface OrderItemRow {
  product_id: string | null;
  product_name: string | null;
  cc_product_code: string | null;
  quantity: number;
  unit_of_measure: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { orderId } = await req.json();

    if (!orderId) return jsonError("orderId is required", 400);

    const { data: order, error: orderError } = await supabase
      .from("sale_orders")
      .select(
        "id, connection_id, order_number, status, source, cc_version, cc_created_at, raw_payload, items:sale_order_items(product_id, product_name, cc_product_code, quantity, unit_of_measure), connection:connections(id, api_endpoint, tenant_id, client_id, client_secret, cc_customer_id, cc_warehouse_name)"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) return jsonError("Order not found", 404);

    const connection = order.connection as ConnectionRow | null;
    if (!connection) return jsonError("Connection not found for this order", 404);

    if (!connection.tenant_id || !connection.client_id || !connection.client_secret) {
      return jsonError("Connection credentials incomplete", 400);
    }
    if (!connection.cc_customer_id) {
      return jsonError("Customer ID not configured for this connection", 400);
    }
    if (!connection.cc_warehouse_name) {
      return jsonError("Warehouse name not configured for this connection", 400);
    }

    const items = (order.items || []) as OrderItemRow[];
    if (!items.length) return jsonError("Order must have at least one item", 400);

    const rawPayload = (order.raw_payload || {}) as Record<string, unknown>;
    const rawDetails = (rawPayload.details as Record<string, unknown> | undefined) || {};
    const rawDeliver = (rawDetails.deliver as Record<string, unknown> | undefined) || {};
    const rawDeliverAddress = (rawDeliver.address as Record<string, unknown> | undefined) || {};
    const rawDeliverMethod = (rawDeliver.method as Record<string, unknown> | undefined) || {};
    const rawInvoice = (rawDetails.invoiceValue as Record<string, unknown> | undefined) || {};

    const address1 = stringOrEmpty(rawDeliverAddress.address1);
    if (!address1) {
      return jsonError("Cannot resubmit: original delivery address is missing", 400);
    }

    const requestItems = items.map((item, idx) => {
      const code = stringOrEmpty(item.cc_product_code);
      const quantity = Number(item.quantity) || 0;

      if (!code) {
        throw new Error(`Item ${idx + 1} missing product code`);
      }
      if (quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.product_name || code}`);
      }

      return {
        details: {
          product: {
            references: { code },
          },
          unitOfMeasure: { type: stringOrEmpty(item.unit_of_measure) || "CTN" },
        },
        measures: { quantity },
      };
    });

    const requestPayload: Record<string, unknown> = {
      type: "OUTBOUND",
      references: {
        customer: order.order_number || stringOrEmpty((rawPayload.references as Record<string, unknown> | undefined)?.customer) || `SO-${Date.now()}`,
      },
      customer: { id: connection.cc_customer_id },
      warehouse: { name: connection.cc_warehouse_name },
      details: {
        urgent: Boolean(rawDetails.urgent),
        deliver: {
          address: {
            ...(stringOrEmpty(rawDeliverAddress.companyName) ? { companyName: stringOrEmpty(rawDeliverAddress.companyName) } : {}),
            ...(stringOrEmpty(rawDeliverAddress.contactName) ? { contactName: stringOrEmpty(rawDeliverAddress.contactName) } : {}),
            address1,
            ...(stringOrEmpty(rawDeliverAddress.address2) ? { address2: stringOrEmpty(rawDeliverAddress.address2) } : {}),
            ...(stringOrEmpty(rawDeliverAddress.suburb) ? { suburb: stringOrEmpty(rawDeliverAddress.suburb) } : {}),
            ...(stringOrEmpty((rawDeliverAddress.state as Record<string, unknown> | undefined)?.code)
              ? { state: { code: stringOrEmpty((rawDeliverAddress.state as Record<string, unknown> | undefined)?.code) } }
              : {}),
            ...(stringOrEmpty(rawDeliverAddress.postcode) ? { postcode: stringOrEmpty(rawDeliverAddress.postcode) } : {}),
            country: {
              iso2Code:
                stringOrEmpty((rawDeliverAddress.country as Record<string, unknown> | undefined)?.iso2Code) || "AU",
            },
          },
          method: { type: stringOrEmpty(rawDeliverMethod.type) || "SHIPPING" },
          instructions: stringOrEmpty(rawDeliver.instructions),
          ...(stringOrEmpty(rawDeliver.requiredDate)
            ? { requiredDate: stringOrEmpty(rawDeliver.requiredDate) }
            : {}),
        },
        invoiceValue: {
          amount: Number(rawInvoice.amount) || 0,
          currency: stringOrEmpty(rawInvoice.currency) || "AUD",
        },
        allowSplitting: rawDetails.allowSplitting != null ? Boolean(rawDetails.allowSplitting) : true,
      },
      items: requestItems,
    };

    const token = await getValidToken(supabase, {
      id: connection.id,
      api_endpoint: connection.api_endpoint,
      client_id: connection.client_id,
      client_secret: connection.client_secret,
    });

    const apiUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/outbound-orders`;
    const ccResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Version": "1",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const ccText = await ccResponse.text();
    let ccOrder: Record<string, unknown>;

    try {
      ccOrder = JSON.parse(ccText);
    } catch {
      return jsonError(`CartonCloud returned invalid response: ${ccText.substring(0, 200)}`, 502);
    }

    if (ccResponse.status === 429) {
      return jsonError("Rate limit reached — please wait a moment and try again", 429);
    }
    if (ccResponse.status === 401 || ccResponse.status === 403) {
      return jsonError("Authentication failed — check connection credentials", 401);
    }
    if (ccResponse.status >= 400 && ccResponse.status !== 201 && ccResponse.status !== 228) {
      const detail =
        stringOrEmpty((ccOrder as Record<string, unknown>)?.message) ||
        stringOrEmpty((ccOrder as Record<string, unknown>)?.error) ||
        ccText.substring(0, 300);
      return jsonError(`CartonCloud rejected the order: ${detail}`, ccResponse.status);
    }

    const newCcOrderId = String(ccOrder.id);
    const ccRefs = (ccOrder.references as Record<string, unknown> | undefined) || {};
    const ccDetails = (ccOrder.details as Record<string, unknown> | undefined) || {};
    const ccDeliver = (ccDetails.deliver as Record<string, unknown> | undefined) || {};
    const ccDeliverAddr = (ccDeliver.address as Record<string, unknown> | undefined) || {};
    const ccDeliverMethod = (ccDeliver.method as Record<string, unknown> | undefined) || {};
    const ccInvoice = (ccDetails.invoiceValue as Record<string, unknown> | undefined) || {};
    const ccTimestamps = ccOrder.timestamps as Record<string, { time?: string }> | undefined;
    const ccItems = (ccOrder.items || []) as Array<Record<string, unknown>>;

    await supabase
      .from("sale_orders")
      .delete()
      .eq("connection_id", order.connection_id)
      .eq("cc_order_id", newCcOrderId)
      .neq("id", orderId);

    const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const { error: updateError } = await supabase
      .from("sale_orders")
      .update({
        cc_order_id: newCcOrderId,
        cc_version: Number(ccOrder.version) || null,
        cc_numeric_id: stringOrEmpty(ccRefs.numericId) || null,
        order_number: stringOrEmpty(ccRefs.customer) || order.order_number,
        source: "portal",
        status: stringOrEmpty(ccOrder.status) || order.status,
        customer_name: stringOrEmpty(ccDeliverAddr.companyName) || null,
        deliver_company: stringOrEmpty(ccDeliverAddr.companyName) || null,
        deliver_address: formatAddress(ccDeliverAddr),
        deliver_method: stringOrEmpty(ccDeliverMethod.type) || null,
        urgent: Boolean(ccDetails.urgent),
        allow_splitting: ccDetails.allowSplitting != null ? Boolean(ccDetails.allowSplitting) : true,
        invoice_amount: Number(ccInvoice.amount) || 0,
        invoice_currency: stringOrEmpty(ccInvoice.currency) || "AUD",
        total_qty: totalQty,
        total_items: items.length,
        cc_created_at: parseTime(ccTimestamps?.created) || order.cc_created_at,
        cc_modified_at: parseTime(ccTimestamps?.modified),
        cc_dispatched_at: parseTime(ccTimestamps?.dispatched),
        cc_packed_at: parseTime(ccTimestamps?.packed),
        raw_payload: ccOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    const itemRows = items.map((item, idx) => {
      const ccItem = ccItems[idx] || {};
      const ccItemDetails = (ccItem.details as Record<string, unknown> | undefined) || {};
      const ccItemProduct = (ccItemDetails.product as Record<string, unknown> | undefined) || {};
      const ccItemUom = (ccItemDetails.unitOfMeasure as Record<string, unknown> | undefined) || {};
      const ccItemRefs = (ccItem.references as Record<string, unknown> | undefined) || {};

      return {
        sale_order_id: orderId,
        cc_item_id: stringOrEmpty(ccItem.id) || `resubmit-${idx}`,
        cc_numeric_id: stringOrEmpty(ccItemRefs.numericId) || null,
        cc_product_id: stringOrEmpty(ccItemProduct.id) || null,
        cc_product_code: item.cc_product_code,
        product_name: item.product_name || stringOrEmpty(ccItemProduct.name) || null,
        product_id: item.product_id,
        quantity: Number(item.quantity) || 0,
        unit_of_measure: item.unit_of_measure || stringOrEmpty(ccItemUom.type) || "CTN",
        uom_name: stringOrEmpty(ccItemUom.name) || null,
        raw_item: Object.keys(ccItem).length ? ccItem : null,
      };
    });

    await supabase.from("sale_order_items").delete().eq("sale_order_id", orderId);
    await supabase.from("sale_order_items").insert(itemRows);

    const isRejected = ccResponse.status === 228 || String(ccOrder.status) === "REJECTED";
    const ccErrors: string[] = [];

    if (isRejected) {
      const details = ccOrder.details as Record<string, unknown> | undefined;
      const errors = details?.errors as Array<{ message?: string }> | undefined;
      if (errors) ccErrors.push(...errors.map((e) => e.message || JSON.stringify(e)));
    }

    const response: Record<string, unknown> = {
      success: true,
      warning: isRejected,
      order: {
        id: orderId,
        cc_order_id: newCcOrderId,
        order_number: order.order_number,
        status: String(ccOrder.status || order.status),
      },
    };

    if (ccErrors.length) response.errors = ccErrors;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Resubmit order error:", error);
    return jsonError((error as Error).message || "Internal server error", 500);
  }
});

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTime(ts: { time?: string } | undefined | null): string | null {
  return ts?.time ? new Date(ts.time).toISOString() : null;
}

function formatAddress(addr: Record<string, unknown> | undefined | null): string | null {
  if (!addr) return null;
  const state = addr.state as { code?: string; name?: string } | string | undefined;
  const stateCode = typeof state === "string" ? state : state?.code || state?.name || "";
  const country = addr.country as { code?: string; iso2Code?: string; name?: string } | string | undefined;
  const countryCode = typeof country === "string" ? country : country?.iso2Code || country?.code || "";
  return [addr.address1, addr.suburb, stateCode, addr.postcode, countryCode]
    .filter(Boolean)
    .join(", ") || null;
}

function jsonError(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function getValidToken(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; api_endpoint: string; client_id: string; client_secret: string }
): Promise<string> {
  const { data: cached } = await supabase
    .from("connection_tokens")
    .select("access_token, expires_at")
    .eq("connection_id", connection.id)
    .gt("expires_at", new Date(Date.now() + 60_000).toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) return cached.access_token;

  const tokenUrl = `${connection.api_endpoint}/uaa/oauth/token`;
  const basicAuth = btoa(`${connection.client_id}:${connection.client_secret}`);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Token fetch failed (${tokenResponse.status}): ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await supabase.from("connection_tokens").insert({
    connection_id: connection.id,
    access_token: accessToken,
    expires_at: expiresAt,
  });

  await supabase
    .from("connection_tokens")
    .delete()
    .eq("connection_id", connection.id)
    .lt("expires_at", new Date().toISOString());

  return accessToken;
}
