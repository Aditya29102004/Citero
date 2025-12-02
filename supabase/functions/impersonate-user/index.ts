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

    const isAdmin = profile.is_admin === true || profile.email === 'admin@unifr.com';
    if (!isAdmin) {
      throw new Error("Admin privileges required");
    }

    // Get target user ID from request
    const { targetUserId } = await req.json();
    if (!targetUserId) {
      throw new Error("targetUserId is required");
    }

    // Get target user info
    const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(targetUserId);
    
    if (targetUserError || !targetUser.user) {
      throw new Error("Target user not found");
    }

    // Get the origin from the request
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:5173';
    const baseUrl = origin.split('/').slice(0, 3).join('/'); // Extract protocol + domain
    
    // Generate a magic link for the target user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email || '',
      options: {
        redirectTo: `${baseUrl}/dashboard`,
      },
    });

    if (linkError) {
      throw new Error(`Failed to generate link: ${linkError.message}`);
    }

    // Return the magic link and user info
    return new Response(
      JSON.stringify({
        success: true,
        magicLink: linkData.properties?.action_link || null,
        user: {
          id: targetUser.user.id,
          email: targetUser.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in impersonate-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

