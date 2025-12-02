import { supabase } from "@/integrations/supabase/client";

export type AuditCategory =
  | "website_readability"
  | "metadata_analysis"
  | "brand_positioning_consistency"
  | "llm_sentiment_alignment"
  | "competitor_differentiation"
  | "source_authority"
  | "ai_product_understanding";

export interface AuditResult {
  category: AuditCategory;
  score: number;
  issues: string[];
  recommendations: string[];
  details?: Record<string, any>;
}

export interface AuditInput {
  brandText: string;
  brandName: string;
  competitors?: string[];
  topics?: string[];
  websiteUrl?: string;
}

const CATEGORY_PROMPTS: Record<AuditCategory, string> = {
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

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  website_readability: "Website Readability",
  metadata_analysis: "Metadata Analysis",
  brand_positioning_consistency: "Brand Positioning Consistency",
  llm_sentiment_alignment: "LLM Sentiment Alignment",
  competitor_differentiation: "Competitor Differentiation",
  source_authority: "Source Authority",
  ai_product_understanding: "How AI Understands Your Product",
};

/**
 * Run a single audit category
 */
export async function runAuditCategory(
  category: AuditCategory,
  input: AuditInput
): Promise<AuditResult> {
  try {
    const { data, error } = await supabase.functions.invoke("run-audit", {
      body: {
        category,
        brandText: input.brandText,
        brandName: input.brandName,
        competitors: input.competitors,
        topics: input.topics,
        websiteUrl: input.websiteUrl,
      },
    });

    if (error) {
      throw error;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      category: data.category,
      score: data.score,
      issues: data.issues || [],
      recommendations: data.recommendations || [],
      details: data.details || {},
    };
  } catch (error: any) {
    console.error(`Error running audit for ${category}:`, error);
    // Return default result on error
    return {
      category,
      score: 0,
      issues: [`Failed to analyze: ${error.message || "Unknown error"}`],
      recommendations: ["Please try again or check your API configuration"],
    };
  }
}

/**
 * Run all audits for a brand
 */
export async function runAudit(input: AuditInput): Promise<AuditResult[]> {
  const categories: AuditCategory[] = [
    "website_readability",
    "metadata_analysis",
    "brand_positioning_consistency",
    "llm_sentiment_alignment",
    "competitor_differentiation",
    "source_authority",
    "ai_product_understanding",
  ];

  const results: AuditResult[] = [];

  for (const category of categories) {
    try {
      const result = await runAuditCategory(category, input);
      results.push(result);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`Error in category ${category}:`, error);
      results.push({
        category,
        score: 0,
        issues: [`Error: ${error.message}`],
        recommendations: [],
      });
    }
  }

  return results;
}

/**
 * Get category label
 */
export function getCategoryLabel(category: AuditCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-gray-900";
  if (score >= 60) return "text-gray-700";
  return "text-gray-600";
}

/**
 * Get score badge color
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-gray-900 text-white border-gray-900";
  if (score >= 60) return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

