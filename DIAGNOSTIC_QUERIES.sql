-- Diagnostic Queries to Check Database State
-- Run these in Supabase SQL Editor to diagnose the issue

-- 1. Check if ai_scan_results table exists and has data
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT brand_id) as brands_with_results,
  MIN(created_at) as oldest_result,
  MAX(created_at) as newest_result
FROM public.ai_scan_results;

-- 2. Check completed scans that should have results
SELECT 
  s.id,
  s.brand_id,
  s.status,
  s.completed_at,
  s.started_at,
  s.completed_questions,
  s.total_questions,
  s.visibility_score,
  b.name as brand_name
FROM public.scans s
JOIN public.brands b ON s.brand_id = b.id
WHERE s.status = 'completed'
ORDER BY s.completed_at DESC
LIMIT 10;

-- 3. Check if results exist for completed scans
SELECT 
  s.id as scan_id,
  s.brand_id,
  s.status,
  s.completed_at,
  CASE 
    WHEN r.id IS NOT NULL THEN 'HAS RESULTS'
    ELSE 'NO RESULTS'
  END as result_status,
  r.scan_number,
  r.platform,
  r.visibility_score
FROM public.scans s
LEFT JOIN public.ai_scan_results r ON s.brand_id = r.brand_id 
  AND r.created_at BETWEEN s.started_at AND s.completed_at + INTERVAL '5 minutes'
WHERE s.status = 'completed'
ORDER BY s.completed_at DESC
LIMIT 10;

-- 4. Check if function exists
SELECT 
  proname as function_name,
  proargnames as parameters
FROM pg_proc 
WHERE proname = 'insert_ai_scan_result';

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd as command_type
FROM pg_policies 
WHERE tablename = 'ai_scan_results'
ORDER BY policyname;

-- 6. Check if service role policies exist
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'ai_scan_results' 
  AND 'service_role' = ANY(roles);

