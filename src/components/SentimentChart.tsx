import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface SentimentChartProps {
  brandId: string;
}

export const SentimentChart = ({ brandId }: SentimentChartProps) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchSentimentData();
  }, [brandId]);

  const fetchSentimentData = async () => {
    const { data: scoreData } = await supabase
      .from("brand_visibility_scores")
      .select("*")
      .eq("brand_id", brandId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scoreData) {
      setData([
        { name: "Positive", value: scoreData.positive_mentions, color: "hsl(var(--chart-1))" },
        { name: "Neutral", value: scoreData.neutral_mentions, color: "hsl(var(--chart-2))" },
        { name: "Negative", value: scoreData.negative_mentions, color: "hsl(var(--chart-3))" },
      ]);
    }
  };

  const COLORS = [
    'url(#gradientPositive)',
    'url(#gradientNeutral)',
    'url(#gradientNegative)',
  ];

  return (
    <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
          Sentiment Distribution
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-medium">Brand perception by category</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <defs>
              <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradientNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradientNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
              </linearGradient>
              <filter id="shadowPie" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.1"/>
              </filter>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={95}
              innerRadius={50}
              paddingAngle={2}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
              stroke="white"
              strokeWidth={2}
              style={{ filter: 'url(#shadowPie)' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #f1f5f9',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
              }}
              itemStyle={{ color: '#475569', fontWeight: 500 }}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#374151' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
