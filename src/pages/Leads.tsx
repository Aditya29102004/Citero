import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, Briefcase, MessageSquare, RefreshCw, Users, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getUserSubscriptionLimits } from "@/lib/subscriptionLimits";

interface PeopleMention {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  relevance: string;
  snippet: string;
  created_at: string;
  scan_id: string;
  brand_id: string;
}

const Leads = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionVerified, setSubscriptionVerified] = useState(false);
  const [people, setPeople] = useState<PeopleMention[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({});
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCompany, setFilterCompany] = useState<string>("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkSubscription(session.user.id);
        fetchBrands(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkSubscription = async (userId: string) => {
    try {
      const limits = await getUserSubscriptionLimits(userId);
      if (limits.planType === null) {
        navigate("/pricing");
        return;
      }
      setSubscriptionVerified(true);
    } catch (error) {
      console.error("Error checking subscription:", error);
      navigate("/pricing");
    }
  };

  const fetchBrands = async (userId: string) => {
    const { data: brandsData } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (brandsData && brandsData.length > 0) {
      setBrands(brandsData);
      if (!selectedBrandId) {
        setSelectedBrandId(brandsData[0].id);
      }
    }
  };

  useEffect(() => {
    if (selectedBrandId) {
      fetchLeads();
    }
  }, [selectedBrandId, filterRole, filterCompany]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log(`[Leads] Fetching leads for brand_id: ${selectedBrandId}`);
      
      // Fetch people mentions
      let query = supabase
        .from("ai_people_mentions")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: peopleData, error: peopleError } = await query;

      if (peopleError) {
        console.error("[Leads] Error fetching people:", peopleError);
        setPeople([]);
        setLoading(false);
        return;
      }

      console.log(`[Leads] Raw data fetched:`, peopleData?.length || 0, "records");
      
      if (!peopleData || peopleData.length === 0) {
        console.log(`[Leads] No people found for brand_id: ${selectedBrandId}`);
        setPeople([]);
        setLoading(false);
        return;
      }

      // Apply filters
      let filtered = peopleData;
      if (filterRole !== "all") {
        filtered = filtered.filter(p => p.role?.toLowerCase().includes(filterRole.toLowerCase()));
      }
      if (filterCompany !== "all") {
        filtered = filtered.filter(p => p.company?.toLowerCase().includes(filterCompany.toLowerCase()));
      }

      // Deduplicate by name-role-company combination
      const uniqueMap = new Map<string, PeopleMention>();
      const counts: Record<string, number> = {};

      filtered.forEach((person) => {
        const key = `${person.name || ""}-${person.role || ""}-${person.company || ""}`.toLowerCase().trim();
        
        if (key && key !== "--") {
          // Count mentions
          if (!counts[key]) {
            counts[key] = 0;
          }
          counts[key]++;

          // Keep the most recent mention
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, person);
          } else {
            const existing = uniqueMap.get(key)!;
            if (new Date(person.created_at) > new Date(existing.created_at)) {
              uniqueMap.set(key, person);
            }
          }
        }
      });

      setMentionCounts(counts);
      const uniquePeople = Array.from(uniqueMap.values());
      setPeople(uniquePeople);
      console.log(`[Leads] Displaying ${uniquePeople.length} unique leads`);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique roles and companies for filters
  const uniqueRoles = Array.from(new Set(people.map(p => p.role).filter(Boolean))).sort();
  const uniqueCompanies = Array.from(new Set(people.map(p => p.company).filter(Boolean))).sort();

  if (!subscriptionVerified || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50/50 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Loading leads...</p>
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
          <main className="flex-1 overflow-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-10">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
                <p className="text-gray-600">People mentioned in AI scan responses</p>
              </div>

              {/* Filters */}
              <Card className="mb-6 border border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="brand-select" className="text-sm font-medium mb-2 block">
                        Brand
                      </Label>
                      <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
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
                    <div>
                      <Label htmlFor="role-filter" className="text-sm font-medium mb-2 block">
                        Role
                      </Label>
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="All roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {uniqueRoles.map((role) => (
                            <SelectItem key={role} value={role || ""}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="company-filter" className="text-sm font-medium mb-2 block">
                        Company
                      </Label>
                      <Select value={filterCompany} onValueChange={setFilterCompany}>
                        <SelectTrigger>
                          <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Companies</SelectItem>
                          {uniqueCompanies.map((company) => (
                            <SelectItem key={company} value={company || ""}>
                              {company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchLeads}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                    <span className="text-sm text-gray-600">
                      {people.length} {people.length === 1 ? 'lead' : 'leads'} found
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Leads List */}
              {people.length === 0 ? (
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-gray-600 mb-2">No leads found</p>
                      <p className="text-sm text-gray-500">
                        {selectedBrandId 
                          ? "Run a GEO scan to discover people mentioned in AI responses."
                          : "Select a brand to view leads."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {people.map((person) => {
                    const key = `${person.name || ""}-${person.role || ""}-${person.company || ""}`.toLowerCase().trim();
                    const mentionCount = mentionCounts[key] || 1;
                    
                    return (
                      <Card
                        key={person.id}
                        className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Name */}
                              <div className="flex items-center gap-2 mb-3">
                                {person.name ? (
                                  <h3 className="font-bold text-lg text-gray-900">
                                    {person.name}
                                  </h3>
                                ) : (
                                  <h3 className="font-semibold text-lg text-gray-600 italic">
                                    Unknown Person
                                  </h3>
                                )}
                                {mentionCount > 1 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {mentionCount}x
                                  </Badge>
                                )}
                              </div>

                              {/* Role and Company */}
                              <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-gray-600">
                                {person.role && (
                                  <div className="flex items-center gap-1.5">
                                    <Briefcase className="h-4 w-4" />
                                    <span className="font-medium">{person.role}</span>
                                  </div>
                                )}
                                {person.company && (
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4" />
                                    <span className="font-medium">{person.company}</span>
                                  </div>
                                )}
                              </div>

                              {/* Relevance */}
                              {person.relevance && (
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                  {person.relevance}
                                </p>
                              )}

                              {/* Snippet */}
                              {person.snippet && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-500 italic">
                                      "{person.snippet}"
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Leads;

