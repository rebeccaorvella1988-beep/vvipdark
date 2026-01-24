import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STKPushRequest {
  phone: string;
  amount: number;
  orderId: string;
  accountReference: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { phone, amount, orderId, accountReference }: STKPushRequest = await req.json();

    console.log("Processing M-Pesa STK Push:", { phone, amount, orderId });

    // Validate phone number format
    let formattedPhone = phone.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Get M-Pesa settings
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_paybill, mpesa_environment")
      .single();

    if (settingsError || !settings?.mpesa_consumer_key) {
      console.error("M-Pesa not configured:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "M-Pesa not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_paybill, mpesa_environment } = settings;

    // Determine base URL based on environment
    const baseUrl = mpesa_environment === "production" 
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Step 1: Get OAuth token
    const authString = btoa(`${mpesa_consumer_key}:${mpesa_consumer_secret}`);
    console.log("Requesting OAuth token from:", `${baseUrl}/oauth/v1/generate`);
    console.log("Environment:", mpesa_environment);
    
    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authString}`,
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("OAuth token error - Status:", tokenResponse.status);
      console.error("OAuth token error - Response:", errorText);
      
      let userMessage = "Failed to authenticate with M-Pesa. ";
      if (tokenResponse.status === 400) {
        userMessage += "Invalid credentials. Please check your Consumer Key and Consumer Secret in Admin Settings.";
      } else if (tokenResponse.status === 401) {
        userMessage += "Unauthorized. Your M-Pesa API credentials may be incorrect or expired.";
      } else {
        userMessage += `Error code: ${tokenResponse.status}`;
      }
      
      return new Response(
        JSON.stringify({ success: false, error: userMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Generate password and timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${mpesa_paybill}${mpesa_passkey}${timestamp}`);

    // Step 3: Get callback URL from Supabase project URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;

    // Step 4: Initiate STK Push
    const stkPushPayload = {
      BusinessShortCode: mpesa_paybill,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: mpesa_paybill,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference || "Payment",
      TransactionDesc: `Payment for order ${orderId}`,
    };

    console.log("STK Push payload:", { ...stkPushPayload, Password: "[HIDDEN]" });

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const stkResult = await stkResponse.json() as STKPushResponse;

    console.log("STK Push response:", stkResult);

    if (stkResult.ResponseCode === "0") {
      // Store checkout request ID for later verification
      await supabase
        .from("orders")
        .update({ 
          transaction_hash: stkResult.CheckoutRequestID,
          status: "processing"
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: stkResult.CustomerMessage,
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("STK Push failed:", stkResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: stkResult.ResponseDescription || "Failed to initiate payment"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error processing STK Push:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
