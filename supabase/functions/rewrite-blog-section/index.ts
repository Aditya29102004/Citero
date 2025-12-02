import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Keys - Support Gemini (preferred) and OpenAI (fallback)
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";

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
      max_tokens: 2000,
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

    const { content, prompt } = await req.json();

    if (!content || !prompt) {
      throw new Error("content and prompt are required");
    }

    const rewritePrompt = `${prompt}\n\nOriginal text:\n${content}\n\nRewritten text (maintain the same meaning but improve clarity, flow, and engagement):`;

    const rewritten = await callAI(rewritePrompt);

    return new Response(
      JSON.stringify({ rewritten }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error rewriting:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to rewrite" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
