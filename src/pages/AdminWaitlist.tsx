import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Calendar, MessageSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaitlistEntry {
  id: string;
  email: string;
  plan: 'basic' | 'pro' | 'enterprise';
  comments: string | null;
  created_at: string;
  updated_at: string;
}

const AdminWaitlist = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (session) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, email")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const adminStatus = data?.is_admin === true || data?.email === 'admin@citero.com';
      setIsAdmin(adminStatus);

      if (adminStatus) {
        fetchWaitlist();
      } else {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast.error("Error checking admin status");
    }
  };

  const fetchWaitlist = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaitlistEntries((data || []) as WaitlistEntry[]);
    } catch (error: any) {
      console.error("Error fetching waitlist:", error);
      toast.error(error.message || "Failed to fetch waitlist entries");
    } finally {
      setFetching(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Email", "Plan", "Comments", "Created At"];
    const rows = waitlistEntries.map(entry => [
      entry.email,
      entry.plan,
      entry.comments || "",
      new Date(entry.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Waitlist exported to CSV");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  const planColors = {
    basic: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    enterprise: "bg-gray-900 text-white"
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Waitlist Management</h1>
                  <p className="text-gray-600 mt-1">
                    {waitlistEntries.length} {waitlistEntries.length === 1 ? 'entry' : 'entries'} total
                  </p>
                </div>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={waitlistEntries.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {fetching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : waitlistEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">No waitlist entries yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {waitlistEntries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Mail className="h-5 w-5 text-gray-400" />
                              <CardTitle className="text-lg">{entry.email}</CardTitle>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                              <Badge className={planColors[entry.plan]}>
                                {entry.plan.charAt(0).toUpperCase() + entry.plan.slice(1)}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-4 w-4" />
                                {new Date(entry.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {entry.comments && (
                        <CardContent>
                          <div className="flex items-start gap-2 pt-2 border-t">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600">{entry.comments}</p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminWaitlist;

