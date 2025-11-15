import { Home, LogOut, GitCompare, Users } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

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

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
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
    <Sidebar>
      <SidebarHeader className="border-b border-gray-200/80 px-6 py-5">
        <h2 className="text-xl font-bold text-teal-600 tracking-tight">unifr</h2>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="mb-6">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  isActive={location.pathname === "/dashboard"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/compare")}
                  isActive={location.pathname === "/compare"}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <GitCompare className="h-4 w-4" />
                  <span>Compare Brands</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup className="mb-6">
            <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/admin/waitlist")}
                    isActive={location.pathname === "/admin/waitlist"}
                    className="rounded-lg px-3 py-2.5 transition-all duration-200"
                  >
                    <Users className="h-4 w-4" />
                    <span>Waitlist</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup className="mt-auto pt-4 border-t border-gray-200/80">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
