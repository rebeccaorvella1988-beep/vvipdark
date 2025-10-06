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

    const { orderId, type } = await req.json();
    
    console.log("Processing notification:", { orderId, type });

    // Get telegram settings
    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("*")
      .single();

    if (!settings?.bot_token) {
      console.log("No Telegram bot token configured");
      return new Response(
        JSON.stringify({ success: false, message: "Telegram not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details
    const { data: order } = await supabase
      .from("orders")
      .select("*, packages(*), profiles!orders_user_id_fkey(email)")
      .eq("id", orderId)
      .single();

    if (!order) {
      throw new Error("Order not found");
    }

    let message = "";
    let chatId = "";

    if (type === "new_order" && settings.admin_notifications_enabled) {
      chatId = settings.admin_chat_id;
      message = `🔔 *New Order*\n\n` +
        `Package: ${order.packages?.name || "N/A"}\n` +
        `Amount: $${order.amount}\n` +
        `Crypto: ${order.crypto_type}\n` +
        `Customer: ${order.profiles?.email || "Unknown"}\n` +
        `Status: ${order.status}\n\n` +
        `Order ID: ${orderId}`;
    } else if (type === "order_released" && settings.user_notifications_enabled) {
      // For user notifications, we'd need to store user's Telegram chat ID
      // This is a placeholder - you'd need to implement user Telegram linking
      console.log("User notification would be sent here");
      return new Response(
        JSON.stringify({ success: true, message: "User notifications not yet implemented" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chatId || !message) {
      return new Response(
        JSON.stringify({ success: false, message: "Notification not sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send Telegram message
    const telegramUrl = `https://api.telegram.org/bot${settings.bot_token}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const telegramResult = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      console.error("Telegram API error:", telegramResult);
      throw new Error("Failed to send Telegram message");
    }

    console.log("Notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
