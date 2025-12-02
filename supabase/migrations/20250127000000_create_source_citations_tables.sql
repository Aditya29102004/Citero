-- Create source_citations table for tracking AI-cited sources
CREATE TABLE IF NOT EXISTS public.source_citations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  mention_count INTEGER NOT NULL DEFAULT 0,
  sentiment_score FLOAT8,
  geo TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create source_citations_history table for tracking daily citation trends
CREATE TABLE IF NOT EXISTS public.source_citations_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  daily_mentions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_source_citations_brand_id ON public.source_citations(brand_id);
CREATE INDEX IF NOT EXISTS idx_source_citations_domain ON public.source_citations(brand_id, domain);
CREATE INDEX IF NOT EXISTS idx_source_citations_last_seen ON public.source_citations(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_source_citations_mention_count ON public.source_citations(mention_count DESC);
CREATE INDEX IF NOT EXISTS idx_source_citations_history_brand_id ON public.source_citations_history(brand_id);
CREATE INDEX IF NOT EXISTS idx_source_citations_history_domain ON public.source_citations_history(brand_id, domain);
CREATE INDEX IF NOT EXISTS idx_source_citations_history_created_at ON public.source_citations_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_citations_history_scan_id ON public.source_citations_history(scan_id);

-- Add unique constraint to prevent duplicate domains per brand
CREATE UNIQUE INDEX IF NOT EXISTS unique_source_per_brand ON public.source_citations(brand_id, domain);

-- Enable RLS
ALTER TABLE public.source_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_citations_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for source_citations
CREATE POLICY "Users can view their own source citations"
  ON public.source_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = source_citations.brand_id
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own source citations"
  ON public.source_citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = source_citations.brand_id
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own source citations"
  ON public.source_citations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = source_citations.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- RLS Policies for source_citations_history
CREATE POLICY "Users can view their own source citation history"
  ON public.source_citations_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = source_citations_history.brand_id
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own source citation history"
  ON public.source_citations_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = source_citations_history.brand_id
      AND brands.user_id = auth.uid()
    )
  );

-- Allow service role to insert/update (for edge functions)
CREATE POLICY "Service role can insert source citations"
  ON public.source_citations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update source citations"
  ON public.source_citations FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can view source citations"
  ON public.source_citations FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert source citation history"
  ON public.source_citations_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can view source citation history"
  ON public.source_citations_history FOR SELECT
  TO service_role
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_source_citations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_source_citations_updated_at_trigger
  BEFORE UPDATE ON public.source_citations
  FOR EACH ROW
  EXECUTE FUNCTION update_source_citations_updated_at();

