import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use OpenAI API key (same as run-geo-scan)
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

// Import competitor cleaning utilities
const STOPWORDS = new Set([
  "for", "this", "that", "the", "its", "it's", "their", "they", "them", "these", "those",
  "other", "some", "while", "recently", "however", "october", "november", "december",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "india", "know", "your", "brand", "platforms", "startup", "startups", "founders",
  "companies", "ecosystem", "also", "including", "such", "like", "similar", "alternatives",
  "competitors", "competitor", "and", "or", "but", "with", "from", "into", "onto", "upon"
]);

const FALLBACK_COMPETITORS = [
  "AngelList",
  "Startup India",
  "YourStory",
  "LetsVenture",
  "F6S"
];

function cleanCompetitors(rawList: any): string[] {
  let competitors: string[] = [];
  
  if (Array.isArray(rawList)) {
    competitors = rawList;
  } else if (typeof rawList === 'string') {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        competitors = parsed;
      } else if (parsed.competitors && Array.isArray(parsed.competitors)) {
        competitors = parsed.competitors;
      } else {
        return [];
      }
    } catch {
      competitors = rawList.split(',').map((s: string) => s.trim());
    }
  } else if (rawList && typeof rawList === 'object' && rawList.competitors) {
    competitors = Array.isArray(rawList.competitors) ? rawList.competitors : [];
  } else {
    return [];
  }

  const cleaned = competitors
    .map((name: any) => {
      let competitorName = typeof name === 'string' ? name : (name?.name || name?.title || String(name));
      if (!competitorName || typeof competitorName !== 'string') return null;
      return competitorName.trim();
    })
    .filter((name: string | null): name is string => {
      if (!name) return false;
      if (name.length < 3) return false;
      if (/^\d+$/.test(name)) return false;
      const lowerName = name.toLowerCase().trim();
      if (STOPWORDS.has(lowerName)) return false;
      if (/[^\w\s-]/.test(name)) return false;
      if (name === lowerName && STOPWORDS.has(lowerName)) return false;
      const commonNonBrands = ['some', 'many', 'several', 'various', 'different', 'multiple'];
      if (commonNonBrands.includes(lowerName)) return false;
      if (name.split(/\s+/).length === 1 && name.length < 4) return false;
      return true;
    })
    .map((name: string) => {
      return name
        .split(/\s+/)
        .map(word => {
          if (word.length === 0) return word;
          if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    })
    .filter((name: string, index: number, self: string[]) => {
      return self.findIndex(n => n.toLowerCase() === name.toLowerCase()) === index;
    })
    .slice(0, 10);

  return cleaned;
}

function isValidCompetitorList(competitors: string[]): boolean {
  return competitors.length > 0 && competitors.every(name => {
    const lowerName = name.toLowerCase().trim();
    return name.length >= 3 && 
           !STOPWORDS.has(lowerName) && 
           !/^\d+$/.test(name) &&
           !/[^\w\s-]/.test(name);
  });
}

async function callAI(prompt: string, provider: string = "openai"): Promise<string> {
  if (provider === "openai") {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in Edge Function secrets");
    }

    console.log("Calling OpenAI API...");
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`AI response received, length: ${content.length}`);
    return content;
  }
  
  // Add other providers here if needed
  throw new Error(`Provider ${provider} not supported`);
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

    // ROBUST PROMPT: Extract ONLY real competitor brands
    const prompt = `You are an AI Research Analyst. Given a brand description, identify ONLY real competitor brands in the same category. Do NOT output:
- common words (this, these, however, for, its, they)
- unrelated startup names
- fundraising platforms (unless directly competing)
- adjectives
- countries
- cities
- irrelevant big tech unless directly competing

Output a clean JSON list of ONLY competitor brand names.

Rules:
- Must be real brands or platforms
- Must be in the same industry niche
- Max 10 competitors
- Deduplicate aggressively
- Keep ONLY competitors that appear in at least 2 independent answers (if analyzing multiple responses)

Brand Description:
${brandSummary}

Return format (JSON object):
{
  "competitors": ["BrandName1", "BrandName2", "BrandName3"]
}

Return ONLY the JSON object, no other text.`;

    console.log("Calling OpenAI API for competitors generation...");
    console.log("Brand summary length:", brandSummary?.length || 0);
    
    // Try multiple providers if first attempt fails
    const providers = ["openai"]; // Add more providers here if needed
    let cleanedCompetitors: string[] = [];
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        console.log(`Attempting competitor generation with ${provider}...`);
        const aiResponse = await callAI(prompt, provider);
        console.log("AI response received, length:", aiResponse.length);
        console.log("Response preview:", aiResponse.substring(0, 300));
        
        // Parse JSON response
        let parsedResponse: any;
        try {
          parsedResponse = JSON.parse(aiResponse);
        } catch (parseError) {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[1]);
          } else {
            // Try to find JSON object in response
            const objectMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (objectMatch) {
              parsedResponse = JSON.parse(objectMatch[0]);
            } else {
              throw new Error("No valid JSON found in response");
            }
          }
        }
        
        // Extract competitors array
        const rawCompetitors = parsedResponse.competitors || parsedResponse.competitor || parsedResponse || [];
        
        // Clean and validate competitors
        cleanedCompetitors = cleanCompetitors(rawCompetitors);
        console.log(`Cleaned ${cleanedCompetitors.length} competitors:`, cleanedCompetitors);
        
        // Validate the cleaned list
        if (isValidCompetitorList(cleanedCompetitors)) {
          console.log("✅ Valid competitor list generated");
          break; // Success, exit loop
        } else {
          console.warn("⚠️ Generated list failed validation, trying next provider...");
          lastError = new Error("Generated competitors failed validation");
        }
      } catch (error: any) {
        console.error(`${provider} failed:`, error.message);
        lastError = error;
        continue; // Try next provider
      }
    }
    
    // If all providers failed or validation failed, use fallback
    if (cleanedCompetitors.length === 0 || !isValidCompetitorList(cleanedCompetitors)) {
      console.warn("⚠️ All providers failed or returned invalid data. Using fallback competitors.");
      cleanedCompetitors = FALLBACK_COMPETITORS;
    }
    
    // Format as array of objects with name (for backward compatibility)
    const competitors = cleanedCompetitors.map(name => ({
      name: name.trim(),
      url: `https://${name.toLowerCase().replace(/\s+/g, '')}.com` // Placeholder URL
    }));

    return new Response(
      JSON.stringify({ competitors }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-competitors:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate competitors" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

