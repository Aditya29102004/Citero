import { supabase } from "@/integrations/supabase/client";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const FALLBACK_MODEL = "qwen/qwen-2.5-7b-instruct";

export interface EmailContent {
  subject: string;
  body: string;
}

export interface BrandInfo {
  name: string;
  description?: string;
  website?: string;
}

export interface TargetInfo {
  personName: string;
  personRole?: string;
  companyName?: string;
  sourceUrl: string;
  articleTitle?: string;
  citationCount: number;
  citationContexts?: string[];
}

/**
 * Generate outreach email using AI
 */
export async function generateEmail(
  target: TargetInfo,
  brandInfo: BrandInfo,
  citationContexts?: string[]
): Promise<EmailContent> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const citationContextText = citationContexts
    ? citationContexts.slice(0, 5).join("\n\n---\n\n")
    : `This source has been cited ${target.citationCount} times by AI models when discussing topics related to ${brandInfo.name}.`;

  const prompt = `Write a professional outreach email for ${brandInfo.name} to ${target.personName}${target.personRole ? `, ${target.personRole}` : ""}${target.companyName ? ` at ${target.companyName}` : ""}.

Brand Information:
- Name: ${brandInfo.name}
${brandInfo.description ? `- Description: ${brandInfo.description}` : ""}
${brandInfo.website ? `- Website: ${brandInfo.website}` : ""}

Target Information:
- Name: ${target.personName}
${target.personRole ? `- Role: ${target.personRole}` : ""}
${target.companyName ? `- Company: ${target.companyName}` : ""}
- Source: ${target.sourceUrl}
${target.articleTitle ? `- Article: ${target.articleTitle}` : ""}

Context:
${citationContextText}

Requirements:
1. Subject line should be clear, personalized, and compelling (max 60 characters)
2. Email body should be:
   - Professional but friendly
   - Mention the specific article/source
   - Explain why ${brandInfo.name} is relevant
   - Reference the AI citations naturally
   - Include a clear call-to-action
   - Keep it concise (3-4 paragraphs max)
   - No hard sell, focus on value and relevance

Return your response as a JSON object with these exact keys:
{
  "subject": "Email subject line",
  "body": "Email body in plain text (use line breaks for paragraphs)"
}`;

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
        temperature: 0.7,
        max_tokens: 1000,
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

    let emailContent: any;
    try {
      emailContent = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        emailContent = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    if (!emailContent.subject || !emailContent.body) {
      throw new Error("Invalid email content structure");
    }

    return {
      subject: emailContent.subject.trim(),
      body: emailContent.body.trim(),
    };
  } catch (error: any) {
    console.error("Error generating email:", error);
    throw error;
  }
}

