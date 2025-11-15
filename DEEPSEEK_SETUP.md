# DeepSeek AI Provider Setup

## Overview
DeepSeek has been added as a third AI provider option alongside OpenAI (ChatGPT) and Gemini.

## Setup Steps

### 1. Get DeepSeek API Key
1. Go to https://platform.deepseek.com/api_keys
2. Sign up or log in
3. Create a new API key
4. Copy the API key

### 2. Add API Key to Supabase Edge Function Secrets
1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name:** `DEEPSEEK_API_KEY`
   - **Value:** Your DeepSeek API key
4. Click **Save**

### 3. Run Database Migration
Run the migration to add DeepSeek to allowed provider options:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE public.brands
DROP CONSTRAINT IF EXISTS brands_ai_provider_check;

ALTER TABLE public.brands
ADD CONSTRAINT brands_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'deepseek'));

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_default_ai_provider_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_default_ai_provider_check 
CHECK (default_ai_provider IN ('openai', 'gemini', 'deepseek'));
```

Or use the migration file: `supabase_migration_add_deepseek.sql`

### 4. Redeploy Edge Function
After adding the secret, redeploy the `run-geo-scan` Edge Function:

```bash
supabase functions deploy run-geo-scan
```

Or use the Supabase Dashboard:
1. Go to **Edge Functions** → **run-geo-scan**
2. Click **Redeploy**

## Usage

### In Dashboard
1. Go to any brand dashboard
2. In the header, you'll see the **AI Provider** dropdown
3. Select **DeepSeek** from the options:
   - ChatGPT (OpenAI)
   - Gemini (Google)
   - **DeepSeek** ← New option
4. Click **Run GEO Scan**

### API Details
- **Base URL:** `https://api.deepseek.com`
- **Model:** `deepseek-chat`
- **API Format:** OpenAI-compatible (uses same structure as OpenAI API)
- **Rate Limits:** Similar to OpenAI (1 second delay between calls)

## Features
- ✅ Full AI Insight Engine support
- ✅ All 15 question templates
- ✅ Perception summary, deep insights, recommendations, content ideas
- ✅ Week-over-week comparison
- ✅ Same quality output as other providers

## Notes
- DeepSeek uses OpenAI-compatible API, so it has similar rate limits to OpenAI
- No special delays needed (unlike Gemini which requires 3-second delays)
- API key must be set in Edge Function secrets before use
- Provider preference is saved per brand

