import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { SubscriptionLimits } from "@/lib/subscriptionLimits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CompetitorFilters {
  aiProvider: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  topic?: string;
}

interface CompetitorFiltersProps {
  onFiltersChange: (filters: CompetitorFilters) => void;
  subscriptionLimits?: SubscriptionLimits | null;
}

export function CompetitorFilters({ onFiltersChange, subscriptionLimits }: CompetitorFiltersProps) {
  const isProviderAllowed = (provider: string): boolean => {
    if (provider === "all") return true;
    // Map filter provider names to subscription provider names
    const providerMap: Record<string, string> = {
      chatgpt: 'openai',
      gemini: 'gemini',
      claude: 'openrouter', // Claude might be via OpenRouter
      perplexity: 'openrouter', // Perplexity might be via OpenRouter
    };
    const mappedProvider = providerMap[provider] || provider;
    
    if (!subscriptionLimits || !subscriptionLimits.planType) {
      return mappedProvider === 'openai' || mappedProvider === 'gemini';
    }
    return subscriptionLimits.allowedAIProviders.includes(mappedProvider);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [aiProvider, setAiProvider] = useState(searchParams.get("provider") || "all");
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  
  // Default to last 30 days
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: searchParams.get("start") ? new Date(searchParams.get("start")!) : defaultStart,
    end: searchParams.get("end") ? new Date(searchParams.get("end")!) : new Date(),
  });

  useEffect(() => {
    const filters: CompetitorFilters = {
      aiProvider,
      dateRange,
      topic: topic || undefined,
    };
    onFiltersChange(filters);

    // Update URL params
    const params = new URLSearchParams();
    if (aiProvider !== "all") params.set("provider", aiProvider);
    if (topic) params.set("topic", topic);
    params.set("start", dateRange.start.toISOString());
    params.set("end", dateRange.end.toISOString());
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiProvider, dateRange, topic]);

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="ai-provider" className="text-sm font-medium text-gray-700 mb-2 block">
          AI Provider
        </Label>
        <TooltipProvider>
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger id="ai-provider" className="w-full">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {(['chatgpt', 'gemini', 'claude', 'perplexity'] as const).map((provider) => {
                const isAllowed = isProviderAllowed(provider);
                const labels: Record<string, string> = {
                  chatgpt: 'ChatGPT',
                  gemini: 'Gemini',
                  claude: 'Claude',
                  perplexity: 'Perplexity',
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
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.start ? format(dateRange.start, "MMM dd, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.start}
                onSelect={(date) => date && setDateRange({ ...dateRange, start: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.end ? format(dateRange.end, "MMM dd, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.end}
                onSelect={(date) => date && setDateRange({ ...dateRange, end: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="topic" className="text-sm font-medium text-gray-700 mb-2 block">
          Topic (Optional)
        </Label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Filter by topic..."
          className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

