import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-6 lg:px-8">
        <SidebarTrigger className="text-gray-600 hover:text-gray-900 transition-colors" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>
    </header>
  );
}
