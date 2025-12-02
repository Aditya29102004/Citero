# 📝 Simple Blog Insertion Guide

## Overview
You can now easily insert blog posts directly into the database using simple SQL functions. No need to go through the UI - just insert title and content, and the blog will automatically appear on your website!

## 🚀 Quick Start

### Method 1: Using the Simplest Function (Recommended)

Just provide title and content:

```sql
SELECT quick_insert_blog(
  'Your Blog Title Here',
  'Your full blog content here. Supports markdown formatting.

You can write multiple paragraphs.

- Use bullet points
- Add **bold** text
- Add *italic* text

The blog will automatically:
- Be published immediately
- Appear on /blog page
- Have word count calculated
- Be linked to "Website Blog" brand
'
);
```

### Method 2: Using the Full Function (More Options)

```sql
SELECT insert_blog_post(
  'Your Blog Title',                    -- Title (required)
  'Your blog content here...',          -- Content (required)
  'SEO Tips',                           -- Topic (optional, default: 'General')
  ARRAY['SEO', 'Marketing', 'AI']       -- SEO Keywords (optional, default: empty array)
);
```

## 📋 Examples

### Example 1: Simple Blog Post
```sql
SELECT quick_insert_blog(
  '10 Ways to Improve Your SEO',
  'Here are 10 proven strategies to improve your website SEO...'
);
```

### Example 2: Blog with Topic and Keywords
```sql
SELECT insert_blog_post(
  'AI Visibility Tracking Guide',
  'Learn how to track your brand visibility across AI platforms...',
  'AI Marketing',
  ARRAY['AI', 'SEO', 'Brand Tracking', 'GEO']
);
```

### Example 3: Bulk Insert Multiple Blogs
```sql
-- Insert multiple blogs at once
SELECT quick_insert_blog('Title 1', 'Content 1');
SELECT quick_insert_blog('Title 2', 'Content 2');
SELECT quick_insert_blog('Title 3', 'Content 3');
```

## 🎯 What Happens Automatically

When you use these functions:
- ✅ Blog is automatically set to `published` status
- ✅ `published_at` timestamp is set to current time
- ✅ Word count is automatically calculated
- ✅ Linked to "Website Blog" brand (created automatically if needed)
- ✅ Linked to admin user account
- ✅ Appears immediately on `/blog` page
- ✅ All timestamps (`created_at`, `updated_at`) are set automatically

## 🔧 How to Use in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste one of the SQL examples above
4. Modify the title and content
5. Click **Run**
6. Your blog will appear on `/blog` page immediately!

## 📊 Direct Table Insert (Advanced)

If you prefer to insert directly into the table:

```sql
-- First, get your user_id and brand_id
SELECT id as user_id FROM profiles WHERE is_admin = true LIMIT 1;
SELECT id as brand_id FROM brands WHERE name = 'Website Blog' LIMIT 1;

-- Then insert (replace USER_ID and BRAND_ID)
INSERT INTO blogs (
  brand_id,
  user_id,
  title,
  content,
  status,
  published_at,
  word_count,
  topic
) VALUES (
  'BRAND_ID_HERE',
  'USER_ID_HERE',
  'Your Title',
  'Your Content',
  'published',
  now(),
  100,  -- word count
  'General'
);
```

## ⚠️ Notes

- The functions automatically find the admin user
- "Website Blog" brand is created automatically if it doesn't exist
- All blogs inserted this way will appear on the public `/blog` page
- Markdown formatting is supported in content
- No need to set `brand_id` manually - it's handled automatically

## 🎨 Content Formatting

You can use markdown in your content:
- **Bold**: `**text**`
- *Italic*: `*text*`
- Headers: `# Header`, `## Subheader`
- Lists: `- item` or `1. item`
- Links: `[text](url)`

The blog page will render markdown automatically!

