import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { WritingLoader } from "@/components/WritingLoader";
import { getOnboardingData, saveOnboardingData } from "@/lib/onboardingState";
import { TrendingUp, Award, BarChart3 } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

const ANALYSIS_STEPS = [
  "Analyzing website...",
  "Extracting industry keywords...",
  "Identifying competitors...",
  "Generating full GEO profile...",
  "Calculating visibility potential...",
];

export default function AnalysisOnboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [brandScore, setBrandScore] = useState(0);
  const [visibilityPotential, setVisibilityPotential] = useState("");
  const [categoryRanking, setCategoryRanking] = useState("");

  useEffect(() => {
    const data = getOnboardingData();
    if (!data.competitors || data.competitors.length === 0) {
      navigate("/onboarding/competitors");
      return;
    }

    // Simulate analysis steps
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          // Generate results
          setTimeout(() => {
            const score = Math.floor(Math.random() * 30) + 70; // 70-100
            const potential = ["High", "Medium", "Low"][Math.floor(Math.random() * 3)];
            const ranking = `Top ${Math.floor(Math.random() * 5) + 1}`;

            setBrandScore(score);
            setVisibilityPotential(potential);
            setCategoryRanking(ranking);

            saveOnboardingData({
              brandScore: score,
              visibilityPotential: potential,
              categoryRanking: ranking,
            });

            setAnalysisComplete(true);
          }, 1000);
          return prev;
        }
      });
    }, 2000); // 2 seconds per step

    return () => clearInterval(stepInterval);
  }, [navigate]);

  const handleContinue = async () => {
    // Save onboarding data to database before redirecting
    // This ensures brand and competitors are saved even without subscription
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const onboardingData = getOnboardingData();
        
        // Only save if we have required data and haven't saved yet
        if (onboardingData.websiteUrl && onboardingData.summary) {
          const { error } = await supabase.functions.invoke("save-onboarding", {
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
            console.error("Error saving onboarding before redirect:", error);
            // Continue anyway - user can still go to pricing
          }
        }
      }
    } catch (error) {
      console.error("Error in handleContinue:", error);
      // Continue to pricing anyway
    }
    
    // After showing analysis results, redirect to dashboard
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="analysis"
        completedSteps={["website", "description", "topics", "competitors"]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-3xl p-8 border border-gray-200 bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyzing Your Brand</h1>
            <p className="text-gray-600">
              We're building your complete GEO profile. This will take a moment...
            </p>
          </div>

          {!analysisComplete ? (
            <div className="py-12">
              <WritingLoader steps={ANALYSIS_STEPS} currentStepIndex={currentStepIndex} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Award className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Brand Score</p>
                      <p className="text-3xl font-bold text-gray-900">{brandScore}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visibility Potential</p>
                      <p className="text-3xl font-bold text-gray-900">{visibilityPotential}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Category Ranking</p>
                      <p className="text-3xl font-bold text-gray-900">{categoryRanking}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4 pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Great!</strong> Your brand analysis is complete. You're all set to start tracking your AI visibility with GEO scans.
                  </p>
                </div>
                <button
                  onClick={handleContinue}
                  className="w-full h-12 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

