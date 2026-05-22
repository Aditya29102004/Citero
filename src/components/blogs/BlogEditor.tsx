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
  const [isKeywordsExpanded, setIsKeywordsExpanded] = useState(false);
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title Input */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Article Title</label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter blog title..."
          className="text-xl font-bold border-0 focus-visible:ring-0 p-0 bg-transparent text-slate-900 placeholder-slate-300 h-auto"
        />
      </div>

      {/* GEO Keywords Collapsible Section */}
      {seoKeywords.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setIsKeywordsExpanded(!isKeywordsExpanded)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">GEO Keywords</span>
              <Badge variant="secondary" className="bg-slate-200 text-slate-800 font-medium text-[10px] rounded-md px-1.5 py-0.5">
                {seoKeywords.length}
              </Badge>
              {!isKeywordsExpanded && (
                <div className="hidden sm:flex items-center gap-1.5 ml-3 max-w-[450px] truncate">
                  {seoKeywords.slice(0, 4).map((keyword, idx) => (
                    <span key={idx} className="text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-normal">
                      {keyword}
                    </span>
                  ))}
                  {seoKeywords.length > 4 && (
                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                      +{seoKeywords.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-slate-400">
              {isKeywordsExpanded ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
          </button>

          {isKeywordsExpanded && (
            <div className="px-6 pb-4 pt-1">
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-[160px] overflow-y-auto p-2 bg-white border border-slate-200 rounded-xl">
                {seoKeywords.map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-750 border-slate-200 text-[11px] font-normal px-2 py-0.5 rounded">
                    {keyword}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
                  placeholder="Add custom SEO keyword..."
                  className="h-8.5 text-xs rounded-lg border-slate-200 focus-visible:ring-slate-300 focus:border-slate-300"
                />
                <Button
                  onClick={handleAddKeyword}
                  size="sm"
                  variant="outline"
                  className="h-8.5 rounded-lg border-slate-200 text-xs text-slate-700 hover:bg-slate-50 px-3"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor/Preview Toggle */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200 bg-slate-50/20">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setShowPreview(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              !showPreview
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              showPreview
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Preview
          </button>
        </div>
        {onAIRewrite && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">AI Co-Writer:</span>
            {aiRewriteOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedText = window.getSelection()?.toString() || content;
                  onAIRewrite(`${option.prompt}: ${selectedText}`);
                }}
                className="text-xs h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Sparkles className="h-3 w-3 mr-1 text-slate-500" />
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Editor or Preview */}
      <div className="flex-1 min-h-0 flex flex-col">
        {showPreview ? (
          <ScrollArea className="flex-1 p-6 bg-white overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
            <div className="border-r border-slate-200 h-full">
              <Textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Start writing your blog in Markdown..."
                className="h-full border-0 rounded-none resize-none focus-visible:ring-0 p-6 font-mono text-sm"
              />
            </div>
            <ScrollArea className="p-6 bg-slate-50/50 overflow-y-auto h-full">
              <div className="prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

