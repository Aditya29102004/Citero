# ⚠️ IMMEDIATE FIX: Still Showing "No Scans"

## Critical Issue
The edge function file is **EMPTY** and needs to be restored before new scans can work.

## Step-by-Step Fix

### Step 1: Restore Edge Function Code ⚠️ CRITICAL

**The file `supabase/functions/run-geo-scan/index.ts` is empty!**

**Option A: Copy from Supabase Dashboard (FASTEST)**
1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
2. If you see code there, copy ALL of it
3. Paste into `supabase/functions/run-geo-scan/index.ts`
4. Save the file

**Option B: If function is also empty in Dashboard**
- You'll need to restore from git history or backup
- Or rebuild the function (see below)

### Step 2: Run All 3 Migrations

Go to **Supabase Dashboard** → **SQL Editor** and run these **in order**:

#### Migration 1: Cancelled Status
```sql
ALTER TABLE public.scans
DROP CONSTRAINT IF EXISTS scans_status_check;

ALTER TABLE public.scans
ADD CONSTRAINT scans_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
```

#### Migration 2: Insert Function
```sql
CREATE OR REPLACE FUNCTION insert_ai_scan_result(
  p_brand_id UUID,
  p_scan_number INTEGER,
  p_visibility_score FLOAT8,
  p_citation_share FLOAT8,
  p_sentiment_positive INTEGER,
  p_sentiment_neutral INTEGER,
  p_sentiment_negative INTEGER,
  p_competitor_scores JSONB,
  p_citation_sources JSONB,
  p_platform TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ai_scan_results (
    brand_id, scan_number, visibility_score, citation_share,
    sentiment_positive, sentiment_neutral, sentiment_negative,
    competitor_scores, citation_sources, platform
  ) VALUES (
    p_brand_id, p_scan_number, p_visibility_score, p_citation_share,
    p_sentiment_positive, p_sentiment_neutral, p_sentiment_negative,
    p_competitor_scores, p_citation_sources, p_platform
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO authenticated;
GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO service_role;
```

#### Migration 3: Service Role Policies (FIXED)
```sql
DROP POLICY IF EXISTS "Service role can insert scan results" ON public.ai_scan_results;
DROP POLICY IF EXISTS "Service role can view scan results" ON public.ai_scan_results;

CREATE POLICY "Service role can insert scan results"
  ON public.ai_scan_results FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can view scan results"
  ON public.ai_scan_results FOR SELECT
  TO service_role
  USING (true);
```

### Step 3: Backfill Existing Completed Scans

If you have completed scans but no results, run this to create basic entries:

```sql
-- Get scan responses data for completed scans
WITH scan_data AS (
  SELECT 
    s.brand_id,
    s.id as scan_id,
    s.completed_at,
    s.visibility_score,
    COUNT(DISTINCT sr.id) as response_count,
    COUNT(DISTINCT CASE WHEN sr.brand_mentioned THEN sr.id END) as mentions_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'positive' THEN sr.id END) as positive_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'neutral' THEN sr.id END) as neutral_count,
    COUNT(DISTINCT CASE WHEN sr.sentiment = 'negative' THEN sr.id END) as negative_count
  FROM public.scans s
  LEFT JOIN public.scan_responses sr ON s.id = sr.scan_id
  WHERE s.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.ai_scan_results r 
      WHERE r.brand_id = s.brand_id 
      AND r.created_at BETWEEN s.started_at - INTERVAL '1 minute' AND s.completed_at + INTERVAL '5 minutes'
    )
  GROUP BY s.brand_id, s.id, s.completed_at, s.visibility_score
),
scan_numbers AS (
  SELECT 
    sd.*,
    COALESCE(MAX(r.scan_number), 0) + ROW_NUMBER() OVER (PARTITION BY sd.brand_id ORDER BY sd.completed_at) as scan_number
  FROM scan_data sd
  LEFT JOIN public.ai_scan_results r ON sd.brand_id = r.brand_id
  GROUP BY sd.brand_id, sd.scan_id, sd.completed_at, sd.visibility_score, sd.response_count, sd.mentions_count, sd.positive_count, sd.neutral_count, sd.negative_count
)
INSERT INTO public.ai_scan_results (
  brand_id, scan_number, visibility_score, citation_share,
  sentiment_positive, sentiment_neutral, sentiment_negative,
  competitor_scores, citation_sources, platform, created_at
)
SELECT 
  sn.brand_id,
  sn.scan_number,
  COALESCE(sn.visibility_score, 0) as visibility_score,
  CASE 
    WHEN sn.response_count > 0 THEN (sn.mentions_count::float / sn.response_count::float * 100)
    ELSE 0
  END as citation_share,
  sn.positive_count as sentiment_positive,
  sn.neutral_count as sentiment_neutral,
  sn.negative_count as sentiment_negative,
  '{}'::jsonb as competitor_scores,
  '[]'::jsonb as citation_sources,
  'chatgpt' as platform,
  sn.completed_at as created_at
FROM scan_numbers sn
ON CONFLICT DO NOTHING;
```

### Step 4: Verify

Run these diagnostic queries (see `DIAGNOSTIC_QUERIES.sql`):

```sql
-- Check if results exist
SELECT COUNT(*) FROM public.ai_scan_results;

-- Check completed scans vs results
SELECT 
  COUNT(DISTINCT s.id) as completed_scans,
  COUNT(DISTINCT r.id) as result_records
FROM public.scans s
LEFT JOIN public.ai_scan_results r ON s.brand_id = r.brand_id
WHERE s.status = 'completed';
```

### Step 5: Test New Scan

1. Restore edge function code
2. Redeploy function in Supabase Dashboard
3. Run a new GEO scan
4. Check Edge Function logs for: "Successfully inserted scan result"

---

## Quick Checklist

- [ ] Edge function code restored (file not empty)
- [ ] All 3 migrations run successfully
- [ ] Backfill SQL run for existing scans (if needed)
- [ ] Function redeployed in Supabase Dashboard
- [ ] Test scan run and logs checked
- [ ] Dashboard shows results

