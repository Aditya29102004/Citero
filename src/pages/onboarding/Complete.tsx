import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboardingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2, TrendingUp } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

export default function CompleteOnboarding() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  // Calculate onboarding score
  const calculateScore = (data: ReturnType<typeof getOnboardingData>): number => {
    let score = 0;
    
    // Website provided: +20
    if (data.websiteUrl && data.websiteUrl.trim()) {
      score += 20;
    }
    
    // Description/Summary provided: +20
    if (data.summary && data.summary.trim().length > 50) {
      score += 20;
    }
    
    // Topics added: +20 (up to 20 points)
    if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
      score += Math.min(20, data.topics.length * 4); // 4 points per topic, max 20
    }
    
    // Competitors added: +20 (up to 20 points)
    if (data.competitors && Array.isArray(data.competitors) && data.competitors.length > 0) {
      score += Math.min(20, data.competitors.length * 4); // 4 points per competitor, max 20
    }
    
    // Industry/Audience info: +20
    if ((data.industry && data.industry.trim()) || (data.audience && data.audience.trim())) {
      score += 20;
    }
    
    return Math.min(100, score);
  };

  useEffect(() => {
    const checkExistingBrand = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user already has a brand (prevent duplicate onboarding)
      const { data: existingBrands } = await supabase
        .from("brands")
        .select("id, onboarding_completed, topics, competitors")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingBrands && existingBrands.length > 0) {
        const existingBrand = existingBrands[0];
        
        // Check if onboarding is already completed
        if (existingBrand.onboarding_completed === true) {
          toast.info("You've already completed onboarding");
          const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
          const limits = await getUserSubscriptionLimits(session.user.id);
          if (limits.planType !== null) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/pricing", { replace: true });
          }
          return;
        }

        // Check if brand has onboarding data
        const hasOnboardingData = 
          (existingBrand.topics && Array.isArray(existingBrand.topics) && existingBrand.topics.length > 0) ||
          (existingBrand.competitors && (Array.isArray(existingBrand.competitors) || typeof existingBrand.competitors === 'object'));

        if (hasOnboardingData) {
          toast.info("You've already completed onboarding");
          const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
          const limits = await getUserSubscriptionLimits(session.user.id);
          if (limits.planType !== null) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/pricing", { replace: true });
          }
          return;
        }
      }

      const data = getOnboardingData();
      if (!data.websiteUrl) {
        navigate("/onboarding/website");
        return;
      }

      // Calculate score
      const calculatedScore = calculateScore(data);
      setScore(calculatedScore);

      // Auto-save on mount
      saveToDatabase();
    };

    checkExistingBrand();
  }, [navigate]);

  const saveToDatabase = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      const onboardingData = getOnboardingData();

      if (!onboardingData.websiteUrl || !onboardingData.summary) {
        toast.error("Missing required data. Please start over.");
        navigate("/onboarding/website");
        return;
      }

      // Call save-onboarding Edge Function
      const { data, error } = await supabase.functions.invoke("save-onboarding", {
        body: {
          websiteUrl: onboardingData.websiteUrl,
          summary: onboardingData.summary,
          industry: onboardingData.industry,
          audience: onboardingData.audience,
          topics: onboardingData.topics || [],
          competitors: onboardingData.competitors || [],
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        throw error;
      }

      if (data.error) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error);
      }

      if (!data.success) {
        throw new Error("Failed to save onboarding data");
      }

      // Verify the brand was created by checking the database
      // Wait a bit for database to sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: brands, error: brandsError } = await supabase
        .from("brands")
        .select("id, onboarding_completed")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (brandsError) {
        console.error("Error verifying brand creation:", brandsError);
        // If column doesn't exist, try without it
        if (brandsError.message?.includes("onboarding_completed")) {
          const { data: brandsFallback } = await supabase
            .from("brands")
            .select("id")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (brandsFallback && brandsFallback.length > 0) {
            console.log("Brand verified (fallback check):", brandsFallback[0]);
          } else {
            throw new Error("Brand was not created. Please try again.");
          }
        } else {
          throw new Error(`Failed to verify brand creation: ${brandsError.message}`);
        }
      } else if (brands && brands.length > 0) {
        console.log("Brand verified in database:", brands[0]);
        // If onboarding_completed exists but is false, update it
        if (brands[0].onboarding_completed === false || brands[0].onboarding_completed === null) {
          console.log("Updating onboarding_completed to true");
          await supabase
            .from("brands")
            .update({ onboarding_completed: true })
            .eq("id", brands[0].id);
        }
      } else {
        throw new Error("Brand was not created. Please try again.");
      }

      // Clear local storage only after successful save
      clearOnboardingData();

      setSaved(true);
      toast.success("Brand created successfully!");
      
      // Auto-redirect to pricing after showing score for 3 seconds
      setTimeout(() => {
        navigate("/pricing", { replace: true });
      }, 5000);
    } catch (error: any) {
      console.error("Error saving onboarding:", error);
      toast.error(error.message || "Failed to save. Please try again.");
      setSaving(false); // Keep saving state false so user can retry
    }
  };

  const handleGoToPricing = () => {
    navigate("/pricing", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="complete"
        completedSteps={["website", "description", "topics", "competitors", "analysis"]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl p-8 border border-gray-200 bg-white">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboarding Complete!</h1>
            <p className="text-gray-600">
              Your brand has been set up successfully. You're ready to start tracking!
            </p>
          </div>

          {saving ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Saving your brand...</span>
            </div>
          ) : saved && score !== null ? (
            <div className="space-y-6">
              {/* Final Score Display */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-8 text-center text-white">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-4">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <div className="text-5xl font-bold mb-2">{score}</div>
                <div className="text-gray-300 text-lg mb-1">Brand Setup Score</div>
                <div className="text-gray-400 text-sm">out of 100</div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Setup Complete!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your brand has been successfully configured. Subscribe now to unlock:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Run GEO scans to see how AI models perceive your brand</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Track visibility scores and competitor comparisons</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Monitor sentiment and top sources</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Get actionable insights to improve your AI visibility</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleGoToPricing}
                className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 text-base font-medium"
              >
                Subscribe to Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Redirecting to pricing in a few seconds...
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Preparing your results...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

