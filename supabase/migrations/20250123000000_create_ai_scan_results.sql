-- Create ai_scan_results table for historical scan tracking
-- This table stores one row per scan to enable historical trend analysis

CREATE TABLE IF NOT EXISTS public.ai_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  scan_number INTEGER NOT NULL,
  visibility_score FLOAT8,
  citation_share FLOAT8,
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,
  competitor_scores JSONB DEFAULT '{}'::jsonb,
  citation_sources JSONB DEFAULT '[]'::jsonb,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_scan_results_brand_id ON public.ai_scan_results(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_scan_results_brand_platform ON public.ai_scan_results(brand_id, platform);
CREATE INDEX IF NOT EXISTS idx_ai_scan_results_created_at ON public.ai_scan_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_scan_results_scan_number ON public.ai_scan_results(brand_id, scan_number);

-- Enable RLS
ALTER TABLE public.ai_scan_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scan results"
  ON public.ai_scan_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = ai_scan_results.brand_id
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scan results"
  ON public.ai_scan_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = ai_scan_results.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- Function to get next scan number for a brand
CREATE OR REPLACE FUNCTION get_next_scan_number(p_brand_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(scan_number) FROM public.ai_scan_results WHERE brand_id = p_brand_id),
    0
  ) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

