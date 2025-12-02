-- Create outreach_targets table to store detected outreach targets
CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_domain TEXT NOT NULL,
  source_url TEXT NOT NULL,
  article_title TEXT,
  person_name TEXT,
  person_email TEXT,
  person_role TEXT,
  company_name TEXT,
  priority_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  citation_count INTEGER NOT NULL DEFAULT 0,
  last_mentioned TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'email_drafted', 'email_sent', 'contacted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outreach_emails table to store generated emails
CREATE TABLE IF NOT EXISTS public.outreach_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.outreach_targets(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'replied')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_outreach_targets_brand_id ON public.outreach_targets(brand_id);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_user_id ON public.outreach_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON public.outreach_targets(status);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_priority_score ON public.outreach_targets(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_targets_source_domain ON public.outreach_targets(source_domain);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_target_id ON public.outreach_emails(target_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_brand_id ON public.outreach_emails(brand_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_user_id ON public.outreach_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON public.outreach_emails(status);

-- Enable RLS
ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outreach_targets
CREATE POLICY "Users can view their own outreach targets"
  ON public.outreach_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outreach targets"
  ON public.outreach_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outreach targets"
  ON public.outreach_targets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outreach targets"
  ON public.outreach_targets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for outreach_emails
CREATE POLICY "Users can view their own outreach emails"
  ON public.outreach_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outreach emails"
  ON public.outreach_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outreach emails"
  ON public.outreach_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outreach emails"
  ON public.outreach_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_outreach_targets_updated_at
  BEFORE UPDATE ON public.outreach_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_updated_at();

CREATE TRIGGER update_outreach_emails_updated_at
  BEFORE UPDATE ON public.outreach_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_updated_at();

