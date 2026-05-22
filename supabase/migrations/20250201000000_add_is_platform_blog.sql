-- Add is_platform_blog column to blogs table
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS is_platform_blog BOOLEAN NOT NULL DEFAULT false;

-- Update existing blogs created by admins to be official platform blogs
UPDATE public.blogs
SET is_platform_blog = true
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE is_admin = true OR email = 'admin@citero.com'
);

-- Create trigger function to automatically set platform status based on author admin role
CREATE OR REPLACE FUNCTION public.set_blog_platform_status()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = NEW.user_id
    AND (profiles.is_admin = true OR profiles.email = 'admin@citero.com')
  ) THEN
    NEW.is_platform_blog := true;
  ELSE
    NEW.is_platform_blog := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger before insert on blogs
DROP TRIGGER IF EXISTS set_blog_platform_status_trigger ON public.blogs;
CREATE TRIGGER set_blog_platform_status_trigger
  BEFORE INSERT ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blog_platform_status();
