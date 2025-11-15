-- Add DeepSeek to AI provider options

-- Update brands table
ALTER TABLE public.brands
DROP CONSTRAINT IF EXISTS brands_ai_provider_check;

ALTER TABLE public.brands
ADD CONSTRAINT brands_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'deepseek'));

-- Update profiles table (only if column exists)
DO $$
BEGIN
  -- Check if default_ai_provider column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'default_ai_provider'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN default_ai_provider TEXT DEFAULT 'openai';
  END IF;
  
  -- Drop existing constraint if it exists
  ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_default_ai_provider_check;
  
  -- Add new constraint
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_ai_provider_check 
  CHECK (default_ai_provider IN ('openai', 'gemini', 'deepseek'));
END $$;

