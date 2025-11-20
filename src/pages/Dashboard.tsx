import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BrandList } from "@/components/BrandList";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndPayment = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user has active subscription
      const { data: activeSubscriptions, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1);

      if (subError && subError.code !== 'PGRST116') {
        console.error("Error checking subscription:", subError);
      }

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const activeSubscription = activeSubscriptions[0];
        const periodEnd = new Date(activeSubscription.current_period_end);
        const now = new Date();
        
        if (periodEnd <= now) {
          // Subscription expired, redirect to payment
          navigate("/payment");
          return;
        }
      } else {
        // No active subscription, redirect to payment
        navigate("/payment");
        return;
      }

      setSession(session);
      setLoading(false);
    };

    checkAuthAndPayment();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check subscription on auth state change
      const { data: activeSubscriptions, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1);

      if (subError && subError.code !== 'PGRST116') {
        console.error("Error checking subscription:", subError);
      }

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        navigate("/payment");
        return;
      }

      const activeSubscription = activeSubscriptions[0];
      const periodEnd = new Date(activeSubscription.current_period_end);
      const now = new Date();
      
      if (periodEnd <= now) {
        navigate("/payment");
        return;
      }

      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50/50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
              <BrandList />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
