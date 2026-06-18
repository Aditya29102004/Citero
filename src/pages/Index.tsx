import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, BarChart3, Users, Search, Lightbulb, Mail, ChevronDown, ChevronUp, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnimatedGraphBackground } from "@/components/AnimatedGraphBackground";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Ensure Supabase is initialized
if (!supabase) {
  console.error("Supabase client not initialized");
}

const Index = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      id: 0,
      category: "AI Visibility",
      heading: "Understand exactly what AI says about your brand.",
      title: "AI Visibility Tracking",
      description: "ChatGPT, Gemini, and Claude increasingly shape user perceptions. Track where and how you are mentioned.",
      icon: Search,
      images: {
        back: "/visibility-back.png",
        front: "/visibility.png"
      }
    },
    {
      id: 1,
      category: "Sources & Citations",
      heading: "Find sources referenced by AI engines.",
      title: "Find Referencing Sources",
      description: "Discover which websites and documents AI engines use as primary references, so you can optimize them directly.",
      icon: BarChart3,
      images: {
        back: "/sources-back.png",
        front: "/sources.png"
      }
    },
    {
      id: 2,
      category: "Competitor Intel",
      heading: "Benchmark your brand against competitors.",
      title: "Compare Competitors",
      description: "See your competitor citation share and find gaps to steal traffic and customers.",
      icon: Users,
      images: {
        back: "/competitors-back.png",
        front: "/competitors.png"
      }
    },
    {
      id: 3,
      category: "Actionable Audits",
      heading: "Weekly prioritized action items & full brand audits.",
      title: "Turn Insights into Action",
      description: "Get weekly prioritized action items and full brand audits that show you exactly how to rank higher in AI responses.",
      icon: Lightbulb,
      images: {
        back: "/audits-back.png",
        front: "/audits.png"
      }
    }
  ];

  const [blogPosts, setBlogPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchLatestBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .select("id, title, topic, content, created_at, published_at, word_count, seo_keywords")
          .eq("status", "published")
          .eq("is_platform_blog", true)
          .order("published_at", { ascending: false })
          .limit(3);

        if (!error && data) {
          setBlogPosts(data);
        }
      } catch (err) {
        console.error("Error fetching homepage blogs:", err);
      }
    };
    fetchLatestBlogs();
  }, []);

  // Apply zoom exclusively to the homepage to replicate "ctrl -"
  useEffect(() => {
    // Explicitly casting as any because 'zoom' is a non-standard property
    (document.body.style as any).zoom = "0.8";

    return () => {
      // Revert the zoom when unmounting/leaving homepage
      (document.body.style as any).zoom = "1";
    };
  }, []);

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
    <div className="bg-white relative min-h-screen">
      <SEO
        title="citero - Track & Optimize Your Brand's AI Visibility | GEO Tracking Platform"
        description="Multiply your traffic from AI agents. Track how ChatGPT, Gemini, Claude, and Perplexity describe your brand. Get AI visibility insights, competitor analysis, and actionable recommendations to turn AI mentions into traffic and customers."
        keywords="AI visibility tracking, GEO tracking, Generative Engine Optimization, AI search optimization, brand tracking, ChatGPT visibility, Gemini tracking, Claude tracking, Perplexity tracking, AI mentions, AI brand monitoring"
        canonical="https://citero.ai"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "citero",
            "applicationCategory": "BusinessApplication",
            "description": "Track and optimize your brand's AI visibility across ChatGPT, Gemini, Claude, and Perplexity. Get actionable insights to turn AI mentions into traffic and customers.",
            "url": "https://citero.online",
            "offers": {
              "@type": "Offer",
              "price": "99",
              "priceCurrency": "USD",
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
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "citero",
            "url": "https://citero.ai",
            "description": "Track how ChatGPT, Perplexity, and Gemini describe your brand — and shows you how to increase your AI-driven traffic and visibility.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://citero.ai/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        ]}
      />
      <ParticleBackground particleCount={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 100} />
      <HomeHeader />
      
      {/* Hero Section - Clean Lumina Style */}
      <section className="pt-32 pb-20 px-3 lg:px-4 relative overflow-hidden bg-gradient-to-b from-transparent via-gray-50/20 to-transparent z-[2]">
        <div className="max-w-7xl mx-auto relative z-[2]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">
            {/* Left Side - Marketing Content */}
            <div className="lg:col-span-2 flex flex-col justify-center lg:text-left text-center space-y-6 pt-8 lg:pt-12">
              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 tracking-tight leading-[1.2]">
                Your competitors are being cited by AI. <span className="text-emerald-600">Are you?</span>
              </h1>
            
              {/* Description */}
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl lg:max-w-none">
              Convert AI mentions on ChatGPT, Perplexity, and Google AI into real traffic and paying customers.
            </p>
            
            <p className="text-base text-gray-500 leading-relaxed max-w-xl lg:max-w-none">
              Login to check score for free
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
              <Button 
                onClick={() => navigate("/demo")}
                variant="outline"
                size="default" 
                  className="border-slate-250 hover:bg-slate-50 text-slate-700 rounded-lg px-6 py-3 text-base font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Book a Demo
              </Button>
            </div>

            {/* Stats Block */}
            <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-6 mt-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 leading-tight">150+</span>
                <span className="text-[15px] text-slate-500">brands tracked</span>
              </div>
              <div className="w-[1.5px] h-8 bg-slate-200/80 rounded-full mx-1"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 leading-tight">4</span>
                <span className="text-[15px] text-slate-500">AI platforms</span>
              </div>
              <div className="w-[1.5px] h-8 bg-slate-200/80 rounded-full mx-1"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900 leading-tight">24/7</span>
                <span className="text-[15px] text-slate-500">live scanning</span>
              </div>
            </div>
          </div>

            {/* Right Side - Dashboard Screenshot - Larger */}
            <div className="lg:col-span-3 relative lg:order-2 z-10">
              <div className="relative rounded-xl lg:rounded-l-2xl lg:rounded-r-none overflow-hidden shadow-2xl border border-gray-200/80 lg:border-r-0 bg-white p-1.5 sm:p-2 w-full lg:w-[135%] xl:w-[150%] max-w-none lg:translate-x-12 xl:translate-x-20 transition-transform duration-350">
                <div className="rounded-lg lg:rounded-r-none overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img 
                    src="/hero-dashboard.png" 
                    alt="Citero Dashboard"
                    className="w-full h-auto object-contain rounded-lg lg:rounded-r-none"
                    loading="eager"
                  />
                </div>
              </div>
              {/* Decorative gradient elements */}
              <div className="absolute -top-6 right-0 lg:-right-12 w-40 h-40 bg-gradient-to-br from-blue-100/60 to-purple-100/60 rounded-full blur-3xl opacity-40 -z-10"></div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-gradient-to-br from-green-100/60 to-blue-100/60 rounded-full blur-3xl opacity-40 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Notion-style Interactive Features Section */}
      <section id="features" className="py-28 px-3 lg:px-4 relative overflow-hidden bg-slate-50/30 z-10">
        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Overarching Section Title */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-4">
              Track & Optimize Brand Perception 24/7
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to capture traffic, monitor competitors, and grow your presence across conversational search engines.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            
            {/* Left Side: Notion-style Navigation & Headings */}
            <div className="lg:col-span-5 flex flex-col justify-start space-y-8">
              
              {/* Active Headline Block */}
              <div className="space-y-2">
                <h3 className="text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
                  {features[activeTab].heading}
                </h3>
              </div>

              {/* Options List */}
              <div className="space-y-3 border-t border-gray-100 pt-6">
                {features.map((feature, index) => {
                  const isActive = activeTab === index;

                  return (
                    <Fragment key={feature.id}>
                      <div 
                        onClick={() => setActiveTab(index)}
                        className={`group cursor-pointer p-4 rounded-2xl transition-all duration-300 border ${
                          isActive 
                            ? "bg-slate-50/50 border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)]" 
                            : "border-transparent hover:bg-slate-50/30"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-1">
                            <h4 className={`text-lg font-semibold transition-colors duration-200 ${
                              isActive ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                            }`}>
                              {feature.title}
                            </h4>
                            
                            {/* Animated description wrapper */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isActive ? "max-h-24 opacity-100 mt-2" : "max-h-0 opacity-0"
                            }`}>
                              <p className="text-sm md:text-base text-slate-500 font-normal leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < features.length - 1 && (
                        <div className="border-b border-gray-200 mx-2" />
                      )}
                    </Fragment>
                  );
                })}
              </div>

            </div>

            <div className="lg:col-span-7 flex items-center justify-center relative group/nav">
              
              {/* Navigation Left Arrow */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab((prev) => (prev === 0 ? features.length - 1 : prev - 1));
                }}
                className="absolute left-0 z-30 w-10 h-10 bg-white text-gray-805 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Previous Feature"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center justify-center">
                <img 
                  key={activeTab}
                  src={features[activeTab].images.front} 
                  alt={features[activeTab].title} 
                  className="max-h-[480px] w-auto object-contain animate-fade-in" 
                />
              </div>

              {/* Navigation Right Arrow */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab((prev) => (prev === features.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-0 z-30 w-10 h-10 bg-white text-gray-805 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Next Feature"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Agents for Every Marketing Channel Section */}
      <section className="py-24 px-4 md:px-6 relative overflow-hidden z-10 w-full bg-white">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight font-display max-w-3xl leading-[1.15]">
              Agents for every marketing channel
            </h2>
          </div>

          {/* Card-based Layout matching user reference */}
          <div className="flex flex-col gap-8 w-full">
            
            {/* Card 1 - Prompt Simulator (Wide Horizontal Card) */}
            <div className="w-full rounded-3xl overflow-hidden border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-[#fafafa] flex flex-col md:flex-row h-auto md:h-[400px] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
              {/* Left side text */}
              <div className="w-full md:w-[39%] flex-shrink-0 p-8 md:p-12 flex flex-col justify-between items-start">
                <div className="space-y-4">
                  <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Prompt Simulator</span>
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-[1.25] font-display max-w-md">
                    See what AI says whether you appear, and at what position.
                  </h3>
                </div>
                <div className="mt-8 md:mt-0">
                  <div 
                    onClick={() => navigate("/auth")}
                    className="w-12 h-12 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
              {/* Right side mockup */}
              <div className="w-full md:w-[61%] flex-shrink-0 bg-[#e4ee28] p-0 flex items-center justify-center relative overflow-hidden h-[280px] md:h-full">
                <img 
                  src="/aeo.png" 
                  alt="Prompt Simulator Dashboard" 
                  className="w-full h-full object-contain object-right-bottom opacity-0 transition-opacity duration-300"
                  onLoad={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('opacity-0');
                    (e.currentTarget as HTMLElement).classList.add('opacity-100');
                  }}
                />
              </div>
            </div>

            {/* Row 2 - Two Vertical Cards Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              
              {/* Card 2 - AI Blog Generator */}
              <div className="rounded-3xl overflow-hidden border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-[#fafafa] flex flex-col h-auto md:h-[540px] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                {/* Top text part */}
                <div className="p-8 md:p-10 flex flex-col justify-between items-start flex-grow">
                  <div className="w-full">
                    <div className="flex justify-between items-center w-full mb-4">
                      <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">AI Blog Generator</span>
                      <div 
                        onClick={() => navigate("/auth")}
                        className="w-10 h-10 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug max-w-sm">
                      Citero finds citation gaps and generates blogs structured for ChatGPT.
                    </h3>
                  </div>
                </div>
                {/* Bottom mockup */}
                <div className="bg-[#f67070] p-0 flex items-center justify-center relative overflow-hidden h-[220px] md:h-[312px] w-full">
                  <img 
                    src="/content.png" 
                    alt="AI Blog Generator Editor" 
                    className="w-full h-full object-contain object-bottom opacity-0 transition-opacity duration-300"
                    onLoad={(e) => {
                      (e.currentTarget as HTMLElement).classList.remove('opacity-0');
                      (e.currentTarget as HTMLElement).classList.add('opacity-100');
                    }}
                  />
                </div>
              </div>

              {/* Card 3 - Founder's Note */}
              <div className="rounded-3xl overflow-hidden border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-[#fafafa] flex flex-col h-auto md:h-[540px] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                {/* Top text part */}
                <div className="p-8 md:p-10 flex flex-col justify-between items-start flex-grow">
                  <div className="w-full">
                    <div className="flex justify-between items-center w-full mb-4">
                      <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Founder's Note</span>
                      <div 
                        onClick={() => navigate("/auth")}
                        className="w-10 h-10 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug max-w-sm">
                      Every user gets direct access to the founder and GEO experts.
                    </h3>
                  </div>
                </div>
                {/* Bottom mockup */}
                <div className="bg-[#5c56ce] p-0 flex items-center justify-center relative overflow-hidden h-[240px] md:h-[344px] w-full">
                  <img 
                    src="/pr.png" 
                    alt="Founder's Note Board" 
                    className="w-full h-full object-contain object-bottom opacity-0 transition-opacity duration-300"
                    onLoad={(e) => {
                      (e.currentTarget as HTMLElement).classList.remove('opacity-0');
                      (e.currentTarget as HTMLElement).classList.add('opacity-100');
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Concluding Section Statement - Below the grid */}
          <div className="mt-20 border-t border-slate-100 pt-16 space-y-4 max-w-3xl">
            <h3 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.15]">
              AI is replacing Google. Is your brand ready?
            </h3>
            <p className="text-slate-500 font-medium text-lg md:text-xl leading-relaxed max-w-2xl">
              800M+ people use ChatGPT monthly. If you're not cited, you don't exist.
            </p>
          </div>
        </div>
      </section>

      {/* Product Hunt, IndieWall, Startup Fame, Dofollow.Tools, Aura++ & Fazier Badges - Scrolling */}
      <section className="py-8 px-3 lg:px-4 relative z-[2] overflow-hidden opacity-[0.20] hover:opacity-[0.40] transition-opacity duration-300 w-full max-w-full">
        <div className="max-w-full mx-auto overflow-hidden">
          <div className="flex flex-nowrap items-center gap-8 animate-scroll w-max">
            {/* First set of badges */}
            <a 
              href="https://www.producthunt.com/products/citero-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-citero-ai" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1037308&theme=neutral&t=1763916799417" 
                alt="Citero AI - Multiply Your Traffic from AI Agents | Product Hunt" 
                style={{ width: '200px', height: '43px' }} 
                width="200" 
                height="43" 
              />
            </a>
            <a 
              href="https://theindiewall.net" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://theindiewall.net/indiewall.svg" 
                alt="IndieWall" 
                width="120" 
                height="60" 
              />
            </a>
            <a 
              href="https://startupfa.me/s/citero?utm_source=www.citero.online" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://startupfa.me/badges/featured/dark.webp" 
                alt="citero - Featured on Startup Fame" 
                width="171" 
                height="54" 
              />
            </a>
            <a 
              href="https://dofollow.tools" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://dofollow.tools/badge/badge_dark.svg" 
                alt="Featured on Dofollow.Tools" 
                width="200" 
                height="54" 
              />
            </a>
            <a 
              href="https://auraplusplus.com/projects/ai-brand-monitoring-optimization" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://auraplusplus.com/images/badges/featured-on-light.svg" 
                alt="Featured on Aura++" 
              />
            </a>
            <a href="https://fazier.com/launches/www.citero.online" target="_blank" className="flex-shrink-0">
              <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral" width="120" alt="Fazier badge" />
            </a>
            <a 
              href="https://similarlabs.com/?ref=embed" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
              style={{ cursor: 'pointer' }}
            >
              <img 
                src="https://similarlabs.com/similarlabs-embed-badge-light.svg" 
                alt="SimilarLabs Embed Badge" 
              />
            </a>
            <a 
              href="https://findly.tools/citero?utm_source=citero" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://findly.tools/badges/findly-tools-badge-light.svg" 
                alt="Featured on findly.tools" 
                width="150" 
              />
            </a>
            <a 
              href="https://shipybara.com/projects/citero" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://shipybara.com/images/badges/shipybara-badge-light.svg" 
                alt="Featured on Shipybara" 
                width="150" 
                height="54" 
              />
            </a>
            <a 
              href="https://startuptrusted.com?ref=citero.online" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://startuptrusted.com/api/badge?type=top&style=light" 
                alt="citero on StartupTrusted" 
                width="240" 
                height="54" 
              />
            </a>
            {/* Duplicate set for seamless loop */}
            <a 
              href="https://www.producthunt.com/products/citero-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-citero-ai" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1037308&theme=neutral&t=1763916799417" 
                alt="Citero AI - Multiply Your Traffic from AI Agents | Product Hunt" 
                style={{ width: '200px', height: '43px' }} 
                width="200" 
                height="43" 
              />
            </a>
            <a 
              href="https://theindiewall.net" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://theindiewall.net/indiewall.svg" 
                alt="IndieWall" 
                width="120" 
                height="60" 
              />
            </a>
            <a 
              href="https://startupfa.me/s/citero?utm_source=www.citero.online" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://startupfa.me/badges/featured/dark.webp" 
                alt="citero - Featured on Startup Fame" 
                width="171" 
                height="54" 
              />
            </a>
            <a 
              href="https://dofollow.tools" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://dofollow.tools/badge/badge_dark.svg" 
                alt="Featured on Dofollow.Tools" 
                width="200" 
                height="54" 
              />
            </a>
            <a 
              href="https://auraplusplus.com/projects/ai-brand-monitoring-optimization" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://auraplusplus.com/images/badges/featured-on-light.svg" 
                alt="Featured on Aura++" 
              />
            </a>
            <a href="https://fazier.com/launches/www.citero.online" target="_blank" className="flex-shrink-0">
              <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral" width="120" alt="Fazier badge" />
            </a>
            <a 
              href="https://similarlabs.com/?ref=embed" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
              style={{ cursor: 'pointer' }}
            >
              <img 
                src="https://similarlabs.com/similarlabs-embed-badge-light.svg" 
                alt="SimilarLabs Embed Badge" 
              />
            </a>
            <a 
              href="https://findly.tools/citero?utm_source=citero" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://findly.tools/badges/findly-tools-badge-light.svg" 
                alt="Featured on findly.tools" 
                width="150" 
              />
            </a>
            <a 
              href="https://shipybara.com/projects/citero" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://shipybara.com/images/badges/shipybara-badge-light.svg" 
                alt="Featured on Shipybara" 
                width="150" 
                height="54" 
              />
            </a>
            <a 
              href="https://startuptrusted.com?ref=citero.online" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <img 
                src="https://startuptrusted.com/api/badge?type=top&style=light" 
                alt="citero on StartupTrusted" 
                width="240" 
                height="54" 
              />
            </a>
          </div>
        </div>
      </section>

      {/* Blog/Insights Section */}
      <section id="insights" className="py-24 px-3 lg:px-4 relative overflow-hidden bg-white z-10 border-t border-gray-100">
        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Header */}
          <div className="text-center mb-16 max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight font-display">
              Latest Insights from Citero
            </h2>
            <p className="text-base text-slate-500 font-normal leading-relaxed">
              Explore resources, guides, and strategic guidelines for winning organic recommendations in generative search.
            </p>
          </div>

          {/* Grid of Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {blogPosts.length > 0 ? (
              blogPosts.map((post) => {
                const preview = post.content
                  ? post.content.replace(/[#*`]/g, "").replace(/\n/g, " ").trim().substring(0, 150) + "..."
                  : "";
                return (
                  <article
                    key={post.id}
                    onClick={() => navigate("/blog")}
                    className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between animate-fade-in"
                  >
                    <div>
                      {post.topic && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          {post.topic}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 mb-3 hover:text-slate-700 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {preview && (
                        <p className="text-sm text-slate-550 leading-relaxed mb-4 line-clamp-3">
                          {preview}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-100 mt-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      <span>{post.word_count > 0 ? `${post.word_count.toLocaleString()} words` : ""}</span>
                    </div>
                  </article>
                );
              })
            ) : (
              // Default Fallback Featured SEO Blog
              <article
                onClick={() => navigate("/blog")}
                className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between md:col-span-2 lg:col-span-3 max-w-4xl mx-auto w-full animate-fade-in"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center w-full">
                  <div className="md:col-span-2 space-y-3 text-left">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Featured Guide
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900 hover:text-slate-700 transition-colors leading-tight">
                      The Complete Guide to Generative Engine Optimization (GEO): How to Get Cited in ChatGPT & Gemini
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      Traditional SEO is shifting. Generative engines like ChatGPT, Gemini, and Claude decide who gets recommended. GEO is the practice of optimizing your brand context and structured footprints so AI agents cite your content as their primary source.
                    </p>
                  </div>
                  <div className="md:col-span-1 bg-slate-50 border border-slate-150 p-5 rounded-xl flex flex-col justify-between h-full text-left">
                    <div className="text-xs text-slate-400 font-mono space-y-1 mb-4">
                      <div>// CITERO ADVISORY</div>
                      <div>Type: Technical SEO</div>
                      <div>Read time: 5 mins</div>
                    </div>
                    <div className="flex items-center text-sm font-semibold text-emerald-600 group hover:underline">
                      Read featured article
                      <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </article>
            )}
          </div>

          {/* Call to action to view more */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => navigate("/blog")}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
            >
              Browse All Platform Articles
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
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
              Everything you need to know about citero
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

      {/* CTA Banner Section */}
      <section className="py-20 px-4 md:px-6 relative overflow-hidden z-10 w-full bg-white border-t border-gray-100/50">
        <div className="max-w-6xl mx-auto relative min-h-[400px]">
          
          {/* Absolute background live graph overlay - spans full banner width */}
          <AnimatedGraphBackground className="absolute inset-0 z-0 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 pointer-events-none">
            
            {/* Left side - Spacer for desktop to let the background spiky graph show through */}
            <div className="lg:col-span-6 relative h-[320px] md:h-[380px] lg:h-[400px] w-full order-2 lg:order-1"></div>
            
            {/* Right side - Elite Typographic Content & CTA */}
            <div className="lg:col-span-6 flex flex-col justify-center text-left space-y-6 order-1 lg:order-2 pointer-events-auto">

              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight font-display leading-[1.15]">
                Your customers are already asking AI which brands to trust.
              </h2>
              
              <div className="text-sm md:text-base text-slate-500 font-normal leading-relaxed space-y-4">
                <p>
                  When users ask AI what product to buy, which company to trust, or what platform to use recommendations decide who wins.
                </p>
                <p className="font-semibold text-gray-900">
                  Citero helps you monitor, analyze, and improve how AI recommends your brand.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={() => navigate("/auth")}
                  size="default" 
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-3 text-sm font-medium shadow-md shadow-slate-950/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center self-start"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>


      <HomeFooter />
    </div>
  );
};

export default Index;
