import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackMetadata {
  Item: Array<{ Name: string; Value: string | number }>;
}

interface STKCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: CallbackMetadata;
}

interface MPesaCallback {
  Body: {
    stkCallback: STKCallback;
  };
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

    const callbackData: MPesaCallback = await req.json();
    const stkCallback = callbackData.Body.stkCallback;

    console.log("M-Pesa Callback received:", JSON.stringify(stkCallback, null, 2));

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Find order by CheckoutRequestID (stored in transaction_hash)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("transaction_hash", CheckoutRequestID)
      .single();

    if (orderError || !order) {
      console.error("Order not found for CheckoutRequestID:", CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = "";
      let transactionDate = "";
      let phoneNumber = "";

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = String(item.Value);
          if (item.Name === "TransactionDate") transactionDate = String(item.Value);
          if (item.Name === "PhoneNumber") phoneNumber = String(item.Value);
        }
      }

      // Update order to confirmed
      await supabase
        .from("orders")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          payment_proof: `M-Pesa Receipt: ${mpesaReceiptNumber}, Phone: ${phoneNumber}, Date: ${transactionDate}`,
          transaction_hash: mpesaReceiptNumber || CheckoutRequestID,
        })
        .eq("id", order.id);

      console.log("Payment confirmed for order:", order.id);

      // Send Telegram notification
      try {
        await supabase.functions.invoke("send-telegram-notification", {
          body: { orderId: order.id, type: "new_order" },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    } else {
      // Payment failed or cancelled
      await supabase
        .from("orders")
        .update({
          status: "failed",
          release_message: ResultDesc,
        })
        .eq("id", order.id);

      console.log("Payment failed for order:", order.id, ResultDesc);
    }

    // Acknowledge callback
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
