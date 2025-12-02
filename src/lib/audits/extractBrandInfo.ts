import { supabase } from "@/integrations/supabase/client";

/**
 * Extract competitors from brand text and scan responses using AI
 */
export async function extractCompetitors(
  brandName: string,
  brandText: string,
  scanResponses?: string[]
): Promise<string[]> {
  try {
    const combinedText = [
      brandText,
      ...(scanResponses || []),
    ]
      .filter(Boolean)
      .join("\n\n")
      .substring(0, 6000);

    const { data, error } = await supabase.functions.invoke("generate-competitors", {
      body: {
        brandName,
        brandDescription: combinedText,
      },
    });

    if (error) {
      console.error("Error extracting competitors:", error);
      return [];
    }

    if (data?.competitors && Array.isArray(data.competitors)) {
      const filtered = data.competitors.filter((c: any) => typeof c === "string" && c.trim().length > 0);
      // Deduplicate (case-insensitive)
      const seen = new Set<string>();
      return filtered.filter((c: string) => {
        const normalized = c.trim().toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    return [];
  } catch (error) {
    console.error("Error extracting competitors:", error);
    return [];
  }
}

/**
 * Extract topics/categories from brand text and scan responses using AI
 */
export async function extractTopics(
  brandName: string,
  brandText: string,
  scanResponses?: string[]
): Promise<string[]> {
  try {
    const combinedText = [
      brandText,
      ...(scanResponses || []),
    ]
      .filter(Boolean)
      .join("\n\n")
      .substring(0, 6000);

    const { data, error } = await supabase.functions.invoke("generate-topics", {
      body: {
        brandName,
        brandDescription: combinedText,
      },
    });

    if (error) {
      console.error("Error extracting topics:", error);
      return [];
    }

    if (data?.topics && Array.isArray(data.topics)) {
      const filtered = data.topics.filter((t: any) => typeof t === "string" && t.trim().length > 0);
      // Deduplicate (case-insensitive)
      const seen = new Set<string>();
      return filtered.filter((t: string) => {
        const normalized = t.trim().toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    return [];
  } catch (error) {
    console.error("Error extracting topics:", error);
    return [];
  }
}

