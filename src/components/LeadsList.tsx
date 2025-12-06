import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, Briefcase, MessageSquare, RefreshCw, Users } from "lucide-react";

interface PeopleMention {
  id: string;
  name: string | null;
  role: string | null;
  company: string | null;
  relevance: string;
  snippet: string;
  created_at: string;
  scan_id: string;
}

interface LeadsListProps {
  brandId: string;
  limit?: number;
}

export const LeadsList = ({ brandId, limit = 10 }: LeadsListProps) => {
  const [people, setPeople] = useState<PeopleMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchLeads();
  }, [brandId]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      console.log(`[LeadsList] Fetching leads for brand_id: ${brandId}`);
      
      // First, check if table exists and has any data at all
      const { count: totalCount } = await supabase
        .from("ai_people_mentions")
        .select("*", { count: 'exact', head: true });
      
      console.log(`[LeadsList] Total people mentions in database: ${totalCount || 0}`);
      
      // Fetch people mentions
      const { data: peopleData, error: peopleError } = await supabase
        .from("ai_people_mentions")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(limit * 2); // Fetch more to account for deduplication

      if (peopleError) {
        console.error("[LeadsList] Error fetching people:", peopleError);
        console.error("[LeadsList] Error details:", JSON.stringify(peopleError, null, 2));
        setPeople([]);
        setLoading(false);
        return;
      }

      console.log(`[LeadsList] Raw data fetched:`, peopleData?.length || 0, "records");
      
      if (!peopleData || peopleData.length === 0) {
        console.log(`[LeadsList] No people found for brand_id: ${brandId}`);
        // Check if there are any people for other brands
        const { data: allPeople } = await supabase
          .from("ai_people_mentions")
          .select("brand_id")
          .limit(5);
        console.log(`[LeadsList] Sample brand_ids in database:`, allPeople?.map(p => p.brand_id) || []);
        setPeople([]);
        setLoading(false);
        return;
      }
      
      console.log(`[LeadsList] Fetched ${peopleData.length} people mentions from database`);
      console.log(`[LeadsList] Sample data:`, peopleData.slice(0, 2));

      // Deduplicate by name-role-company combination
      const uniqueMap = new Map<string, PeopleMention>();
      const counts: Record<string, number> = {};

      peopleData.forEach((person) => {
        const key = `${person.name || ""}-${person.role || ""}-${person.company || ""}`.toLowerCase().trim();
        
        if (key) {
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
      const uniquePeople = Array.from(uniqueMap.values()).slice(0, limit);
      setPeople(uniquePeople);
      console.log(`Displaying ${uniquePeople.length} unique leads`);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>New Leads</CardTitle>
          <CardDescription>People mentioned in AI scan responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (people.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>New Leads</CardTitle>
              <CardDescription>People mentioned in AI scan responses</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLeads}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leads found yet.</p>
            <p className="text-sm mt-2">Run a GEO scan to discover people mentioned in AI responses.</p>
            <p className="text-xs mt-2 text-gray-400">
              Check browser console (F12) for debugging info
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              New Leads
            </CardTitle>
            <CardDescription>People mentioned in AI scan responses</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLeads}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {people.map((person) => {
            const key = `${person.name || ""}-${person.role || ""}-${person.company || ""}`.toLowerCase().trim();
            const mentionCount = mentionCounts[key] || 1;
            
            return (
              <div
                key={person.id}
                className="group p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="flex items-center gap-2 mb-2">
                      {person.name ? (
                        <h4 className="font-bold text-base text-gray-900 group-hover:text-primary transition-colors">
                          {person.name}
                        </h4>
                      ) : (
                        <h4 className="font-semibold text-base text-gray-600 italic">
                          Unknown Person
                        </h4>
                      )}
                      {mentionCount > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {mentionCount}x
                        </Badge>
                      )}
                    </div>

                    {/* Role and Company */}
                    <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-600">
                      {person.role && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span className="font-medium">{person.role}</span>
                        </div>
                      )}
                      {person.company && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="font-medium">{person.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Relevance */}
                    {person.relevance && (
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                        {person.relevance}
                      </p>
                    )}

                    {/* Snippet */}
                    {person.snippet && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-500 italic line-clamp-2">
                            "{person.snippet}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

