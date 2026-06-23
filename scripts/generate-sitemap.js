import fs from 'fs';
import path from 'path';

// Parse .env files
function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  for (const envPath of envPaths) {
    try {
      const fullPath = path.resolve(process.cwd(), envPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        content.split('\n').forEach(line => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1);
            }
            process.env[key] = value;
          }
        });
      }
    } catch (e) {
      console.warn(`Could not load ${envPath}:`, e.message);
    }
  }
}

async function generateSitemap() {
  loadEnv();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  console.log('Generating sitemap...');

  const today = new Date().toISOString().split('T')[0];

  // Base public URLs
  const staticUrls = [
    { loc: 'https://citero.ai/', changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: 'https://citero.ai/pricing', changefreq: 'weekly', priority: '0.9', lastmod: today },
    { loc: 'https://citero.ai/blog', changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: 'https://citero.ai/terms', changefreq: 'monthly', priority: '0.5', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/privacy', changefreq: 'monthly', priority: '0.5', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/refund', changefreq: 'monthly', priority: '0.5', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/about', changefreq: 'monthly', priority: '0.7', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/contact', changefreq: 'monthly', priority: '0.6', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/knowledge-base', changefreq: 'weekly', priority: '0.7', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/logo', changefreq: 'yearly', priority: '0.3', lastmod: '2025-01-30' },
    { loc: 'https://citero.ai/demo', changefreq: 'monthly', priority: '0.8', lastmod: '2026-05-19' },
    { loc: 'https://citero.ai/feedback', changefreq: 'monthly', priority: '0.6', lastmod: '2026-05-19' }
  ];

  // Include default/hardcoded public blog
  staticUrls.push({
    loc: 'https://citero.ai/blog/default-seo-geo-guide',
    changefreq: 'weekly',
    priority: '0.8',
    lastmod: '2026-06-18'
  });

  const dynamicUrls = [];

  if (supabaseUrl && supabaseKey) {
    try {
      // Fetch public blogs using standard REST API
      const response = await fetch(
        `${supabaseUrl}/rest/v1/blogs?select=id,published_at,created_at&status=eq.published&is_platform_blog=eq.true`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blogs = await response.json();
      console.log(`Fetched ${blogs.length} published blogs from Supabase.`);

      for (const blog of blogs) {
        // Avoid duplicating default blog if it exists in the database
        if (blog.id === 'default-seo-geo-guide') continue;
        
        const dateStr = (blog.published_at || blog.created_at || today).split('T')[0];
        dynamicUrls.push({
          loc: `https://citero.ai/blog/${blog.id}`,
          changefreq: 'weekly',
          priority: '0.8',
          lastmod: dateStr
        });
      }
    } catch (error) {
      console.error('Warning: Failed to fetch dynamic blogs from Supabase, writing static sitemap only:', error.message);
    }
  } else {
    console.warn('Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Generating static sitemap only.');
  }

  const allUrls = [...staticUrls, ...dynamicUrls];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .map(
    url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  
  // Ensure the directory exists (should be public)
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, xmlContent, 'utf-8');
  console.log(`Successfully wrote sitemap to ${outputPath}`);
}

generateSitemap();
