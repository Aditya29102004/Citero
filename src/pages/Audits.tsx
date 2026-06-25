import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuditCard } from "@/components/audits/AuditCard";
import { AuditSection } from "@/components/audits/AuditSection";
import { AnimatedText } from "@/components/AnimatedText";
import { ShimmerCard } from "@/components/ShimmerCard";
import { runAudit, AuditResult } from "@/lib/audits/runAudit";
import { extractCompetitors, extractTopics } from "@/lib/audits/extractBrandInfo";
import { canRunAudit, getUserAuditUsage, getUserSubscriptionLimits } from "@/lib/subscriptionLimits";
import { toast } from "sonner";
import { FileText, Loader2, RefreshCw, Award, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Audits = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [running, setRunning] = useState(false);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [auditLimit, setAuditLimit] = useState<number>(5);
  const [auditUsage, setAuditUsage] = useState<number>(0);
  const [onboardingSummary, setOnboardingSummary] = useState<{
    brandScore?: number;
    visibilityPotential?: string;
    categoryRanking?: string;
    brandId?: string | null;
  } | null>(null);

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
      // Reset state when brand changes to prevent showing old data
      setCompetitors([]);
      setTopics([]);
      fetchBrandDetails();
      fetchAudits();
      fetchCompetitors();
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAuditLimits();
    }
  }, [session]);

  useEffect(() => {
    const raw = localStorage.getItem("citero_onboarding_summary");
    if (raw) {
      try {
        const summary = JSON.parse(raw);
        if (summary.brandScore || summary.visibilityPotential || summary.categoryRanking) {
          setOnboardingSummary(summary);
        }
      } catch (e) {
        console.error("Error loading onboarding summary:", e);
      }
    }
  }, []);

  const fetchBrands = async () => {
    try {
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", session?.user?.id)
        .order("created_at", { ascending: false });

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

  const fetchBrandDetails = async () => {
    try {
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("id", selectedBrandId)
        .single();

      if (data) {
        setSelectedBrand(data);
      }
    } catch (error) {
      console.error("Error fetching brand details:", error);
    }
  };

  const fetchCompetitors = async () => {
    try {
      // First try to get from brands table
      const { data: brandData } = await supabase
        .from("brands")
        .select("competitors, topics")
        .eq("id", selectedBrandId)
        .single();

      let fetchedCompetitors: string[] = [];
      let fetchedTopics: string[] = [];

      // Parse competitors with deduplication
      if (brandData?.competitors) {
        if (Array.isArray(brandData.competitors)) {
          fetchedCompetitors = brandData.competitors.map((c: any) => c.name || c || "").filter(Boolean);
        } else if (typeof brandData.competitors === "string") {
          fetchedCompetitors = brandData.competitors.split(",").map((c: string) => c.trim()).filter(Boolean);
        }
        // Deduplicate competitors (case-insensitive)
        const seen = new Set<string>();
        fetchedCompetitors = fetchedCompetitors.filter((c: string) => {
          const normalized = c.toLowerCase().trim();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      }

      // Parse topics with deduplication
      if (brandData?.topics && Array.isArray(brandData.topics)) {
        fetchedTopics = brandData.topics.filter((t: any) => typeof t === "string" && t.trim().length > 0);
        // Deduplicate topics (case-insensitive)
        const seen = new Set<string>();
        fetchedTopics = fetchedTopics.filter((t: string) => {
          const normalized = t.toLowerCase().trim();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      }

      // Only extract if we don't have data - don't re-extract unnecessarily
      // Note: We skip AI extraction here to avoid duplicate calls. 
      // AI extraction will happen in handleRunAudit if needed.
      
      setCompetitors(fetchedCompetitors);
      setTopics(fetchedTopics);
    } catch (error) {
      console.error("Error fetching competitors and topics:", error);
    }
  };

  const fetchAudits = async () => {
    if (!selectedBrandId) return;

    try {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: false })
        .limit(7); // Get latest audit for each category

      if (error) throw error;

      if (data && data.length > 0) {
        // Group by category and get latest for each
        const latestAudits = new Map<string, any>();
        data.forEach((audit: any) => {
          const existing = latestAudits.get(audit.category);
          if (!existing || new Date(audit.created_at) > new Date(existing.created_at)) {
            latestAudits.set(audit.category, audit);
          }
        });

        const formattedAudits: AuditResult[] = Array.from(latestAudits.values()).map((audit: any) => ({
          category: audit.category as AuditResult["category"],
          score: audit.score || 0,
          issues: Array.isArray(audit.issues) ? audit.issues : [],
          recommendations: Array.isArray(audit.recommendations) ? audit.recommendations : [],
          details: audit.details || {},
        }));

        setAudits(formattedAudits);
      } else {
        setAudits([]);
      }
    } catch (error) {
      console.error("Error fetching audits:", error);
      setAudits([]);
    }
  };

  const fetchAuditLimits = async () => {
    if (!session?.user?.id) return;
    
    try {
      const limits = await getUserSubscriptionLimits(session.user.id);
      const usage = await getUserAuditUsage(session.user.id);
      setAuditLimit(limits.auditsPerMonth || 5);
      setAuditUsage(usage);
    } catch (error) {
      console.error("Error fetching audit limits:", error);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedBrand) {
      toast.error("Please select a brand");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Please log in to continue");
      return;
    }

    // Check if user can run audit
    const canRun = await canRunAudit(session.user.id);
    if (!canRun.allowed) {
      toast.error(canRun.reason || "Cannot run audit");
      return;
    }

    setRunning(true);

    const loadingMessages = [
      "Analyzing your brand...",
      "Evaluating competitor messaging...",
      "Computing audit score...",
      "Identifying issues...",
      "Generating recommendations...",
    ];

    try {
      // Get brand text - try to fetch from website scraping or use description
      let brandText = selectedBrand.description || selectedBrand.summary || "";

      // If no text, try to get from scan_responses
      if (!brandText || brandText.length < 100) {
        const { data: responses } = await supabase
          .from("scan_responses")
          .select("ai_response")
          .eq("brand_id", selectedBrandId)
          .limit(5);

        if (responses && responses.length > 0) {
          brandText = responses.map((r: any) => r.ai_response).join("\n\n");
        }
      }

      if (!brandText || brandText.length < 50) {
        toast.error("Not enough brand content found. Please run a GEO scan first or add brand description.");
        setRunning(false);
        return;
      }

      // Use existing competitors and topics, or extract if missing
      let finalCompetitors = [...competitors];
      let finalTopics = [...topics];

      // Only extract if we don't have data already
      if (finalCompetitors.length === 0 || finalTopics.length === 0) {
        const { data: responses } = await supabase
          .from("scan_responses")
          .select("ai_response")
          .eq("brand_id", selectedBrandId)
          .limit(10);

        const responseTexts = responses?.map((r: any) => r.ai_response || "").filter(Boolean) || [];

        // Extract competitors using AI if we don't have any
        if (finalCompetitors.length === 0 && responseTexts.length > 0) {
          toast.info("Extracting competitors using AI...");
          try {
            const aiCompetitors = await extractCompetitors(selectedBrand.name, brandText, responseTexts);
            if (aiCompetitors.length > 0) {
              finalCompetitors = aiCompetitors;
              setCompetitors(finalCompetitors);
            }
          } catch (error) {
            console.error("Error extracting competitors:", error);
          }
        }

        // Extract topics using AI if we don't have any
        if (finalTopics.length === 0 && responseTexts.length > 0) {
          toast.info("Extracting topics using AI...");
          try {
            const aiTopics = await extractTopics(selectedBrand.name, brandText, responseTexts);
            if (aiTopics.length > 0) {
              finalTopics = aiTopics;
              setTopics(finalTopics);
            }
          } catch (error) {
            console.error("Error extracting topics:", error);
          }
        }
      }

      // Final deduplication before using
      const dedupeCompetitors = (arr: string[]) => {
        const seen = new Set<string>();
        return arr.filter((c: string) => {
          const normalized = c.toLowerCase().trim();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      };

      const dedupeTopics = (arr: string[]) => {
        const seen = new Set<string>();
        return arr.filter((t: string) => {
          const normalized = t.toLowerCase().trim();
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      };

      finalCompetitors = dedupeCompetitors(finalCompetitors);
      finalTopics = dedupeTopics(finalTopics);

      // Run audits
      const results = await runAudit({
        brandText,
        brandName: selectedBrand.name,
        competitors: finalCompetitors.length > 0 ? finalCompetitors : undefined,
        topics: finalTopics.length > 0 ? finalTopics : undefined,
        websiteUrl: selectedBrand.website_url,
      });

      // Save to database
      for (const result of results) {
        try {
          const { error } = await supabase.from("audits").insert({
            brand_id: selectedBrandId,
            user_id: session.user.id,
            category: result.category,
            score: result.score,
            issues: result.issues,
            recommendations: result.recommendations,
            details: result.details || {},
          });

          if (error) {
            console.error(`Error saving audit for ${result.category}:`, error);
          }
        } catch (error) {
          console.error(`Error saving audit for ${result.category}:`, error);
        }
      }

      toast.success("Audit completed successfully!");
      setAudits(results);
      // Refresh audit usage
      await fetchAuditLimits();
    } catch (error: any) {
      console.error("Error running audit:", error);
      toast.error(error.message || "Failed to run audit");
    } finally {
      setRunning(false);
    }
  };

  const calculateOverallScore = (): number => {
    if (audits.length === 0) return 0;
    const sum = audits.reduce((acc, audit) => acc + audit.score, 0);
    return Math.round((sum / audits.length) * 100) / 100;
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
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
          <main className="flex-1 overflow-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                    Brand Audits
                  </h1>
                  <p className="text-gray-600 font-medium">
                    Comprehensive analysis of your brand's AI visibility and messaging
                  </p>
                </div>
                {selectedBrandId && (
                  <Button
                    onClick={handleRunAudit}
                    disabled={running}
                    className="bg-black hover:bg-black/90 text-white font-semibold shadow-md py-6 px-6 rounded-lg transition-all duration-200 border-none flex items-center gap-2 hover:scale-[1.02] text-sm"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 ${running ? "animate-spin" : ""}`} />
                    {running ? "Analyzing Brand..." : "Run Brand Audit"}
                  </Button>
                )}
              </div>

              {/* Brand Selector */}
              {brands.length > 0 && (
                <div className="mb-6 space-y-4">
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

                  {/* Audit Limit Display */}
                  <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Monthly Audit Usage:</span>
                      <span className={`font-semibold ${auditUsage >= auditLimit ? 'text-gray-600' : 'text-gray-900'}`}>
                        {auditUsage} / {auditLimit === Infinity ? '∞' : auditLimit}
                      </span>
                    </div>
                    {auditUsage >= auditLimit && auditLimit !== Infinity && (
                      <p className="text-xs text-gray-600 mt-2 font-medium">
                        You've reached your monthly limit. Upgrade to Enterprise for unlimited audits.
                      </p>
                    )}
                  </div>

                  {/* Display Competitors and Topics */}
                  {(competitors.length > 0 || topics.length > 0) && (
                    <div className="space-y-3 mb-4">
                      {competitors.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 font-medium text-sm min-w-[100px]">Competitors:</span>
                          <div className="flex flex-wrap gap-2">
                            {competitors.map((comp, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-sm border border-gray-200 font-medium"
                              >
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {topics.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 font-medium text-sm min-w-[100px]">Topics:</span>
                          <div className="flex flex-wrap gap-2">
                            {topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-sm border border-gray-200 font-medium"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Running State */}
              {running && (
                <Card className="p-6 border border-gray-200 bg-white mb-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    <AnimatedText
                      texts={[
                        "Analyzing your brand...",
                        "Evaluating competitor messaging...",
                        "Computing audit score...",
                        "Identifying issues...",
                        "Generating recommendations...",
                      ]}
                      className="text-gray-600 font-medium"
                    />
                  </div>
                </Card>
              )}

              {/* Empty State - No Brands */}
              {!selectedBrandId && brands.length === 0 && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Brands Found</h3>
                  <p className="text-gray-600 mb-6">
                    Add a brand first to run audits.
                  </p>
                </Card>
              )}

              {/* Audit Card */}
              {selectedBrandId && (
                <>
                  {/* Onboarding Summary Box */}
                  {onboardingSummary && onboardingSummary.brandId === selectedBrandId && (
                    <div className="mb-6 bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200 rounded-xl p-6 shadow-sm animate-fade-in">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 select-none">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Initial Onboarding Diagnostics Summary
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-150 p-4 rounded-lg flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Award className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onboarding Score</p>
                            <p className="text-xl font-extrabold text-slate-900">{onboardingSummary.brandScore}/100</p>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-slate-150 p-4 rounded-lg flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-600 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visibility Potential</p>
                            <p className="text-xl font-extrabold text-emerald-650">{onboardingSummary.visibilityPotential}</p>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-150 p-4 rounded-lg flex items-center gap-3">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Ranking</p>
                            <p className="text-xl font-extrabold text-slate-900">{onboardingSummary.categoryRanking}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <AuditCard
                    overallScore={calculateOverallScore()}
                    onRerun={handleRunAudit}
                    rerunning={running}
                  />

                  {/* Audit Sections */}
                  <div className="mt-6">
                    {running ? (
                      <div className="space-y-4">
                        {[...Array(7)].map((_, i) => (
                          <ShimmerCard key={i} />
                        ))}
                      </div>
                    ) : audits.length > 0 ? (
                      <AuditSection audits={audits} />
                    ) : (
                      <Card className="p-12 text-center border border-gray-200 bg-white">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No Audit Results Yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Run your first audit to analyze your brand's AI visibility.
                        </p>
                        <button
                          onClick={handleRunAudit}
                          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Run First Audit
                        </button>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Audits;
