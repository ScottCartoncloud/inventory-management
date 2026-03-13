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

    // Step 1: Create the report run
    const reportRunUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/report-runs`;

    const createResponse = await fetch(reportRunUrl, {
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

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error("CC SOH create report error:", createResponse.status, errText);
      return json(
        { error: "CartonCloud API error", status: createResponse.status, detail: errText },
        502
      );
    }

    const reportRun = await createResponse.json();
    const reportRunId = reportRun.id;
    console.log("CC SOH report created:", JSON.stringify(reportRun));

    if (!reportRunId) {
      return json({ error: "No report run ID returned from CartonCloud" }, 502);
    }

    // Step 2: Poll until report is complete
    const maxPolls = 30;
    const pollIntervalMs = 2000;
    let reportStatus = reportRun.status;
    let completedReport = reportRun;

    const terminalFailures = new Set(["FAILED", "ERROR", "CANCELLED"]);

    for (let i = 0; i < maxPolls && reportStatus === "IN_PROCESS"; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const pollResponse = await fetch(`${reportRunUrl}/${reportRunId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept-Version": "1",
          Accept: "application/json",
        },
      });

      if (!pollResponse.ok) {
        const errText = await pollResponse.text();
        console.error("CC SOH poll error:", pollResponse.status, errText);
        return json(
          { error: "CartonCloud API error during polling", status: pollResponse.status, detail: errText },
          502
        );
      }

      completedReport = await pollResponse.json();
      reportStatus = completedReport.status;
      console.log(`CC SOH poll ${i + 1}: status=${reportStatus}`);

      if (terminalFailures.has(reportStatus)) {
        console.error("CC SOH report failed:", reportStatus);
        return json({ error: `Report failed with status: ${reportStatus}` }, 502);
      }
    }

    if (reportStatus !== "SUCCESS") {
      console.error("CC SOH report did not complete. Final status:", reportStatus);
      return json(
        { error: `Report did not complete in time. Status: ${reportStatus}` },
        504
      );
    }

    // Log the completed report for debugging
    console.log("CC SOH completed report:", JSON.stringify(completedReport));

    // Step 3: Extract result rows from the completed report
    // The results might be in the report object itself or need a separate fetch
    let allRows: any[] = [];

    // Try extracting from the completed report object
    const resultData = completedReport.results || completedReport.data || completedReport.content || completedReport.rows || completedReport.items || [];
    
    if (Array.isArray(resultData) && resultData.length > 0) {
      allRows = resultData;
    } else {
      // Results might be paginated at a sub-resource endpoint
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const resultsUrl = `${reportRunUrl}/${reportRunId}/results${page > 1 ? `?page=${page}` : ""}`;
        const resultsResponse = await fetch(resultsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Accept-Version": "1",
            Accept: "application/json",
          },
        });

        if (!resultsResponse.ok) {
          // If /results doesn't exist, the data may be directly in the report
          console.log("CC SOH /results endpoint returned:", resultsResponse.status, "- using completed report data directly");
          break;
        }

        const resultsData = await resultsResponse.json();
        if (page === 1) {
          console.log("CC SOH results raw response:", JSON.stringify(resultsData));
          console.log("CC SOH results headers - Total-Pages:", resultsResponse.headers.get("Total-Pages"),
            "Page-Number:", resultsResponse.headers.get("Page-Number"));
        }

        const rows = Array.isArray(resultsData) ? resultsData : (resultsData.content || resultsData.results || resultsData.data || resultsData.rows || []);
        allRows = allRows.concat(rows);

        const tp = resultsResponse.headers.get("Total-Pages");
        if (tp) totalPages = parseInt(tp, 10);
        page++;
      }
    }

    console.log(`CC SOH total rows extracted: ${allRows.length}`);

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
