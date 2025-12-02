-- Manual Fix: Insert Results for Completed Scans
-- This will create ai_scan_results entries for scans that completed but don't have results
-- Run this ONLY if you have completed scans without results

-- Step 1: Check which scans need results
SELECT 
  s.id as scan_id,
  s.brand_id,
  s.completed_at,
  s.visibility_score,
  COUNT(r.id) as existing_results_count
FROM public.scans s
LEFT JOIN public.ai_scan_results r ON s.brand_id = r.brand_id
WHERE s.status = 'completed'
GROUP BY s.id, s.brand_id, s.completed_at, s.visibility_score
HAVING COUNT(r.id) = 0
ORDER BY s.completed_at DESC;

-- Step 2: If you see scans above, run this to manually insert results
-- WARNING: This creates basic entries. For full data, you'd need to reprocess the scan_responses
-- This is a TEMPORARY fix - new scans should work automatically after migrations

-- First, get scan number for each brand
WITH scan_numbers AS (
  SELECT 
    s.brand_id,
    s.id as scan_id,
    s.completed_at,
    s.visibility_score,
    COALESCE(MAX(r.scan_number), 0) + ROW_NUMBER() OVER (PARTITION BY s.brand_id ORDER BY s.completed_at) as scan_number
  FROM public.scans s
  LEFT JOIN public.ai_scan_results r ON s.brand_id = r.brand_id
  WHERE s.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.ai_scan_results r2 
      WHERE r2.brand_id = s.brand_id 
      AND r2.created_at BETWEEN s.started_at AND s.completed_at + INTERVAL '5 minutes'
    )
  GROUP BY s.brand_id, s.id, s.completed_at, s.visibility_score
)
INSERT INTO public.ai_scan_results (
  brand_id,
  scan_number,
  visibility_score,
  citation_share,
  sentiment_positive,
  sentiment_neutral,
  sentiment_negative,
  competitor_scores,
  citation_sources,
  platform
)
SELECT 
  sn.brand_id,
  sn.scan_number,
  sn.visibility_score,
  0.0 as citation_share, -- Will be calculated properly on next scan
  0 as sentiment_positive,
  0 as sentiment_neutral,
  0 as sentiment_negative,
  '{}'::jsonb as competitor_scores,
  '[]'::jsonb as citation_sources,
  'chatgpt' as platform -- Default platform
FROM scan_numbers sn
ON CONFLICT DO NOTHING; -- Skip if already exists

-- Step 3: Verify inserts worked
SELECT 
  COUNT(*) as newly_inserted_results
FROM public.ai_scan_results
WHERE created_at > NOW() - INTERVAL '1 minute';

