import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const navigate = useNavigate();
  
  return (
    <header className="border-b border-gray-200/80 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex h-20 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center">
          <SidebarTrigger className="text-gray-600 hover:text-gray-900 transition-colors" />
          <div className="ml-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Brand Tracker</h1>
            <p className="text-sm text-gray-500 mt-1 font-normal">
              Manage and track your favorite brands
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>
    </header>
  );
}
