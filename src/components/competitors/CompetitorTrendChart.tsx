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
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Competitor Visibility Trend
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          />
          <Legend />
          {competitors.slice(0, 5).map((competitor, idx) => (
            <Line
              key={competitor.competitor_name}
              type="linear"
              dataKey={competitor.competitor_name}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

