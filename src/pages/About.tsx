import { Link } from "react-router-dom";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { TrendingUp, Target, Zap, Users } from "lucide-react";

const About = () => {
  return (
    <div className="bg-white min-h-screen">
      <HomeHeader />
      <div className="pt-32 pb-24 px-3 lg:px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">
            About unifr
          </h1>
          
          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <p className="text-xl text-gray-700 leading-relaxed mb-6">
                unifr is the leading AI visibility tracking platform that helps brands understand and optimize how they appear 
                in AI-generated responses across ChatGPT, Gemini, Claude, and other major AI models.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                As AI becomes the primary way people discover information, brands need visibility in AI responses to stay competitive. 
                Our mission is to empower businesses to understand, track, and optimize their presence in the AI landscape, turning 
                AI mentions into real traffic and customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Do</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                unifr provides comprehensive GEO (Generative Engine Optimization) scanning and analytics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <Target className="h-8 w-8 text-gray-900 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Brand Visibility Tracking</h3>
                  <p className="text-gray-600 text-sm">
                    Monitor how often and in what context AI models mention your brand across different queries.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <Zap className="h-8 w-8 text-gray-900 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Sentiment Analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Understand the tone and sentiment of AI-generated descriptions about your brand.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <Users className="h-8 w-8 text-gray-900 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Competitor Benchmarking</h3>
                  <p className="text-gray-600 text-sm">
                    Compare your AI visibility against competitors and identify opportunities to outrank them.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <TrendingUp className="h-8 w-8 text-gray-900 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Actionable Insights</h3>
                  <p className="text-gray-600 text-sm">
                    Get clear recommendations on how to improve your brand's AI visibility and perception.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Why unifr?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Traditional SEO focuses on search engines, but the future belongs to AI. When users ask ChatGPT "What's the best 
                CRM for small businesses?" or Perplexity "Compare project management tools," your brand needs to be in those 
                responses. unifr helps you:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Track your brand's presence across multiple AI models</li>
                <li>Understand how AI describes your products and services</li>
                <li>Identify the sources AI references when mentioning your brand</li>
                <li>Optimize your content strategy to improve AI visibility</li>
                <li>Turn AI mentions into measurable business outcomes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Technology</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                unifr uses advanced AI scanning technology to query multiple AI models with brand-related questions, analyze 
                responses, and provide comprehensive visibility metrics. Our platform supports integration with OpenAI (ChatGPT), 
                Google (Gemini), DeepSeek, Claude, and other major AI providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Serve</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                unifr is designed for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Marketing Teams:</strong> Track brand perception and optimize content strategy</li>
                <li><strong>Growth Companies:</strong> Understand AI visibility and improve market positioning</li>
                <li><strong>Marketing Agencies:</strong> Provide GEO services to multiple clients</li>
                <li><strong>Enterprise Brands:</strong> Comprehensive AI visibility monitoring at scale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Ready to take control of your brand's AI visibility? Join our waitlist to get early access to unifr and start 
                tracking how AI models perceive your brand.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Have questions? <Link to="/contact" className="text-gray-900 underline hover:text-gray-700">Contact us</Link> — 
                we'd love to hear from you.
              </p>
            </section>
          </div>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default About;

