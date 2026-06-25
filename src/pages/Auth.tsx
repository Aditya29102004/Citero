import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { ensureProfile } from "@/lib/ensureProfile";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      // If there's a redirect URL, use it
      if (redirectTo) {
        navigate(redirectTo);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/pricing");
        return;
      }

      // Check if user has completed onboarding
      const { checkOnboardingComplete } = await import("@/lib/onboardingState");
      const onboardingComplete = await checkOnboardingComplete();

      if (!onboardingComplete) {
        // User hasn't completed onboarding - redirect to onboarding
        navigate("/onboarding/website", { replace: true });
        return;
      }

      // User has completed onboarding - check subscription status
      const { getUserSubscriptionLimits } = await import("@/lib/subscriptionLimits");
      const limits = await getUserSubscriptionLimits(session.user.id);
      
      // Go directly to dashboard for demo preview
      navigate("/dashboard", { replace: true });
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleRedirect();
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Ensure profile exists when user logs in
        await ensureProfile(
          session.user.id,
          session.user.email || undefined,
          session.user.user_metadata?.full_name || undefined
        );
        await handleRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Check if email is verified (skip for OAuth providers)
        if (data.user && !data.user.email_confirmed_at && data.user.app_metadata?.provider === 'email') {
          await supabase.auth.signOut();
          toast.error("Please verify your email address before logging in. Check your inbox for the verification link.");
          setEmailSent(true);
          setIsLogin(false);
          setLoading(false);
          return;
        }
        
        toast.success("Welcome back!");
      } else {
        if (!name.trim()) {
          toast.error("Please enter your name");
          setLoading(false);
          return;
        }
        
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verified=true`,
            data: {
              full_name: name.trim(),
            },
          },
        });
        if (error) throw error;
        
        // Check if email verification is required
        if (data.user && !data.session) {
          // Email verification required
          setEmailSent(true);
          toast.success("Verification email sent! Please check your inbox.");
          return;
        }
        
        // If session exists, user is already verified (shouldn't happen normally)
        if (data.user && data.session) {
          // Ensure profile exists
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: data.user.id,
                email: data.user.email || email,
                name: name.trim(),
              },
              {
                onConflict: 'id',
              }
            );
          
          if (profileError) {
            console.error("Error creating/updating profile:", profileError);
          }
          
          toast.success("Account created successfully!");
          
          // Redirect new user to onboarding
          navigate("/onboarding/website", { replace: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect to auth page, which will check onboarding and redirect appropriately
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  // Check if user needs to verify email or just verified
  useEffect(() => {
    const verified = searchParams.get("verified");
    const verify = searchParams.get("verify");
    
    if (verified === "true") {
      toast.success("Email verified successfully! You can now log in.");
      setIsLogin(true);
      setEmailSent(false);
    }
    
    if (verify === "true") {
      toast.error("Please verify your email address. Check your inbox for the verification link.");
      setEmailSent(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side - Premium Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-white flex-col justify-between p-12 relative overflow-hidden">

        {/* Platform Showcase Mockup */}
        <div className="relative w-full max-w-[520px] mx-auto z-10 my-auto py-12">
          <div className="rounded-2xl bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.03)]">
            <img 
              src="/auth-showcase.png" 
              alt="Citero platform mockup" 
              className="w-full h-auto rounded-xl object-contain"
            />
          </div>
        </div>

        {/* Client Quote / Social Proof Footer */}
        <div className="relative z-10 max-w-sm">
          <p className="text-sm font-normal text-slate-500 leading-relaxed italic">
            "Citero has completely changed how we track organic citations. Our team saves dozens of hours weekly while scaling AI search visibility."
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
              E
            </div>
            <p className="text-xs font-semibold text-slate-700">Emily R. Head of Growth</p>
          </div>
        </div>
      </div>

      {/* Right Side - Sleek Login Form */}
      <div className="w-full lg:w-[55%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative bg-white">

        {/* Center Auth Container */}
        <div className="my-auto py-8 w-full max-w-[360px] mx-auto space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight font-display">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              {isLogin
                ? "Enter your credentials to access your brand dashboard."
                : "Enter your details to start scaling your AI search visibility."}
            </p>
          </div>

          <div className="space-y-5">
            {/* Google OAuth button */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              variant="outline"
              className="w-full h-11 border-slate-200 hover:bg-slate-50/50 font-medium text-sm text-slate-700 transition-all duration-200 rounded-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              {googleLoading ? (
                "Connecting..."
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2.5 text-slate-400 font-medium tracking-wider">Or continue with email</span>
              </div>
            </div>

            {(emailSent || searchParams.get("verify") === "true") && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-blue-900 leading-tight">
                      {searchParams.get("verify") === "true" 
                        ? "Email verification required"
                        : "Verification email sent!"}
                    </p>
                    <p className="text-xs text-blue-700/80 leading-relaxed">
                      Please check your inbox and click the verification link to activate your account.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline block pt-1"
                    >
                      Resend verification email
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-700 font-medium text-xs">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="h-10.5 rounded-xl border-slate-200/80 bg-slate-50/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 text-sm placeholder:text-slate-400 transition-all"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-medium text-xs">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10.5 rounded-xl border-slate-200/80 bg-slate-50/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 text-sm placeholder:text-slate-400 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700 font-medium text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10.5 rounded-xl border-slate-200/80 bg-slate-50/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 text-sm placeholder:text-slate-400 transition-all"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-sm shadow-slate-950/10 mt-2" 
                disabled={loading}
              >
                {loading ? "Loading..." : (isLogin ? "Sign In" : "Sign Up")}
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Footer Column */}
        <div className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Citero. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Auth;
