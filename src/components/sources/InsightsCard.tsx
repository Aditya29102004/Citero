import { Card } from "@/components/ui/card";
import { Lightbulb, Sparkles } from "lucide-react";
import { AnimatedText } from "@/components/AnimatedText";

interface InsightsCardProps {
  insights: string[];
  loading?: boolean;
}

export function InsightsCard({ insights, loading }: InsightsCardProps) {
  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
        </div>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
        </div>
        <p className="text-sm text-gray-600">Run a GEO scan to generate insights about your sources.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-gray-200 bg-white bg-gradient-to-br from-blue-50/50 to-purple-50/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">AI-Generated Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

