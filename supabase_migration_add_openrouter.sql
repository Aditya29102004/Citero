-- Migration to add OpenRouter as an AI provider option
-- Run this in Supabase SQL Editor

-- Update brands table constraint
ALTER TABLE public.brands
DROP CONSTRAINT IF EXISTS brands_ai_provider_check;

ALTER TABLE public.brands
ADD CONSTRAINT brands_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'deepseek', 'openrouter'));

-- Update profiles table constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_default_ai_provider_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_default_ai_provider_check 
CHECK (default_ai_provider IN ('openai', 'gemini', 'deepseek', 'openrouter'));

