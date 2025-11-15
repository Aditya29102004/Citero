-- ============================================
-- Complete Database Schema for Uni Brand Track
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 2. BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT,
  website_url TEXT,
  description TEXT,
  date_added TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

CREATE POLICY "Users can view their own brands"
  ON public.brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brands"
  ON public.brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands"
  ON public.brands FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands"
  ON public.brands FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. MENTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  date TIMESTAMPTZ NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) NOT NULL,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view mentions for their brands" ON public.mentions;
DROP POLICY IF EXISTS "Users can insert mentions for their brands" ON public.mentions;
DROP POLICY IF EXISTS "Users can update mentions for their brands" ON public.mentions;
DROP POLICY IF EXISTS "Users can delete mentions for their brands" ON public.mentions;

CREATE POLICY "Users can view mentions for their brands"
  ON public.mentions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert mentions for their brands"
  ON public.mentions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update mentions for their brands"
  ON public.mentions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete mentions for their brands"
  ON public.mentions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mentions_brand_id ON public.mentions(brand_id);
CREATE INDEX IF NOT EXISTS idx_mentions_date ON public.mentions(date DESC);

-- ============================================
-- 4. SCANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  visibility_score DECIMAL(5,2),
  ai_summary TEXT,
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update their own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can delete their own scans" ON public.scans;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scans_brand_id ON public.scans(brand_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);

-- ============================================
-- 5. SCAN_RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scan_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_template TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_category TEXT,
  ai_response TEXT NOT NULL,
  mentioned_brands TEXT[],
  brand_mentioned BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scan_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own scan responses" ON public.scan_responses;
DROP POLICY IF EXISTS "Users can insert their own scan responses" ON public.scan_responses;
DROP POLICY IF EXISTS "Users can update their own scan responses" ON public.scan_responses;
DROP POLICY IF EXISTS "Users can delete their own scan responses" ON public.scan_responses;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scan_responses_scan_id ON public.scan_responses(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_responses_brand_id ON public.scan_responses(brand_id);

-- ============================================
-- 6. BRAND_VISIBILITY_SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.brand_visibility_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  positive_mentions INTEGER NOT NULL DEFAULT 0,
  neutral_mentions INTEGER NOT NULL DEFAULT 0,
  negative_mentions INTEGER NOT NULL DEFAULT 0,
  total_mentions INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.brand_visibility_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own visibility scores" ON public.brand_visibility_scores;
DROP POLICY IF EXISTS "Users can insert their own visibility scores" ON public.brand_visibility_scores;
DROP POLICY IF EXISTS "Users can update their own visibility scores" ON public.brand_visibility_scores;
DROP POLICY IF EXISTS "Users can delete their own visibility scores" ON public.brand_visibility_scores;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_visibility_scores_brand_id ON public.brand_visibility_scores(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_visibility_scores_calculated_at ON public.brand_visibility_scores(calculated_at);

-- ============================================
-- COMPLETE!
-- ============================================
-- All tables, policies, indexes, and triggers have been created.
-- Your database is now ready to use!

