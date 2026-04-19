import { Card } from "@/components/ui/card";
import {
  AreaChart,
  Area,
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
    <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Visibility Trend</h3>
      <p className="text-xs text-slate-500 mb-6 font-medium">Performance over recent scans</p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPromptTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <filter id="shadowPrompt" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.2"/>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            label={{ value: "Visibility Score", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #f1f5f9',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 500,
            }}
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '24px' }}
            iconType="circle"
            iconSize={10}
            fontSize={12}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorPromptTrend)"
            strokeWidth={3}
            dot={{ fill: '#fff', stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 6 }}
            name="Visibility Score"
            style={{ filter: 'url(#shadowPrompt)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

