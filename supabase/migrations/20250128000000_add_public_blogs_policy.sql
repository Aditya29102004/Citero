-- Add public read access policy for published blogs
-- This allows anyone (including unauthenticated users) to read published blogs
-- This is needed for the public blog page at /blog

CREATE POLICY "Anyone can view published blogs"
  ON public.blogs FOR SELECT
  USING (status = 'published');

