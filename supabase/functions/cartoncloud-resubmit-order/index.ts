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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return jsonError("orderId is required", 400);
    }

    // Load order with connection
    const { data: order, error: orderError } = await supabase
      .from("sale_orders")
      .select("*, connection:connections(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonError("Order not found", 404);
    }

    const connection = order.connection as Record<string, unknown>;
    if (!connection) {
      return jsonError("Connection not found for this order", 404);
    }

    if (!connection.tenant_id || !connection.client_id || !connection.client_secret) {
      return jsonError("Connection credentials incomplete", 400);
    }

    const rawPayload = order.raw_payload as Record<string, unknown>;
    if (!rawPayload) {
      return jsonError("No stored payload to resubmit", 400);
    }

    // Get auth token
    const token = await getValidToken(supabase, {
      id: String(connection.id),
      api_endpoint: String(connection.api_endpoint),
      client_id: String(connection.client_id),
      client_secret: String(connection.client_secret),
    });

    // Re-POST the stored payload to CC
    const apiUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/outbound-orders`;
    const ccResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Version": "1",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(rawPayload),
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
      const detail = (ccOrder as Record<string, unknown>)?.message ||
        (ccOrder as Record<string, unknown>)?.error || ccText.substring(0, 300);
      return jsonError(`CartonCloud rejected the order: ${detail}`, ccResponse.status);
    }

    // Update local order with new CC response
    const newStatus = String(ccOrder.status || order.status);
    const ccTimestamps = ccOrder.timestamps as Record<string, { time?: string }> | undefined;

    await supabase
      .from("sale_orders")
      .update({
        cc_order_id: String(ccOrder.id),
        cc_version: Number(ccOrder.version) || order.cc_version,
        status: newStatus,
        raw_payload: ccOrder,
        cc_created_at: ccTimestamps?.created?.time
          ? new Date(ccTimestamps.created.time).toISOString()
          : order.cc_created_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    const isRejected = ccResponse.status === 228 || newStatus === "REJECTED";

    return new Response(
      JSON.stringify({
        success: true,
        warning: isRejected,
        order: {
          id: orderId,
          cc_order_id: String(ccOrder.id),
          order_number: order.order_number,
          status: newStatus,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Resubmit order error:", error);
    return jsonError((error as Error).message || "Internal server error", 500);
  }
});

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
