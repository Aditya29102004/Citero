/**
 * Comprehensive Competitor Analysis Utilities
 * Handles competitor extraction, cleaning, ranking, visibility calculation, and trend analysis
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
  'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will', 'shall',
  'some', 'many', 'more', 'most', 'very', 'much', 'too', 'also', 'just', 'only',
  'for', 'this', 'that', 'its', 'they', 'them', 'these', 'those', 'other', 'some',
  'while', 'recently', 'however', 'startup', 'startups', 'founders', 'companies', 'ecosystem',
  'platform', 'platforms', 'service', 'services', 'tool', 'tools', 'solution', 'solutions'
]);

/**
 * Clean and normalize competitor name
 */
export function cleanCompetitorName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;
  
  // Remove emojis
  let cleaned = name.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  
  // Remove punctuation except hyphens and spaces
  cleaned = cleaned.replace(/[^\w\s-]/g, ' ').trim();
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Check length
  if (cleaned.length < 3) return null;
  
  // Check if it's a stopword
  const lower = cleaned.toLowerCase();
  if (STOPWORDS.has(lower)) return null;
  
  // Check if it's numbers only
  if (/^\d+$/.test(cleaned)) return null;
  
  // Capitalize first letter of each word
  cleaned = cleaned
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      // Handle camelCase (e.g., "AngelList" stays "AngelList")
      if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word;
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return cleaned;
}

/**
 * Extract competitors from AI response using regex matching
 */
export function extractCompetitorsFromResponse(
  response: string,
  competitorNames: string[],
  brandName: string
): string[] {
  if (!response || !competitorNames.length) return [];
  
  const found: string[] = [];
  
  competitorNames.forEach(compName => {
    if (!compName) return;
    
    const compLower = compName.toLowerCase();
    // Use word boundary regex to match exact competitor name
    const regex = new RegExp(`\\b${compLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    if (regex.test(response)) {
      // Include all competitors (including brand if it's in the list)
      found.push(compName);
    }
  });
  
  return found;
}

/**
 * Calculate visibility score for a competitor
 */
export function calculateVisibilityScore(
  competitorMentions: number,
  totalMentionsAcrossAllCompetitors: number
): number {
  if (totalMentionsAcrossAllCompetitors === 0) return 0;
  return (competitorMentions / totalMentionsAcrossAllCompetitors) * 100;
}

/**
 * Calculate citation share for a competitor
 */
export function calculateCitationShare(
  competitorMentions: number,
  totalMentionsInResponses: number
): number {
  if (totalMentionsInResponses === 0) return 0;
  return (competitorMentions / totalMentionsInResponses) * 100;
}

/**
 * Calculate sentiment-weighted score
 */
export function calculateSentimentWeightedScore(
  positiveMentions: number,
  neutralMentions: number,
  negativeMentions: number
): number {
  const weighted = (positiveMentions * 1) + (neutralMentions * 0.5) + (negativeMentions * -1);
  const total = positiveMentions + neutralMentions + negativeMentions;
  
  if (total === 0) return 50; // Neutral score if no mentions
  
  // Normalize to 0-100
  const normalized = ((weighted / total) + 1) * 50;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Merge initial competitors with AI-extracted competitors
 */
export function mergeCompetitors(
  initialCompetitors: string[],
  aiExtractedCompetitors: string[]
): string[] {
  const merged = new Set<string>();
  
  // Add initial competitors first (they take priority)
  initialCompetitors.forEach(comp => {
    const cleaned = cleanCompetitorName(comp);
    if (cleaned) merged.add(cleaned);
  });
  
  // Add AI-extracted competitors (avoid duplicates)
  aiExtractedCompetitors.forEach(comp => {
    const cleaned = cleanCompetitorName(comp);
    if (cleaned && !merged.has(cleaned)) {
      // Check for case-insensitive duplicates
      const lower = cleaned.toLowerCase();
      const isDuplicate = Array.from(merged).some(existing => existing.toLowerCase() === lower);
      if (!isDuplicate) {
        merged.add(cleaned);
      }
    }
  });
  
  return Array.from(merged);
}

/**
 * Rank competitors with no ties
 */
export interface CompetitorMetrics {
  name: string;
  visibilityScore: number;
  citationShare: number;
  sentimentWeighted: number;
  mentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
}

export function rankCompetitors(competitors: CompetitorMetrics[]): Array<CompetitorMetrics & { rank: number }> {
  // Sort by: visibility DESC, citationShare DESC, sentimentWeighted DESC
  const sorted = [...competitors].sort((a, b) => {
    // Primary: visibility
    if (Math.abs(a.visibilityScore - b.visibilityScore) > 0.01) {
      return b.visibilityScore - a.visibilityScore;
    }
    // Secondary: citation share
    if (Math.abs(a.citationShare - b.citationShare) > 0.01) {
      return b.citationShare - a.citationShare;
    }
    // Tertiary: sentiment weighted
    if (Math.abs(a.sentimentWeighted - b.sentimentWeighted) > 0.01) {
      return b.sentimentWeighted - a.sentimentWeighted;
    }
    // Tie-breaker: name (alphabetical) to ensure no ties
    return a.name.localeCompare(b.name);
  });
  
  // Assign ranks (no ties - use index + 1)
  return sorted.map((comp, index) => ({
    ...comp,
    rank: index + 1,
  }));
}

/**
 * Calculate trend (rising, falling, stable)
 */
export function calculateTrend(
  currentVisibility: number,
  previousVisibility: number
): 'rising' | 'falling' | 'stable' {
  const diff = currentVisibility - previousVisibility;
  const threshold = 2; // 2% change threshold
  
  if (diff > threshold) return 'rising';
  if (diff < -threshold) return 'falling';
  return 'stable';
}

/**
 * Filter out nonsense competitors
 */
export function filterNonsenseCompetitors(
  competitors: CompetitorMetrics[],
  scanCount: number,
  minVisibility: number = 1,
  minScans: number = 3
): CompetitorMetrics[] {
  return competitors.filter(comp => {
    // Remove if visibility under threshold for multiple scans
    if (scanCount >= 5 && comp.visibilityScore < minVisibility) return false;
    
    // Remove if sentiment weighted score too negative
    if (comp.sentimentWeighted < -20) return false;
    
    // Remove if no mentions after multiple scans
    if (scanCount >= minScans && comp.mentions === 0) return false;
    
    // Remove if name too short
    if (comp.name.length < 3) return false;
    
    return true;
  });
}

