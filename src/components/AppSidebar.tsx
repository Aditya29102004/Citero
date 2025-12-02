import { Home, LogOut, GitCompare, Users, FileText, Search, TrendingUp, BarChart3, MessageSquare, BookOpen, Settings, ChevronLeft, ChevronRight, Zap, PenTool, UserCog } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getUserSubscriptionLimits } from "@/lib/subscriptionLimits";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, email")
          .eq("id", session.user.id)
          .single();
        
        if (data) {
          setIsAdmin(data.is_admin === true || data.email === 'admin@unifr.com');
        }
      }
    };

    const checkSubscriptionStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const subscriptionLimits = await getUserSubscriptionLimits(session.user.id);
          setHasSubscription(subscriptionLimits.planType !== null);
        } catch (error) {
          console.error("Error checking subscription status:", error);
          setHasSubscription(false);
        }
      } else {
        setHasSubscription(false);
      }
    };

    checkAdminStatus();
    checkSubscriptionStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
      checkSubscriptionStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  return (
    <Sidebar className={collapsed ? "w-16" : ""}>
      <SidebarHeader className="border-b border-gray-200/80 px-6 py-5">
        <div className="flex items-center justify-between">
          {!collapsed && <h2 className="text-xl font-bold text-gray-900 tracking-tight">unifr</h2>}
          {collapsed && <div className="w-6 h-6 bg-gray-900 rounded"></div>}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        {/* Analytics Section */}
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {!collapsed && "Analytics"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/brands")}
                  isActive={location.pathname === "/brands"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <FileText className="h-4 w-4" />
                  {!collapsed && <span>Brands</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasSubscription && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/dashboard")}
                    isActive={location.pathname === "/dashboard"}
                    className="rounded-lg px-3 py-2.5 transition-all duration-200"
                  >
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/competitors")}
                  isActive={location.pathname === "/competitors"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <GitCompare className="h-4 w-4" />
                  {!collapsed && <span>Competitors</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/sentiment")}
                  isActive={location.pathname === "/sentiment"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <TrendingUp className="h-4 w-4" />
                  {!collapsed && <span>Sentiment</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/sources")}
                  isActive={location.pathname === "/sources"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <BarChart3 className="h-4 w-4" />
                  {!collapsed && <span>Sources</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Action Section */}
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {!collapsed && "Action"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/blogs")}
                  isActive={location.pathname === "/blogs"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <FileText className="h-4 w-4" />
                  {!collapsed && <span>Blogs</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/audits")}
                  isActive={location.pathname === "/audits"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <Search className="h-4 w-4" />
                  {!collapsed && <span>Audits</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/prompts")}
                  isActive={location.pathname === "/prompts"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <Zap className="h-4 w-4" />
                  {!collapsed && <span>Prompt Simulator</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team Section */}
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {!collapsed && "Team"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/team")}
                  isActive={location.pathname === "/team"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  {!collapsed && <span>Team Members</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section (if admin) */}
        {isAdmin && (
          <SidebarGroup className="mb-6">
            <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/waitlist")}
                    isActive={location.pathname === "/admin/waitlist"}
                    className="rounded-lg px-3 py-2.5 transition-all duration-200"
                  >
                    <Users className="h-4 w-4" />
                    {!collapsed && <span>Waitlist</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/founders-note")}
                    isActive={location.pathname === "/admin/founders-note"}
                    className="rounded-lg px-3 py-2.5 transition-all duration-200"
                  >
                    <PenTool className="h-4 w-4" />
                    {!collapsed && <span>Founder's Note</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/users")}
                    isActive={location.pathname === "/admin/users"}
                    className="rounded-lg px-3 py-2.5 transition-all duration-200"
                  >
                    <UserCog className="h-4 w-4" />
                    {!collapsed && <span>Users</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Founder's Note Section (for all users) */}
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {!collapsed && "Guidance"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/founders-note")}
                  isActive={location.pathname === "/founders-note"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <MessageSquare className="h-4 w-4" />
                  {!collapsed && <span>Founder's Note</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-gray-200/80 px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-lg px-3 py-2.5 transition-all duration-200"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/settings")}
              isActive={location.pathname === "/settings"}
              className="rounded-lg px-3 py-2.5 transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate("/knowledge-base")}
              isActive={location.pathname === "/knowledge-base"}
              className="rounded-lg px-3 py-2.5 transition-all duration-200"
            >
              <BookOpen className="h-4 w-4" />
              {!collapsed && <span>Knowledge Base</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="rounded-lg px-3 py-2.5 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
