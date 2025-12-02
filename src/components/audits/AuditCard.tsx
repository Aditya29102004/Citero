import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AuditResult, getScoreColor, getScoreBadgeColor } from "@/lib/audits/runAudit";

interface AuditCardProps {
  overallScore: number;
  onRerun: () => void;
  rerunning?: boolean;
}

export function AuditCard({ overallScore, onRerun, rerunning = false }: AuditCardProps) {
  const scoreColor = getScoreColor(overallScore);
  const badgeColor = getScoreBadgeColor(overallScore);

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Improvement";
    return "Critical";
  };

  return (
    <Card className="p-8 border border-gray-200/80 bg-white shadow-sm rounded-xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Brand Audit</h2>
          <p className="text-gray-600 font-medium">Comprehensive analysis of your brand's AI visibility</p>
        </div>
        <Button
          onClick={onRerun}
          disabled={rerunning}
          variant="outline"
          className="border-gray-200 hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${rerunning ? "animate-spin" : ""}`} />
          {rerunning ? "Running..." : "Re-run Audit"}
        </Button>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className={`text-6xl font-bold ${scoreColor} mb-2 tracking-tight`}>
            {overallScore.toFixed(0)}
          </div>
          <div className="text-sm text-gray-600 font-medium">Overall Score</div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${badgeColor} font-semibold`}>
              {getScoreLabel(overallScore)}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all bg-gray-900"
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

