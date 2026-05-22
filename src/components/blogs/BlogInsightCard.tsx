import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Users, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogInsightCardProps {
  insights: {
    visibilityScoreImprovement?: number;
    topicsReinforced?: string[];
    competitorsOutranked?: string[];
    sourcesAligned?: string[];
    sentimentInfluence?: "positive" | "neutral" | "negative";
  };
  loading?: boolean;
}

export function BlogInsightCard({ insights, loading }: BlogInsightCardProps) {
  if (loading) {
    return (
      <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
        <div className="space-y-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
        </div>
      </Card>
    );
  }

  if (!insights || Object.keys(insights).length === 0) {
    return null;
  }

  return (
    <Card className="p-5 border border-slate-200 bg-white shadow-sm rounded-xl">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 bg-slate-900 text-white rounded-lg">
          <Target className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Blog Impact</h3>
      </div>

      <div className="space-y-4">
        {insights.visibilityScoreImprovement !== undefined && (
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <TrendingUp className="h-5 w-5 text-slate-800" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500">Visibility Boost</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Estimated +{insights.visibilityScoreImprovement}%</p>
            </div>
          </div>
        )}

        {insights.topicsReinforced && insights.topicsReinforced.length > 0 && (
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Topics Reinforced
            </p>
            <div className="flex flex-wrap gap-1.5">
              {insights.topicsReinforced.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="bg-white text-slate-800 border-slate-200 font-medium text-[10px] rounded px-1.5 py-0.5">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insights.competitorsOutranked && insights.competitorsOutranked.length > 0 && (
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Competitors Outranked
            </p>
            <div className="flex flex-wrap gap-1.5">
              {insights.competitorsOutranked.map((competitor, idx) => (
                <Badge key={idx} variant="outline" className="bg-white text-slate-800 border-slate-200 font-medium text-[10px] rounded px-1.5 py-0.5">
                  {competitor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insights.sourcesAligned && insights.sourcesAligned.length > 0 && (
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Sources Aligned</p>
            <div className="space-y-1">
              {insights.sourcesAligned.slice(0, 3).map((source, idx) => (
                <p key={idx} className="text-xs text-slate-750 truncate">• {source}</p>
              ))}
            </div>
          </div>
        )}

        {insights.sentimentInfluence && (
          <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <AlertCircle className="h-5 w-5 text-slate-800" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500">Sentiment Influence</p>
              <Badge
                variant="outline"
                className={`mt-1 font-semibold text-[10px] rounded px-1.5 py-0.5 border ${
                  insights.sentimentInfluence === "positive"
                    ? "bg-slate-900 text-white border-slate-900"
                    : insights.sentimentInfluence === "negative"
                    ? "bg-slate-100 text-slate-800 border-slate-350"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {insights.sentimentInfluence.charAt(0).toUpperCase() + insights.sentimentInfluence.slice(1)}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

