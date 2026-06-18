import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboardingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2, TrendingUp, Lock, Terminal, Activity, Flame, ShieldCheck } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

export default function CompleteOnboarding() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [brandName, setBrandName] = useState("your brand");

  // Calculate onboarding score
  const calculateScore = (data: ReturnType<typeof getOnboardingData>): number => {
    let score = 0;
    if (data.websiteUrl && data.websiteUrl.trim()) score += 20;
    if (data.summary && data.summary.trim().length > 50) score += 20;
    if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
      score += Math.min(20, data.topics.length * 4);
    }
    if (data.competitors && Array.isArray(data.competitors) && data.competitors.length > 0) {
      score += Math.min(20, data.competitors.length * 4);
    }
    if ((data.industry && data.industry.trim()) || (data.audience && data.audience.trim())) {
      score += 20;
    }
    return Math.min(100, score);
  };

  // Compile logs animation
  useEffect(() => {
    const data = getOnboardingData();
    if (data.websiteUrl) {
      try {
        const url = new URL(data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`);
        const hostname = url.hostname.replace("www.", "");
        setBrandName(hostname);
      } catch (e) {
        setBrandName(data.websiteUrl);
      }
    }

    if (saving) {
      const logs = [
        "Initializing prompt space compiler pipeline...",
        "Loaded default 150 prompt limits for standard scans...",
        `Extracting keywords from target brand: ${brandName}...`,
        "Parsing industry competitors and reference topics...",
        "Building prompt logic for AI recommenders...",
        "Simulating Perplexity recommendation query structure...",
        "Synthesizing Gemini & GPT target query blueprints...",
        "Validating 150 prompt GEO diagnostics pack...",
        "Synchronizing custom brand prompts directory to Supabase...",
        "Diagnostic package compiled and ready."
      ];

      let logIndex = 0;
      setCompilerLogs([`[SYSTEM] ${logs[0]}`]);

      const logInterval = setInterval(() => {
        logIndex++;
        if (logIndex < logs.length) {
          setCompilerLogs((prev) => [...prev, `[SYSTEM] ${logs[logIndex]}`]);
          setProgress(Math.floor((logIndex / (logs.length - 1)) * 150));
        } else {
          clearInterval(logInterval);
        }
      }, 400);

      return () => clearInterval(logInterval);
    }
  }, [saving, brandName]);

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [compilerLogs]);

  useEffect(() => {
    const checkExistingBrand = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: existingBrands } = await supabase
        .from("brands")
        .select("id, onboarding_completed, topics, competitors")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingBrands && existingBrands.length > 0) {
        const existingBrand = existingBrands[0];
        
        if (existingBrand.onboarding_completed === true) {
          toast.info("You've already completed onboarding");
          const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
          const limits = await getUserSubscriptionLimits(session.user.id);
          if (limits.planType !== null) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/pricing", { replace: true });
          }
          return;
        }

        const hasOnboardingData = 
          (existingBrand.topics && Array.isArray(existingBrand.topics) && existingBrand.topics.length > 0) ||
          (existingBrand.competitors && (Array.isArray(existingBrand.competitors) || typeof existingBrand.competitors === 'object'));

        if (hasOnboardingData) {
          toast.info("You've already completed onboarding");
          const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
          const limits = await getUserSubscriptionLimits(session.user.id);
          if (limits.planType !== null) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/pricing", { replace: true });
          }
          return;
        }
      }

      const data = getOnboardingData();
      if (!data.websiteUrl) {
        navigate("/onboarding/website");
        return;
      }

      const calculatedScore = calculateScore(data);
      setScore(calculatedScore);

      saveToDatabase();
    };

    checkExistingBrand();
  }, [navigate]);

  const saveToDatabase = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      const onboardingData = getOnboardingData();

      if (!onboardingData.websiteUrl || !onboardingData.summary) {
        toast.error("Missing required data. Please start over.");
        navigate("/onboarding/website");
        return;
      }

      const { data, error } = await supabase.functions.invoke("save-onboarding", {
        body: {
          websiteUrl: onboardingData.websiteUrl,
          summary: onboardingData.summary,
          industry: onboardingData.industry,
          audience: onboardingData.audience,
          topics: onboardingData.topics || [],
          competitors: onboardingData.competitors || [],
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        throw error;
      }

      if (data.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      if (!data.success) {
        throw new Error("Failed to save onboarding data");
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: brands, error: brandsError } = await supabase
        .from("brands")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (brandsError) {
        console.error("Error verifying brand creation:", brandsError);
        if (brandsError.message?.includes("onboarding_completed")) {
          const { data: brandsFallback } = await supabase
            .from("brands")
            .select("id")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (brandsFallback && brandsFallback.length > 0) {
            console.log("Brand verified (fallback check):", brandsFallback[0]);
          } else {
            throw new Error("Brand was not created. Please try again.");
          }
        } else {
          throw new Error(`Failed to verify brand creation: ${brandsError.message}`);
        }
      } else if (brands && brands.length > 0) {
        console.log("Brand verified in database:", brands[0]);
        if (brands[0].onboarding_completed === false || brands[0].onboarding_completed === null) {
          console.log("Updating onboarding_completed to true");
          await supabase
            .from("brands")
            .update({ onboarding_completed: true })
            .eq("id", brands[0].id);
        }
      } else {
        throw new Error("Brand was not created. Please try again.");
      }

      clearOnboardingData();
      setSaved(true);
      toast.success("Brand created successfully!");
      
      // Auto-redirect to pricing after 10 seconds to allow review
      setTimeout(() => {
        navigate("/pricing", { replace: true });
      }, 10000);
    } catch (error: any) {
      console.error("Error saving onboarding:", error);
      toast.error(error.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const handleGoToPricing = () => {
    navigate("/pricing", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="complete"
        completedSteps={["website", "description", "topics", "competitors", "analysis"]}
      />
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        
        {/* Soft Decorative Background Circles */}
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-slate-100/40 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-20 left-20 w-[300px] h-[300px] bg-emerald-50/40 rounded-full blur-3xl -z-10"></div>

        <Card className="w-full max-w-2xl p-8 border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Onboarding Completed!</h1>
            <p className="text-slate-500 text-sm">
              We have analyzed <span className="font-semibold text-slate-800">{brandName}</span> and structured your diagnostic database.
            </p>
          </div>

          {saving && !saved ? (
            <div className="space-y-5">
              {/* Dynamic Compiler Console Loader */}
              <div className="bg-slate-900 rounded-xl p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
                    Citero Prompt Space Engine
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    {progress} / 150 Compiled
                  </div>
                </div>

                <div 
                  ref={logContainerRef}
                  className="h-[140px] overflow-y-auto space-y-1.5 font-mono text-[11px] text-slate-300 pr-2 scrollbar-thin scrollbar-thumb-slate-850"
                >
                  {compilerLogs.map((log, i) => (
                    <div key={i} className="hover:text-white transition-colors">
                      <span className="text-emerald-500 font-bold select-none">&gt;&gt;</span> {log}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-xs text-slate-500 font-medium font-mono">Storing compiled index arrays to database...</span>
              </div>
            </div>
          ) : saved && score !== null ? (
            <div className="space-y-6">
              {/* Setup Score and Locked Elements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Score Widget */}
                <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-center text-white shadow-sm flex flex-col justify-center h-full">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-4xl font-extrabold mb-1">{score}</div>
                  <div className="text-slate-300 text-xs font-medium">Brand Diagnostic</div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold mt-1">Setup Score</div>
                </div>

                {/* Simulated Dashboard (Locked Preview) */}
                <div className="md:col-span-2 relative border border-slate-200 bg-slate-50/50 rounded-2xl p-5 overflow-hidden min-h-[160px] flex flex-col justify-between shadow-inner">
                  {/* Blurry SVG Chart Background */}
                  <div className="absolute inset-0 blur-[3px] opacity-25 p-4 flex flex-col justify-between select-none pointer-events-none">
                    <div className="h-14 w-full border-b border-l border-slate-400 flex items-end justify-between px-2 pb-1">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-t"></div>
                      <div className="w-1.5 h-10 bg-emerald-500 rounded-t"></div>
                      <div className="w-1.5 h-14 bg-emerald-500 rounded-t"></div>
                      <div className="w-1.5 h-8 bg-emerald-500 rounded-t"></div>
                      <div className="w-1.5 h-16 bg-emerald-500 rounded-t"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="h-5 bg-slate-400 rounded"></div>
                      <div className="h-5 bg-slate-400 rounded"></div>
                      <div className="h-5 bg-slate-400 rounded"></div>
                    </div>
                  </div>

                  {/* Lock Screen Centered Overlay */}
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[0.5px] flex flex-col items-center justify-center text-center p-4 z-10">
                    <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
                      <Lock className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">150 Brand Prompts Compiled & Locked</h3>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                      Your GEO scan catalog is ready. Activate subscription to track search share-of-voice.
                    </p>
                  </div>
                </div>
              </div>

              {/* Advanced capability locks list */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Your Active Tracking Scope:
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Daily 150 prompt AI scan runs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>HubSpot & competitor tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Source citation tracking index</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>GPT-4o & Gemini scan access</span>
                  </li>
                </ul>
              </div>

              {/* FOMO Action Banner */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
                <Flame className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-xs text-slate-700 leading-normal">
                    <strong>Exclusive Early Adopter Offer expiring:</strong> SGE visibility index updates every 12 hours. Unlock your account now at the <strong>Founder circle discount rate of $49/mo</strong> (lifetime locked price, save 50%) before slots fill up.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleGoToPricing}
                  className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800 text-base font-semibold rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10"
                >
                  Activate & Subscribe to Continue
                  <ArrowRight className="h-4.5 w-4.5 ml-2" />
                </Button>

                <p className="text-[11px] text-slate-400 text-center font-mono">
                  Auto-redirecting to plan selection in a few seconds...
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Initializing diagnostics setup...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
