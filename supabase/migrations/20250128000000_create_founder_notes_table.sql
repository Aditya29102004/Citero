-- Create founder_notes table to store personalized notes from founder to users
CREATE TABLE IF NOT EXISTS public.founder_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_review TEXT NOT NULL,
  action_steps TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_founder_notes_brand_id ON public.founder_notes(brand_id);
CREATE INDEX IF NOT EXISTS idx_founder_notes_user_id ON public.founder_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_notes_created_at ON public.founder_notes(created_at DESC);

-- Add unique constraint: one note per brand per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_founder_note_per_brand_user ON public.founder_notes(brand_id, user_id);

-- Enable RLS
ALTER TABLE public.founder_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own founder notes"
  ON public.founder_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all founder notes"
  ON public.founder_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.email = 'admin@unifr.com')
    )
  );

CREATE POLICY "Admins can insert founder notes"
  ON public.founder_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.email = 'admin@unifr.com')
    )
  );

CREATE POLICY "Admins can update founder notes"
  ON public.founder_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.email = 'admin@unifr.com')
    )
  );

CREATE POLICY "Admins can delete founder notes"
  ON public.founder_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.email = 'admin@unifr.com')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_founder_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_founder_notes_updated_at_trigger
  BEFORE UPDATE ON public.founder_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_founder_notes_updated_at();

