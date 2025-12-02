import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { AnimatedText } from "@/components/AnimatedText";
import { getOnboardingData, saveOnboardingData } from "@/lib/onboardingState";
import { fetchWebsiteLogo } from "@/lib/fetchLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, ArrowLeft, Plus, X, Globe, FileText } from "lucide-react";

const STEPS = [
  { id: "website", label: "Website", path: "/onboarding/website" },
  { id: "description", label: "Description", path: "/onboarding/description" },
  { id: "topics", label: "Topics", path: "/onboarding/topics" },
  { id: "competitors", label: "Competitors", path: "/onboarding/competitors" },
  { id: "analysis", label: "Analysis", path: "/onboarding/analysis" },
  { id: "complete", label: "Complete", path: "/onboarding/complete" },
];

interface Competitor {
  name: string;
  url: string;
  logo?: string | null;
}

const LOADING_MESSAGES = [
  "Analyzing AI visibility...",
  "Fetching competitor data...",
  "Running inference models...",
  "Identifying market leaders...",
  "Scanning industry landscape...",
];

export default function CompetitorsOnboarding() {
  const navigate = useNavigate();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingLogos, setFetchingLogos] = useState<Set<number>>(new Set());

  useEffect(() => {
    const data = getOnboardingData();
    if (!data.topics || data.topics.length === 0) {
      navigate("/onboarding/topics");
      return;
    }

    // Always generate competitors fresh from the scraped summary
    // This ensures we get real-time generation based on the website content
    console.log("Competitors page loaded, generating competitors from summary:", data.summary?.substring(0, 100));
    generateCompetitors();
  }, [navigate]);

  const generateCompetitors = async () => {
    try {
      const data = getOnboardingData();
      if (!data.summary) {
        toast.error("Please complete the description step first");
        navigate("/onboarding/description");
        return;
      }

      console.log("Calling generate-competitors with summary:", data.summary.substring(0, 100));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/auth");
        return;
      }

      toast.info("Generating competitors...");
      
      const { data: response, error } = await supabase.functions.invoke("generate-competitors", {
        body: { brandSummary: data.summary },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("Generate competitors response:", { response, error });

      if (error) {
        console.error("Function invoke error:", error);
        throw error;
      }

      if (response?.error) {
        console.error("Function returned error:", response.error);
        toast.error(response.error || "Failed to generate competitors");
        setCompetitors([]);
        return;
      }

      let generatedCompetitors = response.competitors || [];
      console.log("Generated competitors (raw):", generatedCompetitors);
      
      // Frontend validation: Filter out any fake/placeholder competitors that slipped through
      const placeholderPatterns = [
        /competitor\s*\d+/i,
        /^competitor\s*\d*$/i,  // Exact match
        /example\s*(company|brand|competitor)/i,
        /test\s*(company|brand|competitor)/i,
        /sample\s*(company|brand|competitor)/i,
        /placeholder/i,
      ];

      const fakeDomainPatterns = [
        /competitor\d+\.com/i,
        /competitor\d+\./i,  // Match competitor1.anything
        /^competitor\d+$/i,  // Match just "competitor1"
        /example\.com/i,
        /test\.com/i,
        /sample\.com/i,
      ];

      generatedCompetitors = generatedCompetitors.filter((c: Competitor) => {
        if (!c.name || !c.url) {
          console.warn(`Filtered out: Missing name or URL`, c);
          return false;
        }
        
        const name = c.name.toLowerCase().trim();
        const url = c.url.toLowerCase().trim();
        
        // Check name patterns
        for (const pattern of placeholderPatterns) {
          if (pattern.test(name)) {
            console.warn(`Filtered out placeholder competitor: "${c.name}"`);
            return false;
          }
        }
        
        // Exact match check for "competitor" or "competitor 1"
        if (name === "competitor" || name.match(/^competitor\s*\d*$/)) {
          console.warn(`Filtered out generic competitor name: "${c.name}"`);
          return false;
        }
        
        // Check URL patterns
        for (const pattern of fakeDomainPatterns) {
          if (pattern.test(url)) {
            console.warn(`Filtered out fake domain: "${c.url}"`);
            return false;
          }
        }
        
        // Reject if URL contains "competitor" + number
        if (url.match(/competitor\d+/i) || url.match(/competitor\s*\d+/i)) {
          console.warn(`Filtered out competitor URL with number: "${c.url}"`);
          return false;
        }
        
        // Reject generic competitor URLs
        if (url === "competitor" || url === "competitor.com" || url.match(/^https?:\/\/competitor\.com/)) {
          console.warn(`Filtered out generic competitor URL: "${c.url}"`);
          return false;
        }
        
        return true;
      });
      
      console.log("Generated competitors (filtered):", generatedCompetitors);
      
      if (generatedCompetitors.length === 0) {
        toast.info("No valid competitors found. You can add them manually.");
        setCompetitors([]);
      } else {
        toast.success(`Found ${generatedCompetitors.length} competitors`);
        // Double-check all competitors are valid before fetching logos
        const validCompetitors = generatedCompetitors.filter((c: Competitor) => {
          if (!c.name || !c.url) return false;
          const name = c.name.toLowerCase().trim();
          const url = c.url.toLowerCase().trim();
          
          // Final validation before setting state
          if (name.match(/^competitor\s*\d*$/) || name === "competitor") {
            console.warn(`Final filter: Rejecting "${c.name}"`);
            return false;
          }
          if (url.match(/competitor\d+/i) || url === "competitor.com" || url.match(/^https?:\/\/competitor\.com/)) {
            console.warn(`Final filter: Rejecting URL "${c.url}"`);
            return false;
          }
          return true;
        });
        
        if (validCompetitors.length === 0) {
          toast.info("No valid competitors found after filtering. You can add them manually.");
          setCompetitors([]);
        } else {
          toast.success(`Generated ${validCompetitors.length} competitors`);
          // Fetch logos for valid competitors only
          const competitorsWithLogos: Competitor[] = validCompetitors.map((c: Competitor) => ({
            ...c,
            logo: null,
          }));
          setCompetitors(competitorsWithLogos);
          
          // Fetch logos in background
          fetchLogosForCompetitors(competitorsWithLogos);
        }
      }
    } catch (error: any) {
      console.error("Error generating competitors:", error);
      toast.error(error.message || "Failed to generate competitors. Check Edge Function logs.");
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogosForCompetitors = useCallback(async (competitorsList: Competitor[]) => {
    // Filter out fake competitors before fetching logos
    const validCompetitors = competitorsList.filter((c) => {
      if (!c.name || !c.url) return false;
      const name = c.name.toLowerCase().trim();
      const url = c.url.toLowerCase().trim();
      
      // Reject fake competitors
      if (name.match(/^competitor\s*\d*$/) || name === "competitor") {
        console.warn(`Skipping logo fetch for fake competitor: "${c.name}"`);
        return false;
      }
      if (url.match(/competitor\d+/i) || url === "competitor.com" || url.match(/^https?:\/\/competitor\.com/)) {
        console.warn(`Skipping logo fetch for fake URL: "${c.url}"`);
        return false;
      }
      return true;
    });
    
    if (validCompetitors.length === 0) {
      console.log("No valid competitors to fetch logos for");
      return;
    }
    
    // Fetch logos in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < validCompetitors.length; i += batchSize) {
      const batch = validCompetitors.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (competitor, batchIndex) => {
          // Find the index in the original list
          const globalIndex = competitorsList.findIndex(c => c.url === competitor.url && c.name === competitor.name);
          if (globalIndex === -1) return;
          
          if (competitor.url && !competitor.logo) {
            setFetchingLogos((prev) => new Set(prev).add(globalIndex));
            try {
              const logo = await fetchWebsiteLogo(competitor.url);
              if (logo) { // Only update if logo was fetched successfully
                setCompetitors((prev) => {
                  const updated = [...prev];
                  if (updated[globalIndex]) {
                    updated[globalIndex] = { ...updated[globalIndex], logo };
                  }
                  return updated;
                });
              }
            } catch (error) {
              console.error(`Error fetching logo for ${competitor.url}:`, error);
            } finally {
              setFetchingLogos((prev) => {
                const newSet = new Set(prev);
                newSet.delete(globalIndex);
                return newSet;
              });
            }
          }
        })
      );
      // Small delay between batches
      if (i + batchSize < validCompetitors.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }, []);

  const handleUrlChange = async (url: string) => {
    setNewCompetitorUrl(url);
    
    // Auto-fetch logo when URL is pasted/entered
    if (url.trim() && (url.startsWith("http://") || url.startsWith("https://"))) {
      try {
        const logo = await fetchWebsiteLogo(url);
        // Store temporarily - will be used when competitor is added
        // We'll fetch it again when adding, but this gives immediate feedback
      } catch (error) {
        // Silent fail - logo fetching is optional
      }
    }
  };

  const addCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      toast.error("Please enter a competitor name");
      return;
    }

    const url = newCompetitorUrl.trim() || `https://${newCompetitorName.toLowerCase().replace(/\s+/g, "")}.com`;
    const newCompetitor: Competitor = {
      name: newCompetitorName.trim(),
      url,
      logo: null,
    };
    
    setCompetitors([...competitors, newCompetitor]);
    setNewCompetitorName("");
    setNewCompetitorUrl("");
    
    // Fetch logo for the newly added competitor
    const index = competitors.length;
    setFetchingLogos((prev) => new Set(prev).add(index));
    try {
      const logo = await fetchWebsiteLogo(url);
      setCompetitors((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], logo };
        }
        return updated;
      });
    } catch (error) {
      console.error(`Error fetching logo for ${url}:`, error);
    } finally {
      setFetchingLogos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    saveOnboardingData({ competitors });
    navigate("/onboarding/analysis");
  };

  const handleBack = () => {
    navigate("/onboarding/topics");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OnboardingStepper
        steps={STEPS}
        currentStep="competitors"
        completedSteps={["website", "description", "topics"]}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-3xl p-8 border border-gray-200 bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Your Competitors</h1>
            <p className="text-gray-600">
              Track up to 20 competitors to monitor your relative AI visibility
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                <Loader2 className="h-12 w-12 animate-spin text-gray-900 relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <AnimatedText
                  texts={LOADING_MESSAGES}
                  className="text-lg font-medium text-gray-900"
                  typingSpeed={80}
                  deletingSpeed={40}
                  pauseDuration={1500}
                />
                <p className="text-sm text-gray-500 mt-4">
                  This may take a few moments...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-2 flex-1">
                    <div className="relative flex-1">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Competitor name"
                        value={newCompetitorName}
                        onChange={(e) => setNewCompetitorName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCompetitor()}
                        className="pl-10 h-11"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="www.example.com (optional)"
                        value={newCompetitorUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addCompetitor()}
                        onPaste={(e) => {
                          const pastedText = e.clipboardData.getData("text");
                          if (pastedText) {
                            setTimeout(() => handleUrlChange(pastedText), 100);
                          }
                        }}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">
                      {competitors.length}/20
                    </span>
                    <Button 
                      onClick={addCompetitor} 
                      disabled={competitors.length >= 20}
                      className="bg-gray-900 text-white hover:bg-gray-800 h-11 w-11 p-0 flex-shrink-0"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-[500px] overflow-y-auto">
                {competitors.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">No competitors added yet. Add your first competitor above.</p>
                  </div>
                ) : (
                  competitors.map((competitor, index) => {
                    const isFetchingLogo = fetchingLogos.has(index);
                    return (
                      <Card
                        key={index}
                        className="p-4 border border-gray-200 bg-white hover:shadow-md transition-all group relative"
                      >
                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompetitor(index)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        {/* Logo */}
                        <div className="flex-shrink-0 mb-3">
                          {isFetchingLogo ? (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
                              <Globe className="h-6 w-6 text-gray-400" />
                            </div>
                          ) : competitor.logo ? (
                            <img
                              src={competitor.logo}
                              alt={competitor.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const fallback = document.createElement("div");
                                fallback.className = "w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center";
                                fallback.innerHTML = `<svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>`;
                                target.parentElement?.appendChild(fallback);
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Globe className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Competitor Info */}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate mb-1">{competitor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{competitor.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
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
                >
                  Continue to Analysis
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

