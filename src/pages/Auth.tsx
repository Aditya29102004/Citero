import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Home, TrendingUp } from "lucide-react";
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
      // Otherwise, go to pricing page
      navigate("/pricing");
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
          redirectTo: `${window.location.origin}/auth?redirect=/pricing`,
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
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-white items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <img 
            src="/Untitled design.png" 
            alt={isLogin ? "Welcome back" : "Join unifr"}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-gray-900" />
            <span className="text-2xl font-bold text-gray-900">unifr</span>
          </div>
          
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-3xl font-bold text-center text-gray-900">
                {isLogin ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                {isLogin
                  ? "Enter your credentials to access your dashboard"
                  : "Enter your details to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Google Login Button */}
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                variant="outline"
                className="w-full h-11 border-gray-300 hover:bg-gray-50 font-medium"
              >
                {googleLoading ? (
                  "Connecting..."
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                </div>
              </div>

              {(emailSent || searchParams.get("verify") === "true") && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        {searchParams.get("verify") === "true" 
                          ? "Email verification required"
                          : "Verification email sent!"}
                      </p>
                      <p className="text-sm text-blue-700 mb-3">
                        Please check your inbox and click the verification link to activate your account.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Resend verification email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium" 
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isLogin ? "Sign In" : "Sign Up")}
                </Button>
              </form>
              <div className="pt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* Home link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
