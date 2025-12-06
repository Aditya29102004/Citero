import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API Keys
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// Support both GOOGLE_API_KEY and GEMINI_API_KEY (GOOGLE_API_KEY takes precedence per Gemini docs)
const GEMINI_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Cache for selected Gemini model (tested once, reused for all questions)
let cachedGeminiModel: string | null = null;

// Competitor cleaning utilities (inline version for edge function)
const STOPWORDS = new Set([
  "for", "this", "that", "the", "its", "it's", "their", "they", "them", "these", "those",
  "other", "some", "while", "recently", "however", "october", "november", "december",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "india", "know", "your", "brand", "platforms", "startup", "startups", "founders",
  "companies", "ecosystem", "also", "including", "such", "like", "similar", "alternatives",
  "competitors", "competitor", "and", "or", "but", "with", "from", "into", "onto", "upon"
]);

function cleanCompetitorName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  
  let cleaned = name.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  cleaned = cleaned.replace(/[^\w\s-]/g, ' ').trim();
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length < 3) return null;
  
  const lower = cleaned.toLowerCase();
  if (STOPWORDS.has(lower)) return null;
  if (/^\d+$/.test(cleaned)) return null;
  
  cleaned = cleaned
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return cleaned;
}

function extractCompetitorsFromResponse(response: string, competitorNames: string[], brandName: string): string[] {
  if (!response || !competitorNames.length) return [];
  
  const found: string[] = [];
  const responseLower = response.toLowerCase();
  const brandLower = brandName.toLowerCase();
  
  competitorNames.forEach(compName => {
    if (!compName || compName.toLowerCase() === brandLower) return;
    
    const compLower = compName.toLowerCase();
    const regex = new RegExp(`\\b${compLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    if (regex.test(response)) {
      found.push(compName);
    }
  });
  
  return found;
}

function mergeCompetitors(initial: string[], aiExtracted: string[]): string[] {
  const merged = new Set<string>();
  
  initial.forEach(comp => {
    const cleaned = cleanCompetitorName(comp);
    if (cleaned) merged.add(cleaned);
  });
  
  aiExtracted.forEach(comp => {
    const cleaned = cleanCompetitorName(comp);
    if (cleaned) {
      const lower = cleaned.toLowerCase();
      const isDuplicate = Array.from(merged).some(existing => existing.toLowerCase() === lower);
      if (!isDuplicate) {
        merged.add(cleaned);
      }
    }
  });
  
  return Array.from(merged);
}

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
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set. Please set one of these environment variables in Supabase Edge Functions secrets.");
    }

    // Use cached model if available (tested once, reused for all questions)
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

    // First time: Test model availability and cache the selected model
    // CRITICAL: Google changed their API routing in mid-2024
    // Gemini 2.x works ONLY with v1beta endpoint - v1 is deprecated and will return 404
    // The ONLY valid endpoint format is: https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
    // 
    // ONLY valid models (from /models API response):
    // - gemini-2.0-flash (🔥 Best Fast Model - Use This)
    // - gemini-2.5-pro (🧠 Best Quality Model)
    // 
    // DO NOT use: gemini-pro, gemini-1.5-pro, gemini-1.5-flash, or any deprecated models

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

    // Models to try in priority order - ONLY these models are valid as of Gemini 2.x
    const modelsToTry = [
      "gemini-2.0-flash",        // 🔥 Best Fast Model (Use This) - PRIMARY
      "gemini-2.5-pro",          // 🧠 Best Quality Model - FALLBACK
    ];

    // Test model availability in parallel
    const availabilityTests = await Promise.all(
      modelsToTry.map(async (model) => ({
        model,
        available: await testModelAvailability(model),
      }))
    );

    // Find first available model
    const selectedModel = availabilityTests.find((test) => test.available)?.model || modelsToTry[0];

    // Log availability results
    availabilityTests.forEach((test) => {
      console.log(`${test.available ? "✓" : "✗"} Model ${test.model} is ${test.available ? "available" : "not available"}`);
    });

    // Cache the selected model for reuse
    cachedGeminiModel = selectedModel;
    console.log(`Using Gemini model: ${cachedGeminiModel}`);

    // Now use the cached model for this request
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

// Helper function to reset Gemini model cache (useful for testing or if model changes)
function resetGeminiModelCache() {
  cachedGeminiModel = null;
}

// People Extraction Prompt - More aggressive but still accurate
const PEOPLE_EXTRACTION_PROMPT = `You are extracting people mentioned in this text. Look carefully for:

1. **Full names**: "John Smith", "Jane Doe", "Elon Musk", "Satya Nadella"
2. **People with roles**: "CEO John Smith", "Founder Jane Doe", "CTO of Company X"
3. **Executives mentioned**: Anyone with titles like CEO, CTO, CFO, Founder, Co-founder, Creator, Author, Director, President, VP, CMO, COO
4. **People associated with companies**: "John Smith of Microsoft", "Jane Doe from Google"

**CRITICAL RULES**:
- Extract ANY person mentioned, even if just a role (e.g., "the CEO" → name: null, role: "CEO")
- Look for patterns like: "CEO John", "Founder Jane", "John, CEO of X", "Jane (Founder)"
- If a company founder/executive is mentioned, extract them
- Do NOT extract:
  - Single letters (a, b, c, l, t, r)
  - Common words (the, and, or, include, sources, context)
  - Generic phrases ("include any sources", "the context", "clear overview")
- If NO people found, return: {"people": []}

Return ONLY valid JSON (no markdown, no explanations):
{
  "people": [
    {
      "name": "Full Name or null",
      "role": "CEO/Founder/etc or null",
      "company": "Company or null",
      "inferred_relevance": "Why this person matters",
      "snippet": "Exact text where mentioned"
    }
  ]
}

Text:
{{LLM_RESPONSE_TEXT}}`;

// Common stopwords and false positives to filter out
const COMMON_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here', 'where', 'when',
  'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'all', 'each', 'every', 'some',
  'any', 'no', 'not', 'only', 'just', 'also', 'too', 'very', 'more', 'most', 'much', 'many',
  'few', 'little', 'other', 'another', 'such', 'same', 'different', 'include', 'includes',
  'including', 'source', 'sources', 'context', 'information', 'data', 'analysis', 'response',
  'responses', 'commentary', 'review', 'reviews', 'overview', 'alternatives', 'sentiment'
]);

// Validate if a string looks like a person's name
function isValidPersonName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  
  // Must be at least 2 words (first name + last name)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) return false;
  
  // Each word must be capitalized and at least 2 characters
  for (const word of words) {
    if (word.length < 2) return false;
    // Must start with capital letter and have lowercase after
    if (!/^[A-Z][a-z]+$/.test(word)) return false;
    // Filter out common words
    if (COMMON_STOPWORDS.has(word.toLowerCase())) return false;
    // Filter out single letters
    if (word.length === 1) return false;
  }
  
  // Filter out common false positives
  const lowerName = trimmed.toLowerCase();
  const falsePositives = [
    'united states', 'new york', 'san francisco', 'los angeles', 'silicon valley',
    'tech crunch', 'product hunt', 'include any', 'the sources', 'the context',
    'available alternatives', 'clear overview', 'marketing technology', 'and reviews',
    'he sentiment', 'the sentiment', 'information used', 'sources referenced',
    'there is no', 'direct commentary'
  ];
  
  for (const fp of falsePositives) {
    if (lowerName.includes(fp)) return false;
  }
  
  // Must not be just punctuation or special characters
  if (!/^[A-Za-z\s]+$/.test(trimmed)) return false;
  
  return true;
}

// Validate if a string looks like a role/title
function isValidRole(role: string): boolean {
  if (!role || role.length < 2) return false;
  const lowerRole = role.toLowerCase();
  
  // Must contain role keywords
  const roleKeywords = ['ceo', 'cto', 'cfo', 'founder', 'creator', 'author', 'director', 
    'president', 'manager', 'lead', 'head', 'vp', 'vice', 'coo', 'cmo'];
  
  return roleKeywords.some(keyword => lowerRole.includes(keyword));
}

// Smart regex-based extraction with better filtering
function extractPeopleWithRegex(text: string): Array<{
  name: string | null;
  role: string | null;
  company: string | null;
  inferred_relevance: string;
  snippet: string;
}> {
  const people: Array<{
    name: string | null;
    role: string | null;
    company: string | null;
    inferred_relevance: string;
    snippet: string;
  }> = [];
  const seen = new Set<string>();
  
  // Pattern 1: "Name, Role at Company" or "Name (Role at Company)"
  const pattern1 = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[,\(]\s*([^,\)]+?)(?:\s+at\s+([^,\)]+))?/gi;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    const name = match[1].trim();
    const role = match[2].trim();
    const company = match[3]?.trim() || null;
    
    // Validate name
    if (isValidPersonName(name) && isValidRole(role)) {
      const key = `${name}-${role}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        people.push({
          name,
          role,
          company,
          inferred_relevance: `Mentioned as ${role}${company ? ` at ${company}` : ''}`,
          snippet: match[0].substring(0, 200),
        });
      }
    }
  }
  
  // Pattern 2: "Role Name" (e.g., "CEO John Smith", "Founder Jane Doe")
  const roles = ['CEO', 'CTO', 'CFO', 'Founder', 'Co-founder', 'Creator', 'Author', 'Director', 
    'VP', 'Vice President', 'President', 'CMO', 'COO', 'Head of', 'Lead', 'Manager'];
  roles.forEach(role => {
    const pattern = new RegExp(`\\b${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi');
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (isValidPersonName(name)) {
        const key = `${name}-${role}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          people.push({
            name,
            role,
            company: null,
            inferred_relevance: `Mentioned as ${role}`,
            snippet: match[0].substring(0, 200),
          });
        }
      }
    }
  });
  
  // Pattern 3: "Name of Company" - Only if name is valid and company looks real
  const pattern3 = /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:of|from|at)\s+([A-Z][a-zA-Z\s]{3,})/gi;
  while ((match = pattern3.exec(text)) !== null) {
    const name = match[1].trim();
    const company = match[2].trim();
    
    // Validate both name and company
    if (isValidPersonName(name) && company && company.length > 3) {
      // Filter out common false positives for company
      const lowerCompany = company.toLowerCase();
      if (!COMMON_STOPWORDS.has(lowerCompany) && 
          !lowerCompany.includes('sources') && 
          !lowerCompany.includes('context') &&
          !lowerCompany.includes('information')) {
        const key = `${name}-${company}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          people.push({
            name,
            role: null,
            company,
            inferred_relevance: `Mentioned in relation to ${company}`,
            snippet: match[0].substring(0, 200),
          });
        }
      }
    }
  }
  
  // Pattern 4: Capitalized names with strong context - Only very specific patterns
  // This pattern is very strict - only matches "Role Name" format
  const strongContextPattern = /\b(CEO|CTO|CFO|Founder|Co-founder|Creator|Author|Director|President|VP|Vice President|CMO|COO)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/gi;
  while ((match = strongContextPattern.exec(text)) !== null) {
    const role = match[1].trim();
    const name = match[2].trim();
    
    if (isValidPersonName(name) && isValidRole(role)) {
      const key = `${name}-${role}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        people.push({
          name,
          role,
          company: null,
          inferred_relevance: `Mentioned as ${role}`,
          snippet: match[0].substring(0, 200),
        });
      }
    }
  }
  
  // Filter out any remaining invalid entries before returning
  return people.filter(p => {
    // Must have valid name OR valid role
    if (!p.name && !p.role) return false;
    
    // If name exists, must be valid
    if (p.name && !isValidPersonName(p.name)) return false;
    
    // If role exists, must be valid
    if (p.role && !isValidRole(p.role)) return false;
    
    return true;
  });
}

// People Extraction Function - Enhanced with fallback
async function extractPeopleFromLLMResponse(rawText: string): Promise<Array<{
  name: string | null;
  role: string | null;
  company: string | null;
  inferred_relevance: string;
  snippet: string;
}>> {
  if (!rawText || rawText.trim().length === 0) {
    return [];
  }

  const prompt = PEOPLE_EXTRACTION_PROMPT.replace("{{LLM_RESPONSE_TEXT}}", rawText);

  // Declare llmExtracted outside try block so it's accessible later
  let llmExtracted: Array<{
    name: string | null;
    role: string | null;
    company: string | null;
    inferred_relevance: string;
    snippet: string;
  }> = [];
  
  try {
    // Use LLM extraction - it's more accurate than regex
    console.log("Running LLM extraction for people");
    const response = await callAI(prompt, "gemini");
    console.log(`LLM response length: ${response.length} chars`);
    
    // Try multiple JSON extraction strategies
    let parsed: any = null;
    
    // Strategy 1: Extract JSON object with "people" key (most common)
    const jsonMatch = response.match(/\{[\s\S]*?"people"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        console.log("Parsed JSON from match");
      } catch (e) {
        // Try cleaning the JSON
        const cleaned = jsonMatch[0].replace(/```json|```/g, '').trim();
        try {
          parsed = JSON.parse(cleaned);
          console.log("Parsed cleaned JSON from match");
        } catch (e2) {
          console.log("Failed to parse JSON match, trying other strategies");
        }
      }
    }
    
    // Strategy 2: Try parsing entire response
    if (!parsed || !parsed.people) {
      try {
        const cleaned = response.replace(/```json|```/g, '').trim();
        // Try to find JSON object
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
          parsed = JSON.parse(jsonStr);
          console.log("Parsed JSON from entire response");
        }
      } catch (e) {
        console.log("Could not parse as JSON, response might not contain people");
      }
    }
    
    // Strategy 3: Try to extract if response mentions "people" or "founder" or "CEO"
    if (!parsed || !parsed.people) {
      const lowerResponse = response.toLowerCase();
      const hasPeopleMentions = lowerResponse.includes('founder') || 
                                lowerResponse.includes('ceo') || 
                                lowerResponse.includes('cto') ||
                                lowerResponse.includes('creator') ||
                                /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(response); // Pattern for names
      
      if (!hasPeopleMentions) {
        console.log("Response doesn't appear to mention any people");
      } else {
        console.log("Response mentions people-related terms but JSON parsing failed");
      }
    }
    
    // Extract people from parsed JSON
    if (parsed && parsed.people && Array.isArray(parsed.people)) {
      console.log(`Found ${parsed.people.length} people in parsed JSON`);
      
      llmExtracted = parsed.people
        .map((p: any) => ({
          name: p.name || null,
          role: p.role || null,
          company: p.company || null,
          inferred_relevance: p.inferred_relevance || p.relevance || "",
          snippet: p.snippet || p.text || "",
        }))
        .filter((p: any) => {
          // Must have at least name or role
          if (!p.name && !p.role) {
            console.log("Filtered: no name or role");
            return false;
          }
          
          // If name exists, validate it's not a single character or stopword
          if (p.name) {
            const nameStr = String(p.name).trim();
            if (nameStr.length <= 1) {
              console.log(`Filtered: name too short: "${nameStr}"`);
              return false;
            }
            if (COMMON_STOPWORDS.has(nameStr.toLowerCase())) {
              console.log(`Filtered: name is stopword: "${nameStr}"`);
              return false;
            }
            // Filter out single letters with punctuation
            if (/^[a-z][\s,\.]?$/i.test(nameStr)) {
              console.log(`Filtered: name is single letter: "${nameStr}"`);
              return false;
            }
            // Must be at least 2 characters and look like a name
            if (nameStr.length < 2 || !/[A-Za-z]{2,}/.test(nameStr)) {
              console.log(`Filtered: name doesn't look valid: "${nameStr}"`);
              return false;
            }
          }
          
          // If role exists, validate it's meaningful
          if (p.role) {
            const roleStr = String(p.role).trim();
            if (roleStr.length <= 1) {
              console.log(`Filtered: role too short: "${roleStr}"`);
              return false;
            }
            if (COMMON_STOPWORDS.has(roleStr.toLowerCase())) {
              console.log(`Filtered: role is stopword: "${roleStr}"`);
              return false;
            }
            // Role should contain role keywords
            if (!isValidRole(roleStr)) {
              console.log(`Filtered: role doesn't look valid: "${roleStr}"`);
              return false;
            }
          }
          
          return true;
        });
      
      if (llmExtracted.length > 0) {
        console.log(`LLM extracted ${llmExtracted.length} valid people after filtering`);
      } else if (parsed.people.length > 0) {
        console.log(`All ${parsed.people.length} extracted people were filtered out as invalid`);
      }
    } else {
      console.log("No people array found in parsed JSON or parsing failed");
    }
  } catch (error: any) {
    console.error("LLM extraction error:", error.message);
    console.error("Error stack:", error.stack);
  }
  
  // Only use LLM results - regex was producing too many false positives
  if (llmExtracted.length === 0) {
    console.log("No people found via LLM extraction");
    return [];
  }
  
  console.log(`Before deduplication: ${llmExtracted.length} people from LLM`);
  
  // Deduplicate with strict validation
  const unique = new Map<string, typeof llmExtracted[0]>();
  llmExtracted.forEach(p => {
    // Skip if invalid - must have valid name OR valid role
    if (!p.name && !p.role) return;
    
    // If name exists, must be valid
    if (p.name && !isValidPersonName(p.name)) {
      console.log(`Filtered out invalid name: "${p.name}"`);
      return;
    }
    
    // If role exists, must be valid
    if (p.role && !isValidRole(p.role)) {
      console.log(`Filtered out invalid role: "${p.role}"`);
      return;
    }
    
    const key = `${p.name || ''}-${p.role || ''}-${p.company || ''}`.toLowerCase().trim();
    if (key && key !== '--' && key !== '-' && !unique.has(key)) {
      unique.set(key, p);
    }
  });
  
  const final = Array.from(unique.values());
  console.log(`After deduplication and validation: ${final.length} unique valid people`);
  if (final.length > 0) {
    console.log(`Sample extracted:`, final.slice(0, 3).map(p => ({ name: p.name, role: p.role, company: p.company })));
  }
  
  return final;
}

// People Deduplication Function - With validation
function dedupePeople(people: Array<{
  name: string | null;
  role: string | null;
  company: string | null;
  inferred_relevance: string;
  snippet: string;
}>): Array<{
  name: string | null;
  role: string | null;
  company: string | null;
  inferred_relevance: string;
  snippet: string;
}> {
  const map = new Map<string, typeof people[0]>();

  for (const p of people) {
    // Filter out invalid entries
    // Must have at least a valid name OR a valid role
    if (!p.name && !p.role) {
      continue;
    }
    
    // If name exists, validate it
    if (p.name) {
      // Filter out single characters
      if (p.name.length <= 1) {
        continue;
      }
      // Filter out common stopwords
      if (COMMON_STOPWORDS.has(p.name.toLowerCase())) {
        continue;
      }
      // Filter out if name is just a single letter followed by punctuation
      if (/^[a-z][\s,\.]?$/i.test(p.name.trim())) {
        continue;
      }
    }
    
    // If role exists, validate it
    if (p.role) {
      // Filter out single characters
      if (p.role.length <= 1) {
        continue;
      }
      // Filter out common stopwords
      if (COMMON_STOPWORDS.has(p.role.toLowerCase())) {
        continue;
      }
    }
    
    // Create key for deduplication
    const key = `${p.name || ""}-${p.role || ""}-${p.company || ""}`.toLowerCase().trim();
    
    // Skip if key is completely empty
    if (key === "--" || key === "") {
      continue;
    }
    
    // If we have this exact combination, keep the one with more information
    if (map.has(key)) {
      const existing = map.get(key)!;
      const existingInfo = [existing.name, existing.role, existing.company].filter(Boolean).length;
      const newInfo = [p.name, p.role, p.company].filter(Boolean).length;
      if (newInfo > existingInfo) {
        map.set(key, p);
      }
    } else {
      map.set(key, p);
    }
  }

  return Array.from(map.values());
}

function generateQuestions(brandName: string, description: string, topics: string[]): string[] {
  // Generate 15 questions focused on comparisons, alternatives, trust, top brands, reliability, growth, popularity, credibility
  const baseQuestions = [
    `Who are the most credible alternatives to ${brandName}?`,
    `Which platforms compete with ${brandName} for emerging founders?`,
    `How does ${brandName} compare to other startup discovery tools?`,
    `What are the top brands in the ${topics[0] || 'startup'} space?`,
    `Which platforms are considered the most reliable alternatives to ${brandName}?`,
    `What are the fastest-growing brands in the ${topics[0] || 'startup'} ecosystem right now?`,
    `How trustworthy is ${brandName} compared to competitors?`,
    `What brands are considered experts in ${topics[0] || 'startup networking'}?`,
    `Which platforms offer similar features to ${brandName}?`,
    `What makes ${brandName} unique compared to competitors?`,
    `Who are the leading players in the ${topics[0] || 'startup'} market?`,
    `What are users saying about ${brandName} vs other platforms?`,
    `Which brands have the best reputation in ${topics[0] || 'startup networking'}?`,
    `How popular is ${brandName} compared to other solutions?`,
    `What are the most recommended platforms for ${topics[0] || 'startup founders'}?`,
  ];
  
  return baseQuestions.slice(0, 15);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: String(parseError) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { brandId, aiProvider = "openai" } = requestBody;
    console.log("GEO scan request:", { brandId, aiProvider });

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: "brandId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      console.error("SUPABASE_URL environment variable is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error: SUPABASE_URL not set" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get brand data
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();

    if (brandError || !brand) {
      return new Response(
        JSON.stringify({ error: "Brand not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get initial competitors
    let initialCompetitors: string[] = [];
    if (brand.primary_competitors && Array.isArray(brand.primary_competitors)) {
      initialCompetitors = brand.primary_competitors.filter((c: any) => typeof c === 'string');
    } else if (brand.competitors) {
      try {
        const competitors = typeof brand.competitors === 'string' 
          ? JSON.parse(brand.competitors) 
          : brand.competitors;
        if (Array.isArray(competitors)) {
          initialCompetitors = competitors
            .map((c: any) => typeof c === 'string' ? c : (c?.name || ''))
            .filter((name: string) => name.length > 0);
        }
      } catch (e) {
        console.warn('Failed to parse competitors:', e);
      }
    }

    // Generate questions
    const topics = (brand.topics as string[]) || [];
    const questions = generateQuestions(brand.name, brand.description || "", topics);

    // Create scan record
    console.log("Creating scan record for brand:", brandId, "with", questions.length, "questions");
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        brand_id: brandId,
        user_id: brand.user_id, // Add user_id which is required
        status: "running",
        total_questions: questions.length,
        completed_questions: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanError || !scan) {
      console.error("Failed to create scan:", scanError);
      return new Response(
        JSON.stringify({ error: "Failed to create scan", details: scanError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const scanId = scan.id;
    console.log("Scan created successfully:", scanId);

    // Process questions
    console.log("Starting to process", questions.length, "questions");
    const responses: any[] = [];
    let completedQuestions = 0;
    const allExtractedPeople: Array<{
      name: string | null;
      role: string | null;
      company: string | null;
      inferred_relevance: string;
      snippet: string;
    }> = [];

    for (let i = 0; i < questions.length; i++) {
      console.log(`Processing question ${i + 1}/${questions.length}`);
      // Check if scan was cancelled
      const { data: scanCheck } = await supabase
        .from("scans")
        .select("status")
        .eq("id", scanId)
        .single();

      if (scanCheck?.status === "cancelled") {
        await supabase
          .from("scans")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("id", scanId);
        return new Response(
          JSON.stringify({ message: "Scan cancelled", scanId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const question = questions[i];
      
      try {
        // Build prompt with improved source extraction
        const prompt = `You are analyzing search results for: "${question}"

Brand Context:
- Name: ${brand.name}
${brand.description ? `- Description: ${brand.description}` : ''}
${brand.website_url ? `- Website: ${brand.website_url}` : ''}
${brand.country ? `- Location: ${brand.country}` : ''}

Please provide a comprehensive answer to the question. In your response, please:
1. Mention if ${brand.name} appears in your answer (yes/no)
2. List any competitors or alternative solutions mentioned
3. Indicate the sentiment towards ${brand.name} if mentioned (positive/neutral/negative)
4. Include any sources, links, or citations you reference

At the end of your response, provide a JSON object with sources you cited:
{
  "sources": [
    {
      "name": "Source Name",
      "domain": "domain.com"
    }
  ]
}

Answer:`;

        const aiResponse = await callAI(prompt, aiProvider);
        
        // Extract people from LLM response
        const peopleCandidates = await extractPeopleFromLLMResponse(aiResponse);
        if (peopleCandidates.length > 0) {
          console.log(`Question ${i + 1}: Extracted ${peopleCandidates.length} people`);
          allExtractedPeople.push(...peopleCandidates);
        }
        
        // Extract data from response
        const lowerResponse = aiResponse.toLowerCase();
        const lowerBrandName = brand.name.toLowerCase();
        const brandMentioned = lowerResponse.includes(lowerBrandName);
        
        // Extract sentiment
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
        if (brandMentioned) {
          const positiveWords = ['great', 'excellent', 'best', 'recommended', 'top', 'leading', 'popular', 'successful', 'innovative', 'outstanding'];
          const negativeWords = ['poor', 'bad', 'limited', 'lacks', 'issues', 'problems', 'concerns', 'disappointing', 'weak'];
          
          const positiveCount = positiveWords.filter(word => lowerResponse.includes(word)).length;
          const negativeCount = negativeWords.filter(word => lowerResponse.includes(word)).length;

          if (positiveCount > negativeCount) {
            sentiment = 'positive';
          } else if (negativeCount > positiveCount) {
            sentiment = 'negative';
          }
        }

        // Extract sources using improved prompt response
        const sources: Array<{ name: string; domain: string }> = [];
        try {
          // Try to extract JSON sources from response
          const jsonMatch = aiResponse.match(/\{[\s\S]*"sources"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.sources && Array.isArray(parsed.sources)) {
              parsed.sources.forEach((source: any) => {
                if (source.domain) {
                  // Normalize domain
                  let domain = source.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
                  if (domain.includes('.')) {
                    const parts = domain.split('.');
                    if (parts.length >= 2) {
                      domain = parts.slice(-2).join('.');
                    }
                    sources.push({
                      name: source.name || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
                      domain: domain,
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          // Fallback: extract URLs from response
          const urlRegex = /(https?:\/\/[^\s\)]+)/g;
          const urlMatches = aiResponse.matchAll(urlRegex);
          for (const match of urlMatches) {
            if (match[1]) {
              try {
                const urlObj = new URL(match[1]);
                let domain = urlObj.hostname.replace('www.', '').toLowerCase();
                const parts = domain.split('.');
                if (parts.length >= 2) {
                  domain = parts.slice(-2).join('.');
                }
                if (domain.includes('.')) {
                  sources.push({
                    name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
                    domain: domain,
                  });
                }
              } catch {
                // Invalid URL, skip
              }
            }
          }
        }
        
        // Deduplicate sources by domain
        const seenDomains = new Set<string>();
        const uniqueSources = sources.filter(s => {
          if (seenDomains.has(s.domain)) return false;
          seenDomains.add(s.domain);
          return true;
        }).slice(0, 15); // Max 15 sources per response

        // Store response
        const { error: responseError } = await supabase
          .from("scan_responses")
          .insert({
            scan_id: scanId,
            brand_id: brandId,
            user_id: brand.user_id,
            question_template: question,
            question_text: question,
            ai_response: aiResponse,
            brand_mentioned: brandMentioned,
            sentiment: sentiment,
            mentioned_brands: [], // Will be populated after competitor extraction
            created_at: new Date().toISOString(),
          });

        if (responseError) {
          console.error("Error storing response:", responseError);
        }

        responses.push({
          question,
          response: aiResponse,
          brandMentioned,
          sentiment,
          sources,
        });

        completedQuestions++;
        
        // Update scan progress
        await supabase
          .from("scans")
          .update({ completed_questions: completedQuestions })
          .eq("id", scanId);

      } catch (error: any) {
        console.error(`Error processing question ${i + 1}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        // Continue with next question
      }
    }

    console.log(`Completed processing ${completedQuestions}/${questions.length} questions`);

    // Deduplicate and store extracted people (only if we found any)
    console.log(`Total people extracted before deduplication: ${allExtractedPeople.length}`);
    
    if (allExtractedPeople.length === 0) {
      console.log("No people extracted from scan responses - this is normal if responses don't mention specific individuals");
    } else {
      const uniquePeople = dedupePeople(allExtractedPeople);
      console.log(`Unique people after deduplication: ${uniquePeople.length}`);
      
      if (uniquePeople.length > 0) {
        console.log(`Storing ${uniquePeople.length} unique people mentions to database`);
        const peopleInserts = uniquePeople.map(person => ({
          scan_id: scanId,
          brand_id: brandId,
          name: person.name,
          role: person.role,
          company: person.company,
          relevance: person.inferred_relevance,
          snippet: person.snippet,
          created_at: new Date().toISOString(),
        }));

        // Insert in batches to avoid payload size issues
        const batchSize = 50;
        let totalInserted = 0;
        for (let i = 0; i < peopleInserts.length; i += batchSize) {
          const batch = peopleInserts.slice(i, i + batchSize);
          const { error: peopleError, data } = await supabase
            .from("ai_people_mentions")
            .insert(batch)
            .select();
          
          if (peopleError) {
            console.error(`Error storing people batch ${Math.floor(i / batchSize) + 1}:`, peopleError);
          } else {
            totalInserted += batch.length;
            console.log(`Successfully stored batch ${Math.floor(i / batchSize) + 1} (${batch.length} people)`);
          }
        }
        console.log(`Total people stored: ${totalInserted}`);
      } else {
        console.log("All extracted people were filtered out as invalid");
      }
    }

    // ONLY use competitors from onboarding (primary_competitors) - don't extract from AI responses
    // AI extraction pulls out random words like "Sentiment", "Sources", "Yes", etc.
    // We only track competitors that the user explicitly added during onboarding
    const finalCompetitors = initialCompetitors.filter(name => {
      // Validate competitor names - filter out nonsense
      if (!name || typeof name !== 'string') return false;
      if (name.length < 3 || name.length > 100) return false;
      // Filter out common stopwords and nonsense
      const lowerName = name.toLowerCase();
      const stopwords = ['sentiment', 'sources', 'yes', 'tech', 'non', 'specific', 'positive', 'include', 'neutral', 'meetup', 'object', 'here', 'users', 'focused', 'does', 'various', 'offers', 'primarily', 'knowledge', 'niche', 'focus', 'overall', 'list', 'known', 'gust', 'indicate', 'support', 'indian', 'combinator', 'focuses', 'comprehensive', 'answer', 'user', 'reviews', 'indie'];
      if (stopwords.includes(lowerName)) return false;
      return true;
    });

    // Calculate competitor metrics
    interface CompetitorMetric {
      mentions: number;
      citations: number;
      positive: number;
      neutral: number;
      negative: number;
    }
    
    const competitorMetrics: Record<string, CompetitorMetric> = {};

    finalCompetitors.forEach(compName => {
      competitorMetrics[compName] = {
        mentions: 0,
        citations: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      };
    });

    let totalMentionsAcrossAllCompetitors = 0;

    responses.forEach(r => {
      const foundCompetitors = extractCompetitorsFromResponse(r.response, finalCompetitors, brand.name);
      
      foundCompetitors.forEach(compName => {
        if (competitorMetrics[compName]) {
          competitorMetrics[compName].mentions++;
          totalMentionsAcrossAllCompetitors++;
          
          if (r.brandMentioned) {
            competitorMetrics[compName].citations++;
          }
          
          if (r.sentiment === 'positive') competitorMetrics[compName].positive++;
          else if (r.sentiment === 'neutral') competitorMetrics[compName].neutral++;
          else if (r.sentiment === 'negative') competitorMetrics[compName].negative++;
        }
      });
    });

    // Build competitor_scores JSONB
    const competitorScores: Record<string, any> = {};
    Object.entries(competitorMetrics).forEach(([name, metrics]: [string, CompetitorMetric]) => {
      const visibilityScore = totalMentionsAcrossAllCompetitors > 0
        ? (metrics.mentions / totalMentionsAcrossAllCompetitors) * 100
        : 0;
      
      competitorScores[name] = {
        visibility: visibilityScore,
        mentions: metrics.mentions,
        citations: metrics.citations,
      };
    });

    // Calculate brand visibility - compare brand mentions vs total mentions (brand + competitors)
    const brandMentions = responses.filter(r => r.brandMentioned).length;
    const totalMentions = brandMentions + totalMentionsAcrossAllCompetitors;
    // If brand is mentioned more than competitors, visibility is high
    // If competitors dominate, visibility is lower
    const brandVisibility = totalMentions > 0 
      ? Math.min(100, Math.max(0, (brandMentions / totalMentions) * 100))
      : (responses.length > 0 ? (brandMentions / responses.length) * 100 : 0);

    // Calculate citation share
    const totalCitations = responses.reduce((sum, r) => sum + r.sources.length, 0);
    const brandCitations = responses.filter(r => r.brandMentioned).reduce((sum, r) => sum + r.sources.length, 0);
    const citationShare = totalCitations > 0 ? (brandCitations / totalCitations) * 100 : 0;

    // Calculate sentiment counts
    const sentimentPositive = responses.filter(r => r.sentiment === 'positive').length;
    const sentimentNeutral = responses.filter(r => r.sentiment === 'neutral').length;
    const sentimentNegative = responses.filter(r => r.sentiment === 'negative').length;

    // Aggregate sources from all responses
    const sourceMentions: Record<string, { count: number; firstSeen: Date; lastSeen: Date }> = {};
    responses.forEach(r => {
      r.sources.forEach((source: { name: string; domain: string }) => {
        if (source.domain) {
          const domain = source.domain.toLowerCase();
          if (!sourceMentions[domain]) {
            sourceMentions[domain] = {
              count: 0,
              firstSeen: new Date(),
              lastSeen: new Date(),
            };
          }
          sourceMentions[domain].count++;
          sourceMentions[domain].lastSeen = new Date();
        }
      });
    });

    // Store sources in source_citations table
    for (const [domain, data] of Object.entries(sourceMentions)) {
      try {
        // Check if source already exists
        const { data: existingSource } = await supabase
          .from("source_citations")
          .select("id, mention_count")
          .eq("brand_id", brandId)
          .eq("domain", domain)
          .single();

        if (existingSource) {
          // Update existing source
          await supabase
            .from("source_citations")
            .update({
              mention_count: existingSource.mention_count + data.count,
              last_seen: data.lastSeen.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSource.id);
        } else {
          // Insert new source
          const sourceName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
          let category = 'general source';
          if (domain.includes('.edu')) category = 'educational';
          else if (domain.includes('medium.com') || domain.includes('blog')) category = 'blog';
          else if (domain.includes('news') || domain.includes('times') || domain.includes('forbes')) category = 'news';
          else if (domain.includes('youtube')) category = 'video';
          else if (domain.includes('crunchbase') || domain.includes('angel.co')) category = 'business directory';

          await supabase
            .from("source_citations")
            .insert({
              brand_id: brandId,
              domain: domain,
              name: sourceName,
              mention_count: data.count,
              first_seen: data.firstSeen.toISOString(),
              last_seen: data.lastSeen.toISOString(),
              category: category,
            });
        }

        // Store in history table
        await supabase
          .from("source_citations_history")
          .insert({
            brand_id: brandId,
            domain: domain,
            scan_id: scanId,
            daily_mentions: data.count,
          });
      } catch (error) {
        console.error(`Error storing source ${domain}:`, error);
      }
    }

    // Build citation_sources JSONB for backward compatibility
    const citationSourcesMap: Record<string, number> = {};
    Object.entries(sourceMentions).forEach(([domain, data]) => {
      citationSourcesMap[domain] = data.count;
    });

    const citationSources = Object.entries(citationSourcesMap)
      .map(([domain, count]) => ({ domain, citations: count }))
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 20);

    // Get scan number
    let scanNumber = 1;
    try {
      const { data: maxScan, error: scanNumberError } = await supabase
        .from("ai_scan_results")
        .select("scan_number")
        .eq("brand_id", brandId)
        .order("scan_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scanNumberError && scanNumberError.code !== 'PGRST116') {
        console.error("Error fetching max scan_number:", scanNumberError);
      } else {
        scanNumber = (maxScan?.scan_number || 0) + 1;
      }
    } catch (e) {
      console.warn("Error calculating scan_number, defaulting to 1:", e);
    }

    // Map provider to platform name
    const platformName = aiProvider === "openai" || aiProvider === "chatgpt" ? "openai" : aiProvider;

    // Insert into ai_scan_results
    // Only use fields that exist in the schema (no total_prompts or total_citations)
    console.log("Inserting ai_scan_results:", {
      brand_id: brandId,
      scan_number: scanNumber,
      visibility_score: brandVisibility,
      citation_share: citationShare,
      platform: platformName,
    });

    const insertData: any = {
      brand_id: brandId,
      scan_number: scanNumber,
      visibility_score: brandVisibility,
      citation_share: citationShare,
      sentiment_positive: sentimentPositive,
      sentiment_neutral: sentimentNeutral,
      sentiment_negative: sentimentNegative,
      competitor_scores: competitorScores,
      citation_sources: citationSources,
      platform: platformName,
    };

    const { data: scanResult, error: insertError } = await supabase
      .from("ai_scan_results")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert failed:", insertError.message);
      // Try RPC function as fallback
      console.log("Trying RPC function as fallback");
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_ai_scan_result', {
          p_brand_id: brandId,
          p_scan_number: scanNumber,
          p_visibility_score: brandVisibility,
          p_citation_share: citationShare,
          p_sentiment_positive: sentimentPositive,
          p_sentiment_neutral: sentimentNeutral,
          p_sentiment_negative: sentimentNegative,
          p_competitor_scores: competitorScores,
          p_citation_sources: citationSources,
          p_platform: platformName,
        });

        if (rpcError) {
          console.error("RPC insert also failed:", rpcError);
          console.warn("WARNING: Could not insert scan results into ai_scan_results table. Scan completed but results may not be visible in dashboard.");
        } else {
          console.log("Successfully inserted ai_scan_results via RPC:", rpcResult);
        }
      } catch (rpcErr: any) {
        console.error("RPC call failed:", rpcErr);
        console.warn("WARNING: Could not insert scan results. Scan completed but results may not be visible in dashboard.");
      }
    } else {
      console.log("Successfully inserted ai_scan_results:", scanResult);
    }

    // Store competitor visibility history
    Object.entries(competitorMetrics).forEach(async ([name, metrics]: [string, CompetitorMetric]) => {
      const visibilityScore = totalMentionsAcrossAllCompetitors > 0
        ? (metrics.mentions / totalMentionsAcrossAllCompetitors) * 100
        : 0;
      
      const citationShareComp = responses.length > 0
        ? (metrics.citations / responses.length) * 100
        : 0;
      
      const sentimentWeighted = ((metrics.positive * 1 + metrics.neutral * 0.5 + metrics.negative * -1) / (metrics.mentions || 1) + 1) * 50;

      await supabase
        .from("competitor_visibility_history")
        .insert({
          brand_id: brandId,
          competitor_name: name,
          scan_id: scanId,
          visibility_score: visibilityScore,
          citation_share: citationShareComp,
          sentiment_weighted_score: sentimentWeighted,
          mentions: metrics.mentions,
          positive_mentions: metrics.positive,
          neutral_mentions: metrics.neutral,
          negative_mentions: metrics.negative,
        });
    });

    // Generate AI insights based on scan results
    console.log("Generating AI insights...");
    let insights: any = {};
    
    try {
      const insightsPrompt = `You are analyzing AI visibility scan results for ${brand.name}.

Scan Results Summary:
- Brand Visibility: ${brandVisibility.toFixed(1)}%
- Citation Share: ${citationShare.toFixed(1)}%
- Total Responses Analyzed: ${responses.length}
- Brand Mentions: ${brandMentions} out of ${responses.length} responses
- Competitors Found: ${Object.keys(competitorScores).length}
- Sentiment: ${sentimentPositive} positive, ${sentimentNeutral} neutral, ${sentimentNegative} negative

Top Competitors Mentioned:
${Object.entries(competitorScores).slice(0, 5).map(([name, data]: [string, any]) => `- ${name}: ${data.mentions} mentions, ${data.visibility?.toFixed(1) || 0}% visibility`).join('\n')}

Based on this data, provide actionable insights in JSON format:
{
  "actionable_recommendations": [
    {
      "action": "Specific actionable step to improve visibility",
      "priority": "Urgent" | "High" | "Moderate",
      "focus_area": "Content" | "SEO" | "PR" | "Partnerships" | "Branding" | "General"
    }
  ],
  "strengths_and_gaps": {
    "strengths": ["List 3-5 key strengths identified"],
    "gaps": ["List 3-5 visibility gaps or weaknesses"],
    "opportunity_topic": "Main topic/area with highest improvement potential"
  },
  "content_ideas": [
    {
      "title": "Content topic title",
      "description": "Why this content would help improve visibility"
    }
  ]
}

Be specific and actionable. Focus on improving AI visibility and brand perception.`;

      const insightsResponse = await callAI(insightsPrompt, aiProvider);
      
      // Try to extract JSON from response
      try {
        const jsonMatch = insightsResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
          console.log("Successfully parsed insights:", Object.keys(insights));
        } else {
          console.warn("Could not extract JSON from insights response");
        }
      } catch (parseError) {
        console.error("Failed to parse insights JSON:", parseError);
        // Fallback: generate basic insights from data
        insights = {
          actionable_recommendations: [
            {
              action: brandVisibility < 50 
                ? `Increase brand mentions in AI responses. Currently mentioned in ${brandMentions} out of ${responses.length} queries.`
                : `Maintain and improve brand visibility. Currently at ${brandVisibility.toFixed(1)}% visibility.`,
              priority: brandVisibility < 30 ? "Urgent" : brandVisibility < 50 ? "High" : "Moderate",
              focus_area: "Content"
            },
            {
              action: citationShare < 50
                ? `Improve citation share. Currently ${citationShare.toFixed(1)}% of citations mention your brand.`
                : `Maintain strong citation presence. Currently ${citationShare.toFixed(1)}% citation share.`,
              priority: citationShare < 30 ? "High" : "Moderate",
              focus_area: "PR"
            }
          ],
          strengths_and_gaps: {
            strengths: brandMentions > responses.length * 0.7 
              ? [`Strong brand recognition - mentioned in ${((brandMentions/responses.length)*100).toFixed(0)}% of queries`]
              : [`Brand visibility at ${brandVisibility.toFixed(1)}%`],
            gaps: brandMentions < responses.length * 0.5
              ? [`Low brand mention rate - only ${brandMentions} out of ${responses.length} queries`]
              : [`Opportunity to increase visibility from ${brandVisibility.toFixed(1)}%`],
            opportunity_topic: topics[0] || "General"
          },
          content_ideas: [
            {
              title: `Content about ${brand.name} in ${topics[0] || 'your industry'}`,
              description: `Create content that positions ${brand.name} as a leader in ${topics[0] || 'your industry'} to improve AI visibility`
            }
          ]
        };
      }
    } catch (insightsError) {
      console.error("Error generating insights:", insightsError);
      // Use fallback insights
      insights = {
        actionable_recommendations: [
          {
            action: `Improve brand visibility - currently at ${brandVisibility.toFixed(1)}%`,
            priority: brandVisibility < 50 ? "High" : "Moderate",
            focus_area: "Content"
          }
        ],
        strengths_and_gaps: {
          strengths: [`Brand mentioned in ${brandMentions} queries`],
          gaps: [`Visibility can be improved from ${brandVisibility.toFixed(1)}%`],
          opportunity_topic: topics[0] || "General"
        },
        content_ideas: []
      };
    }

    // Update scan to completed with insights
    await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_questions: completedQuestions,
        completed_at: new Date().toISOString(),
        visibility_score: brandVisibility,
        actionable_recommendations: insights.actionable_recommendations || null,
        strengths_and_gaps: insights.strengths_and_gaps || null,
        content_ideas: insights.content_ideas || null,
      })
      .eq("id", scanId);

    return new Response(
      JSON.stringify({
        success: true,
        scanId,
        scanNumber,
        totalQuestions: questions.length,
        completedQuestions,
        brandVisibility,
        citationShare,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in run-geo-scan:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      cause: error.cause,
    });
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.stack || String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
