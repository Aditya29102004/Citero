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
import { Loader2, Users, Mail, Calendar, LogIn, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  is_admin: boolean | null;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        fetchUsers();
      } else {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast.error("Error checking admin status");
    }
  };

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        toast.error("No active session");
        setFetching(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/fetch-all-users`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setFetching(false);
    }
  };

  const handleImpersonate = async (targetUserId: string, targetEmail: string | null) => {
    try {
      if (!targetEmail) {
        toast.error("User email not found");
        return;
      }

      // Call the edge function to get impersonation session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        toast.error("No active session");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/impersonate-user`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to impersonate user");
      }

      if (result.magicLink) {
        // Store current session info to restore later
        localStorage.setItem('admin_session', JSON.stringify({
          userId: currentSession.user.id,
          accessToken: currentSession.access_token,
          refreshToken: currentSession.refresh_token,
        }));

        // Open magic link in same window to switch user
        toast.success(`Switching to ${targetEmail}...`);
        window.location.href = result.magicLink;
      } else {
        toast.error("Failed to generate login link");
      }
    } catch (error: any) {
      console.error("Error impersonating user:", error);
      toast.error(error.message || "Failed to impersonate user");
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage all user accounts. Click "Login As" to view their dashboard.
                  <br />
                  <span className="text-xs text-amber-600 mt-1 block">
                    Note: After logging in as a user, you'll need to log out and log back in as admin to return to admin mode.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by email, name, or user ID..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {fetching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery ? "No users found matching your search." : "No users found."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {user.email || "No email"}
                            </span>
                            {user.is_admin && (
                              <Badge variant="default" className="bg-blue-500">
                                Admin
                              </Badge>
                            )}
                          </div>
                          {user.name && (
                            <div className="text-sm text-gray-600 ml-7 mb-1">
                              {user.name}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 ml-7">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <span className="font-mono text-xs">
                              {user.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleImpersonate(user.id, user.email)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <LogIn className="h-4 w-4" />
                            Login As
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Total users: {users.length} {searchQuery && `(${filteredUsers.length} filtered)`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default UserManagement;

