import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProxyRequest {
  connectionId: string;
  method?: string;
  path: string;
  body?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, method = "GET", path, body } =
      (await req.json()) as ProxyRequest;

    if (!connectionId || !path) {
      return new Response(
        JSON.stringify({ error: "connectionId and path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service-role client to access connection credentials
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up connection
    const { data: connection, error: connError } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.client_id || !connection.client_secret || !connection.tenant_id) {
      return new Response(
        JSON.stringify({ error: "Connection credentials incomplete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or refresh access token
    const token = await getValidToken(supabase, connection);

    // Handle test-connection — just return success if we got a token
    if (path === "test-connection") {
      return new Response(
        JSON.stringify({ success: true, message: "Connection successful" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proxy the actual request to CartonCloud
    const apiUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/${path}`;
    const ccResponse = await fetch(apiUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Version": "1",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await ccResponse.text();

    // Forward pagination headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
    };
    for (const header of [
      "Total-Pages",
      "Page-Size",
      "Page-Number",
      "Total-Elements",
    ]) {
      const val = ccResponse.headers.get(header);
      if (val) responseHeaders[header] = val;
    }

    return new Response(responseBody, {
      status: ccResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
  // Check for cached valid token (with 60s buffer)
  const { data: cached } = await supabase
    .from("connection_tokens")
    .select("access_token, expires_at")
    .eq("connection_id", connection.id)
    .gt("expires_at", new Date(Date.now() + 60_000).toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    return cached.access_token;
  }

  // Fetch new token from CartonCloud
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

  // Cache the token
  await supabase.from("connection_tokens").insert({
    connection_id: connection.id,
    access_token: accessToken,
    expires_at: expiresAt,
  });

  // Clean up old tokens for this connection
  await supabase
    .from("connection_tokens")
    .delete()
    .eq("connection_id", connection.id)
    .lt("expires_at", new Date().toISOString());

  return accessToken;
}
