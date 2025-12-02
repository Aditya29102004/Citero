# Fix Scan Results Insert - Step by Step Guide

## Problem
Scans complete successfully but results aren't being inserted into `ai_scan_results` table, causing dashboard to show "No previous scans found".

## Solution
Run 3 database migrations and redeploy the edge function.

---

## Step 1: Run Database Migrations

Go to **Supabase Dashboard** → **SQL Editor** and run these migrations **in order**:

### Migration 1: Add Cancelled Status
```sql
-- Add 'cancelled' status to scans table
ALTER TABLE public.scans
DROP CONSTRAINT IF EXISTS scans_status_check;

ALTER TABLE public.scans
ADD CONSTRAINT scans_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
```

**File:** `supabase/migrations/20250124000000_add_cancelled_status_to_scans.sql`

### Migration 2: Create Insert Function
```sql
-- Create a function to insert scan results that bypasses RLS
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
  ) VALUES (
    p_brand_id,
    p_scan_number,
    p_visibility_score,
    p_citation_share,
    p_sentiment_positive,
    p_sentiment_neutral,
    p_sentiment_negative,
    p_competitor_scores,
    p_citation_sources,
    p_platform
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO authenticated;
GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO service_role;
```

**File:** `supabase/migrations/20250124000001_add_service_role_insert_function.sql`

### Migration 3: Add Service Role Policies
```sql
-- Add policy to allow service role to insert scan results
CREATE POLICY IF NOT EXISTS "Service role can insert scan results"
  ON public.ai_scan_results FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow service role to select (for scan number calculation)
CREATE POLICY IF NOT EXISTS "Service role can view scan results"
  ON public.ai_scan_results FOR SELECT
  TO service_role
  USING (true);
```

**File:** `supabase/migrations/20250124000002_allow_service_role_inserts.sql`

**How to run:**
1. Copy each SQL block above
2. Paste into Supabase Dashboard → SQL Editor
3. Click **Run** for each one
4. Verify no errors appear

---

## Step 2: Redeploy Edge Function

The edge function code has been updated with better error handling and retry logic.

### Option A: Using Supabase Dashboard (Easiest)

1. Open `supabase/functions/run-geo-scan/index.ts` in your code editor
2. Select ALL code (Ctrl+A / Cmd+A)
3. Copy (Ctrl+C / Cmd+C)
4. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
5. Click **Edit** or open code editor
6. Delete ALL existing code
7. Paste the new code
8. Click **Deploy** or **Save**

### Option B: Using Supabase CLI

```bash
cd /path/to/your/project
supabase functions deploy run-geo-scan
```

---

## Step 3: Verify Setup

### Check 1: Verify Function Exists
```sql
-- Run in SQL Editor
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'insert_ai_scan_result';
```
Should return 1 row.

### Check 2: Verify Policies Exist
```sql
-- Run in SQL Editor
SELECT policyname, roles 
FROM pg_policies 
WHERE tablename = 'ai_scan_results';
```
Should show policies including "Service role can insert scan results".

### Check 3: Verify Service Role Key
1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` exists
3. If missing, add it (get from **Project Settings** → **API** → **service_role** key)

---

## Step 4: Test the Fix

1. **Run a new GEO Scan:**
   - Go to Dashboard
   - Click "Run GEO Scan"
   - Wait for it to complete

2. **Check Edge Function Logs:**
   - Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan** → **Logs**
   - Look for:
     - ✅ `"Successfully inserted scan result #X into ai_scan_results"`
     - ✅ `"Successfully inserted via function, ID: ..."`
     - ❌ If you see errors, check the error code and message

3. **Check Dashboard:**
   - After scan completes, dashboard should automatically refresh
   - You should see charts and data instead of "No previous scans found"

4. **Verify in Database:**
   - Go to **Supabase Dashboard** → **Table Editor** → **ai_scan_results**
   - Should see new rows with `scan_number`, `platform`, `visibility_score`, etc.

---

## Step 5: Troubleshooting

### If inserts still fail:

**Check Edge Function Logs for:**
- Error code `42501` = Permission denied (RLS blocking)
  - **Fix:** Make sure Migration 3 ran successfully
- Error code `23505` = Unique constraint violation
  - **Fix:** The function will auto-retry with next scan_number
- Error code `42883` = Function does not exist
  - **Fix:** Make sure Migration 2 ran successfully

**Verify Service Role Key:**
```sql
-- Check if service role can insert (run in SQL Editor)
-- This should work if policies are correct
SET ROLE service_role;
INSERT INTO ai_scan_results (brand_id, scan_number, platform) 
VALUES ('00000000-0000-0000-0000-000000000000', 999, 'test');
-- Should succeed (or fail with foreign key error, not permission error)
ROLLBACK;
```

**Check RLS Status:**
```sql
-- Verify RLS is enabled but policies exist
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'ai_scan_results';
-- rowsecurity should be 't' (true)
```

---

## Expected Results After Fix

✅ Scans complete and insert results into `ai_scan_results`  
✅ Dashboard shows historical data and charts  
✅ No more "No previous scans found" message  
✅ Progress indicator shows scan completion  
✅ Cancel button works properly  

---

## Quick Checklist

- [ ] Migration 1: Cancelled status added
- [ ] Migration 2: Insert function created
- [ ] Migration 3: Service role policies added
- [ ] Edge function redeployed with latest code
- [ ] Service role key verified in secrets
- [ ] Test scan run successfully
- [ ] Results appear in dashboard
- [ ] Edge function logs show successful insert

---

## Need Help?

If issues persist:
1. Check Edge Function logs for specific error messages
2. Verify all 3 migrations ran successfully
3. Check browser console (F12) for client-side errors
4. Verify `ai_scan_results` table exists and has correct structure

