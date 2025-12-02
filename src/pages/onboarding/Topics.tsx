import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, saveOnboardingData } from "@/lib/onboardingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Tag, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

export default function TopicsOnboarding() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getOnboardingData();
    if (!data.websiteUrl) {
      navigate("/onboarding/website");
      return;
    }
    if (!data.summary) {
      navigate("/onboarding/description");
      return;
    }

    // Always generate topics fresh from the scraped summary
    // This ensures we get real-time generation based on the website content
    console.log("Topics page loaded, generating topics from summary:", data.summary?.substring(0, 100));
    generateTopics();
  }, [navigate]);

  const generateTopics = async () => {
    try {
      const data = getOnboardingData();
      console.log("Generating topics with summary:", data.summary?.substring(0, 100));
      
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      toast.info("Generating topics...");
      
      const { data: response, error } = await supabase.functions.invoke("generate-topics", {
        body: { brandSummary: data.summary },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("Generate topics response:", { response, error });

      if (error) {
        console.error("Function invoke error:", error);
        throw error;
      }
      
      if (response?.error) {
        console.error("Function returned error:", response.error);
        throw new Error(response.error);
      }

      const generatedTopics = response?.topics || [];
      console.log("Generated topics:", generatedTopics);
      
      if (generatedTopics.length === 0) {
        throw new Error("No topics generated");
      }

      setTopics(generatedTopics);
      setSelectedTopics(generatedTopics.slice(0, 6)); // Pre-select first 6
      toast.success(`Generated ${generatedTopics.length} topics`);
    } catch (error: any) {
      console.error("Error generating topics:", error);
      toast.error(`Failed to generate topics: ${error.message || 'Unknown error'}. Using defaults.`);
      // Fallback topics
      const fallbackTopics = [
        "Business Software",
        "Productivity Tools",
        "SaaS Platform",
        "Enterprise Solutions",
        "Cloud Services",
        "Digital Transformation",
      ];
      setTopics(fallbackTopics);
      setSelectedTopics(fallbackTopics);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleNext = () => {
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }
    saveOnboardingData({ topics: selectedTopics });
    navigate("/onboarding/competitors");
  };

  const handleBack = () => {
    navigate("/onboarding/description");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="topics"
        completedSteps={["website", "description"]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-3xl p-8 border border-gray-200 bg-white">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">What do you want to show up on ChatGPT for?</h1>
            <p className="text-gray-600 text-lg">
              Pick the categories that you want to show up on ChatGPT for.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {topics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-5 py-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? "border-gray-900 bg-gray-900 text-white shadow-md"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <span className="text-base font-medium">{topic}</span>
                      </button>
                    );
                  })}
                </div>
                
                {topics.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Finding more ways for you to show up on ChatGPT...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-12 px-8 border-gray-300 bg-white hover:bg-gray-50"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-gray-900 text-white hover:bg-gray-800 font-medium"
                  disabled={selectedTopics.length === 0}
                >
                  {selectedTopics.length === 0 
                    ? "Select at least one topic"
                    : `Continue (${selectedTopics.length} selected)`}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

