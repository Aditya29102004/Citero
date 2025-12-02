-- Create profiles for any existing auth users who don't have profiles
-- This fixes users who signed up before the trigger was working

-- First, ensure the name column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Then create missing profiles
INSERT INTO public.profiles (id, email, name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', NULL) as name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

