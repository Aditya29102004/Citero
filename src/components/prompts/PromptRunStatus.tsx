import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface PromptRunStatusProps {
  nextRunHours?: number;
  lastRunTime?: Date | null;
}

export function PromptRunStatus({ nextRunHours, lastRunTime }: PromptRunStatusProps) {
  if (!nextRunHours && !lastRunTime) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
      {nextRunHours !== undefined && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Next Prompts Run: {nextRunHours} hours</span>
        </div>
      )}
      {lastRunTime && (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Prompt Ran
        </Badge>
      )}
    </div>
  );
}

