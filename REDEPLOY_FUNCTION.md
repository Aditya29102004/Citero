# How to Redeploy the run-geo-scan Function

The function code in `supabase/functions/run-geo-scan/index.ts` has been updated to support both ChatGPT and Gemini.

## Option 1: Using Supabase Dashboard (Easiest)

1. **Open the function file:**
   - Open `supabase/functions/run-geo-scan/index.ts` in your code editor
   - Select ALL the code (Ctrl+A / Cmd+A)
   - Copy it (Ctrl+C / Cmd+C)

2. **Go to Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `fakhmxfxnszmvxihpann`
   - Click **"Edge Functions"** in the left sidebar

3. **Update the function:**
   - Find **`run-geo-scan`** in the list
   - Click on it to open
   - Click **"Edit"** or the code editor
   - Select all existing code and delete it
   - Paste the new code you copied
   - Click **"Deploy"** or **"Save"**

4. **Done!** The function is now updated with both provider support.

---

## Option 2: Using Supabase CLI (If you have it installed)

1. **Open terminal** in your project directory

2. **Login to Supabase** (if not already):
   ```bash
   supabase login
   ```

3. **Link your project** (if not already):
   ```bash
   supabase link --project-ref fakhmxfxnszmvxihpann
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy run-geo-scan
   ```

5. **Done!** The function is deployed with the latest code.

---

## What Changed in the Code?

The updated function now:
- ✅ Supports both OpenAI (ChatGPT) and Gemini APIs
- ✅ Accepts `aiProvider` parameter in the request
- ✅ Falls back to brand's saved `ai_provider` setting if not specified
- ✅ Validates API keys based on selected provider
- ✅ Uses the correct API endpoint based on provider choice

---

## Verify It's Working

After deploying:

1. Go to your brand dashboard
2. You should see the "AI Provider" dropdown
3. Select either "ChatGPT (OpenAI)" or "Gemini (Google)"
4. Click "Run GEO Scan"
5. Check Edge Function logs to confirm it's using the right provider

---

## Troubleshooting

**Function not updating?**
- Make sure you saved/deployed after pasting the code
- Check Edge Functions → `run-geo-scan` → Logs for any errors

**Still seeing old behavior?**
- Clear browser cache
- Restart your dev server
- Make sure you deployed the correct file

**Need the exact code?**
- The code is in: `supabase/functions/run-geo-scan/index.ts`
- Just copy the entire contents of that file

