import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { getOnboardingData, saveOnboardingData } from "@/lib/onboardingState";
import { FileText, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

export default function DescriptionOnboarding() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");

  useEffect(() => {
    const data = getOnboardingData();
    if (data.summary) setSummary(data.summary);
    if (data.industry) setIndustry(data.industry);
    if (data.audience) setAudience(data.audience);

    // If no data, redirect back
    if (!data.websiteUrl) {
      navigate("/onboarding/website");
    }
  }, [navigate]);

  const handleNext = () => {
    saveOnboardingData({
      summary,
      industry,
      audience,
    });
    navigate("/onboarding/topics");
  };

  const handleBack = () => {
    navigate("/onboarding/website");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="description"
        completedSteps={["website"]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl p-8 border border-gray-200 bg-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Refine Your Description</h1>
                <p className="text-gray-600 mt-1">
                  Review and edit the AI-generated description of your business
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="summary" className="text-sm font-medium text-gray-700">
                Business Summary
              </Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-2 min-h-[120px]"
                placeholder="Describe your business..."
              />
            </div>

            <div>
              <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                Industry
              </Label>
              <Textarea
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-2 min-h-[60px]"
                placeholder="Your industry..."
              />
            </div>

            <div>
              <Label htmlFor="audience" className="text-sm font-medium text-gray-700">
                Target Audience
              </Label>
              <Textarea
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-2 min-h-[60px]"
                placeholder="Your target audience..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-12 border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 h-12 bg-gray-900 text-white hover:bg-gray-800"
                disabled={!summary.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

