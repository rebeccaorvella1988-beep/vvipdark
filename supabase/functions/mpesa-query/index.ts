import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { checkoutRequestId } = await req.json();

    console.log("Querying M-Pesa transaction:", checkoutRequestId);

    // Get M-Pesa settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_paybill, mpesa_environment")
      .single();

    if (!settings?.mpesa_consumer_key) {
      return new Response(
        JSON.stringify({ success: false, error: "M-Pesa not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_paybill, mpesa_environment } = settings;

    const baseUrl = mpesa_environment === "production" 
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Get OAuth token
    const authString = btoa(`${mpesa_consumer_key}:${mpesa_consumer_secret}`);
    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: { "Authorization": `Basic ${authString}` },
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate password and timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${mpesa_paybill}${mpesa_passkey}${timestamp}`);

    // Query transaction status
    const queryResponse = await fetch(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: mpesa_paybill,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      }
    );

    const queryResult = await queryResponse.json();

    console.log("Query result:", queryResult);

    // Check order status in database
    const { data: order } = await supabase
      .from("orders")
      .select("status")
      .eq("transaction_hash", checkoutRequestId)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        mpesaResult: queryResult,
        orderStatus: order?.status || "unknown"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error querying M-Pesa:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Query failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
