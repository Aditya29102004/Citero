-- Add policy to allow service role to insert scan results
-- This ensures edge functions can insert even if RLS is enabled

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert scan results" ON public.ai_scan_results;
DROP POLICY IF EXISTS "Service role can view scan results" ON public.ai_scan_results;

-- Create policies for service role
CREATE POLICY "Service role can insert scan results"
  ON public.ai_scan_results FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow service role to select (for scan number calculation)
CREATE POLICY "Service role can view scan results"
  ON public.ai_scan_results FOR SELECT
  TO service_role
  USING (true);

