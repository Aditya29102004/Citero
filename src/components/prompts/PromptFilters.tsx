import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";
import { SubscriptionLimits } from "@/lib/subscriptionLimits";

export interface PromptFilters {
  model: string;
  country: string;
  topic: string;
}

interface PromptFiltersProps {
  filters: PromptFilters;
  onFiltersChange: (filters: PromptFilters) => void;
  onRunSimulation: () => void;
  topics: string[];
  loading?: boolean;
  subscriptionLimits?: SubscriptionLimits | null;
  promptSimulatorUsage?: number;
}

const COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
];

const MODELS = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "qwen", label: "Qwen" },
];

export function PromptFilters({
  filters,
  onFiltersChange,
  onRunSimulation,
  topics,
  loading = false,
  subscriptionLimits,
  promptSimulatorUsage = 0,
}: PromptFiltersProps) {
  const isProviderAllowed = (provider: string): boolean => {
    if (!subscriptionLimits) return true;
    const providerMap: Record<string, string> = {
      chatgpt: 'openai',
      claude: 'openrouter',
      gemini: 'gemini',
      qwen: 'openrouter',
    };
    const mappedProvider = providerMap[provider] || provider;
    return subscriptionLimits.allowedAIProviders.includes(mappedProvider);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="model" className="text-sm font-medium text-gray-700 mb-2 block">
          Model
        </Label>
        <Select
          value={filters.model}
          onValueChange={(value) => onFiltersChange({ ...filters, model: value })}
        >
          <SelectTrigger id="model" className="w-full">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => {
              const isAllowed = isProviderAllowed(model.value);
              return (
                <SelectItem
                  key={model.value}
                  value={model.value}
                  disabled={!isAllowed}
                  className={!isAllowed ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {model.label}
                  {!isAllowed && " (Pro only)"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="country" className="text-sm font-medium text-gray-700 mb-2 block">
          Country
        </Label>
        <Select
          value={filters.country}
          onValueChange={(value) => onFiltersChange({ ...filters, country: value })}
        >
          <SelectTrigger id="country" className="w-full">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="topic" className="text-sm font-medium text-gray-700 mb-2 block">
          Topic
        </Label>
        <Select
          value={filters.topic}
          onValueChange={(value) => onFiltersChange({ ...filters, topic: value })}
        >
          <SelectTrigger id="topic" className="w-full">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topics.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <Button
          onClick={onRunSimulation}
          disabled={loading || (subscriptionLimits && subscriptionLimits.promptSimulatorRunsPerMonth !== Infinity && subscriptionLimits.promptSimulatorRunsPerMonth > 0 && promptSimulatorUsage >= subscriptionLimits.promptSimulatorRunsPerMonth)}
          className="bg-gray-900 text-white hover:bg-gray-800 h-10 px-6"
        >
          <Play className="h-4 w-4 mr-2" />
          {loading ? "Running..." : (subscriptionLimits && subscriptionLimits.promptSimulatorRunsPerMonth !== Infinity && subscriptionLimits.promptSimulatorRunsPerMonth > 0 && promptSimulatorUsage >= subscriptionLimits.promptSimulatorRunsPerMonth) ? "Limit Reached" : "Run Simulation"}
        </Button>
        {subscriptionLimits && subscriptionLimits.promptSimulatorRunsPerMonth !== Infinity && subscriptionLimits.promptSimulatorRunsPerMonth > 0 && (
          <span className="text-xs text-gray-500">
            {promptSimulatorUsage} / {subscriptionLimits.promptSimulatorRunsPerMonth} runs this month
          </span>
        )}
      </div>
    </div>
  );
}

