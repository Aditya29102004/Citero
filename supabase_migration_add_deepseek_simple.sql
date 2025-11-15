-- Add DeepSeek to AI provider options (Simple version)

-- Update brands table constraint
ALTER TABLE public.brands
DROP CONSTRAINT IF EXISTS brands_ai_provider_check;

ALTER TABLE public.brands
ADD CONSTRAINT brands_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'deepseek'));

-- Only update profiles if the column exists
-- If you get an error about profiles table, you can skip this part
-- The profiles.default_ai_provider column is optional

