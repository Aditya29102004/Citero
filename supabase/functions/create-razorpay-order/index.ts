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

interface PlanConfig {
  amount: number;
  name: string;
  description: string;
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  basic: {
    amount: 9900, // ₹99 in paise
    name: "Basic Plan",
    description: "50 AI prompt scans/month, 3 competitor comparisons, 5 top source insights",
  },
  pro: {
    amount: 24900, // ₹249 in paise
    name: "Pro Plan",
    description: "200 AI scans/month, 10 competitor benchmarks, Advanced GEO insights",
  },
  enterprise: {
    amount: 49900, // ₹499 in paise (minimum)
    name: "Enterprise Plan",
    description: "Unlimited scans, Dedicated GEO specialist, Custom sources",
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Razorpay credentials from environment
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
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
    const { planType } = await req.json();

    if (!planType || !PLAN_CONFIGS[planType]) {
      throw new Error("Invalid plan type");
    }

    const planConfig = PLAN_CONFIGS[planType];

    // Create Razorpay order
    const orderData = {
      amount: planConfig.amount,
      currency: "INR",
      receipt: `order_${user.id}_${Date.now()}`,
      notes: {
        user_id: user.id,
        plan_type: planType,
        plan_name: planConfig.name,
      },
    };

    // Create order via Razorpay API
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      throw new Error(
        `Razorpay API error: ${errorData.error?.description || "Unknown error"}`
      );
    }

    const razorpayOrder = await razorpayResponse.json();

    // Store payment record in database
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        user_id: user.id,
        razorpay_order_id: razorpayOrder.id,
        amount: planConfig.amount / 100, // Convert paise to rupees
        currency: "INR",
        status: "pending",
        plan_type: planType,
        metadata: {
          razorpay_order: razorpayOrder,
        },
      });

    if (paymentError) {
      console.error("Error storing payment:", paymentError);
      // Continue anyway - order is created in Razorpay
    }

    return new Response(
      JSON.stringify({
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayKeyId,
        planType,
        planConfig,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-razorpay-order:", error);
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

