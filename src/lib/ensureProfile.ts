import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a profile exists for the current user
 * This is a fallback in case the database trigger didn't run
 */
export async function ensureProfile(userId: string, email?: string, name?: string): Promise<boolean> {
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    // If profile exists, we're done
    if (existingProfile && !checkError) {
      return true;
    }

    // Get user data if not provided
    if (!email || !name) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      email = email || user.email || "";
      name = name || user.user_metadata?.full_name || "";
    }

    // Create profile if it doesn't exist
    const { error: insertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: email,
          name: name || null,
        },
        {
          onConflict: 'id',
        }
      );

    if (insertError) {
      console.error("Error ensuring profile exists:", insertError);
      return false;
    }

    console.log("Profile ensured for user:", userId);
    return true;
  } catch (error) {
    console.error("Error in ensureProfile:", error);
    return false;
  }
}

