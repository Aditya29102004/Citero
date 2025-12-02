import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Lightbulb, Loader2 } from "lucide-react";
import { Competitor } from "@/hooks/useCompetitors";
import { supabase } from "@/integrations/supabase/client";

interface CompetitorInsightsProps {
  competitors: Competitor[];
  brandId: string | null;
}

export function CompetitorInsights({ competitors, brandId }: CompetitorInsightsProps) {
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (competitors.length === 0 || !brandId) {
      setLoading(false);
      return;
    }

    const generateInsights = async () => {
      setLoading(true);
      try {
        // Get brand name
        const { data: brand } = await supabase
          .from("brands")
          .select("name")
          .eq("id", brandId)
          .single();

        const topCompetitors = competitors.slice(0, 5);
        const topCompetitor = topCompetitors[0];

        // Prepare data for AI
        const insightData = {
          brandName: brand?.name || "Your brand",
          topCompetitor: topCompetitor?.competitor_name || "N/A",
          competitorData: topCompetitors.map((c) => ({
            name: c.competitor_name,
            mentions: c.total_mentions,
            visibility: c.visibility_score,
            sentiment: c.sentiment_breakdown,
            topics: c.topics_detected.slice(0, 5),
          })),
        };

        // Call OpenRouter API for insights
        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
          setInsights("AI insights unavailable. Please configure OpenRouter API key.");
          setLoading(false);
          return;
        }

        const prompt = `Analyze competitor data and provide 3-5 bullet point insights in markdown format:

Brand: ${insightData.brandName}
Top Competitor: ${insightData.topCompetitor}
Competitor Data: ${JSON.stringify(insightData.competitorData, null, 2)}

Provide insights on:
1. Why the top competitor is leading
2. What categories/topics you're losing in
3. Which topics are missing from your coverage
4. Suggested content to publish next

Format as markdown bullet points.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Unifr Competitor Insights",
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-7b-instruct",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate insights");
        }

        const data = await response.json();
        const generatedInsights = data.choices?.[0]?.message?.content || "";

        setInsights(generatedInsights || "Unable to generate insights at this time.");
      } catch (error) {
        console.error("Error generating insights:", error);
        // Fallback insights
        const topCompetitor = competitors[0];
        setInsights(
          `**Key Insights:**\n\n` +
            `- **Top Competitor:** ${topCompetitor?.competitor_name || "N/A"} leads with ${topCompetitor?.visibility_score || 0} visibility score\n` +
            `- **Mention Gap:** They have ${topCompetitor?.total_mentions || 0} mentions vs your brand\n` +
            `- **Focus Areas:** Consider creating content around ${topCompetitor?.topics_detected.slice(0, 3).join(", ") || "key topics"}\n` +
            `- **Next Steps:** Run more GEO scans to track competitor movements`
        );
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, [competitors, brandId]);

  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="h-5 w-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="h-5 w-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
      </div>
      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {insights.split('\n').map((line, i) => (
          <p key={i} className="mb-2">{line}</p>
        ))}
      </div>
    </Card>
  );
}

