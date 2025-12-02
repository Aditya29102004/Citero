# 🚨 URGENT: Fix Dashboard Right Now

## Your Situation
- ✅ 3 completed scans
- ❌ 0 results in `ai_scan_results`
- ❌ Dashboard shows "No scans"

## IMMEDIATE FIX (2 Steps)

### Step 1: Backfill Your 3 Scans (DO THIS NOW)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the ENTIRE contents of `BACKFILL_3_SCANS.sql`
3. Click **Run**
4. You should see: "Backfill Complete! 3 total_results"

**This will immediately fix your dashboard!**

### Step 2: Restore Edge Function (So Future Scans Work)

The file `supabase/functions/run-geo-scan/index.ts` is **EMPTY**. You must restore it:

1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
2. **Copy ALL the code** you see there
3. Open `supabase/functions/run-geo-scan/index.ts` in your editor
4. **Paste the code** and save
5. Go back to Supabase Dashboard → **Edge Functions** → **run-geo-scan**
6. Click **Deploy** (or paste code there and deploy)

---

## Verify It Worked

After Step 1, refresh your dashboard. You should see:
- ✅ Charts with data
- ✅ KPI cards populated
- ✅ Historical trends

---

## If Backfill Fails

Run this diagnostic first:
```sql
SELECT 
  s.id,
  s.brand_id,
  s.status,
  s.completed_at,
  COUNT(sr.id) as response_count
FROM public.scans s
LEFT JOIN public.scan_responses sr ON s.id = sr.scan_id
WHERE s.status = 'completed'
GROUP BY s.id, s.brand_id, s.status, s.completed_at;
```

If `response_count` is 0 for all scans, the scans completed but have no response data. In that case, we'll need to create minimal entries.

---

## After Fix

1. ✅ Dashboard shows your 3 scans
2. ✅ Run a NEW scan to test edge function
3. ✅ New scan should insert results automatically

