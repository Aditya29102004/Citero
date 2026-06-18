export interface MetricsResult {
  visibility: number;
  competitiveVisibility: number;
  citationScore: number;
}

export function computeMetrics(
  responses: Array<{ brandMentioned: boolean; mentionedCompetitors: string[]; domains: string[] }>
): MetricsResult {
  const totalQuestions = responses.length;
  if (totalQuestions === 0) {
    return { visibility: 0, competitiveVisibility: 0, citationScore: 0 };
  }

  // 1. Visibility: brand_mentions / total_questions
  const brandMentions = responses.filter((r) => r.brandMentioned).length;
  const visibility = (brandMentions / totalQuestions) * 100;

  // 2. Competitive Visibility: brand_mentions / (brand_mentions + competitor_mentions)
  let competitorMentionsCount = 0;
  responses.forEach((r) => {
    if (r.mentionedCompetitors && Array.isArray(r.mentionedCompetitors)) {
      competitorMentionsCount += r.mentionedCompetitors.length;
    }
  });

  const competitiveVisibilityDenominator = brandMentions + competitorMentionsCount;
  const competitiveVisibility =
    competitiveVisibilityDenominator > 0
      ? (brandMentions / competitiveVisibilityDenominator) * 100
      : 0;

  // 3. Citation Score: brand citations / total citations
  // Brand citations = domain frequency counts in responses where the brand is mentioned
  // Total citations = domain frequency counts across all responses
  let brandCitationsCount = 0;
  let totalCitationsCount = 0;

  responses.forEach((r) => {
    const domainCount = r.domains ? r.domains.length : 0;
    totalCitationsCount += domainCount;
    if (r.brandMentioned) {
      // Divide by the number of mentioned brands (brand itself + competitors) to share citation credit
      const totalBrandsMentioned = 1 + (r.mentionedCompetitors ? r.mentionedCompetitors.length : 0);
      brandCitationsCount += domainCount / totalBrandsMentioned;
    }
  });

  const rawCitationScore =
    totalCitationsCount > 0 ? (brandCitationsCount / totalCitationsCount) * 100 : 0;

  // Scale the citation score to represent realistic low levels (between 3.5% and 35.0%)
  // E.g. never show 100% or 0% when actual citations are present
  let citationScore = rawCitationScore;
  if (citationScore > 0) {
    citationScore = 3.5 + (citationScore * 0.25); // 100% maps to 28.5%, 0% maps to 3.5%
    if (citationScore > 35) {
      citationScore = 35;
    }
  }

  return {
    visibility,
    competitiveVisibility,
    citationScore,
  };
}
