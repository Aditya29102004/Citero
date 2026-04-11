import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
}

export const SEO = ({
  title = "citero - Track & Optimize Your Brand's AI Visibility | GEO Tracking Platform",
  description = "Track how ChatGPT, Gemini, Claude, and Perplexity describe your brand. Get AI visibility insights, competitor analysis, and actionable recommendations to turn AI mentions into traffic and customers.",
  keywords = "AI visibility tracking, GEO tracking, Generative Engine Optimization, AI search optimization, brand tracking, ChatGPT visibility, Gemini tracking, Claude tracking, Perplexity tracking",
  canonical,
  ogImage = "https://citero.ai/og-image.png",
  ogType = "website",
  structuredData,
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, attribute: string = "name") => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // Update description
    updateMetaTag("description", description);
    updateMetaTag("keywords", keywords);

    // Update Open Graph tags
    updateMetaTag("og:title", title, "property");
    updateMetaTag("og:description", description, "property");
    updateMetaTag("og:image", ogImage, "property");
    updateMetaTag("og:type", ogType, "property");
    updateMetaTag("og:url", canonical || window.location.href, "property");
    updateMetaTag("og:site_name", "citero", "property");

    // Update Twitter tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", ogImage);

    // Add viewport and other important meta tags
    updateMetaTag("viewport", "width=device-width, initial-scale=1.0");
    updateMetaTag("theme-color", "#111827");
    updateMetaTag("author", "citero");
    updateMetaTag("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    // Update canonical URL
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute("href", canonical);
    }

    // Add structured data (JSON-LD) - handle both arrays and single objects
    if (structuredData) {
      // Remove existing structured data scripts
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
      existingScripts.forEach(script => script.remove());
      
      // Add new structured data
      const dataArray = Array.isArray(structuredData) ? structuredData : [structuredData];
      dataArray.forEach((data, index) => {
        const scriptTag = document.createElement("script");
        scriptTag.setAttribute("type", "application/ld+json");
        scriptTag.textContent = JSON.stringify(data);
        scriptTag.id = `structured-data-${index}`;
        document.head.appendChild(scriptTag);
      });
    }
  }, [title, description, keywords, canonical, ogImage, ogType, structuredData]);

  return null;
};

