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
        title="Pricing - unifr | Choose Your Plan"
        description="Choose the plan that fits you for AI visibility tracking."
        keywords="pricing, plans, subscription, AI visibility tracking"
        canonical="https://unifr.ai/pricing"
      />
      <HomeHeader />
      
      {/* Pricing Section */}
      <div 
        style={{ 
          transform: 'scale(0.75)', 
          transformOrigin: 'top center', 
          width: '133.33%', 
          marginLeft: '-16.67%',
          paddingTop: '120px'
        }}
      >
      <section className="py-16 px-3 lg:px-4 bg-gradient-to-b from-gray-50/50 to-white relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12 pt-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Choose the plan that fits you
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Basic Plan */}
            <div className="p-8 bg-white/90 backdrop-blur-md border-2 border-gray-200 rounded-2xl hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
              <p className="text-sm text-gray-500 mb-6">Perfect for getting started</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">₹8,900</span>
                <span className="text-gray-600 text-xl">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>50 AI prompt scans/month</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>3 competitor comparisons</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>5 top source insights</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>1 email report / week</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>Access to GPT-4o or Gemini</span>
                </li>
              </ul>
              <Button 
                onClick={() => handlePlanClick("basic_normal")}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-base py-5 font-medium shadow-md hover:shadow-lg transition-all"
              >
                Subscribe Now
              </Button>
            </div>

            {/* Custom Plan - Highlighted */}
            <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl relative hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 border-2 border-gray-900">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Custom</h3>
              <p className="text-sm text-gray-300 mb-6">For teams that need more</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">Custom</span>
                <span className="text-gray-300 text-xl ml-2">pricing</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Unlimited scans</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Dedicated GEO specialist</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Custom sources & sentiment models</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>10 competitor benchmarks</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Advanced GEO insights (cross-AI comparison)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Weekly reports + blog recommendations</span>
                </li>
              </ul>
              <Button 
                onClick={() => handlePlanClick("enterprise")}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-base py-5 font-medium shadow-md hover:shadow-lg transition-all"
              >
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Founder Circle Offer */}
          <div className="max-w-4xl mx-auto mt-12">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border-2 border-gray-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="mb-6">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">Founder Circle</h3>
                  <p className="text-base text-gray-300">
                    Exclusive pricing for early adopters
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-6 mb-6 border border-white/20">
                  <p className="text-sm text-gray-300 mb-3">Basic Plan</p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <p className="text-4xl font-bold text-white">₹4,400</p>
                    <p className="text-lg text-gray-300">/mo</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Founder Circle pricing - Limited time offer</p>
                  <Button 
                    onClick={() => handlePlanClick("basic_founder")}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-sm py-3 font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Subscribe Now
                  </Button>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0 mt-0.5" />
                    <span>Custom onboarding call</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0 mt-0.5" />
                    <span>Feedback loop access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0 mt-0.5" />
                    <span>"Featured Brand" badge in marketing</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <HomeFooter />
    </div>
  );
};

export default Pricing;

