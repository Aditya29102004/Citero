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
import { Competitor } from "@/hooks/useCompetitors";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompetitorTrendChartProps {
  competitors: Competitor[];
  brandId: string | null;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export function CompetitorTrendChart({
  competitors,
  brandId,
  dateRange,
}: CompetitorTrendChartProps) {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId || competitors.length === 0) {
      setLoading(false);
      return;
    }

    const fetchTrendData = async () => {
      setLoading(true);
      try {
        // Fetch scan responses for trend calculation
        let query = supabase
          .from("scan_responses")
          .select("mentioned_brands, created_at, brand_id")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: true });

        if (dateRange) {
          query = query
            .gte("created_at", dateRange.start.toISOString())
            .lte("created_at", dateRange.end.toISOString());
        }

        const { data: responses } = await query;

        // Group by date and calculate mentions per competitor
        const dateMap: Record<string, Record<string, number>> = {};
        const topCompetitors = competitors.slice(0, 5).map((c) => c.competitor_name);

        responses?.forEach((response: any) => {
          const date = new Date(response.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          if (!dateMap[date]) {
            dateMap[date] = {};
            topCompetitors.forEach((name) => {
              dateMap[date][name] = 0;
            });
          }

          if (response.mentioned_brands && Array.isArray(response.mentioned_brands)) {
            response.mentioned_brands.forEach((name: string) => {
              if (topCompetitors.includes(name) && dateMap[date]) {
                dateMap[date][name] = (dateMap[date][name] || 0) + 1;
              }
            });
          }
        });

        // Convert to array format
        const trendArray = Object.entries(dateMap).map(([date, mentions]) => ({
          date,
          ...mentions,
        }));

        setTrendData(trendArray);
      } catch (error) {
        console.error("Error fetching trend data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [competitors, brandId, dateRange]);

  const colors = ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

  if (loading) {
    return (
      <Card className="p-6 border border-gray-200 bg-white">
        <div className="h-[350px] bg-gray-100 animate-pulse rounded-lg" />
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
        Competitor Visibility Trend
      </h3>
      <p className="text-xs text-slate-500 mb-6 font-medium">Timeline of mentions compared to top competitors</p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <filter id="shadowCompetitor" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.1"/>
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
          {competitors.slice(0, 5).map((competitor, idx) => (
            <Line
              key={competitor.competitor_name}
              type="monotone"
              dataKey={competitor.competitor_name}
              stroke={colors[idx % colors.length]}
              strokeWidth={3}
              dot={{ r: 4, fill: '#fff', stroke: colors[idx % colors.length], strokeWidth: 2 }}
              activeDot={{ r: 6, fill: colors[idx % colors.length], stroke: '#fff', strokeWidth: 2 }}
              style={{ filter: 'url(#shadowCompetitor)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

