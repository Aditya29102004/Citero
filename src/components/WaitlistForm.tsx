import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";

export const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(128);
  const [currentStep, setCurrentStep] = useState(1);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    // Fetch waitlist count
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from("waitlist")
          .select("*", { count: "exact", head: true });
        
        if (error) {
          // If 401/403 error, it's likely RLS blocking - use default count
          if (error.code === 'PGRST301' || error.code === '42501') {
            console.log("Waitlist count not available (RLS restriction), using default");
            return; // Keep default count of 128
          }
          throw error;
        }
        
        if (count !== null && count !== undefined) {
          setWaitlistCount(count);
        }
      } catch (error: any) {
        // Silently fail - use default count
        console.log("Error fetching waitlist count:", error?.message || "Unknown error");
        // Keep default count of 128
      }
    };
    fetchCount();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Please enter your email address.");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError("");
    }
  };

  const handleContinue = () => {
    if (validateEmail(email)) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !plan) {
      toast.error("Please fill in email and select a plan");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([
          {
            email: email.toLowerCase().trim(),
            plan,
            comments: comments.trim() || null,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        throw error;
      }

      toast.success("Thank you! You've been added to the waitlist.");
      setIsSubmitted(true);
      setEmail("");
      setPlan("");
      setComments("");
      setWaitlistCount(prev => prev + 1);
    } catch (error: any) {
      console.error("Error submitting waitlist:", error);
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-900 mb-6 shadow-lg">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">You're on the list!</h3>
        <p className="text-lg text-gray-600">We'll notify you when we launch.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-lg relative overflow-hidden">
      <div className="relative z-10">
        {/* Waitlist count badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/80 rounded-full border border-gray-200/50">
            <Mail className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Join {waitlistCount}+ founders on the waitlist
            </span>
          </div>
          <p className="text-xs text-gray-500">We'll never spam. Unsubscribe anytime.</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-900 rounded-full transition-all duration-500"
              style={{ width: currentStep === 1 ? '50%' : '100%' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-medium text-gray-600">Step {currentStep} of 2</span>
          </div>
        </div>

        {/* Step 1: Email */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
                  Email
                </label>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="you@company.com"
                    className={`w-full border-2 rounded-lg h-14 text-base transition-all ${
                      emailError 
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-gray-900 focus:ring-gray-200'
                    }`}
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={!email || !!emailError}
                  className="h-14 px-8 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <Send className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-4 border-t border-gray-100">
              <CheckCircle2 className="h-5 w-5 text-gray-900 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                By joining, you agree to receive product updates. No spam, ever.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Plan and Comments */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="plan" className="block text-sm font-semibold text-gray-900 mb-3">
                Plan You Would Choose
              </label>
              <Select value={plan} onValueChange={setPlan} required>
                <SelectTrigger id="plan" className="w-full border-2 border-gray-200 focus:border-gray-900 rounded-lg h-14 text-base">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic - $99/month</SelectItem>
                  <SelectItem value="pro">Pro - $249/month</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="comments" className="block text-sm font-semibold text-gray-900 mb-3">
                Comments (Optional)
              </label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Tell us what you're most excited about..."
                rows={4}
                className="w-full border-2 border-gray-200 focus:border-gray-900 rounded-lg resize-none text-base"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 rounded-lg h-14 text-base font-medium"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !plan}
                className="flex-1 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Join Waitlist
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

