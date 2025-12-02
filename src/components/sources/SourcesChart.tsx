import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

interface Source {
  domain: string;
  citations: number;
  lastSeen: string;
}

interface SourcesChartProps {
  sources: Source[];
  trendData?: Array<{
    date: string;
    [key: string]: string | number;
  }>;
  loading?: boolean;
}

export function SourcesChart({ sources, trendData, loading }: SourcesChartProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border border-gray-200 bg-white">
          <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
        </Card>
        <Card className="p-6 border border-gray-200 bg-white">
          <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
        </Card>
      </div>
    );
  }

  const top10Sources = sources.slice(0, 10).map((source) => ({
    name: source.domain.length > 20 ? source.domain.substring(0, 20) + "..." : source.domain,
    citations: source.citations,
    fullName: source.domain,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart - Top 10 Sources */}
      <Card className="p-6 border border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Sources by Citation Count</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top10Sources}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value.toLocaleString(), "Citations"]}
            />
            <Bar dataKey="citations" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Line Chart - Trends over time */}
      <Card className="p-6 border border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Citation Trends (Top 5 Sources)</h3>
        {trendData && trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {sources.slice(0, 5).map((source, idx) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                return (
                  <Line
                    key={source.domain}
                    type="linear"
                    dataKey={source.domain}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={source.domain.length > 20 ? source.domain.substring(0, 20) + "..." : source.domain}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            <p>No trend data available</p>
          </div>
        )}
      </Card>
    </div>
  );
}

