import { callAI } from "./aiClient.ts";

export function generateQuestions(brandName: string, topics: string[]): string[] {
  const t = topics && topics[0] ? topics[0] : 'startup';
  
  return [
    // Core Alternatives and Competitors (1-7)
    `Who are the most credible alternatives to ${brandName}?`,
    `Which platforms compete directly with ${brandName} for emerging founders?`,
    `How does ${brandName} compare to other discovery tools?`,
    `What are the top brands in the ${t} space?`,
    `Which platforms are considered the most reliable alternatives to ${brandName}?`,
    `What makes ${brandName} unique compared to its industry competitors?`,
    `Who are the leading players in the ${t} market?`,

    // Pricing, Value, and ROI (8-10)
    `Is ${brandName} considered too expensive compared to its alternatives?`,
    `What are the best budget-friendly alternatives to ${brandName}?`,
    `Which platforms in the ${t} space offer the best value for money?`,

    // Usability, Support, and Sentiment (11-15)
    `Which platform has the best customer support instead of ${brandName}?`,
    `Is ${brandName} easier to use than its top competitors?`,
    `What features does ${brandName} lack that competitors have?`,
    `What are the major bugs or downfalls of using ${brandName}?`,
    `Are people switching away from ${brandName} in recent months?`
  ];
}

export async function generateAIQuestions(
  brandName: string,
  description: string,
  topics: string[],
  competitors: string[],
  provider: string,
  apiKeys: any
): Promise<string[]> {
  const competitorContext = competitors && competitors.length > 0
    ? `- Known Competitors: ${competitors.join(", ")}`
    : "";
  const topicContext = topics && topics.length > 0
    ? `- Key Industry Topics: ${topics.join(", ")}`
    : "";

  const prompt = `You are a market research assistant. Your task is to generate exactly 15 distinct, highly realistic search queries or questions that potential customers, users, or industry analysts would type into an AI search engine (such as ChatGPT, Gemini, or Perplexity) when discovering, comparing, or researching the brand "${brandName}".

Brand Context:
- Brand Name: ${brandName}
${description ? `- Description: ${description}` : ""}
${topicContext}
${competitorContext}

Guidelines for generating the 15 questions:
1. Ensure the questions are highly specific to the brand's industry, category, and features. Do not use generic placeholders.
2. The questions must be split into three specific categories:
   - Core Alternatives, Competitors & Category Discovery (7 questions)
     Examples: "Who are the top alternatives to ${brandName}?", "Which platforms compete with ${brandName} in the [Industry] space?", etc.
   - Pricing, Value, and ROI (3 questions)
     Examples: "Is ${brandName} worth the price compared to its competitors?", "What is the cheapest alternative to ${brandName} for [industry]?", etc.
   - Usability, Features, Support, and Downfalls (5 questions)
     Examples: "What features does ${brandName} lack compared to its rivals?", "Which platform has better customer support: ${brandName} or [Competitor]?", etc.
3. Return ONLY a valid JSON array of 15 strings. Do not include markdown code block syntax or any other text.
Format example:
[
  "Question 1?",
  "Question 2?",
  ...
]`;

  try {
    console.log(`Generating custom dynamic questions via AI provider: ${provider}...`);
    const aiResult = await callAI(prompt, provider, apiKeys, 25000);
    let cleaned = aiResult.text.trim();
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      const filtered = parsed.filter(q => typeof q === 'string' && q.trim().length > 5);
      if (filtered.length >= 10) {
        console.log(`Successfully generated ${filtered.length} customized questions.`);
        return filtered.slice(0, 15);
      }
    }
    throw new Error("Invalid question structure returned by AI");
  } catch (err: any) {
    console.warn("AI question generation failed, falling back to static template. Error:", err.message);
    return generateQuestions(brandName, topics);
  }
}
