import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";

export interface TrendDataPoint {
  date: string;
  visibility_score: number;
}

interface PromptTrendChartProps {
  promptId: string;
  runs: Array<{ date: string; visibility_score: number }>;
  loading?: boolean;
}

export function PromptTrendChart({ promptId, runs, loading }: PromptTrendChartProps) {
  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="text-center py-12">
          <p className="text-gray-600">No trend data available yet.</p>
        </div>
      </Card>
    );
  }

  // Format data for chart
  const chartData = runs.map((run) => ({
    date: format(new Date(run.date), "MMM d"),
    score: run.visibility_score,
  }));

  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            label={{ value: "Visibility Score", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Line
            type="linear"
            dataKey="score"
            stroke="#111827"
            strokeWidth={2}
            dot={{ fill: "#111827", r: 4 }}
            activeDot={{ r: 6 }}
            name="Visibility Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

