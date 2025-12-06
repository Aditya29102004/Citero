# Leads Extraction - Debugging Guide

## Quick Check: Is the Edge Function Updated?

The extraction code was updated, but **you need to redeploy the Edge Function** for changes to take effect.

### Step 1: Redeploy Edge Function

1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
2. Click **"Edit"** or open code editor
3. Copy the entire content from `supabase/functions/run-geo-scan/index.ts`
4. Paste it into the Supabase editor
5. Click **"Deploy"** or **"Save"**

### Step 2: Check Browser Console

After redeploying, run a new scan and check browser console (F12) for:
- `[LeadsList] Fetching leads for brand_id: ...`
- `[LeadsList] Total people mentions in database: ...`
- `[LeadsList] Raw data fetched: X records`

### Step 3: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan** → **Logs**
2. Run a scan
3. Look for these logs:
   - `Question X: Extracted Y people` (for each question)
   - `Total people extracted before deduplication: X`
   - `Storing X unique people mentions to database`
   - `Successfully stored batch X`

### Step 4: Verify Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT COUNT(*) FROM ai_people_mentions;

-- Check for your brand
SELECT * FROM ai_people_mentions 
WHERE brand_id = 'YOUR_BRAND_ID_HERE'
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent scans
SELECT id, brand_id, status, completed_at, completed_questions
FROM scans 
WHERE brand_id = 'YOUR_BRAND_ID_HERE'
ORDER BY started_at DESC 
LIMIT 5;
```

## Common Issues

### Issue 1: No Extraction Logs
**Symptom**: Edge Function logs show no "Extracted X people" messages
**Solution**: Edge Function not redeployed with new code

### Issue 2: Extraction Happening But No Storage
**Symptom**: See "Extracted X people" but no "Storing" logs
**Solution**: Check for database errors in Edge Function logs

### Issue 3: Data Stored But Not Showing
**Symptom**: SQL query shows data exists, but UI shows empty
**Solution**: 
- Check browser console for `[LeadsList]` logs
- Verify `brand_id` matches
- Click refresh button in LeadsList component

### Issue 4: Table Doesn't Exist
**Symptom**: SQL query fails with "relation does not exist"
**Solution**: Run the SQL from `PEOPLE_EXTRACTION_SETUP.md` to create the table

## Test Extraction Manually

After redeploying, the extraction should work automatically. But you can verify by:

1. Running a GEO scan
2. Checking Edge Function logs for extraction messages
3. Checking database for stored people
4. Refreshing the LeadsList component

## Next Steps

1. **Redeploy the Edge Function** (most important!)
2. Run a new GEO scan
3. Check Edge Function logs
4. Check browser console
5. Check database with SQL query

If still not working after redeploying, share:
- Edge Function logs (especially extraction messages)
- Browser console logs (especially `[LeadsList]` messages)
- SQL query results

