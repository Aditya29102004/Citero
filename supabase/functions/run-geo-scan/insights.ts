import { callAI } from "./aiClient.ts";

export interface InsightResult {
  actionable_recommendations: Array<{
    action: string;
    priority: "Urgent" | "High" | "Moderate";
    focus_area: "Content" | "SEO" | "PR" | "Partnerships" | "Branding" | "General";
  }>;
  strengths_and_gaps: {
    strengths: string[];
    gaps: string[];
    opportunity_topic: string;
  };
  content_ideas: Array<{
    title: string;
    description: string;
  }>;
}

export async function generateInsights(
  brandName: string,
  visibilityScore: number,
  citationScore: number,
  competitorScores: Record<string, { visibility: number; mentions: number }>,
  overallSentiment: string,
  topics: string[],
  provider: string,
  apiKeys: { geminiApiKey?: string; openaiApiKey?: string }
): Promise<InsightResult> {
  const competitorLines = Object.entries(competitorScores)
    .map(([name, data]) => `- ${name}: Visibility ${data.visibility.toFixed(1)}% (${data.mentions} mentions)`)
    .join("\n");

  const prompt = `You are a strategic brand consultant. Analyze these brand perception metrics for "${brandName}":

Metrics:
- Visibility Score: ${visibilityScore.toFixed(1)}%
- Citation Score: ${citationScore.toFixed(1)}%
- Overall Sentiment: ${overallSentiment}
- Competitors:
${competitorLines || "None mentioned"}
- Topics: ${topics.join(", ") || "None specified"}

Generate strategic recommendations, strengths, gaps, and content ideas in strict JSON format. Do not return any other text, reasoning, or markdown wrappers. The output must match this schema:

{
  "actionable_recommendations": [
    {
      "action": "actionable step title (short, clear, e.g. 'Optimize existing blog SEO')",
      "description": "detailed, specific, and clear actionable steps to implement this recommendation (2-3 sentences)",
      "priority": "Urgent" | "High" | "Moderate",
      "focus_area": "Content" | "SEO" | "PR" | "Partnerships" | "Branding" | "General"
    }
  ],
  "strengths_and_gaps": {
    "strengths": ["string statement"],
    "gaps": ["string statement"],
    "opportunity_topic": "string topic name"
  },
  "content_ideas": [
    {
      "title": "content title string",
      "description": "description string"
    }
  ]
}`;

  try {
    const result = await callAI(prompt, provider, apiKeys, 20000);
    let cleaned = result.text.trim();
    
    // Strip markdown JSON block wrappers if present
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
    
    const parsed = JSON.parse(cleaned);
    const rawRecommendations = parsed.actionable_recommendations || [];
    const actionable_recommendations = rawRecommendations.map((rec: any) => ({
      action: rec.action || rec.title || "",
      description: rec.description || rec.details || rec.reason || "",
      priority: rec.priority || "Moderate",
      focus_area: rec.focus_area || rec.category || "General"
    }));

    return {
      actionable_recommendations,
      strengths_and_gaps: {
        strengths: parsed.strengths_and_gaps?.strengths || [],
        gaps: parsed.strengths_and_gaps?.gaps || [],
        opportunity_topic: parsed.strengths_and_gaps?.opportunity_topic || (topics[0] || "General")
      },
      content_ideas: parsed.content_ideas || []
    };
  } catch (error) {
    console.error("Failed to generate LLM-based insights, falling back to basic insights. Error:", error);
    return {
      actionable_recommendations: [
        {
          action: `Improve visibility of ${brandName} in search results.`,
          description: `Create targeted content and seek mentions on external channels to elevate visibility from the current ${visibilityScore.toFixed(1)}%.`,
          priority: visibilityScore < 50 ? "High" : "Moderate",
          focus_area: "Content"
        }
      ],
      strengths_and_gaps: {
        strengths: [`Visibility is currently at ${visibilityScore.toFixed(1)}%.`],
        gaps: [`Competitor visibility shows room for expansion.`],
        opportunity_topic: topics[0] || "General"
      },
      content_ideas: []
    };
  }
}
