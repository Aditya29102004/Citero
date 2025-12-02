import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calendar, Lock } from "lucide-react";
import { SubscriptionLimits } from "@/lib/subscriptionLimits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SourcesFiltersProps {
  aiProvider: string;
  dateRange: string;
  onProviderChange: (provider: string) => void;
  onDateRangeChange: (range: string) => void;
  loading?: boolean;
  subscriptionLimits?: SubscriptionLimits | null;
}

export function SourcesFilters({
  aiProvider,
  dateRange,
  onProviderChange,
  onDateRangeChange,
  loading = false,
  subscriptionLimits,
}: SourcesFiltersProps) {
  const isProviderAllowed = (provider: string): boolean => {
    if (provider === "all") return true;
    if (!subscriptionLimits || !subscriptionLimits.planType) {
      return provider === 'openai' || provider === 'gemini';
    }
    return subscriptionLimits.allowedAIProviders.includes(provider);
  };

  return (
    <Card className="p-4 border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <TooltipProvider>
          <Select value={aiProvider} onValueChange={onProviderChange} disabled={loading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="AI Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {(['openai', 'gemini', 'deepseek', 'openrouter'] as const).map((provider) => {
                const isAllowed = isProviderAllowed(provider);
                const labels: Record<string, string> = {
                  openai: 'ChatGPT (OpenAI)',
                  gemini: 'Gemini (Google)',
                  deepseek: 'DeepSeek',
                  openrouter: 'OpenRouter',
                };
                return (
                  <Tooltip key={provider} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div>
                        <SelectItem
                          value={provider}
                          disabled={!isAllowed}
                          className={!isAllowed ? "opacity-60 cursor-not-allowed" : ""}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{labels[provider]}</span>
                            {!isAllowed && <Lock className="h-3.5 w-3.5 ml-2 text-gray-400" />}
                          </div>
                        </SelectItem>
                      </div>
                    </TooltipTrigger>
                    {!isAllowed && (
                      <TooltipContent>
                        <p className="text-sm">Pro plan required</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </SelectContent>
          </Select>
        </TooltipProvider>

        <Select value={dateRange} onValueChange={onDateRangeChange} disabled={loading}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

