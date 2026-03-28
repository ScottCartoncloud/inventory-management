import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfBase64, connectionId, extractionHints } = await req.json();
    if (!pdfBase64 || !connectionId) {
      return json({ success: false, error: "pdfBase64 and connectionId are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load connection for extraction_hints fallback
    const { data: connection } = await supabase
      .from("connections")
      .select("extraction_hints")
      .eq("id", connectionId)
      .single();

    // Load product mappings with product names
    const { data: mappings } = await supabase
      .from("product_mappings")
      .select("cc_product_code, product_id, cc_product_name")
      .eq("connection_id", connectionId);

    // Load product names
    const productIds = (mappings || []).map((m: any) => m.product_id).filter(Boolean);
    let productsMap: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku")
        .in("id", productIds);
      (products || []).forEach((p: any) => {
        productsMap[p.id] = p.name;
      });
    }

    const productsJson = (mappings || []).map((m: any) => ({
      ccProductCode: m.cc_product_code,
      productId: m.product_id,
      name: productsMap[m.product_id] || m.cc_product_name || m.cc_product_code,
    }));

    const hints = extractionHints || connection?.extraction_hints || "No specific hints provided.";

    const systemPrompt = `You are an AI that extracts sale order information from invoice or order PDFs.

Extract the following and return ONLY valid JSON matching the schema below. Do not include any explanation or markdown.

Available products at this warehouse (match extracted line items to these):
${JSON.stringify(productsJson, null, 2)}

EXTRACTION RULES — always follow these, they override any hints below:

1. PRICING: Always use the ex-GST / ex-tax / before-tax unit price. Never use GST-inclusive prices.

2. UNIT OF MEASURE: Copy the UOM exactly as printed on the document. Do not normalise, abbreviate, or expand it. If the document says "CTN" use "CTN". If it says "Carton" use "Carton".

3. ORDER REFERENCE: Use the invoice number or order number as the reference. Do not use a purchase order number unless no invoice or order number is present.

Extraction hints:
${hints}

Return this exact JSON structure:
{
  "reference": "order reference or invoice number",
  "deliverAddress": {
    "companyName": "",
    "contactName": "",
    "address1": "",
    "address2": "",
    "suburb": "",
    "stateCode": "",
    "postcode": "",
    "countryCode": "AU"
  },
  "deliverRequiredDate": "YYYY-MM-DD or null",
  "deliverInstructions": "",
  "urgent": false,
  "invoiceValue": 0,
  "items": [
    {
      "ccProductCode": "matched CC product code or null if unmatched",
      "productId": "matched product UUID or null if unmatched",
      "productName": "name as it appears on the invoice",
      "extractedCode": "raw code/SKU from the invoice",
      "quantity": 0,
      "unitOfMeasure": "EACH",
      "matched": true or false
    }
  ],
  "confidence": "high | medium | low",
  "notes": "any extraction warnings or ambiguities"
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ success: false, error: "LOVABLE_API_KEY is not configured" }, 500);
    }

    // Use Lovable AI Gateway with a vision-capable model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract the sale order information from this invoice/order document.",
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return json({ success: false, error: "Rate limit exceeded. Please try again shortly." }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ success: false, error: "AI credits exhausted. Please top up in workspace settings." }, 402);
      }
      return json({ success: false, error: "AI extraction failed" }, 500);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return json({ success: false, error: "AI returned invalid JSON. Please try again." }, 422);
    }

    return json({ success: true, extracted: parsed, connectionId });
  } catch (err) {
    console.error("extract-order error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
