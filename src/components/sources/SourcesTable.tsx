import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ExternalLink, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Source {
  rank: number;
  domain: string;
  url: string;
  citations: number;
  lastSeen: string;
  aiProvider?: string;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recentCitations?: Array<{
    id: string;
    snippet: string;
    question: string;
    date: string;
    sentiment: string;
  }>;
}

interface SourcesTableProps {
  sources: Source[];
  brandId?: string;
  loading?: boolean;
}

export function SourcesTable({ sources, brandId, loading }: SourcesTableProps) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sourceDetails, setSourceDetails] = useState<{
    sentiment: { positive: number; neutral: number; negative: number };
    recentCitations: Array<{
      id: string;
      snippet: string;
      question: string;
      date: string;
      sentiment: string;
    }>;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleRowClick = async (source: Source) => {
    setSelectedSource(source);
    setDrawerOpen(true);
    setDetailsLoading(true);

    if (!brandId) return;

    try {
      // Fetch scan responses that contain this URL
      const { data: responses } = await supabase
        .from("scan_responses")
        .select(`
          id,
          ai_response,
          question_text,
          sentiment,
          created_at,
          brand_id
        `)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Filter responses that contain this URL
      const matchingResponses = responses?.filter((r) =>
        r.ai_response?.includes(source.url)
      ) || [];

      // Calculate sentiment breakdown
      const sentiment = {
        positive: matchingResponses.filter((r) => r.sentiment === "positive").length,
        neutral: matchingResponses.filter((r) => r.sentiment === "neutral" || !r.sentiment).length,
        negative: matchingResponses.filter((r) => r.sentiment === "negative").length,
      };

      // Get recent citations with snippets
      const recentCitations = matchingResponses.slice(0, 10).map((r) => {
        // Extract snippet around the URL
        const urlIndex = r.ai_response?.indexOf(source.url) || -1;
        const snippetStart = Math.max(0, urlIndex - 100);
        const snippetEnd = Math.min((r.ai_response?.length || 0), urlIndex + source.url.length + 100);
        const snippet = r.ai_response?.substring(snippetStart, snippetEnd) || "";

        return {
          id: r.id,
          snippet: snippet.trim(),
          question: r.question_text || "",
          date: r.created_at,
          sentiment: r.sentiment || "neutral",
        };
      });

      setSourceDetails({ sentiment, recentCitations });
    } catch (error) {
      console.error("Error fetching source details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card className="p-12 text-center border border-gray-200 bg-white">
        <p className="text-gray-600 mb-2">No sources found</p>
        <p className="text-sm text-gray-500">Sources will appear here as AI models reference your brand.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 border border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Domain</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">URL</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Citations</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Last Seen</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr
                  key={source.url}
                  onClick={() => handleRowClick(source)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-lg font-semibold text-gray-600">#{source.rank}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{source.domain}</span>
                  </td>
                  <td className="py-4 px-4">
                    <a
                      href={source.url.startsWith("http") ? source.url : `https://${source.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 max-w-md truncate"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-gray-900">{source.citations.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm text-gray-600">{formatDate(source.lastSeen)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedSource && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSource.domain}</SheetTitle>
                <SheetDescription>
                  <a
                    href={selectedSource.url.startsWith("http") ? selectedSource.url : `https://${selectedSource.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {selectedSource.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {detailsLoading ? (
                  <div className="space-y-4">
                    <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Citations</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedSource.citations.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Last Seen</p>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(selectedSource.lastSeen)}</p>
                      </div>
                    </div>

                    {sourceDetails?.sentiment && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Sentiment Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Positive</span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {sourceDetails.sentiment.positive}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Neutral</span>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {sourceDetails.sentiment.neutral}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Negative</span>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {sourceDetails.sentiment.negative}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {sourceDetails?.recentCitations && sourceDetails.recentCitations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Citations</h4>
                        <div className="space-y-4">
                          {sourceDetails.recentCitations.map((citation, idx) => (
                            <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 mb-2">{citation.question}</p>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-3">{citation.snippet}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{formatDate(citation.date)}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    citation.sentiment === "positive"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : citation.sentiment === "negative"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-gray-50 text-gray-700 border-gray-200"
                                  }
                                >
                                  {citation.sentiment}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

