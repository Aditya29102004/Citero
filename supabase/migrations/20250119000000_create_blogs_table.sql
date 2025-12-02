-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  topic TEXT,
  ai_provider TEXT,
  word_count INTEGER DEFAULT 0,
  blog_goal TEXT,
  tone TEXT,
  competitor_focus TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS blogs_brand_id_idx ON public.blogs(brand_id);
CREATE INDEX IF NOT EXISTS blogs_user_id_idx ON public.blogs(user_id);
CREATE INDEX IF NOT EXISTS blogs_status_idx ON public.blogs(status);
CREATE INDEX IF NOT EXISTS blogs_created_at_idx ON public.blogs(created_at DESC);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own blogs"
  ON public.blogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blogs"
  ON public.blogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blogs"
  ON public.blogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blogs"
  ON public.blogs FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_blogs_updated_at_trigger
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION update_blogs_updated_at();

