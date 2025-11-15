import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export const LandingHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            unifr
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
};
