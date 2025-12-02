import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Sparkles } from "lucide-react";
import { SubscriptionLimits } from "@/lib/subscriptionLimits";
import { cn } from "@/lib/utils";

export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'openrouter' | 'claude' | 'perplexity';

interface AIProviderSelectProps {
  value: AIProvider | string;
  onValueChange: (value: AIProvider) => void;
  subscriptionLimits?: SubscriptionLimits | null;
  className?: string;
  disabled?: boolean;
  showLockIcon?: boolean;
  includeAllProviders?: boolean; // If true, shows claude/perplexity too
}

const PROVIDER_INFO: Record<string, { label: string; requiresPro: boolean; description?: string }> = {
  openai: { label: "ChatGPT (OpenAI)", requiresPro: false },
  gemini: { label: "Gemini (Google)", requiresPro: false },
  deepseek: { label: "DeepSeek", requiresPro: true, description: "Pro plan required" },
  openrouter: { label: "OpenRouter", requiresPro: true, description: "Pro plan required" },
  claude: { label: "Claude (Anthropic)", requiresPro: true, description: "Pro plan required" },
  perplexity: { label: "Perplexity", requiresPro: true, description: "Pro plan required" },
};

export function AIProviderSelect({
  value,
  onValueChange,
  subscriptionLimits,
  className,
  disabled = false,
  showLockIcon = true,
  includeAllProviders = false,
}: AIProviderSelectProps) {
  const isProviderAllowed = (provider: string): boolean => {
    if (!subscriptionLimits || !subscriptionLimits.planType) {
      // No subscription - only allow basic providers
      return provider === 'openai' || provider === 'gemini';
    }
    return subscriptionLimits.allowedAIProviders.includes(provider);
  };

  const getProviderLabel = (provider: string): string => {
    const info = PROVIDER_INFO[provider];
    if (!info) return provider;
    
    const isLocked = !isProviderAllowed(provider);
    let label = info.label;
    
    if (isLocked && info.requiresPro) {
      label += " (Pro)";
    }
    
    return label;
  };

  const providers: AIProvider[] = includeAllProviders
    ? ['openai', 'gemini', 'deepseek', 'openrouter', 'claude', 'perplexity']
    : ['openai', 'gemini', 'deepseek', 'openrouter'];

  return (
    <TooltipProvider>
      <Select
        value={value}
        onValueChange={(val) => {
          if (isProviderAllowed(val)) {
            onValueChange(val as AIProvider);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn("w-full", className)}>
          <SelectValue placeholder="Select AI Provider" />
        </SelectTrigger>
        <SelectContent>
          {providers.map((provider) => {
            const isAllowed = isProviderAllowed(provider);
            const isLocked = !isAllowed;
            const info = PROVIDER_INFO[provider];

            return (
              <Tooltip key={provider} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div>
                    <SelectItem
                      value={provider}
                      disabled={isLocked}
                      className={cn(
                        "cursor-pointer",
                        isLocked && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{getProviderLabel(provider)}</span>
                        {isLocked && showLockIcon && (
                          <Lock className="h-3.5 w-3.5 ml-2 text-gray-400" />
                        )}
                        {!isLocked && subscriptionLimits?.planType === 'pro' && (
                          <Sparkles className="h-3.5 w-3.5 ml-2 text-teal-600" />
                        )}
                      </div>
                    </SelectItem>
                  </div>
                </TooltipTrigger>
                {isLocked && (
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">
                      {info?.requiresPro
                        ? "This provider requires a Pro subscription. Upgrade to unlock all AI providers."
                        : "This provider is not available on your current plan."}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Basic plan includes ChatGPT and Gemini only.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}

