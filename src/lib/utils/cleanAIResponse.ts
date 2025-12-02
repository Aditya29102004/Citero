/**
 * Clean AI responses to remove brand description echoing, boilerplate, and duplicates
 */

const BOILERPLATE_PATTERNS = [
  /^As of my last update[^.]*\./i,
  /^I don't have (real-time|current|up-to-date|the latest) information[^.]*\./i,
  /^I don't have access to[^.]*\./i,
  /^Based on (the|available) information[^.]*\./i,
  /^According to (my|available) (knowledge|data|information)[^.]*\./i,
  /^Please note that[^.]*\./i,
  /^It's important to note[^.]*\./i,
  /^Keep in mind that[^.]*\./i,
];

const BRAND_DESCRIPTION_PATTERNS = [
  // Common patterns like "BrandName is a platform that..."
  /^[A-Z][a-zA-Z\s]+ is (a|an) (platform|service|company|tool|solution|product|application|website|app)[^.]*\./i,
  // "BrandName connects..." or "BrandName helps..."
  /^[A-Z][a-zA-Z\s]+ (connects|helps|enables|provides|offers|allows)[^.]*\./i,
];

/**
 * Remove brand description echoing from response (works for both questions and responses)
 */
function removeBrandDescriptionEcho(response: string, brandName: string): string {
  if (!brandName || !response) return response;
  
  const brandLower = brandName.toLowerCase();
  let cleaned = response;
  
  // Remove full brand description pattern (common in questions)
  const fullDescriptionPatterns = [
    new RegExp(`${brandName}\\s+is\\s+(a|an)\\s+(platform|service|company|tool|solution|product|application|website|app)\\s+that\\s+connects[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+is\\s+(a|an)\\s+(platform|service|company|tool|solution|product|application|website|app)[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+connects[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+helps[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+enables[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+provides[^.!?]*`, 'gi'),
    new RegExp(`${brandName}\\s+offers[^.!?]*`, 'gi'),
  ];
  
  fullDescriptionPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  
  // Also remove common full descriptions
  const commonDescriptions = [
    'serves as a startup directory',
    'where users can find cofounders',
    'secure funding',
    'join a community',
    'focused on non-tech ventures',
    'addresses the challenge of networking',
    'collaboration among non-tech founders',
  ];
  
  commonDescriptions.forEach(desc => {
    const regex = new RegExp(desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '').trim();
  });
  
  // Split into sentences and filter
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Remove sentences that start with brand name and describe it
  const filtered = sentences.filter(sentence => {
    const sentenceLower = sentence.trim().toLowerCase();
    
    // Skip if sentence starts with brand name followed by description words
    if (sentenceLower.startsWith(brandLower)) {
      const afterBrand = sentenceLower.substring(brandName.length).trim();
      if (
        afterBrand.startsWith(' is ') ||
        afterBrand.startsWith(' is a ') ||
        afterBrand.startsWith(' is an ') ||
        afterBrand.startsWith(' connects ') ||
        afterBrand.startsWith(' helps ') ||
        afterBrand.startsWith(' enables ') ||
        afterBrand.startsWith(' provides ') ||
        afterBrand.startsWith(' offers ') ||
        afterBrand.startsWith(' serves ')
      ) {
        return false; // Remove this sentence
      }
    }
    
    // Check for brand description patterns
    for (const pattern of BRAND_DESCRIPTION_PATTERNS) {
      if (pattern.test(sentence.trim())) {
        // Only remove if it contains the brand name
        if (sentenceLower.includes(brandLower)) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  return filtered.join('. ').trim();
}

/**
 * Remove boilerplate disclaimers from response
 */
function removeBoilerplate(response: string): string {
  let cleaned = response;
  
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  
  return cleaned;
}

/**
 * Truncate response to first 2-3 sentences max
 */
function truncateToSentences(response: string, maxSentences: number = 3): string {
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, maxSentences).join('. ').trim();
}

/**
 * Extract the actual answer content (remove prefacing)
 */
function extractActualAnswer(response: string): string {
  // Look for common answer starters
  const answerStarters = [
    /^(Here|Here are|Here is|Here's|These are|This is|This includes|Some|Several|Many|A few|A number of)/i,
  ];
  
  // If response starts with a question, remove it
  if (response.trim().endsWith('?')) {
    const lines = response.split('\n');
    // Remove first line if it's a question
    if (lines[0] && lines[0].trim().endsWith('?')) {
      return lines.slice(1).join('\n').trim();
    }
  }
  
  return response;
}

/**
 * Clean AI response: remove brand descriptions, boilerplate, truncate
 */
export function cleanAIResponse(
  response: string,
  brandName?: string,
  options: {
    removeBrandDescription?: boolean;
    removeBoilerplate?: boolean;
    truncate?: boolean;
    maxSentences?: number;
  } = {}
): string {
  const {
    removeBrandDescription = true,
    removeBoilerplate: shouldRemoveBoilerplate = true,
    truncate = true,
    maxSentences = 3,
  } = options;
  
  if (!response || typeof response !== 'string') {
    return '';
  }
  
  let cleaned = response.trim();
  
  // Step 1: Extract actual answer
  cleaned = extractActualAnswer(cleaned);
  
  // Step 2: Remove brand description echoing
  if (removeBrandDescription && brandName) {
    cleaned = removeBrandDescriptionEcho(cleaned, brandName);
  }
  
  // Step 3: Remove boilerplate
  if (shouldRemoveBoilerplate) {
    cleaned = removeBoilerplate(cleaned);
  }
  
  // Step 4: Truncate to first few sentences
  if (truncate) {
    cleaned = truncateToSentences(cleaned, maxSentences);
  }
  
  return cleaned.trim();
}

/**
 * Normalize text for comparison
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove all punctuation
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Extract key words from text (remove stopwords, keep meaningful words)
 */
function extractKeyWords(text: string, minLength: number = 4): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will', 'shall',
    'some', 'many', 'more', 'most', 'very', 'much', 'too', 'also', 'just', 'only'
  ]);
  
  return normalizeForComparison(text)
    .split(/\s+/)
    .filter(word => word.length >= minLength && !stopwords.has(word))
    .slice(0, 15); // Take first 15 meaningful words
}

/**
 * Calculate similarity between two strings using word-based matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeForComparison(str1);
  const normalized2 = normalizeForComparison(str2);
  
  if (normalized1.length === 0 || normalized2.length === 0) return 0;
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Check if one contains the other (high similarity)
  const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
  const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;
  
  if (longer.includes(shorter) && shorter.length / longer.length > 0.65) {
    return 0.85;
  }
  
  // Word-based similarity
  const words1 = extractKeyWords(str1);
  const words2 = extractKeyWords(str2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const words1Set = new Set(words1);
  const words2Set = new Set(words2);
  
  // Count matching words
  const matching = words1.filter(w => words2Set.has(w)).length;
  const totalUnique = new Set([...words1, ...words2]).size;
  
  // Jaccard similarity
  const jaccard = matching / totalUnique;
  
  // Also check if most words match (for shorter texts)
  const wordOverlap = matching / Math.min(words1.length, words2.length);
  
  // Return higher of the two metrics
  return Math.max(jaccard, wordOverlap * 0.8);
}

/**
 * Check if response is a duplicate based on cleaned content
 */
export function isDuplicateResponse(
  response1: string,
  response2: string,
  brandName?: string
): boolean {
  const cleaned1 = cleanAIResponse(response1, brandName, { truncate: true, maxSentences: 2 });
  const cleaned2 = cleanAIResponse(response2, brandName, { truncate: true, maxSentences: 2 });
  
  if (cleaned1.length === 0 || cleaned2.length === 0) return false;
  
  // Normalize both responses
  const norm1 = normalizeForComparison(cleaned1);
  const norm2 = normalizeForComparison(cleaned2);
  
  // Exact match after normalization
  if (norm1 === norm2 && norm1.length > 30) return true;
  
  // Calculate similarity using improved algorithm
  const similarity = calculateSimilarity(cleaned1, cleaned2);
  
  // More aggressive: consider duplicates if similarity > 60%
  if (similarity > 0.60) return true;
  
  // Check if first 60 chars match exactly (after normalization)
  const short1 = norm1.substring(0, 60);
  const short2 = norm2.substring(0, 60);
  if (short1.length > 25 && short1 === short2) return true;
  
  // Check if key words match (at least 4 matching words out of first 8)
  const words1 = extractKeyWords(cleaned1, 3).slice(0, 8);
  const words2 = extractKeyWords(cleaned2, 3).slice(0, 8);
  if (words1.length >= 4 && words2.length >= 4) {
    const matchingWords = words1.filter(w => words2.includes(w));
    if (matchingWords.length >= 4) return true;
  }
  
  // Check if responses start with same words (common pattern for duplicates)
  const start1 = words1.slice(0, 3).join(' ');
  const start2 = words2.slice(0, 3).join(' ');
  if (start1.length > 10 && start1 === start2) return true;
  
  return false;
}

/**
 * Create a fingerprint for a response to detect near-duplicates
 */
export function createResponseFingerprint(response: string, brandName?: string): string {
  const cleaned = cleanAIResponse(response, brandName, { truncate: true, maxSentences: 2 });
  
  // Extract key words (remove stopwords)
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will', 'shall'
  ]);
  
  const words = cleaned
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopwords.has(word))
    .slice(0, 10) // Take first 10 meaningful words
    .sort()
    .join(' ');
  
  return words;
}

/**
 * Check if response contains meaningful brand reference
 */
export function hasBrandReference(response: string, brandName: string): boolean {
  if (!brandName || !response) return false;
  
  const brandLower = brandName.toLowerCase();
  const responseLower = response.toLowerCase();
  
  // Check if brand name appears
  if (responseLower.includes(brandLower)) return true;
  
  // Check for positioning/competitive context keywords
  const contextKeywords = [
    'compared to',
    'alternative to',
    'similar to',
    'competitor',
    'competition',
    'market',
    'industry',
    'positioning',
    'differentiator',
  ];
  
  return contextKeywords.some(keyword => responseLower.includes(keyword));
}

