import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { AuditResult, getCategoryLabel, getScoreBadgeColor } from "@/lib/audits/runAudit";

interface AuditSectionProps {
  audits: AuditResult[];
  loading?: boolean;
}

export function AuditSection({ audits, loading }: AuditSectionProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
        <p className="text-gray-600">No audit results yet. Run your first audit to see results.</p>
      </div>
    );
  }

  // Sort audits by score (worst first)
  const sortedAudits = [...audits].sort((a, b) => a.score - b.score);

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {sortedAudits.map((audit) => {
        const badgeColor = getScoreBadgeColor(audit.score);
        const categoryLabel = getCategoryLabel(audit.category);

        return (
          <AccordionItem
            key={audit.category}
            value={audit.category}
            className="border border-gray-200/80 rounded-xl bg-white px-5 mb-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <AccordionTrigger className="hover:no-underline py-5">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-6 flex-1">
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">{categoryLabel}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className={`${badgeColor} font-semibold`}>
                        {audit.score.toFixed(0)}/100
                      </Badge>
                      {audit.issues.length > 0 && (
                        <span className="text-sm text-gray-600 font-medium">
                          {audit.issues.length} issue{audit.issues.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all bg-gray-900"
                        style={{ width: `${audit.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pt-0">
              <div className="space-y-6 pt-5 border-t border-gray-100">
                {/* Issues */}
                {audit.issues.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Issues Found</h4>
                    </div>
                    <ul className="space-y-2">
                      {audit.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-600 mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {audit.recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-gray-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Recommendations</h4>
                    </div>
                    <ul className="space-y-2">
                      {audit.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No issues message */}
                {audit.issues.length === 0 && audit.recommendations.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-gray-600" />
                    <span>No issues found. Great job!</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

