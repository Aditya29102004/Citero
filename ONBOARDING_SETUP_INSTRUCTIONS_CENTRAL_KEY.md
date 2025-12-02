# 🚀 Onboarding Wizard - Setup with Central OpenRouter Key

## ⚠️ Important: Central OpenRouter Key Setup

**This guide shows how to use ONE central OpenRouter API key** for all onboarding functions. This is easier to manage than setting secrets per function.

- **Central Key**: Used by `scrape-url`, `generate-topics`, `generate-competitors`
- **Separate Key**: Your existing `run-geo-scan` function keeps its own key (won't be affected)

---

## 📋 Step-by-Step Setup

### Step 1: Get OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to **Keys** section
4. Create a **NEW API key** (or use existing one)
5. Copy the key (starts with `sk-or-v1-...`)

**Note:** This can be the same key you use for `run-geo-scan`, or a different one. Your choice!

---

### Step 2: Set Central Secret in Supabase

**Option A: Using Supabase Dashboard (Recommended)**

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Project Settings:**
   - Click **"Project Settings"** (gear icon) in left sidebar
   - Click **"Edge Functions"** tab
   - Scroll to **"Secrets"** section

3. **Add Central Secret:**
   - Click **"Add Secret"** or **"New Secret"**
   - **Key Name:** `ONBOARDING_OPENROUTER_API_KEY`
   - **Value:** Paste your OpenRouter API key
   - Click **"Save"**

4. **Add Model Secret (Optional):**
   - Click **"Add Secret"** again
   - **Key Name:** `ONBOARDING_OPENROUTER_MODEL`
   - **Value:** `qwen/qwen-2.5-7b-instruct` (or your preferred model)
   - Click **"Save"**

**Option B: Using Supabase CLI**

```bash
# Set central secret (available to all functions)
supabase secrets set ONBOARDING_OPENROUTER_API_KEY=your_key_here

# Set model (optional)
supabase secrets set ONBOARDING_OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct
```

---

### Step 3: Update Edge Functions to Use Central Secret

We need to update the functions to use the central secret name. Here's what to change:

#### Update `scrape-url/index.ts`:

Change line 9 from:
```typescript
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
```

To:
```typescript
const OPENROUTER_API_KEY = Deno.env.get("ONBOARDING_OPENROUTER_API_KEY") ?? "";
```

Change line 10 from:
```typescript
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "qwen/qwen-2.5-7b-instruct";
```

To:
```typescript
const OPENROUTER_MODEL = Deno.env.get("ONBOARDING_OPENROUTER_MODEL") ?? "qwen/qwen-2.5-7b-instruct";
```

#### Update `generate-topics/index.ts`:

Same changes - replace `OPENROUTER_API_KEY` with `ONBOARDING_OPENROUTER_API_KEY` and `OPENROUTER_MODEL` with `ONBOARDING_OPENROUTER_MODEL`

#### Update `generate-competitors/index.ts`:

Same changes - replace `OPENROUTER_API_KEY` with `ONBOARDING_OPENROUTER_API_KEY` and `OPENROUTER_MODEL` with `ONBOARDING_OPENROUTER_MODEL`

**Note:** `save-onboarding` doesn't need OpenRouter, so no changes needed.

---

### Step 4: Deploy Edge Functions

#### Option A: Using Supabase Dashboard

1. **Go to Edge Functions:**
   - Click **"Edge Functions"** in left sidebar

2. **Update `scrape-url`:**
   - Click on `scrape-url` function
   - Click **"Edit"**
   - Update the secret names (as shown in Step 3)
   - Click **"Deploy"**

3. **Update `generate-topics`:**
   - Click on `generate-topics` function
   - Click **"Edit"**
   - Update the secret names
   - Click **"Deploy"**

4. **Update `generate-competitors`:**
   - Click on `generate-competitors` function
   - Click **"Edit"**
   - Update the secret names
   - Click **"Deploy"**

5. **Create `save-onboarding` (if not created):**
   - Click **"Create a new function"**
   - Name: `save-onboarding`
   - Copy code from `supabase/functions/save-onboarding/index.ts`
   - Click **"Deploy"**

#### Option B: Using Supabase CLI

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

### Step 5: Verify Secrets Are Accessible

1. **Test a Function:**
   - Go to Edge Functions → `scrape-url` → Logs
   - Try calling the function
   - Check logs for any "secret not found" errors

2. **Verify Secret Names:**
   - Make sure you used `ONBOARDING_OPENROUTER_API_KEY` (not `OPENROUTER_API_KEY`)
   - This keeps it separate from `run-geo-scan` which uses `OPENROUTER_API_KEY`

---

### Step 6: Run Database Migration

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

4. **Click "Run"**

5. **Verify Success:**
   - You should see the new columns listed
   - No errors should appear

---

### Step 7: Test the Onboarding Flow

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test as a New User:**
   - Log out if you're logged in
   - Sign up with a NEW account
   - After login, you should be **automatically redirected** to `/onboarding/website`

3. **Test Each Step:**
   - Enter a website URL → Should analyze successfully
   - Review description → Should show AI-generated content
   - Select topics → Should show generated topics
   - Review competitors → Should show generated list
   - Watch analysis → Should show loading animation
   - Complete → Should save and redirect to dashboard

4. **Verify Brand Created:**
   - Go to Supabase Dashboard → Table Editor → `brands`
   - Find your test brand
   - Verify all fields are populated

---

## 🔐 Secret Management Summary

### Central Secrets (Project Level):
- `ONBOARDING_OPENROUTER_API_KEY` - Used by all onboarding functions
- `ONBOARDING_OPENROUTER_MODEL` - Optional, defaults to Qwen

### Function-Specific Secrets:
- `run-geo-scan` uses `OPENROUTER_API_KEY` (separate, won't be affected)

### How It Works:
```
Project Secrets (Available to ALL functions)
├── ONBOARDING_OPENROUTER_API_KEY → scrape-url, generate-topics, generate-competitors
├── ONBOARDING_OPENROUTER_MODEL → scrape-url, generate-topics, generate-competitors
└── OPENROUTER_API_KEY → run-geo-scan (existing, separate)
```

---

## 🎯 Benefits of Central Key

✅ **Easier Management:** One place to update the key  
✅ **Consistent:** All onboarding functions use the same key  
✅ **Separate:** Doesn't interfere with `run-geo-scan`  
✅ **Flexible:** Can use same or different key as GEO scans  

---

## 🔍 Troubleshooting

### Issue: "ONBOARDING_OPENROUTER_API_KEY is not set"

**Solution:**
- Verify secret is set in Project Settings → Edge Functions → Secrets
- Check secret name is exactly `ONBOARDING_OPENROUTER_API_KEY` (case-sensitive)
- Redeploy the function after setting the secret

### Issue: Function can't access secret

**Solution:**
- Make sure secret is set at **Project Settings** level, not function level
- Verify function code uses `ONBOARDING_OPENROUTER_API_KEY` (not `OPENROUTER_API_KEY`)
- Redeploy function after updating code

### Issue: Wrong key being used

**Solution:**
- Check function code uses `ONBOARDING_OPENROUTER_API_KEY`
- Verify project-level secret is set correctly
- Check function logs to see which key it's trying to use

---

## ✅ Quick Checklist

- [ ] Got OpenRouter API key
- [ ] Set `ONBOARDING_OPENROUTER_API_KEY` in Project Settings → Edge Functions → Secrets
- [ ] Set `ONBOARDING_OPENROUTER_MODEL` (optional)
- [ ] Updated `scrape-url` to use `ONBOARDING_OPENROUTER_API_KEY`
- [ ] Updated `generate-topics` to use `ONBOARDING_OPENROUTER_API_KEY`
- [ ] Updated `generate-competitors` to use `ONBOARDING_OPENROUTER_API_KEY`
- [ ] Deployed all 4 functions
- [ ] Ran database migration
- [ ] Tested onboarding flow end-to-end
- [ ] Verified brand is created in database

---

## 📝 Notes

- **Central secrets** are available to ALL Edge Functions in your project
- **Function-specific secrets** override project-level secrets if both exist
- Using `ONBOARDING_` prefix keeps it separate from `run-geo-scan`
- You can use the same OpenRouter key for both, or different keys
- The central key approach is cleaner and easier to manage

---

## 🎉 You're Done!

Once all steps are complete, your onboarding wizard will use the central OpenRouter key. All onboarding functions will share the same key, making it easy to manage and update!

