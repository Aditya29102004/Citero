# ⚠️ CRITICAL: Edge Function File is Empty

The file `supabase/functions/run-geo-scan/index.ts` appears to be empty. You need to restore it.

## Option 1: Copy from Supabase Dashboard (Recommended)

If the function is already deployed in Supabase:

1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
2. Click on the function to open it
3. Copy ALL the code from the editor
4. Paste it into `supabase/functions/run-geo-scan/index.ts` in your local project
5. Save the file

## Option 2: Restore from Git (If using version control)

```bash
git checkout HEAD -- supabase/functions/run-geo-scan/index.ts
```

Or if you have uncommitted changes:
```bash
git restore supabase/functions/run-geo-scan/index.ts
```

## Option 3: Re-download from Supabase

If the function is deployed but you can't access it locally:

1. Go to **Supabase Dashboard** → **Edge Functions** → **run-geo-scan**
2. Copy all code
3. Create/restore the file locally: `supabase/functions/run-geo-scan/index.ts`
4. Paste the code

---

## After Restoring:

1. **Fix the migration SQL** (already fixed - see below)
2. **Run the 3 migrations** in Supabase SQL Editor
3. **Redeploy the function** if needed

---

## Fixed Migration SQL

The migration file `20250124000002_allow_service_role_inserts.sql` has been fixed. Use this corrected version:

```sql
-- Add policy to allow service role to insert scan results
-- This ensures edge functions can insert even if RLS is enabled

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert scan results" ON public.ai_scan_results;
DROP POLICY IF EXISTS "Service role can view scan results" ON public.ai_scan_results;

-- Create policies for service role
CREATE POLICY "Service role can insert scan results"
  ON public.ai_scan_results FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow service role to select (for scan number calculation)
CREATE POLICY "Service role can view scan results"
  ON public.ai_scan_results FOR SELECT
  TO service_role
  USING (true);
```

