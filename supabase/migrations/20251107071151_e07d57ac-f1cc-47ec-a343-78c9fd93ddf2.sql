-- Create scans table to track GEO scan runs
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  visibility_score DECIMAL(5,2),
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scan_responses table to store AI responses
CREATE TABLE public.scan_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_template TEXT NOT NULL,
  question_text TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  mentioned_brands TEXT[],
  brand_mentioned BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_visibility_scores table for tracking scores over time
CREATE TABLE public.brand_visibility_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  positive_mentions INTEGER NOT NULL DEFAULT 0,
  neutral_mentions INTEGER NOT NULL DEFAULT 0,
  negative_mentions INTEGER NOT NULL DEFAULT 0,
  total_mentions INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_visibility_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scans
CREATE POLICY "Users can view their own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
  ON public.scans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scan_responses
CREATE POLICY "Users can view their own scan responses"
  ON public.scan_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan responses"
  ON public.scan_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan responses"
  ON public.scan_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan responses"
  ON public.scan_responses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for brand_visibility_scores
CREATE POLICY "Users can view their own visibility scores"
  ON public.brand_visibility_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visibility scores"
  ON public.brand_visibility_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visibility scores"
  ON public.brand_visibility_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visibility scores"
  ON public.brand_visibility_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_scans_brand_id ON public.scans(brand_id);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_scan_responses_scan_id ON public.scan_responses(scan_id);
CREATE INDEX idx_scan_responses_brand_id ON public.scan_responses(brand_id);
CREATE INDEX idx_brand_visibility_scores_brand_id ON public.brand_visibility_scores(brand_id);
CREATE INDEX idx_brand_visibility_scores_calculated_at ON public.brand_visibility_scores(calculated_at);