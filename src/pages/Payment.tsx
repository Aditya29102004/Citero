import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Shield, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Plan mapping - maps plan types to subscription plan identifiers
const PLAN_CONFIGS: Record<string, { name: string; price: number; description: string; planKey: string }> = {
  basic_normal: {
    name: "Basic Plan",
    price: 8900,
    description: "50 AI prompt scans/month, 3 competitor comparisons, 5 top source insights",
    planKey: "basic_normal",
  },
  pro_normal: {
    name: "Pro Plan",
    price: 14999,
    description: "200 AI scans/month, 10 competitor benchmarks, Advanced GEO insights",
    planKey: "pro_normal",
  },
  basic_founder: {
    name: "Basic Plan (Founder Circle)",
    price: 4400,
    description: "50 AI prompt scans/month, 3 competitor comparisons, 5 top source insights - Founder Circle pricing",
    planKey: "basic_founder",
  },
  pro_founder: {
    name: "Pro Plan (Founder Circle)",
    price: 6999,
    description: "200 AI scans/month, 10 competitor benchmarks, Advanced GEO insights - Founder Circle pricing",
    planKey: "pro_founder",
  },
};

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planType = searchParams.get("plan") as keyof typeof PLAN_CONFIGS | null;
  
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed">("pending");
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    setCheckingAuth(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initiateSubscription = async () => {
    if (!planType || !PLAN_CONFIGS[planType]) {
      setError("Invalid plan selected");
      return;
    }

    if (!razorpayLoaded) {
      setError("Payment gateway is loading. Please wait...");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const currentUrl = window.location.pathname + window.location.search;
        navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // Create subscription via Edge Function
      console.log("Calling create-subscription Edge Function with plan:", PLAN_CONFIGS[planType].planKey);
      
      const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke(
        "create-subscription",
        {
          body: { plan: PLAN_CONFIGS[planType].planKey },
        }
      );

      console.log("Edge Function response:", { subscriptionData, subscriptionError });
      console.log("Full subscriptionData:", JSON.stringify(subscriptionData, null, 2));

      if (subscriptionError) {
        console.error("Edge Function error:", subscriptionError);
        throw subscriptionError;
      }

      if (subscriptionData?.error) {
        console.error("Edge Function returned error:", subscriptionData.error);
        throw new Error(subscriptionData.error);
      }

      if (!subscriptionData?.subscription && !subscriptionData?.success) {
        console.error("No subscription data in response:", subscriptionData);
        throw new Error("Failed to create subscription. Please try again.");
      }

      // Handle both response formats
      const subscription = subscriptionData?.subscription || subscriptionData;
      const keyId = subscriptionData?.keyId || razorpayKeyId;
      
      console.log("Using subscription:", subscription);
      console.log("Using keyId:", keyId);

      // Get Razorpay Key ID from environment or use the one from response
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || keyId;

      if (!razorpayKeyId) {
        throw new Error("Razorpay Key ID not configured");
      }

      // Initialize Razorpay subscription checkout
      const options = {
        key: razorpayKeyId,
        subscription_id: subscription.id,
        name: "Unifr Subscription",
        description: PLAN_CONFIGS[planType].name,
        prefill: {
          email: session.user.email || "",
          name: session.user.user_metadata?.full_name || "",
        },
        theme: {
          color: "#675FFF",
        },
        handler: async function (razorpayResponse: any) {
          // Subscription activated - notify backend
          console.log("Razorpay payment success response:", razorpayResponse);
          console.log("Response type:", typeof razorpayResponse);
          console.log("Response keys:", Object.keys(razorpayResponse || {}));
          console.log("razorpay_subscription_id:", razorpayResponse?.razorpay_subscription_id);
          console.log("subscription_id:", razorpayResponse?.subscription_id);
          
          // Store the subscription ID from the created subscription as fallback
          const subscriptionIdFromCreated = subscription.id;
          console.log("Subscription ID from created subscription:", subscriptionIdFromCreated);
          
          try {
            // Get the current session to pass auth token
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
              throw new Error("No active session");
            }
            
            // Prepare the body with subscription ID fallback
            const requestBody = {
              ...razorpayResponse,
              // Add subscription_id if not present
              razorpay_subscription_id: razorpayResponse?.razorpay_subscription_id || subscriptionIdFromCreated,
              subscription_id: razorpayResponse?.subscription_id || subscriptionIdFromCreated,
            };
            
            console.log("Sending to subscription-success:", requestBody);
            
            const { data: successData, error: successError } = await supabase.functions.invoke(
              "subscription-success",
              {
                body: requestBody,
              }
            );

            console.log("subscription-success function response:", { successData, successError });

            if (successError) {
              console.error("Error notifying subscription success:", successError);
              toast.error(`Error activating subscription: ${successError.message || 'Unknown error'}`);
            } else {
              console.log("Subscription successfully activated in database");
            }

            setPaymentStatus("success");
            toast.success("Subscription activated! Your subscription is now active.");
            
            // Check if user has completed onboarding, then redirect appropriately
            setTimeout(async () => {
              const { checkOnboardingComplete } = await import("@/lib/onboardingState");
              const onboardingComplete = await checkOnboardingComplete();
              
              if (onboardingComplete) {
                // User already completed onboarding - go to dashboard
                navigate("/dashboard", { replace: true });
              } else {
                // User hasn't completed onboarding - go to onboarding
                navigate("/onboarding/website", { replace: true });
              }
            }, 2000);
          } catch (err: any) {
            console.error("Subscription success handler error:", err);
            // Still show success since Razorpay subscription is created
            setPaymentStatus("success");
            toast.success("Subscription created! Redirecting...");
            // Check onboarding status before redirecting
            setTimeout(async () => {
              const { checkOnboardingComplete } = await import("@/lib/onboardingState");
              const onboardingComplete = await checkOnboardingComplete();
              
              if (onboardingComplete) {
                navigate("/dashboard", { replace: true });
              } else {
                navigate("/onboarding/website", { replace: true });
              }
            }, 2000);
          }
        },
        modal: {
          ondismiss: function () {
            // Subscription cancelled
            setPaymentStatus("failed");
            setError("Subscription was cancelled. Please try again.");
            setLoading(false);
            toast.error("Subscription cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);
    } catch (err: any) {
      console.error("Subscription initiation error:", err);
      setError(err.message || "Failed to initiate subscription. Please try again.");
      setLoading(false);
      toast.error("Failed to start subscription");
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
            <p className="text-center text-sm text-gray-600 mt-4">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!planType || !PLAN_CONFIGS[planType]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Plan</CardTitle>
            <CardDescription>Please select a valid plan to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/pricing")} className="w-full">
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planConfig = PLAN_CONFIGS[planType];

  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
            <CardDescription>Your subscription is now active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
            </div>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Subscription Failed</CardTitle>
            <CardDescription>{error || "Subscription could not be activated."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={initiateSubscription} className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Try Again"
              )}
            </Button>
            <Button
              onClick={() => navigate("/pricing")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Subscription</CardTitle>
          <CardDescription>Review your plan details and proceed to subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{planConfig.name}</h3>
            <p className="text-sm text-gray-600">{planConfig.description}</p>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Monthly Amount</span>
                <span className="text-2xl font-bold">
                  {planConfig.planKey === 'basic_normal' ? '$99' : 
                   planConfig.planKey === 'basic_founder' ? '$49' : 
                   `$${planConfig.price.toLocaleString('en-US')}`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Billed monthly, cancel anytime</p>
              {planConfig.planKey.includes("founder") && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⭐ Founder Circle - Limited time offer
                </p>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Shield className="h-4 w-4 text-gray-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-900">Secure Payment</p>
              <p className="text-xs text-gray-600">Powered by Razorpay • PCI-DSS Compliant</p>
            </div>
            <Lock className="h-4 w-4 text-gray-600" />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={initiateSubscription}
              className="w-full"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now"
              )}
            </Button>
            <Button
              onClick={() => navigate("/pricing")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plans
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By proceeding, you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            <br />
            Your subscription will auto-renew monthly unless cancelled. Payments are processed securely through Razorpay.
            <br />
            <a href="/refund" className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">30-day money-back guarantee</a> applies to new subscriptions.
            <br />
            <span className="text-gray-600 font-medium">Need help?</span> Contact us at{" "}
            <a href="mailto:hertofhelp@gmail.com" className="underline hover:text-gray-700 font-medium">hertofhelp@gmail.com</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payment;
