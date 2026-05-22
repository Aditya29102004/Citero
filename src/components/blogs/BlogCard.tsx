import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Download, Calendar, Trash2, BookOpen, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BlogCardProps {
  blog: {
    id: string;
    title: string | null;
    content: string | null;
    word_count: number;
    created_at: string;
    topic?: string | null;
    seo_keywords?: string[] | null;
    status: string;
  };
  brandName?: string;
  onExport?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function BlogCard({ blog, brandName, onExport, onDelete }: BlogCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Extract a clean plaintext snippet from markdown content
  const getContentSnippet = (content: string | null) => {
    if (!content) return "No content generated yet.";
    // Simple regex to strip basic markdown headers, bold, links, etc.
    const cleanText = content
      .replace(/[#*`~_]/g, "") // strip formatting chars
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // strip links
      .replace(/\s+/g, " ")
      .trim();
    return cleanText.length > 120 ? `${cleanText.substring(0, 120)}...` : cleanText;
  };

  const isPublished = blog.status === "published";
  const keywords = blog.seo_keywords || [];

  return (
    <Card className="flex flex-col h-full overflow-hidden border border-slate-200/80 bg-white hover:shadow-lg hover:border-slate-300/80 transition-all duration-300 group rounded-xl">
      {/* Card Header Info */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          {brandName ? (
            <Badge 
              variant="outline" 
              className="bg-slate-100 text-slate-800 border-slate-200 font-medium px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider"
            >
              {brandName}
            </Badge>
          ) : (
            <div />
          )}
          
          <Badge
            className={`font-medium px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5 border ${
              isPublished
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-white" : "bg-slate-400"}`} />
            {isPublished ? "Published" : "Draft"}
          </Badge>
        </div>

        {/* Title & Topic */}
        <div className="mb-3">
          <h3 
            onClick={() => navigate(`/blogs/${blog.id}`)}
            className="text-base font-bold text-slate-900 group-hover:text-slate-700 group-hover:underline transition-all line-clamp-2 cursor-pointer leading-snug"
          >
            {blog.title || "Untitled Blog"}
          </h3>
          
          {blog.topic && (
            <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
              <Tag className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{blog.topic}</span>
            </div>
          )}
        </div>

        {/* Content Snippet */}
        <p className="text-slate-600 text-xs leading-relaxed mb-4 flex-1 line-clamp-3">
          {getContentSnippet(blog.content)}
        </p>

        {/* Keywords pills */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {keywords.slice(0, 3).map((keyword, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0 rounded text-[10px] font-normal"
              >
                {keyword}
              </Badge>
            ))}
            {keywords.length > 3 && (
              <span className="text-[10px] text-slate-400 font-medium px-1 align-middle">
                +{keywords.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metadata divider */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
          <span>{blog.word_count?.toLocaleString() || 0} words</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatDate(blog.created_at)}</span>
        </span>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button
          onClick={() => navigate(`/blogs/${blog.id}`)}
          className="flex-1 bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 font-semibold rounded-lg shadow-sm"
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Edit Blog
        </Button>

        <TooltipProvider>
          {onExport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onExport(blog.id)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/80 rounded-lg shadow-sm"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export Markdown</p>
              </TooltipContent>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onDelete(blog.id)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 bg-white border-slate-200/80 rounded-lg shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Blog</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </Card>
  );
}


