import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

async function callOpenAI(prompt: string, systemPrompt: string = ""): Promise<string> {
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
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
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
  return data.choices?.[0]?.message?.content || "{}";
}

const CATEGORY_PROMPTS: Record<string, string> = {
  website_readability: `Analyze the website content for readability and clarity. Evaluate:
- Sentence length and complexity
- Use of jargon or technical terms
- Clarity of value propositions
- Overall readability score

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (unclear messaging, complex sentences, etc.)
- recommendations: array of strings (specific fixes)`,

  metadata_analysis: `Analyze the website metadata (title, description, keywords). Evaluate:
- SEO optimization
- Meta description quality
- Title tag effectiveness
- Missing metadata

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (missing meta tags, poor descriptions, etc.)
- recommendations: array of strings (specific improvements)`,

  brand_positioning_consistency: `Analyze brand positioning consistency across the website. Evaluate:
- Consistent messaging
- Value proposition clarity
- Tone consistency
- Brand voice alignment

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (inconsistent messaging, unclear positioning, etc.)
- recommendations: array of strings (specific fixes)`,

  llm_sentiment_alignment: `Analyze how AI models would perceive this brand based on the content. Evaluate:
- Sentiment indicators
- Trust signals
- Authority markers
- AI-friendly content structure

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (negative sentiment cues, missing trust signals, etc.)
- recommendations: array of strings (specific improvements)`,

  competitor_differentiation: `Compare this brand against competitors. Evaluate:
- Unique value propositions
- Differentiation points
- Competitive advantages
- Market positioning
- How well the brand stands out from competitors

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (lack of differentiation, generic messaging, etc.)
- recommendations: array of strings (specific differentiators to highlight)
- details: object with competitor_analysis (how brand compares to each competitor)`,

  source_authority: `Analyze source authority and credibility signals. Evaluate:
- Backlinks and citations
- Author credentials
- Content depth
- Trust indicators

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (missing credentials, shallow content, etc.)
- recommendations: array of strings (specific authority-building actions)`,

  ai_product_understanding: `Analyze how AI models would understand this product/brand. Evaluate:
- Product description clarity
- Use case identification
- Target audience clarity
- Feature-benefit mapping

Return a JSON object with:
- score: number (0-100)
- issues: array of strings (unclear product description, missing use cases, etc.)
- recommendations: array of strings (specific improvements for AI understanding)`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Check audit limit before processing
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get user's subscription
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", user.id)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription || subscription.status !== "active") {
      return new Response(
        JSON.stringify({ error: "No active subscription. Please subscribe to run audits." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Get audit limit based on plan
    const planType = subscription.plan_type as 'basic' | 'pro' | 'enterprise';
    let auditLimit = 5; // Default limit
    if (planType === 'enterprise') {
      auditLimit = Infinity;
    }

    // Check current month's audit usage
    if (auditLimit !== Infinity) {
      const { data: audits } = await supabaseClient
        .from("audits")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      if (audits) {
        // Count unique audit runs by grouping by date
        const auditDates = new Set<string>();
        audits.forEach(audit => {
          const date = new Date(audit.created_at).toISOString().split('T')[0];
          auditDates.add(date);
        });

        if (auditDates.size >= auditLimit) {
          return new Response(
            JSON.stringify({ 
              error: `You've reached your monthly audit limit (${auditLimit} audits/month). Please wait until next month or upgrade to Enterprise for unlimited audits.` 
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 403,
            }
          );
        }
      }
    }

    // Parse request body with error handling
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim().length > 0) {
        requestBody = JSON.parse(bodyText);
      } else {
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { category, brandText, brandName, competitors, topics, websiteUrl } = requestBody;

    if (!category || !brandText || !brandName) {
      throw new Error("category, brandText, and brandName are required");
    }

    if (!CATEGORY_PROMPTS[category]) {
      throw new Error(`Invalid category: ${category}`);
    }

    const prompt = `${CATEGORY_PROMPTS[category]}

Brand Information:
- Name: ${brandName}
${websiteUrl ? `- Website: ${websiteUrl}` : ""}
${competitors && competitors.length > 0 ? `- Competitors: ${competitors.join(", ")}` : ""}
${topics && topics.length > 0 ? `- Topics/Categories: ${topics.join(", ")}` : ""}

Website Content:
${brandText.substring(0, 4000)}

${category === "competitor_differentiation" && competitors && competitors.length > 0
  ? `\nIMPORTANT: Compare ${brandName} specifically against these competitors: ${competitors.join(", ")}. Analyze how ${brandName} differentiates itself and what unique value it provides.`
  : ""}

Analyze and provide your assessment. Be thorough and specific.`;

    const systemPrompt = "You are an expert brand analyst specializing in AI visibility and marketing. Provide detailed, actionable insights.";

    const content = await callOpenAI(prompt, systemPrompt);

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    // Validate and normalize result
    const score = Math.max(0, Math.min(100, Number(result.score) || 0));
    const issues = Array.isArray(result.issues) ? result.issues : [];
    const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];

    return new Response(
      JSON.stringify({
        category,
        score: Math.round(score * 100) / 100,
        issues: issues.filter((i: any) => typeof i === "string"),
        recommendations: recommendations.filter((r: any) => typeof r === "string"),
        details: result.details || {},
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error running audit:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to run audit" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

