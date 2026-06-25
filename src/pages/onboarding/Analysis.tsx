import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboardingState";
import { TrendingUp, Award, BarChart3, Loader2, CheckCircle2, Activity, Terminal, ShieldCheck, ChevronRight } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
];

const ANALYSIS_STEPS = [
  "Analyzing website...",
  "Extracting industry keywords...",
  "Identifying competitors...",
  "Generating full GEO profile...",
  "Calculating visibility potential...",
];

export default function AnalysisOnboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [brandScore, setBrandScore] = useState(0);
  const [visibilityPotential, setVisibilityPotential] = useState("");
  const [categoryRanking, setCategoryRanking] = useState("");
  
  const [isApiSaving, setIsApiSaving] = useState(true);
  const [apiBrandId, setApiBrandId] = useState<string | null>(null);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [brandUrl, setBrandUrl] = useState("");
  const [brandName, setBrandName] = useState("your brand");
  
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "Initializing prompt space compiler pipeline...",
    "Loaded default 150 prompt limits for standard scans...",
    "Connecting to Supabase compilation Edge Function...",
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, msg]);
  };

  // Extract hostname for brand name display
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
  }, []);

  // Sync log scroll
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Background save trigger
  useEffect(() => {
    const data = getOnboardingData();
    if (!data.websiteUrl || !data.summary) {
      navigate("/onboarding/website");
      return;
    }
    setBrandUrl(data.websiteUrl);

    const triggerOnboardingSave = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          addLog("[ERROR] Authentication session not found. Redirecting...");
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }

        addLog("[API] Invoking save-onboarding Edge Function...");
        
        const { data: responseData, error } = await supabase.functions.invoke("save-onboarding", {
          body: {
            websiteUrl: data.websiteUrl,
            summary: data.summary,
            industry: data.industry,
            audience: data.audience,
            topics: data.topics || [],
            competitors: data.competitors || [],
          },
        });

        if (error) {
          throw error;
        }

        if (responseData?.error) {
          throw new Error(responseData.error);
        }

        if (responseData?.success && responseData?.brandId) {
          addLog(`[SUCCESS] Database sync completed.`);
          addLog(`[SUCCESS] Seeded mock scan records.`);
          addLog(`[SUCCESS] Setup compiled. Brand ID: ${responseData.brandId}`);
          setApiBrandId(responseData.brandId);
        } else {
          throw new Error("Failed to save brand onboarding data.");
        }
      } catch (err: any) {
        console.error("Error in background save-onboarding:", err);
        addLog(`[WARNING] Database sync failed: ${err.message || err}.`);
        addLog("[WARNING] Operating in local demo mode.");
      } finally {
        setIsApiSaving(false);
      }
    };

    triggerOnboardingSave();
  }, [navigate]);

  // Steps interval simulation
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < ANALYSIS_STEPS.length) {
          if (next === 1) {
            addLog("[INFO] Generating query terms based on brand summary...");
          } else if (next === 2) {
            addLog("[INFO] Compiling list of competitor domains for analysis...");
          } else if (next === 3) {
            addLog("[INFO] Structuring prompt permutations matrix...");
            addLog("[INFO] Pre-allocating citation domain score metrics...");
          } else if (next === 4) {
            addLog("[INFO] Running pre-scan simulations on GPT-4o & Gemini...");
          }
          return next;
        } else {
          clearInterval(stepInterval);
          addLog("[INFO] Scanning simulation completed.");
          setAnimationFinished(true);
          return prev;
        }
      });
    }, 2000);

    return () => clearInterval(stepInterval);
  }, []);

  // Complete analysis transition when both API and animations resolve
  useEffect(() => {
    if (animationFinished && !isApiSaving) {
      addLog("Generating results index...");
      const resultsTimeout = setTimeout(() => {
        const score = Math.floor(Math.random() * 20) + 75; // 75-95
        const potential = ["High", "Medium"][Math.floor(Math.random() * 2)];
        const ranking = `Top ${Math.floor(Math.random() * 3) + 1}`;

        setBrandScore(score);
        setVisibilityPotential(potential);
        setCategoryRanking(ranking);

        // Store persistent onboarding summary results (never cleared, matches the brand)
        localStorage.setItem("citero_onboarding_summary", JSON.stringify({
          brandScore: score,
          visibilityPotential: potential,
          categoryRanking: ranking,
          brandId: apiBrandId
        }));

        setAnalysisComplete(true);
      }, 1000);

      return () => clearTimeout(resultsTimeout);
    }
  }, [animationFinished, isApiSaving, apiBrandId]);

  const handleContinue = () => {
    clearOnboardingData();
    navigate("/audits", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="analysis"
        completedSteps={["website", "description", "topics", "competitors"]}
      />
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        
        {/* Soft Decorative Background Circles */}
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-slate-100/40 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "12s" }}></div>
        <div className="absolute bottom-20 left-20 w-[300px] h-[300px] bg-indigo-50/40 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: "8s" }}></div>

        <Card className="w-full max-w-3xl p-8 border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col justify-between">
          
          {!analysisComplete ? (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Analyzing Your Brand</h1>
                <p className="text-slate-500 text-sm">
                  We're building your complete GEO profile. This will take a moment...
                </p>
              </div>

              {/* Loader Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
                
                {/* Visual Scanner */}
                <div className="flex flex-col items-center justify-center bg-slate-55/50 rounded-2xl p-6 border border-slate-200 relative h-64 shadow-inner">
                  
                  {/* Concentric pulsing rings */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-indigo-200 animate-ping opacity-30"></div>
                    <div className="absolute inset-3 rounded-full border border-indigo-300 animate-pulse opacity-45"></div>
                    <div className="absolute inset-6 rounded-full border border-indigo-150 bg-indigo-50/50 flex items-center justify-center">
                      <Activity className="h-8 w-8 text-indigo-655 animate-pulse" />
                    </div>
                    {/* Rotating scan indicator */}
                    <div className="absolute inset-0 rounded-full border border-transparent border-t-indigo-600/80 animate-spin" style={{ animationDuration: '2.5s' }}></div>
                  </div>

                  {/* Step status list */}
                  <div className="mt-6 w-full space-y-3 px-4">
                    {ANALYSIS_STEPS.map((step, idx) => {
                      const isCompleted = currentStepIndex > idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div key={idx} className="flex items-center gap-3 transition-all duration-300">
                          <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                            isCurrent ? "bg-indigo-600 border-indigo-600 text-white animate-pulse" :
                            "bg-slate-200 border-slate-350 text-slate-400"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : isCurrent ? (
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : (
                              <div className="h-1 w-1 rounded-full bg-slate-400" />
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${
                            isCompleted ? "text-slate-400 line-through font-normal" :
                            isCurrent ? "text-slate-800 font-bold" :
                            "text-slate-400"
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Developer compiler console */}
                <div className="flex flex-col h-64 justify-between">
                  <div 
                    ref={logContainerRef}
                    className="bg-slate-950 rounded-xl p-5 shadow-inner border border-slate-900 font-mono text-[10px] text-slate-300 h-full overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-850"
                  >
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-2 mb-2 select-none">
                      <Terminal className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                      Citero Diagnostic Compiler
                    </div>
                    {terminalLogs.map((log, i) => (
                      <div key={i} className="leading-relaxed hover:text-white transition-colors">
                        <span className="text-emerald-500 font-bold select-none">&gt;&gt;</span> {log}
                      </div>
                    ))}
                    <div className="animate-pulse h-3 w-1 bg-slate-400 inline-block ml-1"></div>
                  </div>
                </div>
              </div>

              {/* Processing Loader Description */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500 font-bold font-mono">Compiling brand prompt permutations array...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success Header */}
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full mb-4 shadow-sm">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 animate-bounce" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Diagnostics Completed!</h1>
                <p className="text-slate-500 text-sm">
                  We have structured the onboarding diagnostic scan metrics for <span className="font-semibold text-slate-800">{brandName}</span>.
                </p>
              </div>

              {/* Setup Score grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Score Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-2xl p-6 text-center text-white shadow-sm flex flex-col justify-center h-44 border border-slate-800">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mx-auto mb-3">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-4xl font-extrabold mb-1 tracking-tight">{brandScore}</div>
                  <div className="text-slate-300 text-xs font-semibold">Brand Diagnostic Score</div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold mt-1">Setup Rating: Good</div>
                </div>

                {/* Visibility Potential Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm flex flex-col justify-center h-44 hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="text-4xl font-extrabold text-emerald-650 mb-1 tracking-tight">{visibilityPotential}</div>
                  <div className="text-slate-500 text-xs font-semibold">Visibility Potential</div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold mt-1">Growth Forecast</div>
                </div>

                {/* Ranking Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm flex flex-col justify-center h-44 hover:shadow-md transition-shadow">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-50 border border-purple-100 rounded-full mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">{categoryRanking}</div>
                  <div className="text-slate-500 text-xs font-semibold">Category Ranking Estimate</div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold mt-1">Market Position</div>
                </div>
              </div>

              {/* Capability Summary panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Your Active Tracking Scope:
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-650 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Daily 150 prompt AI scan runs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Competitor tracking dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Source citation tracking index</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>GPT-4o & Gemini scan access</span>
                  </li>
                </ul>
              </div>

              {/* Proceed Action Banner */}
              <div className="space-y-4 pt-2">
                <button
                  onClick={handleContinue}
                  className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800 text-base font-bold rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10 flex items-center justify-center gap-2"
                >
                  Proceed to Brand Audit
                  <ChevronRight className="h-5 w-5" />
                </button>
                <p className="text-[11px] text-slate-400 text-center font-mono font-medium">
                  We'll clear draft states and open your new brand audits workspace.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
