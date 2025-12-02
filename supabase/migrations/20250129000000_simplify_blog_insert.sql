-- Simplify blog insertion: Make brand_id nullable and add auto-publish function
-- This allows easy blog insertion via SQL or Supabase dashboard

-- First, make brand_id nullable (for website SEO blogs that don't need a brand)
ALTER TABLE public.blogs 
ALTER COLUMN brand_id DROP NOT NULL;

-- Add a default system user_id for admin blogs (optional - can be NULL)
-- We'll handle this in the function

-- Create a function to easily insert and auto-publish blogs
CREATE OR REPLACE FUNCTION public.insert_blog_post(
  p_title TEXT,
  p_content TEXT,
  p_topic TEXT DEFAULT 'General',
  p_seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blog_id UUID;
  v_user_id UUID;
  v_brand_id UUID;
  v_word_count INTEGER;
BEGIN
  -- Get admin user ID (first admin user or user with admin@unifr.com email)
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE is_admin = true OR email = 'admin@unifr.com'
  LIMIT 1;

  -- If no admin found, use the first user (fallback)
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Get or create "Website Blog" brand for SEO posts
  SELECT id INTO v_brand_id
  FROM public.brands
  WHERE name = 'Website Blog' AND user_id = v_user_id
  LIMIT 1;

  -- If brand doesn't exist, create it
  IF v_brand_id IS NULL THEN
    INSERT INTO public.brands (user_id, name, description)
    VALUES (v_user_id, 'Website Blog', 'Blog posts for website SEO')
    RETURNING id INTO v_brand_id;
  END IF;

  -- Calculate word count
  v_word_count := array_length(string_to_array(trim(p_content), ' '), 1);
  IF v_word_count IS NULL THEN
    v_word_count := 0;
  END IF;

  -- Insert blog post with auto-publish
  INSERT INTO public.blogs (
    brand_id,
    user_id,
    title,
    content,
    status,
    published_at,
    word_count,
    topic,
    seo_keywords,
    created_at,
    updated_at
  )
  VALUES (
    v_brand_id,
    v_user_id,
    p_title,
    p_content,
    'published',
    now(),
    v_word_count,
    p_topic,
    p_seo_keywords,
    now(),
    now()
  )
  RETURNING id INTO v_blog_id;

  RETURN v_blog_id;
END;
$$;

-- Create a simpler function that only requires title and content
CREATE OR REPLACE FUNCTION public.quick_insert_blog(
  p_title TEXT,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.insert_blog_post(p_title, p_content);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_blog_post(TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_insert_blog(TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.insert_blog_post IS 'Easily insert and auto-publish blog posts. Only requires title and content.';
COMMENT ON FUNCTION public.quick_insert_blog IS 'Simplest way to insert a blog post - just title and content.';

