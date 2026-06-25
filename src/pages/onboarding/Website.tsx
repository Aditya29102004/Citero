import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { supabase } from "@/integrations/supabase/client";
import { saveOnboardingData } from "@/lib/onboardingState";
import { toast } from "sonner";
import { Loader2, Globe } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

export default function WebsiteOnboarding() {
  const navigate = useNavigate();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user already has a brand (onboarding already completed)
      const { data: existingBrands } = await supabase
        .from("brands")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingBrands && existingBrands.length > 0) {
        const brand = existingBrands[0];
        // Check if onboarding is completed
        if (brand.onboarding_completed === true) {
          toast.info("You've already completed onboarding");
          // Check subscription status to redirect appropriately
          navigate("/dashboard", { replace: true });
          return;
        }
        // If brand exists but onboarding not marked complete, check if it has onboarding data
        const { data: brandDetails } = await supabase
          .from("brands")
          .select("topics, competitors, onboarding_completed")
          .eq("id", brand.id)
          .single();
        
        const hasOnboardingData = brandDetails && (
          (brandDetails.topics && Array.isArray(brandDetails.topics) && brandDetails.topics.length > 0) ||
          (brandDetails.competitors && (Array.isArray(brandDetails.competitors) || typeof brandDetails.competitors === 'object'))
        );

        if (hasOnboardingData || brandDetails?.onboarding_completed === true) {
          toast.info("You've already completed onboarding");
          navigate("/dashboard", { replace: true });
          return;
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    // Validate URL
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      toast.info("Analyzing website...");

      console.log("Calling scrape-url with:", { url, hasToken: !!session.access_token });

      // Call scrape-url Edge Function
      // Supabase client automatically adds Authorization header from session
      const { data, error } = await supabase.functions.invoke("scrape-url", {
        body: { url },
      });

      console.log("Scrape URL response:", { data, error });

      // Check for error in response data first (function returns error in data.error)
      if (data?.error) {
        console.error("Scrape URL returned error:", data.error);
        throw new Error(data.error);
      }

      if (error) {
        console.error("Scrape URL function error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Error context:", error.context);
        
        // Try to read error response body if available
        let errorMessage = error.message || "Failed to analyze website";
        if (error.context && typeof error.context === 'object') {
          try {
            // If context has a response, try to read it
            if (error.context.body) {
              const errorBody = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              if (errorBody?.error) {
                errorMessage = errorBody.error;
              }
            }
          } catch (e) {
            console.error("Error parsing error context:", e);
          }
        }
        
        throw new Error(errorMessage);
      }

      if (!data || !data.summary) {
        console.warn("No summary in response:", data);
        throw new Error("Website analysis returned no data. Please try again.");
      }

      // Save to local state
      saveOnboardingData({
        websiteUrl: url,
        summary: data.summary,
        industry: data.industry,
        audience: data.audience,
        keywords: data.keywords || [],
      });

      toast.success("Website analyzed successfully!");
      navigate("/onboarding/description");
    } catch (error: any) {
      console.error("Error analyzing website:", error);
      toast.error(error.message || "Failed to analyze website. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="website"
        completedSteps={[]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl p-8 border border-gray-200 bg-white">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Enter Your Website</h1>
            <p className="text-gray-600 text-lg">
              We'll analyze your website to understand your business
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-12 h-14 text-base border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  disabled={loading}
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-3 text-center">
                Enter your main website URL. We'll extract key information automatically.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 text-base font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Website...
                </>
              ) : (
                "Analyze Website"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

