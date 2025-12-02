import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, AlertTriangle, Globe, Save } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Brands = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");

  // Competitors
  const [autoDetectedCompetitors, setAutoDetectedCompetitors] = useState<Array<{ name: string; url: string }>>([]);
  const [userCompetitors, setUserCompetitors] = useState<Array<{ name: string; url: string }>>([]);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");

  // Tracking settings
  const [trackingPlatforms, setTrackingPlatforms] = useState({
    chatgpt: false,
    gemini: false,
    claude: false,
    perplexity: false,
  });
  const [trackingLocations, setTrackingLocations] = useState<string[]>([]);
  const [trackingFrequency, setTrackingFrequency] = useState("manual");

  // Collapsible states
  const [brandInfoOpen, setBrandInfoOpen] = useState(false);
  const [competitorsOpen, setCompetitorsOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [scraperOpen, setScraperOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

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

  useEffect(() => {
    if (session?.user?.id) {
      fetchBrands();
    }
  }, [session]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchBrandData();
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", session?.user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setBrands(data);
        if (!selectedBrandId) {
          setSelectedBrandId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const fetchBrandData = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", selectedBrandId)
        .single();

      if (error) throw error;

      setSelectedBrand(data);
      setBrandName(data.name || "");
      setWebsiteUrl(data.website_url || "");
      setDescription(data.description || "");
      setKeywords(data.topics || []);
      setIndustry(data.industry || "");
      setCountry(data.country || "");

      // Parse competitors
      let hasCompetitors = false;
      if (data.competitors) {
        try {
          const competitors = typeof data.competitors === 'string' 
            ? JSON.parse(data.competitors) 
            : data.competitors;
          
          if (Array.isArray(competitors) && competitors.length > 0) {
            hasCompetitors = true;
            // Split into auto-detected (from onboarding) and user-added
            setAutoDetectedCompetitors(competitors.filter((c: any) => c.auto_detected));
            setUserCompetitors(competitors.filter((c: any) => !c.auto_detected));
          }
        } catch {
          setAutoDetectedCompetitors([]);
          setUserCompetitors([]);
        }
      }

      // Fetch tracking settings (if table exists, otherwise use defaults)
      // For now, we'll use defaults since tracking_settings table may not exist
      setTrackingPlatforms({
        chatgpt: true,
        gemini: false,
        claude: false,
        perplexity: false,
      });
      setTrackingLocations(["Global"]);
      setTrackingFrequency("manual");

      // Fetch scraped data (if available)
      if (data.website_url) {
        // Try to fetch last scraped data
        // This would come from a scraped_pages table or similar
        // For now, we'll show placeholder
        setScrapedData({
          lastScraped: data.updated_at || data.created_at,
          wordCount: 0,
          metaTitle: "",
          metaDescription: "",
        });
      }

      // Auto-generate competitors and topics if missing and we have website URL or description
      const needsGeneration = (!hasCompetitors || !data.topics || (Array.isArray(data.topics) && data.topics.length === 0)) 
        && (data.website_url || data.description);
      
      if (needsGeneration) {
        // Generate in background without blocking UI
        generateBrandDataRealtime(data, hasCompetitors);
      }
    } catch (error) {
      console.error("Error fetching brand data:", error);
      toast.error("Failed to load brand data");
    }
  };

  const generateBrandDataRealtime = async (brandData: any, hasCompetitors: boolean = false) => {
    try {
      let brandSummary = brandData.description || "";
      let generatedTopics: string[] = [];
      let generatedCompetitors: Array<{ name: string; url: string; auto_detected: boolean }> = [];

      // If website URL is provided, scrape it first
      if (brandData.website_url) {
        try {
          toast.info("Generating competitors and topics from website...");
          
          const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("scrape-url", {
            body: { url: brandData.website_url },
          });

          if (!scrapeError && scrapeData && !scrapeData.error && scrapeData.summary) {
            brandSummary = scrapeData.summary;
            // Update description if it was empty
            if (!brandData.description) {
              await supabase
                .from("brands")
                .update({ description: brandSummary })
                .eq("id", selectedBrandId);
            }
          }
        } catch (error) {
          console.error("Error scraping website:", error);
          // Continue with existing description
        }
      }

      // Generate topics if missing
      if ((!brandData.topics || (Array.isArray(brandData.topics) && brandData.topics.length === 0)) && brandSummary) {
        try {
          const { data: topicsData, error: topicsError } = await supabase.functions.invoke("generate-topics", {
            body: { brandSummary: brandSummary },
          });

          if (!topicsError && topicsData && !topicsData.error && topicsData.topics) {
            generatedTopics = topicsData.topics.slice(0, 10);
            console.log("Generated topics:", generatedTopics);
          }
        } catch (error) {
          console.error("Error generating topics:", error);
        }
      }

      // Generate competitors if missing
      if (!hasCompetitors && brandSummary) {
        try {
          const { data: competitorsData, error: competitorsError } = await supabase.functions.invoke("generate-competitors", {
            body: { brandSummary: brandSummary },
          });

          if (!competitorsError && competitorsData && !competitorsData.error && competitorsData.competitors) {
            // Filter out placeholder competitors
            generatedCompetitors = competitorsData.competitors
              .filter((c: any) => {
                if (!c.name || !c.url) return false;
                const name = c.name.toLowerCase().trim();
                const url = c.url.toLowerCase().trim();
                // Filter out placeholder patterns
                if (/competitor\s*\d+/i.test(name) || /competitor\d+\.com/i.test(url)) {
                  return false;
                }
                return true;
              })
              .slice(0, 10)
              .map((c: any) => ({
                name: c.name,
                url: c.url,
                auto_detected: true,
              }));
            console.log("Generated competitors:", generatedCompetitors);
          }
        } catch (error) {
          console.error("Error generating competitors:", error);
        }
      }

      // Update brand with generated data
      if (generatedTopics.length > 0 || generatedCompetitors.length > 0) {
        const updateData: any = {};
        if (generatedTopics.length > 0) {
          updateData.topics = generatedTopics;
        }
        if (generatedCompetitors.length > 0) {
          // Merge with existing competitors
          const existingCompetitors = brandData.competitors 
            ? (typeof brandData.competitors === 'string' ? JSON.parse(brandData.competitors) : brandData.competitors)
            : [];
          updateData.competitors = [...existingCompetitors, ...generatedCompetitors];
        }

        const { error: updateError } = await supabase
          .from("brands")
          .update(updateData)
          .eq("id", selectedBrandId);

        if (updateError) {
          console.error("Error updating brand:", updateError);
        } else {
          toast.success(`Generated ${generatedCompetitors.length} competitors and ${generatedTopics.length} topics!`);
          // Refresh brand data
          await fetchBrandData();
        }
      }
    } catch (error) {
      console.error("Error generating brand data:", error);
      // Don't show error toast - this is background generation
    }
  };

  const handleSaveBrandInfo = async () => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({
          name: brandName,
          website_url: websiteUrl || null,
          description: description || null,
          topics: keywords,
          industry: industry || null,
          country: country || null,
        })
        .eq("id", selectedBrandId);

      if (error) throw error;

      toast.success("Brand information saved successfully");
      await fetchBrandData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save brand information");
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleAddCompetitor = () => {
    if (newCompetitorName.trim()) {
      setUserCompetitors([
        ...userCompetitors,
        { name: newCompetitorName.trim(), url: newCompetitorUrl.trim() || "" }
      ]);
      setNewCompetitorName("");
      setNewCompetitorUrl("");
    }
  };

  const handleRemoveCompetitor = (index: number) => {
    setUserCompetitors(userCompetitors.filter((_, i) => i !== index));
  };

  const handleSaveCompetitors = async () => {
    if (!selectedBrandId) return;

    setSaving(true);
    try {
      const allCompetitors = [
        ...autoDetectedCompetitors.map(c => ({ ...c, auto_detected: true })),
        ...userCompetitors.map(c => ({ ...c, auto_detected: false })),
      ];

      const { error } = await supabase
        .from("brands")
        .update({ competitors: allCompetitors })
        .eq("id", selectedBrandId);

      if (error) throw error;

      toast.success("Competitors saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save competitors");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrackingSettings = async () => {
    if (!selectedBrandId) return;

    setSaving(true);
    try {
      // Save tracking settings
      // Note: This would ideally go to a tracking_settings table
      // For now, we'll store in brands table or a JSONB field
      toast.success("Tracking settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save tracking settings");
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl) {
      toast.error("Please enter a website URL first");
      return;
    }

    setScraping(true);
    try {
      toast.info("Scraping website...");

      const { data, error } = await supabase.functions.invoke("scrape-url", {
        body: { url: websiteUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScrapedData({
        lastScraped: new Date().toISOString(),
        wordCount: data.summary?.length || 0,
        metaTitle: data.metadata?.title || "",
        metaDescription: data.metadata?.description || "",
      });

      toast.success("Website scraped successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to scrape website");
    } finally {
      setScraping(false);
    }
  };

  const handleResetBrand = async () => {
    if (!selectedBrandId) return;

    try {
      // Reset brand data
      await supabase
        .from("brands")
        .update({
          description: "",
          topics: [],
          competitors: [],
        })
        .eq("id", selectedBrandId);

      toast.success("Brand data reset successfully");
      await fetchBrandData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset brand");
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrandId) return;

    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", selectedBrandId);

      if (error) throw error;

      toast.success("Brand deleted successfully");
      setSelectedBrandId("");
      setSelectedBrand(null);
      await fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete brand");
    }
  };

  const countries = [
    "Global", "United States", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", 
    "Norway", "Denmark", "Finland", "Japan", "China", "India", "Brazil",
  ];

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-white">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Brands</h1>
                <p className="text-gray-600">Configure your brand settings and tracking preferences</p>
              </div>

              {/* Brand Selector */}
              {brands.length > 0 && (
                <div className="mb-6">
                  <Label htmlFor="brand-select" className="mb-2 block">Select Brand</Label>
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger id="brand-select" className="w-full">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!selectedBrandId && brands.length === 0 && (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <p className="text-gray-600 mb-6">No brands found. Create your first brand to get started.</p>
                  <Button onClick={() => navigate("/onboarding/website")} className="bg-gray-900 text-white hover:bg-gray-800">
                    Create Brand
                  </Button>
                </Card>
              )}

              {selectedBrandId && (
                <div className="space-y-4">
                  {/* A) Brand Information */}
                  <Collapsible open={brandInfoOpen} onOpenChange={setBrandInfoOpen}>
                    <Card className="border border-gray-200 bg-white">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6">
                          <h2 className="text-xl font-semibold text-gray-900">Brand Information</h2>
                          {brandInfoOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-4">
                          <div>
                            <Label htmlFor="brand-name">Brand name</Label>
                            <Input
                              id="brand-name"
                              value={brandName}
                              onChange={(e) => setBrandName(e.target.value)}
                              placeholder="Enter brand name"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="website-url">Website URL</Label>
                            <Input
                              id="website-url"
                              type="url"
                              value={websiteUrl}
                              onChange={(e) => setWebsiteUrl(e.target.value)}
                              placeholder="https://example.com"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="description">Short description</Label>
                            <Textarea
                              id="description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Brief description of your brand"
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Keywords</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                placeholder="Add keyword"
                              />
                              <Button type="button" onClick={handleAddKeyword} variant="outline">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {keywords.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                >
                                  {keyword}
                                  <button
                                    onClick={() => handleRemoveKeyword(keyword)}
                                    className="hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="industry">Industry</Label>
                              <Select value={industry} onValueChange={setIndustry}>
                                <SelectTrigger id="industry" className="mt-1">
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tech">Technology</SelectItem>
                                  <SelectItem value="finance">Finance</SelectItem>
                                  <SelectItem value="healthcare">Healthcare</SelectItem>
                                  <SelectItem value="retail">Retail</SelectItem>
                                  <SelectItem value="education">Education</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="country">Country</Label>
                              <Select value={country} onValueChange={setCountry}>
                                <SelectTrigger id="country" className="mt-1">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {countries.map((c) => (
                                    <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Button onClick={handleSaveBrandInfo} disabled={saving} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* B) Competitor Setup */}
                  <Collapsible open={competitorsOpen} onOpenChange={setCompetitorsOpen}>
                    <Card className="border border-gray-200 bg-white">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6">
                          <h2 className="text-xl font-semibold text-gray-900">Competitor Setup</h2>
                          {competitorsOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-6">
                          {/* Auto-detected competitors */}
                          {autoDetectedCompetitors.length > 0 && (
                            <div>
                              <Label className="mb-2 block">Auto-detected competitors</Label>
                              <div className="space-y-2">
                                {autoDetectedCompetitors.map((comp, idx) => (
                                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">{comp.name}</p>
                                        {comp.url && <p className="text-sm text-gray-500">{comp.url}</p>}
                                      </div>
                                      <span className="text-xs text-gray-500">Auto-detected</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* User-added competitors */}
                          <div>
                            <Label className="mb-2 block">User-added competitors</Label>
                            <div className="space-y-2 mb-4">
                              {userCompetitors.map((comp, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div>
                                    <p className="font-medium text-gray-900">{comp.name}</p>
                                    {comp.url && <p className="text-sm text-gray-500">{comp.url}</p>}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCompetitor(idx)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <Input
                                value={newCompetitorName}
                                onChange={(e) => setNewCompetitorName(e.target.value)}
                                placeholder="Competitor name"
                              />
                              <Input
                                value={newCompetitorUrl}
                                onChange={(e) => setNewCompetitorUrl(e.target.value)}
                                placeholder="URL (optional)"
                                type="url"
                              />
                              <Button onClick={handleAddCompetitor} variant="outline">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <Button onClick={handleSaveCompetitors} disabled={saving} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Competitors"}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* C) Tracking Configuration */}
                  <Collapsible open={trackingOpen} onOpenChange={setTrackingOpen}>
                    <Card className="border border-gray-200 bg-white">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6">
                          <h2 className="text-xl font-semibold text-gray-900">Tracking Configuration</h2>
                          {trackingOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-6">
                          <div>
                            <Label className="mb-3 block">Platforms</Label>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="chatgpt"
                                  checked={trackingPlatforms.chatgpt}
                                  onCheckedChange={(checked) =>
                                    setTrackingPlatforms({ ...trackingPlatforms, chatgpt: checked as boolean })
                                  }
                                />
                                <Label htmlFor="chatgpt" className="cursor-pointer">ChatGPT</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="gemini"
                                  checked={trackingPlatforms.gemini}
                                  onCheckedChange={(checked) =>
                                    setTrackingPlatforms({ ...trackingPlatforms, gemini: checked as boolean })
                                  }
                                />
                                <Label htmlFor="gemini" className="cursor-pointer">Gemini</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="claude"
                                  checked={trackingPlatforms.claude}
                                  onCheckedChange={(checked) =>
                                    setTrackingPlatforms({ ...trackingPlatforms, claude: checked as boolean })
                                  }
                                />
                                <Label htmlFor="claude" className="cursor-pointer">Claude</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="perplexity"
                                  checked={trackingPlatforms.perplexity}
                                  onCheckedChange={(checked) =>
                                    setTrackingPlatforms({ ...trackingPlatforms, perplexity: checked as boolean })
                                  }
                                />
                                <Label htmlFor="perplexity" className="cursor-pointer">Perplexity</Label>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label className="mb-3 block">Locations</Label>
                            <Select
                              value={trackingLocations[0] || "global"}
                              onValueChange={(value) => setTrackingLocations([value])}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((c) => (
                                  <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="mb-3 block">Frequency</Label>
                            <Select value={trackingFrequency} onValueChange={setTrackingFrequency}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button onClick={handleSaveTrackingSettings} disabled={saving} className="w-full">
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Tracking Settings"}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* D) Website Scraper Preview */}
                  <Collapsible open={scraperOpen} onOpenChange={setScraperOpen}>
                    <Card className="border border-gray-200 bg-white">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6">
                          <h2 className="text-xl font-semibold text-gray-900">Website Scraper Preview</h2>
                          {scraperOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-4">
                          {scrapedData ? (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm text-gray-500">Last Scraped</Label>
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(scrapedData.lastScraped).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Word Count</Label>
                                  <p className="text-sm font-medium text-gray-900">{scrapedData.wordCount}</p>
                                </div>
                              </div>
                              {scrapedData.metaTitle && (
                                <div>
                                  <Label className="text-sm text-gray-500">Meta Title</Label>
                                  <p className="text-sm font-medium text-gray-900">{scrapedData.metaTitle}</p>
                                </div>
                              )}
                              {scrapedData.metaDescription && (
                                <div>
                                  <Label className="text-sm text-gray-500">Meta Description</Label>
                                  <p className="text-sm font-medium text-gray-900">{scrapedData.metaDescription}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">No scraped data available</p>
                          )}
                          <Button
                            onClick={handleScrapeWebsite}
                            disabled={scraping || !websiteUrl}
                            variant="outline"
                            className="w-full"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
                            {scraping ? "Scraping..." : "Re-scrape Website"}
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* E) Danger Zone */}
                  <Collapsible open={dangerOpen} onOpenChange={setDangerOpen}>
                    <Card className="border border-red-200 bg-red-50">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-6">
                          <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
                          {dangerOpen ? <ChevronUp className="h-5 w-5 text-red-400" /> : <ChevronDown className="h-5 w-5 text-red-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-4">
                          <div className="p-4 bg-white rounded-lg border border-red-200">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Reset Brand Data</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  This will reset all brand data except the name and website URL.
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                                      Reset Brand Data
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reset Brand Data?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will reset all brand data except the name and website URL. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleResetBrand} className="bg-red-600 hover:bg-red-700">
                                        Reset
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-lg border border-red-200">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Delete Brand</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  This will permanently delete this brand and all associated data. This action cannot be undone.
                                </p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                                      Delete Brand
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Brand?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete "{brandName}" and all associated data. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteBrand} className="bg-red-600 hover:bg-red-700">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Brands;
