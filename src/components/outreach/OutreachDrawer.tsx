import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, Mail, Sparkles } from "lucide-react";
import { OutreachTarget } from "./OutreachTable";
import { EmailComposer } from "./EmailComposer";
import { generateEmail } from "@/lib/outreach/generateEmail";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OutreachDrawerProps {
  target: OutreachTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  brandInfo: {
    name: string;
    description?: string;
    website?: string;
  };
  onEmailGenerated?: () => void;
}

export function OutreachDrawer({
  target,
  open,
  onOpenChange,
  brandId,
  brandInfo,
  onEmailGenerated,
}: OutreachDrawerProps) {
  const [whySummary, setWhySummary] = useState<string>("");
  const [citationContexts, setCitationContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailGenerated, setEmailGenerated] = useState(false);

  useEffect(() => {
    if (!target || !open) {
      setWhySummary("");
      setCitationContexts([]);
      setEmailSubject("");
      setEmailBody("");
      setEmailGenerated(false);
      return;
    }

    fetchTargetDetails();
  }, [target, open]);

  const fetchTargetDetails = async () => {
    if (!target) return;

    setLoading(true);
    try {
      // Fetch citation contexts from scan_responses
      const { data: responses } = await supabase
        .from("scan_responses")
        .select("ai_response, question_text, created_at")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (responses) {
        // Extract contexts where this source URL appears
        const contexts: string[] = [];
        responses.forEach((response: any) => {
          if (response.ai_response?.includes(target.sourceUrl)) {
            const snippet = response.ai_response.substring(0, 200);
            contexts.push(`"${snippet}..." (from: ${response.question_text})`);
          }
        });
        setCitationContexts(contexts.slice(0, 5));
      }

      // Generate "Why this source matters" summary
      const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (OPENROUTER_API_KEY) {
        const prompt = `Explain why ${target.sourceDomain} is an important source for ${brandInfo.name} based on:
- Citation count: ${target.citationCount} times
- Source URL: ${target.sourceUrl}
${target.articleTitle ? `- Article: ${target.articleTitle}` : ""}

Provide a brief 2-3 sentence explanation of why this source matters for brand visibility.`;

        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": window.location.origin,
              "X-Title": "Unifr Outreach",
            },
            body: JSON.stringify({
              model: "qwen/qwen-2.5-7b-instruct",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 200,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setWhySummary(data.choices?.[0]?.message?.content || "");
          }
        } catch (error) {
          console.error("Error generating summary:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching target details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!target) return;

    setGeneratingEmail(true);
    try {
      const emailContent = await generateEmail(
        {
          personName: target.personName,
          personRole: target.personRole,
          companyName: target.sourceDomain,
          sourceUrl: target.sourceUrl,
          articleTitle: target.articleTitle,
          citationCount: target.citationCount,
          citationContexts,
        },
        brandInfo,
        citationContexts
      );

      setEmailSubject(emailContent.subject);
      setEmailBody(emailContent.body);
      setEmailGenerated(true);

      // Save to database
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("outreach_emails").insert({
          target_id: target.id,
          brand_id: brandId,
          user_id: session.user.id,
          subject: emailContent.subject,
          body: emailContent.body,
          status: "draft",
        });

        // Update target status
        await supabase
          .from("outreach_targets")
          .update({ status: "email_drafted" })
          .eq("id", target.id);
      }

      toast.success("Email generated successfully!");
      if (onEmailGenerated) {
        onEmailGenerated();
      }
    } catch (error: any) {
      console.error("Error generating email:", error);
      toast.error(error.message || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!target || !emailSubject || !emailBody) return;

    setSendingEmail(true);
    try {
      // Mock send - in production, integrate with email service
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Update email status
        const { data: emails } = await supabase
          .from("outreach_emails")
          .select("id")
          .eq("target_id", target.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (emails) {
          await supabase
            .from("outreach_emails")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", emails.id);
        }

        // Update target status
        await supabase
          .from("outreach_targets")
          .update({ status: "email_sent" })
          .eq("id", target.id);
      }

      toast.success("Email sent successfully! (Mock send)");
      if (onEmailGenerated) {
        onEmailGenerated();
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  if (!target) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Outreach Target Details</SheetTitle>
          <SheetDescription>Detailed information and email generation</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <Card className="p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>{" "}
                <span className="font-medium text-gray-900">{target.personName}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>{" "}
                <span className="font-medium text-gray-900">{target.personRole}</span>
              </div>
              <div>
                <span className="text-gray-600">Domain:</span>{" "}
                <span className="font-medium text-gray-900">{target.sourceDomain}</span>
              </div>
              {target.articleTitle && (
                <div>
                  <span className="text-gray-600">Article:</span>{" "}
                  <span className="font-medium text-gray-900">{target.articleTitle}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Why This Source Matters */}
          <Card className="p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Why This Source Matters</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating insights...
              </div>
            ) : (
              <p className="text-sm text-gray-700">{whySummary || "No insights available."}</p>
            )}
          </Card>

          {/* Citation Count */}
          <Card className="p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              How Many Times LLMs Cited This Page
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-lg px-3 py-1">
                {target.citationCount}
              </Badge>
              <span className="text-sm text-gray-600">citations</span>
            </div>
          </Card>

          {/* Citation Contexts */}
          {citationContexts.length > 0 && (
            <Card className="p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                What Citation Contexts Say About Your Brand
              </h3>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {citationContexts.map((context, idx) => (
                    <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {context}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Generate Email Button */}
          {!emailGenerated && (
            <Button
              onClick={handleGenerateEmail}
              disabled={generatingEmail}
              className="w-full bg-gray-900 text-white hover:bg-gray-800"
            >
              {generatingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Email...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Outreach Email
                </>
              )}
            </Button>
          )}

          {/* Email Composer */}
          {emailGenerated && (
            <EmailComposer
              subject={emailSubject}
              body={emailBody}
              onSubjectChange={setEmailSubject}
              onBodyChange={setEmailBody}
              onSend={handleSendEmail}
              sending={sendingEmail}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

