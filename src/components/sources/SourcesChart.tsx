import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, Cell } from "recharts";

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
      <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Top Sources by Citation Count</h3>
        <p className="text-xs text-slate-500 mb-6 font-medium">Most frequently cited domains</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top10Sources} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
              tickMargin={10} 
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
                fontWeight: 600,
              }}
              cursor={{ fill: '#f8fafc' }}
              formatter={(value: number) => [value.toLocaleString(), "Citations"]}
            />
            <Bar dataKey="citations" fill="url(#colorBar)" radius={[6, 6, 0, 0]}>
              {top10Sources.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#colorBar)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Line Chart - Trends over time */}
      <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
        <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Citation Trends</h3>
        <p className="text-xs text-slate-500 mb-6 font-medium">Timeline of citations for top 5 sources</p>
        {trendData && trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <filter id="shadowSourceLine" height="200%">
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
                tickMargin={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                axisLine={false} 
                tickMargin={10}
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
              {sources.slice(0, 5).map((source, idx) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                return (
                  <Line
                    key={source.domain}
                    type="monotone"
                    dataKey={source.domain}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#fff', stroke: colors[idx % colors.length], strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: colors[idx % colors.length], stroke: '#fff', strokeWidth: 2 }}
                    name={source.domain.length > 20 ? source.domain.substring(0, 20) + "..." : source.domain}
                    style={{ filter: 'url(#shadowSourceLine)' }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm font-medium">
            <p>No trend data available</p>
          </div>
        )}
      </Card>
    </div>
  );
}

