import { supabase } from "@/integrations/supabase/client";

export interface OnboardingData {
  websiteUrl?: string;
  summary?: string;
  industry?: string;
  audience?: string;
  keywords?: string[];
  topics?: string[];
  competitors?: Array<{ name: string; url: string }>;
  brandScore?: number;
  visibilityPotential?: string;
  categoryRanking?: string;
}

const ONBOARDING_STORAGE_KEY = "unifr_onboarding_data";

export function saveOnboardingData(data: Partial<OnboardingData>) {
  const existing = getOnboardingData();
  const updated = { ...existing, ...data };
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getOnboardingData(): OnboardingData {
  const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function clearOnboardingData() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("No session found");
      return false;
    }

    console.log("Checking onboarding completion for user:", session.user.id);

    // Check if user has any brands
    // Try to select onboarding_completed, but handle case where column might not exist
    const { data: brands, error } = await supabase
      .from("brands")
      .select("id, onboarding_completed")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking onboarding:", error);
      // If error is about column not existing, try without it
      if (error.message?.includes("onboarding_completed") || error.code === "PGRST204") {
        console.log("onboarding_completed column might not exist, checking brands only");
        const { data: brandsFallback, error: fallbackError } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);
        
        if (fallbackError) {
          console.error("Error checking brands:", fallbackError);
          return false;
        }
        
        const hasBrands = brandsFallback && brandsFallback.length > 0;
        console.log("Onboarding check (fallback):", hasBrands);
        return hasBrands;
      }
      return false;
    }

    // If no brands exist, onboarding is not complete
    if (!brands || brands.length === 0) {
      console.log("No brands found for user");
      return false;
    }

    const brand = brands[0];
    console.log("Brand found:", { id: brand.id, onboarding_completed: brand.onboarding_completed });

    // If onboarding_completed column exists and is set, use it
    if (brand.onboarding_completed !== undefined && brand.onboarding_completed !== null) {
      const isComplete = brand.onboarding_completed === true;
      console.log("Onboarding completion status:", isComplete);
      return isComplete;
    }

    // Fallback: if brands exist but onboarding_completed is not set, assume complete
    // (for backwards compatibility with existing brands)
    console.log("onboarding_completed not set, assuming complete (brands exist)");
    return true;
  } catch (error) {
    console.error("Error in checkOnboardingComplete:", error);
    return false;
  }
}

