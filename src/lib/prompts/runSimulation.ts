import { supabase } from "@/integrations/supabase/client";

export interface SimulationParams {
  promptText: string;
  brandContext: {
    name: string;
    description?: string;
    website?: string;
  };
  model: string;
  country?: string;
}

export interface SimulationResult {
  answerText: string;
  brandMentioned: boolean;
  competitors: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  sources: string[];
  visibilityScore: number;
}

/**
 * Run a single prompt simulation via Edge Function (uses same AI providers as scans)
 */
export async function runSimulation(params: SimulationParams): Promise<SimulationResult> {
  const { promptText, brandContext, model, country } = params;

  try {
    // Use edge function instead of OpenRouter - uses same AI providers as scans (OpenAI, Gemini)
    const { data, error } = await supabase.functions.invoke('run-prompt-simulation', {
      body: {
        promptText,
        brandContext,
        model,
        country,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to run simulation");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data as SimulationResult;
  } catch (error: any) {
    throw error;
  }
}
