export function normalizeDomain(domainOrUrl: string): string {
  let d = domainOrUrl.toLowerCase().trim();
  // Remove protocol
  d = d.replace(/^https?:\/\//, '');
  // Remove www.
  d = d.replace(/^www\./, '');
  // Extract host from path
  d = d.split('/')[0].split('?')[0].split('#')[0];
  // Strip trailing punctuation/markdown brackets (anything that's not a letter or digit)
  d = d.replace(/[^a-z0-9]+$/, '');
  // Strip leading punctuation
  d = d.replace(/^[^a-z0-9]+/, '');
  return d;
}

export function extractDomains(text: string): string[] {
  if (!text) return [];

  // Match URL-like patterns (e.g. domain.com, sub.domain.org, http://domain.net)
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.(?:[a-zA-Z]{2,}\.?)+[^\s\)\],]*)/gi;
  const matches = text.match(urlRegex) || [];
  const domains = new Set<string>();

  matches.forEach((match) => {
    const domain = normalizeDomain(match);
    if (domain.includes('.') && domain.length > 3) {
      // Basic sanity check to avoid matching random trailing punctuation
      const cleanDomain = domain.replace(/[^\w\.-]/g, '');
      if (cleanDomain.includes('.') && cleanDomain.split('.').every(p => p.length > 0)) {
        domains.add(cleanDomain);
      }
    }
  });

  return Array.from(domains);
}

export function isBrandMentioned(text: string, brandName: string): boolean {
  if (!text || !brandName) return false;
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

export function isBrandFirstMention(text: string, brandName: string, competitorNames: string[]): boolean {
  if (!text || !brandName) return false;

  const textLower = text.toLowerCase();
  const brandLower = brandName.toLowerCase();

  const brandIndex = textLower.indexOf(brandLower);
  if (brandIndex === -1) return false;

  // Check index of each competitor in the text
  for (const comp of competitorNames) {
    if (!comp) continue;
    const compLower = comp.toLowerCase();
    const compIndex = textLower.indexOf(compLower);
    if (compIndex !== -1 && compIndex < brandIndex) {
      return false; // Competitor appears before the brand
    }
  }

  return true;
}
