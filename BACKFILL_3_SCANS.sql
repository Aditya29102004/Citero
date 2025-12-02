-- BACKFILL: Insert results for your 3 completed scans
-- Run this in Supabase SQL Editor RIGHT NOW to fix the dashboard

-- Step 1: Create results for completed scans using scan_responses data
WITH scan_analysis AS (
  SELECT 
    s.id as scan_id,
    s.brand_id,
    s.completed_at,
    s.started_at,
    COALESCE(s.visibility_score, 0) as visibility_score,
    COUNT(DISTINCT sr.id) as total_responses,
    COUNT(DISTINCT CASE WHEN sr.brand_mentioned THEN sr.id END) as mentions_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'positive' THEN sr.id END) as positive_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'neutral' THEN sr.id END) as neutral_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'negative' THEN sr.id END) as negative_count,
    -- Extract competitor mentions from mentioned_brands array (as object with name as key)
    COALESCE(
      (
        SELECT jsonb_object_agg(DISTINCT competitor_name, 1.0)
        FROM (
          SELECT DISTINCT unnest(sr2.mentioned_brands) as competitor_name
          FROM public.scan_responses sr2
          WHERE sr2.scan_id = s.id
            AND sr2.mentioned_brands IS NOT NULL
            AND array_length(sr2.mentioned_brands, 1) > 0
        ) competitors
        WHERE competitor_name IS NOT NULL AND competitor_name != ''
      ),
      '{}'::jsonb
    ) as competitor_data,
    -- No source_url in scan_responses, use empty array
    '[]'::jsonb as citation_data
  FROM public.scans s
  LEFT JOIN public.scan_responses sr ON s.id = sr.scan_id
  WHERE s.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.ai_scan_results r 
      WHERE r.brand_id = s.brand_id 
      AND r.created_at BETWEEN s.started_at - INTERVAL '1 minute' AND s.completed_at + INTERVAL '5 minutes'
    )
  GROUP BY s.id, s.brand_id, s.completed_at, s.started_at, s.visibility_score
),
scan_numbers AS (
  SELECT 
    sa.*,
    COALESCE(MAX(r.scan_number), 0) + ROW_NUMBER() OVER (PARTITION BY sa.brand_id ORDER BY sa.completed_at) as scan_number
  FROM scan_analysis sa
  LEFT JOIN public.ai_scan_results r ON sa.brand_id = r.brand_id
  GROUP BY sa.scan_id, sa.brand_id, sa.completed_at, sa.started_at, sa.visibility_score, 
           sa.total_responses, sa.mentions_count, sa.positive_count, sa.neutral_count, 
           sa.negative_count, sa.competitor_data, sa.citation_data
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
  sn.visibility_score,
  CASE 
    WHEN sn.total_responses > 0 THEN (sn.mentions_count::float / sn.total_responses::float * 100)
    ELSE 0
  END as citation_share,
  COALESCE(sn.positive_count, 0) as sentiment_positive,
  COALESCE(sn.neutral_count, 0) as sentiment_neutral,
  COALESCE(sn.negative_count, 0) as sentiment_negative,
  COALESCE(sn.competitor_data, '{}'::jsonb) as competitor_scores,
  COALESCE(sn.citation_data, '[]'::jsonb) as citation_sources,
  'chatgpt' as platform,
  sn.completed_at as created_at
FROM scan_numbers sn
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_scan_results r2 
  WHERE r2.brand_id = sn.brand_id 
  AND r2.scan_number = sn.scan_number
)
RETURNING id, brand_id, scan_number, created_at;

-- Step 2: Verify the inserts worked
SELECT 
  'Backfill Complete!' as status,
  COUNT(*) as total_results,
  COUNT(DISTINCT brand_id) as brands_with_results,
  MIN(created_at) as oldest_result,
  MAX(created_at) as newest_result
FROM public.ai_scan_results;

