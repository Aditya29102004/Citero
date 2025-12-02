import { Button } from "@/components/ui/button";
import { FileText, Save, Eye, Download, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogToolbarProps {
  wordCount: number;
  onSave: () => void;
  onPublish: () => void;
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  status: "draft" | "published";
  saving?: boolean;
}

export function BlogToolbar({
  wordCount,
  onSave,
  onPublish,
  onExportMarkdown,
  onExportPDF,
  status,
  saving = false,
}: BlogToolbarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{wordCount.toLocaleString()} words</span>
        </div>
        <Badge
          variant={status === "published" ? "default" : "outline"}
          className={
            status === "published"
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }
        >
          {status === "published" ? "Published" : "Draft"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onSave} variant="outline" size="sm" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        {status === "draft" && (
          <Button onClick={onPublish} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <Eye className="h-4 w-4 mr-2" />
            Publish
          </Button>
        )}
        <Button onClick={onExportMarkdown} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export MD
        </Button>
        <Button onClick={onExportPDF} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

