import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Search, BookOpen, HelpCircle, FileText, Video, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const articles = [
    {
      id: 1,
      title: "Getting Started with Brand Tracking",
      category: "Getting Started",
      description: "Learn how to set up your first brand and run your first scan",
      icon: BookOpen,
    },
    {
      id: 2,
      title: "Understanding Visibility Scores",
      category: "Analytics",
      description: "Learn how visibility scores are calculated and what they mean",
      icon: HelpCircle,
    },
    {
      id: 3,
      title: "Competitor Analysis Guide",
      category: "Features",
      description: "How to use competitor analysis to improve your brand visibility",
      icon: FileText,
    },
    {
      id: 4,
      title: "Sentiment Analysis Explained",
      category: "Analytics",
      description: "Understanding positive, neutral, and negative sentiment",
      icon: HelpCircle,
    },
    {
      id: 5,
      title: "Managing Team Members",
      category: "Team",
      description: "How to invite and manage team members on your account",
      icon: BookOpen,
    },
    {
      id: 6,
      title: "Subscription Plans & Limits",
      category: "Billing",
      description: "Understanding your subscription plan and usage limits",
      icon: FileText,
    },
  ];

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
                <p className="text-gray-600">Find answers to common questions and learn how to use unifr</p>
              </div>

              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full max-w-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => {
                  const Icon = article.icon;
                  return (
                    <Card
                      key={article.id}
                      className="p-6 border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          <Icon className="h-6 w-6 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase">
                            {article.category}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900 mt-1 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600">{article.description}</p>
                          <a
                            href="#"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-3"
                          >
                            Read more
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredArticles.length === 0 && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <p className="text-gray-600">No articles found matching your search.</p>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default KnowledgeBase;

