// Deno is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Verify Razorpay webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload + secret)
  );
  const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignatureHex;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Razorpay webhook secret
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    // Get webhook signature from headers
    const signature = req.headers.get("X-Razorpay-Signature");
    const payload = await req.text();

    // Verify signature if webhook secret is set
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(payload, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(payload);

    // Get Supabase URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const eventType = event.event;
    const entity = event.payload?.subscription || event.payload?.payment || event.payload;

    console.log(`Processing webhook event: ${eventType}`, entity);

    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged":
        await handleSubscriptionActivated(supabaseClient, entity);
        break;

      case "payment.captured":
        await handlePaymentCaptured(supabaseClient, entity);
        break;

      case "subscription.halted":
      case "subscription.paused":
        await handleSubscriptionHalted(supabaseClient, entity);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(supabaseClient, entity);
        break;

      case "subscription.completed":
        await handleSubscriptionCompleted(supabaseClient, entity);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, event: eventType }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function handleSubscriptionActivated(
  supabaseClient: any,
  subscription: any
) {
  const subscriptionId = subscription.id;

  // Find subscription in database
  const { data: existingSub, error: findError } = await supabaseClient
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .single();

  if (findError && findError.code !== "PGRST116") {
    console.error("Error finding subscription:", findError);
    return;
  }

  const updateData: any = {
    status: "active",
    updated_at: new Date().toISOString(),
  };

  if (subscription.current_start && subscription.current_end) {
    updateData.current_period_start = new Date(
      subscription.current_start * 1000
    ).toISOString();
    updateData.current_period_end = new Date(
      subscription.current_end * 1000
    ).toISOString();
  }

  if (subscription.plan_id) {
    updateData.plan_id = subscription.plan_id;
  }

  if (existingSub) {
    await supabaseClient
      .from("subscriptions")
      .update(updateData)
      .eq("subscription_id", subscriptionId);
  } else {
    // Create new subscription record if not exists
    const userId = subscription.notes?.user_id;
    if (userId) {
      const planType = subscription.notes?.plan?.includes("basic")
        ? "basic"
        : subscription.notes?.plan?.includes("pro")
        ? "pro"
        : "enterprise";
      const isFounder = subscription.notes?.is_founder === "true";
      const seatsAllowed = planType === "pro" ? 5 : 1;

      await supabaseClient.from("subscriptions").insert({
        user_id: userId,
        subscription_id: subscriptionId,
        plan_id: subscription.plan_id,
        plan_type: planType,
        status: "active",
        is_founder: isFounder,
        seats_allowed: seatsAllowed,
        current_period_start: updateData.current_period_start,
        current_period_end: updateData.current_period_end,
        amount_paid: subscription.plan_amount ? subscription.plan_amount / 100 : 0,
        currency: subscription.plan_currency || "INR",
        metadata: { razorpay_subscription: subscription },
      });
    }
  }
}

async function handlePaymentCaptured(supabaseClient: any, payment: any) {
  const paymentId = payment.id;
  const orderId = payment.order_id;
  const subscriptionId = payment.subscription_id;

  // Update or create payment record
  const { data: existingPayment } = await supabaseClient
    .from("payments")
    .select("*")
    .eq("razorpay_payment_id", paymentId)
    .single();

  const paymentData = {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    amount: payment.amount / 100, // Convert paise to rupees
    currency: payment.currency,
    status: "completed",
    payment_method: payment.method,
    metadata: { razorpay_payment: payment },
    updated_at: new Date().toISOString(),
  };

  if (subscriptionId) {
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("id, user_id")
      .eq("subscription_id", subscriptionId)
      .single();

    if (subscription) {
      paymentData.subscription_id = subscription.id;
      paymentData.user_id = subscription.user_id;

      // Update subscription amount_paid
      await supabaseClient
        .from("subscriptions")
        .update({
          amount_paid: payment.amount / 100,
          updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", subscriptionId);
    }
  }

  if (existingPayment) {
    await supabaseClient
      .from("payments")
      .update(paymentData)
      .eq("razorpay_payment_id", paymentId);
  } else {
    await supabaseClient.from("payments").insert(paymentData);
  }
}

async function handleSubscriptionHalted(supabaseClient: any, subscription: any) {
  await supabaseClient
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", subscription.id);
}

async function handleSubscriptionCancelled(
  supabaseClient: any,
  subscription: any
) {
  await supabaseClient
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", subscription.id);
}

async function handleSubscriptionCompleted(
  supabaseClient: any,
  subscription: any
) {
  await supabaseClient
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", subscription.id);
}

