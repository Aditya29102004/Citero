import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, BarChart3, Users, Search, Lightbulb, Mail, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnimatedGraphBackground } from "@/components/AnimatedGraphBackground";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  // Removed scale transform - no longer needed

  const faqs = [
    {
      question: "What is AI visibility tracking?",
      answer: "AI visibility tracking monitors how AI models like ChatGPT, Gemini, and Claude describe your brand across different queries and contexts. It measures your brand's presence, sentiment, and positioning in AI-generated responses."
    },
    {
      question: "How does GEO scanning work?",
      answer: "GEO (Generative Engine Optimization) scanning uses AI to query multiple AI models with brand-related questions. We analyze the responses to understand how your brand is perceived, mentioned, and positioned compared to competitors."
    },
    {
      question: "Which AI providers do you support?",
      answer: "We support ChatGPT (OpenAI), Gemini (Google), DeepSeek, and other major AI models. You can choose your preferred provider or use multiple providers for comprehensive analysis."
    },
    {
      question: "How often should I run scans?",
      answer: "We recommend running weekly scans to track changes in your AI visibility. Pro and Enterprise plans include automated weekly reports, so you always stay informed about your brand's AI presence."
    },
    {
      question: "What insights will I get from a scan?",
      answer: "Each scan provides visibility scores, sentiment analysis, competitor comparisons, actionable recommendations, content ideas, and week-over-week change tracking. You'll see exactly how AI models perceive your brand and what you can do to improve."
    },
    {
      question: "Can I track multiple brands?",
      answer: "Yes! You can track unlimited brands on Pro and Enterprise plans. Each brand gets its own dashboard with independent tracking, analytics, and insights."
    }
  ];

  return (
    <div className="bg-white overflow-x-hidden relative min-h-screen">
      <SEO
        title="unifr - Track & Optimize Your Brand's AI Visibility | GEO Tracking Platform"
        description="Multiply your traffic from AI agents. Track how ChatGPT, Gemini, Claude, and Perplexity describe your brand. Get AI visibility insights, competitor analysis, and actionable recommendations to turn AI mentions into traffic and customers."
        keywords="AI visibility tracking, GEO tracking, Generative Engine Optimization, AI search optimization, brand tracking, ChatGPT visibility, Gemini tracking, Claude tracking, Perplexity tracking, AI mentions, AI brand monitoring"
        canonical="https://unifr.ai"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "unifr",
          "applicationCategory": "BusinessApplication",
          "description": "Track and optimize your brand's AI visibility across ChatGPT, Gemini, Claude, and Perplexity. Get actionable insights to turn AI mentions into traffic and customers.",
          "url": "https://unifr.ai",
          "offers": {
            "@type": "Offer",
            "price": "8900",
            "priceCurrency": "INR",
            "priceValidUntil": "2025-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "127"
          },
          "featureList": [
            "AI visibility tracking",
            "GEO scanning",
            "Competitor analysis",
            "Sentiment analysis",
            "Source citation tracking",
            "Weekly reports",
            "Blog recommendations"
          ]
        }}
      />
      <ParticleBackground particleCount={typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 40} />
      <HomeHeader />
      <div 
        style={{ 
          transform: 'scale(0.75)', 
          transformOrigin: 'top center', 
          width: '133.33%', 
          marginLeft: '-16.67%'
        }}
      >
      
      {/* Hero Section - Clean Lumina Style */}
      <section className="pt-32 pb-20 px-3 lg:px-4 relative overflow-hidden bg-gradient-to-b from-white via-gray-50/20 to-white z-[2]">
        <div className="max-w-7xl mx-auto relative z-[2]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            {/* Left Side - Marketing Content */}
            <div className="lg:col-span-2 flex flex-col justify-center lg:text-left text-center space-y-6 pt-8 lg:pt-12">
              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.2]">
                Multiply Your Traffic from AI Agents
              </h1>
              
              {/* Description */}
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl lg:max-w-none">
                Convert AI mentions on ChatGPT, Perplexity, and Google AI into real traffic and paying customers.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 lg:justify-start justify-center pt-2">
                <Button 
                  onClick={() => navigate("/auth")}
                  size="default" 
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Right Side - Dashboard Screenshot - Larger */}
            <div className="lg:col-span-3 relative lg:order-2">
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200/80 bg-white p-2">
                <div className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-50/30 to-white">
                  <img 
                    src="/Screenshot 2025-12-02 180248.png" 
                    alt="unifr Dashboard"
                    className="w-full h-auto block rounded-lg scale-105"
                    loading="eager"
                    style={{ transform: 'scale(1.05)' }}
                  />
                </div>
              </div>
              {/* Decorative gradient elements */}
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-gradient-to-br from-blue-100/60 to-purple-100/60 rounded-full blur-3xl opacity-40 -z-10"></div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-gradient-to-br from-green-100/60 to-blue-100/60 rounded-full blur-3xl opacity-40 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Hunt Badge */}
      <section className="py-5 px-3 lg:px-4 bg-white relative z-[2]">
        <div className="max-w-6xl mx-auto flex justify-center">
          <a 
            href="https://www.producthunt.com/products/unifr-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-unifr-ai" 
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1037308&theme=neutral&t=1763916799417" 
              alt="Unifr AI - Multiply Your Traffic from AI Agents | Product Hunt" 
              style={{ width: '200px', height: '43px' }} 
              width="200" 
              height="43" 
            />
          </a>
        </div>
      </section>


      {/* Key Features Section - Alternating Image/Text Layout */}
      <section id="features" className="py-32 px-3 lg:px-4 bg-white relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Feature 1: Understand What AI is Saying - Image Left, Text Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Image Side */}
            <div className="order-2 lg:order-1">
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 shadow-lg">
                <img 
                  src="/understand-ai-card.png" 
                  alt="Understand What AI is Saying Dashboard"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>
            
            {/* Text Side */}
            <div className="order-1 lg:order-2 lg:pl-8">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                Understand What AI is Saying About Your Brand
              </h3>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                See how AI platforms describe your brand, and use those insights to shape your strategy.
              </p>
            </div>
          </div>

          {/* Feature 2: Find Sources - Image Left, Text Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Image Side */}
            <div className="order-2 lg:order-1">
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 shadow-lg">
                <img 
                  src="/faq-table.png" 
                  alt="Find Sources Dashboard"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>
            
            {/* Text Side */}
            <div className="order-1 lg:order-2 lg:pl-8">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                Find Sources Referenced by AI
              </h3>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Discover the exact sources AI pulls from, so you can optimize the content that drives visibility.
              </p>
            </div>
          </div>

          {/* Feature 3: Compare Competitors - Text Left, Image Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            {/* Text Side */}
            <div className="lg:pr-8">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                Compare Competitors
              </h3>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Benchmark your brand against competitors and spot opportunities to outrank them.
              </p>
            </div>
            
            {/* Image Side */}
            <div>
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 shadow-lg">
                <img 
                  src="/compare-competitors.png" 
                  alt="Compare Competitors Dashboard"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Feature 4: Get Actions & Brand Audits - Text Left, Image Right (Last) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
            {/* Text Side */}
            <div className="lg:pr-8">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                Turn Insights Into Action
              </h3>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Get prioritized actions and comprehensive brand audits that show you exactly how to improve your AI visibility. Every insight comes with clear, actionable steps to systematically boost your presence and turn mentions into measurable growth.
              </p>
            </div>
            
            {/* Image Side */}
            <div>
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 shadow-lg">
                <img 
                  src="/dashboard-charts.png" 
                  alt="Actionable Insights and Brand Audits Dashboard"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section id="faq" className="py-16 px-3 lg:px-4 bg-gray-50/30 relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about unifr
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <span className="text-base font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 md:py-16 px-3 lg:px-4 bg-white border-y border-gray-100 relative overflow-visible z-10 min-h-[400px] md:min-h-[500px] w-full">
        <div className="max-w-6xl mx-auto relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 items-center">
            {/* Left side - Graph */}
            <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full order-2 lg:order-1 overflow-hidden">
              <AnimatedGraphBackground />
            </div>
            
            {/* Right side - Text and CTA */}
            <div className="flex flex-col justify-center lg:text-left text-center relative z-20 order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4 tracking-tight leading-tight">
                See how AI agents perceive your brand
              </h2>
              <p className="text-base md:text-lg text-gray-600 md:text-gray-700 mb-4 md:mb-6 leading-relaxed">
                Turn insights into visibility and turn mentions into customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 lg:justify-start justify-center">
                <Button 
                  onClick={() => navigate("/auth")}
                  size="default" 
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 py-3 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-3 lg:px-4 bg-gray-50/30 relative overflow-hidden z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Choose the plan that fits you
            </h2>
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

      <HomeFooter />
      </div>
    </div>
  );
};

export default Index;
