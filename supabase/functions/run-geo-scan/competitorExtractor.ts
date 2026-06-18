export const STOPWORDS = new Set([
  "for", "this", "that", "the", "its", "it's", "their", "they", "them", "these", "those",
  "other", "some", "while", "recently", "however", "october", "november", "december",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "india", "know", "your", "brand", "platforms", "startup", "startups", "founders",
  "companies", "ecosystem", "also", "including", "such", "like", "similar", "alternatives",
  "competitors", "competitor", "and", "or", "but", "with", "from", "into", "onto", "upon"
]);

export function cleanCompetitorName(name: string): string | null {
  if (!name || typeof name !== 'string') return null;

  // Remove emojis
  let cleaned = name.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  // Replace non-word characters (except space and dash) with space
  cleaned = cleaned.replace(/[^\w\s-]/g, ' ').trim();
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (cleaned.length < 3) return null;

  const lower = cleaned.toLowerCase();
  if (STOPWORDS.has(lower)) return null;
  if (/^\d+$/.test(cleaned)) return null;

  // Title case formatting
  cleaned = cleaned
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word; // Preserve camelCase (e.g. SupaBase)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return cleaned;
}

export function extractCompetitors(text: string, competitorNames: string[], brandName: string): string[] {
  if (!text || !competitorNames || competitorNames.length === 0) return [];

  const found = new Set<string>();
  const brandLower = brandName.toLowerCase();

  competitorNames.forEach(compName => {
    if (!compName || typeof compName !== 'string') return;
    
    const cleanedCompName = cleanCompetitorName(compName);
    if (!cleanedCompName || cleanedCompName.toLowerCase() === brandLower) return;

    // Build regex to search for competitor name in the response
    const compLower = cleanedCompName.toLowerCase();
    const escaped = compLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');

    if (regex.test(text)) {
      found.add(cleanedCompName);
    }
  });

  return Array.from(found);
}
