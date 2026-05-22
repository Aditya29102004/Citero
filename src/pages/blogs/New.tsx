import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BlogGeneratorForm } from "@/components/blogs/BlogGeneratorForm";
import { AnimatedText } from "@/components/AnimatedText";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserSubscriptionLimits, getUserBlogGenerationUsage, canGenerateBlog } from "@/lib/subscriptionLimits";

const NewBlog = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [blogUsage, setBlogUsage] = useState<number>(0);
  const [blogLimit, setBlogLimit] = useState<number>(5);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBrands();
      fetchBlogLimits();
    }
  }, [session]);

  const fetchBlogLimits = async () => {
    if (!session?.user?.id) return;
    try {
      const limits = await getUserSubscriptionLimits(session.user.id);
      const usage = await getUserBlogGenerationUsage(session.user.id);
      setBlogLimit(limits.blogGenerationsPerMonth || 5);
      setBlogUsage(usage);
    } catch (error) {
      console.error("Error fetching blog limits:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", session?.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    }
  };

  const handleGenerate = async (formData: {
    brandId: string;
    topic: string;
    blogGoal: string;
    competitorFocus?: string;
    tone: string;
  }) => {
    if (!session?.user?.id) {
      toast.error("Please log in to generate blogs");
      return;
    }

    // Check if user can generate blog
    const canGenerate = await canGenerateBlog(session.user.id);
    if (!canGenerate.allowed) {
      toast.error(canGenerate.reason || "Cannot generate blog");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog", {
        body: {
          brandId: formData.brandId,
          topic: formData.topic,
          blogGoal: formData.blogGoal,
          competitorFocus: formData.competitorFocus,
          tone: formData.tone,
        },
      });

      if (error) {
        console.error("Edge Function error:", error);
        console.error("Error object:", JSON.stringify(error, null, 2));
        
        // Try to extract error message from various possible locations
        let errorMessage = "Failed to generate keywords";
        if (error.message) {
          errorMessage = error.message;
        } else if ((error as any)?.error) {
          errorMessage = (error as any).error;
        } else if ((error as any)?.message) {
          errorMessage = (error as any).message;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response contains an error field
      if (data?.error) {
        console.error("Edge Function returned error:", data.error);
        console.error("Error details:", data.details);
        const errorMessage = data.error + (data.details ? ` - ${data.details}` : "");
        throw new Error(errorMessage);
      }

      if (data?.blogId) {
        const keywordCount = data?.keywords?.length || 0;
        toast.success(`Generated ${keywordCount} keywords successfully!`);
        // Refresh usage after generation
        await fetchBlogLimits();
        navigate(`/blogs/${data.blogId}`);
      } else {
        console.error("Unexpected response format:", data);
        throw new Error("No blog ID returned from server");
      }
    } catch (error: any) {
      console.error("Error generating blog:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));
      
      // Extract error message from various possible formats
      let errorMessage = "Failed to generate blog";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.details) {
        errorMessage = `${error.message || "Error"}: ${error.details}`;
      }
      
      console.error("Final error message:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <Button
                onClick={() => navigate("/blogs")}
                variant="ghost"
                className="mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blogs
              </Button>

              {generating ? (
                <Card className="p-12 border border-slate-200 bg-white rounded-xl shadow-sm">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-6"></div>
                    <AnimatedText
                      texts={[
                        "Analyzing your brand data...",
                        "Extracting top sources and citations...",
                        "Identifying competitor keywords...",
                        "Researching SEO opportunities...",
                        "Generating keyword suggestions...",
                      ]}
                      className="text-lg font-medium text-gray-900"
                      typingSpeed={80}
                      deletingSpeed={40}
                      pauseDuration={1500}
                    />
                    <p className="text-sm text-gray-500 mt-4">
                      This may take 30-60 seconds...
                    </p>
                  </div>
                </Card>
              ) : (
                <BlogGeneratorForm 
                  brands={brands} 
                  onGenerate={handleGenerate} 
                  loading={generating}
                  blogUsage={blogUsage}
                  blogLimit={blogLimit}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default NewBlog;

