import { Home, LogOut, GitCompare, Users, FileText, Search, TrendingUp, BarChart3, MessageSquare, BookOpen, Settings, ChevronLeft, ChevronRight, Zap, PenTool, UserCog, UserPlus, Lock } from "lucide-react";
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
          setIsAdmin(data.is_admin === true || data.email === 'admin@citero.com');
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

  const handleItemClick = (path: string, label: string) => {
    if (!hasSubscription && path !== "/dashboard") {
      toast.info(`"${label}" is a premium feature. Subscribe to unlock!`, {
        action: {
          label: "View Pricing",
          onClick: () => navigate("/pricing"),
        },
      });
      navigate("/pricing");
      return;
    }
    navigate(path);
  };

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
    <Sidebar className={`border-r-0 ${collapsed ? "w-16" : ""}`} style={{ "--sidebar-background": "#F5F5F5" } as React.CSSProperties}>
      <SidebarHeader className="px-5 py-4 pb-2">
        <div className="flex items-center justify-between">
          {!collapsed && <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">citero</h2>}
          {collapsed && <div className="w-6 h-6 bg-gray-900 rounded"></div>}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-0 gap-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Analytics Section */}
        <SidebarGroup className="p-0 m-0">
          <SidebarGroupLabel className="px-3 mb-1 mt-2 !h-auto text-[13px] font-medium text-gray-500 capitalize tracking-normal bg-transparent">
            {!collapsed && "Analytics"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  isActive={location.pathname === "/dashboard"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <Home className="h-4 w-4" />
                  {!collapsed && <span>Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/brands", "Brands")}
                  isActive={location.pathname === "/brands"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <FileText className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Brands</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/competitors", "Competitors")}
                  isActive={location.pathname === "/competitors"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <GitCompare className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Competitors</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/sentiment", "Sentiment")}
                  isActive={location.pathname === "/sentiment"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <TrendingUp className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Sentiment</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/sources", "Sources")}
                  isActive={location.pathname === "/sources"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <BarChart3 className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Sources</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Action Section */}
        <SidebarGroup className="p-0 m-0">
          <SidebarGroupLabel className="px-3 mb-1 mt-2 !h-auto text-[13px] font-medium text-gray-500 capitalize tracking-normal bg-transparent">
            {!collapsed && "Action"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/blogs", "Blogs")}
                  isActive={location.pathname === "/blogs"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <FileText className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Blogs</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/audits", "Audits")}
                  isActive={location.pathname === "/audits"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <Search className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Audits</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/prompts", "Prompt Simulator")}
                  isActive={location.pathname === "/prompts"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <Zap className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Prompt Simulator</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
 
        {/* Team Section */}
        <SidebarGroup className="p-0 m-0">
          <SidebarGroupLabel className="px-3 mb-1 mt-2 !h-auto text-[13px] font-medium text-gray-500 capitalize tracking-normal bg-transparent">
            {!collapsed && "Team"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/team", "Team Members")}
                  isActive={location.pathname === "/team"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <Users className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Team Members</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section (if admin) */}
        {isAdmin && (
          <SidebarGroup className="mb-3">
            <SidebarGroupLabel className="px-3 mb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/waitlist")}
                    isActive={location.pathname === "/admin/waitlist"}
                    className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                  >
                    <Users className="h-4 w-4" />
                    {!collapsed && <span>Waitlist</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/founders-note")}
                    isActive={location.pathname === "/admin/founders-note"}
                    className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                  >
                    <PenTool className="h-4 w-4" />
                    {!collapsed && <span>Founder's Note</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/users")}
                    isActive={location.pathname === "/admin/users"}
                    className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
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
        <SidebarGroup className="p-0 m-0">
          <SidebarGroupLabel className="px-3 mb-1 mt-2 !h-auto text-[13px] font-medium text-gray-500 capitalize tracking-normal bg-transparent">
            {!collapsed && "Guidance"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/founders-note", "Founder's Note")}
                  isActive={location.pathname === "/founders-note"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <MessageSquare className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Founder's Note</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* System Section */}
        <SidebarGroup className="p-0 m-0 mt-2 mb-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setCollapsed(!collapsed)}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  {!collapsed && <span>Collapse</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick("/settings", "Settings")}
                  isActive={location.pathname === "/settings"}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <Settings className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Settings</span>
                      {!hasSubscription && <Lock className="h-3 w-3 text-gray-400 ml-2" />}
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="!h-[34px] !py-1.5 !px-3 rounded-lg transition-all duration-200 text-[12px] font-medium text-[#555555] hover:bg-[#EBEBEB] hover:text-gray-900 data-[active=true]:bg-[#EAEAEA] data-[active=true]:text-gray-900 data-[active=true]:font-bold [&>svg]:size-[16px] [&>svg]:stroke-[1.5px] [&>svg]:mr-2 [&>svg]:text-[#555555] data-[active=true]:[&>svg]:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
