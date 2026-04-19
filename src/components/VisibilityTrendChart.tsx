import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
          Visibility Trend
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-medium">Historical brand visibility performance</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <filter id="shadowVisibility" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.2"/>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              style={{ fontSize: '11px' }}
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
              fill="url(#areaGradient)"
              strokeWidth={3}
              dot={{ fill: '#fff', stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              name="Visibility Score"
              animationDuration={1000}
              animationBegin={0}
              style={{ filter: 'url(#shadowVisibility)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
