import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Feedback = () => {
  const navigate = useNavigate();
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to insert feedback into database (table may not exist)
      try {
        const { error } = await supabase
          .from("feedback")
          .insert({
            feedback_type: feedbackType,
            message: message.trim(),
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.warn("Feedback table may not exist, using email fallback:", error);
          // Fall through to email fallback
        } else {
          // Successfully saved to database
          setSubmitted(true);
          toast.success("Thank you for your feedback!");
          
          // Reset form after 3 seconds
          setTimeout(() => {
            setFeedbackType("");
            setMessage("");
            setSubmitted(false);
          }, 3000);
          setSubmitting(false);
          return;
        }
      } catch (dbError) {
        console.warn("Database insert failed, using email fallback:", dbError);
        // Fall through to email fallback
      }

      // Fallback: Create mailto link (database table doesn't exist)
      const subject = encodeURIComponent(`Feedback: ${feedbackType}`);
      const body = encodeURIComponent(
        `Feedback Type: ${feedbackType}\n\nMessage:\n${message.trim()}${user?.email ? `\n\nSubmitted by: ${user.email}` : ''}`
      );
      window.location.href = `mailto:hertofhelp@gmail.com?subject=${subject}&body=${body}`;
      
      setSubmitted(true);
      toast.success("Opening email client to send feedback...");
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFeedbackType("");
        setMessage("");
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Feedback & Suggestions - citero"
        description="Share your feedback, suggestions, or report issues with citero. We value your input!"
        canonical="https://citero.ai/feedback"
      />
      <HomeHeader />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Share Your Feedback
            </h1>
            <p className="text-lg text-gray-600">
              We'd love to hear your thoughts, suggestions, or any issues you've encountered.
            </p>
          </div>

          {submitted ? (
            <Card className="border border-green-200 bg-green-50 p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Thank You!
              </h2>
              <p className="text-gray-600">
                Your feedback has been submitted successfully. We appreciate your input!
              </p>
            </Card>
          ) : (
            <Card className="border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="feedback-type" className="text-sm font-medium text-gray-700">
                    Type of Feedback
                  </Label>
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger id="feedback-type" className="w-full">
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="feature-request">Feature Request</SelectItem>
                      <SelectItem value="bug-report">Bug Report</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Your Feedback
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Please share your feedback, suggestions, or describe any issues you've encountered..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Be as detailed as possible to help us understand your feedback better.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting || !feedbackType || !message.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              You can also reach us directly at{" "}
              <a
                href="mailto:hertofhelp@gmail.com"
                className="text-gray-900 hover:text-gray-700 underline"
              >
                hertofhelp@gmail.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
};

export default Feedback;

