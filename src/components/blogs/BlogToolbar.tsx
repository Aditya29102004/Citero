import { Button } from "@/components/ui/button";
import { FileText, Save, Eye, Download, FileDown, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogToolbarProps {
  wordCount: number;
  onSave: () => void;
  onPublish: () => void;
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  status: "draft" | "published";
  saving?: boolean;
  onBack?: () => void;
}

export function BlogToolbar({
  wordCount,
  onSave,
  onPublish,
  onExportMarkdown,
  onExportPDF,
  status,
  saving = false,
  onBack,
}: BlogToolbarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
      <div className="flex items-center gap-3">
        {onBack && (
          <>
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all duration-200 flex items-center font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <div className="h-5 w-[1px] bg-slate-200" />
          </>
        )}
        <div className="flex items-center gap-1.5 text-slate-500">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold">{wordCount.toLocaleString()} words</span>
        </div>
        <Badge
          className={`font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${
            status === "published"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {status}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          variant="outline"
          size="sm"
          disabled={saving}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-9 px-3.5 text-xs font-semibold transition-all duration-200"
        >
          <Save className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        {status === "draft" && (
          <Button
            onClick={onPublish}
            size="sm"
            className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm rounded-xl h-9 px-4 text-xs font-semibold transition-all duration-200"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Publish
          </Button>
        )}
        <Button
          onClick={onExportMarkdown}
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-9 px-3.5 text-xs font-semibold transition-all duration-200"
        >
          <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          Export MD
        </Button>
        <Button
          onClick={onExportPDF}
          variant="outline"
          size="sm"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-9 px-3.5 text-xs font-semibold transition-all duration-200"
        >
          <FileDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

