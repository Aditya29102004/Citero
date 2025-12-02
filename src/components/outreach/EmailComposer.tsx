import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Eye, Edit } from "lucide-react";
import { toast } from "sonner";

interface EmailComposerProps {
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSend: () => void;
  sending?: boolean;
}

export function EmailComposer({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onSend,
  sending = false,
}: EmailComposerProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const handleSend = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter email body");
      return;
    }
    onSend();
  };

  return (
    <Card className="p-6 border border-gray-200 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Email Composer</h3>
        <Tabs value={previewMode ? "preview" : "edit"} onValueChange={(v) => setPreviewMode(v === "preview")}>
          <TabsList>
            <TabsTrigger value="edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={previewMode ? "preview" : "edit"} onValueChange={(v) => setPreviewMode(v === "preview")}>
        <TabsContent value="edit" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="subject" className="text-sm font-medium text-gray-700 mb-2 block">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Email subject..."
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="body" className="text-sm font-medium text-gray-700 mb-2 block">
              Body
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="Email body..."
              className="w-full min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border border-gray-200 rounded-lg bg-white">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">To: [Recipient Email]</div>
              <div className="text-xs text-gray-500 mb-1">From: [Your Email]</div>
              <div className="font-semibold text-gray-900">{subject || "(No subject)"}</div>
            </div>
            <ScrollArea className="h-[400px] p-4">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {body || "(No body)"}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

