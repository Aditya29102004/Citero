import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, BarChart3, Users, Search, Lightbulb, Mail, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scaledContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent extra scrolling after footer by compensating for 75% scale
    const handleResize = () => {
      if (scaledContentRef.current) {
        // Since content is scaled to 75%, we need to subtract 25% of the height
        const actualHeight = scaledContentRef.current.scrollHeight;
        const extraHeight = actualHeight * 0.25; // 25% of total height
        scaledContentRef.current.style.marginBottom = `-${extraHeight}px`;
      }
    };
    
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="bg-white overflow-x-hidden relative">
      <HomeHeader />
      <div 
        ref={scaledContentRef}
        style={{ 
          transform: 'scale(0.75)', 
          transformOrigin: 'top center', 
          width: '133.33%', 
          marginLeft: '-16.67%',
          marginBottom: '-25%'
        }}
      >
      
      {/* Hero Section */}
      <section className="pt-32 pb-24 px-3 lg:px-4 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-6xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Multiply Your Traffic from AI Agents
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
              Convert AI mentions on ChatGPT, Perplexity, and Google AI into real traffic and paying customers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-10 py-6 text-base font-medium shadow-sm hover:shadow-md transition-all duration-150"
              >
                Join Waitlist
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-24 px-3 lg:px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <WaitlistForm />
        </div>
      </section>

      {/* Key Features Section - Dashboard Style */}
      <section id="features" className="py-24 px-3 lg:px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Cards Grid - 2x3 Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Left: Understand What AI is Saying */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Understand What AI is Saying About Your Brand
              </h3>
              <img 
                src="/understand-ai-card.png" 
                alt="Understand What AI is Saying Dashboard"
                className="w-full h-auto rounded-lg border border-gray-100 mb-4"
              />
              <p className="text-base text-gray-600 leading-relaxed">
                See how AI platforms describe your brand, and use those insights to shape your strategy.
            </p>
          </div>

            {/* Top Right: Track AI Visibility */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Track AI Visibility
              </h3>
              <img 
                src="/dashboard-charts.png" 
                alt="Track AI Visibility Dashboard"
                className="w-full h-auto rounded-lg border border-gray-100 mb-4"
              />
              <p className="text-base text-gray-600 leading-relaxed">
                Measure how often you're mentioned and track progress over time.
              </p>
            </div>
              </div>

          {/* Bottom Row: Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Find Sources */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Find Sources Referenced by AI
              </h3>
              <img 
                src="/faq-table.png" 
                alt="Find Sources Dashboard"
                className="w-full h-auto rounded-lg border border-gray-100 mb-4"
              />
              <p className="text-base text-gray-600 leading-relaxed">
                Discover the exact sources AI pulls from, so you can optimize the content that drives visibility.
              </p>
            </div>

            {/* Compare Competitors */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Compare Competitors
              </h3>
              <img 
                src="/compare-competitors.png" 
                alt="Compare Competitors Dashboard"
                className="w-full h-auto rounded-lg border border-gray-100 mb-4"
              />
              <p className="text-base text-gray-600 leading-relaxed">
                Benchmark your brand against competitors and spot opportunities to outrank them.
              </p>
            </div>

            {/* Boost Product Visibility */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 tracking-tight">
                Boost Product Visibility
              </h3>
              <div className="mb-4">
                <label className="text-base font-medium text-gray-700 mb-2 block">
                  Choose AI Model
                </label>
                <Select defaultValue="gemini">
                  <SelectTrigger className="w-full border-gray-300 rounded-lg">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatgpt">ChatGPT (OpenAI)</SelectItem>
                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-base text-gray-600 leading-relaxed">
                Get clear, prioritized steps to turn mentions into customers. Choose your preferred AI model to analyze and optimize your brand visibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-3 lg:px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about unifr
            </p>
          </div>

          <div className="space-y-5">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-all duration-300 hover:shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="h-6 w-6 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-8 pb-6">
                    <p className="text-base text-gray-600 leading-relaxed">
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
      <section className="py-20 px-3 lg:px-4 bg-gray-50 border-y border-gray-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            See how AI agents perceive your brand
          </h2>
          <p className="text-xl text-gray-700 mb-10">
            Turn insights into visibility and turn mentions into customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-10 py-6 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                Join Waitlist
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-3 lg:px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto mb-16">
            {/* Basic Plan */}
            <div className="p-10 bg-white border-2 border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Basic</h3>
              <p className="text-base text-gray-500 mb-6">For solopreneurs or small brands testing GEO</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">$99</span>
                <span className="text-gray-600 text-xl">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>50 AI prompt scans/month</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>3 competitor comparisons</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>5 top source insights</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>1 email report / week</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Access to GPT-4o or Gemini</span>
                </li>
              </ul>
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-base py-6 font-medium shadow-md hover:shadow-lg transition-all"
              >
                Join Waitlist
              </Button>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="p-10 bg-white border-2 border-gray-900 rounded-2xl relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <span className="bg-gray-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Pro</h3>
              <p className="text-base text-gray-600 mb-6">For growth teams and marketing agencies</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">$249</span>
                <span className="text-gray-600 text-xl">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3 text-base text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>200 AI scans/month</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>10 competitor benchmarks</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>Advanced GEO insights (cross-AI comparison)</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>Weekly reports + blog recommendations</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span>Multi-user dashboard (up to 5 seats)</span>
                </li>
              </ul>
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-base py-6 font-medium shadow-md hover:shadow-lg transition-all"
              >
                Join Waitlist
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-10 bg-white border-2 border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Enterprise</h3>
              <p className="text-base text-gray-500 mb-6">For agencies or large brands</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-gray-900">Custom</span>
                <span className="text-gray-600 text-xl"> pricing</span>
                <p className="text-sm text-gray-500 mt-2">Starts at $499/mo</p>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Unlimited scans</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Dedicated GEO specialist</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Custom sources & sentiment models</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Slack / Notion integration</span>
                </li>
                <li className="flex items-start gap-3 text-base text-gray-600">
                  <CheckCircle2 className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>API access + white-label reports</span>
                </li>
              </ul>
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="outline"
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-base py-6 font-medium shadow-sm hover:shadow-md transition-all"
              >
                Join Waitlist
              </Button>
            </div>
          </div>

          {/* Founder Circle Offer */}
          <div className="max-w-6xl mx-auto mt-16">
            <div className="bg-gray-900 rounded-2xl p-10 md:p-14 text-white shadow-xl relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-3xl md:text-4xl font-bold text-white">Founder Circle Offer</h3>
              </div>
              <p className="text-xl text-gray-300 mb-8">
                First 10 paying users get lifetime access at 50% off their chosen tier.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <p className="text-base text-gray-300 mb-3">Basic Plan</p>
                  <p className="text-3xl font-bold text-white">$49/mo</p>
                  <p className="text-sm text-gray-400 mt-2">Lifetime pricing</p>
                </div>
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <p className="text-base text-gray-300 mb-3">Pro Plan</p>
                  <p className="text-3xl font-bold text-white">$129/mo</p>
                  <p className="text-sm text-gray-400 mt-2">Lifetime pricing</p>
                </div>
              </div>
              <ul className="space-y-3 text-base text-gray-300 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Custom onboarding call</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>Feedback loop access</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                  <span>"Featured Brand" badge in marketing</span>
                </li>
              </ul>
              <Button 
                onClick={() => {
                  const waitlistSection = document.getElementById('waitlist');
                  waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white hover:bg-gray-100 text-gray-900 rounded-lg px-10 py-6 text-base font-medium shadow-md hover:shadow-lg transition-all"
              >
                Join Waitlist
              </Button>
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
