import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OutreachFilters, OutreachFilters as FiltersType } from "@/components/outreach/OutreachFilters";
import { OutreachTable, OutreachTarget } from "@/components/outreach/OutreachTable";
import { OutreachDrawer } from "@/components/outreach/OutreachDrawer";
import { AnimatedText } from "@/components/AnimatedText";
import { ShimmerCard } from "@/components/ShimmerCard";
import { detectTargetsBatch, SourceData } from "@/lib/outreach/detectTargets";
import { useSourcesData } from "@/hooks/useSourcesData";
import { toast } from "sonner";
import { Mail, Sparkles } from "lucide-react";

const Outreach = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [targets, setTargets] = useState<OutreachTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<OutreachTarget | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    status: "all",
    search: "",
  });

  // Fetch sources data
  const { sources, loading: sourcesLoading } = useSourcesData({
    brandId: selectedBrandId || null,
    aiProvider: "all",
    dateRange: "90d",
    enabled: !!selectedBrandId,
  });

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
      fetchBrandDetails();
      fetchTargets();
    }
  }, [selectedBrandId, filters]);

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

  const fetchTargets = async () => {
    if (!selectedBrandId) return;

    try {
      let query = supabase
        .from("outreach_targets")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("priority_score", { ascending: false });

      // Apply filters
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(
          `person_name.ilike.%${filters.search}%,source_domain.ilike.%${filters.search}%,person_role.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedTargets: OutreachTarget[] = data.map((target: any) => ({
          id: target.id,
          personName: target.person_name || "Unknown",
          personRole: target.person_role || "Unknown",
          sourceDomain: target.source_domain,
          sourceUrl: target.source_url,
          articleTitle: target.article_title,
          priorityScore: target.priority_score || 0,
          lastMentioned: target.last_mentioned,
          status: target.status || "pending",
          citationCount: target.citation_count || 0,
        }));
        setTargets(formattedTargets);
      }
    } catch (error) {
      console.error("Error fetching targets:", error);
      toast.error("Failed to load outreach targets");
    }
  };

  const handleDetectTargets = async () => {
    if (!selectedBrandId || !selectedBrand) {
      toast.error("Please select a brand");
      return;
    }

    if (sources.length === 0) {
      toast.error("No sources found. Run a GEO scan first to identify sources.");
      return;
    }

    setDetecting(true);

    try {
      // Convert sources to SourceData format
      const sourceData: SourceData[] = sources.slice(0, 20).map((source) => ({
        domain: source.domain,
        url: source.url,
        citationCount: source.citations,
        lastMentioned: source.lastSeen,
      }));

      // Detect targets with progress callback
      const detectedTargets = await detectTargetsBatch(sourceData, (current, total) => {
        // Progress callback - could show progress UI here
        console.log(`Detecting targets: ${current}/${total}`);
      });

      // Save to database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      let savedCount = 0;
      for (const [url, target] of detectedTargets.entries()) {
        const source = sourceData.find((s) => s.url === url);
        if (!source) continue;

        try {
          const { error } = await supabase.from("outreach_targets").insert({
            brand_id: selectedBrandId,
            user_id: session.user.id,
            source_domain: source.domain,
            source_url: url,
            person_name: target.personName,
            person_email: target.personEmail,
            person_role: target.personRole,
            company_name: target.companyName,
            priority_score: target.priorityScore,
            citation_count: source.citationCount,
            last_mentioned: source.lastMentioned,
            status: "pending",
          });

          if (!error) {
            savedCount++;
          }
        } catch (error) {
          console.error(`Error saving target for ${url}:`, error);
        }
      }

      toast.success(`Detected and saved ${savedCount} outreach targets`);
      await fetchTargets();
    } catch (error: any) {
      console.error("Error detecting targets:", error);
      toast.error(error.message || "Failed to detect targets");
    } finally {
      setDetecting(false);
    }
  };

  const handleRowClick = (target: OutreachTarget) => {
    setSelectedTarget(target);
    setDrawerOpen(true);
  };

  const handleEmailGenerated = () => {
    fetchTargets(); // Refresh targets to show updated status
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
          <main className="flex-1 overflow-auto bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                  Outreach
                </h1>
                <p className="text-gray-600">
                  Identify and contact key sources that mention your brand
                </p>
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

              {/* Filters */}
              {selectedBrandId && (
                <>
                  <OutreachFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onDetectTargets={handleDetectTargets}
                    detecting={detecting}
                  />

                  {/* Detecting State */}
                  {detecting && (
                    <Card className="p-6 border border-gray-200 bg-white mb-6">
                      <div className="flex items-center gap-3">
                        <AnimatedText
                          texts={[
                            "Identifying outreach targets...",
                            "Extracting contact information...",
                            "Scoring target relevance...",
                          ]}
                          className="text-gray-600 font-medium"
                        />
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Empty State - No Brands */}
              {!selectedBrandId && brands.length === 0 && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Brands Found</h3>
                  <p className="text-gray-600 mb-6">
                    Add a brand first to identify outreach targets.
                  </p>
                </Card>
              )}

              {/* Table */}
              {selectedBrandId && (
                <OutreachTable
                  targets={targets}
                  onRowClick={handleRowClick}
                  loading={detecting}
                />
              )}

              {/* Drawer */}
              {selectedTarget && selectedBrand && selectedBrandId && (
                <OutreachDrawer
                  target={selectedTarget}
                  open={drawerOpen}
                  onOpenChange={setDrawerOpen}
                  brandId={selectedBrandId}
                  brandInfo={{
                    name: selectedBrand.name,
                    description: selectedBrand.description || selectedBrand.summary,
                    website: selectedBrand.website_url,
                  }}
                  onEmailGenerated={handleEmailGenerated}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Outreach;
