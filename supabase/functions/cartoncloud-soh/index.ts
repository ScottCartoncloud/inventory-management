import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { connectionId } = await req.json();
    if (!connectionId) return json({ error: "connectionId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load connection
    const { data: connection, error: connErr } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();
    if (connErr || !connection) return json({ error: "Connection not found" }, 404);

    if (!connection.client_id || !connection.client_secret || !connection.tenant_id) {
      return json({ error: "Connection credentials incomplete" }, 400);
    }
    if (!connection.cc_customer_id) {
      return json({ error: "Customer ID not configured for this connection" }, 400);
    }

    // Get auth token (reuse proxy's token caching logic)
    const token = await getValidToken(supabase, connection);

    const warehouseName = connection.cc_warehouse_name || "Default";
    const refreshStart = new Date().toISOString();

    // Fetch SOH report from CartonCloud
    let allRows: any[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const reportUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/report-runs${page > 1 ? `?page=${page}` : ""}`;

      const ccResponse = await fetch(reportUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept-Version": "1",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          type: "STOCK_ON_HAND",
          parameters: {
            pageSize: 100,
            warehouse: { name: warehouseName },
            customer: { id: connection.cc_customer_id },
            aggregateBy: ["productType"],
          },
        }),
      });

      if (!ccResponse.ok) {
        const errText = await ccResponse.text();
        console.error("CC SOH API error:", ccResponse.status, errText);
        return json(
          { error: "CartonCloud API error", status: ccResponse.status, detail: errText },
          502
        );
      }

      const data = await ccResponse.json();

      // Log raw response on first page for debugging
      if (page === 1) {
        console.log("CC SOH raw response:", JSON.stringify(data));
        console.log("CC SOH response headers - Total-Pages:", ccResponse.headers.get("Total-Pages"),
          "Page-Number:", ccResponse.headers.get("Page-Number"),
          "Total-Elements:", ccResponse.headers.get("Total-Elements"));
      }

      // The response could be an array directly or wrapped in a property
      const rows = Array.isArray(data) ? data : (data.content || data.results || data.data || []);
      allRows = allRows.concat(rows);

      const tp = ccResponse.headers.get("Total-Pages");
      if (tp) totalPages = parseInt(tp, 10);
      page++;
    }

    // Load product mappings for this connection
    const { data: mappings } = await supabase
      .from("product_mappings")
      .select("product_id, cc_product_code")
      .eq("connection_id", connectionId);

    const mappingsByCode = new Map<string, string>();
    (mappings || []).forEach((m: any) => {
      mappingsByCode.set(m.cc_product_code, m.product_id);
    });

    let matched = 0;
    let unmatched = 0;
    const upsertRows: any[] = [];

    for (const row of allRows) {
      // Try to extract product code from various possible field paths
      const productCode =
        row.productType?.code ||
        row.product?.code ||
        row.productCode ||
        row.code ||
        null;

      if (!productCode) {
        console.warn("CC SOH row missing product code:", JSON.stringify(row));
        unmatched++;
        continue;
      }

      const productId = mappingsByCode.get(productCode);
      if (!productId) {
        unmatched++;
        continue;
      }

      matched++;

      // Extract quantity
      const qty =
        row.quantity ?? row.qty ?? row.amount ?? row.totalQuantity ?? 0;

      // Extract status
      const productStatus =
        row.productStatus || row.status || "AVAILABLE";

      // Extract UOM
      const unitOfMeasure =
        row.unitOfMeasure?.name ||
        row.unitOfMeasure?.type ||
        row.unitOfMeasure ||
        (typeof row.uom === "string" ? row.uom : null) ||
        null;

      upsertRows.push({
        product_id: productId,
        connection_id: connectionId,
        cc_product_code: productCode,
        product_status: typeof productStatus === "string" ? productStatus : "AVAILABLE",
        unit_of_measure: typeof unitOfMeasure === "string" ? unitOfMeasure : null,
        qty: Number(qty) || 0,
        raw_response: row,
        last_updated_at: refreshStart,
      });
    }

    // Upsert in batches
    if (upsertRows.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < upsertRows.length; i += batchSize) {
        const batch = upsertRows.slice(i, i + batchSize);
        const { error: upsertErr } = await supabase
          .from("stock_on_hand")
          .upsert(batch, {
            onConflict: "product_id,connection_id,product_status,unit_of_measure",
          });
        if (upsertErr) {
          console.error("SOH upsert error:", upsertErr);
        }
      }
    }

    // Clean up stale rows for this connection
    const { error: deleteErr } = await supabase
      .from("stock_on_hand")
      .delete()
      .eq("connection_id", connectionId)
      .lt("last_updated_at", refreshStart);

    if (deleteErr) console.error("SOH cleanup error:", deleteErr);

    // Update connection's soh_last_refreshed_at
    await supabase
      .from("connections")
      .update({ soh_last_refreshed_at: refreshStart })
      .eq("id", connectionId);

    return json({
      success: true,
      connection_id: connectionId,
      summary: {
        total_rows_from_cc: allRows.length,
        matched_to_portal: matched,
        unmatched,
        pages_fetched: page - 1,
      },
      refreshed_at: refreshStart,
    });
  } catch (error) {
    console.error("SOH error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
});

async function getValidToken(
  supabase: ReturnType<typeof createClient>,
  connection: {
    id: string;
    api_endpoint: string;
    client_id: string;
    client_secret: string;
  }
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
  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in || 3600) * 1000
  ).toISOString();

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
