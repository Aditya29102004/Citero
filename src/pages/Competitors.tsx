import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import {
  extractCompetitorsFromResponse,
  calculateVisibilityScore,
  calculateCitationShare,
  calculateSentimentWeightedScore,
  mergeCompetitors,
  rankCompetitors,
  calculateTrend,
  filterNonsenseCompetitors,
  cleanCompetitorName,
  type CompetitorMetrics,
} from "@/lib/utils/competitorAnalysis";

const Competitors = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitorTrend, setCompetitorTrend] = useState<any[]>([]);
  const [competitorInsights, setCompetitorInsights] = useState<any>(null);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");

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
      fetchCompetitorData();
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", session?.user?.id)
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setBrands(data);
        if (!selectedBrandId) {
          setSelectedBrandId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const fetchCompetitorData = async () => {
    try {
      // Get brand data - try to select competitors columns, but handle gracefully if they don't exist
      let brandData: any = null;
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("name, primary_competitors, competitors")
          .eq("id", selectedBrandId)
          .single();
        
        if (error && error.code !== '42703' && error.code !== 'PGRST202') {
          // Not a "column doesn't exist" error, try without competitor columns
          const { data: fallbackData } = await supabase
            .from("brands")
            .select("name")
            .eq("id", selectedBrandId)
            .single();
          brandData = fallbackData;
        } else {
          brandData = data;
        }
      } catch (err: any) {
        // If columns don't exist, try without them
        if (err.message?.includes('column') || err.code === '42703' || err.code === 'PGRST202') {
          const { data: fallbackData } = await supabase
            .from("brands")
            .select("name")
            .eq("id", selectedBrandId)
            .single();
          brandData = fallbackData;
        } else {
          throw err;
        }
      }

      const brandName = brandData?.name || "";
      
      console.log("Brand data fetched:", {
        name: brandName,
        primary_competitors: brandData?.primary_competitors,
        competitors: brandData?.competitors,
        primary_competitors_type: typeof brandData?.primary_competitors,
        competitors_type: typeof brandData?.competitors,
        primary_competitors_isArray: Array.isArray(brandData?.primary_competitors),
        competitors_isArray: Array.isArray(brandData?.competitors),
      });
      
      // Get initial competitors from primary_competitors or competitors field
      // Handle both string format and object format {url, logo, name}
      let initialCompetitors: string[] = [];
      
      // First try primary_competitors (TEXT[] array)
      if (brandData?.primary_competitors && Array.isArray(brandData.primary_competitors)) {
        console.log("Reading from primary_competitors:", brandData.primary_competitors);
        initialCompetitors = brandData.primary_competitors
          .map((c: any) => {
            // If it's a string, use it directly
            if (typeof c === 'string') {
              // Check if it's a JSON string that needs parsing
              try {
                const parsed = JSON.parse(c);
                if (parsed && typeof parsed === 'object' && parsed.name) {
                  return parsed.name;
                }
              } catch {
                // Not JSON, use as-is
              }
              return c;
            }
            // If it's an object, extract the name field
            if (c && typeof c === 'object') {
              return c.name || '';
            }
            return '';
          })
          .filter((name: string) => name && name.length > 0);
        console.log("Extracted from primary_competitors:", initialCompetitors);
      }
      
      // Fallback to competitors field (JSONB) if primary_competitors is empty
      if (initialCompetitors.length === 0 && brandData?.competitors) {
        console.log("Reading from competitors field:", brandData.competitors);
        try {
          // Handle both string and object formats
          let competitors: any[] = [];
          if (typeof brandData.competitors === 'string') {
            competitors = JSON.parse(brandData.competitors);
          } else if (Array.isArray(brandData.competitors)) {
            competitors = brandData.competitors;
          } else {
            console.warn("Competitors field is not in expected format:", typeof brandData.competitors);
          }
          
          console.log("Parsed competitors array:", competitors);
          
          if (Array.isArray(competitors) && competitors.length > 0) {
            // Extract names from objects or use strings directly
            initialCompetitors = competitors
              .map((c: any) => {
                if (typeof c === 'string') {
                  return c.trim();
                }
                if (c && typeof c === 'object' && c.name) {
                  return c.name.trim();
                }
                return '';
              })
              .filter((name: string) => name && name.length > 0);
            
            console.log("Extracted competitor names:", initialCompetitors);
            
            // Always migrate competitors from old field to primary_competitors
            if (initialCompetitors.length > 0) {
              console.log("Migrating competitors from 'competitors' to 'primary_competitors':", initialCompetitors);
              try {
                const { error: migrateError } = await supabase
                  .from("brands")
                  .update({ primary_competitors: initialCompetitors })
                  .eq("id", selectedBrandId);
                
                if (migrateError) {
                  console.error("Failed to migrate competitors:", migrateError);
                  // Don't fail - just use competitors from old field
                } else {
                  console.log("Successfully migrated competitors to primary_competitors");
                  // Re-fetch to get updated data
                  const { data: updatedBrand } = await supabase
                    .from("brands")
                    .select("primary_competitors")
                    .eq("id", selectedBrandId)
                    .single();
                  if (updatedBrand?.primary_competitors) {
                    console.log("Verified migration - primary_competitors now has:", updatedBrand.primary_competitors);
                  }
                }
              } catch (migrateError) {
                console.error("Exception during migration:", migrateError);
                // Continue with competitors from old field
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse competitors:', e);
        }
      }

      // Fetch scans for the brand
      const { data: scans } = await supabase
        .from("scans")
        .select("id, started_at, status, completed_at")
        .eq("brand_id", selectedBrandId)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(10);

      if (!scans || scans.length === 0) {
        setCompetitors([]);
        setCompetitorTrend([]);
        setCompetitorInsights(null);
        return;
      }

      const scanIds = scans.map(s => s.id);

      // Fetch scan responses with sentiment
      const { data: responses } = await supabase
        .from("scan_responses")
        .select("id, mentioned_brands, brand_mentioned, created_at, sentiment, ai_response, scan_id")
        .in("scan_id", scanIds)
        .order("created_at", { ascending: false });

      // Fetch competitor visibility history (handle missing table gracefully)
      let visibilityHistory = null;
      try {
        const { data, error } = await supabase
          .from("competitor_visibility_history")
          .select("*")
          .eq("brand_id", selectedBrandId)
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (error) {
          // Handle table doesn't exist errors gracefully (404, PGRST116, 42P01)
          if (error.code === 'PGRST116' || error.code === '42P01' || error.status === 404 || error.message?.includes('does not exist') || error.message?.includes('relation')) {
            // Table doesn't exist yet - that's okay, just use empty array
            visibilityHistory = [];
          } else {
            // Other errors - log but don't break
            console.warn("Error fetching competitor visibility history:", error);
            visibilityHistory = [];
          }
        } else {
          visibilityHistory = data || [];
        }
      } catch (err: any) {
        // Table might not exist yet - that's okay
        if (err.message?.includes('does not exist') || err.message?.includes('relation') || err.message?.includes('404') || err.code === 'PGRST116' || err.code === '42P01') {
          visibilityHistory = [];
        } else {
          console.warn("Error fetching competitor visibility history:", err);
          visibilityHistory = [];
        }
      }

      // Get AI-extracted competitors from latest scan results
      const { data: latestScanResults } = await supabase
        .from("ai_scan_results")
        .select("competitor_scores")
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // ONLY use competitors from onboarding (primary_competitors) - don't use AI-extracted competitors
      // AI extraction pulls out random words, so we only track the ones the user explicitly added
      let allCompetitorNames = initialCompetitors.filter(name => {
        // Validate competitor names - filter out nonsense
        return name && typeof name === 'string' && name.length > 2 && name.length < 100;
      });

      // Debug: Log competitors being loaded
      console.log("Initial competitors from DB:", initialCompetitors);
      console.log("Filtered competitor names:", allCompetitorNames);

      // Add the brand itself to the competitor list so it appears in rankings
      if (brandName && !allCompetitorNames.some(name => name.toLowerCase() === brandName.toLowerCase())) {
        allCompetitorNames = [brandName, ...allCompetitorNames];
      }

      // Show all competitors even if no scans exist yet
      if (allCompetitorNames.length === 0) {
        setCompetitors([]);
        setCompetitorTrend([]);
        setCompetitorInsights(null);
        return;
      }

      console.log("All competitor names (including brand):", allCompetitorNames);

      // Calculate metrics for each competitor
      const competitorMetricsMap = new Map<string, {
        mentions: number;
        citations: number;
        positiveMentions: number;
        neutralMentions: number;
        negativeMentions: number;
        lastUpdated: string;
      }>();

      // Initialize all competitors
      allCompetitorNames.forEach(name => {
        competitorMetricsMap.set(name, {
          mentions: 0,
          citations: 0,
          positiveMentions: 0,
          neutralMentions: 0,
          negativeMentions: 0,
          lastUpdated: new Date().toISOString(),
        });
      });

      // Count mentions from responses using regex matching
      const totalResponses = responses?.length || 0;
      let totalMentionsAcrossAllCompetitors = 0;

      responses?.forEach(r => {
        const responseText = r.ai_response || "";
        
        // Extract competitors (including brand if it's in the list)
        const foundCompetitors = extractCompetitorsFromResponse(responseText, allCompetitorNames, brandName);
        
        foundCompetitors.forEach(compName => {
          const metrics = competitorMetricsMap.get(compName);
          if (metrics) {
            metrics.mentions++;
            totalMentionsAcrossAllCompetitors++;
            
            // Citations: when brand is mentioned (for brand itself) or when competitor is mentioned alongside brand
            if (r.brand_mentioned) {
              metrics.citations++;
            }
            
            // Track sentiment
            const sentiment = r.sentiment || 'neutral';
            if (sentiment === 'positive') metrics.positiveMentions++;
            else if (sentiment === 'neutral') metrics.neutralMentions++;
            else if (sentiment === 'negative') metrics.negativeMentions++;
            
            if (new Date(r.created_at) > new Date(metrics.lastUpdated)) {
              metrics.lastUpdated = r.created_at;
            }
          }
        });
      });

      // Build competitor metrics array - include ALL competitors even with 0 mentions
      const competitorMetrics: CompetitorMetrics[] = Array.from(competitorMetricsMap.entries()).map(([name, data]) => {
        // If no mentions at all, use 0 for all metrics but still show the competitor
        const visibilityScore = totalMentionsAcrossAllCompetitors > 0
          ? calculateVisibilityScore(data.mentions, totalMentionsAcrossAllCompetitors)
          : 0;
        const citationShare = calculateCitationShare(data.mentions, totalResponses);
        const sentimentWeighted = data.mentions > 0
          ? calculateSentimentWeightedScore(
              data.positiveMentions,
              data.neutralMentions,
              data.negativeMentions
            )
          : 50; // Default neutral sentiment if no mentions

        return {
          name,
          visibilityScore,
          citationShare,
          sentimentWeighted,
          mentions: data.mentions,
          positiveMentions: data.positiveMentions,
          neutralMentions: data.neutralMentions,
          negativeMentions: data.negativeMentions,
        };
      });

      // ONLY show competitors from onboarding (primary_competitors) - filter out any that aren't in the list
      const validCompetitorNames = new Set(allCompetitorNames.map(name => name.toLowerCase()));
      const filteredCompetitors = competitorMetrics.filter(comp => {
        // Only include if it's in the onboarding competitors list
        return validCompetitorNames.has(comp.name.toLowerCase());
      });

      // Rank competitors (no ties)
      const rankedCompetitors = rankCompetitors(filteredCompetitors);

      // Get last updated times from metrics map
      const lastUpdatedMap = new Map<string, string>();
      competitorMetricsMap.forEach((data, name) => {
        lastUpdatedMap.set(name, data.lastUpdated);
      });

      // Calculate trends for each competitor
      const competitorsWithTrends = rankedCompetitors.map(comp => {
        // Find previous visibility from history
        const previousEntry = visibilityHistory?.find(
          h => h.competitor_name.toLowerCase() === comp.name.toLowerCase()
        );
        
        const previousVisibility = previousEntry?.visibility_score || 0;
        const trend = calculateTrend(comp.visibilityScore, previousVisibility);

        return {
          ...comp,
          trend,
          lastUpdated: lastUpdatedMap.get(comp.name) || new Date().toISOString(),
        };
      });

      setCompetitors(competitorsWithTrends);

      // Generate trend data for last 7 scans
      const last7Scans = scans.slice(0, 7).reverse();
      const trendData: any[] = [];

      last7Scans.forEach((scan, index) => {
        const scanHistory = visibilityHistory?.filter(h => h.scan_id === scan.id) || [];
        const date = new Date(scan.completed_at || scan.started_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const dayData: any = { date: dateStr };
        
        // Add top 5 competitors
        competitorsWithTrends.slice(0, 5).forEach(comp => {
          const historyEntry = scanHistory.find(h => 
            h.competitor_name.toLowerCase() === comp.name.toLowerCase()
          );
          dayData[comp.name] = historyEntry?.visibility_score || 0;
        });

        trendData.push(dayData);
      });

      setCompetitorTrend(trendData);

      // Generate improved insights
      const brandCompetitor = competitorsWithTrends.find(c => c.name.toLowerCase() === brandName.toLowerCase());
      const brandRank = brandCompetitor?.rank || 999;
      const brandVisibility = brandCompetitor?.visibilityScore || 0;
      
      // Strengths: Competitors with high visibility AND positive sentiment (top performers)
      // Or competitors that are performing well but the brand is also competitive
      const strengths = competitorsWithTrends
        .filter(c => c.mentions > 0 && c.sentimentWeighted >= 70)
        .sort((a, b) => {
          // Sort by visibility first, then sentiment
          if (Math.abs(a.visibilityScore - b.visibilityScore) > 1) {
            return b.visibilityScore - a.visibilityScore;
          }
          return b.sentimentWeighted - a.sentimentWeighted;
        })
        .slice(0, 3)
        .map(c => {
          if (c.name.toLowerCase() === brandName.toLowerCase()) {
            return `Your brand "${c.name}" ranks #${c.rank} with ${c.visibilityScore.toFixed(1)}% visibility and ${c.sentimentWeighted.toFixed(0)} sentiment score - strong market presence`;
          }
          return `${c.name} leads with ${c.visibilityScore.toFixed(1)}% visibility and ${c.sentimentWeighted.toFixed(0)} sentiment score - benchmark for success`;
        });
      
      // Weaknesses: Opportunities - competitors with low visibility OR competitors outperforming the brand
      const weaknesses: string[] = [];
      
      // Add competitors that outperform the brand
      const outperformingCompetitors = competitorsWithTrends
        .filter(c => c.mentions > 0 && c.rank < brandRank && c.name.toLowerCase() !== brandName.toLowerCase())
        .slice(0, 2);
      
      outperformingCompetitors.forEach(c => {
        const gap = brandVisibility - c.visibilityScore;
        if (gap < 0) {
          weaknesses.push(`${c.name} ranks #${c.rank} with ${c.visibilityScore.toFixed(1)}% visibility, ${Math.abs(gap).toFixed(1)}% higher than your brand - analyze their strategy`);
        }
      });
      
      // Add competitors with very low visibility (opportunity to gain ground)
      const lowVisibilityCompetitors = competitorsWithTrends
        .filter(c => c.mentions > 0 && c.visibilityScore < 5 && c.name.toLowerCase() !== brandName.toLowerCase())
        .sort((a, b) => a.visibilityScore - b.visibilityScore)
        .slice(0, 3 - weaknesses.length);
      
      lowVisibilityCompetitors.forEach(c => {
        weaknesses.push(`${c.name} has only ${c.visibilityScore.toFixed(1)}% visibility - opportunity to outperform this competitor`);
      });
      
      // If brand is not in top 3, add that as a weakness
      if (brandRank > 3 && brandCompetitor) {
        const top3Avg = competitorsWithTrends
          .filter(c => c.rank <= 3 && c.mentions > 0)
          .reduce((sum, c) => sum + c.visibilityScore, 0) / 3;
        const gap = top3Avg - brandVisibility;
        if (gap > 0) {
          weaknesses.unshift(`Your brand ranks #${brandRank} - ${gap.toFixed(1)}% below top 3 average visibility - focus on improving market presence`);
        }
      }
      
      setCompetitorInsights({
        strengths: strengths.length > 0 ? strengths : [
          brandCompetitor 
            ? `Your brand "${brandName}" has ${brandVisibility.toFixed(1)}% visibility - continue building market presence`
            : 'Run more scans to generate competitive insights'
        ],
        weaknesses: weaknesses.length > 0 ? weaknesses : [
          brandCompetitor && brandRank <= 3
            ? 'Your brand is performing well - maintain your competitive position'
            : 'Run more scans to identify improvement opportunities'
        ],
      });

      console.log("Final competitors with trends:", competitorsWithTrends);
    } catch (error) {
      console.error("Error fetching competitor data:", error);
      toast.error("Failed to load competitor data");
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim() || !selectedBrandId) {
      toast.error("Please enter a competitor name");
      return;
    }

    try {
      const cleanedName = cleanCompetitorName(newCompetitorName.trim());
      if (!cleanedName) {
        toast.error("Invalid competitor name. Please enter a real brand name.");
        return;
      }

      // Get current primary_competitors from brand
      try {
        const { data: brandData, error } = await supabase
          .from("brands")
          .select("primary_competitors")
          .eq("id", selectedBrandId)
          .single();

        // If column doesn't exist, skip updating (migration might not have run)
        if (error && (error.code === '42703' || error.code === 'PGRST202')) {
          toast.error("Competitor tracking is not available yet. Please run the database migration.");
          return;
        }

        const currentCompetitors = brandData?.primary_competitors || [];
        const competitorsArray = Array.isArray(currentCompetitors) ? currentCompetitors : [];

        // Check if already exists (handle both string and object formats)
        const exists = competitorsArray.some((c: any) => {
          if (typeof c === 'string') {
            try {
              const parsed = JSON.parse(c);
              if (parsed && typeof parsed === 'object' && parsed.name) {
                return parsed.name.toLowerCase() === cleanedName.toLowerCase();
              }
            } catch {
              // Not JSON, compare as string
            }
            return c.toLowerCase() === cleanedName.toLowerCase();
          }
          if (c && typeof c === 'object') {
            return (c.name || '').toLowerCase() === cleanedName.toLowerCase();
          }
          return false;
        });

        if (exists) {
          toast.error("Competitor already exists");
          return;
        }

        // Store as object format {name, url, logo} if URL is provided, otherwise just name string
        const competitorToAdd = newCompetitorUrl.trim() 
          ? { name: cleanedName, url: newCompetitorUrl.trim(), logo: null }
          : cleanedName;
        
        const updatedCompetitors = [...competitorsArray, competitorToAdd];

        const { error: updateError } = await supabase
          .from("brands")
          .update({ primary_competitors: updatedCompetitors })
          .eq("id", selectedBrandId);

        if (updateError) {
          throw updateError;
        }
      } catch (err: any) {
        // Column might not exist - that's okay
        if (err.message?.includes('column') || err.code === '42703' || err.code === 'PGRST202') {
          toast.error("Competitor tracking is not available yet. Please run the database migration.");
        } else {
          console.error("Error updating competitors:", err);
          toast.error("Failed to add competitor");
        }
        return;
      }

      toast.success("Competitor added successfully");
      setNewCompetitorName("");
      setNewCompetitorUrl("");
      await fetchCompetitorData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add competitor");
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Competitors</h1>
                <p className="text-gray-600">Analyze competitor visibility and performance</p>
              </div>

              {/* Brand Selector */}
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

              {/* Empty State */}
              {(!selectedBrandId || competitors.length === 0) && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <p className="text-gray-600 mb-6">
                    {!selectedBrandId 
                      ? "Select a brand to view competitor analysis"
                      : "Run a GEO Scan to populate competitor intelligence."}
                  </p>
                  {selectedBrandId && (
                    <Button onClick={() => navigate("/brands")} className="bg-gray-900 text-white hover:bg-gray-800">
                      Go to Brands
                    </Button>
                  )}
                </Card>
              )}

              {/* Content */}
              {selectedBrandId && competitors.length > 0 && (
                <div className="space-y-6">
                  {/* Competitor Ranking Table */}
                  <Card className="p-6 border border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Competitor Ranking</h3>
                      <div className="flex gap-2">
                        <Input
                          value={newCompetitorName}
                          onChange={(e) => setNewCompetitorName(e.target.value)}
                          placeholder="Competitor name"
                          className="w-[200px]"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                        />
                        <Input
                          value={newCompetitorUrl}
                          onChange={(e) => setNewCompetitorUrl(e.target.value)}
                          placeholder="URL (optional)"
                          type="url"
                          className="w-[200px]"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                        />
                        <Button onClick={handleAddCompetitor} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Competitor
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Rank</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Competitor</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Visibility %</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Citation Share %</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Sentiment Score</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitors.slice(0, 10).map((comp) => (
                            <tr key={comp.name} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">#{comp.rank}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 font-medium">{comp.name}</td>
                              <td className="py-3 px-4 text-sm text-gray-700 text-right">{comp.visibilityScore.toFixed(1)}%</td>
                              <td className="py-3 px-4 text-sm text-gray-700 text-right">{comp.citationShare.toFixed(1)}%</td>
                              <td className="py-3 px-4 text-sm text-gray-700 text-right">{comp.sentimentWeighted.toFixed(0)}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {comp.trend === 'rising' && <TrendingUp className="h-4 w-4 text-green-600" />}
                                  {comp.trend === 'falling' && <TrendingDown className="h-4 w-4 text-red-600" />}
                                  {comp.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                                  <span className="text-xs text-gray-500 capitalize">{comp.trend}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Competitor Visibility Trend Chart */}
                  <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Competitor Visibility Trend</h3>
                    <p className="text-xs text-slate-500 mb-6 font-medium">Timeline of mentions compared to top competitors</p>
                    {competitorTrend.length === 0 ? (
                      <div className="h-[400px] flex items-center justify-center text-gray-500">
                        <p>Run more scans to see competitor trends.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={competitorTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <defs>
                            <filter id="shadowCompetitorTabs" height="200%">
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
                            domain={[0, 100]} 
                            tickFormatter={(value) => `${value}%`} 
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
                            formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(1)}%` : value, undefined]}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '24px' }} 
                            iconType="circle" 
                            iconSize={10} 
                            fontSize={12} 
                          />
                          {competitors.slice(0, 5).map((comp, idx) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                            return (
                              <Line
                                key={comp.name}
                                type="monotone"
                                dataKey={comp.name}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#fff', stroke: colors[idx % colors.length], strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: colors[idx % colors.length], stroke: '#fff', strokeWidth: 2 }}
                                style={{ filter: 'url(#shadowCompetitorTabs)' }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  {/* Strength/Weakness Report */}
                  {competitorInsights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 border border-green-200 bg-green-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strengths</h3>
                        <ul className="space-y-2">
                          {competitorInsights.strengths?.map((strength: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700">• {strength}</li>
                          ))}
                        </ul>
                      </Card>
                      <Card className="p-6 border border-red-200 bg-red-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weaknesses</h3>
                        <ul className="space-y-2">
                          {competitorInsights.weaknesses?.map((weakness: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700">• {weakness}</li>
                          ))}
                        </ul>
                      </Card>
                    </div>
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

export default Competitors;
