import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Mail, Crown } from "lucide-react";
import { toast } from "sonner";
import { getUserSubscriptionLimits } from "@/lib/subscriptionLimits";

const Team = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null);

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
      fetchTeamMembers();
      fetchSubscriptionLimits();
    }
  }, [session]);

  const fetchSubscriptionLimits = async () => {
    if (!session?.user?.id) return;
    const limits = await getUserSubscriptionLimits(session.user.id);
    setSubscriptionLimits(limits);
  };

  const fetchTeamMembers = async () => {
    // Placeholder - create team_members table later
    // For now, show current user
    if (session?.user) {
      setTeamMembers([{
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'You',
        role: 'Owner',
        isOwner: true,
      }]);
    }
  };

  const handleInviteMember = () => {
    if (subscriptionLimits?.seatsAllowed && teamMembers.length >= subscriptionLimits.seatsAllowed) {
      toast.error(`You've reached your plan limit of ${subscriptionLimits.seatsAllowed} team members.`);
      return;
    }
    toast.info("Team invitation feature coming soon!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Members</h1>
                  <p className="text-gray-600">
                    Manage your team members
                    {subscriptionLimits?.seatsAllowed && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({teamMembers.length} / {subscriptionLimits.seatsAllowed} seats used)
                      </span>
                    )}
                  </p>
                </div>
                <Button 
                  onClick={handleInviteMember} 
                  className="bg-gray-900 text-white hover:bg-gray-800"
                  disabled={subscriptionLimits?.seatsAllowed && teamMembers.length >= subscriptionLimits.seatsAllowed}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>

              {teamMembers.length === 0 ? (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No team members yet.</p>
                  <Button onClick={handleInviteMember} variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Your First Member
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-6 border border-gray-200 bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{member.name}</h3>
                              {member.isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{member.role}</span>
                        {!member.isOwner && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            Remove
                          </Button>
                        )}
                      </div>
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

export default Team;

