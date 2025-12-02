import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Keys
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";

// Cache for selected Gemini model
let cachedGeminiModel: string | null = null;

async function callAI(prompt: string, provider: string = "openai"): Promise<string> {
  if (provider === "openai" || provider === "chatgpt") {
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } else if (provider === "gemini") {
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
            parts: [{
              text: prompt
            }]
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cachedGeminiModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
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
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

function extractDataFromAnswer(answerText: string, brandName: string): any {
  const lowerAnswer = answerText.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();

  // Check if brand is mentioned
  const brandMentioned = lowerAnswer.includes(lowerBrandName);

  // Extract competitors
  const competitors: string[] = [];
  const STOPWORDS = new Set([
    "for", "this", "that", "the", "its", "it's", "their", "they", "them", "these", "those",
    "other", "some", "while", "recently", "however", "october", "india", "know", "your",
    "brand", "platforms", "startup", "startups", "founders", "companies", "ecosystem"
  ]);
  
  const brandNamePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const matches = answerText.matchAll(brandNamePattern);
  const seen = new Set<string>();
  
  for (const match of matches) {
    const potentialBrand = match[1].trim();
    const lowerBrand = potentialBrand.toLowerCase();
    
    if (lowerBrand.includes(brandName.toLowerCase())) continue;
    if (STOPWORDS.has(lowerBrand)) continue;
    if (potentialBrand.length < 3 || potentialBrand.length > 50) continue;
    if (/^\d+$/.test(potentialBrand)) continue;
    if (/[^\w\s-]/.test(potentialBrand)) continue;
    
    const commonNonBrands = ['some', 'many', 'several', 'various', 'different', 'multiple', 'including', 'such', 'like'];
    if (commonNonBrands.includes(lowerBrand)) continue;
    
    if (potentialBrand.split(/\s+/).length === 1 && potentialBrand.length < 4) continue;
    
    if (!seen.has(lowerBrand)) {
      seen.add(lowerBrand);
      competitors.push(potentialBrand);
    }
  }
  
  const cleaned = competitors
    .slice(0, 10)
    .map(name => {
      return name.split(/\s+/)
        .map(word => {
          if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    });

  // Extract sentiment
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (brandMentioned) {
    const positiveWords = ['great', 'excellent', 'best', 'recommended', 'top', 'leading', 'popular', 'successful', 'innovative', 'outstanding'];
    const negativeWords = ['poor', 'bad', 'limited', 'lacks', 'issues', 'problems', 'concerns', 'disappointing', 'weak'];
    
    const positiveCount = positiveWords.filter(word => lowerAnswer.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerAnswer.includes(word)).length;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }
  }

  // Extract sources
  const sources: string[] = [];
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g;

  const urlMatches = answerText.matchAll(urlRegex);
  for (const match of urlMatches) {
    if (match[1] && !sources.includes(match[1])) {
      sources.push(match[1]);
    }
  }

  const domainMatches = answerText.matchAll(domainRegex);
  for (const match of domainMatches) {
    if (match[1] && !sources.some(s => s.includes(match[1]))) {
      sources.push(match[1]);
    }
  }

  // Calculate visibility score
  let score = 0;
  if (brandMentioned) {
    score += 30;
  }
  if (sentiment === 'positive') {
    score += 2;
  } else if (sentiment === 'negative') {
    score -= 1;
  }
  score += sources.length * 0.5;
  const visibilityScore = Math.max(0, Math.round(score * 100) / 100);

  return {
    answerText,
    brandMentioned,
    competitors: cleaned,
    sentiment,
    sources: sources.slice(0, 20),
    visibilityScore,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { promptText, brandContext, model, country } = await req.json();

    if (!promptText || !brandContext?.name) {
      return new Response(
        JSON.stringify({ error: "promptText and brandContext.name are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Build context prompt
    const contextPrompt = `You are analyzing search results for: "${promptText}"

Brand Context:
- Name: ${brandContext.name}
${brandContext.description ? `- Description: ${brandContext.description}` : ''}
${brandContext.website ? `- Website: ${brandContext.website}` : ''}
${country ? `- Location: ${country}` : ''}

Please provide a comprehensive answer to the question. In your response, please:
1. Mention if ${brandContext.name} appears in your answer (yes/no)
2. List any competitors or alternative solutions mentioned
3. Indicate the sentiment towards ${brandContext.name} if mentioned (positive/neutral/negative)
4. Include any sources, links, or citations you reference

Answer:`;

    // Map model name
    const provider = model === "claude" ? "openai" : (model === "gemini" ? "gemini" : "openai");

    const answerText = await callAI(contextPrompt, provider);
    const result = extractDataFromAnswer(answerText, brandContext.name);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in run-prompt-simulation:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.stack || String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

