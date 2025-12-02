import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PromptFilters, PromptFilters as FiltersType } from "@/components/prompts/PromptFilters";
import { PromptTable, PromptRun } from "@/components/prompts/PromptTable";
import { PromptRunDrawer } from "@/components/prompts/PromptRunDrawer";
import { PromptTrendChart } from "@/components/prompts/PromptTrendChart";
import { PromptRunStatus } from "@/components/prompts/PromptRunStatus";
import { AnimatedText } from "@/components/AnimatedText";
import { ShimmerCard } from "@/components/ShimmerCard";
import { runSimulation } from "@/lib/prompts/runSimulation";
import { getUserSubscriptionLimits, SubscriptionLimits, canRunPromptSimulator, getUserPromptSimulatorUsage } from "@/lib/subscriptionLimits";
import { toast } from "sonner";
import { FileText, AlertCircle } from "lucide-react";

const Prompts = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [runs, setRuns] = useState<PromptRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PromptRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [promptSimulatorUsage, setPromptSimulatorUsage] = useState<number>(0);
  const [filters, setFilters] = useState<FiltersType>({
    model: "chatgpt",
    country: "all",
    topic: "all",
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
      fetchPrompts();
      getUserSubscriptionLimits(session.user.id).then(setSubscriptionLimits);
      getUserPromptSimulatorUsage(session.user.id).then(setPromptSimulatorUsage);
    }
  }, [session]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchBrandDetails();
      fetchRuns();
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

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("topic")
        .limit(5); // Limit to 5 prompts maximum

      if (error) throw error;

      if (data) {
        setPrompts(data);
        // Extract unique topics
        const uniqueTopics = Array.from(new Set(data.map((p) => p.topic)));
        setTopics(uniqueTopics);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error("Failed to load prompts");
    }
  };

  const fetchRuns = async () => {
    if (!selectedBrandId) return;

    try {
      let query = supabase
        .from("prompt_runs")
        .select(`
          *,
          prompts (
            id,
            topic,
            text
          )
        `)
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.model !== "all") {
        query = query.eq("model", filters.model);
      }
      if (filters.country !== "all") {
        query = query.eq("country", filters.country);
      }
      if (filters.topic !== "all") {
        query = query.eq("prompts.topic", filters.topic);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedRuns: PromptRun[] = data.map((run: any) => ({
          id: run.id,
          prompt_text: run.prompts?.text || "Unknown prompt",
          visibility_score: run.visibility_score || 0,
          brand_mentioned: run.brand_mentioned || false,
          competitors: run.competitors || [],
          country: run.country || "all",
          model: run.model || "unknown",
          created_at: run.created_at,
          status: run.status || "success",
          error_message: run.error_message,
          answer_text: run.answer_text,
          sentiment: run.sentiment,
          sources: run.sources || [],
        }));
        setRuns(formattedRuns);
      }
    } catch (error) {
      console.error("Error fetching runs:", error);
      toast.error("Failed to load prompt runs");
    }
  };

  const handleRunSimulation = async () => {
    if (!selectedBrand) {
      toast.error("Please select a brand");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Please log in to continue");
      return;
    }

    // Check if user can run prompt simulator
    const canRun = await canRunPromptSimulator(session.user.id);
    if (!canRun.allowed) {
      toast.error(canRun.reason || "Cannot run prompt simulator");
      return;
    }

    // Get prompts to run - limit to 10 prompts
    let promptsToRun = prompts;
    if (filters.topic !== "all") {
      promptsToRun = prompts.filter((p) => p.topic === filters.topic);
    }

    // Limit to 5 prompts maximum
    promptsToRun = promptsToRun.slice(0, 5);

    if (promptsToRun.length === 0) {
      toast.error("No prompts found for selected topic");
      return;
    }

    setRunning(true);

    const loadingMessages = [
      "Running simulation across AI models...",
      "Extracting citations...",
      "Evaluating visibility...",
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
    }, 2000);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const prompt of promptsToRun) {
        let attempt = 0;
        const maxAttempts = 2;
        let success = false;
        let lastError: any = null;

        // Retry up to 2 times
        while (attempt < maxAttempts && !success) {
          attempt++;
          try {
            // Run simulation
            const result = await runSimulation({
              promptText: prompt.text,
              brandContext: {
                name: selectedBrand.name,
                description: selectedBrand.description || selectedBrand.summary,
                website: selectedBrand.website_url,
              },
              model: filters.model,
              country: filters.country === "all" ? undefined : filters.country,
            });

            // Save to database
            const { error: insertError } = await supabase.from("prompt_runs").insert({
              prompt_id: prompt.id,
              brand_id: selectedBrandId,
              user_id: session.user.id,
              model: filters.model,
              country: filters.country === "all" ? "all" : filters.country,
              answer_text: result.answerText,
              brand_mentioned: result.brandMentioned,
              competitors: result.competitors,
              sentiment: result.sentiment,
              sources: result.sources,
              visibility_score: result.visibilityScore,
              status: "success",
            });

            if (insertError) throw insertError;

            success = true;
            successCount++;
          } catch (error: any) {
            lastError = error;
            console.error(`Error running simulation for prompt ${prompt.id} (attempt ${attempt}/${maxAttempts}):`, error);

            // If this was the last attempt, save error
            if (attempt >= maxAttempts) {
              try {
                await supabase.from("prompt_runs").insert({
                  prompt_id: prompt.id,
                  brand_id: selectedBrandId,
                  user_id: session.user.id,
                  model: filters.model,
                  country: filters.country === "all" ? "all" : filters.country,
                  answer_text: "",
                  brand_mentioned: false,
                  competitors: [],
                  sentiment: "neutral",
                  sources: [],
                  visibility_score: 0,
                  status: "error",
                  error_message: lastError.message || "Unknown error",
                });
              } catch (insertError) {
                console.error("Error saving error run:", insertError);
              }

              errorCount++;
            } else {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }

      clearInterval(messageInterval);

      if (successCount > 0) {
        toast.success(`Successfully ran ${successCount} simulation${successCount > 1 ? "s" : ""}`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} simulation${errorCount > 1 ? "s" : ""} failed`);
      }

      // Refresh runs and usage
      await fetchRuns();
      if (session?.user?.id) {
        const usage = await getUserPromptSimulatorUsage(session.user.id);
        setPromptSimulatorUsage(usage);
      }
    } catch (error: any) {
      clearInterval(messageInterval);
      console.error("Error running simulation:", error);
      toast.error(error.message || "Failed to run simulation");
    } finally {
      setRunning(false);
    }
  };

  const handleRowClick = (run: PromptRun) => {
    setSelectedRun(run);
    setDrawerOpen(true);
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
                  Prompt Simulator
                </h1>
                <p className="text-gray-600">
                  Test how AI models respond to prompts about your brand
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
                  <PromptFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onRunSimulation={handleRunSimulation}
                    topics={topics}
                    loading={running}
                    subscriptionLimits={subscriptionLimits}
                    promptSimulatorUsage={promptSimulatorUsage}
                  />

                  {/* Running State */}
                  {running && (
                    <Card className="p-6 border border-gray-200 bg-white mb-6">
                      <div className="flex items-center gap-3">
                        <AnimatedText
                          texts={[
                            "Running simulation across AI models...",
                            "Extracting citations...",
                            "Evaluating visibility...",
                          ]}
                          className="text-gray-600 font-medium"
                        />
                      </div>
                    </Card>
                  )}

                  {/* Status */}
                  <PromptRunStatus
                    nextRunHours={24}
                    lastRunTime={runs.length > 0 ? new Date(runs[0].created_at) : null}
                  />
                </>
              )}

              {/* Error State */}
              {!selectedBrandId && brands.length === 0 && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Brands Found</h3>
                  <p className="text-gray-600 mb-6">
                    Add a brand first to run prompt simulations.
                  </p>
                </Card>
              )}

              {/* Table */}
              {selectedBrandId && (
                <div className="space-y-6">
                  <PromptTable runs={runs} onRowClick={handleRowClick} loading={running} />

                  {/* Trend Chart */}
                  {runs.length > 0 && selectedRun && (
                    <PromptTrendChart
                      promptId={selectedRun.id}
                      runs={runs
                        .filter((r) => r.prompt_text === selectedRun.prompt_text)
                        .slice(0, 10)
                        .map((r) => ({
                          date: r.created_at,
                          visibility_score: r.visibility_score,
                        }))}
                    />
                  )}
                </div>
              )}

              {/* Drawer */}
              {selectedRun && selectedBrand && (
                <PromptRunDrawer
                  run={selectedRun}
                  open={drawerOpen}
                  onOpenChange={setDrawerOpen}
                  brandName={selectedBrand.name}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Prompts;

