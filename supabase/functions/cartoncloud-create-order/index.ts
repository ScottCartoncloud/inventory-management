import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  ccProductCode: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
}

interface DeliverAddress {
  companyName?: string;
  contactName?: string;
  address1: string;
  address2?: string;
  suburb?: string;
  stateCode?: string;
  postcode?: string;
  countryCode?: string;
}

interface CreateOrderRequest {
  connectionId: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
  attachmentMimeType?: string;
  order: {
    reference: string;
    urgent?: boolean;
    deliverAddress: DeliverAddress;
    deliverInstructions?: string;
    deliverRequiredDate?: string;
    deliverMethod?: string;
    allowSplitting?: boolean;
    invoiceValue?: number;
    items: OrderItem[];
  };
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
    const { connectionId, order, attachmentBase64, attachmentFilename, attachmentMimeType } = (await req.json()) as CreateOrderRequest;

    // Validate
    if (!connectionId) {
      return jsonError("connectionId is required", 400);
    }
    if (!order?.items?.length) {
      return jsonError("Order must have at least one item", 400);
    }
    if (!order.reference) {
      return jsonError("Order reference is required", 400);
    }
    if (!order.deliverAddress?.address1) {
      return jsonError("Delivery address is required", 400);
    }
    for (const item of order.items) {
      if (!item.ccProductCode) return jsonError(`Item missing product code: ${item.productName}`, 400);
      if (!item.quantity || item.quantity <= 0) return jsonError(`Invalid quantity for ${item.productName}`, 400);
    }

    // Load connection
    const { data: connection, error: connError } = await supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      return jsonError("Connection not found", 404);
    }
    if (!connection.cc_customer_id) {
      return jsonError("Customer ID not configured for this connection", 400);
    }
    if (!connection.cc_warehouse_name) {
      return jsonError("Warehouse name not configured for this connection", 400);
    }
    if (!connection.client_id || !connection.client_secret || !connection.tenant_id) {
      return jsonError("Connection credentials incomplete", 400);
    }

    // Get auth token
    const token = await getValidToken(supabase, connection);

    // Build CC request body
    const addr = order.deliverAddress;
    const ccBody = {
      type: "OUTBOUND",
      references: {
        customer: order.reference,
      },
      customer: {
        id: connection.cc_customer_id,
      },
      warehouse: {
        name: connection.cc_warehouse_name,
      },
      details: {
        urgent: order.urgent || false,
        deliver: {
          address: {
            ...(addr.companyName ? { companyName: addr.companyName } : {}),
            ...(addr.contactName ? { contactName: addr.contactName } : {}),
            address1: addr.address1,
            ...(addr.address2 ? { address2: addr.address2 } : {}),
            ...(addr.suburb ? { suburb: addr.suburb } : {}),
            ...(addr.stateCode ? { state: { code: addr.stateCode } } : {}),
            ...(addr.postcode ? { postcode: addr.postcode } : {}),
            country: { iso2Code: addr.countryCode || "AU" },
          },
          method: { type: order.deliverMethod || "SHIPPING" },
          instructions: order.deliverInstructions || "",
          ...(order.deliverRequiredDate ? { requiredDate: order.deliverRequiredDate } : {}),
        },
        invoiceValue: {
          amount: order.invoiceValue || 0,
          currency: "AUD",
        },
        allowSplitting: order.allowSplitting ?? true,
      },
      items: order.items.map((item) => ({
        details: {
          product: {
            references: { code: item.ccProductCode },
          },
          unitOfMeasure: { type: item.unitOfMeasure || "CTN" },
        },
        measures: { quantity: item.quantity },
      })),
    };

    // Call CartonCloud
    const apiUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/outbound-orders`;
    const ccResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Version": "1",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(ccBody),
    });

    const ccText = await ccResponse.text();
    let ccOrder: Record<string, unknown>;

    try {
      ccOrder = JSON.parse(ccText);
    } catch {
      return jsonError(`CartonCloud returned invalid response: ${ccText.substring(0, 200)}`, 502);
    }

    // Handle errors
    if (ccResponse.status === 429) {
      return jsonError("Rate limit reached — please wait a moment and try again", 429);
    }
    if (ccResponse.status === 401 || ccResponse.status === 403) {
      return jsonError("Authentication failed — check connection credentials", 401);
    }
    if (ccResponse.status >= 400 && ccResponse.status !== 201 && ccResponse.status !== 228) {
      const detail = (ccOrder as any)?.message || (ccOrder as any)?.error || ccText.substring(0, 300);
      return jsonError(`CartonCloud rejected the order: ${detail}`, ccResponse.status);
    }

    // Success (201) or created with issues (228)
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const deliverAddressStr = [addr.address1, addr.suburb, addr.stateCode, addr.postcode]
      .filter(Boolean)
      .join(", ");

    const ccTimestamps = ccOrder.timestamps as Record<string, { time?: string }> | undefined;
    const ccItems = (ccOrder.items || []) as Array<Record<string, unknown>>;

    // Save to sale_orders — use upsert to handle race condition where
    // the webhook may have already created this record before we save it
    const orderRow = {
      connection_id: connectionId,
      org_id: connection.org_id,
      cc_order_id: String(ccOrder.id),
      cc_version: Number(ccOrder.version) || null,
      order_number: order.reference,
      source: "portal",
      status: String(ccOrder.status || "AWAITING_PICK_PACK"),
      customer_name: addr.companyName || null,
      deliver_company: addr.companyName || null,
      deliver_address: deliverAddressStr,
      deliver_method: order.deliverMethod || "SHIPPING",
      urgent: order.urgent || false,
      allow_splitting: order.allowSplitting ?? true,
      invoice_amount: order.invoiceValue || 0,
      invoice_currency: "AUD",
      total_qty: totalQty,
      total_items: order.items.length,
      cc_created_at: ccTimestamps?.created?.time
        ? new Date(ccTimestamps.created.time).toISOString()
        : new Date().toISOString(),
      raw_payload: ccOrder,
    };

    // First try: check if webhook already created this order
    const { data: existingOrder } = await supabase
      .from("sale_orders")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("cc_order_id", String(ccOrder.id))
      .maybeSingle();

    let savedOrder: { id: string } | null = null;
    let saveError: unknown = null;

    if (existingOrder) {
      // Webhook beat us — update it and claim as portal
      const { data, error } = await supabase
        .from("sale_orders")
        .update(orderRow)
        .eq("id", existingOrder.id)
        .select()
        .single();
      savedOrder = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from("sale_orders")
        .insert(orderRow)
        .select()
        .single();
      savedOrder = data;
      saveError = error;
    }

    if (saveError) {
      console.error("Failed to save order locally:", saveError);
      // Still return success since CC accepted it
    }

    // Save items — delete existing first to prevent duplicates from webhook race
    if (savedOrder) {
      await supabase.from("sale_order_items").delete().eq("sale_order_id", savedOrder.id);

      const itemRows = order.items.map((item, idx) => {
        const ccItem = ccItems[idx] as Record<string, unknown> | undefined;
        const ccItemDetails = ccItem?.details as Record<string, unknown> | undefined;
        const ccItemProduct = ccItemDetails?.product as Record<string, unknown> | undefined;
        const ccItemUom = ccItemDetails?.unitOfMeasure as Record<string, unknown> | undefined;
        const ccItemRefs = ccItem?.references as Record<string, unknown> | undefined;

        return {
          sale_order_id: savedOrder.id,
          cc_item_id: ccItem?.id ? String(ccItem.id) : `temp-${idx}`,
          cc_numeric_id: ccItemRefs?.numericId ? String(ccItemRefs.numericId) : null,
          cc_product_id: ccItemProduct?.id ? String(ccItemProduct.id) : null,
          cc_product_code: item.ccProductCode,
          product_name: item.productName,
          product_id: item.productId || null,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
          uom_name: ccItemUom?.name ? String(ccItemUom.name) : null,
          raw_item: ccItem || null,
        };
      });

      await supabase.from("sale_order_items").insert(itemRows);
    }

    // Handle attachment — upload to Supabase Storage then send to CartonCloud
    let attachmentUrl: string | null = null;

    if (attachmentBase64 && attachmentFilename && savedOrder) {
      try {
        const binaryStr = atob(attachmentBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const mimeType = attachmentMimeType || "application/pdf";
        const storagePath = `${connectionId}/${savedOrder.id}/${attachmentFilename}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("order-attachments")
          .upload(storagePath, bytes, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("order-attachments")
            .getPublicUrl(storagePath);

          attachmentUrl = urlData?.publicUrl || null;

          await supabase
            .from("sale_orders")
            .update({
              attachment_url: attachmentUrl,
              attachment_filename: attachmentFilename,
            })
            .eq("id", savedOrder.id);
        } else {
          console.error("Storage upload error:", uploadError);
        }

        // Send to CartonCloud as a document attachment
        if (ccOrder?.id) {
          const docUrl = `${connection.api_endpoint}/tenants/${connection.tenant_id}/outbound-orders/${ccOrder.id}/documents`;

          const blob = new Blob([bytes], { type: mimeType });
          const formData = new FormData();
          formData.append("file", blob, attachmentFilename);
          formData.append("name", attachmentFilename);

          const docResponse = await fetch(docUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Accept-Version": "1",
              Accept: "application/json",
            },
            body: formData,
          });

          if (!docResponse.ok) {
            const errText = await docResponse.text();
            console.error("CC document upload error:", docResponse.status, errText);
          } else {
            console.log("CC document uploaded successfully for order:", ccOrder.id);
          }
        }
      } catch (attachErr) {
        console.error("Attachment handling error:", attachErr);
      }
    }

    // Check for 228 / REJECTED status
    const isRejected = ccResponse.status === 228 || String(ccOrder.status) === "REJECTED";
    const ccErrors: string[] = [];
    if (isRejected) {
      const details = ccOrder.details as Record<string, unknown> | undefined;
      const errors = details?.errors as Array<{ message?: string }> | undefined;
      if (errors) {
        ccErrors.push(...errors.map((e) => e.message || JSON.stringify(e)));
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      warning: isRejected,
      attachmentUrl,
      order: {
        id: savedOrder?.id || null,
        cc_order_id: String(ccOrder.id),
        order_number: order.reference,
        status: String(ccOrder.status),
        total_qty: totalQty,
        total_items: order.items.length,
      },
    };

    if (ccErrors.length > 0) {
      response.errors = ccErrors;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create order error:", error);
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
