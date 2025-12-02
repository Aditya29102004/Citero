# Blog Insertion Guide

After running the migration `20250129000000_simplify_blog_insert.sql`, you can now insert blog posts directly from Supabase using SQL functions.

## Available Functions

### 1. `quick_insert_blog(title, content)` - Simplest Method

The easiest way to insert a blog post. Only requires title and content.

**Example:**
```sql
SELECT quick_insert_blog(
  'How to Track Your Brand in AI Responses',
  'AI visibility tracking is becoming essential for modern brands. Here is how you can track how ChatGPT, Gemini, and Claude describe your brand...'
);
```

### 2. `insert_blog_post(title, content, topic, seo_keywords)` - Full Control

More control over the blog post with optional topic and SEO keywords.

**Parameters:**
- `p_title` (TEXT, required): Blog post title
- `p_content` (TEXT, required): Blog post content (markdown supported)
- `p_topic` (TEXT, optional): Topic/category (default: 'General')
- `p_seo_keywords` (TEXT[], optional): Array of SEO keywords (default: empty array)

**Example:**
```sql
SELECT insert_blog_post(
  'Understanding GEO: Generative Engine Optimization',
  '# What is GEO?

Generative Engine Optimization (GEO) is the practice of optimizing your brand presence in AI-generated responses...

## Key Benefits

* Increased visibility
* Better brand perception
* Competitive advantage',
  'SEO',
  ARRAY['GEO', 'AI SEO', 'Generative Engine Optimization', 'Brand Tracking']
);
```

## How It Works

1. **Auto User Assignment**: The function automatically finds an admin user (or the first user if no admin exists)
2. **Auto Brand Creation**: Creates a "Website Blog" brand if it doesn't exist
3. **Auto-Publish**: Blog posts are automatically published (`status = 'published'`)
4. **Auto Word Count**: Word count is automatically calculated
5. **Auto Timestamps**: `created_at`, `updated_at`, and `published_at` are automatically set

## Inserting via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run one of the SQL commands above
4. The function will return the UUID of the created blog post

## Notes

- Blog posts inserted via these functions will have `brand_id` set to the "Website Blog" brand
- All blog posts are automatically published
- The functions use `SECURITY DEFINER` to bypass RLS, so they work even if you're not logged in as a specific user
- Word count is calculated automatically from the content

## Troubleshooting

If you get an error:
- Make sure the migration has been run successfully
- Check that you have at least one user in the `profiles` table
- Verify the `blogs` table exists and `brand_id` is nullable

