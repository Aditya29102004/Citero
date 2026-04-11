import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Simple markdown renderer with security sanitization
const renderMarkdown = (text: string): string => {
  if (!text) return "";
  
  // XSS protection: Escape all raw HTML tags first
  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return safeText
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mb-2 mt-4">$1</h3>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    .replace(/\n/gim, '<br>')
    .replace(/^(.+)$/gim, '<p class="mb-4">$1</p>');
};

interface BlogEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onAIRewrite?: (prompt: string) => Promise<void>;
  seoKeywords?: string[];
  onAddKeyword?: (keyword: string) => void;
}

export function BlogEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  onAIRewrite,
  seoKeywords = [],
  onAddKeyword,
}: BlogEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

  const handleAddKeyword = () => {
    if (keywordInput.trim() && onAddKeyword) {
      onAddKeyword(keywordInput.trim());
      setKeywordInput("");
    }
  };

  const aiRewriteOptions = [
    { label: "Improve Clarity", prompt: "Rewrite this section to improve clarity and readability" },
    { label: "Make More Authoritative", prompt: "Rewrite this section to sound more authoritative and expert" },
    { label: "Reduce Fluff", prompt: "Rewrite this section to be more concise and remove unnecessary words" },
    { label: "Add Data Points", prompt: "Rewrite this section to include relevant statistics and data points" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Title Input */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Blog Title"
          className="text-2xl font-bold border-0 focus-visible:ring-0 p-0"
        />
      </div>

      {/* GEO Keywords */}
      {seoKeywords.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <Label className="text-xs text-gray-600 mb-2 block">GEO Keywords</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {seoKeywords.map((keyword, idx) => (
              <Badge key={idx} variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                {keyword}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
              placeholder="Add keyword"
              className="h-8 text-sm"
            />
            <Button onClick={handleAddKeyword} size="sm" variant="outline">
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Editor/Preview Toggle */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button
            variant={!showPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowPreview(false)}
          >
            Edit
          </Button>
          <Button
            variant={showPreview ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            Preview
          </Button>
        </div>
        {onAIRewrite && (
          <div className="flex gap-2">
            {aiRewriteOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedText = window.getSelection()?.toString() || content;
                  onAIRewrite(`${option.prompt}: ${selectedText}`);
                }}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Editor or Preview */}
      {showPreview ? (
        <ScrollArea className="flex-1 p-6 bg-white">
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-0">
          <div className="border-r border-gray-200">
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Start writing your blog in Markdown..."
              className="h-full border-0 rounded-none resize-none focus-visible:ring-0 p-6 font-mono text-sm"
            />
          </div>
          <ScrollArea className="p-6 bg-gray-50">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* GEO Suggestions */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-gray-900">GEO Suggestions</span>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <p>• Add section about trending topics to boost citation influence</p>
          <p>• Include statistics to improve credibility</p>
          <p>• Mention competitor differentiation points</p>
        </div>
      </div>
    </div>
  );
}

