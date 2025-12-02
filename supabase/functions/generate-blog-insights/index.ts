import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

async function callAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in Edge Function secrets");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error (${response.status}):`, errorText);
    
    let errorMessage = "Unknown error";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || JSON.stringify(errorData);
    } catch {
      errorMessage = errorText.slice(0, 200);
    }
    
    throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

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

    const { blogId, content, title } = await req.json();

    if (!blogId) {
      return new Response(
        JSON.stringify({ error: "blogId is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch blog data
    const { data: blog, error: blogError } = await supabaseClient
      .from("blogs")
      .select("id, title, content, topic, brand_id, user_id")
      .eq("id", blogId)
      .eq("user_id", user.id)
      .single();

    if (blogError || !blog) {
      console.error("Blog fetch error:", blogError);
      return new Response(
        JSON.stringify({ error: "Blog not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Fetch brand data separately
    let topics: string[] = [];
    let competitors: any[] = [];
    let brandName = "";

    if (blog.brand_id) {
      const { data: brand, error: brandError } = await supabaseClient
        .from("brands")
        .select("topics, competitors, name")
        .eq("id", blog.brand_id)
        .eq("user_id", user.id)
        .single();

      if (!brandError && brand) {
        topics = (brand.topics as string[]) || [];
        competitors = Array.isArray(brand.competitors) ? brand.competitors : [];
        brandName = brand.name || "";
      }
    }

    // Generate insights
    const blogTitle = title || blog.title || "";
    const blogContent = (content || blog.content || "").substring(0, 1000);
    const blogTopic = blog.topic || "";
    const topicsStr = topics.length > 0 ? topics.join(", ") : "General";
    const competitorsStr = competitors.length > 0 
      ? competitors.map((c: any) => (typeof c === 'string' ? c : (c?.name || ''))).filter(Boolean).join(", ")
      : "None";

    const prompt = `Analyze this blog post and provide insights:

Title: ${blogTitle}
Content: ${blogContent}
Topic: ${blogTopic}
Brand Topics: ${topicsStr}
Competitors: ${competitorsStr}

Provide insights in JSON format:
{
  "visibilityScoreImprovement": <estimated percentage boost as number>,
  "topicsReinforced": [<array of topic strings>],
  "competitorsOutranked": [<array of competitor name strings>],
  "sourcesAligned": [<array of source domain strings>],
  "sentimentInfluence": "<positive|neutral|negative>"
}

Return ONLY valid JSON, no other text.`;

    const aiResponse = await callAI(prompt);
    
    // Parse JSON from response
    let insights: any = {};
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback insights
      insights = {
        visibilityScoreImprovement: 5,
        topicsReinforced: topics.slice(0, 3),
        competitorsOutranked: [],
        sourcesAligned: [],
        sentimentInfluence: "positive",
      };
    }

    return new Response(
      JSON.stringify({ insights }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate insights" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

