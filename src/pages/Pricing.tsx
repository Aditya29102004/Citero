import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const navigate = useNavigate();

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
    <div className="bg-white min-h-screen">
      <SEO
        title="Pricing - citero | Choose Your Plan"
        description="Choose the plan that fits you for AI visibility tracking."
        keywords="pricing, plans, subscription, AI visibility tracking"
        canonical="https://citero.ai/pricing"
      />
      <HomeHeader />
      
      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50/30 to-white relative overflow-hidden">
        
        {/* Subtle grid layout background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-70"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="text-center mb-16 pt-16 max-w-2xl mx-auto space-y-3">
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight font-display">
              Simple, transparent pricing
            </h1>
            <p className="text-base text-slate-500 font-normal leading-relaxed">
              Choose the plan that fits your growth stage. Start tracking your brand visibility across top AI search engines.
            </p>
          </div>
 
          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16 px-4">
            
            {/* Basic Plan */}
            <div className="p-8 bg-white border border-slate-200/60 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[460px]">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 font-display">Basic</h3>
                <p className="text-xs text-slate-400 mt-1 mb-6">Perfect for getting started</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold text-slate-900 tracking-tight font-display">$99</span>
                  <span className="text-slate-400 text-sm font-medium">/ month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>50 AI prompt scans/month</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>10 competitor comparisons</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Top source insights</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>5 blog per month</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Access to GPT-4o or Gemini</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => handlePlanClick("basic_normal")}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm h-11 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10"
              >
                Subscribe Now
              </Button>
            </div>
 
            {/* Custom Plan (Enterprise) */}
            <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between min-h-[460px] overflow-hidden">
              {/* Decorative light reflection gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xl font-semibold text-white font-display">Custom</h3>
                  <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-indigo-500/10">
                    Most Popular
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">For teams that need more</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-white tracking-tight font-display">Custom</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>Unlimited scans</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>Dedicated GEO specialist</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>Custom sources & sentiment models</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>20+ competitor benchmarks</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>Advanced GEO insights</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span>Weekly reports + recommendations</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => handlePlanClick("enterprise")}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm h-11 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] relative z-10 shadow-sm shadow-black/5"
              >
                Contact Sales
              </Button>
            </div>
          </div>
 
          {/* Founder Circle Offer */}
          <div className="max-w-4xl mx-auto mt-16 px-4">
            <div className="bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50/40 p-8 sm:p-10 rounded-3xl border border-slate-100/60 shadow-[0_12px_40px_rgba(0,0,0,0.02)] relative overflow-hidden">
              
              {/* Decorative glowing gradient blur */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl opacity-60 -z-10 animate-pulse" style={{ animationDuration: '6s' }}></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/40 rounded-full blur-3xl opacity-60 -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
 
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* Left column info */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-indigo-600/10 text-indigo-600 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-indigo-600/10">
                      Limited Founder Offer
                    </div>
                    <h3 className="text-3xl font-semibold text-slate-900 font-display tracking-tight">Founder Circle</h3>
                    <p className="text-sm text-slate-500 font-normal leading-relaxed">
                      Become an early adopter. Secure premium access to all of Citero's capabilities at an exclusive, legacy rate.
                    </p>
                  </div>
                  
                  <ul className="space-y-3.5 text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>Full custom onboarding call with our team</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>Direct feedback channel access to shape our product roadmap</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4.5 w-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>"Featured Brand" badge in our marketing & testimonials</span>
                    </li>
                  </ul>
                </div>
 
                {/* Right column: elevated checkout price card */}
                <div className="lg:col-span-5 w-full">
                  <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between text-center">
                    <div className="space-y-1 mb-6">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Basic Plan (Founder Rate)</p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-semibold text-slate-900 tracking-tight font-display">$49</span>
                        <span className="text-slate-400 text-sm font-medium">/ month</span>
                      </div>
                      <p className="text-[10px] text-indigo-600 font-semibold bg-indigo-50/50 py-1 px-2.5 rounded-full inline-block mt-2">
                        Save 50% lifetime
                      </p>
                    </div>
                    <Button 
                      onClick={() => handlePlanClick("basic_founder")}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm h-11 font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm shadow-slate-950/10"
                    >
                      Subscribe Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
          {/* Support Contact */}
          <div className="max-w-4xl mx-auto mt-12 text-center">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">Need help?</span> Contact us at{" "}
              <a href="mailto:hertofhelp@gmail.com" className="underline hover:text-slate-950 font-medium transition-colors">hertofhelp@gmail.com</a>
            </p>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
};

export default Pricing;

