import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserSubscriptionLimits } from "@/lib/subscriptionLimits";
import { toast } from "sonner";

export const HomeHeader = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setUser(session?.user);
      
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

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      setUser(session?.user);
      
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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
      window.location.reload(); // Reload to clear all state
    }
  };

  return (
    <header className={`fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 transition-all duration-300 ${isScrolled ? 'border-b border-gray-200' : ''}`} 
            style={{ boxShadow: isScrolled ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none' }}>
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
            <button
              onClick={() => navigate("/pricing")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate("/blog")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Blog
            </button>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {hasSubscription && (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate("/dashboard")}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                    >
                      Dashboard
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => navigate("/profile")}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                Sign in
              </Button>
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
              <button
                onClick={() => {
                  navigate("/pricing");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  navigate("/blog");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 text-left"
              >
                Blog
              </button>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                FAQ
              </a>
              <div className="flex flex-col gap-2 pt-2">
                {isLoggedIn ? (
                  <>
                    {hasSubscription && (
                      <>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate("/dashboard");
                            setMobileMenuOpen(false);
                          }}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                          Dashboard
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => {
                            navigate("/profile");
                            setMobileMenuOpen(false);
                          }}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate("/auth");
                      setMobileMenuOpen(false);
                    }}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  >
                    Login
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

