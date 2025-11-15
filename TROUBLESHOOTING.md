# Troubleshooting: "No AI responses were generated"

If you see "No AI responses were generated for this scan", here's how to fix it:

## Step 1: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **`run-geo-scan`** function
3. Click on **"Logs"** tab
4. Look for error messages

**Common errors you might see:**
- `OPENAI_API_KEY is not set` → Go to Step 2
- `OpenAI API failed: 401` → Your API key is invalid or expired
- `OpenAI API failed: 429` → You've hit rate limits (upgrade plan or add credits)
- `Error saving response` → Database permission issue (Step 3)

---

## Step 2: Verify OPENAI_API_KEY is Set

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Check if `OPENAI_API_KEY` exists
3. If missing, add it:
   - Click **"Add secret"**
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (get it from https://platform.openai.com/api-keys)
4. **Redeploy the function** after adding/updating the secret

**Note:** The function now uses OpenAI API instead of Lovable. You need an OpenAI account and API key.

---

## Step 3: Check Database Permissions

The function needs to write to `scan_responses` table. Verify:

1. Go to **Table Editor** → **scan_responses**
2. Check if RLS policies allow inserts
3. The function uses `SUPABASE_SERVICE_ROLE_KEY` which should bypass RLS, but verify the key is set correctly

---

## Step 4: Redeploy the Function

After making any changes:

1. Go to **Edge Functions** → **run-geo-scan**
2. Click **"Redeploy"** or update the code
3. Make sure the latest code (with error handling) is deployed

---

## Step 5: Test Again

1. Go back to your app
2. Click **"Run GEO Scan"**
3. Check the browser console (F12) for any errors
4. Check Edge Function logs again

---

## Quick Checklist

- [ ] `OPENAI_API_KEY` secret is set in Edge Functions (get from https://platform.openai.com/api-keys)
- [ ] `SUPABASE_URL` secret is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` secret is set
- [ ] Function is deployed with latest code (now uses OpenAI, not Lovable)
- [ ] Checked Edge Function logs for errors
- [ ] Database tables exist (run `supabase_setup.sql` if not)

---

## Still Not Working?

Check the Edge Function logs and share the error message. The updated code now provides better error messages to help diagnose the issue.

