-- Add AI provider preference to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'gemini'));

-- Add AI provider preference to profiles table (user default)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_ai_provider TEXT DEFAULT 'openai' CHECK (default_ai_provider IN ('openai', 'gemini'));

