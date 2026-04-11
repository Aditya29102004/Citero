import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL environment variable is not set");
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    const isAdmin = profile.is_admin === true || profile.email === 'admin@citero.com';
    if (!isAdmin) {
      throw new Error("Admin privileges required");
    }

    // Fetch all users from profiles table using admin client (bypasses RLS)
    const { data: users, error: usersError } = await adminClient
      .from("profiles")
      .select("id, email, name, created_at, is_admin")
      .order("created_at", { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Return all users
    return new Response(
      JSON.stringify({
        success: true,
        users: users || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in fetch-all-users:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

