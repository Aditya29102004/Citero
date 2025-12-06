# Debugging Leads Extraction

## Issue
Leads are not appearing in the UI even after running GEO scans.

## Debugging Steps

### 1. Check Database Table
Run this SQL in Supabase SQL Editor to verify data exists:

```sql
-- Check if table exists and has data
SELECT COUNT(*) as total_count FROM ai_people_mentions;

-- Check data for your brand
SELECT * FROM ai_people_mentions 
WHERE brand_id = 'YOUR_BRAND_ID' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check recent scans
SELECT id, brand_id, status, completed_at 
FROM scans 
WHERE brand_id = 'YOUR_BRAND_ID' 
ORDER BY started_at DESC 
LIMIT 5;
```

### 2. Check Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → `run-geo-scan`
3. Check logs for:
   - "Extracted X people via LLM"
   - "Extracted X people via regex"
   - "Storing X unique people mentions"
   - "Successfully stored batch X"

### 3. Check Browser Console
Look for these logs:
- `[LeadsList] Fetching leads for brand_id: ...`
- `[LeadsList] Total people mentions in database: ...`
- `[LeadsList] Raw data fetched: X records`
- `[LeadsList] Sample data: ...`

### 4. Test Extraction Manually
You can test the extraction function by calling it directly. Check the Edge Function logs to see if extraction is happening.

### 5. Common Issues

#### Issue: Table doesn't exist
**Solution**: Run the SQL from `PEOPLE_EXTRACTION_SETUP.md` to create the table.

#### Issue: No data being extracted
**Possible causes**:
- LLM responses don't contain people names
- Extraction prompt not working
- JSON parsing failing

**Check**: Look for "Extracted X people" logs in Edge Function

#### Issue: Data extracted but not stored
**Possible causes**:
- Database insert errors
- Permission issues
- Wrong brand_id

**Check**: Look for "Error storing people batch" in Edge Function logs

#### Issue: Data stored but not showing
**Possible causes**:
- Wrong brand_id in query
- Deduplication filtering everything
- Component not refreshing

**Check**: Run SQL query to verify data exists for your brand_id

### 6. Manual Test Query
```sql
-- Insert a test record
INSERT INTO ai_people_mentions (
  scan_id,
  brand_id,
  name,
  role,
  company,
  relevance,
  snippet
) VALUES (
  (SELECT id FROM scans WHERE brand_id = 'YOUR_BRAND_ID' LIMIT 1),
  'YOUR_BRAND_ID',
  'Test Person',
  'CEO',
  'Test Company',
  'Test relevance',
  'Test snippet'
);

-- Then refresh the LeadsList component
```

### 7. Verify Extraction is Running
Check Edge Function logs during a scan for:
- "Question X: Extracted Y people" (should appear for each question)
- "Total people extracted before deduplication: X"
- "Unique people after deduplication: X"

If you don't see these logs, extraction might not be running.

