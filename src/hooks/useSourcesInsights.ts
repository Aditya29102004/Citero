import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSourcesInsightsProps {
  sources: Array<{ domain: string; citations: number }>;
  enabled?: boolean;
}

export function useSourcesInsights({ sources, enabled = true }: UseSourcesInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || sources.length === 0) {
      setInsights([]);
      return;
    }

    const generateInsights = async () => {
      setLoading(true);
      try {
        const top10Sources = sources.slice(0, 10);
        const totalCitations = sources.reduce((sum, s) => sum + s.citations, 0);

        // Prepare data for AI
        const sourcesData = top10Sources
          .map((s, idx) => `${idx + 1}. ${s.domain}: ${s.citations} citations`)
          .join("\n");

        const prompt = `Based on these top sources where AI models are pulling information:

${sourcesData}

Total citations: ${totalCitations}

Generate 3-4 concise, actionable insights about these sources. Focus on:
- Which sources dominate (percentage if significant)
- Patterns you notice (authoritative domains, niche blogs, etc.)
- Opportunities for outreach or SEO improvement
- Trends or notable observations

Return ONLY a JSON array of insight strings, no other text. Example format:
["Wikipedia accounts for 43% of all citations this week.", "Medium and Forbes gained visibility compared to last week.", "AI is relying mostly on authoritative, evergreen domains."]`;

        // Call OpenRouter API
        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
          // Fallback to simple insights
          setInsights([
            `${top10Sources[0]?.domain || "Top source"} accounts for ${top10Sources[0] ? Math.round((top10Sources[0].citations / totalCitations) * 100) : 0}% of all citations.`,
            `AI models are referencing ${sources.length} unique sources.`,
            `Focus on improving SEO for top-cited domains to influence AI outputs.`,
          ]);
          setLoading(false);
          return;
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://citero.com",
            "X-Title": "Citero Brand Tracker",
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-7b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate insights");
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        // Parse JSON array from response
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setInsights(Array.isArray(parsed) ? parsed : []);
          } else {
            throw new Error("No JSON array found");
          }
        } catch {
          // Fallback to simple insights
          setInsights([
            `${top10Sources[0]?.domain || "Top source"} is the most cited source with ${top10Sources[0]?.citations || 0} citations.`,
            `AI models are referencing ${sources.length} unique sources.`,
            `Consider outreach to top-cited domains for better brand visibility.`,
          ]);
        }
      } catch (error) {
        console.error("Error generating insights:", error);
        // Fallback insights
        const top10Sources = sources.slice(0, 10);
        const totalCitations = sources.reduce((sum, s) => sum + s.citations, 0);
        setInsights([
          `${top10Sources[0]?.domain || "Top source"} accounts for ${top10Sources[0] ? Math.round((top10Sources[0].citations / totalCitations) * 100) : 0}% of all citations.`,
          `AI models are referencing ${sources.length} unique sources.`,
          `Focus on improving SEO for top-cited domains to influence AI outputs.`,
        ]);
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, [sources, enabled]);

  return { insights, loading };
}

