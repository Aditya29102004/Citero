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
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get Supabase URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // Extract token from Authorization header (remove "Bearer " prefix if present)
    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Parse request body (Razorpay subscription payment response)
    let response: any;
    try {
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        console.warn("Empty request body, trying to parse as JSON anyway");
        response = {};
      } else {
        response = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      // Try to get it as JSON directly
      try {
        response = await req.json();
      } catch (jsonError) {
        console.error("Error parsing as JSON:", jsonError);
        response = {};
      }
    }
    
    console.log("Full Razorpay payment success response:", JSON.stringify(response, null, 2));
    console.log("Response keys:", Object.keys(response || {}));
    
    // Razorpay subscription payment success handler sends:
    // { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
    // But it might also be nested or have different structure
    const razorpaySubscriptionId = 
      response.razorpay_subscription_id || 
      response.subscription_id || 
      response.subscription?.id ||
      response.subscription_id ||
      (response.razorpay && response.razorpay.subscription_id) ||
      (response.payment && response.payment.subscription_id);
    
    console.log("Extracted razorpay_subscription_id:", razorpaySubscriptionId);
    console.log("Checking response.razorpay_subscription_id:", response.razorpay_subscription_id);
    console.log("Checking response.subscription_id:", response.subscription_id);

    // If no subscription ID in response, try to find the most recent pending subscription for this user
    if (!razorpaySubscriptionId) {
      console.error("No subscription ID found in response. Full response:", JSON.stringify(response, null, 2));
      console.log("Attempting fallback: finding most recent pending/active subscription for user:", user.id);
      
      // First try to find a pending subscription (most likely to be the one just created)
      let { data: recentSub, error: recentError } = await supabaseClient
        .from("subscriptions")
        .select("id, status, subscription_id, razorpay_subscription_id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // If no pending, try active
      if (!recentSub) {
        const { data: activeSub } = await supabaseClient
          .from("subscriptions")
          .select("id, status, subscription_id, razorpay_subscription_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (activeSub) {
          recentSub = activeSub;
        }
      }
      
      // If still nothing, get the most recent subscription regardless of status
      if (!recentSub) {
        const { data: anySub } = await supabaseClient
          .from("subscriptions")
          .select("id, status, subscription_id, razorpay_subscription_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (anySub) {
          recentSub = anySub;
        }
      }
      
      if (recentSub) {
        console.log("Found recent subscription as fallback:", recentSub);
        const updateData: any = {
          status: "active",
          updated_at: new Date().toISOString(),
        };
        
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update(updateData)
          .eq("id", recentSub.id);
        
        if (updateError) {
          console.error("Error updating subscription:", updateError);
          throw new Error(`Failed to update subscription: ${updateError.message}`);
        }
        
        console.log("Successfully updated subscription to active via fallback method");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription activated successfully (fallback method)",
            subscription_id: recentSub.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      throw new Error("Subscription ID missing from Razorpay response and no recent subscription found for user");
    }

    console.log("Looking for subscription with razorpay_subscription_id:", razorpaySubscriptionId, "user_id:", user.id);

    // Find subscription by razorpay_subscription_id (primary method)
    let { data: existingSub, error: findError } = await supabaseClient
      .from("subscriptions")
      .select("id, status, subscription_id, razorpay_subscription_id")
      .eq("razorpay_subscription_id", razorpaySubscriptionId)
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("First lookup result (by razorpay_subscription_id):", { existingSub, findError });

    // If not found, try subscription_id column (if migration added it)
    if (!existingSub && (!findError || findError.code === 'PGRST116')) {
      const { data: subBySubscriptionId, error: subscriptionIdError } = await supabaseClient
        .from("subscriptions")
        .select("id, status, subscription_id, razorpay_subscription_id")
        .eq("subscription_id", razorpaySubscriptionId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      console.log("Second lookup result (by subscription_id):", { subBySubscriptionId, subscriptionIdError });
      
      if (subBySubscriptionId) {
        existingSub = subBySubscriptionId;
      }
    }

    // Fetch subscription details from Razorpay to get accurate period dates
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
    
    let updateData: any = {
      status: "active",
      updated_at: new Date().toISOString(),
    };

    // Fetch subscription details from Razorpay API
    if (razorpayKeyId && razorpayKeySecret && razorpaySubscriptionId) {
      try {
        const razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
            },
          }
        );

        if (razorpayResponse.ok) {
          const razorpaySub = await razorpayResponse.json();
          console.log("Fetched Razorpay subscription details:", razorpaySub);
          
          // Update period dates from Razorpay
          if (razorpaySub.current_start && razorpaySub.current_end) {
            updateData.current_period_start = new Date(
              razorpaySub.current_start * 1000
            ).toISOString();
            updateData.current_period_end = new Date(
              razorpaySub.current_end * 1000
            ).toISOString();
          }
          
          // Update plan_id if available
          if (razorpaySub.plan_id) {
            updateData.plan_id = razorpaySub.plan_id;
          }
          
          // Update amount_paid if available
          if (razorpaySub.plan_amount) {
            updateData.amount_paid = razorpaySub.plan_amount / 100; // Convert from paise to rupees
          }
        } else {
          console.warn("Could not fetch Razorpay subscription details, using defaults");
        }
      } catch (fetchError) {
        console.warn("Error fetching Razorpay subscription:", fetchError);
        // Continue with basic update even if Razorpay fetch fails
      }
    }

    // Update subscription status to active
    if (existingSub) {
      console.log("Found subscription, updating to active:", existingSub.id);
      console.log("Update data:", updateData);
      
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update(updateData)
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      
      console.log("Subscription updated to active:", existingSub.id);
    } else {
      console.error("Subscription not found for subscription_id:", subscriptionId, "user_id:", user.id);
      // Don't throw error - subscription might be created by webhook
      // Just log and return success
      console.warn("Subscription record not found in database. It may be created via webhook or needs manual activation.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment successful. Subscription will be activated shortly.",
          warning: "Subscription record not found - may be created by webhook",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription activated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in subscription-success:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

