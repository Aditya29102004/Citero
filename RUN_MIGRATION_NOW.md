# ⚠️ Run Database Migration Now

You're getting a 400 error because the `ai_provider` column doesn't exist in your database yet.

## Quick Fix:

1. **Go to Supabase Dashboard** → **SQL Editor**

2. **Copy and paste this SQL:**
   ```sql
   -- Add AI provider preference to brands table
   ALTER TABLE public.brands 
   ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'gemini'));

   -- Add AI provider preference to profiles table (user default)
   ALTER TABLE public.profiles 
   ADD COLUMN IF NOT EXISTS default_ai_provider TEXT DEFAULT 'openai' CHECK (default_ai_provider IN ('openai', 'gemini'));
   ```

3. **Click "Run"**

4. **Done!** The error should be gone.

---

## Alternative: Use the Migration File

Or run the file: `supabase_migration_ai_provider.sql`

---

## After Running Migration:

- ✅ The AI Provider dropdown will save your preference
- ✅ Each brand can have its own AI provider setting
- ✅ No more 400 errors when changing providers

The app will work without the migration (it just won't save the preference), but running it enables the full feature!

