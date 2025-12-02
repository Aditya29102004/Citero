import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, TrendingUp, ExternalLink } from "lucide-react";
import { Competitor } from "@/hooks/useCompetitors";
import { cn } from "@/lib/utils";

interface CompetitorTableProps {
  competitors: Competitor[];
  loading?: boolean;
  onRowClick: (competitor: Competitor) => void;
}

type SortField = "rank" | "competitor_name" | "visibility_score" | "total_mentions";
type SortDirection = "asc" | "desc";

export function CompetitorTable({ competitors, loading, onRowClick }: CompetitorTableProps) {
  const [sortField, setSortField] = useState<SortField>("visibility_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedCompetitors = [...competitors].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "competitor_name") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSentimentColor = (sentiment: { positive: number; neutral: number; negative: number }) => {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;
    if (total === 0) return "gray";
    const positiveRatio = sentiment.positive / total;
    if (positiveRatio > 0.6) return "green";
    if (positiveRatio < 0.3) return "red";
    return "yellow";
  };

  const getSentimentLabel = (sentiment: { positive: number; neutral: number; negative: number }) => {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;
    if (total === 0) return "N/A";
    const positiveRatio = sentiment.positive / total;
    if (positiveRatio > 0.6) return "Mostly Positive";
    if (positiveRatio < 0.3) return "Mostly Negative";
    return "Mixed";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="w-16">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold text-gray-700 hover:text-gray-900"
                onClick={() => handleSort("rank")}
              >
                Rank
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold text-gray-700 hover:text-gray-900"
                onClick={() => handleSort("competitor_name")}
              >
                Competitor
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold text-gray-700 hover:text-gray-900"
                onClick={() => handleSort("visibility_score")}
              >
                Visibility Score
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 font-semibold text-gray-700 hover:text-gray-900"
                onClick={() => handleSort("total_mentions")}
              >
                Mentions
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-center">Models</TableHead>
            <TableHead>Top Sources</TableHead>
            <TableHead className="text-center">Sentiment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCompetitors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                No competitors found
              </TableCell>
            </TableRow>
          ) : (
            sortedCompetitors.map((competitor) => {
              const uniqueModels = Object.values(competitor.model_distribution).filter((v) => v > 0).length;
              const topSource = competitor.top_sources[0];
              const sentimentColor = getSentimentColor(competitor.sentiment_breakdown);

              return (
                <TableRow
                  key={competitor.competitor_name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onRowClick(competitor)}
                >
                  <TableCell className="font-medium text-gray-600">
                    #{competitor.rank}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-gray-900">{competitor.competitor_name}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TrendingUp className="h-4 w-4 text-teal-600" />
                      <span className="font-semibold text-gray-900">
                        {competitor.visibility_score.toFixed(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-gray-700">{competitor.total_mentions}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {uniqueModels} models
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {topSource ? (
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600 truncate max-w-[150px]">
                          {topSource.domain}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No sources</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        sentimentColor === "green" && "border-green-200 text-green-700 bg-green-50",
                        sentimentColor === "red" && "border-red-200 text-red-700 bg-red-50",
                        sentimentColor === "yellow" && "border-yellow-200 text-yellow-700 bg-yellow-50",
                        sentimentColor === "gray" && "border-gray-200 text-gray-700 bg-gray-50"
                      )}
                    >
                      {getSentimentLabel(competitor.sentiment_breakdown)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

