# 🚀 Setup Checklist - What You Need to Do

## ✅ Step 1: Run Database Migrations

You need to run the **new migrations** and ensure all other migrations are applied.

### Option A: Using Supabase Dashboard (Easiest)

**Run these migrations in order:**

1. **Prompt Simulator Migration:**
   - Open: `supabase/migrations/20250120000000_create_prompts_tables.sql`
   - Copy entire SQL content → Paste in SQL Editor → Click "Run"
   - Creates: `prompts` table (with 8 sample prompts) and `prompt_runs` table

2. **Outreach Migration:**
   - Open: `supabase/migrations/20250121000000_create_outreach_tables.sql`
   - Copy entire SQL content → Paste in SQL Editor → Click "Run"
   - Creates: `outreach_targets` table and `outreach_emails` table

3. **Audits Migration:**
   - Open: `supabase/migrations/20250122000000_create_audits_table.sql`
   - Copy entire SQL content → Paste in SQL Editor → Click "Run"
   - Creates: `audits` table for storing brand audit results

### Option B: Using Supabase CLI

```bash
# Make sure you're logged in and linked to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

---

## ✅ Step 2: Verify All Migrations Are Applied

Check if these migrations exist in your database:

1. ✅ `20250115000000_add_payments_subscriptions.sql` - Payments & Subscriptions
2. ✅ `20250116000000_add_name_to_profiles.sql` - Profile names
3. ✅ `20250116000001_update_subscriptions_for_razorpay_plans.sql` - Razorpay plans
4. ✅ `20250117000000_ensure_profile_trigger.sql` - Profile triggers
5. ✅ `20250118000000_add_onboarding_fields.sql` - Onboarding fields
6. ✅ `20250119000000_create_blogs_table.sql` - Blogs table
7. ✅ `20250120000000_create_prompts_tables.sql` - Prompts & Prompt Runs
8. ✅ `20250121000000_create_outreach_tables.sql` - Outreach Targets & Emails
9. ✅ **`20250122000000_create_audits_table.sql`** - **NEW: Brand Audits**

**To check**: Go to Supabase Dashboard → **Database** → **Migrations** tab

---

## ✅ Step 3: Verify Edge Functions Are Deployed

Make sure these Edge Functions are deployed:

1. ✅ `scrape-url` - Website scraping
2. ✅ `generate-topics` - Topic generation
3. ✅ `generate-competitors` - Competitor generation
4. ✅ `save-onboarding` - Save onboarding data
5. ✅ `run-geo-scan` - GEO scan execution
6. ✅ `generate-blog` - Blog keyword generation
7. ✅ `rewrite-blog-section` - Blog rewriting
8. ✅ `generate-blog-insights` - Blog insights
9. ✅ `create-subscription` - Subscription creation (if using Razorpay)
10. ✅ `razorpay-webhook` - Razorpay webhook (if using Razorpay)

**To check**: Go to Supabase Dashboard → **Edge Functions**

**To deploy** (if missing):
```bash
supabase functions deploy <function-name>
```

---

## ✅ Step 4: Verify Environment Variables

Make sure your `.env.local` file has:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# OpenRouter (for AI features)
VITE_OPENROUTER_API_KEY=your_openrouter_key

# Razorpay (if using payments)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

**To check**: Look for `.env.local` in your project root

---

## ✅ Step 5: Test the New Features

After running migrations:

### Test Prompt Simulator:
1. **Navigate to**: `/prompts`
2. **Select a brand** from the dropdown
3. **Choose filters** (Model, Country, Topic)
4. **Click "Run Simulation"**
5. **Verify**: Prompts load, simulation runs, results appear, drawer opens

### Test Outreach Page:
1. **Navigate to**: `/outreach`
2. **Select a brand** from the dropdown
3. **Click "Detect Targets"** (requires sources from GEO scans)
4. **Verify**: Targets detected and saved
5. **Click a row** to open drawer
6. **Click "Generate Outreach Email"**
7. **Verify**: Email generated, can edit/preview/send

### Test Audits Page:
1. **Navigate to**: `/audits`
2. **Select a brand** from the dropdown
3. **Click "Re-run Audit"** or "Run First Audit"
4. **Verify**: All 7 audit categories run successfully
5. **Check**: Overall score displayed, expandable sections show issues/recommendations

---

## 🔍 Quick Verification Queries

Run these in Supabase SQL Editor to verify everything is set up:

### Check if prompts table exists:
```sql
SELECT COUNT(*) FROM prompts;
```
**Expected**: Should return 8 (sample prompts)

### Check if prompt_runs table exists:
```sql
SELECT COUNT(*) FROM prompt_runs;
```
**Expected**: Should return 0 (or number of runs you've made)

### Check all tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## 🐛 Troubleshooting

### If migrations fail:
- Check Supabase Dashboard → **Logs** for errors
- Make sure you have proper permissions
- Try running migrations one by one

### If Prompt Simulator doesn't work:
- ✅ Verify `prompts` table exists and has data
- ✅ Check browser console for errors
- ✅ Verify OpenRouter API key is set
- ✅ Check Edge Function logs if API calls fail

### If Edge Functions fail:
- Check Supabase Dashboard → **Edge Functions** → **Logs**
- Verify all secrets are set: `supabase secrets list`
- Redeploy functions: `supabase functions deploy <name>`

---

## 📝 Summary

**Minimum Required Steps:**
1. ✅ Run migration: `20250120000000_create_prompts_tables.sql` (for Prompt Simulator)
2. ✅ Run migration: `20250121000000_create_outreach_tables.sql` (for Outreach page)
3. ✅ Run migration: `20250122000000_create_audits_table.sql` (for Audits page)
4. ✅ Verify prompts table has 8 sample prompts
5. ✅ Test Prompt Simulator page (`/prompts`)
6. ✅ Test Outreach page (`/outreach`)
7. ✅ Test Audits page (`/audits`)

**Everything else should already be set up from previous work!**

---

**Need help?** Check the logs in Supabase Dashboard or browser console for specific errors.

