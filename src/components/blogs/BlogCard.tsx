import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Download, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BlogCardProps {
  blog: {
    id: string;
    title: string;
    word_count: number;
    created_at: string;
    topic?: string;
  };
  onExport?: (id: string) => void;
}

export function BlogCard({ blog, onExport }: BlogCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Card className="p-6 border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{blog.title || "Untitled Blog"}</h3>
          </div>
          {blog.topic && (
            <p className="text-sm text-gray-600 mb-2">Topic: {blog.topic}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(blog.created_at)}
            </span>
            <span>{blog.word_count.toLocaleString()} words</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => navigate(`/blogs/${blog.id}`)}
          variant="outline"
          size="sm"
          className="border-gray-300 hover:bg-gray-50"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {onExport && (
          <Button
            onClick={() => onExport(blog.id)}
            variant="outline"
            size="sm"
            className="border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </Card>
  );
}

