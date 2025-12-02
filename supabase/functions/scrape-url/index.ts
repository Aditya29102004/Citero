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
      temperature: 0.4,
      max_tokens: 1000,
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

async function scrapeWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Extract text content (simple extraction)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // Limit to 5000 chars

    return text;
  } catch (error) {
    console.error("Error scraping website:", error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

function extractMetadata(html: string): { title: string; description: string; keywords: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);

  return {
    title: titleMatch?.[1] || "",
    description: descMatch?.[1] || "",
    keywords: keywordsMatch?.[1] || "",
  };
}

serve(async (req) => {
  console.log("=== scrape-url function called ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check for Authorization header (case-insensitive)
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const apikeyHeader = req.headers.get("apikey") || req.headers.get("Apikey");
    
    console.log("Headers received:", {
      hasAuth: !!authHeader,
      hasApikey: !!apikeyHeader,
      allHeaders: Object.fromEntries(req.headers.entries())
    });
    
    // Use Authorization header if available, otherwise try apikey
    const tokenHeader = authHeader || apikeyHeader;
    
    if (!tokenHeader) {
      console.error("No authorization header found");
      return new Response(
        JSON.stringify({ error: "No authorization header found. Please ensure you are logged in." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Extract token (remove "Bearer " prefix if present)
    const token = tokenHeader.replace(/^Bearer\s+/i, "");
    console.log("Validating token (length:", token.length, ")...");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError?.message || "No user");
      return new Response(
        JSON.stringify({ error: "Unauthorized: " + (userError?.message || "Invalid token") }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("User authenticated:", user.id);

    // Parse request body - Supabase sends JSON directly
    let requestBody: any = {};
    try {
      // Read body as text first (can only read once)
      const bodyText = await req.text();
      console.log("Request body as text:", bodyText);
      
      if (bodyText && bodyText.trim()) {
        try {
          requestBody = JSON.parse(bodyText);
          console.log("Parsed request body:", requestBody);
        } catch (jsonError: any) {
          console.error("Failed to parse body as JSON:", jsonError);
          return new Response(
            JSON.stringify({ error: "Invalid JSON in request body: " + (jsonError.message || "Parse error") }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
      } else {
        console.warn("Empty request body received");
        return new Response(
          JSON.stringify({ error: "Request body is empty. Please provide a URL." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    } catch (parseError: any) {
      console.error("Error reading request body:", parseError);
      console.error("Parse error details:", parseError.message);
      const errorMsg = parseError?.message || parseError?.toString() || "Invalid request body";
      return new Response(
        JSON.stringify({ error: "Error reading request body: " + errorMsg }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { url } = requestBody || {};

    if (!url || typeof url !== "string") {
      console.error("URL missing or invalid:", url, "Type:", typeof url);
      console.error("Full request body:", JSON.stringify(requestBody));
      return new Response(
        JSON.stringify({ error: "URL is required and must be a string. Received: " + JSON.stringify(requestBody) }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Scraping URL:", url);

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      console.error("Invalid URL format:", url);
      return new Response(
        JSON.stringify({ error: "Invalid URL format: " + url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Try multiple User-Agent strings and retry logic to avoid blocking
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ];

    let htmlResponse;
    let lastError;
    const maxRetries = 3;

    // Try multiple times with different User-Agents
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const userAgent = userAgents[attempt % userAgents.length];
        console.log(`Attempt ${attempt + 1}/${maxRetries} with User-Agent: ${userAgent.substring(0, 50)}...`);
        
        htmlResponse = await fetch(url, {
          headers: {
            "User-Agent": userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0",
          },
          redirect: "follow",
        });

        // If we got a successful response, break out of retry loop
        if (htmlResponse.ok) {
          console.log(`Successfully fetched website on attempt ${attempt + 1}`);
          break;
        }

        // If 403/429, wait a bit and try again with different User-Agent
        if (htmlResponse.status === 403 || htmlResponse.status === 429) {
          console.warn(`Blocked (${htmlResponse.status}) on attempt ${attempt + 1}, will retry...`);
          if (attempt < maxRetries - 1) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
            continue;
          }
        }

        // For other errors, break and handle below
        lastError = `HTTP ${htmlResponse.status} ${htmlResponse.statusText}`;
        break;

      } catch (fetchError: any) {
        console.error(`Error on attempt ${attempt + 1}:`, fetchError.message);
        lastError = fetchError.message;
        
        // If it's a network error and we have retries left, wait and retry
        if (attempt < maxRetries - 1 && (fetchError.message.includes('fetch') || fetchError.message.includes('network'))) {
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          continue;
        }
        
        // If no more retries, break
        break;
      }
    }

    // If we still don't have a successful response, try to extract basic info from URL
    if (!htmlResponse || !htmlResponse.ok) {
      console.warn(`Failed to fetch after ${maxRetries} attempts. Last error: ${lastError}`);
      
      // Try to extract domain name and generate a basic summary
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        const domainParts = domain.split('.');
        const siteName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
        
        // Generate a basic summary based on domain
        const basicSummary = `${siteName} is a website${domain.includes('leetcode') ? ' focused on coding challenges and technical interview preparation' : domain.includes('github') ? ' for software development and version control' : domain.includes('stackoverflow') ? ' for programming questions and answers' : ' providing online services'}.`;
        
        return new Response(
          JSON.stringify({
            summary: basicSummary + ` Unable to automatically scrape content (${lastError || 'blocked'}). Please provide a detailed description manually.`,
            industry: domain.includes('leetcode') || domain.includes('github') || domain.includes('stackoverflow') ? "Software Development" : "Technology",
            audience: domain.includes('leetcode') ? "Software engineers and developers preparing for technical interviews" : "General audience",
            keywords: domain.split('.').filter(p => p !== 'com' && p !== 'www'),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (urlError) {
        // Fallback if URL parsing fails
        return new Response(
          JSON.stringify({
            summary: `Unable to automatically analyze ${url} (${lastError || 'blocked'}). Please provide a description manually.`,
            industry: "Technology",
            audience: "General audience",
            keywords: [],
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    const html = await htmlResponse.text();
    const metadata = extractMetadata(html);
    
    // Extract visible text
    const visibleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    // Call AI to analyze
    const prompt = `You are analyzing a business website. Summarize it in 3 sentences. Extract: industry, target audience, product offering, and problem solved.

Website Title: ${metadata.title}
Meta Description: ${metadata.description}
Website Content: ${visibleText.slice(0, 3000)}

Return ONLY valid JSON in this exact format:
{
  "summary": "3 sentence summary of the business",
  "industry": "industry name",
  "audience": "target audience description",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    let aiResponse: string;
    try {
      aiResponse = await callAI(prompt);
    } catch (error: any) {
      console.error("AI call failed, using fallback:", error);
      // Fallback to basic extraction - don't fail, just return what we have
      const fallbackSummary = metadata.description || visibleText.slice(0, 200) || `Basic information about ${url}`;
      return new Response(
        JSON.stringify({
          summary: fallbackSummary,
          industry: "Technology",
          audience: "Businesses and professionals",
          keywords: metadata.keywords ? metadata.keywords.split(",").map((k: string) => k.trim()).filter(Boolean) : [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Parse AI response
    let parsedData;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback
      parsedData = {
        summary: metadata.description || visibleText.slice(0, 200),
        industry: "Technology",
        audience: "Businesses and professionals",
        keywords: metadata.keywords ? metadata.keywords.split(",").map((k: string) => k.trim()) : [],
      };
    }

    return new Response(
      JSON.stringify({
        summary: parsedData.summary || metadata.description || visibleText.slice(0, 200),
        industry: parsedData.industry || "Technology",
        audience: parsedData.audience || "Businesses and professionals",
        keywords: parsedData.keywords || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in scrape-url:", error);
    // Don't return error - return a fallback response so user can continue
    const errorMessage = error?.message || "Failed to scrape website";
    console.error("Error details:", errorMessage);
    
    // Try to extract URL from error if possible, or use a generic message
    const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/);
    const attemptedUrl = urlMatch ? urlMatch[0] : "the website";
    
    return new Response(
      JSON.stringify({
        summary: `Unable to automatically analyze ${attemptedUrl}. Please provide a description manually.`,
        industry: "Technology",
        audience: "General audience",
        keywords: [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so user can continue, not 400
      }
    );
  }
});

