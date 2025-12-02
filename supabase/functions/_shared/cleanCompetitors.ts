/**
 * Strict competitor cleaning and validation utility
 * Ensures only real brand names are stored, no garbage tokens
 */

const STOPWORDS = new Set([
  "for", "this", "that", "the", "its", "it's", "their", "they", "them", "these", "those",
  "other", "some", "while", "recently", "however", "october", "november", "december",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "india", "know", "your", "brand", "platforms", "startup", "startups", "founders",
  "companies", "ecosystem", "also", "including", "such", "like", "similar", "alternatives",
  "competitors", "competitor", "and", "or", "but", "with", "from", "into", "onto", "upon"
]);

/**
 * Clean and validate competitor names
 * Returns cleaned array of valid competitor names
 */
export function cleanCompetitors(rawList: any): string[] {
  // Step 1: Ensure rawList is an ARRAY
  let competitors: string[] = [];
  
  if (Array.isArray(rawList)) {
    competitors = rawList;
  } else if (typeof rawList === 'string') {
    // Try to parse JSON string
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        competitors = parsed;
      } else if (parsed.competitors && Array.isArray(parsed.competitors)) {
        competitors = parsed.competitors;
      } else {
        return [];
      }
    } catch {
      // Not JSON, try splitting by comma
      competitors = rawList.split(',').map((s: string) => s.trim());
    }
  } else if (rawList && typeof rawList === 'object' && rawList.competitors) {
    competitors = Array.isArray(rawList.competitors) ? rawList.competitors : [];
  } else {
    return [];
  }

  // Step 2: Filter invalid entries
  const cleaned = competitors
    .map((name: any) => {
      // Extract name if it's an object with name property
      let competitorName = typeof name === 'string' ? name : (name?.name || name?.title || String(name));
      
      if (!competitorName || typeof competitorName !== 'string') {
        return null;
      }
      
      return competitorName.trim();
    })
    .filter((name: string | null): name is string => {
      if (!name) return false;
      
      // a) length < 3
      if (name.length < 3) return false;
      
      // b) contains numbers only
      if (/^\d+$/.test(name)) return false;
      
      // c) in STOPWORD list
      const lowerName = name.toLowerCase().trim();
      if (STOPWORDS.has(lowerName)) return false;
      
      // d) contains punctuation except hyphens and spaces
      if (/[^\w\s-]/.test(name)) return false;
      
      // e) all lowercase AND in english stopwords
      if (name === lowerName && STOPWORDS.has(lowerName)) return false;
      
      // Additional checks: reject common non-brand words
      const commonNonBrands = ['some', 'many', 'several', 'various', 'different', 'multiple'];
      if (commonNonBrands.includes(lowerName)) return false;
      
      // Reject single words that are too generic
      if (name.split(/\s+/).length === 1 && name.length < 4) {
        // Single short words are likely not brands
        return false;
      }
      
      return true;
    })
    .map((name: string) => {
      // Step 3: Capitalize first letter of each word
      return name
        .split(/\s+/)
        .map(word => {
          if (word.length === 0) return word;
          // Handle camelCase (e.g., "AngelList" stays "AngelList")
          if (/^[A-Z][a-z]+[A-Z]/.test(word)) return word;
          // Capitalize first letter
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    })
    .filter((name: string, index: number, self: string[]) => {
      // Step 4: Deduplicate (case-insensitive)
      return self.findIndex(n => n.toLowerCase() === name.toLowerCase()) === index;
    })
    .slice(0, 10); // Step 5: Limit to max 10 clean competitors

  return cleaned;
}

/**
 * Fallback competitor list for Indian startup ecosystem
 */
export const FALLBACK_COMPETITORS = [
  "AngelList",
  "Startup India",
  "YourStory",
  "LetsVenture",
  "F6S"
];

/**
 * Validate if a competitor list is valid
 * Returns true if list has at least one valid competitor
 */
export function isValidCompetitorList(competitors: string[]): boolean {
  return competitors.length > 0 && competitors.every(name => {
    const lowerName = name.toLowerCase().trim();
    return name.length >= 3 && 
           !STOPWORDS.has(lowerName) && 
           !/^\d+$/.test(name) &&
           !/[^\w\s-]/.test(name);
  });
}

