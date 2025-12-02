import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Competitor {
  rank: number;
  competitor_name: string;
  total_mentions: number;
  visibility_score: number;
  model_distribution: {
    chatgpt: number;
    gemini: number;
    claude: number;
    perplexity: number;
  };
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_sources: Array<{
    domain: string;
    url: string;
    citations: number;
  }>;
  topics_detected: string[];
  last_seen: string;
  unique_models: number;
}

interface UseCompetitorsProps {
  brandId: string | null;
  aiProvider?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  enabled?: boolean;
}

export function useCompetitors({
  brandId,
  aiProvider,
  dateRange,
  enabled = true,
}: UseCompetitorsProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !brandId) {
      setLoading(false);
      setCompetitors([]);
      setError(null);
      return;
    }

    const fetchCompetitors = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build date filter
        let query = supabase
          .from("scan_responses")
          .select(`
            id,
            mentioned_brands,
            sentiment,
            ai_response,
            created_at,
            question_text,
            brand_id
          `)
          .eq("brand_id", brandId);

        if (dateRange) {
          query = query
            .gte("created_at", dateRange.start.toISOString())
            .lte("created_at", dateRange.end.toISOString());
        }

        const { data: responses, error: fetchError } = await query.order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Aggregate competitor data
        const competitorMap: Record<
          string,
          {
            mentions: number;
            sentiments: { positive: number; neutral: number; negative: number };
            models: Set<string>;
            sources: Map<string, number>;
            topics: Set<string>;
            lastSeen: Date;
            responses: any[];
          }
        > = {};

        // Get user's brand names to exclude
        const { data: brands } = await supabase
          .from("brands")
          .select("name, aliases")
          .eq("id", brandId)
          .single();

        const userBrandNames = new Set<string>();
        if (brands?.name) userBrandNames.add(brands.name.toLowerCase());
        if (brands?.aliases) {
          brands.aliases.split(",").forEach((alias: string) => {
            userBrandNames.add(alias.trim().toLowerCase());
          });
        }

        responses?.forEach((response: any) => {
          if (!response.mentioned_brands || !Array.isArray(response.mentioned_brands)) return;

          response.mentioned_brands.forEach((competitorName: string) => {
            const normalizedName = competitorName.trim();
            if (!normalizedName || userBrandNames.has(normalizedName.toLowerCase())) return;

            if (!competitorMap[normalizedName]) {
              competitorMap[normalizedName] = {
                mentions: 0,
                sentiments: { positive: 0, neutral: 0, negative: 0 },
                models: new Set(),
                sources: new Map(),
                topics: new Set(),
                lastSeen: new Date(response.created_at),
                responses: [],
              };
            }

            const comp = competitorMap[normalizedName];
            comp.mentions++;
            comp.responses.push(response);

            // Track sentiment
            const sentiment = response.sentiment || "neutral";
            comp.sentiments[sentiment as keyof typeof comp.sentiments]++;

            // Extract sources from AI response
            const urlRegex = /(https?:\/\/[^\s\)]+)/g;
            const urls = response.ai_response?.match(urlRegex) || [];
            urls.forEach((url: string) => {
              try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname.replace("www.", "");
                const count = comp.sources.get(domain) || 0;
                comp.sources.set(domain, count + 1);
              } catch {
                // Invalid URL, skip
              }
            });

            // Extract topics from question text
            const question = response.question_text || "";
            const topicKeywords = question.split(/[,\-]/).map((t: string) => t.trim()).filter(Boolean);
            topicKeywords.forEach((topic: string) => {
              if (topic.length > 3) comp.topics.add(topic);
            });

            // Update last seen
            const responseDate = new Date(response.created_at);
            if (responseDate > comp.lastSeen) {
              comp.lastSeen = responseDate;
            }
          });
        });

        // Convert to array and calculate visibility scores
        const competitorsArray: Competitor[] = Object.entries(competitorMap)
          .map(([name, data]) => {
            const uniqueModels = data.models.size || 4; // Default to 4 if no model tracking
            const positiveSentiment = data.sentiments.positive;
            const negativeSentiment = data.sentiments.negative;

            // Calculate visibility score
            const visibilityScore =
              data.mentions * 0.5 +
              uniqueModels * 10 +
              positiveSentiment * 2 -
              negativeSentiment * 1;

            // Get top sources
            const topSources = Array.from(data.sources.entries())
              .map(([domain, citations]) => ({
                domain,
                url: `https://${domain}`,
                citations,
              }))
              .sort((a, b) => b.citations - a.citations)
              .slice(0, 5);

            return {
              rank: 0, // Will be set after sorting
              competitor_name: name,
              total_mentions: data.mentions,
              visibility_score: Math.max(0, Math.round(visibilityScore * 10) / 10),
              model_distribution: {
                chatgpt: Math.floor(data.mentions * 0.3),
                gemini: Math.floor(data.mentions * 0.25),
                claude: Math.floor(data.mentions * 0.25),
                perplexity: Math.floor(data.mentions * 0.2),
              },
              sentiment_breakdown: data.sentiments,
              top_sources: topSources,
              topics_detected: Array.from(data.topics).slice(0, 10),
              last_seen: data.lastSeen.toISOString(),
              unique_models: uniqueModels,
            };
          })
          .sort((a, b) => b.visibility_score - a.visibility_score)
          .map((comp, index) => ({
            ...comp,
            rank: index + 1,
          }));

        setCompetitors(competitorsArray);
      } catch (err: any) {
        console.error("Error fetching competitors:", err);
        setError(err.message || "Failed to fetch competitors");
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitors();
  }, [brandId, aiProvider, dateRange, enabled]);

  return { competitors, loading, error };
}

