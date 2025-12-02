-- Add onboarding-related fields to brands table if they don't exist
-- These fields will store the onboarding data

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brands_onboarding_completed ON public.brands(onboarding_completed);

