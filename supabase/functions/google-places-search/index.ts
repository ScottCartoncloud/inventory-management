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

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured", results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { query, country = "AU", action = "autocomplete", place_id } = body;

    if (action === "details" && place_id) {
      // Place Details
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=address_components,geometry,formatted_address,name&key=${apiKey}`;
      const res = await fetch(detailsUrl);
      const data = await res.json();

      if (data.status !== "OK" || !data.result) {
        return new Response(
          JSON.stringify({ error: `Places API error: ${data.status}`, structured: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = data.result;
      const components = result.address_components || [];
      const get = (type: string) => components.find((c: any) => c.types.includes(type));

      const streetNumber = get("street_number")?.long_name || "";
      const route = get("route")?.long_name || "";
      const address1 = [streetNumber, route].filter(Boolean).join(" ");

      const structured = {
        company_name: result.name || null,
        address1: address1 || result.formatted_address || "",
        suburb: get("locality")?.long_name || get("sublocality")?.long_name || null,
        city: get("locality")?.long_name || null,
        state_name: get("administrative_area_level_1")?.long_name || null,
        state_code: get("administrative_area_level_1")?.short_name || null,
        postcode: get("postal_code")?.long_name || null,
        country_name: get("country")?.long_name || "Australia",
        country_code: get("country")?.short_name || "AU",
        lat: result.geometry?.location?.lat || null,
        lon: result.geometry?.location?.lng || null,
      };

      return new Response(
        JSON.stringify({ structured }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Autocomplete
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:${country}&types=establishment|geocode&key=${apiKey}`;
    const res = await fetch(autocompleteUrl);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return new Response(
        JSON.stringify({ error: `Places API error: ${data.status}`, results: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || "",
      secondary_text: p.structured_formatting?.secondary_text || "",
    }));

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Google Places error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, results: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
