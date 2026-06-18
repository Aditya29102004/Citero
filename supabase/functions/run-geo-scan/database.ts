import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export function createSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function fetchBrand(supabase: any, brandId: string) {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .single();

  if (error || !data) {
    throw new Error(`Brand not found: ${error?.message || "Unknown error"}`);
  }
  return data;
}

export async function getNextScanNumber(supabase: any, brandId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_next_scan_number", { p_brand_id: brandId });
  if (error) {
    throw new Error(`Failed to generate scan number: ${error.message}`);
  }
  return data;
}

export async function createPendingScan(
  supabase: any,
  brandId: string,
  userId: string,
  totalQuestions: number,
  aiProvider: string
) {
  const { data, error } = await supabase
    .from("scans")
    .insert({
      brand_id: brandId,
      user_id: userId,
      status: "pending",
      total_questions: totalQuestions,
      completed_questions: 0,
      ai_provider: aiProvider,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert pending scan: ${error?.message || "Unknown error"}`);
  }
  return data;
}

export async function fetchNextScanJob(supabase: any) {
  const { data, error } = await supabase.rpc("process_next_scan");
  if (error) {
    console.error("Error running process_next_scan RPC:", error);
    return null;
  }
  if (data && data.length > 0) {
    return data[0];
  }
  return null;
}

export async function updateScanProgress(supabase: any, scanId: string, completedQuestions: number) {
  await supabase
    .from("scans")
    .update({ completed_questions: completedQuestions })
    .eq("id", scanId);
}

export async function storeScanResponse(
  supabase: any,
  scanId: string,
  brandId: string,
  userId: string,
  question: string,
  aiResponse: string,
  brandMentioned: boolean,
  sentiment: string,
  mentionedBrands: string[] = []
) {
  const { error } = await supabase
    .from("scan_responses")
    .insert({
      scan_id: scanId,
      brand_id: brandId,
      user_id: userId,
      question_template: question,
      question_text: question,
      ai_response: aiResponse,
      brand_mentioned: brandMentioned,
      sentiment: sentiment,
      mentioned_brands: mentionedBrands,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error storing response:", error);
  }
}

export async function updateResponseCompetitors(
  supabase: any,
  scanId: string,
  question: string,
  competitors: string[]
) {
  await supabase
    .from("scan_responses")
    .update({ mentioned_brands: competitors })
    .eq("scan_id", scanId)
    .eq("question_text", question);
}


export async function storeSourceCitations(
  supabase: any,
  brandId: string,
  scanId: string,
  domainCounts: Record<string, number>
) {
  for (const [domain, count] of Object.entries(domainCounts)) {
    try {
      const { data: existingSource } = await supabase
        .from("source_citations")
        .select("id, mention_count")
        .eq("brand_id", brandId)
        .eq("domain", domain)
        .maybeSingle();

      if (existingSource) {
        await supabase
          .from("source_citations")
          .update({
            mention_count: existingSource.mention_count + count,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSource.id);
      } else {
        const sourceName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        let category = 'general source';
        if (domain.includes('.edu')) category = 'educational';
        else if (domain.includes('medium.com') || domain.includes('blog')) category = 'blog';
        else if (domain.includes('news') || domain.includes('times') || domain.includes('forbes')) category = 'news';
        else if (domain.includes('youtube')) category = 'video';
        else if (domain.includes('crunchbase') || domain.includes('angel.co')) category = 'business directory';

        await supabase.from("source_citations").insert({
          brand_id: brandId,
          domain: domain,
          name: sourceName,
          mention_count: count,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          category: category,
        });
      }

      await supabase.from("source_citations_history").insert({
        brand_id: brandId,
        domain: domain,
        scan_id: scanId,
        daily_mentions: count,
      });
    } catch (e) {
      console.error(`Error storing source citation for ${domain}:`, e);
    }
  }
}

export async function storeCompetitorVisibilityHistory(
  supabase: any,
  brandId: string,
  scanId: string,
  competitorMetrics: Record<string, { mentions: number; citations: number; positive: number; neutral: number; negative: number }>
) {
  const totalQueries = 15; // static count
  for (const [name, metrics] of Object.entries(competitorMetrics)) {
    const visibilityScore = (metrics.mentions / totalQueries) * 100;
    const citationShare = (metrics.citations / totalQueries) * 100;
    const sentimentWeighted = ((metrics.positive * 1 + metrics.neutral * 0.5 + metrics.negative * -1) / (metrics.mentions || 1) + 1) * 50;

    await supabase.from("competitor_visibility_history").insert({
      brand_id: brandId,
      competitor_name: name,
      scan_id: scanId,
      visibility_score: visibilityScore,
      citation_share: citationShare,
      sentiment_weighted_score: sentimentWeighted,
      mentions: metrics.mentions,
      positive_mentions: metrics.positive,
      neutral_mentions: metrics.neutral,
      negative_mentions: metrics.negative,
    });
  }
}

export async function insertScanResults(
  supabase: any,
  brandId: string,
  scanNumber: number,
  brandVisibility: number,
  citationShare: number,
  sentimentPositive: number,
  sentimentNeutral: number,
  sentimentNegative: number,
  competitorScores: any,
  citationSources: any,
  platform: string
) {
  const { error } = await supabase.rpc("insert_ai_scan_result", {
    p_brand_id: brandId,
    p_scan_number: scanNumber,
    p_visibility_score: brandVisibility,
    p_citation_share: citationShare,
    p_sentiment_positive: sentimentPositive,
    p_sentiment_neutral: sentimentNeutral,
    p_sentiment_negative: sentimentNegative,
    p_competitor_scores: competitorScores,
    p_citation_sources: citationSources,
    p_platform: platform,
  });

  if (error) {
    console.error("Failed to insert ai_scan_results via RPC:", error);
  }
}

export async function completeScan(
  supabase: any,
  scanId: string,
  completedQuestions: number,
  visibilityScore: number,
  insights: any
) {
  await supabase
    .from("scans")
    .update({
      status: "completed",
      completed_questions: completedQuestions,
      completed_at: new Date().toISOString(),
      visibility_score: visibilityScore,
      actionable_recommendations: insights.actionable_recommendations || null,
      strengths_and_gaps: insights.strengths_and_gaps || null,
      content_ideas: insights.content_ideas || null,
    })
    .eq("id", scanId);
}

export async function failScan(supabase: any, scanId: string, errorMessage: string) {
  await supabase
    .from("scans")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      ai_summary: `Error: ${errorMessage}`
    })
    .eq("id", scanId);
}
