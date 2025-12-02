import { useEffect, useState } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { ArrowRight, Play, Loader2, X, Info, Target, Users, Lightbulb, CheckCircle2, Sparkles } from "lucide-react";
import { mergeCompetitors } from "@/lib/utils/competitorAnalysis";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { AIProviderSelect } from "@/components/AIProviderSelect";
import { canRunScan, isAIProviderAllowed, getUserSubscriptionLimits, getUserScanUsage, SubscriptionLimits } from "@/lib/subscriptionLimits";
import { AlertCircle, RefreshCw } from "lucide-react";

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
  const [aiProvider, setAiProvider] = useState<'openai' | 'gemini' | 'deepseek' | 'openrouter'>('openai');
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [scanUsage, setScanUsage] = useState<number>(0);
  const [latestScanInsights, setLatestScanInsights] = useState<any>(null);

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
        
        // Check if user has an active subscription
        const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
        const subscriptionLimits = await getUserSubscriptionLimits(session.user.id);
        const hasActiveSubscription = subscriptionLimits.planType !== null;
        
        // Only check onboarding if user has a subscription
        if (hasActiveSubscription) {
          let onboardingComplete = false;
          try {
            onboardingComplete = await Promise.race([
              checkOnboardingComplete(),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000))
            ]);
            
            if (!onboardingComplete) {
              navigate("/onboarding/website");
              setLoading(false);
              return;
            }
          } catch (onboardingError) {
            console.error("Error checking onboarding:", onboardingError);
            navigate("/onboarding/website");
            setLoading(false);
            return;
          }
        } else {
          // No subscription - redirect to pricing
          navigate("/pricing");
          setLoading(false);
          return;
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
        await ensureProfile(
          session.user.id,
          session.user.email || undefined,
          session.user.user_metadata?.full_name || undefined
        );
        await fetchUserBrands(session.user.id);
        if (selectedBrandId) {
          await fetchDashboardData(session.user.id);
        }
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

  // Fetch latest scan only when brand changes, not when filters change
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
            .eq("status", "running")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (runningScan) {
            // Set immediately to restore UI state
            setCurrentScan(runningScan);
            // Start polling right away
            return;
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
      fetchDashboardData(session.user.id);
      fetchSubscriptionLimits();
      fetchBrandDetails();
      
      // Set up periodic refresh to check for new completed scans (every 15 seconds)
      const refreshInterval = setInterval(() => {
        fetchDashboardData(session.user.id);
        fetchLatestScan();
      }, 15000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [selectedBrandId, timeRangeFilter, topicsFilter, session?.user.id]);

  useEffect(() => {
    if (session?.user.id) {
      fetchSubscriptionLimits();
    }
  }, [session?.user.id]);

  useEffect(() => {
    // Clean up any existing interval first
    if (scanPollingInterval) {
      clearInterval(scanPollingInterval);
      setScanPollingInterval(null);
    }

    // Poll if scan is running and we have a brand selected
    if (currentScan?.status === 'running' && selectedBrandId) {
      const interval = setInterval(() => {
        fetchLatestScan();
      }, 2000);
      setScanPollingInterval(interval);
      return () => {
        clearInterval(interval);
        setScanPollingInterval(null);
      };
    }
    
    // Also poll periodically even when no scan is running to catch completed scans
    // This ensures dashboard updates when scans complete in the background
    if (selectedBrandId && session?.user.id && currentScan?.status !== 'running') {
      const backgroundPollInterval = setInterval(async () => {
        // Check for latest scan
        const { data: latestScan } = await supabase
          .from("scans")
          .select("*")
          .eq("brand_id", selectedBrandId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // If we found a completed scan that's different from current, refresh dashboard
        if (latestScan && latestScan.status === 'completed' && latestScan.id !== currentScan?.id) {
          await fetchDashboardData(session.user.id);
          setCurrentScan(latestScan);
        }
      }, 10000); // Check every 10 seconds
      
      return () => {
        clearInterval(backgroundPollInterval);
      };
    }
  }, [currentScan?.status, currentScan?.id, selectedBrandId, session?.user.id]);

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
        const isRunning = data.status === 'running';
        
        // Always update running scans to show progress, or if status/id changed
        if (isRunning || statusChanged || isDifferentScan || !currentScan || progressChanged) {
          setCurrentScan(data);
          
          if (data.status === 'completed' && session?.user.id && statusChanged) {
            // Refresh dashboard immediately when scan completes to show insights
            // Also refresh insights data - use multiple attempts to ensure data is ready
            const refreshDashboard = async (attempt = 1) => {
              await fetchDashboardData(session.user.id);
              await fetchLatestScan();
              
              // If this is the first attempt, try again after 2 seconds to catch any delayed data
              if (attempt === 1) {
                setTimeout(() => refreshDashboard(2), 2000);
              }
            };
            
            // Start refresh immediately
            setTimeout(() => refreshDashboard(1), 500);
          }
        }
      } else {
        // Only clear currentScan if it's not running (to avoid flickering)
        if (currentScan?.status !== 'running') {
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
        // Set AI provider from brand settings or default to openai
        const provider = brandData.ai_provider as 'openai' | 'gemini' | 'deepseek' | 'openrouter' | undefined;
        setAiProvider(provider && ['openai', 'gemini', 'deepseek', 'openrouter'].includes(provider) ? provider : 'openai');
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

      // If user has Basic plan and current provider is not allowed, switch to allowed one
      if (limits.planType === 'basic' && !limits.allowedAIProviders.includes(aiProvider)) {
        setAiProvider(limits.allowedAIProviders[0] as 'openai' | 'gemini');
        if (selectedBrandId) {
          try {
            await supabase
              .from('brands')
              .update({ ai_provider: limits.allowedAIProviders[0] })
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

  const fetchDashboardData = async (userId: string) => {
    try {
      if (!selectedBrandId) {
        setDashboardData(null);
        return;
      }

      // Don't call fetchLatestScan from here - it's handled by the useEffect hook
      // This prevents excessive calls when filters change
      
      // Ensure we have a valid session
      if (!session?.user?.id) {
        console.warn("No session available for fetchDashboardData");
        return;
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRangeFilter !== "all") {
        switch (timeRangeFilter) {
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

      if (scanResultsError) {
        console.error("Error fetching scan results:", scanResultsError);
        // Set empty state instead of null to prevent blank screen
        setDashboardData({ isEmpty: true, scanCount: 0, error: scanResultsError.message });
        return;
      }

      // Use all scan results (no platform filtering)
      const scanResults = allScanResults || [];

      // Apply time filter client-side
      let filteredResults = scanResults || [];
      if (startDate && scanResults) {
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

      // Get brand data for topics and competitors (must be done early)
      const { data: brandData } = await supabase
        .from("brands")
        .select("topics, primary_competitors, competitors")
        .eq("id", selectedBrandId)
        .single();

      if (brandData && (brandData as any).topics && Array.isArray((brandData as any).topics)) {
        setAvailableTopics((brandData as any).topics);
      } else {
        setAvailableTopics([]);
      }

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

      // 1. Brand Visibility KPI
      const brandVisibility = latestScan.visibility_score ? Number(latestScan.visibility_score).toFixed(1) : "0.0";
      const totalPrompts = latestScan.total_prompts || latestScanData?.total_questions || 0;

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
        } else if (typeof c === 'string') {
          competitorName = c;
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
      // Set empty state instead of null to prevent blank screen
      setDashboardData({ 
        isEmpty: true, 
        scanCount: 0, 
        error: error?.message || "Failed to load dashboard data" 
      });
    }
  };

  const handleCancelScan = async () => {
    if (!currentScan || currentScan.status !== 'running') {
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

    // Check scan limits
    const scanCheck = await canRunScan(session.user.id);
    if (!scanCheck.allowed) {
      toast.error(scanCheck.reason || "Cannot run scan");
      return;
    }

    // Check AI provider is allowed
    const providerCheck = await isAIProviderAllowed(session.user.id, aiProvider);
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
            .eq("status", "running")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (scanData && scanData.status === 'running') {
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value}%
            </p>
          ))}
          {payload[0]?.payload?.timestamp && (
            <p className="text-xs text-gray-500 mt-2">
              {new Date(payload[0].payload.timestamp).toLocaleDateString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for citation chart
  const CitationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">
            Citation Share: {payload[0].value}%
          </p>
          {payload[0]?.payload?.timestamp && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(payload[0].payload.timestamp).toLocaleDateString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Only show loading screen if we don't have session yet or if we're checking subscription
  // Don't block UI if we have a running scan - let it show progress
  if (loading && (!session || (!currentScan && !selectedBrandId))) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50/50">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-10">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
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
                {currentScan?.status === 'running' && (
                  <Alert className="mb-6 border-blue-200/80 bg-gradient-to-r from-blue-50 to-blue-50/50 shadow-md rounded-xl overflow-hidden">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <AlertDescription className="ml-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-blue-900 text-base">
                          GEO Scan in progress...
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-blue-700 font-semibold bg-blue-100 px-3 py-1 rounded-lg">
                            {currentScan.completed_questions || 0} / {currentScan.total_questions || 0} prompts answered
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
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                      </div>
                      {brands.length > 0 && (
                        <Select 
                          value={selectedBrandId} 
                          onValueChange={(value) => {
                            setSelectedBrandId(value);
                            const brand = brands.find(b => b.id === value);
                            if (brand) setSelectedBrandName(brand.name);
                          }}
                        >
                          <SelectTrigger className="w-[200px] border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <SelectValue placeholder="Select Brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Provider Selection and Run Scan */}
                  {selectedBrandId && (
                    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Label htmlFor="ai-provider" className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                          AI Provider
                        </Label>
                        <AIProviderSelect
                          value={aiProvider}
                          onValueChange={async (value) => {
                            if (!session?.user?.id) return;
                            
                            const providerCheck = await isAIProviderAllowed(session.user.id, value);
                            if (!providerCheck.allowed) {
                              toast.error(providerCheck.reason || "AI provider not available on your plan");
                              return;
                            }
                            
                            setAiProvider(value);
                            if (selectedBrandId) {
                              try {
                                const { error } = await supabase
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
                          disabled={runningScan || currentScan?.status === 'running'}
                          className="w-full bg-white border-gray-300 text-sm h-10"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && (
                          <div className="text-xs text-gray-500 text-right">
                            {scanUsage} / {subscriptionLimits.scansPerMonth} scans this month
                          </div>
                        )}
                        <Button
                          onClick={handleRunGeoScan}
                          disabled={
                            runningScan || 
                            currentScan?.status === 'running' || 
                            (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth)
                          }
                          className="bg-gray-900 text-white hover:bg-gray-800"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${runningScan || currentScan?.status === 'running' ? 'animate-spin' : ''}`} />
                          {currentScan?.status === 'running' ? 'Scanning...' : 
                           (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth) ? 'Limit Reached' : 'Run GEO Scan'}
                        </Button>
                        {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Monthly limit reached. Upgrade to Pro for more scans.</span>
                          </div>
                        )}
                        {subscriptionLimits && (!subscriptionLimits.planType || subscriptionLimits.scansPerMonth === 0) && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>No active subscription. Please subscribe to run scans.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Time Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={topicsFilter} onValueChange={setTopicsFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Topics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        {availableTopics.map((topic) => (
                          <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-center py-24">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 mb-2 text-xl font-bold tracking-tight">No AI visibility data yet.</p>
                  <p className="text-gray-500 mb-8 text-sm font-medium max-w-md mx-auto">Run your first GEO Scan to start tracking your brand's AI presence and get actionable insights.</p>
                </div>
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
              {/* Scan Progress Indicator */}
              {currentScan?.status === 'running' && (
                <Alert className="mb-6 border-blue-200/80 bg-gradient-to-r from-blue-50 to-blue-50/50 shadow-md rounded-xl overflow-hidden">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <AlertDescription className="ml-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-blue-900 text-base">
                        GEO Scan in progress...
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-700 font-semibold bg-blue-100 px-3 py-1 rounded-lg">
                          {currentScan.completed_questions || 0} / {currentScan.total_questions || 0} prompts answered
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
              <div className="mb-10">
                {/* Title and Brand Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    </div>
                    {brands.length > 0 && (
                      <Select 
                        value={selectedBrandId} 
                        onValueChange={(value) => {
                          setSelectedBrandId(value);
                          const brand = brands.find(b => b.id === value);
                          if (brand) setSelectedBrandName(brand.name);
                        }}
                      >
                        <SelectTrigger className="w-[220px] h-10 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <SelectValue placeholder="Select Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                {/* AI Provider Selection and Run Scan */}
                {selectedBrandId && (
                  <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-1">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Label htmlFor="ai-provider" className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
                          AI Provider
                        </Label>
                        <AIProviderSelect
                          value={aiProvider}
                          onValueChange={async (value) => {
                            if (!session?.user?.id) return;
                            
                            // Check if provider is allowed
                            const providerCheck = await isAIProviderAllowed(session.user.id, value);
                            if (!providerCheck.allowed) {
                              toast.error(providerCheck.reason || "AI provider not available on your plan");
                              return;
                            }
                            
                            setAiProvider(value);
                            if (selectedBrandId) {
                              try {
                                const { error } = await supabase
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
                          disabled={runningScan || currentScan?.status === 'running'}
                          className="w-full bg-white border-gray-200 text-sm h-10 shadow-sm hover:shadow-md transition-shadow"
                        />
                      </div>
                      
                      {/* Scan Usage Info */}
                      {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm h-10">
                          <div className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">{scanUsage}</span>
                            <span className="text-gray-500"> / {subscriptionLimits.scansPerMonth}</span>
                            <span className="text-gray-500 text-xs ml-1">scans</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Run Scan Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Button
                        onClick={handleRunGeoScan}
                        disabled={
                          runningScan || 
                          currentScan?.status === 'running' || 
                          (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth)
                        }
                        className="bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-200 h-10 px-6 font-semibold hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${runningScan || currentScan?.status === 'running' ? 'animate-spin' : ''}`} />
                        {currentScan?.status === 'running' ? 'Scanning...' : 
                         (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth) ? 'Limit Reached' : 'Run GEO Scan'}
                      </Button>
                      
                      {/* Limit Warnings */}
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
                  </div>
                )}
                
                {/* Filters Row */}
                <div className="flex flex-wrap gap-3">
                  <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={topicsFilter} onValueChange={setTopicsFilter}>
                    <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <SelectValue placeholder="Topics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {availableTopics.map((topic) => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* KPI Cards - Enhanced Modern Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {/* Brand Visibility */}
                <Card className="group relative overflow-hidden p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Brand Visibility</p>
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
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
                <Card className="group relative overflow-hidden p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full"></div>
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
                <Card className="group relative overflow-hidden p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full"></div>
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
                <Card className="group relative overflow-hidden p-6 border border-gray-200/80 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full"></div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
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
                      <LineChart data={dashboardData.competitorTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9ca3af" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                        />
                        <YAxis 
                          stroke="#9ca3af" 
                          fontSize={11}
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          width={40}
                        />
                        <Tooltip 
                          content={<CompetitorTooltip />}
                          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="line"
                          iconSize={12}
                          fontSize={11}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Your Brand" 
                          stroke="#3b82f6" 
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#3b82f6' }}
                          activeDot={{ r: 5 }}
                          name="Your Brand"
                          connectNulls={false}
                        />
                        {dashboardData.competitorNames && dashboardData.competitorNames.length > 0 ? dashboardData.competitorNames.map((name: string, index: number) => (
                          <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={COMPETITOR_COLORS[index % COMPETITOR_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3, fill: COMPETITOR_COLORS[index % COMPETITOR_COLORS.length] }}
                            activeDot={{ r: 5 }}
                            name={name}
                            connectNulls={false}
                          />
                        )) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card>

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
                      <LineChart data={dashboardData.citationTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9ca3af" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                        />
                        <YAxis 
                          stroke="#9ca3af" 
                          fontSize={11}
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                          width={40}
                        />
                        <Tooltip 
                          content={<CitationTooltip />}
                          cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Citation Share" 
                          stroke="#10b981" 
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

              {/* Sentiment Distribution and Top Sources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
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
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="circle"
                          iconSize={8}
                          fontSize={11}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                {/* Top Sources Table */}
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

              {/* Things To Do - Actionable Recommendations - Clean Professional Style */}
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
                
                // Always show the section, even if empty
                return (
                  <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 mb-10 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
                            Boost Product Visibility
                          </h3>
                          <p className="text-sm text-gray-600 font-medium">
                            Clear, prioritized steps to turn mentions into customers
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 text-sm font-semibold">
                          <span>{actionItems.length} items</span>
                        </div>
                      </div>
                    </div>

                    {/* Table-like Structure */}
                    <div className="divide-y divide-gray-200">
                      {actionItems.length > 0 ? actionItems.slice(0, 5).map((rec: any, index: number) => {
                        const actionText = rec.action || rec.title || '';
                        const priority = rec.priority || 'Moderate';
                        const focusArea = rec.focus_area || rec.category || 'General';
                        
                        // Priority styling - minimal, professional
                        const getPriorityStyle = (p: string) => {
                          if (p === 'Urgent') {
                            return {
                              indicator: 'bg-gray-900',
                              badge: 'bg-gray-100 text-gray-700 border-gray-200',
                            };
                          } else if (p === 'High') {
                            return {
                              indicator: 'bg-gray-700',
                              badge: 'bg-gray-50 text-gray-600 border-gray-200',
                            };
                          } else {
                            return {
                              indicator: 'bg-gray-400',
                              badge: 'bg-gray-50 text-gray-600 border-gray-200',
                            };
                          }
                        };
                        
                        const style = getPriorityStyle(priority);
                        
                        return (
                          <div
                            key={index}
                            className="group px-6 py-5 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-white transition-all duration-200 border-l-2 border-transparent hover:border-primary/30"
                          >
                            <div className="flex items-start gap-4">
                              {/* Number Indicator */}
                              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                                <span className="text-sm font-bold text-gray-700">{index + 1}</span>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-base text-gray-900 font-semibold mb-3 leading-snug group-hover:text-gray-950 transition-colors">
                                  {actionText}
                                </p>
                                
                                {/* Tags */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border shadow-sm ${style.badge}`}>
                                    {priority}
                                  </span>
                                  <span className="px-3 py-1 rounded-lg text-xs text-gray-600 bg-gray-50 border border-gray-200 shadow-sm font-medium">
                                    {focusArea}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Arrow Indicator */}
                              <div className="flex-shrink-0">
                                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-500">No actionable recommendations available yet. Run a scan to generate insights.</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {actionItems.length > 5 && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Showing 5 of {actionItems.length} recommendations
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          >
                            View All
                            <ArrowRight className="h-3.5 w-3.5 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
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

              {/* Strengths & Gaps - Enhanced Style - Always Visible */}
              {latestScanInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                  {/* Strengths Card - Always Show */}
                  <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                    <div className="p-6 bg-gradient-to-br from-green-50/30 to-white">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          Key Strengths
                        </h3>
                      </div>
                      {(latestScanInsights.strengths_and_gaps?.strengths?.length > 0 || latestScanInsights?.strengths?.length > 0) ? (
                        <ul className="space-y-3">
                          {(latestScanInsights.strengths_and_gaps?.strengths || latestScanInsights?.strengths || []).map((strength: string, index: number) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-gray-700 group/item">
                              <span className="mt-1 h-2 w-2 rounded-full bg-green-500 flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                              <span className="flex-1 font-medium leading-relaxed">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 font-medium">No strengths identified yet. Run a scan to analyze your brand visibility.</p>
                      )}
                    </div>
                  </Card>
                  
                  {/* Gaps Card - Always Show */}
                  <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                    <div className="p-6 bg-gradient-to-br from-amber-50/30 to-white">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          Visibility Gaps
                        </h3>
                      </div>
                      {(latestScanInsights.strengths_and_gaps?.gaps?.length > 0 || latestScanInsights?.weaknesses?.length > 0) ? (
                        <>
                          <ul className="space-y-3">
                            {(latestScanInsights.strengths_and_gaps?.gaps || latestScanInsights?.weaknesses || []).map((gap: string, index: number) => (
                              <li key={index} className="flex items-start gap-3 text-sm text-gray-700 group/item">
                                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                                <span className="flex-1 font-medium leading-relaxed">{gap}</span>
                              </li>
                            ))}
                          </ul>
                          {latestScanInsights.strengths_and_gaps?.opportunity_topic && (
                            <div className="mt-5 pt-4 border-t border-gray-200">
                              <p className="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wide">Opportunity Topic</p>
                              <p className="text-sm text-gray-700 font-semibold">{latestScanInsights.strengths_and_gaps.opportunity_topic}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 font-medium">No gaps identified yet. Run a scan to discover improvement opportunities.</p>
                      )}
                    </div>
                  </Card>
                </div>
              )}
              
              {/* Show empty state if no insights at all */}
              {!latestScanInsights && dashboardData && !dashboardData.isEmpty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                  <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Key Strengths</h3>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Run a scan to analyze your brand visibility and identify strengths.</p>
                    </div>
                  </Card>
                  <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">Visibility Gaps</h3>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Run a scan to discover improvement opportunities.</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Content Ideas */}
              {latestScanInsights?.content_ideas?.length > 0 && (
                <Card className="border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-lg mb-8 overflow-hidden">
                  <div className="p-6 bg-gradient-to-br from-blue-50/30 to-white">
                    <div className="mb-6 pb-4 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                        Suggested Content Topics
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">Content ideas to improve your AI visibility</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestScanInsights.content_ideas.map((idea: any, index: number) => (
                        <div 
                          key={index} 
                          className="group p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white hover:-translate-y-0.5"
                        >
                          <h4 className="font-bold text-sm mb-2 text-gray-900 group-hover:text-primary transition-colors">{idea.title}</h4>
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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
