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
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
        </div>
      </Card>
    );
  }

  if (!insights || Object.keys(insights).length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border border-gray-200 bg-white bg-gradient-to-br from-blue-50/50 to-purple-50/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
          <Target className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Blog Impact Insights</h3>
      </div>

      <div className="space-y-4">
        {insights.visibilityScoreImprovement !== undefined && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Visibility Score Improvement</p>
              <p className="text-xs text-gray-600">Estimated +{insights.visibilityScoreImprovement}% boost</p>
            </div>
          </div>
        )}

        {insights.topicsReinforced && insights.topicsReinforced.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Topics Reinforced
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.topicsReinforced.map((topic, idx) => (
                <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insights.competitorsOutranked && insights.competitorsOutranked.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Competitors Outranked
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.competitorsOutranked.map((competitor, idx) => (
                <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {competitor}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {insights.sourcesAligned && insights.sourcesAligned.length > 0 && (
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">Sources Aligned</p>
            <div className="space-y-1">
              {insights.sourcesAligned.slice(0, 3).map((source, idx) => (
                <p key={idx} className="text-xs text-gray-600 truncate">{source}</p>
              ))}
            </div>
          </div>
        )}

        {insights.sentimentInfluence && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Sentiment Influence</p>
              <Badge
                variant="outline"
                className={
                  insights.sentimentInfluence === "positive"
                    ? "bg-green-50 text-green-700 border-green-200 mt-1"
                    : insights.sentimentInfluence === "negative"
                    ? "bg-red-50 text-red-700 border-red-200 mt-1"
                    : "bg-gray-50 text-gray-700 border-gray-200 mt-1"
                }
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

