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
        <h3 className="text-lg font-semibold text-gray-900 mb-4 tracking-tight">
          Sentiment Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <defs>
              <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f2937" stopOpacity={1} />
                <stop offset="100%" stopColor="#111827" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradientNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={1} />
                <stop offset="100%" stopColor="#4b5563" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradientNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9ca3af" stopOpacity={1} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={1} />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
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
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#374151' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
