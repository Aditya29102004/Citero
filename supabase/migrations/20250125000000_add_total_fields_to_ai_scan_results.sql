-- Add total_prompts and total_citations to ai_scan_results table
-- Also rename platform to provider for consistency

ALTER TABLE public.ai_scan_results
ADD COLUMN IF NOT EXISTS total_prompts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_citations INTEGER DEFAULT 0;

-- Rename platform to provider if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_scan_results' 
    AND column_name = 'platform'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_scan_results' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.ai_scan_results RENAME COLUMN platform TO provider;
  END IF;
END $$;

-- Add provider column if it doesn't exist (in case platform was already renamed)
ALTER TABLE public.ai_scan_results
ADD COLUMN IF NOT EXISTS provider TEXT;

-- Update index to use provider instead of platform
DROP INDEX IF EXISTS idx_ai_scan_results_brand_platform;
CREATE INDEX IF NOT EXISTS idx_ai_scan_results_brand_provider ON public.ai_scan_results(brand_id, provider);

