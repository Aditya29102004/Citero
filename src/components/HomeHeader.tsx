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
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        setIsLoggedIn(!!session);
        setUser(session?.user);
        
        if (session) {
          // Check subscription asynchronously without blocking UI
          // Use a timeout to prevent hanging
          Promise.race([
            getUserSubscriptionLimits(session.user.id),
            new Promise<{ planType: null }>((resolve) => 
              setTimeout(() => resolve({ planType: null }), 3000)
            )
          ])
            .then((subscriptionLimits) => {
              if (isMounted) {
                setHasSubscription(subscriptionLimits.planType !== null);
              }
            })
            .catch((error) => {
              console.error("Error checking subscription status:", error);
              if (isMounted) {
                setHasSubscription(false);
              }
            });
        } else {
          setHasSubscription(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        if (isMounted) {
          setIsLoggedIn(false);
          setHasSubscription(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      
      setIsLoggedIn(!!session);
      setUser(session?.user);
      
      if (session) {
        // Check subscription asynchronously without blocking UI
        // Use a timeout to prevent hanging
        Promise.race([
          getUserSubscriptionLimits(session.user.id),
          new Promise<{ planType: null }>((resolve) => 
            setTimeout(() => resolve({ planType: null }), 3000)
          )
        ])
          .then((subscriptionLimits) => {
            if (isMounted) {
              setHasSubscription(subscriptionLimits.planType !== null);
            }
          })
          .catch((error) => {
            console.error("Error checking subscription status:", error);
            if (isMounted) {
              setHasSubscription(false);
            }
          });
      } else {
        setHasSubscription(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Check if there's an active session before signing out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Only try to sign out if there's an active session
        const { error } = await supabase.auth.signOut();
        if (error) {
          // If signOut fails, still clear local state and redirect
          console.warn("Sign out error (but clearing local state):", error);
        }
      } else {
        // No session exists, just clear local state
        console.log("No active session found, clearing local state");
      }
      
      // Always clear local state and redirect, regardless of signOut result
      setIsLoggedIn(false);
      setHasSubscription(false);
      
      // Clear any local storage/auth data
      try {
        localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
      } catch (storageError) {
        // Ignore storage errors
      }
      
      toast.success("Signed out successfully");
      navigate("/", { replace: true });
      
      // Small delay before reload to ensure navigation happens
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err: any) {
      // Even if there's an error, clear local state and redirect
      console.error("Logout error:", err);
      
      // Check if it's a session missing error - this is actually fine
      if (err?.message?.includes('Auth session missing') || err?.name === 'AuthSessionMissingError') {
        console.log("Session already missing, proceeding with logout");
      }
      
      setIsLoggedIn(false);
      setHasSubscription(false);
      
      // Clear local storage
      try {
        localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
      } catch (storageError) {
        // Ignore storage errors
      }
      
      navigate("/", { replace: true });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <header className={`fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 transition-all duration-300 ${isScrolled ? 'border-b border-gray-200' : ''}`} 
            style={{ boxShadow: isScrolled ? '0 1px 3px 0 rgba(0, 0, 0, 0.05)' : 'none' }}>
      <div className="max-w-7xl mx-auto px-3 lg:px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <img src="/logo.svg" alt="citero logo" className="w-8 h-8 rounded-lg object-contain drop-shadow-sm" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              citero
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer bg-transparent border-none"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate("/blog")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer bg-transparent border-none"
            >
              Blog
            </button>
            <button
              type="button"
              onClick={() => navigate("/feedback")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer bg-transparent border-none"
            >
              Feedback
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
                  type="button"
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer"
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
              <button
                type="button"
                onClick={() => {
                  navigate("/pricing");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 text-left cursor-pointer bg-transparent border-none w-full text-left"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/blog");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 text-left cursor-pointer bg-transparent border-none w-full text-left"
              >
                Blog
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/feedback");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 text-left cursor-pointer bg-transparent border-none w-full text-left"
              >
                Feedback
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
                      type="button"
                      variant="ghost"
                      onClick={(e) => {
                        handleLogout(e);
                        setMobileMenuOpen(false);
                      }}
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer"
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

