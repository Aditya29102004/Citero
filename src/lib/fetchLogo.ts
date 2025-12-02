/**
 * Validates if a URL is a real domain (not a placeholder/fake competitor)
 */
function isValidRealDomain(url: string): boolean {
  const fakeDomainPatterns = [
    /competitor\d+\.com/i,
    /competitor\d+\./i,
    /^competitor\d+$/i,
    /example\.com/i,
    /test\.com/i,
    /sample\.com/i,
    /placeholder\.com/i,
    /fake\.com/i,
    /demo\.com/i,
    /dummy\.com/i,
  ];

  const urlLower = url.toLowerCase().trim();
  
  // Reject if URL contains "competitor" + number
  if (urlLower.match(/competitor\d+/i) || urlLower.match(/competitor\s*\d+/i)) {
    return false;
  }
  
  // Reject generic competitor URLs
  if (urlLower === "competitor" || urlLower === "competitor.com" || urlLower.match(/^https?:\/\/competitor\.com/)) {
    return false;
  }
  
  // Check against fake domain patterns
  for (const pattern of fakeDomainPatterns) {
    if (pattern.test(urlLower)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Fetches a website's logo/favicon from a URL
 * Uses multiple fallback strategies:
 * 1. Google's favicon service
 * 2. Direct favicon.ico
 * 3. Apple touch icon
 * 4. Open Graph image
 */
export async function fetchWebsiteLogo(url: string): Promise<string | null> {
  try {
    // Validate URL is not a fake/placeholder competitor
    if (!isValidRealDomain(url)) {
      console.warn(`Skipping logo fetch for fake domain: ${url}`);
      return null;
    }
    
    // Extract domain from URL
    let domain: string;
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = urlObj.hostname.replace("www.", "");
      
      // Double-check domain is valid
      if (!isValidRealDomain(domain)) {
        console.warn(`Skipping logo fetch for fake domain: ${domain}`);
        return null;
      }
    } catch {
      return null;
    }

    // Strategy 1: Google's favicon service (most reliable)
    const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    
    // Test if Google favicon works
    try {
      const response = await fetch(googleFavicon, { method: "HEAD" });
      if (response.ok) {
        return googleFavicon;
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 2: Try direct favicon.ico
    const faviconUrl = `https://${domain}/favicon.ico`;
    try {
      const response = await fetch(faviconUrl, { method: "HEAD" });
      if (response.ok) {
        return faviconUrl;
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Try apple-touch-icon
    const appleIconUrl = `https://${domain}/apple-touch-icon.png`;
    try {
      const response = await fetch(appleIconUrl, { method: "HEAD" });
      if (response.ok) {
        return appleIconUrl;
      }
    } catch {
      // Continue to fallback
    }

    // Fallback: Return Google favicon anyway (it usually works)
    return googleFavicon;
  } catch (error) {
    console.error("Error fetching logo:", error);
    return null;
  }
}

/**
 * Batch fetch logos for multiple URLs
 */
export async function fetchLogos(urls: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  
  // Fetch in parallel with a limit
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const promises = batch.map(async (url) => {
      const logo = await fetchWebsiteLogo(url);
      return { url, logo };
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ url, logo }) => {
      results[url] = logo;
    });
  }
  
  return results;
}

