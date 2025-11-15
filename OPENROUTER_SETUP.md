# OpenRouter AI Provider Setup

## Overview
OpenRouter has been added as a fourth AI provider option alongside OpenAI (ChatGPT), Gemini, and DeepSeek.

## Setup Steps

### 1. Get OpenRouter API Key
OpenRouter offers both **free models** and **paid models**. The default configuration uses a free model.

1. Go to https://openrouter.ai/keys
2. Sign up or log in
3. Create a new API key
4. Copy the API key

**Note:** The default model (`qwen/qwen3-4b:free`) is free and doesn't require credits. If you want to use paid models like `openai/gpt-4o-mini`, you'll need to purchase credits at https://openrouter.ai/settings/credits.

### 2. Add API Key to Supabase Edge Function Secrets
1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** Your OpenRouter API key
4. Click **Save**

### 3. Run Database Migration
Run the migration to add OpenRouter to allowed provider options:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE public.brands
DROP CONSTRAINT IF EXISTS brands_ai_provider_check;

ALTER TABLE public.brands
ADD CONSTRAINT brands_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'deepseek', 'openrouter'));

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_default_ai_provider_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_default_ai_provider_check 
CHECK (default_ai_provider IN ('openai', 'gemini', 'deepseek', 'openrouter'));
```

Or use the migration file: `supabase_migration_add_openrouter.sql`

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
3. Select **OpenRouter** from the options:
   - ChatGPT (OpenAI)
   - Gemini (Google)
   - DeepSeek
   - **OpenRouter** ← New option
4. Click **Run GEO Scan**

### API Details
- **Base URL:** `https://openrouter.ai/api/v1`
- **Model:** `qwen/qwen3-4b:free` (default free model, can be changed)
- **API Format:** OpenAI-compatible (uses same structure as OpenAI API)
- **Rate Limits:** Free models have rate limits, paid models depend on your plan

### Available Models

**Free Models (No credits required):**
- `qwen/qwen3-4b:free` - Default, good for general use
- See https://openrouter.ai/models for more free models

**Paid Models (Require credits):**
- `openai/gpt-4o-mini` - Fast and cost-effective
- `openai/gpt-4o` - More capable
- See https://openrouter.ai/models for full list

To use paid models, change the `model` parameter in the `callOpenRouter` function in `supabase/functions/run-geo-scan/index.ts`.

## Benefits of OpenRouter

- ✅ **Unified API** - Access hundreds of AI models through one endpoint
- ✅ **Automatic Fallbacks** - Handles model availability automatically
- ✅ **Cost Optimization** - Automatically selects cost-effective options
- ✅ **Model Variety** - Access to multiple AI providers in one place

## Important Notes

- ✅ **Free models are available** - The default model `qwen/qwen3-4b:free` doesn't require credits
- ⚠️ **Paid models require credits** - If you change to a paid model, you'll need to purchase credits
- OpenRouter uses the OpenAI-compatible API format
- The default model is `qwen/qwen3-4b:free` (free) but you can change it in the edge function
- To use paid models, change the model in `callOpenRouter` function and purchase credits at https://openrouter.ai/settings/credits
- Check OpenRouter documentation for available models: https://openrouter.ai/docs/models

## Troubleshooting

### Error: "Insufficient credits" or "402" status code
- **Solution:** This only happens if you're using a paid model
- If you want to use free models, make sure the model is set to `qwen/qwen3-4b:free` or another free model
- If you want to use paid models, purchase credits at https://openrouter.ai/settings/credits
- Make sure you're using the correct API key for the account that has credits (if using paid models)

### Error: "No responses were saved"
- If using a paid model, check that your OpenRouter account has sufficient credits
- If using a free model, verify the API key is correct in Edge Function secrets
- Check Edge Function logs for detailed error messages
- Try switching to a free model if you're having credit issues

