// Deno is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Razorpay credentials from environment
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get Supabase URL and service role key (auto-provided by Supabase Edge Functions)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase credentials:", {
        hasUrl: !!supabaseUrl,
        hasServiceRoleKey: !!supabaseServiceRoleKey,
      });
      throw new Error("Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    }

    // Create Supabase client with service role key for database operations
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error("Missing payment verification data");
    }

    // Verify signature using Web Crypto API
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(razorpayKeySecret);
    const message = encoder.encode(text);

    const key = await crypto.subtle.importKey(
      "raw",
      secretKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, message);
    const hashArray = Array.from(new Uint8Array(signature));
    const generatedSignature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Fetch payment details from Razorpay
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      throw new Error("Failed to fetch payment details from Razorpay");
    }

    const paymentData = await paymentResponse.json();

    if (paymentData.status !== "captured" && paymentData.status !== "authorized") {
      throw new Error(`Payment not successful. Status: ${paymentData.status}`);
    }

    // Find the payment record
    const { data: paymentRecord, error: paymentFetchError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (paymentFetchError || !paymentRecord) {
      throw new Error("Payment record not found");
    }

    // Update payment status
    const { error: updatePaymentError } = await supabaseClient
      .from("payments")
      .update({
        razorpay_payment_id: razorpay_payment_id,
        status: "completed",
        payment_method: paymentData.method,
        metadata: {
          ...paymentRecord.metadata,
          razorpay_payment: paymentData,
          verified_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRecord.id);

    if (updatePaymentError) {
      throw new Error(`Failed to update payment: ${updatePaymentError.message}`);
    }

    // Cancel any existing active subscriptions for this user
    await supabaseClient
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    // Create or update subscription
    const planType = paymentRecord.plan_type;
    const amountPaid = paymentRecord.amount;
    
    // Calculate period end (30 days from now)
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type: planType,
        status: "active",
        razorpay_order_id: razorpay_order_id,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount_paid: amountPaid,
        currency: "INR",
      })
      .select()
      .single();

    if (subscriptionError) {
      throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
    }

    // Update payment with subscription_id
    await supabaseClient
      .from("payments")
      .update({ subscription_id: subscription.id })
      .eq("id", paymentRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        subscription: subscription,
        payment: {
          id: paymentRecord.id,
          status: "completed",
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

