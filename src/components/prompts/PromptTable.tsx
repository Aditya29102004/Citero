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
import { CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";

export interface PromptRun {
  id: string;
  prompt_text: string;
  visibility_score: number;
  brand_mentioned: boolean;
  competitors: string[];
  country: string;
  model: string;
  created_at: string;
  status: 'success' | 'error';
  error_message?: string;
  answer_text?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sources?: string[];
}

interface PromptTableProps {
  runs: PromptRun[];
  onRowClick: (run: PromptRun) => void;
  loading?: boolean;
}

export function PromptTable({ runs, onRowClick, loading }: PromptTableProps) {
  const getVisibilityBadgeColor = (score: number) => {
    if (score >= 30) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 15) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getModelLabel = (model: string) => {
    const labels: Record<string, string> = {
      chatgpt: "ChatGPT",
      claude: "Claude",
      gemini: "Gemini",
      qwen: "Qwen",
    };
    return labels[model.toLowerCase()] || model;
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

  if (runs.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-600">No prompt runs yet. Run your first simulation to see results.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Prompt Text</TableHead>
            <TableHead className="font-semibold">Visibility Score</TableHead>
            <TableHead className="font-semibold">Brand Mentioned</TableHead>
            <TableHead className="font-semibold">Competitors</TableHead>
            <TableHead className="font-semibold">Country</TableHead>
            <TableHead className="font-semibold">Model</TableHead>
            <TableHead className="font-semibold">Last Run</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow
              key={run.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => run.status === 'success' && onRowClick(run)}
            >
              <TableCell className="max-w-md">
                <p className="text-sm text-gray-900 line-clamp-2">{run.prompt_text}</p>
              </TableCell>
              <TableCell>
                <Badge className={getVisibilityBadgeColor(run.visibility_score)}>
                  {run.visibility_score.toFixed(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {run.brand_mentioned ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {run.competitors.slice(0, 2).map((comp, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {comp.length > 15 ? `${comp.substring(0, 15)}...` : comp}
                    </Badge>
                  ))}
                  {run.competitors.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{run.competitors.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-700">{run.country === 'all' ? 'All' : run.country}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-700">{getModelLabel(run.model)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {format(new Date(run.created_at), "MMM d, HH:mm")}
                </span>
              </TableCell>
              <TableCell>
                {run.status === 'success' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Success
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    Error
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (run.status === 'success') {
                      onRowClick(run);
                    }
                  }}
                  disabled={run.status !== 'success'}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

