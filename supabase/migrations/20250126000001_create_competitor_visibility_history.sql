-- Create competitor_visibility_history table for tracking competitor trends
CREATE TABLE IF NOT EXISTS public.competitor_visibility_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  visibility_score FLOAT8 NOT NULL DEFAULT 0,
  citation_share FLOAT8 NOT NULL DEFAULT 0,
  sentiment_weighted_score FLOAT8 NOT NULL DEFAULT 50,
  mentions INTEGER NOT NULL DEFAULT 0,
  positive_mentions INTEGER NOT NULL DEFAULT 0,
  neutral_mentions INTEGER NOT NULL DEFAULT 0,
  negative_mentions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_competitor_visibility_brand_id ON public.competitor_visibility_history(brand_id);
CREATE INDEX IF NOT EXISTS idx_competitor_visibility_competitor ON public.competitor_visibility_history(brand_id, competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitor_visibility_created_at ON public.competitor_visibility_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_visibility_scan_id ON public.competitor_visibility_history(scan_id);

-- Enable RLS
ALTER TABLE public.competitor_visibility_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own competitor visibility history"
  ON public.competitor_visibility_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = competitor_visibility_history.brand_id
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own competitor visibility history"
  ON public.competitor_visibility_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = competitor_visibility_history.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- Allow service role to insert
CREATE POLICY "Service role can insert competitor visibility history"
  ON public.competitor_visibility_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can view competitor visibility history"
  ON public.competitor_visibility_history FOR SELECT
  TO service_role
  USING (true);

