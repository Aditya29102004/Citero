-- SIMPLE BACKFILL: If BACKFILL_3_SCANS.sql fails, use this simpler version
-- This creates basic entries even if scan_responses table is emptyy

WITH scan_numbers AS (
  SELECT 
    s.id as scan_id,
    s.brand_id,
    s.completed_at,
    s.visibility_score,
    COALESCE(MAX(r.scan_number), 0) + ROW_NUMBER() OVER (PARTITION BY s.brand_id ORDER BY s.completed_at) as scan_number
  FROM public.scans s
  LEFT JOIN public.ai_scan_results r ON s.brand_id = r.brand_id
  WHERE s.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.ai_scan_results r2 
      WHERE r2.brand_id = s.brand_id 
      AND r2.created_at BETWEEN s.started_at - INTERVAL '1 minute' AND s.completed_at + INTERVAL '5 minutes'
    )
  GROUP BY s.id, s.brand_id, s.completed_at, s.visibility_score
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
  platform,
  created_at
)
SELECT 
  sn.brand_id,
  sn.scan_number,
  COALESCE(sn.visibility_score, 0) as visibility_score,
  0.0 as citation_share, -- Will be calculated on next scan
  0 as sentiment_positive,
  0 as sentiment_neutral,
  0 as sentiment_negative,
  '{}'::jsonb as competitor_scores,
  '[]'::jsonb as citation_sources,
  'chatgpt' as platform,
  sn.completed_at as created_at
FROM scan_numbers sn
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_scan_results r2 
  WHERE r2.brand_id = sn.brand_id 
  AND r2.scan_number = sn.scan_number
)
RETURNING id, brand_id, scan_number, created_at;

-- Verify
SELECT 
  'Simple Backfill Complete!' as status,
  COUNT(*) as total_results
FROM public.ai_scan_results;

