import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User } from "lucide-react";

interface FounderNote {
  id: string;
  brand_review: string;
  action_steps: string;
  created_at: string;
  updated_at: string;
}

const FoundersNoteView = () => {
  const navigate = useNavigate();
  const { brandId } = useParams<{ brandId?: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || "");
  const [founderNote, setFounderNote] = useState<FounderNote | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);

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
    if (selectedBrandId && session?.user?.id) {
      fetchFounderNote();
    } else {
      setFounderNote(null);
    }
  }, [selectedBrandId, session]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name")
      .eq("user_id", session?.user?.id)
      .order("name");

    if (data && data.length > 0) {
      setBrands(data);
      if (!selectedBrandId) {
        setSelectedBrandId(data[0].id);
      }
    }
  };

  const fetchFounderNote = async () => {
    if (!selectedBrandId || !session?.user?.id) return;

    setLoadingNote(true);
    try {
      const { data, error } = await supabase
        .from("founder_notes")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching founder note:", error);
      }

      setFounderNote(data || null);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingNote(false);
    }
  };

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
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600" />
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Founder's Note</h1>
                <p className="text-gray-600">Personal guidance from the founder on your brand journey</p>
              </div>

              {brands.length > 0 && (
                <div className="mb-6">
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger className="w-[250px]">
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

              {loadingNote ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-600" />
                  <p className="text-gray-600 mt-4">Loading founder's note...</p>
                </Card>
              ) : !selectedBrandId ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <p className="text-gray-600">Please select a brand to view the founder's note</p>
                </Card>
              ) : !founderNote ? (
                <Card className="p-12 text-center border border-gray-200 bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Founder's Note Yet
                  </h3>
                  <p className="text-gray-600">
                    A personalized note from the founder will appear here once it's been written for {selectedBrand?.name}.
                  </p>
                </Card>
              ) : (
                <Card className="p-8 border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                  {/* Founder Header */}
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div className="p-3 bg-gray-900 rounded-full">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">A Personal Note from the Founder</h2>
                      <p className="text-sm text-gray-600">
                        Written specifically for {selectedBrand?.name}
                      </p>
                    </div>
                  </div>

                  {/* Brand Review */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-gray-900 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Brand Review
                      </h3>
                    </div>
                    <div className="pl-4">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {founderNote.brand_review}
                      </p>
                    </div>
                  </div>

                  {/* Action Steps */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-gray-900 rounded-full"></div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Recommended Action Steps
                      </h3>
                    </div>
                    <div className="pl-4">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {founderNote.action_steps}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(founderNote.updated_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default FoundersNoteView;

