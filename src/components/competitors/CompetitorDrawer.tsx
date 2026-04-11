import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink, TrendingUp } from "lucide-react";
import { Competitor } from "@/hooks/useCompetitors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface CompetitorDrawerProps {
  competitor: Competitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string | null;
}

export function CompetitorDrawer({
  competitor,
  open,
  onOpenChange,
  brandId,
}: CompetitorDrawerProps) {
  const [summary, setSummary] = useState<string>("");
  const [mentionsOverTime, setMentionsOverTime] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!competitor || !open) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Generate AI summary
        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (OPENROUTER_API_KEY) {
          const prompt = `Provide a brief 2-3 sentence summary about ${competitor.competitor_name} based on:
- Total mentions: ${competitor.total_mentions}
- Visibility score: ${competitor.visibility_score}
- Sentiment: ${JSON.stringify(competitor.sentiment_breakdown)}
- Top topics: ${competitor.topics_detected.slice(0, 5).join(", ")}

Keep it concise and professional.`;

          try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Citero Competitor Analysis",
              },
              body: JSON.stringify({
                model: "qwen/qwen-2.5-7b-instruct",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 200,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              setSummary(data.choices?.[0]?.message?.content || "");
            }
          } catch (error) {
            console.error("Error generating summary:", error);
          }
        }

        // Fetch mentions over time
        if (brandId) {
          const { data: responses } = await supabase
            .from("scan_responses")
            .select("mentioned_brands, created_at, brand_id")
            .eq("brand_id", brandId)
            .order("created_at", { ascending: true });

          // Group by date
          const dateMap: Record<string, number> = {};
          responses?.forEach((response: any) => {
            if (
              response.mentioned_brands &&
              Array.isArray(response.mentioned_brands) &&
              response.mentioned_brands.includes(competitor.competitor_name)
            ) {
              const date = new Date(response.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              dateMap[date] = (dateMap[date] || 0) + 1;
            }
          });

          setMentionsOverTime(
            Object.entries(dateMap).map(([date, count]) => ({ date, mentions: count }))
          );
        }
      } catch (error) {
        console.error("Error fetching competitor details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [competitor, open, brandId]);

  if (!competitor) return null;

  const sentimentData = [
    { name: "Positive", value: competitor.sentiment_breakdown.positive, color: "#10b981" },
    { name: "Neutral", value: competitor.sentiment_breakdown.neutral, color: "#6b7280" },
    { name: "Negative", value: competitor.sentiment_breakdown.negative, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const modelData = Object.entries(competitor.model_distribution)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    .filter((item) => item.value > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-gray-900">
            {competitor.competitor_name}
          </SheetTitle>
          <SheetDescription>
            Detailed competitor analysis and insights
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : (
            summary && (
              <Card className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
              </Card>
            )
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Visibility Score</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <span className="text-2xl font-bold text-gray-900">
                  {competitor.visibility_score.toFixed(1)}
                </span>
              </div>
            </Card>
            <Card className="p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Mentions</div>
              <div className="text-2xl font-bold text-gray-900">
                {competitor.total_mentions}
              </div>
            </Card>
          </div>

          {/* Sentiment Chart */}
          {sentimentData.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Sentiment Breakdown</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Mentions Over Time */}
          {mentionsOverTime.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Mentions Over Time</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mentionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="mentions"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Model Distribution */}
          {modelData.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Model Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={modelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Top Topics */}
          {competitor.topics_detected.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Topics They Rank For</h4>
              <div className="flex flex-wrap gap-2">
                {competitor.topics_detected.slice(0, 10).map((topic, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Top Sources */}
          {competitor.top_sources.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Top Influencing Sources</h4>
              <div className="space-y-2">
                {competitor.top_sources.slice(0, 5).map((source, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-700">{source.domain}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {source.citations} citations
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* How to Beat */}
          {summary && (
            <Card className="p-4 bg-teal-50 border border-teal-200">
              <h4 className="font-semibold text-gray-900 mb-2">How to Beat This Competitor</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Focus on topics: {competitor.topics_detected.slice(0, 3).join(", ")}</li>
                <li>Improve visibility on top sources they're using</li>
                <li>Create content that addresses their weaknesses</li>
                <li>Run more GEO scans to track their movements</li>
              </ul>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

