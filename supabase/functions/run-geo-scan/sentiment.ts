import { callAI } from "./aiClient.ts";

export async function analyzeSentiment(
  allResponses: string[],
  brandName: string,
  provider: string,
  apiKeys: { geminiApiKey?: string; openaiApiKey?: string }
): Promise<'positive' | 'neutral' | 'negative'> {
  if (!allResponses || allResponses.length === 0) {
    return 'neutral';
  }

  // Combine responses with clear demarcation
  const responsesText = allResponses
    .map((resp, idx) => `Response ${idx + 1}:\n${resp}`)
    .join("\n\n---\n\n");

  const prompt = `You are a sentiment analysis assistant. Your task is to analyze the overall sentiment toward the brand "${brandName}" based on the following search engine answers.

Answers:
${responsesText}

Based on these answers, classify the overall sentiment of "${brandName}" as exactly one of: "positive", "neutral", or "negative".
Return ONLY the classified word in lowercase. Do not provide any other text, reasoning, or markdown.`;

  try {
    const result = await callAI(prompt, provider, apiKeys, 20000);
    const cleanedResult = result.text.trim().toLowerCase();
    
    if (cleanedResult.includes("positive")) return "positive";
    if (cleanedResult.includes("negative")) return "negative";
    return "neutral";
  } catch (error) {
    console.error("Failed to analyze sentiment via Gemini, defaulting to neutral. Error:", error);
    return "neutral";
  }
}
