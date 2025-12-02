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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { PromptRun } from "./PromptTable";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface PromptRunDrawerProps {
  run: PromptRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
}

const SENTIMENT_COLORS = {
  positive: "#10b981",
  neutral: "#6b7280",
  negative: "#ef4444",
};

export function PromptRunDrawer({
  run,
  open,
  onOpenChange,
  brandName,
}: PromptRunDrawerProps) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!run || !open) return;

    const generateRecommendations = async () => {
      setLoading(true);
      try {
        const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
          setLoading(false);
          return;
        }

        // Generate recommendations
        const recPrompt = `Based on this prompt simulation result, provide 3-5 actionable recommendations for ${brandName} to improve visibility for: "${run.prompt_text}"

Current status:
- Brand mentioned: ${run.brand_mentioned ? 'Yes' : 'No'}
- Visibility score: ${run.visibility_score}
- Sentiment: ${run.sentiment || 'neutral'}
- Competitors found: ${run.competitors.length}

Provide concise, actionable recommendations as a numbered list.`;

        try {
          const recResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": window.location.origin,
              "X-Title": "Unifr Prompt Simulator",
            },
            body: JSON.stringify({
              model: "qwen/qwen-2.5-7b-instruct",
              messages: [{ role: "user", content: recPrompt }],
              temperature: 0.7,
              max_tokens: 400,
            }),
          });

          if (recResponse.ok) {
            const recData = await recResponse.json();
            const recText = recData.choices?.[0]?.message?.content || "";
            // Parse numbered list
            const recs = recText
              .split(/\d+[\.\)]/)
              .map((r) => r.trim())
              .filter((r) => r.length > 0)
              .slice(0, 5);
            setRecommendations(recs);
          }
        } catch (error) {
          console.error("Error generating recommendations:", error);
          setRecommendations([]);
        }
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [run, open, brandName]);

  if (!run) return null;

  const sentimentData = [
    { name: "Positive", value: run.sentiment === "positive" ? 1 : 0, color: SENTIMENT_COLORS.positive },
    { name: "Neutral", value: run.sentiment === "neutral" ? 1 : 0, color: SENTIMENT_COLORS.neutral },
    { name: "Negative", value: run.sentiment === "negative" ? 1 : 0, color: SENTIMENT_COLORS.negative },
  ].filter((item) => item.value > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Prompt Run Details</SheetTitle>
          <SheetDescription>Detailed analysis of this simulation run</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Prompt Text */}
          <Card className="p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Prompt Text</h3>
            <p className="text-sm text-gray-700">{run.prompt_text}</p>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Visibility Score</div>
              <div className="text-2xl font-bold text-gray-900">{run.visibility_score.toFixed(1)}</div>
            </Card>
            <Card className="p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Brand Mentioned</div>
              <div className="flex items-center gap-2">
                {run.brand_mentioned ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-gray-400" />
                )}
                <span className="text-sm font-medium">
                  {run.brand_mentioned ? "Yes" : "No"}
                </span>
              </div>
            </Card>
          </div>

          {/* Sentiment Chart */}
          {sentimentData.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment</h3>
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

          {/* Summary */}
          <Card className="p-4 border border-gray-200 bg-blue-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {run.brand_mentioned ? (
                <p>
                  <span className="font-medium text-green-700">✓ Your brand was mentioned</span> in the AI response with a visibility score of <span className="font-medium">{run.visibility_score.toFixed(1)}%</span>.
                </p>
              ) : (
                <p>
                  <span className="font-medium text-gray-700">Your brand was not mentioned</span> in the AI response. This indicates an opportunity to improve visibility for this type of query.
                </p>
              )}
              {run.competitors.length > 0 && (
                <p>
                  <span className="font-medium">{run.competitors.length} competitor{run.competitors.length !== 1 ? 's' : ''}</span> were mentioned instead, highlighting the competitive landscape.
                </p>
              )}
            </div>
          </Card>

          {/* Competitors */}
          {run.competitors.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Competitors Found ({run.competitors.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {run.competitors.map((comp, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    {comp}
                  </Badge>
                ))}
              </div>
              {!run.brand_mentioned && (
                <p className="text-xs text-gray-500 mt-3 italic">
                  These competitors were mentioned instead of your brand, indicating areas for improvement.
                </p>
              )}
            </Card>
          )}

          {/* Sources */}
          {run.sources && run.sources.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Source Citations ({run.sources.length})
              </h3>
              <div className="space-y-2">
                {run.sources.slice(0, 10).map((source: string, idx: number) => (
                  <a
                    key={idx}
                    href={source.startsWith("http") ? source : `https://${source}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{source}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Actions</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating recommendations...
              </div>
            ) : recommendations.length > 0 ? (
              <ul className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">
                {run.brand_mentioned 
                  ? "Continue building on your current visibility to maintain your competitive position."
                  : "Focus on creating content that addresses this query type to improve your brand's visibility."}
              </p>
            )}
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

