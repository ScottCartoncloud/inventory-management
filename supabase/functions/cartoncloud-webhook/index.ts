import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const connectionId = pathParts[pathParts.length - 1];
    const secret = url.searchParams.get("secret");

    if (!connectionId || connectionId === "cartoncloud-webhook") {
      return new Response(
        JSON.stringify({ error: "Missing connection_id in URL path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: connection, error: connError } = await supabase
      .from("connections")
      .select("id, org_id, webhook_secret, name")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.webhook_secret || connection.webhook_secret !== secret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const eventType = payload.type || payload.status || "UNKNOWN";

    const { data: event, error: eventError } = await supabase
      .from("webhook_events")
      .insert({
        connection_id: connectionId,
        org_id: connection.org_id,
        event_type: eventType,
        cc_order_id: payload.id ? String(payload.id) : null,
        payload,
        processed: false,
      })
      .select()
      .single();

    if (eventError) {
      console.error("Failed to store webhook event:", eventError);
    }

    try {
      await processOutboundOrder(supabase, connection, payload);

      if (event) {
        await supabase
          .from("webhook_events")
          .update({ processed: true })
          .eq("id", event.id);
      }
    } catch (err) {
      console.error("Processing error:", err);
      if (event) {
        await supabase
          .from("webhook_events")
          .update({ processed: false, processing_error: (err as Error).message })
          .eq("id", event.id);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ received: true, error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

function parseTime(ts: { time?: string } | undefined | null): string | null {
  return ts?.time ? new Date(ts.time).toISOString() : null;
}

// --- Address upsert logic ---

interface AddressData {
  company_name: string | null;
  address1: string;
  address2?: string | null;
  suburb?: string | null;
  city?: string | null;
  state_name?: string | null;
  state_code?: string | null;
  postcode?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  lat?: number | null;
  lon?: number | null;
  phone?: string | null;
  cc_address_id?: string | null;
  source: string;
  address_type: string;
}

async function upsertAddress(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  data: AddressData
) {
  try {
    // Try match by cc_address_id first
    if (data.cc_address_id) {
      const { data: existing } = await supabase
        .from("addresses")
        .select("id, use_count")
        .eq("org_id", orgId)
        .eq("cc_address_id", data.cc_address_id)
        .single();

      if (existing) {
        await supabase
          .from("addresses")
          .update({
            ...data,
            org_id: orgId,
            use_count: (existing.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        return;
      }
    }

    // Fallback: match by company_name + address1 + postcode
    if (data.company_name && data.address1 && data.postcode) {
      const { data: existing } = await supabase
        .from("addresses")
        .select("id, use_count")
        .eq("org_id", orgId)
        .ilike("company_name", data.company_name)
        .ilike("address1", data.address1)
        .eq("postcode", data.postcode)
        .single();

      if (existing) {
        await supabase
          .from("addresses")
          .update({
            ...data,
            org_id: orgId,
            use_count: (existing.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        return;
      }
    }

    // No match — insert new
    await supabase
      .from("addresses")
      .insert({
        ...data,
        org_id: orgId,
        use_count: 1,
        last_used_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error("Address upsert error:", err);
  }
}

function extractAddressData(
  addr: Record<string, unknown>,
  type: "delivery" | "collection"
): AddressData | null {
  if (!addr || !addr.address1) return null;
  const state = addr.state as { name?: string; code?: string } | undefined;
  const country = addr.country as { name?: string; iso2Code?: string; code?: string } | undefined;
  const location = addr.location as { lat?: string | number; lon?: string | number } | undefined;

  return {
    company_name: (addr.companyName as string) || null,
    address1: String(addr.address1),
    address2: (addr.address2 as string) || null,
    suburb: (addr.suburb as string) || null,
    city: (addr.city as string) || null,
    state_name: state?.name || null,
    state_code: state?.code || null,
    postcode: (addr.postcode as string) || null,
    country_name: country?.name || "Australia",
    country_code: country?.iso2Code || country?.code || "AU",
    lat: location?.lat ? parseFloat(String(location.lat)) : null,
    lon: location?.lon ? parseFloat(String(location.lon)) : null,
    phone: (addr.phone as string) || null,
    cc_address_id: addr.id ? String(addr.id) : null,
    source: "cartoncloud",
    address_type: type,
  };
}

async function processOutboundOrder(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; org_id: string },
  payload: Record<string, unknown>
) {
  if (payload.type && payload.type !== "OUTBOUND") {
    console.log("Skipping non-outbound webhook:", payload.type);
    return;
  }

  const details = payload.details as Record<string, unknown> | undefined;
  const deliver = details?.deliver as Record<string, unknown> | undefined;
  const collect = details?.collect as Record<string, unknown> | undefined;
  const deliverAddr = deliver?.address as Record<string, unknown> | undefined;
  const collectAddr = collect?.address as Record<string, unknown> | undefined;
  const references = payload.references as Record<string, unknown> | undefined;
  const timestamps = payload.timestamps as Record<string, { time?: string }> | undefined;
  const customer = payload.customer as Record<string, unknown> | undefined;
  const items = (payload.items || []) as Array<Record<string, unknown>>;

  const totalQty = items.reduce((sum, item) => {
    const measures = item.measures as Record<string, unknown> | undefined;
    return sum + (Number(measures?.quantity) || 0);
  }, 0);

  const deliverMethod = deliver?.method as Record<string, unknown> | undefined;

  const referenceCustomer = references?.customer ? String(references.customer) : null;

  const baseOrderData = {
    connection_id: connection.id,
    org_id: connection.org_id,
    cc_order_id: String(payload.id),
    cc_version: Number(payload.version) || null,
    order_number: referenceCustomer,
    cc_numeric_id: references?.numericId ? String(references.numericId) : null,
    status: String(payload.status || "UNKNOWN"),
    customer_name: (deliverAddr?.companyName || customer?.name || null) as string | null,
    deliver_company: (deliverAddr?.companyName || null) as string | null,
    deliver_address: formatAddress(deliverAddr),
    deliver_method: (deliverMethod?.type || null) as string | null,
    collect_company: (collectAddr?.companyName || null) as string | null,
    collect_address: formatAddress(collectAddr),
    urgent: Boolean((details as Record<string, unknown>)?.urgent) || false,
    allow_splitting: (details as Record<string, unknown>)?.allowSplitting != null
      ? Boolean((details as Record<string, unknown>)?.allowSplitting)
      : true,
    invoice_amount: null,
    invoice_currency: "AUD",
    total_qty: totalQty,
    total_items: items.length,
    cc_created_at: parseTime(timestamps?.created),
    cc_modified_at: parseTime(timestamps?.modified),
    cc_dispatched_at: parseTime(timestamps?.dispatched),
    cc_packed_at: parseTime(timestamps?.packed),
    raw_payload: payload,
    updated_at: new Date().toISOString(),
  };

  const { data: existingByCcId } = await supabase
    .from("sale_orders")
    .select("id, source")
    .eq("connection_id", connection.id)
    .eq("cc_order_id", String(payload.id))
    .maybeSingle();

  let order: { id: string } | null = null;

  if (existingByCcId?.id) {
    const { data: updatedByCcId, error: updatedByCcIdError } = await supabase
      .from("sale_orders")
      .update({ ...baseOrderData, source: existingByCcId.source || "cartoncloud" })
      .eq("id", existingByCcId.id)
      .select("id")
      .single();

    if (updatedByCcIdError) throw updatedByCcIdError;
    order = updatedByCcId;
  } else {
    const { data: existingPortalByRef } = referenceCustomer
      ? await supabase
          .from("sale_orders")
          .select("id")
          .eq("connection_id", connection.id)
          .eq("order_number", referenceCustomer)
          .eq("source", "portal")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    if (existingPortalByRef?.id) {
      const { data: updatedPortal, error: updatedPortalError } = await supabase
        .from("sale_orders")
        .update({ ...baseOrderData, source: "portal" })
        .eq("id", existingPortalByRef.id)
        .select("id")
        .single();

      if (updatedPortalError) throw updatedPortalError;
      order = updatedPortal;
    } else {
      const { data: inserted, error: insertedError } = await supabase
        .from("sale_orders")
        .upsert(
          { ...baseOrderData, source: "cartoncloud" },
          { onConflict: "connection_id,cc_order_id" }
        )
        .select("id")
        .single();

      if (insertedError) throw insertedError;
      order = inserted;
    }
  }

  if (!order?.id) {
    throw new Error("Failed to upsert sale order");
  }

  // Extract and upsert addresses
  const deliverAddrData = deliverAddr ? extractAddressData(deliverAddr, "delivery") : null;
  const collectAddrData = collectAddr ? extractAddressData(collectAddr, "collection") : null;

  if (deliverAddrData) {
    await upsertAddress(supabase, connection.org_id, deliverAddrData);
  }
  if (collectAddrData) {
    await upsertAddress(supabase, connection.org_id, collectAddrData);
  }

  // Delete existing items and re-insert
  await supabase.from("sale_order_items").delete().eq("sale_order_id", order.id);

  if (items.length > 0) {
    const productCodes = items
      .map((item) => {
        const d = item.details as Record<string, unknown> | undefined;
        const product = d?.product as Record<string, unknown> | undefined;
        const refs = product?.references as Record<string, unknown> | undefined;
        return refs?.code ? String(refs.code) : null;
      })
      .filter(Boolean) as string[];

    const { data: mappings } = await supabase
      .from("product_mappings")
      .select("cc_product_code, product_id")
      .eq("connection_id", connection.id)
      .in("cc_product_code", productCodes.length > 0 ? productCodes : ["__none__"]);

    const mappingLookup: Record<string, string> = {};
    (mappings || []).forEach((m) => {
      mappingLookup[m.cc_product_code] = m.product_id;
    });

    const itemRows = items.map((item) => {
      const d = item.details as Record<string, unknown> | undefined;
      const product = d?.product as Record<string, unknown> | undefined;
      const refs = product?.references as Record<string, unknown> | undefined;
      const uom = d?.unitOfMeasure as Record<string, unknown> | undefined;
      const measures = item.measures as Record<string, unknown> | undefined;
      const props = item.properties as Record<string, unknown> | undefined;
      const code = refs?.code ? String(refs.code) : null;

      return {
        sale_order_id: order.id,
        cc_item_id: String(item.id),
        cc_numeric_id: (item.references as Record<string, unknown>)?.numericId
          ? String((item.references as Record<string, unknown>).numericId)
          : null,
        cc_product_id: product?.id ? String(product.id) : null,
        cc_product_code: code,
        product_name: product?.name ? String(product.name) : null,
        product_id: code ? mappingLookup[code] || null : null,
        quantity: Number(measures?.quantity) || 0,
        unit_of_measure: uom?.type ? String(uom.type) : null,
        uom_name: uom?.name ? String(uom.name) : null,
        expiry_date: props?.expiryDate ? String(props.expiryDate) : null,
        raw_item: item,
      };
    });

    const { error: itemsError } = await supabase
      .from("sale_order_items")
      .insert(itemRows);

    if (itemsError) throw itemsError;
  }
}
