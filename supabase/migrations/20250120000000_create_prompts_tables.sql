-- Create prompts table for pre-defined prompts
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prompt_runs table to store simulation runs
CREATE TABLE IF NOT EXISTS public.prompt_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model TEXT NOT NULL,
  country TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  brand_mentioned BOOLEAN NOT NULL DEFAULT false,
  competitors TEXT[] DEFAULT ARRAY[]::TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompts_topic ON public.prompts(topic);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt_id ON public.prompt_runs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_brand_id ON public.prompt_runs(brand_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_user_id ON public.prompt_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_created_at ON public.prompt_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_model ON public.prompt_runs(model);
CREATE INDEX IF NOT EXISTS idx_prompt_runs_country ON public.prompt_runs(country);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompts (public read, admin write)
CREATE POLICY "Anyone can view prompts"
  ON public.prompts FOR SELECT
  USING (true);

-- RLS Policies for prompt_runs
CREATE POLICY "Users can view their own prompt runs"
  ON public.prompt_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt runs"
  ON public.prompt_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt runs"
  ON public.prompt_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompt runs"
  ON public.prompt_runs FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for prompts updated_at
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Insert sample prompts
INSERT INTO public.prompts (topic, text) VALUES
  ('Startup Discovery', 'What are the best startup discovery platforms for finding early-stage companies?'),
  ('Cofounder Matching', 'Where can I find a technical cofounder for my startup?'),
  ('Funding Platforms', 'What are the top platforms for startup funding and investment?'),
  ('SaaS Tools', 'What are the best SaaS tools for small businesses?'),
  ('Productivity', 'What productivity tools do successful founders use?'),
  ('Marketing', 'What are the best marketing tools for startups?'),
  ('Analytics', 'What analytics platforms do startups use to track their growth?'),
  ('Customer Support', 'What customer support tools are recommended for SaaS companies?')
ON CONFLICT DO NOTHING;

