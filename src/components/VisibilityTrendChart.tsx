import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

interface VisibilityTrendChartProps {
  brandId: string;
}

export const VisibilityTrendChart = ({ brandId }: VisibilityTrendChartProps) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchTrendData();
  }, [brandId]);

  const fetchTrendData = async () => {
    const { data: scores } = await supabase
      .from("brand_visibility_scores")
      .select("*")
      .eq("brand_id", brandId)
      .order("calculated_at", { ascending: true });

    if (scores) {
      const chartData = scores.map(score => ({
        date: format(new Date(score.calculated_at), "MMM dd"),
        score: score.score,
      }));
      setData(chartData);
    }
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 tracking-tight">
          Visibility Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#111827" stopOpacity={1} />
                <stop offset="50%" stopColor="#374151" stopOpacity={1} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111827" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
              style={{ fontSize: '11px', fontFamily: 'system-ui' }}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
              style={{ fontSize: '11px', fontFamily: 'system-ui' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                color: '#111827',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#374151' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#374151' }}
            />
            <Line
              type="linear"
              dataKey="score"
              stroke="#111827"
              strokeWidth={2.5}
              dot={{ fill: '#111827', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#374151', stroke: '#ffffff', strokeWidth: 2 }}
              name="Visibility Score"
              animationDuration={800}
              animationBegin={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
