# AI Provider Setup Guide

Your app now supports both **ChatGPT (OpenAI)** and **Gemini (Google)** as AI providers!

## Features

✅ Choose between ChatGPT or Gemini in the dashboard  
✅ Each brand can have its own AI provider preference  
✅ Provider preference is saved automatically  
✅ Switch providers anytime before running a scan

---

## Step 1: Run Database Migration

Add the AI provider field to your database:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `supabase_migration_ai_provider.sql`
3. Click **Run**

This adds:
- `ai_provider` field to `brands` table (default: 'openai')
- `default_ai_provider` field to `profiles` table (default: 'openai')

---

## Step 2: Set API Keys

### For OpenAI (ChatGPT):
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. In Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
4. Add secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

### For Gemini (Google):
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. In Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
4. Add secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key

**Note:** You can set both keys and switch between them in the dashboard!

---

## Step 3: Use in Dashboard

1. Go to any brand's dashboard page
2. You'll see an **"AI Provider"** dropdown next to the "Run GEO Scan" button
3. Select either:
   - **ChatGPT (OpenAI)** - Uses GPT-4o-mini
   - **Gemini (Google)** - Uses Gemini 1.5 Flash
4. Your selection is automatically saved for that brand
5. Click **"Run GEO Scan"** to start scanning with your chosen provider

---

## Which Provider Should I Use?

### ChatGPT (OpenAI):
- ✅ More established and widely used
- ✅ Generally faster responses
- ✅ Better at following complex instructions
- ⚠️ Requires paid API credits

### Gemini (Google):
- ✅ Free tier available (with limits)
- ✅ Good for cost-effective scanning
- ✅ Fast responses
- ⚠️ May have different response style

**Tip:** Try both and see which gives you better results for your brand!

---

## Troubleshooting

### "GEMINI_API_KEY is not configured"
- Make sure you've added the `GEMINI_API_KEY` secret in Edge Functions
- Redeploy the function after adding secrets

### "OPENAI_API_KEY is not configured"
- Make sure you've added the `OPENAI_API_KEY` secret in Edge Functions
- Redeploy the function after adding secrets

### Provider not saving
- Check browser console for errors
- Verify database migration was run successfully
- Make sure you're logged in

---

## Cost Comparison

- **OpenAI GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Gemini 1.5 Flash**: Free tier available, then pay-as-you-go

For 15 questions per scan:
- OpenAI: ~$0.01-0.02 per scan
- Gemini: Free (within limits) or ~$0.005-0.01 per scan

---

## Need Help?

Check the Edge Function logs if scans fail:
- Supabase Dashboard → Edge Functions → `run-geo-scan` → Logs

