import { supabase } from "@/integrations/supabase/client";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "qwen/qwen-2.5-7b-instruct";

export interface OutreachTarget {
  personName: string;
  personEmail: string;
  personRole: string;
  companyName?: string;
  priorityScore: number;
}

export interface SourceData {
  domain: string;
  url: string;
  articleTitle?: string;
  citationCount: number;
  lastMentioned?: string;
  articleText?: string;
}

/**
 * Detect outreach targets from a source using AI
 */
export async function detectTargets(source: SourceData): Promise<OutreachTarget | null> {
  if (!OPENROUTER_API_KEY) {
    console.error("OpenRouter API key not configured");
    return null;
  }

  // If we don't have article text, try to fetch it or use URL as context
  const contextText = source.articleText || source.url;

  const prompt = `Analyze this article/source and extract contact information for outreach:

Source URL: ${source.url}
${source.articleTitle ? `Article Title: ${source.articleTitle}` : ''}
${source.articleText ? `\nArticle Content:\n${source.articleText.substring(0, 2000)}` : ''}

Please extract:
1. Author/Contact Person Name (if available)
2. Email address (if mentioned or can be inferred)
3. Role/Title (e.g., "Editor", "Writer", "Founder", "Content Manager")
4. Company/Organization name (if different from domain)

Return your response as a JSON object with these exact keys:
{
  "personName": "string or null",
  "personEmail": "string or null",
  "personRole": "string or null",
  "companyName": "string or null"
}

If information is not available, use null. Be realistic - don't make up emails or names.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Unifr Outreach",
      },
      body: JSON.stringify({
        model: FALLBACK_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let extracted: any;
    try {
      extracted = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    // Validate extracted data
    if (!extracted.personName && !extracted.personEmail) {
      return null; // No useful contact info found
    }

    // Calculate priority score
    const priorityScore = calculatePriorityScore(source, extracted);

    return {
      personName: extracted.personName || "Unknown",
      personEmail: extracted.personEmail || "",
      personRole: extracted.personRole || "Unknown",
      companyName: extracted.companyName || source.domain,
      priorityScore,
    };
  } catch (error: any) {
    console.error("Error detecting targets:", error);
    return null;
  }
}

/**
 * Calculate priority score for outreach target
 */
function calculatePriorityScore(source: SourceData, extracted: any): number {
  let score = 0;

  // Citation count (higher = more important)
  score += Math.min(source.citationCount * 2, 50); // Max 50 points

  // Has email (critical for outreach)
  if (extracted.personEmail) {
    score += 30;
  }

  // Has name
  if (extracted.personName && extracted.personName !== "Unknown") {
    score += 10;
  }

  // Has role (shows authority)
  if (extracted.personRole && extracted.personRole !== "Unknown") {
    const roleLower = extracted.personRole.toLowerCase();
    if (roleLower.includes("editor") || roleLower.includes("founder") || roleLower.includes("ceo")) {
      score += 10;
    } else if (roleLower.includes("writer") || roleLower.includes("author")) {
      score += 5;
    }
  }

  // High-authority domains
  const highAuthorityDomains = ["medium.com", "forbes.com", "techcrunch.com", "wired.com", "theverge.com"];
  if (highAuthorityDomains.some((domain) => source.domain.includes(domain))) {
    score += 20;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Batch detect targets for multiple sources
 */
export async function detectTargetsBatch(
  sources: SourceData[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, OutreachTarget>> {
  const results = new Map<string, OutreachTarget>();

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const target = await detectTargets(source);

    if (target) {
      results.set(source.url, target);
    }

    if (onProgress) {
      onProgress(i + 1, sources.length);
    }

    // Small delay to avoid rate limits
    if (i < sources.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

