import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use OpenAI API key (same as run-geo-scan)
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
      const errorData = await response.json();
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

    const { brandSummary } = await req.json();

    if (!brandSummary) {
      throw new Error("brandSummary is required");
    }

    const prompt = `Based on this brand description:

${brandSummary}

Generate 12 categories this business should appear in on ChatGPT / AI Search. Each category must be short and clear (2-4 words max).

Return ONLY a JSON array of strings, no other text:
["Category 1", "Category 2", "Category 3", ...]`;

    console.log("Calling OpenAI API for topics generation...");
    let aiResponse: string;
    try {
      aiResponse = await callAI(prompt);
      console.log("OpenAI API response received, length:", aiResponse.length);
      console.log("Response preview:", aiResponse.substring(0, 200));
    } catch (error: any) {
      console.error("AI call failed:", error);
      console.error("Error details:", error.message, error.stack);
      // Return error instead of fallback so frontend knows generation failed
      return new Response(
        JSON.stringify({
          error: `Failed to generate topics: ${error.message || "OpenAI API error"}`,
          topics: [], // Empty array so frontend can handle gracefully
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 so frontend can handle gracefully
        }
      );
    }

    // Parse AI response
    let topics: string[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        // Try to extract topics from text
        const lines = aiResponse.split("\n").filter((line) => line.trim());
        topics = lines
          .map((line) => line.replace(/^[-•\d.]+\s*/, "").trim())
          .filter((line) => line.length > 0 && line.length < 50)
          .slice(0, 12);
      }
    } catch (parseError) {
      console.error("Failed to parse topics:", parseError);
      topics = [
        "Business Software",
        "Productivity Tools",
        "SaaS Platform",
        "Enterprise Solutions",
      ];
    }

    // Ensure we have at least some topics
    if (topics.length === 0) {
      topics = [
        "Business Software",
        "Productivity Tools",
        "SaaS Platform",
        "Enterprise Solutions",
      ];
    }

    return new Response(
      JSON.stringify({ topics: topics.slice(0, 12) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-topics:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate topics" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

