import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { classifySourceCategory } from "@/lib/utils/sourceExtraction";

interface SourceCitation {
  id: string;
  domain: string;
  name: string;
  mention_count: number;
  last_seen: string;
  category: string;
  first_seen: string;
  rank?: number;
}

interface CitationHistory {
  created_at: string;
  daily_mentions: number;
  domain: string;
}

const Sources = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [topSources, setTopSources] = useState<SourceCitation[]>([]);
  const [sourceCategories, setSourceCategories] = useState<Record<string, number>>({});
  const [citationTrend, setCitationTrend] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBrands();
    }
  }, [session]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchSourcesData();
    }
  }, [selectedBrandId]);

  // Realtime subscription and fallback polling for updates on scan completion
  useEffect(() => {
    if (!selectedBrandId) return;

    let lastCompletedScanId: string | null = null;

    const checkAndFetchNewScan = async () => {
      try {
        const { data: latestScan } = await supabase
          .from("scans")
          .select("id")
          .eq("brand_id", selectedBrandId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestScan && latestScan.id !== lastCompletedScanId) {
          lastCompletedScanId = latestScan.id;
          fetchSourcesData();
        }
      } catch (err) {
        console.error("Error checking latest completed scan:", err);
      }
    };

    // Initialize the last completed scan ID on mount or brand change
    supabase
      .from("scans")
      .select("id")
      .eq("brand_id", selectedBrandId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          lastCompletedScanId = data.id;
        }
      });

    // Realtime channel for observing scan updates
    const channel = supabase
      .channel(`scans-updates-sources-${selectedBrandId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `brand_id=eq.${selectedBrandId}`
        },
        (payload) => {
          const newScan = payload.new as any;
          if (newScan && newScan.status === 'completed' && newScan.id !== lastCompletedScanId) {
            lastCompletedScanId = newScan.id;
            fetchSourcesData();
          }
        }
      )
      .subscribe();

    // 15s background optional fallback poll (uses lightweight index check)
    const fallbackPollInterval = setInterval(() => {
      checkAndFetchNewScan();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackPollInterval);
    };
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name")
      .eq("user_id", session?.user?.id)
      .order("name");

    if (data) {
      setBrands(data);
      if (data.length > 0 && !selectedBrandId) {
        setSelectedBrandId(data[0].id);
      }
    }
  };

  const fetchSourcesData = async () => {
    try {
      // Fetch all sources for the brand
      const { data: sources, error: sourcesError } = await supabase
        .from("source_citations")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("mention_count", { ascending: false })
        .limit(50);

      if (sourcesError) {
        // Handle table doesn't exist errors gracefully
        if (sourcesError.code === 'PGRST116' || sourcesError.code === '42P01' || sourcesError.message?.includes('does not exist') || sourcesError.message?.includes('relation')) {
          // Table doesn't exist yet - that's okay, just use empty arrays
          setTopSources([]);
          setSourceCategories({});
          setCitationTrend([]);
          return;
        }
        console.error("Error fetching sources:", sourcesError);
        setTopSources([]);
        setSourceCategories({});
        setCitationTrend([]);
        return;
      }

      if (!sources || sources.length === 0) {
        setTopSources([]);
        setSourceCategories({});
        setCitationTrend([]);
        return;
      }

      // Format sources with rank
      const formattedSources = sources.map((source, index) => ({
        ...source,
        rank: index + 1,
      }));

      setTopSources(formattedSources);

      // Calculate category totals
      const categories: Record<string, number> = {};
      sources.forEach(source => {
        const category = source.category || classifySourceCategory(source.domain);
        categories[category] = (categories[category] || 0) + source.mention_count;
      });
      setSourceCategories(categories);

      // Fetch citation history for trend graph (last 7 scans)
      const { data: scans } = await supabase
        .from("scans")
        .select("id, started_at")
        .eq("brand_id", selectedBrandId)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(7);

      if (scans && scans.length > 0) {
        const scanIds = scans.map(s => s.id);
        const { data: history } = await supabase
          .from("source_citations_history")
          .select("domain, daily_mentions, created_at, scan_id")
          .eq("brand_id", selectedBrandId)
          .in("scan_id", scanIds)
          .order("created_at", { ascending: true });

        if (history && history.length > 0) {
          // Group by scan date and aggregate top 5 sources
          const top5Domains = sources.slice(0, 5).map(s => s.domain);
          type ScanTrendPoint = { date: string; [domain: string]: number | string };
          const scanMap = new Map<string, ScanTrendPoint>();

          scans.forEach(scan => {
            const scanDate = new Date(scan.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            scanMap.set(scan.id, { date: scanDate });
          });

          history.forEach(entry => {
            if (top5Domains.includes(entry.domain) && entry.scan_id) {
              const scanData = scanMap.get(entry.scan_id);
              if (scanData) {
                const existing = scanData[entry.domain];
                const prev = typeof existing === 'number' ? existing : 0;
                scanData[entry.domain] = prev + entry.daily_mentions;
              }
            }
          });

          const trendData = Array.from(scanMap.values()).filter(d => {
            // Only include dates with at least one source mention
            return Object.keys(d).some(
              key => key !== 'date' && typeof d[key] === 'number' && (d[key] as number) > 0
            );
          });

          setCitationTrend(trendData);
        } else {
          setCitationTrend([]);
        }
      } else {
        setCitationTrend([]);
      }
    } catch (error) {
      console.error("Error fetching sources data:", error);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-white">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalMentions = topSources.reduce((sum, source) => sum + source.mention_count, 0);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Sources</h1>
                <p className="text-gray-600">AI-cited sources influencing your brand's perception</p>
              </div>

              {brands.length > 0 && (
                <div className="mb-6">
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!selectedBrandId ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <p className="text-gray-600">Select a brand to view source analytics</p>
                </Card>
              ) : topSources.length === 0 ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <p className="text-gray-600">No source data available. Run a GEO Scan to populate source analytics.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Top Cited Domains Table */}
                  <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Cited Sources</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rank</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Source Name</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Domain</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Citations</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Mentioned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSources.map((source) => (
                            <tr key={source.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">{source.rank}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 font-medium">{source.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{source.domain}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">{source.mention_count.toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                  {source.category || classifySourceCategory(source.domain)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{formatDate(source.last_seen)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Source Categories */}
                  <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Categories</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(sourceCategories).map(([category, count]) => (
                        <div key={category} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-600 mb-1 capitalize">{category}</p>
                          <p className="text-2xl font-semibold text-gray-900">{count.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Citation Trend Chart */}
                  {citationTrend.length > 0 && (
                    <Card className="p-6 border border-gray-200 bg-white shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Citation Trend (Last 7 Scans)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={citationTrend}>
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
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb', 
                              borderRadius: '8px',
                              padding: '8px 12px'
                            }}
                          />
                          <Legend />
                          {topSources.slice(0, 5).map((source, idx) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                            return (
                              <Line
                                key={source.domain}
                                type="monotone"
                                dataKey={source.domain}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name={source.name}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Sources;
