import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SourceData {
  rank: number;
  domain: string;
  url: string;
  citations: number;
  lastSeen: string;
  aiProvider?: string;
}

interface UseSourcesDataProps {
  brandId: string | null;
  aiProvider: string;
  dateRange: string;
  enabled?: boolean;
}

export function useSourcesData({
  brandId,
  aiProvider,
  dateRange,
  enabled = true,
}: UseSourcesDataProps) {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !brandId) {
      setSources([]);
      setLoading(false);
      return;
    }

    const fetchSources = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // All time
        }

        // Fetch scan responses (AI provider is not stored in scans table, so we can't filter by it)
        let query = supabase
          .from("scan_responses")
          .select(`
            ai_response,
            created_at,
            scan_id
          `)
          .eq("brand_id", brandId)
          .gte("created_at", startDate.toISOString());

        const { data: responses, error: responsesError } = await query;

        if (responsesError) throw responsesError;

        // Extract URLs from AI responses
        const sourceMap: Record<
          string,
          {
            citations: number;
            lastSeen: string;
            providers: Set<string>;
          }
        > = {};

        responses?.forEach((response: any) => {
          // Note: AI provider filtering is not available since it's not stored in the database
          // We'll show all sources regardless of provider filter

          // Extract URLs from AI response
          const urlRegex = /(https?:\/\/[^\s\)]+)/g;
          const urls = response.ai_response?.match(urlRegex) || [];

          urls.forEach((url: string) => {
            try {
              const urlObj = new URL(url);
              const domain = urlObj.hostname.replace("www.", "");
              const cleanUrl = urlObj.origin + urlObj.pathname;

              if (!sourceMap[cleanUrl]) {
                sourceMap[cleanUrl] = {
                  citations: 0,
                  lastSeen: response.created_at,
                  providers: new Set(),
                };
              }

              sourceMap[cleanUrl].citations++;
              // Note: Provider tracking removed since ai_provider is not in scans table
              
              // Update last seen if this is more recent
              if (new Date(response.created_at) > new Date(sourceMap[cleanUrl].lastSeen)) {
                sourceMap[cleanUrl].lastSeen = response.created_at;
              }
            } catch {
              // Invalid URL, skip
            }
          });
        });

        // Convert to array and sort
        const sourcesArray: SourceData[] = Object.entries(sourceMap)
          .map(([url, data]) => {
            const urlObj = new URL(url);
            return {
              rank: 0, // Will be set after sorting
              domain: urlObj.hostname.replace("www.", ""),
              url: url,
              citations: data.citations,
              lastSeen: data.lastSeen,
              aiProvider: undefined, // Not available since ai_provider column doesn't exist
            };
          })
          .sort((a, b) => b.citations - a.citations)
          .map((source, idx) => ({
            ...source,
            rank: idx + 1,
          }));

        setSources(sourcesArray);
      } catch (err: any) {
        console.error("Error fetching sources:", err);
        setError(err.message || "Failed to fetch sources");
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, [brandId, aiProvider, dateRange, enabled]);

  return { sources, loading, error };
}

