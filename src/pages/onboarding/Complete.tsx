import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboardingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

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

  useEffect(() => {
    const data = getOnboardingData();
    if (!data.websiteUrl) {
      navigate("/onboarding/website");
      return;
    }

    // Auto-save on mount
    saveToDatabase();
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

      toast.success("Brand created successfully! Redirecting to dashboard...");
      
      // Small delay to show success message, then navigate
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error("Error saving onboarding:", error);
      toast.error(error.message || "Failed to save. Please try again.");
      setSaving(false); // Keep saving state false so user can retry
    }
  };

  const handleGoToDashboard = async () => {
    // Double-check onboarding is complete before navigating
    const { checkOnboardingComplete } = await import("@/lib/onboardingState");
    const isComplete = await checkOnboardingComplete();
    
    if (!isComplete) {
      toast.error("Please complete onboarding first");
      return;
    }
    
    navigate("/dashboard");
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
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-gray-900">What's Next?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Run your first GEO scan to see how AI models perceive your brand</li>
                  <li>• Track visibility scores and competitor comparisons</li>
                  <li>• Monitor sentiment and top sources</li>
                  <li>• Get actionable insights to improve your AI visibility</li>
                </ul>
              </div>

              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

