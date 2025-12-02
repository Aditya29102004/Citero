/**
 * Source Extraction and Normalization Utilities
 * Handles extraction, cleaning, and normalization of AI-cited sources
 */

const INVALID_DOMAINS = new Set([
  'this', 'that', 'these', 'those', 'they', 'them', 'their', 'founders',
  'startup', 'startups', 'companies', 'platforms', 'india', 'usa', 'uk',
  'app', 'apps', 'store', 'stores'
]);

const COUNTRY_NAMES = new Set([
  'india', 'usa', 'united states', 'uk', 'united kingdom', 'canada',
  'australia', 'germany', 'france', 'japan', 'china', 'brazil'
]);

/**
 * Normalize domain name
 */
export function normalizeDomain(url: string): { domain: string; name: string } | null {
  if (!url || typeof url !== 'string') return null;

  try {
    // Remove protocol and www
    let cleaned = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Extract domain (remove path, query, fragment)
    const domainMatch = cleaned.match(/^([^\/\?#]+)/);
    if (!domainMatch) return null;
    
    let domain = domainMatch[1].toLowerCase().trim();
    
    // Remove tracking parameters
    domain = domain.split('?')[0].split('#')[0];
    
    // Validate domain format
    if (!domain.includes('.')) return null;
    if (domain.length < 3) return null;
    if (domain.includes(' ')) return null;
    
    // Check if it's a country name
    if (COUNTRY_NAMES.has(domain)) return null;
    
    // Check if it's an invalid domain
    const domainParts = domain.split('.');
    const rootDomain = domainParts[domainParts.length - 2] || domainParts[0];
    if (INVALID_DOMAINS.has(rootDomain)) return null;
    
    // Extract root domain (e.g., "medium.com" from "blog.medium.com")
    const parts = domain.split('.');
    if (parts.length >= 2) {
      domain = parts.slice(-2).join('.');
    }
    
    // Generate name from domain (Title Case)
    const name = domain
      .split('.')
      .map(part => {
        if (part.length === 0) return part;
        // Handle camelCase domains
        if (/^[A-Z][a-z]+[A-Z]/.test(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
    
    return { domain, name };
  } catch {
    return null;
  }
}

/**
 * Classify source category based on domain
 */
export function classifySourceCategory(domain: string): string {
  const domainLower = domain.toLowerCase();
  
  if (domainLower.includes('.edu')) return 'educational';
  if (domainLower.includes('medium.com') || domainLower.includes('blog') || domainLower.includes('wordpress')) return 'blog';
  if (domainLower.includes('news') || domainLower.includes('times') || domainLower.includes('forbes') || domainLower.includes('economictimes') || domainLower.includes('reuters') || domainLower.includes('bbc') || domainLower.includes('cnn')) return 'news';
  if (domainLower.includes('youtube') || domainLower.includes('vimeo')) return 'video';
  if (domainLower.includes('crunchbase') || domainLower.includes('angel.co') || domainLower.includes('pitchbook') || domainLower.includes('linkedin')) return 'business directory';
  if (domainLower.includes('wikipedia')) return 'encyclopedia';
  if (domainLower.includes('reddit') || domainLower.includes('forum') || domainLower.includes('discussion')) return 'forum';
  if (domainLower.includes('twitter') || domainLower.includes('x.com') || domainLower.includes('facebook') || domainLower.includes('instagram')) return 'social media';
  
  return 'general source';
}

/**
 * Clean and validate source list from LLM response
 */
export function cleanSourcesFromLLM(response: string): Array<{ name: string; domain: string }> {
  const sources: Array<{ name: string; domain: string }> = [];
  
  try {
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*"sources"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.sources && Array.isArray(parsed.sources)) {
        parsed.sources.forEach((source: any) => {
          if (source.domain) {
            const normalized = normalizeDomain(source.domain);
            if (normalized) {
              sources.push({
                name: source.name || normalized.name,
                domain: normalized.domain,
              });
            }
          }
        });
      }
    }
  } catch (e) {
    // Fallback: extract URLs from response
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const urls = response.match(urlRegex) || [];
    
    urls.forEach(url => {
      const normalized = normalizeDomain(url);
      if (normalized) {
        sources.push({
          name: normalized.name,
          domain: normalized.domain,
        });
      }
    });
  }
  
  // Deduplicate by domain
  const seen = new Set<string>();
  return sources.filter(source => {
    if (seen.has(source.domain)) return false;
    seen.add(source.domain);
    return true;
  }).slice(0, 15); // Max 15 sources per response
}

/**
 * Validate if a domain is a real source
 */
export function isValidSource(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length < 3) return false;
  if (!domain.includes('.')) return false;
  if (domain.includes(' ')) return false;
  
  const domainLower = domain.toLowerCase();
  const rootDomain = domainLower.split('.')[0];
  
  // Check invalid domains
  if (INVALID_DOMAINS.has(rootDomain)) return false;
  if (COUNTRY_NAMES.has(domainLower)) return false;
  
  // Must have valid TLD
  const parts = domainLower.split('.');
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 6) return false;
  
  return true;
}

