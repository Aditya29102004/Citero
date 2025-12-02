# ⚡ Quick Setup: Central OpenRouter Key

## 🎯 What You Need to Do

### 1. Set Central Secret (One Time)

**In Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Click **"Add Secret"**
3. **Key:** `ONBOARDING_OPENROUTER_API_KEY`
4. **Value:** Your OpenRouter API key
5. Click **"Save"**

**Optional - Set Model:**
1. Click **"Add Secret"** again
2. **Key:** `ONBOARDING_OPENROUTER_MODEL`
3. **Value:** `qwen/qwen-2.5-7b-instruct`
4. Click **"Save"**

### 2. Deploy Functions

The functions are already updated to use `ONBOARDING_OPENROUTER_API_KEY`. Just deploy them:

**In Supabase Dashboard:**
1. Go to **Edge Functions**
2. For each function (`scrape-url`, `generate-topics`, `generate-competitors`):
   - Click the function
   - Click **"Deploy"** (or **"Save"** if already deployed)

**Or using CLI:**
```bash
supabase functions deploy scrape-url
supabase functions deploy generate-topics
supabase functions deploy generate-competitors
supabase functions deploy save-onboarding
```

### 3. Run Migration

**In Supabase Dashboard → SQL Editor:**
```sql
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_brands_onboarding_completed ON public.brands(onboarding_completed);
```

Click **"Run"**

### 4. Test

1. Start dev server: `npm run dev`
2. Log in as new user
3. Should redirect to `/onboarding/website`
4. Complete all steps
5. Verify brand created in database

---

## ✅ That's It!

The functions are now configured to use the central `ONBOARDING_OPENROUTER_API_KEY` secret. This key is separate from your `run-geo-scan` function's key, so they won't interfere with each other.

---

## 🔐 Key Separation

- **Onboarding Functions:** Use `ONBOARDING_OPENROUTER_API_KEY` (central)
- **GEO Scan Function:** Uses `OPENROUTER_API_KEY` (separate, existing)

Both can use the same OpenRouter key value, or different keys - your choice!

