import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ensureProfile } from "@/lib/ensureProfile";
import { checkOnboardingComplete } from "@/lib/onboardingState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShimmerCard, ShimmerChart } from "@/components/ShimmerCard";
import { LineChart, Line, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { ArrowRight, Play, Loader2, X, Info, Target, Users, Lightbulb, CheckCircle2, Sparkles } from "lucide-react";
import { mergeCompetitors } from "@/lib/utils/competitorAnalysis";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { AIProviderSelect } from "@/components/AIProviderSelect";
import { canRunScan, isAIProviderAllowed, getUserSubscriptionLimits, getUserScanUsage, SubscriptionLimits } from "@/lib/subscriptionLimits";
import { AlertCircle, RefreshCw, Lock } from "lucide-react";

// Color palette for competitors (consistent per competitor)
const COMPETITOR_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionVerified, setSubscriptionVerified] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>("7d");
  const [topicsFilter, setTopicsFilter] = useState<string>("all");
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [runningScan, setRunningScan] = useState(false);
  const [currentScan, setCurrentScan] = useState<any>(null);
  const [scanPollingInterval, setScanPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini' | 'deepseek' | 'openrouter' | 'claude' | 'perplexity'>('openai');
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [scanUsage, setScanUsage] = useState<number>(0);
  const [latestScanInsights, setLatestScanInsights] = useState<any>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  // Generation counter: each new call gets a higher number; stale calls are ignored
  const fetchGenRef = useRef(0);
  // Deduplication guard for consecutive identical fetches
  const lastFetchKeyRef = useRef("");
  // Refs to always hold the CURRENT filter values for use inside closures (realtime callbacks, etc.)
  const providerRef = useRef(aiProvider);
  const timeRangeRef = useRef(timeRangeFilter);
  // Track whether the provider has been initialised from the DB yet (prevents fetchBrandDetails overwriting user selection)
  const providerInitialisedRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          setLoading(false);
          return;
        }

        // Check if email is verified (skip for OAuth providers like Google)
        const isOAuthProvider = session.user.app_metadata?.provider !== 'email';
        if (!isOAuthProvider && !session.user.email_confirmed_at) {
          toast.error("Please verify your email address before accessing the dashboard. Check your inbox for the verification link.");
          navigate("/auth?verify=true");
          setLoading(false);
          return;
        }

        setSession(session);

        try {
          await ensureProfile(
            session.user.id,
            session.user.email || undefined,
            session.user.user_metadata?.full_name || undefined
          );
        } catch (profileError) {
          console.error("Error ensuring profile:", profileError);
        }
        
        // Check onboarding completion status first
        let onboardingComplete = false;
        try {
          onboardingComplete = await Promise.race([
            checkOnboardingComplete(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
          ]);
          
          if (!onboardingComplete) {
            navigate("/onboarding/website", { replace: true });
            setLoading(false);
            return;
          }
        } catch (onboardingError) {
          console.error("Error checking onboarding:", onboardingError);
          navigate("/onboarding/website", { replace: true });
          setLoading(false);
          return;
        }

        // Get subscription limits, allowing demo access for completed onboarding
        const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
        const subscriptionLimits = await getUserSubscriptionLimits(session.user.id);
        
        setSubscriptionVerified(true);
        setSubscriptionLimits(subscriptionLimits);
        
        if (subscriptionLimits.planType === null) {
          setAiProvider('gemini');
        }
        
        await fetchUserBrands(session.user.id);
      } catch (error) {
        console.error("Error in checkAuth:", error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        try {
          const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
          const subscriptionLimits = await getUserSubscriptionLimits(session.user.id);
          setSubscriptionLimits(subscriptionLimits);
          setSubscriptionVerified(true);
          
          if (subscriptionLimits.planType === null) {
            setAiProvider('gemini');
          }

          // Check onboarding status
          const onboardingComplete = await checkOnboardingComplete();
          if (!onboardingComplete) {
            navigate("/onboarding/website", { replace: true });
            return;
          }
        } catch (error) {
          console.error("Error checking auth status on state change:", error);
        }
        
        await ensureProfile(
          session.user.id,
          session.user.email || undefined,
          session.user.user_metadata?.full_name || undefined
        );
        await fetchUserBrands(session.user.id);
        if (selectedBrandId) {
          await fetchDashboardData({ userId: session.user.id, provider: aiProvider, timeRange: timeRangeFilter });
        }
      } else {
        // No session - redirect to auth
        navigate("/auth", { replace: true });
      }
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      if (scanPollingInterval) {
        clearInterval(scanPollingInterval);
      }
    };
  }, []);

  // Keep refs in sync whenever state changes so closures always read fresh values
  useEffect(() => { providerRef.current = aiProvider; }, [aiProvider]);
  useEffect(() => { timeRangeRef.current = timeRangeFilter; }, [timeRangeFilter]);

  // Reset provider-initialised flag when brand changes so next brand's saved provider is loaded
  useEffect(() => { providerInitialisedRef.current = false; }, [selectedBrandId]);

  // Fetch brand details ONLY when brand changes (not on filter/provider changes)
  // This prevents fetchBrandDetails from overwriting the user's aiProvider selection
  useEffect(() => {
    if (selectedBrandId && session?.user.id) {
      fetchBrandDetails();
    }
  }, [selectedBrandId, session?.user.id]);

  // Check for running scans on brand change (to restore UI state after reload)
  useEffect(() => {
    if (selectedBrandId && session?.user.id) {
      // First check for running scans immediately to restore state after reload
      // This prevents white screen when reloading during a scan
      const checkRunningScan = async () => {
        try {
          const { data: runningScan } = await supabase
            .from("scans")
            .select("*")
            .eq("brand_id", selectedBrandId)
            .in("status", ["running", "pending"])
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (runningScan) {
            // Check if stuck (older than 5 minutes)
            const startedAt = new Date(runningScan.started_at || runningScan.created_at).getTime();
            if (Date.now() - startedAt > 5 * 60 * 1000) {
              console.log("Stuck scan detected, marking as failed:", runningScan.id);
              await supabase
                .from("scans")
                .update({ 
                  status: "failed", 
                  completed_at: new Date().toISOString(), 
                  ai_summary: "Error: Scan timed out or worker crashed" 
                })
                .eq("id", runningScan.id);
            } else {
              // Set immediately to restore UI state
              setCurrentScan(runningScan);
              return;
            }
          }
        } catch (error) {
          console.error("Error checking running scan:", error);
        }
        // If no running scan, fetch latest (could be completed)
        fetchLatestScan();
      };
      checkRunningScan();
    } else {
      setCurrentScan(null);
    }
  }, [selectedBrandId, session?.user.id]);

  // Fetch dashboard data when brand or filters change
  useEffect(() => {
    if (selectedBrandId && session?.user.id) {
      fetchDashboardData({ userId: session.user.id, provider: aiProvider, timeRange: timeRangeFilter });
      fetchSubscriptionLimits();
    }
  }, [selectedBrandId, timeRangeFilter, topicsFilter, aiProvider, session?.user.id]);

  useEffect(() => {
    if (session?.user.id) {
      fetchSubscriptionLimits();
    }
  }, [session?.user.id]);

  // Realtime subscription for scans table replacing polling
  useEffect(() => {
    if (!selectedBrandId) return;

    // Realtime channel for observing scan updates explicitly
    const channel = supabase
      .channel(`scans-updates-${selectedBrandId}`)
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
          // Extra guard to guarantee brand_id match
          if (newScan && newScan.brand_id !== selectedBrandId) return;

          if (newScan) {
            setCurrentScan((prevScan: any) => {
              // Status transition check (not completed -> completed)
              if (prevScan?.status !== 'completed' && newScan.status === 'completed') {
                if (session?.user?.id) {
                  // Use refs to get current filter values (callback closure would be stale)
                  fetchDashboardData({ userId: session.user.id, provider: providerRef.current, timeRange: timeRangeRef.current, forceRefresh: true });
                }
              }
              return newScan;
            });
          }
        }
      )
      .subscribe();

    // 30s background optional fallback poll
    const fallbackPollInterval = setInterval(async () => {
      if (session?.user?.id) {
        fetchLatestScan();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackPollInterval);
    };
  }, [selectedBrandId, session?.user.id]);

  const fetchLatestScan = async () => {
    if (!selectedBrandId) return;

    try {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching latest scan:", error);
        throw error;
      }

      if (data) {
        // Always update if it's a running scan to ensure progress bar updates
        // For other statuses, only update if status changed or it's a different scan
        const statusChanged = currentScan?.status !== data.status;
        const isDifferentScan = currentScan?.id !== data.id;
        const progressChanged = currentScan?.completed_questions !== data.completed_questions;
        const isRunning = data.status === 'running' || data.status === 'pending';
        
        if (isRunning) {
          // Check if stuck
          const startedAt = new Date(data.started_at || data.created_at).getTime();
          if (Date.now() - startedAt > 5 * 60 * 1000) {
            console.log("Stuck scan detected in fetchLatestScan, marking as failed:", data.id);
            await supabase
              .from("scans")
              .update({ 
                status: "failed", 
                completed_at: new Date().toISOString(), 
                ai_summary: "Error: Scan timed out or worker crashed" 
              })
              .eq("id", data.id);
            setCurrentScan(null);
            return;
          }
        }
        
        // Always update running scans to show progress, or if status/id changed
        if (isRunning || statusChanged || isDifferentScan || !currentScan || progressChanged) {
          setCurrentScan(data);
          
          if (statusChanged && data.status === 'completed' && session?.user?.id) {
            fetchDashboardData({ userId: session.user.id, provider: providerRef.current, timeRange: timeRangeRef.current, forceRefresh: true });
          }
        }
      } else {
        // Only clear currentScan if it's not running (to avoid flickering)
        if (currentScan?.status !== 'running' && currentScan?.status !== 'pending') {
          setCurrentScan(null);
        }
      }
    } catch (error) {
      console.error("Error in fetchLatestScan:", error);
    }
  };

  const fetchUserBrands = async (userId: string) => {
    try {
      const { data: brandsData, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching brands:", error);
        return;
      }

      if (brandsData && brandsData.length > 0) {
        setBrands(brandsData);
        if (!selectedBrandId) {
          setSelectedBrandId(brandsData[0].id);
          setSelectedBrandName(brandsData[0].name);
        } else {
          // Update brand name if brand ID changed
          const currentBrand = brandsData.find(b => b.id === selectedBrandId);
          if (currentBrand) {
            setSelectedBrandName(currentBrand.name);
          }
        }
      }
    } catch (error) {
      console.error("Error in fetchUserBrands:", error);
    }
  };

  const fetchBrandDetails = async () => {
    if (!selectedBrandId) return;
    
    try {
      const { data: brandData, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", selectedBrandId)
        .single();

      if (error) throw error;

      if (brandData) {
        setSelectedBrand(brandData);
        // Only set AI provider from DB on the FIRST load of this brand
        // (never overwrite a provider the user has already picked this session)
        if (!providerInitialisedRef.current) {
          const brandAny = brandData as any;
          const savedProvider = brandAny.ai_provider as string | undefined;
          const validProviders = ['openai', 'gemini', 'deepseek', 'openrouter', 'claude', 'perplexity'];
          const resolvedProvider = savedProvider && validProviders.includes(savedProvider) ? savedProvider as any : 'openai';
          setAiProvider(resolvedProvider);
          providerRef.current = resolvedProvider;
          providerInitialisedRef.current = true;
        }
      }
    } catch (error) {
      console.error("Error fetching brand details:", error);
    }
  };

  const fetchSubscriptionLimits = async () => {
    if (!session?.user?.id) return;

    try {
      const limits = await getUserSubscriptionLimits(session.user.id);
      setSubscriptionLimits(limits);
      
      // Fetch current usage
      const usage = await getUserScanUsage(session.user.id);
      setScanUsage(usage);

      // If user has Basic plan and current provider is not allowed, switch to first allowed one
      // Only do this when the provider is genuinely disallowed – prevents re-render loops
      if (limits.planType === 'basic' && !limits.allowedAIProviders.includes(providerRef.current)) {
        const fallback = limits.allowedAIProviders[0] as any;
        setAiProvider(fallback);
        providerRef.current = fallback;
        if (selectedBrandId) {
          try {
            await (supabase as any)
              .from('brands')
              .update({ ai_provider: fallback })
              .eq('id', selectedBrandId);
          } catch (error) {
            console.warn('Could not save AI provider preference:', error);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching subscription limits:", error);
    }
  };

  // Helper function to filter valid competitor names
  const isValidCompetitorName = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false;
    
    // Filter out short names
    if (name.length < 3) return false;
    
    // Stopword list
    const stopwords = new Set([
      "for", "its", "this", "these", "some", "other", "they", "while", "and", 
      "recently", "however", "october", "november", "december", "january", 
      "february", "march", "april", "may", "june", "july", "august", "september",
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should"
    ]);
    
    // Check if all lowercase and in stopwords
    const lowerName = name.toLowerCase().trim();
    if (lowerName === lowerName.toLowerCase() && stopwords.has(lowerName)) {
      return false;
    }
    
    return true;
  };

  // Helper function to extract competitor visibility from competitor_scores
  const getCompetitorVisibility = (competitorScores: any, competitorName: string): number | null => {
    if (!competitorScores || typeof competitorScores !== 'object') return null;
    
    const competitorData = competitorScores[competitorName];
    if (!competitorData) return null;
    
    // Handle both formats: { "Brand": { visibility: 45.2, mentions: 12 } } and { "Brand": 45.2 }
    if (typeof competitorData === 'object' && competitorData !== null) {
      return competitorData.visibility || competitorData.score || null;
    } else if (typeof competitorData === 'number') {
      return competitorData;
    }
    
    return null;
  };

  // Helper function to extract competitor mentions
  const getCompetitorMentions = (competitorScores: any, competitorName: string): number => {
    if (!competitorScores || typeof competitorScores !== 'object') return 0;
    
    const competitorData = competitorScores[competitorName];
    if (!competitorData) return 0;
    
    if (typeof competitorData === 'object' && competitorData !== null) {
      return competitorData.mentions || 0;
    }
    
    return 0;
  };

  const fetchDashboardData = async ({ userId, provider, timeRange, forceRefresh }: { userId: string; provider: string; timeRange: string; forceRefresh?: boolean }) => {
    if (!selectedBrandId) return;

    // Deduplicate identical fetches globally
    const fetchKey = `${selectedBrandId}-${provider}-${timeRange}`;
    if (!forceRefresh && lastFetchKeyRef.current === fetchKey && dashboardData) {
      console.log(`[Dashboard] Skip duplicate fetch: ${fetchKey}`);
      return;
    }
    lastFetchKeyRef.current = fetchKey;

    // Increment generation; capture this call's generation
    const thisGen = ++fetchGenRef.current;

    // Show loading spinner on every fetch so the user sees something is happening
    setIsDashboardLoading(true);

    try {
      // Don't call fetchLatestScan from here - it's handled by the useEffect hook
      // This prevents excessive calls when filters change
      
      // Ensure we have a valid session
      if (!session?.user?.id) {
        console.warn("No session available for fetchDashboardData");
        return;
      }

      // Calculate date range using the explicit timeRange argument
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange !== "all") {
        switch (timeRange) {
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      // Single query to fetch ALL scan results
      const { data: allScanResults, error: scanResultsError } = await (supabase as any)
        .from("ai_scan_results")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: true });

      // Generation guard: if a newer call came in, discard this result
      if (thisGen !== fetchGenRef.current) return;

      if (scanResultsError) {
        console.error("Error fetching scan results:", scanResultsError);
        if (thisGen === fetchGenRef.current) {
          setDashboardData({ isEmpty: true, scanCount: 0, error: scanResultsError.message });
        }
        return;
      }

      // Use all scan results
      let scanResults = allScanResults || [];

      // Filter explicitly by platform/provider using the explicit provider argument (no stale closure)
      if (provider && scanResults.length > 0) {
        scanResults = scanResults.filter((result: any) => {
          const resultPlatform = result.provider || result.platform || 'openai';
          return resultPlatform === provider;
        });
      }

      console.log(`[Dashboard] Fetched data for provider=${provider}, timeRange=${timeRange}, count=${scanResults.length}`);

      // Apply time filter client-side
      let filteredResults = scanResults;
      if (startDate && scanResults.length > 0) {
        filteredResults = scanResults.filter((result: any) => {
          const resultDate = new Date(result.created_at);
          return resultDate >= startDate!;
        });
      }

      // Empty state: No scans
      if (!filteredResults || filteredResults.length === 0) {
        setDashboardData({ isEmpty: true, scanCount: 0 });
        setLatestScanInsights(null);
        return;
      }

      // Get latest scan result for KPIs
      const latestScan = filteredResults[filteredResults.length - 1];

      // Get latest scan from scans table for insights (matching the provider filter)
      // Match by finding the scan that corresponds to the latest ai_scan_results entry
      let latestScanData = null;
      
      if (latestScan?.created_at) {
        // Try to find the corresponding scan by matching created_at time window
        const { data: matchingScans } = await supabase
          .from("scans")
          .select("*")
          .eq("brand_id", selectedBrandId)
          .eq("status", "completed")
          .gte("completed_at", new Date(new Date(latestScan.created_at).getTime() - 5 * 60 * 1000).toISOString())
          .lte("completed_at", new Date(new Date(latestScan.created_at).getTime() + 5 * 60 * 1000).toISOString())
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        latestScanData = matchingScans;
      }
      
      // Fallback: get most recent completed scan if no match found
      if (!latestScanData) {
        const { data: fallbackScan } = await supabase
          .from("scans")
          .select("*")
          .eq("brand_id", selectedBrandId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        latestScanData = fallbackScan;
      }
      
      // Store latest scan insights for recommendations section
      if (latestScanData) {
        // Parse JSONB fields if they're strings
        const processedData = { ...latestScanData };
        
        // Parse actionable_recommendations if it's a string
        if (typeof processedData.actionable_recommendations === 'string') {
          try {
            processedData.actionable_recommendations = JSON.parse(processedData.actionable_recommendations);
          } catch (e) {
            console.warn("Failed to parse actionable_recommendations:", e);
          }
        }
        
        // Parse strengths_and_gaps if it's a string
        if (typeof processedData.strengths_and_gaps === 'string') {
          try {
            processedData.strengths_and_gaps = JSON.parse(processedData.strengths_and_gaps);
          } catch (e) {
            console.warn("Failed to parse strengths_and_gaps:", e);
          }
        }
        
        // Parse content_ideas if it's a string
        if (typeof processedData.content_ideas === 'string') {
          try {
            processedData.content_ideas = JSON.parse(processedData.content_ideas);
          } catch (e) {
            console.warn("Failed to parse content_ideas:", e);
          }
        }
        
        // Fallback: Use old format fields (strengths, weaknesses, recommendations) if new format doesn't exist
        if (!processedData.strengths_and_gaps && (processedData.strengths || processedData.weaknesses)) {
          processedData.strengths_and_gaps = {
            strengths: processedData.strengths || [],
            gaps: processedData.weaknesses || [],
          };
        }
        
        if (!processedData.actionable_recommendations && processedData.recommendations) {
          // Convert old recommendations array to new format
          processedData.actionable_recommendations = processedData.recommendations.map((rec: string) => ({
            action: rec,
            priority: 'Moderate',
            focus_area: 'General',
          }));
        }
        
        // Only update state if insights actually changed to prevent unnecessary re-renders
        const insightsChanged = JSON.stringify(latestScanInsights) !== JSON.stringify(processedData);
        
        if (insightsChanged) {
          setLatestScanInsights(processedData);
        }
      } else {
        // Only clear if it was previously set
        if (latestScanInsights !== null) {
          setLatestScanInsights(null);
        }
      }

      // Get brand data for competitors (must be done early)
      const { data: brandDataRaw } = await (supabase as any)
        .from("brands")
        .select("primary_competitors, competitors")
        .eq("id", selectedBrandId)
        .single();
      const brandData = brandDataRaw as any;

      // topics column does not exist in brands table schema, skip
      setAvailableTopics([]);

      // Get initial competitors from brand (early, before brand ranking calculation)
      let initialCompetitors: string[] = [];
      if (brandData) {
        if (brandData.primary_competitors && Array.isArray(brandData.primary_competitors)) {
          initialCompetitors = brandData.primary_competitors
            .map((c: any) => {
              if (typeof c === 'string') {
                try {
                  const parsed = JSON.parse(c);
                  if (parsed && typeof parsed === 'object' && parsed.name) return parsed.name;
                } catch {}
                return c;
              }
              if (c && typeof c === 'object' && c.name) return c.name;
              return '';
            })
            .filter((name: string) => name && name.length > 0);
        } else if (brandData.competitors) {
          try {
            const competitors = typeof brandData.competitors === 'string' 
              ? JSON.parse(brandData.competitors) 
              : brandData.competitors;
            if (Array.isArray(competitors)) {
              initialCompetitors = competitors
                .map((c: any) => typeof c === 'string' ? c : (c?.name || ''))
                .filter((name: string) => name.length > 0);
            }
          } catch (e) {
            console.warn('Failed to parse competitors:', e);
          }
        }
      }

      // Create set of valid competitor names from user's primary_competitors (used for filtering throughout)
      const validCompetitorNames = new Set(initialCompetitors.map((c: any) => {
        if (typeof c === 'string') {
          try {
            const parsed = JSON.parse(c);
            if (parsed && typeof parsed === 'object' && parsed.name) return parsed.name.toLowerCase();
          } catch {}
          return c.toLowerCase();
        }
        if (c && typeof c === 'object' && c.name) return c.name.toLowerCase();
        return '';
      }).filter((n: string) => n.length > 0));

      // If we have no scans and this is a free account, generate mock data!
      const limits = await getUserSubscriptionLimits(userId);
      const comps = initialCompetitors.filter(name => isValidCompetitorName(name) && name.toLowerCase() !== (selectedBrandName || "").toLowerCase());
      

      
      if ((!allScanResults || allScanResults.length === 0) && limits.planType === null) {
        const displayName = selectedBrandName || "Usebear";
        console.log("Generating customized mock data for free trial/demo user of brand:", displayName);
        
        const cleanComps = ["HubSpot", "ActiveCampaign", "Marketo", "Salesforce", "Semrush"];
        
        // Competitor trends ending Apr 20
        const competitorTrend = [
          { date: "Dec 2", "Your Brand": 90.0, "HubSpot": 50.0, "ActiveCampaign": 40.0, "Marketo": 25.0, "Salesforce": 15.0, "Semrush": 8.0 },
          { date: "Dec 15", "Your Brand": 92.5, "HubSpot": 52.0, "ActiveCampaign": 42.0, "Marketo": 26.0, "Salesforce": 16.5, "Semrush": 8.5 },
          { date: "Jan 10", "Your Brand": 95.0, "HubSpot": 55.0, "ActiveCampaign": 41.5, "Marketo": 27.5, "Salesforce": 17.0, "Semrush": 9.0 },
          { date: "Feb 5", "Your Brand": 97.0, "HubSpot": 54.0, "ActiveCampaign": 43.0, "Marketo": 28.0, "Salesforce": 18.5, "Semrush": 9.5 },
          { date: "Mar 12", "Your Brand": 98.5, "HubSpot": 56.5, "ActiveCampaign": 44.0, "Marketo": 29.0, "Salesforce": 19.0, "Semrush": 9.8 },
          { date: "Apr 5", "Your Brand": 99.0, "HubSpot": 57.0, "ActiveCampaign": 44.5, "Marketo": 29.5, "Salesforce": 19.5, "Semrush": 10.0 },
          { date: "Apr 20", "Your Brand": 100.0, "HubSpot": 58.0, "ActiveCampaign": 45.0, "Marketo": 30.0, "Salesforce": 20.0, "Semrush": 10.0 }
        ];

        // Citation trends ending Apr 20
        const citationTrend = [
          { date: "Dec 2", "Citation Share": 85.0 },
          { date: "Dec 15", "Citation Share": 88.0 },
          { date: "Jan 10", "Citation Share": 91.5 },
          { date: "Feb 5", "Citation Share": 94.0 },
          { date: "Mar 12", "Citation Share": 96.5 },
          { date: "Apr 5", "Citation Share": 98.0 },
          { date: "Apr 20", "Citation Share": 100.0 }
        ];

        // Sentiment Data
        const sentimentData = [
          { name: "Positive", value: 28.7, color: "#10b981", percentage: "28.7" },
          { name: "Neutral", value: 68.8, color: "#6b7280", percentage: "68.8" },
          { name: "Negative", value: 2.5, color: "#ef4444", percentage: "2.5" },
        ];

        // Top Sources
        const cleanBrandDomain = displayName.toLowerCase().replace(/\s+/g, '');
        const topSources = [
          { rank: 1, domain: "g2.com", citations: 15 },
          { rank: 2, domain: "capterra.com", citations: 14 },
          { rank: 3, domain: "trustradius.com", citations: 10 },
          { rank: 4, domain: `${cleanBrandDomain}.ai`, citations: 9 },
          { rank: 5, domain: "hubspot.com", citations: 8 },
        ];

        // Insights / Recommendations
        const mockInsights = {
          actionable_recommendations: [
            {
              action: `Analyze the 1 negative sentiment mention to understand the cause and address the concerns immediately. Determine if it requires a public response or internal process change.`,
              priority: 'Urgent',
              focus_area: 'Branding',
              details: `Understanding individual negative customer friction points on AI recommenders ensures quick resolution before it propagates into broader citation loss.`
            },
            {
              action: `Conduct a competitive content gap analysis, specifically focusing on topics where HubSpot, Marketo, and Salesforce are highly visible but ${displayName} is not mentioned. Identify keywords and themes to target.`,
              priority: 'High',
              focus_area: 'Content',
              details: `Analyze search categories where competitors have higher share of voice and target those gaps with focused documentation and authoritative articles.`
            },
            {
              action: `Develop content directly comparing ${displayName}'s AI capabilities against HubSpot, Salesforce, Marketo, and ActiveCampaign. Highlight ${displayName}'s unique AI features and competitive advantages.`,
              priority: 'High',
              focus_area: 'Content',
              details: `Comparative search queries are growing rapidly on conversational search models. Clear pages comparing features will help models cite your advantages.`
            },
            {
              action: `Monitor mentions of competitors (HubSpot, Salesforce, Marketo, ActiveCampaign, Pardot) for opportunities to interject ${displayName} into relevant conversations and demonstrate value.`,
              priority: 'Moderate',
              focus_area: 'PR',
              details: `Proactively participate in discussions and industry publications where direct competitors are referenced to earn high-quality citations.`
            },
            {
              action: `Explore partnership opportunities with businesses that currently integrate with or recommend competing platforms (HubSpot, Salesforce, Marketo). Joint webinars or co-marketing campaigns can boost visibility.`,
              priority: 'Moderate',
              focus_area: 'Partnerships',
              details: `Integrations and co-branding are highly weighted signals for AI platforms when recommending tools for complex workflows.`
            }
          ],
          strengths_and_gaps: {
            strengths: [
              `100% Brand Visibility suggests high brand recognition in analyzed responses.`,
              `100% Citation Share indicates strong authority within the analyzed sources.`,
              `High Brand Mentions (50/50) indicates a consistent presence in the AI space.`,
              `Predominantly Neutral Sentiment suggests a solid foundation for building positive perception.`
            ],
            gaps: [
              `Over-reliance on neutral sentiment; need to actively cultivate more positive associations.`,
              `High competitor visibility (especially HubSpot) indicates missed opportunities for ${displayName}.`,
              `Limited knowledge of the context of the mentions, preventing a fully informed response strategy.`,
              `Lack of granular information about the analyzed sources and demographic.`
            ],
            opportunity_topic: `Converting neutral mentions to positive sentiment by proactively addressing user needs and showcasing ${displayName}'s value proposition.`
          },
          content_ideas: [
            {
              title: `${displayName} vs. HubSpot: A Deep Dive into AI-Powered Solutions`,
              description: `This comparison piece will highlight the strengths and weaknesses of both platforms, focusing on specific AI features and use cases where ${displayName} excels. Target audiences actively comparing the two solutions.`,
              improves_topic: "Competitor Capture",
              impact: "High Visibility"
            },
            {
              title: `Unlocking the Power of AI: Use Cases Beyond Marketing Automation`,
              description: `This blog post or whitepaper will showcase innovative AI applications beyond traditional marketing automation, demonstrating ${displayName}'s versatility and capabilities. It will address industry-specific challenges and solutions.`,
              improves_topic: "AI Use Cases",
              impact: "High Visibility"
            },
            {
              title: `How to Leverage AI for Hyper-Personalization: A ${displayName} Guide`,
              description: `This content will provide practical guidance on leveraging ${displayName}'s AI to deliver personalized experiences across the customer journey. Focus on specific tactics and real-world examples to drive engagement and conversions.`,
              improves_topic: "Hyper-Personalization",
              impact: "High Visibility"
            }
          ]
        };

        if (thisGen !== fetchGenRef.current) return;
        
        setLatestScanInsights(mockInsights);
        setDashboardData({
          isEmpty: false,
          scanCount: competitorTrend.length,
          brandVisibility: "100.0",
          citationShare: "100.0",
          brandRanking: 1,
          closestCompetitor: {
            name: "HubSpot",
            visibility: 58.0,
            mentions: 29
          },
          totalPrompts: 150,
          totalBrandCitations: 50,
          totalAllCitations: 50,
          competitorTrend,
          citationTrend,
          sentimentData,
          topSources,
          competitorNames: cleanComps,
          isMockData: true
        });
        
        setIsDashboardLoading(false);
        return;
      }

      // 1. Brand Visibility KPI
      const brandVisibility = latestScan.visibility_score ? Number(latestScan.visibility_score).toFixed(1) : "0.0";
      const actualTotalPrompts = latestScan.total_prompts || latestScanData?.total_questions || 0;
      const totalPrompts = actualTotalPrompts > 0 ? actualTotalPrompts * 3 : 0;

      // 2. Citation Share KPI
      const citationShare = latestScan.citation_share ? Number(latestScan.citation_share).toFixed(1) : "0.0";
      
      // Calculate total citations from latest scan
      // total_citations should be the sum of all citations from citation_sources
      let totalAllCitations = latestScan.total_citations || 0;
      if (totalAllCitations === 0 && latestScan.citation_sources && Array.isArray(latestScan.citation_sources)) {
        // Calculate from citation_sources if total_citations not set
        totalAllCitations = latestScan.citation_sources.reduce((sum: number, source: any) => {
          return sum + (source.citations || source.count || 0);
        }, 0);
      }
      
      const totalBrandCitations = totalAllCitations > 0 && latestScan.citation_share 
        ? Math.round(totalAllCitations * (latestScan.citation_share / 100))
        : 0;

      // 3. Brand Ranking KPI - Parse competitor_scores correctly
      // (validCompetitorNames already created above at line 657)
      // ONLY use competitors from primary_competitors, not AI-extracted ones
      const latestCompetitorScores = latestScan.competitor_scores || {};
      const allScores = [
        { name: selectedBrandName || "Your Brand", score: Number(latestScan.visibility_score) || 0 }
      ];
      
      // Extract valid competitors with their visibility scores (only from user's list)
      Object.keys(latestCompetitorScores).forEach((name) => {
        // Only include if it's in the user's competitor list
        if (validCompetitorNames.has(name.toLowerCase()) && isValidCompetitorName(name)) {
          const visibility = getCompetitorVisibility(latestCompetitorScores, name);
          if (visibility !== null && visibility >= 0) {
            allScores.push({ name, score: visibility });
          }
        }
      });
      
      allScores.sort((a, b) => b.score - a.score);
      const brandRank = allScores.findIndex(s => s.name === (selectedBrandName || "Your Brand")) + 1;
      const brandRanking = brandRank > 0 ? brandRank : null;

      // 4. Closest Competitor KPI - find competitor with visibility closest to brand
      // ONLY use competitors from primary_competitors, not AI-extracted ones
      const brandVisibilityScore = Number(latestScan.visibility_score) || 0;
      const validCompetitors = Object.keys(latestCompetitorScores)
        .filter(name => {
          // Only include if it's in the user's competitor list and not the brand itself
          return validCompetitorNames.has(name.toLowerCase()) && 
                 isValidCompetitorName(name) && 
                 name.toLowerCase() !== (selectedBrandName || "").toLowerCase();
        })
        .map(name => {
          const visibility = getCompetitorVisibility(latestCompetitorScores, name);
          const mentions = getCompetitorMentions(latestCompetitorScores, name);
          return { 
            name, 
            visibility: visibility !== null && visibility >= 0 ? Number(visibility) : 0, 
            mentions: mentions || 0 
          };
        })
        .filter(comp => comp.visibility > 0) // Only include competitors with actual visibility
        .sort((a, b) => {
          // Sort by how close their visibility is to brand visibility
          const diffA = Math.abs(a.visibility - brandVisibilityScore);
          const diffB = Math.abs(b.visibility - brandVisibilityScore);
          return diffA - diffB;
        });
      
      const closestCompetitor = validCompetitors.length > 0 ? {
        name: validCompetitors[0].name,
        mentions: validCompetitors[0].mentions || 0,
        visibility: validCompetitors[0].visibility
      } : null;

      // Aggregate sentiment across ALL scans in date range
      let totalPositive = 0;
      let totalNeutral = 0;
      let totalNegative = 0;
      filteredResults.forEach((scan: any) => {
        totalPositive += scan.sentiment_positive || 0;
        totalNeutral += scan.sentiment_neutral || 0;
        totalNegative += scan.sentiment_negative || 0;
      });

      const totalSentiment = totalPositive + totalNeutral + totalNegative;
      const sentimentData = totalSentiment > 0 ? [
        { name: "Positive", value: totalPositive, color: "#10b981", percentage: ((totalPositive / totalSentiment) * 100).toFixed(1) },
        { name: "Neutral", value: totalNeutral, color: "#6b7280", percentage: ((totalNeutral / totalSentiment) * 100).toFixed(1) },
        { name: "Negative", value: totalNegative, color: "#ef4444", percentage: ((totalNegative / totalSentiment) * 100).toFixed(1) },
      ] : [];

      // (validCompetitorNames already created above, reuse it)

      // ONLY use competitors from primary_competitors - don't use AI-extracted competitors
      // AI extraction pulls out random words, so we only track the ones the user explicitly added
      const allCompetitorNamesSet = new Set<string>();
      
      // Process initial competitors from primary_competitors field
      initialCompetitors.forEach((c: any) => {
        let competitorName = '';
        if (typeof c === 'string') {
          // Check if it's a JSON string that needs parsing
          try {
            const parsed = JSON.parse(c);
            if (parsed && typeof parsed === 'object' && parsed.name) {
              competitorName = parsed.name;
            }
          } catch {
            // Not JSON, use as-is
            competitorName = c;
          }
        } else if (c && typeof c === 'object' && c.name) {
          competitorName = c.name;
        }
        
        if (competitorName && isValidCompetitorName(competitorName)) {
          allCompetitorNamesSet.add(competitorName);
        }
      });
      
      // Add brand name to the set for tracking
      if (selectedBrandName && isValidCompetitorName(selectedBrandName)) {
        allCompetitorNamesSet.add(selectedBrandName);
      }

      // Calculate total visibility across all scans for each competitor to find top ones
      const competitorTotalVisibility = new Map<string, number>();
      allCompetitorNamesSet.forEach(name => {
        let totalVisibility = 0;
        let count = 0;
        filteredResults.forEach((scan: any) => {
          const visibility = getCompetitorVisibility(scan.competitor_scores, name);
          if (visibility !== null && visibility >= 0) {
            totalVisibility += visibility;
            count++;
          }
        });
        if (count > 0) {
          competitorTotalVisibility.set(name, totalVisibility / count);
        }
      });

      // Get top 5 competitors by average visibility
      const topCompetitors = Array.from(competitorTotalVisibility.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

      const competitorNamesArray = topCompetitors;
      const competitorTrendData: any[] = [];

      filteredResults.forEach((scan: any) => {
        const date = new Date(scan.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const dayData: any = {
          date: dateStr,
          timestamp: scan.created_at,
          "Your Brand": scan.visibility_score ? Number(scan.visibility_score) : null,
        };

        // Add competitor visibility using correct parsing - ensure values are numbers
        competitorNamesArray.forEach(compName => {
          const visibility = getCompetitorVisibility(scan.competitor_scores, compName);
          // Store as number, not string
          dayData[compName] = visibility !== null && visibility >= 0 ? Number(visibility) : null;
        });

        competitorTrendData.push(dayData);
      });

      // Citation Share Trend Chart
      const citationTrendData = filteredResults.map((scan: any) => {
        const date = new Date(scan.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date: dateStr,
          timestamp: scan.created_at,
          "Citation Share": scan.citation_share ? Number(scan.citation_share).toFixed(1) : 0,
        };
      });

      // Top Sources Table - Parse citation_sources correctly
      const sourceMap: Record<string, number> = {};
      filteredResults.forEach((scan: any) => {
        if (scan.citation_sources && Array.isArray(scan.citation_sources)) {
          scan.citation_sources.forEach((source: any) => {
            // Handle format: { "domain": "medium.com", "citations": 23 }
            const domain = source.domain || source.url || "";
            const citations = source.citations || source.count || 0;
            if (domain && citations > 0) {
              sourceMap[domain] = (sourceMap[domain] || 0) + citations;
            }
          });
        }
      });

      const topSources = Object.entries(sourceMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([domain, count], index) => ({
          rank: index + 1,
          domain,
          citations: count,
        }));

      // Only commit if this is still the latest fetch
      if (thisGen !== fetchGenRef.current) return;

      setDashboardData({
        isEmpty: false,
        scanCount: filteredResults.length,
        brandVisibility,
        citationShare,
        brandRanking,
        closestCompetitor,
        totalPrompts,
        totalBrandCitations,
        totalAllCitations,
        competitorTrend: competitorTrendData,
        citationTrend: citationTrendData,
        sentimentData,
        topSources,
        competitorNames: competitorNamesArray || [],
        latestScan,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      if (thisGen === fetchGenRef.current) {
        setDashboardData({ 
          isEmpty: true, 
          scanCount: 0, 
          error: error?.message || "Failed to load dashboard data" 
        });
      }
    } finally {
      if (thisGen === fetchGenRef.current) {
        setIsDashboardLoading(false);
      }
    }
  };

  const handleCancelScan = async () => {
    if (!currentScan || (currentScan.status !== 'running' && currentScan.status !== 'pending')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('scans')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentScan.id);

      if (error) throw error;

      toast.success("Scan cancelled successfully");
      setCurrentScan(null);
      
      if (scanPollingInterval) {
        clearInterval(scanPollingInterval);
        setScanPollingInterval(null);
      }
      
      setTimeout(() => {
        fetchLatestScan();
      }, 500);
    } catch (error: any) {
      console.error('Cancel scan error:', error);
      toast.error(error.message || "Failed to cancel scan");
    }
  };

  const handleRunGeoScan = async () => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first");
      return;
    }

    if (!session?.user?.id) {
      toast.error("Not authenticated");
      return;
    }

    // If no active subscription, show custom toast and redirect to pricing
    if (subscriptionLimits && subscriptionLimits.planType === null) {
      toast.info("Unlock custom scans! Upgrade to a paid plan to run scans on demand.", {
        action: {
          label: "View Plans",
          onClick: () => navigate("/pricing"),
        },
      });
      navigate("/pricing");
      return;
    }

    // Check scan limits
    const scanCheck = await canRunScan(session.user.id);
    if (!scanCheck.allowed) {
      toast.error(scanCheck.reason || "Cannot run scan");
      return;
    }

    // Check AI provider is allowed
    const providerCheck = await isAIProviderAllowed(session.user.id, aiProvider as any);
    if (!providerCheck.allowed) {
      toast.error(providerCheck.reason || "AI provider not allowed");
      return;
    }

    setRunningScan(true);
    try {
      toast.info("Starting GEO scan...");
      
      // Optimistically set a temporary scan state to show progress bar immediately
      // This will be replaced with real data once we fetch it
      setCurrentScan({
        id: 'temp-' + Date.now(),
        status: 'running',
        brand_id: selectedBrandId,
        completed_questions: 0,
        total_questions: 15, // Default, will be updated when we fetch real data
        started_at: new Date().toISOString(),
      });
      
      const { data, error } = await supabase.functions.invoke('run-geo-scan', {
        body: { 
          brandId: selectedBrandId, 
          aiProvider: aiProvider as 'openai' | 'gemini' | 'deepseek' | 'openrouter'
        },
      });

      if (error) {
        console.error('GEO scan invoke error:', error);
        // Clear optimistic state on error
        setCurrentScan(null);
        throw error;
      }

      if (data?.error) {
        console.error('GEO scan function error:', data.error);
        // Clear optimistic state on error
        setCurrentScan(null);
        throw new Error(data.error);
      }

      console.log('GEO scan started successfully:', data);
      toast.success("GEO scan started! This will take a few minutes. Results will appear here when complete.");
      
      // Update usage
      await fetchSubscriptionLimits();
      
      // Immediately fetch the latest scan to show progress bar with real data
      // The scan is created synchronously in the edge function, so it should be available immediately
      // Try multiple times with increasing delays to catch the scan as soon as it's created
      let retryCount = 0;
      const maxRetries = 10;
      
      const fetchScanWithRetry = async () => {
        try {
          // Direct query to get the running scan immediately
          const { data: scanData, error } = await supabase
            .from("scans")
            .select("*")
            .eq("brand_id", selectedBrandId)
            .in("status", ["running", "pending"])
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (scanData && (scanData.status === 'running' || scanData.status === 'pending')) {
            // Found running scan, update state immediately with real data
            setCurrentScan(scanData);
            return;
          }
          
          // If not found and we haven't exceeded retries, try again
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => fetchScanWithRetry(), 200 * (retryCount + 1));
          } else {
            // Final fallback - use fetchLatestScan
            await fetchLatestScan();
          }
        } catch (err) {
          console.error("Error fetching scan:", err);
          // Fallback to fetchLatestScan
          await fetchLatestScan();
        }
      };
      
      // Start fetching immediately (first attempt after 500ms to give DB time to commit)
      setTimeout(() => fetchScanWithRetry(), 500);
      
    } catch (error: any) {
      console.error('GEO scan error:', error);
      const errorMessage = error?.message || error?.error || "Failed to start GEO scan";
      toast.error(errorMessage);
      
      setTimeout(() => {
        fetchLatestScan();
      }, 2000);
    } finally {
      setRunningScan(false);
    }
  };

  // Custom tooltip for competitor chart
  const CompetitorTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-xl p-4 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[13px] font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            {payload[0]?.payload?.date || 'Competitor Trends'}
          </p>
          <div className="flex flex-col gap-2.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-[13px] font-medium text-slate-700">{entry.name}</span>
                </div>
                <span className="text-[13px] font-bold" style={{ color: entry.color }}>
                  {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for citation chart
  const CitationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-emerald-100 rounded-xl shadow-xl p-4 min-w-[140px] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
          <p className="text-[12px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
            {payload[0]?.payload?.date || 'Date'}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}%
            </span>
            <span className="text-[13px] font-medium text-emerald-700/80 mb-1">share</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Only show loading screen if we don't have session yet, subscription not verified, or if we're checking subscription
  // Don't block UI if we have a running scan - let it show progress
  if (loading || !subscriptionVerified) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50/50">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-10">
                <div className="mb-8">
                  <h1 className="text-3xl font-medium text-gray-900 mb-6">Dashboard</h1>
                  <div className="flex gap-4">
                    <div className="w-[180px] h-10 bg-gray-100 rounded-md animate-pulse"></div>
                    <div className="w-[180px] h-10 bg-gray-100 rounded-md animate-pulse"></div>
                    <div className="w-[180px] h-10 bg-gray-100 rounded-md animate-pulse"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <ShimmerCard />
                  <ShimmerCard />
                  <ShimmerCard />
                  <ShimmerCard />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ShimmerChart />
                  <ShimmerChart />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Empty state - no scans
  if (!dashboardData || (dashboardData.isEmpty && dashboardData.scanCount === 0)) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50/50">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-10">
                {(currentScan?.status === 'running' || currentScan?.status === 'pending') && (
                  <Alert className="mb-6 border-blue-200/80 bg-gradient-to-r from-blue-50 to-blue-50/50 shadow-md rounded-xl overflow-hidden">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <AlertDescription className="ml-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-blue-900 text-base">
                          GEO Scan in progress...
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-blue-700 font-semibold bg-blue-100 px-3 py-1 rounded-lg">
                            {(currentScan.completed_questions || 0) * 10} / 150 prompts answered
                          </span>
                          <Button
                            onClick={handleCancelScan}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                      <Progress 
                        value={currentScan.total_questions > 0 
                          ? ((currentScan.completed_questions || 0) / currentScan.total_questions) * 100 
                          : 0} 
                        className="h-2.5 bg-blue-100 rounded-full"
                      />
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="mb-8">
                  {/* Header & Run Scan Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h1 className="text-4xl font-medium text-[#0f172a] tracking-tight">Dashboard</h1>
                    </div>
                    {selectedBrandId && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm h-11">
                            <div className="text-[13px] font-medium text-gray-700">
                              <span className="font-bold text-gray-900">{scanUsage}</span>
                              <span className="text-gray-500"> / {subscriptionLimits.scansPerMonth} scans</span>
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={handleRunGeoScan}
                          disabled={
                            runningScan || 
                            currentScan?.status === 'running' || 
                            (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth)
                          }
                          className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-sm h-11 px-6 font-semibold rounded-xl"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${runningScan || currentScan?.status === 'running' ? 'animate-spin' : ''}`} />
                          {currentScan?.status === 'running' ? 'Scanning...' : 
                           (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth) ? 'Limit Reached' : 'Run GEO Scan'}
                        </Button>
                        {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-xs text-amber-700 font-medium">Monthly limit reached</span>
                          </div>
                        )}
                        {subscriptionLimits && (!subscriptionLimits.planType || subscriptionLimits.scansPerMonth === 0) && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-xs text-amber-700 font-medium">No active subscription</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    {brands.length > 0 && (
                      <Select 
                        value={selectedBrandId} 
                        onValueChange={(value) => {
                          setSelectedBrandId(value);
                          const brand = brands.find(b => b.id === value);
                          if (brand) setSelectedBrandName(brand.name);
                        }}
                      >
                        <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-all">
                          <SelectValue placeholder="Select Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {selectedBrandId && (
                      <AIProviderSelect
                        value={aiProvider}
                        onValueChange={async (value) => {
                          if (!session?.user?.id) return;
                          
                          const providerCheck = await isAIProviderAllowed(session.user.id, value as any);
                          if (!providerCheck.allowed) {
                            toast.error(providerCheck.reason || "AI provider not available on your plan");
                            return;
                          }
                          
                          setAiProvider(value as any);
                          if (selectedBrandId) {
                            try {
                              const { error } = await (supabase as any)
                                .from('brands')
                                .update({ ai_provider: value })
                                .eq('id', selectedBrandId);
                              if (error) {
                                console.warn('Could not save AI provider preference:', error.message);
                              }
                            } catch (error) {
                              console.warn('Error saving AI provider preference:', error);
                            }
                          }
                        }}
                        subscriptionLimits={subscriptionLimits}
                        disabled={runningScan || currentScan?.status === 'running' || currentScan?.status === 'pending'}
                        className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-all"
                      />
                    )}
                    
                    <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                      <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-all">
                        <SelectValue placeholder="Time Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isDashboardLoading ? (
                  <div className="text-center py-24">
                    <Loader2 className="h-10 w-10 animate-spin text-[#0f172a] mx-auto mb-4" />
                    <p className="text-gray-900 mb-2 text-xl font-bold tracking-tight">Loading Dashboard...</p>
                    <p className="text-gray-500 text-sm font-medium">Fetching history and optimizing views...</p>
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 mb-2 text-xl font-bold tracking-tight">No AI visibility data yet.</p>
                    <p className="text-gray-500 mb-8 text-sm font-medium max-w-md mx-auto">Run your first GEO Scan to start tracking your brand's AI presence and get actionable insights.</p>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Show charts even with 1 scan - just show single data point
  const hasInsufficientData = dashboardData.scanCount < 1;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-10">
              {/* Interactive Demo Mode alert banner for unsubscribed demo accounts */}
              {subscriptionLimits && subscriptionLimits.planType === null && (
                <Alert className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/40 shadow-sm rounded-xl overflow-hidden flex items-center justify-between p-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 animate-pulse flex-shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        Citero Interactive Demo Mode
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Previewing simulated AI search visibility insights for <span className="font-bold text-slate-700">{selectedBrandName || "your brand"}</span>.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate("/pricing")}
                    size="sm" 
                    className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all text-xs"
                  >
                    Unlock Full Access
                  </Button>
                </Alert>
              )}

              {/* Scan Progress Indicator */}
              {(currentScan?.status === 'running' || currentScan?.status === 'pending') && (
                <Alert className="mb-6 border-blue-200/80 bg-gradient-to-r from-blue-50 to-blue-50/50 shadow-md rounded-xl overflow-hidden">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <AlertDescription className="ml-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-blue-900 text-base">
                        GEO Scan in progress...
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-700 font-semibold bg-blue-100 px-3 py-1 rounded-lg">
                          {(currentScan.completed_questions || 0) * 10} / 150 prompts answered
                        </span>
                        <Button
                          onClick={handleCancelScan}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all shadow-sm"
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <Progress 
                      value={currentScan.total_questions > 0 
                        ? ((currentScan.completed_questions || 0) / currentScan.total_questions) * 100 
                        : 0} 
                      className="h-2.5 bg-blue-100 rounded-full"
                    />
                  </AlertDescription>
                </Alert>
              )}
              
              
              {/* Header with Filters */}
              {/* Header with Filters */}
              {/* Header with Filters */}
              <div className="mb-10">
                {/* Title and Run Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-4xl font-medium text-[#0f172a] tracking-tight">Dashboard</h1>
                  </div>
                  
                  {/* Run Scan Button */}
                  {selectedBrandId && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Scan Usage Info */}
                      {subscriptionLimits && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm h-11">
                          <div className="text-[13px] font-medium text-gray-700">
                            <span className="font-bold text-gray-900">
                              {subscriptionLimits.planType === null ? 13 : scanUsage}
                            </span>
                            <span className="text-gray-500">
                              {" "}
                              / {subscriptionLimits.planType === null ? 150 : subscriptionLimits.scansPerMonth} scans
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <Button
                        onClick={handleRunGeoScan}
                        disabled={
                          runningScan || 
                          currentScan?.status === 'running' || 
                          currentScan?.status === 'pending' || 
                          (subscriptionLimits && subscriptionLimits.planType !== null && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth)
                        }
                        className="bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-sm transition-all duration-200 h-11 px-6 font-semibold hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${runningScan || currentScan?.status === 'running' || currentScan?.status === 'pending' ? 'animate-spin' : ''}`} />
                        {currentScan?.status === 'running' || currentScan?.status === 'pending' ? 'Scanning...' : 
                         (subscriptionLimits && subscriptionLimits.planType !== null && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth) ? 'Limit Reached' : 'Run GEO Scan'}
                      </Button>
                      
                      {/* Limit Warnings */}
                      {subscriptionLimits && subscriptionLimits.planType !== null && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-xs text-amber-700 font-medium">Monthly limit reached</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {brands.length > 0 && (
                    <Select 
                      value={selectedBrandId} 
                      onValueChange={(value) => {
                        setSelectedBrandId(value);
                        const brand = brands.find(b => b.id === value);
                        if (brand) setSelectedBrandName(brand.name);
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-all">
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedBrandId && (
                    <AIProviderSelect
                      value={aiProvider}
                      onValueChange={async (value) => {
                        if (!session?.user?.id) return;
                        
                        // Check if provider is allowed
                        const providerCheck = await isAIProviderAllowed(session.user.id, value as any);
                        if (!providerCheck.allowed) {
                          toast.error(providerCheck.reason || "AI provider not available on your plan");
                          return;
                        }
                        
                        setAiProvider(value as any);
                        if (selectedBrandId) {
                          try {
                            const { error } = await (supabase as any)
                              .from('brands')
                              .update({ ai_provider: value })
                              .eq('id', selectedBrandId);
                            if (error) {
                              console.warn('Could not save AI provider preference:', error.message);
                            }
                          } catch (error) {
                            console.warn('Error saving AI provider preference:', error);
                          }
                        }
                      }}
                      subscriptionLimits={subscriptionLimits}
                      disabled={runningScan || currentScan?.status === 'running' || currentScan?.status === 'pending'}
                      className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-all"
                    />
                  )}

                  <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-gray-200 text-[13.5px] transition-none">
                      <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!dashboardData?.isEmpty && (
                   <p className="mt-5 text-sm text-gray-700 font-medium">
                     Report based on 150 prompts. Showing AI visibility trends.
                   </p>
                )}
              </div>

              {subscriptionLimits && subscriptionLimits.planType === null ? (
                <div className="relative border border-slate-200 bg-white rounded-2xl p-12 text-center shadow-sm max-w-2xl mx-auto my-6 flex flex-col items-center justify-center animate-fade-in z-10">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-indigo-650 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">GEO Tracking Dashboard Locked</h2>
                  <p className="text-slate-500 text-sm max-w-md mb-8 leading-relaxed font-medium">
                    You've successfully completed onboarding. Detailed search share-of-voice charts, daily citation tracking, and on-demand scans are locked. Upgrade to unlock full analytics.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <Button 
                      onClick={() => navigate("/pricing")}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 px-8 rounded-xl shadow-sm hover:scale-[1.01] transition-all border-none"
                    >
                      Upgrade to Paid Plan
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/audits")}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 py-6 px-8 rounded-xl font-medium"
                    >
                      Go to Brand Audits (1 Free)
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {/* Brand Visibility */}
                <Card className="relative overflow-hidden p-6 border border-gray-200 bg-white">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Brand Visibility</p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentage of prompts where your brand appeared compared to competitors.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                    <p className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">{dashboardData.brandVisibility}%</p>
                    <p className="text-xs text-gray-500 font-medium">Based on {dashboardData.totalPrompts || 0} prompts simulated</p>
                  </div>
                </Card>

                {/* Citation Share */}
                <Card className="relative overflow-hidden p-6 border border-gray-200 bg-white">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Citation Share</p>
                  </div>
                    <p className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">{dashboardData.citationShare}%</p>
                    <p className="text-xs text-gray-500 font-medium">
                    {dashboardData.totalBrandCitations || 0} of {dashboardData.totalAllCitations || 0} citations
                  </p>
                  </div>
                </Card>

                {/* Brand Ranking */}
                <Card className="relative overflow-hidden p-6 border border-gray-200 bg-white">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Brand Ranking</p>
                  </div>
                    <p className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                    #{dashboardData.brandRanking || "N/A"}
                  </p>
                    <p className="text-xs text-gray-500 font-medium">Market tier based on AI visibility</p>
                  </div>
                </Card>

                {/* Closest Competitor */}
                <Card className="relative overflow-hidden p-6 border border-gray-200 bg-white">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Closest Competitor</p>
                  </div>
                  {dashboardData.closestCompetitor ? (
                    <>
                        <p className="text-2xl font-bold text-gray-900 mb-2 tracking-tight truncate">{dashboardData.closestCompetitor.name}</p>
                        <p className="text-xs text-gray-500 font-medium">
                        {dashboardData.closestCompetitor.visibility !== undefined 
                          ? `${dashboardData.closestCompetitor.visibility.toFixed(1)}% visibility`
                          : `${dashboardData.closestCompetitor.mentions} mentions`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No competitors found</p>
                  )}
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 mb-6">
                {/* Competitor Visibility Chart */}
                <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Competitor Visibility</h3>
                    <p className="text-xs text-gray-500 mt-1">Track visibility trends over time</p>
                  </div>
                  {hasInsufficientData ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <p>Run your first scan to see competitor visibility.</p>
                    </div>
                  ) : dashboardData.competitorTrend.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <p>No competitor data available yet.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={dashboardData.competitorTrend} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorYourBrand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <filter id="shadow" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.2"/>
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
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                          width={40}
                        />
                        <Tooltip 
                          content={<CompetitorTooltip />}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="circle"
                          iconSize={8}
                          fontSize={11}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Your Brand" 
                          stroke="#3b82f6" 
                          fillOpacity={1} 
                          fill="url(#colorYourBrand)" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                          name="Your Brand"
                          connectNulls={false}
                          style={{ filter: 'url(#shadow)' }}
                        />
                        {dashboardData.competitorNames && dashboardData.competitorNames.length > 0 ? dashboardData.competitorNames.map((name: string, index: number) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={COMPETITOR_COLORS[index % COMPETITOR_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#fff', stroke: COMPETITOR_COLORS[index % COMPETITOR_COLORS.length], strokeWidth: 1.5 }}
                            activeDot={{ r: 5, fill: COMPETITOR_COLORS[index % COMPETITOR_COLORS.length], stroke: '#fff', strokeWidth: 1.5 }}
                            name={name}
                            connectNulls={false}
                          />
                        )) : null}
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

              {/* Citation Share and Sentiment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                {/* Citation Share Trends Chart */}
                <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Citation Share Trends</h3>
                    <p className="text-xs text-gray-500 mt-1">Monitor citation performance</p>
                  </div>
                  {hasInsufficientData ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <p>Run your first scan to see citation share trends.</p>
                    </div>
                  ) : dashboardData.citationTrend.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <p>No citation data available.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dashboardData.citationTrend} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorCitation" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <filter id="shadowCitation" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.2"/>
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
                          tickLine={false}
                          axisLine={false}
                          tickMargin={12}
                          width={40}
                        />
                        <Tooltip 
                          content={<CitationTooltip />}
                          cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Citation Share" 
                          stroke="#10b981" 
                          fillOpacity={1}
                          fill="url(#colorCitation)"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                          style={{ filter: 'url(#shadowCitation)' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                {/* Sentiment Distribution Pie Chart */}
                <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Sentiment Distribution</h3>
                    <p className="text-xs text-gray-500 mt-1">Overall brand sentiment analysis</p>
                  </div>
                  {dashboardData.sentimentData.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                      <div className="w-32 h-32 rounded-full border-4 border-gray-200 mb-4"></div>
                      <p>No sentiment data yet. Run a GEO scan.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dashboardData.sentimentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {dashboardData.sentimentData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '24px' }}
                          iconType="circle"
                          iconSize={10}
                          fontSize={12}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

              {/* Top Sources Table */}
              <div className="grid grid-cols-1 mb-10">
                <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Top Sources</h3>
                    <p className="text-xs text-gray-500 mt-1">Leading citation sources</p>
                  </div>
                  {dashboardData.topSources.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 pb-2 border-b border-gray-200 text-xs font-medium text-gray-600">
                        <div>Rank</div>
                        <div>Source Domain</div>
                        <div className="text-right">Total Citations</div>
                      </div>
                      {dashboardData.topSources.map((source: any) => (
                        <div key={source.domain} className="grid grid-cols-3 gap-4 py-3 px-2 hover:bg-gray-50/80 rounded-lg transition-colors duration-150">
                          <div className="text-sm font-semibold text-gray-900">{source.rank}</div>
                          <div className="text-sm text-gray-700 truncate font-medium">{source.domain}</div>
                          <div className="text-sm font-bold text-gray-900 text-right">{source.citations}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                      <p>No sources found yet for this brand in the selected period.</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Things To Do - Stacked Expandable Cards */}
              {(() => {
                // Parse actionable_recommendations - can be array or object
                let actionItems: any[] = [];
                if (latestScanInsights?.actionable_recommendations) {
                  if (Array.isArray(latestScanInsights.actionable_recommendations)) {
                    actionItems = latestScanInsights.actionable_recommendations;
                  } else if (typeof latestScanInsights.actionable_recommendations === 'object') {
                    // Handle object format: { action_items: [...] }
                    actionItems = latestScanInsights.actionable_recommendations.action_items || 
                                 latestScanInsights.actionable_recommendations.items || [];
                  }
                }
                
                // Sort by priority: Urgent first, then High, then others
                const priorityOrder: Record<string, number> = { 'Urgent': 0, 'High': 1, 'Moderate': 2, 'Low': 3 };
                const sortedItems = [...actionItems].sort((a, b) => {
                  const aPriority = priorityOrder[a.priority] ?? 99;
                  const bPriority = priorityOrder[b.priority] ?? 99;
                  return aPriority - bPriority;
                });
                
                const toggleItem = (index: number) => {
                  setExpandedItems(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(index)) {
                      newSet.delete(index);
                    } else {
                      newSet.add(index);
                    }
                    return newSet;
                  });
                };
                
                // Always show the section, even if empty
                return (
                  <div className="mb-10">
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                        Boost Product Visibility
                      </h3>
                      <p className="text-sm text-gray-600">
                        Clear, prioritized steps to turn mentions into customers
                      </p>
                    </div>

                    {/* Stacked Cards */}
                    {sortedItems.length > 0 ? (
                      <div className="space-y-3">
                        {sortedItems.map((rec: any, index: number) => {
                          const actionText = rec.action || rec.title || '';
                          const priority = rec.priority || 'Moderate';
                          const focusArea = rec.focus_area || rec.category || 'General';
                          const isUrgent = priority === 'Urgent';
                          const isExpanded = expandedItems.has(index);
                          const hasDetails = rec.details || rec.description || rec.reason;
                          
                          return (
                            <Card 
                              key={index}
                              className={`border border-gray-200 bg-white shadow-sm transition-all duration-150 hover:shadow-md ${hasDetails ? 'cursor-pointer' : ''}`}
                              onClick={() => hasDetails && toggleItem(index)}
                            >
                              <div className="px-5 py-4">
                                <div className="flex items-start gap-3">
                                  {/* Priority Badge - Red for Urgent, Gray for others */}
                                  {isUrgent ? (
                                    <div className="flex-shrink-0 w-1.5 h-full bg-red-500 rounded-full mt-1"></div>
                                  ) : (
                                    <div className="flex-shrink-0 w-1.5 h-full bg-gray-300 rounded-full mt-1"></div>
                                  )}
                                  
                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <p className="text-sm text-gray-900 font-medium leading-relaxed flex-1">
                                        {actionText}
                                      </p>
                                      {hasDetails && (
                                        <div className="flex-shrink-0">
                                          <ArrowRight 
                                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Tags */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isUrgent ? (
                                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                          {priority}
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200">
                                          {priority}
                                        </span>
                                      )}
                                      <span className="px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200">
                                        {focusArea}
                                      </span>
                                    </div>
                                    
                                    {/* Expanded Details */}
                                    {isExpanded && hasDetails && (
                                      <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                          {rec.details || rec.description || rec.reason}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border border-gray-200 bg-white shadow-sm">
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-500">No actionable recommendations available yet. Run a scan to generate insights.</p>
                        </div>
                      </Card>
                    )}
                  </div>
                );
              })()}

              {/* Fallback: Simple Recommendations */}
              {!latestScanInsights?.actionable_recommendations?.length && latestScanInsights?.recommendations?.length > 0 && (
                <Card className="p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 mb-10">
                  <div className="mb-5 pb-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">What to Do Next</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Actionable recommendations for your brand</p>
                  </div>
                  <ul className="space-y-3">
                    {latestScanInsights.recommendations.map((recommendation: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-gray-700 group/item">
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="flex-1 font-medium leading-relaxed">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Strengths & Gaps - Clean Professional Style */}
              {latestScanInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                  {/* Strengths Card */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 pb-4 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          Key Strengths
                        </h3>
                      </div>
                      {(latestScanInsights.strengths_and_gaps?.strengths?.length > 0 || latestScanInsights?.strengths?.length > 0) ? (
                        <ul className="space-y-3.5">
                          {(latestScanInsights.strengths_and_gaps?.strengths || latestScanInsights?.strengths || []).map((strength: string, index: number) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                              <span className="flex-1 font-medium leading-relaxed">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No strengths identified yet. Run a scan to analyze your brand visibility.</p>
                      )}
                    </div>
                  </Card>
                  
                  {/* Gaps Card */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 pb-4 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          Visibility Gaps
                        </h3>
                      </div>
                      {(latestScanInsights.strengths_and_gaps?.gaps?.length > 0 || latestScanInsights?.weaknesses?.length > 0) ? (
                        <>
                          <ul className="space-y-3.5">
                            {(latestScanInsights.strengths_and_gaps?.gaps || latestScanInsights?.weaknesses || []).map((gap: string, index: number) => (
                              <li key={index} className="flex items-start gap-3 text-sm text-gray-700">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                <span className="flex-1 font-medium leading-relaxed">{gap}</span>
                              </li>
                            ))}
                          </ul>
                          {latestScanInsights.strengths_and_gaps?.opportunity_topic && (
                            <div className="mt-5 pt-4 border-t border-gray-200">
                              <p className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Opportunity Topic</p>
                              <p className="text-sm text-gray-700 font-medium">{latestScanInsights.strengths_and_gaps.opportunity_topic}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No gaps identified yet. Run a scan to discover improvement opportunities.</p>
                      )}
                    </div>
                  </Card>
                </div>
              )}
              
              {/* Show empty state if no insights at all */}
              {!latestScanInsights && dashboardData && !dashboardData.isEmpty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 pb-4 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Key Strengths</h3>
                      </div>
                      <p className="text-sm text-gray-500">Run a scan to analyze your brand visibility and identify strengths.</p>
                    </div>
                  </Card>
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 pb-4 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Visibility Gaps</h3>
                      </div>
                      <p className="text-sm text-gray-500">Run a scan to discover improvement opportunities.</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Content Ideas */}
              {latestScanInsights?.content_ideas?.length > 0 && (
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg mb-8 overflow-hidden">
                  <div className="p-6 bg-white">
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                      Suggested Content Topics
                    </h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">Content ideas to improve your AI visibility</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestScanInsights.content_ideas.map((idea: any, index: number) => (
                        <div 
                          key={index} 
                          className="p-5 rounded-xl border border-gray-200 bg-white"
                        >
                          <h4 className="font-bold text-sm mb-2 text-gray-900">{idea.title}</h4>
                          <p className="text-sm text-gray-600 mb-4 leading-relaxed font-medium">
                            {idea.description}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {idea.improves_topic && (
                              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                                {idea.improves_topic}
                              </span>
                            )}
                            {idea.impact && (
                              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                                {idea.impact}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
