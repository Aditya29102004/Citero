import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Activity, Terminal, ShieldAlert, Sparkles, Clock, Globe } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";

const SIMULATED_LOGS = [
  { level: "SYSTEM", text: "Initializing GEO Scanners on GPT-4o & Gemini..." },
  { level: "DB_SYNC", text: "Connecting brand catalog database..." },
  { level: "SCAN", text: "Querying Gemini for 'best value workflow automation tools'..." },
  { level: "CITATION", text: "Gemini response parsed. Citation index: 0.85 (High)" },
  { level: "SCAN", text: "Querying GPT-4o for 'how to optimize team alignment'..." },
  { level: "METRIC", text: "Sentiment analyzer computed +0.74 (Strongly Positive)" },
  { level: "COMPARE", text: "Benchmarking brand visibility against HubSpot and Salesforce..." },
  { level: "SOURCE", text: "Extracted source citations: 12 references matched from GitBook/Docs" },
  { level: "GEO_ENG", text: "Generative Engine Optimization profile update completed successfully." },
  { level: "ALERT", text: "Detected competitor footprint shift in Perplexity recommendation nodes." },
  { level: "API", text: "Refreshing weekly audit reporting logs..." }
];

const Pricing = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [activeEngine, setActiveEngine] = useState(0);
  const [spotsLeft, setSpotsLeft] = useState(3);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Engine metrics
  const engines = [
    { name: "OpenAI GPT-4o", ping: "142ms", status: "Optimal" },
    { name: "Google Gemini 2.5", ping: "168ms", status: "Optimal" },
    { name: "Claude 3.5 Sonnet", ping: "189ms", status: "Optimal" },
    { name: "DeepSeek R1", ping: "245ms", status: "Active" }
  ];

  // Live log compiler animation
  useEffect(() => {
    let index = 0;
    // Initial logs
    setLogs([
      `[${new Date().toLocaleTimeString()}] [${SIMULATED_LOGS[0].level}] ${SIMULATED_LOGS[0].text}`,
      `[${new Date().toLocaleTimeString()}] [${SIMULATED_LOGS[1].level}] ${SIMULATED_LOGS[1].text}`
    ]);

    const interval = setInterval(() => {
      const template = SIMULATED_LOGS[index % SIMULATED_LOGS.length];
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => {
        const next = [...prev, `[${timestamp}] [${template.level}] ${template.text}`];
        if (next.length > 50) next.shift();
        return next;
      });
      index++;
      setActiveEngine((prev) => (prev + 1) % engines.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll terminal logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle plan subscription click
  const handlePlanClick = async (planType: string) => {
    try {
      // Use getUser() which validates the session more thoroughly
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // If no user or error, redirect to login
      if (error || !user) {
        console.log("No user found, redirecting to login");
        navigate(`/auth?redirect=${encodeURIComponent(`/payment?plan=${planType}`)}`);
        return;
      }
      
      // User is authenticated, proceed to payment
      console.log("User authenticated, proceeding to payment");
      navigate(`/payment?plan=${planType}`);
    } catch (error) {
      // On any error, redirect to login
      console.error("Auth check error:", error);
      navigate(`/auth?redirect=${encodeURIComponent(`/payment?plan=${planType}`)}`);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen text-slate-800">
      <SEO
        title="Pricing - citero | Choose Your Plan"
        description="Choose the plan that fits you for AI visibility tracking."
        keywords="pricing, plans, subscription, AI visibility tracking"
        canonical="https://citero.ai/pricing"
      />
      <HomeHeader />
      
      {/* Pricing Section */}
      <section className="py-20 px-4 relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-white">
        
        {/* Clean Grid Background Layer */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35"></div>

        {/* Soft Glowing Blur Orbs (Light Mode Theme) */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-slate-100/40 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-emerald-50/40 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="text-center mb-10 pt-16 max-w-2xl mx-auto space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-display">
              Secure Your Brand's AI Visibility
            </h1>
            <p className="text-base text-slate-500 font-normal leading-relaxed">
              Unlock real-time monitoring across top generative engines. Don't stay invisible where customers ask for recommendations.
            </p>
          </div>

          {/* BACKGROUND SYSTEM CONSOLE: SHOWS TOO MUCH GOING ON AT THE BACK */}
          <div className="max-w-4xl mx-auto mb-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-100/80 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase font-mono">
                  Citero Core GEO Scanning Network
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[11px] font-semibold text-slate-500">Live API Grid Online</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Latency Meter Widget */}
              <div className="md:col-span-1 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Engine Connections
                </div>
                <div className="space-y-2.5">
                  {engines.map((engine, idx) => (
                    <div 
                      key={idx}
                      className={`p-2.5 rounded-xl border transition-all duration-300 ${
                        activeEngine === idx 
                          ? 'border-emerald-250 bg-emerald-50/20 shadow-sm' 
                          : 'border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-700">{engine.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{engine.ping}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[9px] text-slate-400 font-medium uppercase">{engine.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrolling Simulated Log Console */}
              <div className="md:col-span-2 flex flex-col justify-between h-[195px] md:h-full bg-slate-900 rounded-xl p-4 shadow-inner">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  Live Crawler Stream logs:
                </div>
                <div 
                  ref={logContainerRef} 
                  className="flex-1 overflow-y-auto space-y-1.5 pr-2 max-h-[140px] font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700"
                >
                  {logs.map((log, i) => (
                    <div key={i} className="text-slate-300 font-light hover:text-white transition-colors">
                      <span className="text-emerald-400 select-none">&gt;</span> {log}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-slate-500 italic">Initializing stream pipeline...</div>
                  )}
                </div>
              </div>

            </div>

            {/* FOMO System Health/Threat Warning */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center gap-3">
              <AlertCircle className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" />
              <p className="text-xs text-slate-700 leading-normal">
                <strong>Competitor footprint active:</strong> HubSpot, Salesforce, and Marketo have updated visibility metrics. Citero detected <strong>17 new citation changes</strong> in your industry category in the last 24 hours. Unlock your account to capture traffic.
              </p>
            </div>
          </div>
 
          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16 px-4">
            
            {/* Basic Plan */}
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[480px]">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">Basic</h3>
                <p className="text-xs text-slate-400 mt-1 mb-6">Perfect for startups and growing SaaS companies</p>
                
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-slate-900 tracking-tight font-display">$99</span>
                  <span className="text-slate-400 text-sm font-medium">/ month</span>
                </div>

                <div className="w-full h-px bg-slate-100 my-6"></div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">150 AI prompt scans / month</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Access to GPT-4o and Gemini models</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>10 competitor comparisons</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Top citation source mining & recommendations</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>5 AI optimized blogs / month to fill visibility gaps</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => handlePlanClick("basic_normal")}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm h-11.5 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10"
              >
                Subscribe Now
              </Button>
            </div>
 
            {/* Custom Plan (Enterprise) */}
            <div className="p-8 bg-white border-2 border-slate-900 rounded-3xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative flex flex-col justify-between min-h-[480px] overflow-hidden">
              {/* Highlight Ribbon */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -z-10"></div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-2xl font-bold text-slate-900 font-display">Custom</h3>
                  <span className="bg-emerald-50 text-emerald-850 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">For teams that need scaled intelligence</p>
                
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight font-display">Custom Rate</span>
                </div>

                <div className="w-full h-px bg-slate-100 my-6"></div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-slate-800">Unlimited scans & custom schedules</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Dedicated GEO visibility specialist</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Custom sources & specific sentiment modules</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>20+ competitor benchmarks</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Advanced API access & weekly custom audit reports</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => handlePlanClick("enterprise")}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm h-11.5 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10"
              >
                Contact Sales
              </Button>
            </div>
          </div>
 
          {/* Founder Circle Offer with FOMO metrics */}
          <div className="max-w-4xl mx-auto mt-16 px-4">
            <div className="bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              
              {/* Soft decorative background blurs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100/30 rounded-full blur-3xl opacity-60 -z-10"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl opacity-60 -z-10"></div>
 
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* Left column details */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      ⭐ Founder Circle - Legacy Special
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                      Join the Early Adopters
                    </h3>
                    <p className="text-sm text-slate-500 font-normal leading-relaxed">
                      Secure a lifetime discount rate on the Citero engine. Shape the product roadmap directly with our engineers.
                    </p>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Full onboarding audit call with our founder</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Direct feedback channel and priority support tier</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>Locked-in 50% lifetime discount rate</span>
                    </li>
                  </ul>
                </div>
 
                {/* Right column pricing + FOMO */}
                <div className="lg:col-span-5 w-full">
                  <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between text-center relative">
                    
                    {/* Live Scarcity Tag */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
                      Only {spotsLeft} seats left this week!
                    </div>

                    <div className="space-y-1 mb-6 mt-2">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Founder Circle Tier
                      </p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-extrabold text-slate-900 tracking-tight font-display">$49</span>
                        <span className="text-slate-400 text-sm font-medium">/ month</span>
                      </div>
                      <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 py-1 px-2.5 rounded-full inline-block mt-2">
                        50% Lifetime Discount Applied
                      </p>
                    </div>
                    <Button 
                      onClick={() => handlePlanClick("basic_founder")}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm h-11.5 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                    >
                      Subscribe & Lock Rate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
          {/* Footer Contact Support */}
          <div className="max-w-4xl mx-auto mt-12 text-center">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">Questions?</span> Contact our advisory team at{" "}
              <a href="mailto:hertofhelp@gmail.com" className="underline hover:text-slate-900 font-medium transition-colors">
                hertofhelp@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
};

export default Pricing;
