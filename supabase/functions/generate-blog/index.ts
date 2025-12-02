import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Keys - Support Gemini (preferred) and OpenAI (fallback)
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Cache for selected Gemini model
let cachedGeminiModel: string | null = null;

async function testModelAvailability(modelName: string): Promise<boolean> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "test" }] }],
      }),
    });
    return response.ok || response.status === 400;
  } catch {
    return false;
  }
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set");
  }

  // Use cached model if available
  if (cachedGeminiModel) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cachedGeminiModel}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`Gemini error: ${errorMessage}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!result) {
      throw new Error("Gemini error: Model returned empty result");
    }

    return result;
  }

  // Test model availability
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-2.5-pro",
  ];

  const availabilityTests = await Promise.all(
    modelsToTry.map(async (model) => ({
      model,
      available: await testModelAvailability(model),
    }))
  );

  const selectedModel = availabilityTests.find((test) => test.available)?.model || modelsToTry[0];
  cachedGeminiModel = selectedModel;
  console.log(`Using Gemini model: ${cachedGeminiModel}`);

  // Use the selected model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cachedGeminiModel}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`Gemini error: ${errorMessage}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!result) {
    throw new Error("Gemini error: Model returned empty result");
  }

  return result;
}

async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
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
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON
    }
    const errorMsg = errorData.error?.message || errorData.message || errorText.slice(0, 200);
    throw new Error(`OpenAI API error: ${response.status} - ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAI(prompt: string): Promise<string> {
  // Try Gemini first (preferred), fallback to OpenAI
  if (GEMINI_API_KEY) {
    try {
      console.log("Attempting to use Gemini API...");
      return await callGemini(prompt);
    } catch (geminiError: any) {
      console.warn("Gemini API failed, falling back to OpenAI:", geminiError.message);
      if (OPENAI_API_KEY) {
        console.log("Using OpenAI API as fallback...");
        return await callOpenAI(prompt);
      }
      throw new Error(`Gemini failed and OpenAI not available: ${geminiError.message}`);
    }
  } else if (OPENAI_API_KEY) {
    console.log("Using OpenAI API (Gemini not configured)...");
    return await callOpenAI(prompt);
  } else {
    throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured");
  }
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

    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      return new Response(
        JSON.stringify({ error: `Invalid request body format: ${parseError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { brandId, topic, blogGoal, competitorFocus, tone } = requestBody;

    if (!brandId || !topic) {
      return new Response(
        JSON.stringify({ error: "brandId and topic are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch brand data
    const { data: brand, error: brandError } = await supabaseClient
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return new Response(
        JSON.stringify({ error: "Brand not found or access denied" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch recent scan responses for context
    const { data: sources } = await supabaseClient
      .from("scan_responses")
      .select("ai_response")
      .eq("brand_id", brandId)
      .limit(50);

    const sourceUrls = new Set<string>();
    sources?.forEach((s) => {
      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      const urls = s.ai_response?.match(urlRegex) || [];
      urls.forEach((url) => sourceUrls.add(url));
    });

    const topSources = Array.from(sourceUrls).slice(0, 10).join(", ");

    // Fetch topics
    const topics = Array.isArray(brand.topics) ? brand.topics : (brand.topics ? [brand.topics] : []);

    // Fetch competitors
    let competitors: any[] = [];
    if (brand.primary_competitors && Array.isArray(brand.primary_competitors)) {
      competitors = brand.primary_competitors.map((c: any) => typeof c === 'string' ? c : (c?.name || c));
    } else if (brand.competitors) {
      try {
        if (Array.isArray(brand.competitors)) {
          competitors = brand.competitors.map((c: any) => typeof c === 'string' ? c : (c?.name || c));
        } else if (typeof brand.competitors === 'string') {
          const parsed = JSON.parse(brand.competitors);
          competitors = Array.isArray(parsed) ? parsed.map((c: any) => typeof c === 'string' ? c : (c?.name || c)) : [];
        }
      } catch {
        competitors = [];
      }
    }

    // Build context
    const goalDescriptions: Record<string, string> = {
      increase_visibility: "Increase brand visibility in AI search results",
      fix_sentiment: "Fix negative sentiment issues and improve brand perception",
      compete_rival: `Compete with and outrank competitor: ${competitorFocus || "specified competitor"}`,
      rank_topic: `Rank highly for the topic: ${topic}`,
    };

    const toneDescriptions: Record<string, string> = {
      professional: "professional, authoritative, and trustworthy",
      friendly: "friendly, approachable, and conversational",
      expert: "expert, technical, and detailed",
      founder: "founder-style, personal, authentic, and story-driven",
    };

    const brandDescription = brand.description || (brand as any).summary || "No description available";

    // Generate SEO keywords first
    console.log("Generating SEO keywords...");
    const keywordsPrompt = `Generate a comprehensive list of 30-50 SEO-optimized keywords and key phrases for a blog post about "${topic}" for the brand ${brand.name}.

Brand Description: ${brandDescription}
Topic Focus: ${topic}
Blog Goal: ${goalDescriptions[blogGoal] || "Increase visibility"}
Tone: ${toneDescriptions[tone] || "professional"}
Topics: ${topics.join(", ") || "General industry topics"}
Competitors: ${competitors.join(", ") || "No specific competitors"}
Top Sources: ${topSources || "Various authoritative sources"}

Requirements:
- Generate 30-50 relevant keywords
- Include primary keywords (1-3 words)
- Include long-tail keywords (4-6 words)
- Include question-based keywords (how, what, why, when, where)
- Include comparison keywords (vs, alternative, best, top)
- Focus on keywords that AI search engines would use
- Prioritize keywords that competitors are ranking for

Return ONLY a JSON array of keyword strings, no other text. Format: ["keyword1", "keyword2", ...]`;

    let keywords: string[] = [];
    try {
      const keywordsResponse = await callAI(keywordsPrompt);
      const jsonMatch = keywordsResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keywords = JSON.parse(jsonMatch[0]);
      } else {
        keywords = keywordsResponse
          .split(/[\n,]/)
          .map(k => k.trim().replace(/^["'-]|["'-]$/g, ''))
          .filter(k => k.length > 0)
          .slice(0, 50);
      }
    } catch (error) {
      console.warn("Failed to generate keywords, using fallback:", error);
      keywords = [
        topic,
        brand.name,
        ...topics.slice(0, 5),
        `${topic} guide`,
        `best ${topic}`,
        `how to ${topic}`,
        `${topic} tips`,
        `${topic} strategies`,
      ].filter(Boolean).slice(0, 30);
    }

    // Generate full blog content
    console.log("Generating blog content...");
    const blogPrompt = `Write a comprehensive, SEO-optimized blog post about "${topic}" for ${brand.name}.

Brand Information:
- Name: ${brand.name}
- Description: ${brandDescription}
- Topics: ${topics.join(", ") || "General industry topics"}
- Competitors: ${competitors.join(", ") || "None specified"}

Blog Requirements:
- Topic: ${topic}
- Goal: ${goalDescriptions[blogGoal] || "Increase visibility"}
- Tone: ${toneDescriptions[tone] || "professional"}
- Target Keywords: ${keywords.slice(0, 20).join(", ")}

Content Guidelines:
1. Write a complete, well-structured blog post (1500-2500 words)
2. Use markdown formatting with proper headings (##, ###)
3. Include an engaging introduction that hooks the reader
4. Create 4-6 main sections with clear headings
5. Use the target keywords naturally throughout the content
6. Include practical examples, tips, or actionable insights
7. Reference authoritative sources when relevant: ${topSources || "industry best practices"}
8. Write a compelling conclusion that reinforces key points
9. Make it valuable and informative, not just keyword-stuffed
10. Match the specified tone: ${toneDescriptions[tone] || "professional"}

${competitorFocus ? `Competitive Focus: Address how ${brand.name} compares to or differs from ${competitorFocus}.` : ""}

Return ONLY the blog post content in markdown format. Do not include any meta information, explanations, or notes. Start directly with the title as # Title.`;

    const blogContent = await callAI(blogPrompt);

    // Extract title from content (first # heading)
    let title = `${topic} - ${brand.name}`;
    const titleMatch = blogContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Calculate word count
    const wordCount = blogContent.split(/\s+/).filter((word) => word.length > 0).length;

    // Save blog
    const { data: blog, error: insertError } = await supabaseClient
      .from("blogs")
      .insert({
        brand_id: brandId,
        user_id: user.id,
        title: title.substring(0, 200),
        content: blogContent,
        status: "draft",
        topic,
        ai_provider: "gemini", // Default to gemini, no user selection
        word_count: wordCount,
        blog_goal: blogGoal,
        tone,
        competitor_focus: competitorFocus || null,
        seo_keywords: keywords,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting blog:", insertError);
      return new Response(
        JSON.stringify({ error: `Failed to save blog: ${insertError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        blogId: blog.id,
        blog,
        keywords: keywords,
        message: `Generated blog post with ${wordCount} words and ${keywords.length} SEO keywords`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating blog:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate blog",
        details: error.stack || "No additional details",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
