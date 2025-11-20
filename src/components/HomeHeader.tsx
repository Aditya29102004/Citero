import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const HomeHeader = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setUser(session?.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md z-50 transition-shadow duration-300" 
            style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
      <div className="max-w-7xl mx-auto px-3 lg:px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <div className="p-1.5 bg-gray-900 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              unifr
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Button 
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => navigate("/profile")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    alert("⚠️ Website Under Construction\n\nPlease do not attempt to login at this time. Thank you for your patience!");
                  }}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => {
                    const waitlistSection = document.getElementById('waitlist');
                    waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-6"
                >
                  Join Waitlist
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-2">
                {isLoggedIn ? (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate("/dashboard")}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      Dashboard
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate("/profile")}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        alert("⚠️ Website Under Construction\n\nPlease do not attempt to login at this time. Thank you for your patience!");
                      }}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      Login
                    </Button>
                    <Button 
                      onClick={() => {
                        const waitlistSection = document.getElementById('waitlist');
                        waitlistSection?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      Join Waitlist
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

