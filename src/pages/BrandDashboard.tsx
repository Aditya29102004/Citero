import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, TrendingUp, CheckCircle2, Sparkles, Lightbulb, TrendingDown, TrendingUp as TrendingUpIcon, Info, X, Download, Target, Users, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SentimentChart } from "@/components/SentimentChart";
import { VisibilityTrendChart } from "@/components/VisibilityTrendChart";
import { ScanResponsesTable } from "@/components/ScanResponsesTable";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { canRunScan, isAIProviderAllowed, getUserSubscriptionLimits, getUserScanUsage, SubscriptionLimits } from "@/lib/subscriptionLimits";
import { AIProviderSelect, type AIProvider } from "@/components/AIProviderSelect";

const BrandDashboard = () => {
  const navigate = useNavigate();
  const { brandId } = useParams<{ brandId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [brand, setBrand] = useState<any>(null);
  const [latestScore, setLatestScore] = useState<any>(null);
  const [latestScan, setLatestScan] = useState<any>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [scanUsage, setScanUsage] = useState<number>(0);

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
    if (brandId && session) {
      fetchBrandData();
      fetchSubscriptionLimits();
      // Poll more frequently when scan is running
      const pollInterval = latestScan?.status === 'running' ? 2000 : 5000;
      const interval = setInterval(fetchBrandData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [brandId, session, latestScan?.status]);

  const fetchSubscriptionLimits = async () => {
    if (!session?.user?.id) return;
    
    try {
      const limits = await getUserSubscriptionLimits(session.user.id);
      console.log("Fetched subscription limits:", limits);
      setSubscriptionLimits(limits);
      
      // Fetch current usage
      const usage = await getUserScanUsage(session.user.id);
      console.log("Current scan usage:", usage);
      setScanUsage(usage);
      
      // If user has Basic plan and current provider is not allowed, switch to allowed one
      if (limits.planType === 'basic' && !limits.allowedAIProviders.includes(aiProvider)) {
        setAiProvider(limits.allowedAIProviders[0] as 'openai' | 'gemini');
        if (brand) {
          await supabase
            .from('brands')
            .update({ ai_provider: limits.allowedAIProviders[0] })
            .eq('id', brand.id);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription limits:", error);
    }
  };

  const fetchBrandData = async () => {
    try {
      // Fetch brand
      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();

      if (brandData) {
        setBrand(brandData);
        // Set AI provider from brand settings or default to openai
        // ai_provider might not exist if migration hasn't been run
        const provider = brandData.ai_provider as 'openai' | 'gemini' | 'deepseek' | 'openrouter' | undefined;
        setAiProvider(provider && ['openai', 'gemini', 'deepseek', 'openrouter'].includes(provider) ? provider : 'openai');
      }

      // Fetch latest visibility score
      const { data: scoreData } = await supabase
        .from("brand_visibility_scores")
        .select("*")
        .eq("brand_id", brandId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoreData) setLatestScore(scoreData);

      // Fetch latest scan
      const { data: scanData } = await supabase
        .from("scans")
        .select("*")
        .eq("brand_id", brandId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scanData) setLatestScan(scanData);
    } catch (error: any) {
      console.error("Error fetching brand data:", error);
    }
  };

  const handleRunScan = async () => {
    if (!brand) return;

    setScanning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Check scan limits
      const scanCheck = await canRunScan(session.user.id);
      if (!scanCheck.allowed) {
        toast.error(scanCheck.reason || "Cannot run scan");
        setScanning(false);
        return;
      }

      // Check AI provider is allowed
      const providerCheck = await isAIProviderAllowed(session.user.id, aiProvider);
      if (!providerCheck.allowed) {
        toast.error(providerCheck.reason || "AI provider not allowed");
        setScanning(false);
        return;
      }

      toast.info("Starting GEO scan...");
      
      const { data, error } = await supabase.functions.invoke('run-geo-scan', {
        body: { brandId: brand.id, aiProvider: aiProvider as 'openai' | 'gemini' | 'deepseek' | 'openrouter' },
      });

      if (error) throw error;

      toast.success("GEO scan started! This will take a few minutes...");
      
      // Update usage
      await fetchSubscriptionLimits();
      
      // Immediately fetch to show the scan record
      await fetchBrandData();
      
      // Keep polling more frequently to show progress
      const progressInterval = setInterval(async () => {
        await fetchBrandData();
        // Stop polling if scan is completed, failed, or cancelled
        const { data: scanCheck } = await supabase
          .from("scans")
          .select("status")
          .eq("brand_id", brand.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (scanCheck && !['running', 'pending'].includes(scanCheck.status)) {
          clearInterval(progressInterval);
          await fetchBrandData(); // Final fetch
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error(error.message || "Failed to start scan");
    } finally {
      setScanning(false);
    }
  };

  const handleStopScan = async () => {
    if (!latestScan || latestScan.status !== 'running') return;

    try {
      const { error } = await supabase
        .from('scans')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', latestScan.id);

      if (error) throw error;

      toast.success("Scan cancelled successfully");
      await fetchBrandData();
    } catch (error: any) {
      console.error('Stop scan error:', error);
      toast.error(error.message || "Failed to cancel scan");
    }
  };

  const handleExportPDF = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      toast.info("Generating PDF report...");

      // Get the main content area (excluding header and sidebar)
      const element = document.querySelector('main');
      if (!element) {
        toast.error("Could not find content to export");
        return;
      }

      // Create canvas from the element with high quality
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = contentWidth / imgWidth;
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Calculate how many pages we need
      const totalPages = Math.ceil(imgScaledHeight / contentHeight);

      // Add header to first page
      pdf.setFontSize(18);
      pdf.setTextColor(17, 24, 39); // gray-900
      pdf.text(brand?.name || 'Brand Report', margin, margin + 8);
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(`AI Perception Intelligence Dashboard - ${new Date().toLocaleDateString()}`, margin, margin + 14);
      
      // Draw a line
      pdf.setDrawColor(229, 231, 235); // gray-200
      pdf.line(margin, margin + 16, pdfWidth - margin, margin + 16);

      // Add content pages
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const yOffset = margin + 20 - (i * contentHeight);
        
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yOffset,
          imgScaledWidth,
          imgScaledHeight,
          undefined,
          'FAST'
        );
      }

      // Generate filename
      const filename = `${brand?.name?.replace(/[^a-z0-9]/gi, '_') || 'Brand'}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast.success("PDF exported successfully!");
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast.error(error.message || "Failed to export PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !brandId) return null;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50/50">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12 space-y-8">
              {/* Header Section */}
              <div className="space-y-6 pb-8 border-b border-gray-200/80">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 transition-colors -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Brands
                </Button>
                
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-2">
                        {brand?.name}
                      </h1>
                      <p className="text-base text-gray-600 font-normal">AI Perception Intelligence Dashboard</p>
                    </div>
                    {latestScan?.completed_at && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium w-fit">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Last scan: {new Date(latestScan.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
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
                          if (brand) {
                            try {
                              const { error } = await supabase
                                .from('brands')
                                .update({ ai_provider: value })
                                .eq('id', brand.id);
                              if (error) {
                                console.warn('Could not save AI provider preference:', error.message);
                              }
                            } catch (error) {
                              console.warn('Error saving AI provider preference:', error);
                            }
                          }
                        }}
                        subscriptionLimits={subscriptionLimits}
                        disabled={scanning || latestScan?.status === 'running'}
                        className="w-full bg-white border-gray-300 text-sm h-10"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {latestScan?.status === 'running' && (
                        <Button
                          onClick={handleStopScan}
                          variant="outline"
                          size="lg"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg px-5 h-11 font-medium text-sm transition-all duration-200"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Stop Scan
                        </Button>
                      )}
                      {latestScan?.status === 'completed' && (
                        <Button
                          onClick={handleExportPDF}
                          variant="outline"
                          size="lg"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-5 h-11 font-medium text-sm transition-all duration-200"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      )}
                      <div className="flex flex-col gap-2">
                        {subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && (
                          <div className="text-xs text-gray-500 text-right">
                            {scanUsage} / {subscriptionLimits.scansPerMonth} scans this month
                          </div>
                        )}
                        <Button
                          onClick={handleRunScan}
                          disabled={scanning || latestScan?.status === 'running' || (subscriptionLimits && subscriptionLimits.scansPerMonth !== Infinity && subscriptionLimits.scansPerMonth > 0 && scanUsage >= subscriptionLimits.scansPerMonth)}
                          size="lg"
                          className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-6 h-11 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${scanning || latestScan?.status === 'running' ? 'animate-spin' : ''}`} />
                          {latestScan?.status === 'running' ? 'Scanning...' : 
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
                  </div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* AI Visibility Score Card */}
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-600">AI Visibility Score</p>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Percentage of times AI models mention your brand</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-semibold text-gray-900">
                        {latestScore?.score || latestScan?.visibility_score || 0}
                      </p>
                      <span className="text-lg text-gray-500">/100</span>
                    </div>
                    {latestScan?.status === 'running' && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Scanning...</span>
                          <span>
                            {(latestScan.completed_questions || 0) * 3}/{(latestScan.total_questions || 0) * 3}
                          </span>
                        </div>
                        <Progress 
                          value={(latestScan.completed_questions / latestScan.total_questions) * 100} 
                          className="h-1.5 bg-gray-100"
                        />
                      </div>
                    )}
                    {latestScan?.status === 'completed' && (
                      <div className="flex items-center gap-2 mt-4 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium">Scan completed</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Brand Ranking Card */}
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-600">Brand Ranking</p>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Your brand's position in AI search results</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-semibold text-gray-900">
                      {latestScan?.ai_perception_summary?.visibility_tier === 'Tier 1' ? 'Top' :
                       latestScan?.ai_perception_summary?.visibility_tier === 'Tier 2' ? 'Mid' : 'Low'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {latestScan?.ai_perception_summary?.visibility_tier || 'Not ranked'}
                    </p>
                  </div>
                </Card>

                {/* Citation Share Card */}
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-600">Citation Share</p>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Total mentions across all AI responses</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-semibold text-gray-900">
                      {latestScore?.total_mentions || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Total mentions</p>
                  </div>
                </Card>

                {/* Sentiment Card */}
                <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-600">Sentiment</p>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Overall sentiment of AI mentions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-semibold text-gray-900">
                      {latestScore && latestScore.positive_mentions > latestScore.negative_mentions ? '+' : latestScore?.negative_mentions > 0 ? '-' : '~'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {latestScore?.positive_mentions || 0} positive, {latestScore?.negative_mentions || 0} negative
                    </p>
                  </div>
                </Card>
              </div>

              {/* Simple AI Perception Summary */}
              {latestScan?.ai_perception_summary && (
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        AI Perception Summary
                      </h3>
                      {latestScan.ai_perception_summary.visibility_tier && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          latestScan.ai_perception_summary.visibility_tier === 'Tier 1' ? 'bg-green-100 text-green-700' :
                          latestScan.ai_perception_summary.visibility_tier === 'Tier 2' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {latestScan.ai_perception_summary.visibility_tier}
                        </span>
                      )}
                    </div>
                    {latestScan.ai_perception_summary.summary && (
                      <p className="text-sm text-gray-700 leading-relaxed mb-6">
                        {latestScan.ai_perception_summary.summary}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Tone</p>
                        <p className="text-lg font-semibold capitalize text-gray-900">
                          {latestScan.ai_perception_summary.tone || 'Neutral'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Visibility Score</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {latestScan.ai_perception_summary.visibility_score || latestScan.visibility_score || 0}/100
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Key Drivers</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {latestScan.ai_perception_summary.drivers?.length || 0}
                        </p>
                      </div>
                    </div>
                    {latestScan.ai_perception_summary.drivers?.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm font-semibold mb-3 text-gray-900">Perception Drivers</p>
                        <ul className="space-y-2">
                          {latestScan.ai_perception_summary.drivers.map((driver: string, index: number) => (
                            <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400" />
                              <span className="text-sm text-gray-700 flex-1">{driver}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}

            {/* Fallback to old AI Summary if new one doesn't exist */}
            {!latestScan?.ai_perception_summary && latestScan?.ai_summary && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">AI Perception Summary</h3>
                <p className="text-muted-foreground leading-relaxed">{latestScan.ai_summary}</p>
              </Card>
            )}

              {/* Simple Deep Insight Analysis - Pro/Enterprise only */}
              {latestScan?.deep_insight_analysis && subscriptionLimits?.hasAdvancedGEOInsights && (
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-4 border-b border-gray-200">
                      Deep Insight Analysis
                    </h3>
                    <div className="space-y-4">
                      {latestScan.deep_insight_analysis.insight_summary && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                            Strategic Interpretation
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {latestScan.deep_insight_analysis.insight_summary}
                          </p>
                        </div>
                      )}
                      {latestScan.deep_insight_analysis.competitive_gap && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                            Competitive Gap
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {latestScan.deep_insight_analysis.competitive_gap}
                          </p>
                        </div>
                      )}
                      {latestScan.deep_insight_analysis.narrative_gap && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                            Narrative Gap
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {latestScan.deep_insight_analysis.narrative_gap}
                          </p>
                        </div>
                      )}
                      {latestScan.deep_insight_analysis.visibility_levers?.length > 0 && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                            Visibility Levers (Fast Wins)
                          </p>
                          <ul className="space-y-2">
                            {latestScan.deep_insight_analysis.visibility_levers.map((lever: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                <span className="flex-1">{lever}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Simple Strengths & Gaps */}
              {latestScan?.strengths_and_gaps ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latestScan.strengths_and_gaps.strengths?.length > 0 && (
                    <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                      <div className="p-6">
                        <h3 className="text-base font-semibold mb-4 text-gray-900">
                          Key Strengths
                        </h3>
                        <ul className="space-y-2">
                          {latestScan.strengths_and_gaps.strengths.map((strength: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  )}
                  {latestScan.strengths_and_gaps.gaps?.length > 0 && (
                    <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                      <div className="p-6">
                        <h3 className="text-base font-semibold mb-4 text-gray-900">
                          Visibility Gaps
                        </h3>
                        <ul className="space-y-2">
                          {latestScan.strengths_and_gaps.gaps.map((gap: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                              <span className="flex-1">{gap}</span>
                            </li>
                          ))}
                        </ul>
                        {latestScan.strengths_and_gaps.opportunity_topic && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Opportunity Topic</p>
                            <p className="text-sm text-gray-700">{latestScan.strengths_and_gaps.opportunity_topic}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
              /* Fallback to old strengths/weaknesses */
              (latestScan?.strengths?.length > 0 || latestScan?.weaknesses?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {latestScan?.strengths?.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">✓ Key Strengths</h3>
                      <ul className="space-y-2">
                        {latestScan.strengths.map((strength: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                            <span className="text-muted-foreground">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {latestScan?.weaknesses?.length > 0 && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 text-orange-600 dark:text-orange-400">⚠ Visibility Gaps</h3>
                      <ul className="space-y-2">
                        {latestScan.weaknesses.map((weakness: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                            <span className="text-muted-foreground">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              )
            )}

              {/* Boost Product Visibility Section */}
              {latestScan?.actionable_recommendations?.length > 0 && (
                <Card className="border-2 border-gray-300 bg-gradient-to-br from-white to-gray-50 shadow-lg rounded-lg overflow-hidden">
                  <div className="bg-gray-900 px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">
                            Boost Product Visibility
                          </h3>
                          <p className="text-sm text-gray-300 mt-0.5">
                            Clear, prioritized steps to turn mentions into customers
                          </p>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                        <Users className="h-3.5 w-3.5" />
                        <span>{latestScan.actionable_recommendations.length} Action Items</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {latestScan.actionable_recommendations.map((rec: any, index: number) => (
                        <div 
                          key={index} 
                          className="group flex items-start gap-4 p-5 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:shadow-md transition-all duration-200 bg-white"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            rec.priority === 'Urgent' ? 'bg-red-100 text-red-700 border-2 border-red-200' :
                            rec.priority === 'Moderate' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-200' :
                            'bg-gray-100 text-gray-700 border-2 border-gray-200'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base text-gray-900 font-semibold mb-3 leading-snug">
                              {rec.action}
                            </p>
                            <div className="flex gap-2 flex-wrap items-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                rec.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                                rec.priority === 'Moderate' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                {rec.priority || 'Moderate'} Priority
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                {rec.focus_area || 'General'}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors ml-auto" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Lightbulb className="h-4 w-4" />
                          <span>Start with Urgent items for fastest impact</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          View All Recommendations
                          <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Simple Actionable Recommendations (Fallback) */}
              {!latestScan?.actionable_recommendations?.length && latestScan?.recommendations?.length > 0 && (
                <Card className="p-6 border-primary/20 bg-primary/5">
                  <h3 className="text-lg font-semibold mb-4">⚙️ What to Do Next</h3>
                  <ul className="space-y-3">
                    {latestScan.recommendations.map((recommendation: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-primary font-bold mt-0.5">✓</span>
                        <span className="text-foreground">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Simple Content Ideas */}
              {latestScan?.content_ideas?.length > 0 && (
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Suggested Content Topics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestScan.content_ideas.map((idea: any, index: number) => (
                        <div 
                          key={index} 
                          className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white"
                        >
                          <h4 className="font-semibold text-sm mb-2 text-gray-900">{idea.title}</h4>
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {idea.description}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {idea.improves_topic && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {idea.improves_topic}
                              </span>
                            )}
                            {idea.impact && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
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

              {/* Simple Week-over-Week Change */}
              {latestScan?.week_over_week_change && (
                <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        This Week's Change
                      </h3>
                      {latestScan.week_over_week_change.gained_topics?.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <TrendingUpIcon className="h-3 w-3" />
                          {latestScan.week_over_week_change.gained_topics.length} gained
                        </div>
                      )}
                    </div>
                    {latestScan.week_over_week_change.change_summary && (
                      <p className="text-sm text-gray-700 leading-relaxed mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                        {latestScan.week_over_week_change.change_summary}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {latestScan.week_over_week_change.gained_topics?.length > 0 && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <TrendingUpIcon className="h-3.5 w-3.5 text-green-600" />
                            Gained Topics
                          </p>
                          <ul className="space-y-1.5">
                            {latestScan.week_over_week_change.gained_topics.map((topic: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-green-600 font-bold">+</span>
                                <span className="flex-1">{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {latestScan.week_over_week_change.lost_topics?.length > 0 && (
                        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                            Lost Topics
                          </p>
                          <ul className="space-y-1.5">
                            {latestScan.week_over_week_change.lost_topics.map((topic: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-red-600 font-bold">-</span>
                                <span className="flex-1">{topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {(latestScan.week_over_week_change.competitor_change || latestScan.week_over_week_change.main_cause) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {latestScan.week_over_week_change.competitor_change && (
                          <div>
                            <p className="text-xs font-semibold mb-1 text-gray-500 uppercase tracking-wide">Competitor Shift</p>
                            <p className="text-sm text-gray-700">{latestScan.week_over_week_change.competitor_change}</p>
                          </div>
                        )}
                        {latestScan.week_over_week_change.main_cause && (
                          <div>
                            <p className="text-xs font-semibold mb-1 text-gray-500 uppercase tracking-wide">Main Cause</p>
                            <p className="text-sm text-gray-700">{latestScan.week_over_week_change.main_cause}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SentimentChart brandId={brandId!} />
                <VisibilityTrendChart brandId={brandId!} />
              </div>

              {/* Recent Scan Responses */}
              <Card className="border border-gray-200 bg-white shadow-sm rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent AI Responses
                  </h3>
                  <ScanResponsesTable brandId={brandId!} />
                </div>
              </Card>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default BrandDashboard;
