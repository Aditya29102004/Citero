import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      websiteUrl,
      summary,
      industry,
      audience,
      topics,
      competitors,
    } = await req.json();

    if (!websiteUrl || !summary) {
      throw new Error("websiteUrl and summary are required");
    }

    // Check if user already has a brand (prevent duplicate onboarding)
    const { data: existingBrands } = await supabaseClient
      .from("brands")
      .select("id, onboarding_completed, topics, competitors")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingBrands && existingBrands.length > 0) {
      const existingBrand = existingBrands[0];
      
      // Check if onboarding is already completed
      if (existingBrand.onboarding_completed === true) {
        return new Response(
          JSON.stringify({ 
            error: "You have already completed onboarding. Each email can only complete onboarding once." 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Check if brand has onboarding data (topics or competitors)
      const hasOnboardingData = 
        (existingBrand.topics && Array.isArray(existingBrand.topics) && existingBrand.topics.length > 0) ||
        (existingBrand.competitors && (Array.isArray(existingBrand.competitors) || typeof existingBrand.competitors === 'object'));

      if (hasOnboardingData) {
        return new Response(
          JSON.stringify({ 
            error: "You have already completed onboarding. Each email can only complete onboarding once." 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Extract brand name from URL or summary
    const brandName = websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(".")[0]
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim() || "My Brand";

    // Create brand record with all onboarding data
    const brandData: any = {
      user_id: user.id,
      name: brandName,
      website_url: websiteUrl,
      description: summary,
      aliases: topics?.join(", ") || null,
    };

    // Add optional fields if they exist in the schema
    if (industry) brandData.industry = industry;
    if (audience) brandData.audience = audience;
    if (topics && topics.length > 0) brandData.topics = topics;
    if (competitors && competitors.length > 0) {
      brandData.competitors = competitors;
      // Also save to primary_competitors as TEXT[] array (extract names)
      const competitorNames = competitors.map((c: any) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && c.name) return c.name;
        return '';
      }).filter((name: string) => name && name.length > 0);
      if (competitorNames.length > 0) {
        brandData.primary_competitors = competitorNames;
      }
    }
    
    // Always set onboarding_completed to true when saving onboarding data
    brandData.onboarding_completed = true;
    
    console.log("Creating brand with data:", {
      user_id: user.id,
      name: brandName,
      website_url: websiteUrl,
      onboarding_completed: true,
      has_industry: !!industry,
      has_audience: !!audience,
      topics_count: topics?.length || 0,
      competitors_count: competitors?.length || 0,
    });

    const { data: brand, error: brandError } = await supabaseClient
      .from("brands")
      .insert(brandData)
      .select()
      .single();

    if (brandError) {
      console.error("Error creating brand:", brandError);
      // Try without optional fields if they don't exist
      if (brandError.code === 'PGRST204' || brandError.message?.includes('column')) {
        const basicBrandData: any = {
          user_id: user.id,
          name: brandName,
          website_url: websiteUrl,
          description: summary,
          aliases: topics?.join(", ") || null,
        };
        
        // Try to set onboarding_completed if column exists
        try {
          basicBrandData.onboarding_completed = true;
        } catch {
          // Column might not exist, that's okay
        }
        
        console.log("Retrying with basic brand data (fallback):", {
          user_id: user.id,
          name: brandName,
          onboarding_completed: basicBrandData.onboarding_completed,
        });
        
        const { data: retryBrand, error: retryError } = await supabaseClient
          .from("brands")
          .insert(basicBrandData)
          .select()
          .single();
        
        if (retryError) {
          throw new Error(`Failed to create brand: ${retryError.message}`);
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            brandId: retryBrand.id,
            message: "Brand created successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      throw new Error(`Failed to create brand: ${brandError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        brandId: brand.id,
        message: "Brand created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in save-onboarding:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save onboarding data" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

