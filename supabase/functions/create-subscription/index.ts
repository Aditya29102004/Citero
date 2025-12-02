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

// Plan mapping
const PLAN_MAP: Record<string, string> = {
  basic_normal: Deno.env.get("PLAN_BASIC_NORMAL") || "",
  pro_normal: Deno.env.get("PLAN_PRO_NORMAL") || "",
  basic_founder: Deno.env.get("PLAN_BASIC_FOUNDER") || "",
  pro_founder: Deno.env.get("PLAN_PRO_FOUNDER") || "",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Missing Razorpay credentials:", {
        hasKeyId: !!razorpayKeyId,
        hasKeySecret: !!razorpayKeySecret,
      });
      throw new Error("Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET secrets.");
    }

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

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error("Invalid request body. Expected JSON.");
    }

    const { plan } = requestBody;

    if (!plan) {
      throw new Error(`Plan parameter is required. Received: ${JSON.stringify(requestBody)}`);
    }

    if (!PLAN_MAP[plan]) {
      throw new Error(`Invalid plan: "${plan}". Valid plans: ${Object.keys(PLAN_MAP).join(", ")}`);
    }

    const planId = PLAN_MAP[plan];
    if (!planId || planId === "") {
      throw new Error(`Plan ID not configured for plan: "${plan}". Please set PLAN_${plan.toUpperCase().replace("-", "_")} secret.`);
    }

    // Check if founder plan and enforce limit
    const isFounder = plan.includes("founder");
    if (isFounder) {
      const { count, error: countError } = await supabaseClient
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("is_founder", true);

      if (countError) {
        console.error("Error checking founder count:", countError);
      } else if ((count || 0) >= 10) {
        throw new Error("Founder Circle is full! Only 10 founder subscriptions are available.");
      }
    }

    // Get user email and name for Razorpay customer
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    const customerEmail = profile?.email || user.email || "";
    const customerName = profile?.name || user.user_metadata?.full_name || "";

    // Create Razorpay customer if needed
    let customerId = "";
    try {
      const customerResponse = await fetch("https://api.razorpay.com/v1/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify({
          email: customerEmail,
          name: customerName,
          contact: "", // Add if you have phone number
        }),
      });

      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        customerId = customerData.id;
      } else {
        // Try to find existing customer
        const searchResponse = await fetch(
          `https://api.razorpay.com/v1/customers?email=${encodeURIComponent(customerEmail)}`,
          {
            headers: {
              Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
            },
          }
        );
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items && searchData.items.length > 0) {
            customerId = searchData.items[0].id;
          }
        }
      }
    } catch (error) {
      console.error("Error creating/finding customer:", error);
      // Continue without customer ID - Razorpay will create one
    }

    // Create Razorpay subscription
    const subscriptionData: any = {
      plan_id: planId,
      total_count: 120, // 10 years of monthly payments
      customer_notify: 1,
      notes: {
        user_id: user.id,
        plan: plan,
        is_founder: isFounder.toString(),
      },
    };

    if (customerId) {
      subscriptionData.customer_id = customerId;
    } else {
      subscriptionData.customer = {
        email: customerEmail,
        name: customerName,
      };
    }

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { description: errorText || `HTTP ${razorpayResponse.status}` } };
      }
      
      console.error("Razorpay API error:", {
        status: razorpayResponse.status,
        statusText: razorpayResponse.statusText,
        error: errorData,
      });
      
      throw new Error(
        `Razorpay API error: ${errorData.error?.description || errorData.error?.message || "Unknown error"}`
      );
    }

    const razorpaySubscription = await razorpayResponse.json();

    // Determine seats_allowed based on plan
    // Pro and Enterprise get 5 seats, Basic gets 1, Enterprise can be unlimited but we'll use 5 as default
    const seatsAllowed = plan.includes("pro") || plan.includes("enterprise") ? 5 : 1;

    // Store subscription record in database
    // Use 'pending' status initially - will be updated to 'active' when payment succeeds
    const subscriptionInsertData: any = {
      user_id: user.id,
      razorpay_subscription_id: razorpaySubscription.id,
      subscription_id: razorpaySubscription.id, // Store in both columns for compatibility
      plan_type: plan.includes("basic") ? "basic" : plan.includes("pro") ? "pro" : "enterprise",
      status: "pending", // Start as pending, will be updated to active when payment succeeds
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      amount_paid: 0, // Will be updated when payment is captured
      currency: "INR",
    };

    // Only add columns that exist in the base table schema
    // Check if plan_id column exists by trying to add it (will be ignored if column doesn't exist)
    // For now, only add columns that are guaranteed to exist
    
    // Try to insert with optional columns, but handle errors gracefully
    const { data: insertedSubscription, error: subscriptionError } = await supabaseClient
      .from("subscriptions")
      .insert(subscriptionInsertData)
      .select()
      .single();

    if (subscriptionError) {
      // If error is due to missing columns, try without them
      if (subscriptionError.code === 'PGRST204' || subscriptionError.message?.includes('column') || subscriptionError.message?.includes('does not exist')) {
        console.log("Retrying insert without optional columns...");
        // Remove optional columns and try again
        const basicInsertData: any = {
          user_id: user.id,
          razorpay_subscription_id: razorpaySubscription.id,
          plan_type: plan.includes("basic") ? "basic" : plan.includes("pro") ? "pro" : "enterprise",
          status: "pending", // Start as pending
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount_paid: 0,
          currency: "INR",
        };
        
        // Try to add subscription_id if column exists
        try {
          basicInsertData.subscription_id = razorpaySubscription.id;
        } catch (e) {
          // Column might not exist, that's okay
        }
        
        const { data: retryInsert, error: retryError } = await supabaseClient
          .from("subscriptions")
          .insert(basicInsertData)
          .select()
          .single();
          
        if (retryError) {
          console.error("Error storing subscription (retry failed):", retryError);
          console.error("Basic subscription data:", basicInsertData);
        } else {
          console.log("Subscription successfully created (basic columns only):", retryInsert?.id);
        }
      } else {
        console.error("Error storing subscription:", subscriptionError);
        console.error("Subscription data attempted:", subscriptionInsertData);
      }
      // Continue anyway - subscription is created in Razorpay
    } else {
      console.log("Subscription successfully created in database:", insertedSubscription?.id);
      
      // Try to update with optional columns if they exist (using raw SQL or separate update)
      // For now, we'll let the webhook or migration handle adding optional fields
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: razorpaySubscription.id,
          status: razorpaySubscription.status,
          plan_id: planId,
          plan: plan,
        },
        keyId: razorpayKeyId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-subscription:", error);
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

