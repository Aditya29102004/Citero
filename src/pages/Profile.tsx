import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, User, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          navigate("/auth");
          return;
        }

        setUser(session.user);
        setEmail(session.user.email || "");

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
        }

        setProfile(profileData);
        setName(profileData?.name || session.user.user_metadata?.full_name || "");
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        navigate("/auth");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50/50">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
              <div className="flex min-h-screen items-center justify-center p-4">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                  <p className="text-gray-600 font-medium">Loading profile...</p>
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
      <div className="flex min-h-screen w-full bg-gray-50/50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8 lg:py-12">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 mt-2">Manage your account settings</p>
              </div>

              <div className="grid gap-6">
                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account Information
                    </CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {name && (
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <Input
                            id="name"
                            type="text"
                            value={name}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Account Created</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Subscription Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>Your current subscription status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SubscriptionInfo userId={user?.id} />
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      onClick={handleLogout}
                      className="w-full sm:w-auto"
                    >
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const SubscriptionInfo = ({ userId }: { userId?: string }) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching subscription:", error);
        }

        setSubscription(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading subscription info...</p>;
  }

  if (!subscription) {
    return (
      <div>
        <p className="text-sm text-gray-600 mb-4">No active subscription</p>
        <Button onClick={() => window.location.href = "/#pricing"}>
          View Plans
        </Button>
      </div>
    );
  }

  const periodEnd = new Date(subscription.current_period_end);
  const isExpired = periodEnd < new Date();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Plan</span>
        <span className="text-sm text-gray-900 capitalize">{subscription.plan_type}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
          {isExpired ? 'Expired' : 'Active'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Period End</span>
        <span className="text-sm text-gray-600">
          {periodEnd.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      {isExpired && (
        <Button onClick={() => window.location.href = "/#pricing"} className="mt-4">
          Renew Subscription
        </Button>
      )}
    </div>
  );
};

export default Profile;

