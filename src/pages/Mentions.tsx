import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MentionsTable } from "@/components/MentionsTable";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Mentions = () => {
  const navigate = useNavigate();
  const { brandId } = useParams<{ brandId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (brandId && session) {
      fetchBrandName();
    }
  }, [brandId, session]);

  const fetchBrandName = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .eq("id", brandId)
        .single();

      if (error) throw error;
      setBrandName(data.name);
    } catch (error: any) {
      toast.error("Failed to load brand information");
    }
  };

  const handleRefresh = async () => {
    if (!brandName) return;
    
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('refresh-mentions', {
        body: { brandName },
      });

      if (error) throw error;
      
      toast.success(data.message || "Mentions refreshed successfully!");
      
      // Trigger a refresh of the mentions table
      window.dispatchEvent(new CustomEvent('refresh-mentions'));
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast.error(error.message || "Failed to refresh mentions");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session || !brandId) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Mentions for {brandName}</h2>
                  <p className="text-muted-foreground">
                    Track and analyze brand mentions across sources
                  </p>
                </div>
                <Button onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Mentions
                </Button>
              </div>
            </div>

            <MentionsTable brandId={brandId} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Mentions;
