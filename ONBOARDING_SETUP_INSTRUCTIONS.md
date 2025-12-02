# 🚀 Onboarding Wizard - Complete Setup Instructions

## ⚠️ Important: Separate OpenRouter Key

**This onboarding wizard uses a SEPARATE OpenRouter API key** from the one used in `run-geo-scan`. This keeps onboarding costs separate and allows different rate limits.

- **Existing Key** (for GEO scans): Used in `run-geo-scan` function
- **New Key** (for onboarding): Used in `scrape-url`, `generate-topics`, `generate-competitors`

---

## 📋 Step-by-Step Setup

### Step 1: Get OpenRouter API Key for Onboarding

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to **Keys** section
4. Create a **NEW API key** (or use existing one)
5. Copy the key (starts with `sk-or-v1-...`)

**Note:** You can use the same OpenRouter account, but we'll configure it separately for clarity.

---

### Step 2: Deploy Edge Functions to Supabase

You need to deploy **4 new Edge Functions**. Here's how:

#### Option A: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions:**
   - Click **"Edge Functions"** in the left sidebar
   - You'll see existing functions like `run-geo-scan`

3. **Create `scrape-url` Function:**
   - Click **"Create a new function"**
   - Name: `scrape-url`
   - Copy the entire contents of `supabase/functions/scrape-url/index.ts`
   - Paste into the code editor
   - Click **"Deploy"** or **"Save"**

4. **Create `generate-topics` Function:**
   - Click **"Create a new function"**
   - Name: `generate-topics`
   - Copy the entire contents of `supabase/functions/generate-topics/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

5. **Create `generate-competitors` Function:**
   - Click **"Create a new function"**
   - Name: `generate-competitors`
   - Copy the entire contents of `supabase/functions/generate-competitors/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

6. **Create `save-onboarding` Function:**
   - Click **"Create a new function"**
   - Name: `save-onboarding`
   - Copy the entire contents of `supabase/functions/save-onboarding/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

#### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project root
cd c:\Users\agrsm\Downloads\uni-brand-track-6b73bdcd

# Deploy all functions
supabase functions deploy scrape-url
supabase functions deploy generate-topics
supabase functions deploy generate-competitors
supabase functions deploy save-onboarding
```

---

### Step 3: Set Environment Variables (Secrets)

**IMPORTANT:** These secrets are ONLY for the onboarding functions. They won't affect your existing `run-geo-scan` function.

1. **Go to Supabase Dashboard → Edge Functions → Settings**

2. **Add Secrets for Each Function:**

   For **`scrape-url`** function:
   - Go to `scrape-url` → Settings → Secrets
   - Add secret:
     - **Key:** `OPENROUTER_API_KEY`
     - **Value:** `your_openrouter_key_here` (the NEW key you got in Step 1)
   - Click **"Add Secret"**

   For **`generate-topics`** function:
   - Go to `generate-topics` → Settings → Secrets
   - Add secret:
     - **Key:** `OPENROUTER_API_KEY`
     - **Value:** `your_openrouter_key_here` (same key)
   - Add secret:
     - **Key:** `OPENROUTER_MODEL`
     - **Value:** `qwen/qwen-2.5-7b-instruct` (or `groq/llama-3.1-8b-instant`)

   For **`generate-competitors`** function:
   - Go to `generate-competitors` → Settings → Secrets
   - Add secret:
     - **Key:** `OPENROUTER_API_KEY`
     - **Value:** `your_openrouter_key_here` (same key)
   - Add secret:
     - **Key:** `OPENROUTER_MODEL`
     - **Value:** `qwen/qwen-2.5-7b-instruct` (or `groq/llama-3.1-8b-instant`)

   **Note:** `save-onboarding` doesn't need OpenRouter secrets (it only saves to database).

3. **Verify Secrets:**
   - Each function should have `OPENROUTER_API_KEY` set
   - `scrape-url`, `generate-topics`, and `generate-competitors` should have the model set

---

### Step 4: Run Database Migration

1. **Go to Supabase Dashboard → SQL Editor**

2. **Create a new query**

3. **Copy and paste this SQL:**

```sql
-- Add onboarding-related fields to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brands_onboarding_completed ON public.brands(onboarding_completed);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND column_name IN ('industry', 'audience', 'topics', 'competitors', 'onboarding_completed');
```

4. **Click "Run"** (or press Ctrl+Enter)

5. **Verify Success:**
   - You should see "Success. No rows returned" or a table showing the new columns
   - No errors should appear

---

### Step 5: Verify Routes Are Added

The routes are already added to `src/App.tsx`. Verify they exist:

- `/onboarding/website`
- `/onboarding/description`
- `/onboarding/topics`
- `/onboarding/competitors`
- `/onboarding/analysis`
- `/onboarding/complete`

If you need to check, open `src/App.tsx` and look for the onboarding routes section.

---

### Step 6: Test the Onboarding Flow

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test as a New User:**
   - Log out if you're logged in
   - Sign up with a NEW account (or use a test account)
   - After login, you should be **automatically redirected** to `/onboarding/website`

3. **Test Each Step:**

   **Step 1 - Website:**
   - Enter a website URL (e.g., `https://vercel.com`)
   - Click "Analyze Website"
   - Should show loading, then redirect to Description page
   - Check browser console for any errors

   **Step 2 - Description:**
   - Should show AI-generated summary
   - Edit the fields if needed
   - Click "Continue"

   **Step 3 - Topics:**
   - Should show loading spinner
   - Then display topic pills
   - Select multiple topics
   - Click "Continue"

   **Step 4 - Competitors:**
   - Should show loading spinner
   - Then display competitor list
   - Add/remove competitors
   - Click "Continue to Analysis"

   **Step 5 - Analysis:**
   - Should show writing animation
   - Steps appear one by one
   - Then show results cards
   - Click "Continue to Complete"

   **Step 6 - Complete:**
   - Should show "Saving your brand..."
   - Then success message
   - Click "Go to Dashboard"
   - Should redirect to dashboard

4. **Verify Brand Created:**
   - Go to Supabase Dashboard → Table Editor → `brands`
   - Find your test brand
   - Verify fields: `industry`, `audience`, `topics`, `competitors`, `onboarding_completed`

---

## 🔍 Troubleshooting

### Issue: "OpenRouter API error: 401"

**Solution:**
- Check that `OPENROUTER_API_KEY` secret is set correctly
- Verify the key is valid (starts with `sk-or-v1-...`)
- Make sure you added it to the correct function

### Issue: "Rate limit exceeded"

**Solution:**
- The functions automatically fall back to Groq model
- Check Edge Function logs to see which model was used
- Consider upgrading OpenRouter plan for higher limits

### Issue: "Failed to scrape website"

**Solution:**
- Check if the website has CORS restrictions
- Try a different website URL
- Check Edge Function logs for detailed error

### Issue: "Column does not exist"

**Solution:**
- Make sure you ran the database migration (Step 4)
- Check Supabase Dashboard → Table Editor → `brands` → Columns
- Verify `industry`, `audience`, `topics`, `competitors`, `onboarding_completed` exist

### Issue: "Unauthorized" error

**Solution:**
- Make sure user is logged in
- Check that Authorization header is being sent
- Verify Supabase auth is working

### Issue: Onboarding doesn't redirect

**Solution:**
- Clear browser localStorage: `localStorage.clear()`
- Check that `checkOnboardingComplete()` function works
- Verify user has no brands in database

---

## 📊 Function Dependencies

### `scrape-url` needs:
- ✅ `OPENROUTER_API_KEY` (secret)
- ✅ `OPENROUTER_MODEL` (optional secret, defaults to Qwen)
- ✅ `SUPABASE_URL` (auto-provided)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

### `generate-topics` needs:
- ✅ `OPENROUTER_API_KEY` (secret)
- ✅ `OPENROUTER_MODEL` (optional secret)
- ✅ `SUPABASE_URL` (auto-provided)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

### `generate-competitors` needs:
- ✅ `OPENROUTER_API_KEY` (secret)
- ✅ `OPENROUTER_MODEL` (optional secret)
- ✅ `SUPABASE_URL` (auto-provided)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

### `save-onboarding` needs:
- ✅ `SUPABASE_URL` (auto-provided)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)
- ❌ No OpenRouter secrets needed

---

## 🎯 Quick Checklist

- [ ] Got OpenRouter API key (separate from existing one)
- [ ] Deployed `scrape-url` function
- [ ] Deployed `generate-topics` function
- [ ] Deployed `generate-competitors` function
- [ ] Deployed `save-onboarding` function
- [ ] Added `OPENROUTER_API_KEY` secret to all 3 functions
- [ ] Added `OPENROUTER_MODEL` secret (optional)
- [ ] Ran database migration
- [ ] Verified columns exist in `brands` table
- [ ] Tested onboarding flow end-to-end
- [ ] Verified brand is created in database

---

## 🔐 Security Notes

- **Never commit API keys** to git
- Secrets are stored securely in Supabase Dashboard
- Each function has its own secret scope
- The onboarding OpenRouter key is separate from GEO scan key
- RLS policies protect brand data

---

## 📝 Model Options

You can use these free models (no credit card needed):

1. **Qwen (Recommended):**
   - Model: `qwen/qwen-2.5-7b-instruct`
   - Free tier available
   - Good quality

2. **Groq (Fallback):**
   - Model: `groq/llama-3.1-8b-instant`
   - Very fast
   - Free tier available

3. **Other Free Models:**
   - `meta-llama/llama-3.2-3b-instruct:free`
   - `google/gemma-2-2b-it:free`

Set `OPENROUTER_MODEL` secret to your preferred model, or leave it unset to use the default (Qwen).

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ New users are automatically redirected to `/onboarding/website`
2. ✅ Website analysis completes successfully
3. ✅ Topics are generated and displayed
4. ✅ Competitors are generated and displayed
5. ✅ Analysis page shows loading animation
6. ✅ Brand is saved to database
7. ✅ User is redirected to dashboard
8. ✅ Dashboard shows the new brand

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → [Function Name] → Logs
   - Look for error messages

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

3. **Verify Secrets:**
   - Go to each function → Settings → Secrets
   - Verify `OPENROUTER_API_KEY` is set
   - Make sure there are no typos

4. **Test API Key:**
   - Try calling OpenRouter API directly
   - Use curl or Postman to verify key works

---

## 🎉 You're Done!

Once all steps are complete, your onboarding wizard is ready to use. New users will be guided through the setup process automatically!

