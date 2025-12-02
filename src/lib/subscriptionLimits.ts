import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionLimits {
  planType: 'basic' | 'pro' | 'enterprise' | null;
  isFounder: boolean;
  scansPerMonth: number;
  competitorComparisons: number;
  topSourceInsights: number;
  emailReportsPerWeek: number;
  auditsPerMonth: number;
  promptSimulatorRunsPerMonth: number;
  blogGenerationsPerMonth: number;
  allowedAIProviders: string[];
  hasAdvancedGEOInsights: boolean;
  hasMultiUserDashboard: boolean;
  seatsAllowed: number;
}

export const PLAN_LIMITS: Record<'basic' | 'pro' | 'enterprise', Omit<SubscriptionLimits, 'planType' | 'isFounder'>> = {
  basic: {
    scansPerMonth: 50,
    competitorComparisons: 3,
    topSourceInsights: 5,
    emailReportsPerWeek: 1,
    auditsPerMonth: 5,
    promptSimulatorRunsPerMonth: 3,
    blogGenerationsPerMonth: 5,
    allowedAIProviders: ['openai', 'gemini'], // GPT-4o or Gemini only
    hasAdvancedGEOInsights: false,
    hasMultiUserDashboard: false,
    seatsAllowed: 1,
  },
  pro: {
    scansPerMonth: 200,
    competitorComparisons: 10,
    topSourceInsights: 10, // Assuming Pro gets more insights
    emailReportsPerWeek: 1,
    auditsPerMonth: 5,
    promptSimulatorRunsPerMonth: 3,
    blogGenerationsPerMonth: 5,
    allowedAIProviders: ['openai', 'gemini', 'deepseek', 'openrouter'], // All providers
    hasAdvancedGEOInsights: true,
    hasMultiUserDashboard: true,
    seatsAllowed: 5,
  },
  enterprise: {
    scansPerMonth: Infinity, // Unlimited
    competitorComparisons: Infinity, // Unlimited
    topSourceInsights: Infinity, // Unlimited
    emailReportsPerWeek: Infinity, // Unlimited
    auditsPerMonth: Infinity, // Unlimited
    promptSimulatorRunsPerMonth: 3,
    blogGenerationsPerMonth: 5,
    allowedAIProviders: ['openai', 'gemini', 'deepseek', 'openrouter'], // All providers
    hasAdvancedGEOInsights: true,
    hasMultiUserDashboard: true,
    seatsAllowed: Infinity, // Unlimited
  },
};

/**
 * Get user's subscription limits
 */
export async function getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  let subscription: any = null;
  
  try {
    // First, try to get an active subscription
    // Select only core columns that definitely exist to avoid 400 errors
    let { data: activeSub, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_type, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Handle errors gracefully
    if (error) {
      // If it's a "not found" error, that's expected
      if (error.code === 'PGRST116') {
        // No subscription found - this is normal
        subscription = null;
      } else {
        console.error("Error fetching active subscription:", error);
        // Continue to try other queries
      }
    } else if (activeSub) {
      subscription = activeSub;
    }

    // Only active subscriptions grant access
    // Don't check for pending/cancelled/expired subscriptions - they don't grant access
    // If no active subscription was found above, subscription remains null
  } catch (err) {
    console.error("Unexpected error in getUserSubscriptionLimits:", err);
  }

  // If still no subscription found, return null limits (free tier)
  if (!subscription) {
    console.log("No subscription found for user:", userId, "- returning free tier limits");
    return {
      planType: null,
      auditsPerMonth: 0,
      isFounder: false,
      scansPerMonth: 0,
      competitorComparisons: 0,
      topSourceInsights: 0,
      emailReportsPerWeek: 0,
      promptSimulatorRunsPerMonth: 0,
      blogGenerationsPerMonth: 0,
      allowedAIProviders: [],
      hasAdvancedGEOInsights: false,
      hasMultiUserDashboard: false,
      seatsAllowed: 0,
    };
  }

  const planType = subscription.plan_type as 'basic' | 'pro' | 'enterprise';
  
  if (!planType || !PLAN_LIMITS[planType]) {
    console.error("Invalid plan type:", planType, "for subscription:", subscription);
    return {
      planType: null,
      isFounder: false,
      scansPerMonth: 0,
      competitorComparisons: 0,
      topSourceInsights: 0,
      emailReportsPerWeek: 0,
      auditsPerMonth: 0,
      promptSimulatorRunsPerMonth: 0,
      blogGenerationsPerMonth: 0,
      allowedAIProviders: [],
      hasAdvancedGEOInsights: false,
      hasMultiUserDashboard: false,
      seatsAllowed: 0,
    };
  }
  
  const limits = PLAN_LIMITS[planType];
  
  // Get is_founder and seats_allowed if they exist (columns may not exist if migration hasn't run)
  // Default values: is_founder = false, seats_allowed based on plan type
  const isFounder = subscription.is_founder !== undefined ? subscription.is_founder : false;
  const seatsAllowed = subscription.seats_allowed !== undefined 
    ? subscription.seats_allowed 
    : (planType === 'pro' ? 5 : 1);
  
  console.log("Subscription limits found:", { planType, status: subscription.status, scansPerMonth: limits.scansPerMonth, auditsPerMonth: limits.auditsPerMonth, isFounder, seatsAllowed });

  return {
    planType,
    isFounder,
    seatsAllowed,
    auditsPerMonth: limits.auditsPerMonth || 5,
    ...limits,
  };
}

/**
 * Get user's scan usage for current month
 */
export async function getUserScanUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { count, error } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", startOfMonth.toISOString())
    .lte("started_at", endOfMonth.toISOString());

  if (error) {
    console.error("Error fetching scan usage:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get user's competitor comparison usage for current month
 */
export async function getUserComparisonUsage(userId: string): Promise<number> {
  // For now, we'll track comparisons by counting scan comparisons
  // You may want to create a separate comparisons table later
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Count scans that have competitor comparison data
  // This is a simplified approach - you may want to track comparisons separately
  const { count, error } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("deep_insight_analysis", "is", null)
    .gte("started_at", startOfMonth.toISOString())
    .lte("started_at", endOfMonth.toISOString());

  if (error) {
    console.error("Error fetching comparison usage:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if user can run a scan
 */
export async function canRunScan(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to run scans." };
  }

  if (limits.scansPerMonth === Infinity) {
    return { allowed: true };
  }

  const usage = await getUserScanUsage(userId);
  
  if (usage >= limits.scansPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly scan limit (${limits.scansPerMonth} scans/month). Upgrade to Pro for more scans.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can run a competitor comparison
 */
export async function canRunComparison(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to run competitor comparisons." };
  }

  if (limits.competitorComparisons === Infinity) {
    return { allowed: true };
  }

  const usage = await getUserComparisonUsage(userId);
  
  if (usage >= limits.competitorComparisons) {
    return {
      allowed: false,
      reason: `You've reached your monthly competitor comparison limit (${limits.competitorComparisons} comparisons/month). Upgrade to Pro for more comparisons.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if AI provider is allowed for user's plan
 */
export async function isAIProviderAllowed(
  userId: string,
  provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to use AI providers." };
  }

  if (!limits.allowedAIProviders.includes(provider)) {
    return {
      allowed: false,
      reason: `${provider === 'openai' ? 'ChatGPT' : provider === 'gemini' ? 'Gemini' : provider.charAt(0).toUpperCase() + provider.slice(1)} is not available on your plan. Basic plan includes GPT-4o and Gemini only. Upgrade to Pro for all providers.`,
    };
  }

  return { allowed: true };
}

/**
 * Get user's audit usage for current month
 */
export async function getUserAuditUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Count unique audit runs (grouped by created_at date to count full audit runs)
  const { data, error } = await supabase
    .from("audits")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching audit usage:", error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  // Count unique audit runs by grouping audits created on the same day
  // An audit run creates multiple audit records (one per category), so we need to group by date
  const auditDates = new Set<string>();
  data.forEach(audit => {
    const date = new Date(audit.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
    auditDates.add(date);
  });

  return auditDates.size;
}

/**
 * Check if user can run an audit
 */
export async function canRunAudit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to run audits." };
  }

  if (limits.auditsPerMonth === Infinity) {
    return { allowed: true };
  }

  const usage = await getUserAuditUsage(userId);
  
  if (usage >= limits.auditsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly audit limit (${limits.auditsPerMonth} audits/month). Please wait until next month or upgrade to Enterprise for unlimited audits.`,
    };
  }

  return { allowed: true };
}

/**
 * Get user's prompt simulator usage for current month
 * Counts unique simulation runs (grouped by date to count full runs)
 */
export async function getUserPromptSimulatorUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Count unique simulation runs by grouping by date
  // A simulation run can create multiple prompt_runs records (one per prompt)
  const { data, error } = await supabase
    .from("prompt_runs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching prompt simulator usage:", error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  // Count unique simulation runs by grouping runs created on the same day
  // Multiple prompt_runs on the same day count as one simulation run
  const simulationDates = new Set<string>();
  data.forEach(run => {
    const date = new Date(run.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
    simulationDates.add(date);
  });

  return simulationDates.size;
}

/**
 * Check if user can run prompt simulator
 */
export async function canRunPromptSimulator(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to run prompt simulations." };
  }

  if (limits.promptSimulatorRunsPerMonth === Infinity) {
    return { allowed: true };
  }

  const usage = await getUserPromptSimulatorUsage(userId);
  
  if (usage >= limits.promptSimulatorRunsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly prompt simulator limit (${limits.promptSimulatorRunsPerMonth} runs/month). Please wait until next month.`,
    };
  }

  return { allowed: true };
}

/**
 * Get user's blog generation usage for current month
 */
export async function getUserBlogGenerationUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { count, error } = await supabase
    .from("blogs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString())
    .lte("created_at", endOfMonth.toISOString());

  if (error) {
    console.error("Error fetching blog generation usage:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if user can generate a blog
 */
export async function canGenerateBlog(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getUserSubscriptionLimits(userId);
  
  if (!limits.planType) {
    return { allowed: false, reason: "No active subscription. Please subscribe to generate blogs." };
  }

  if (limits.blogGenerationsPerMonth === Infinity) {
    return { allowed: true };
  }

  const usage = await getUserBlogGenerationUsage(userId);
  
  if (usage >= limits.blogGenerationsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly blog generation limit (${limits.blogGenerationsPerMonth} blogs/month). Please wait until next month.`,
    };
  }

  return { allowed: true };
}
