# Debug: Competitors Showing Fallback Values

## Problem
The competitors page is showing "Competitor 1", "Competitor 2", "Competitor 3" instead of real AI-generated competitors.

## Why This Happens

The function falls back to default values when:
1. **API Key Missing**: `ONBOARDING_OPENROUTER_API_KEY` not set
2. **API Error**: OpenRouter API returns error (401, 402, 429, etc.)
3. **Parse Error**: AI response can't be parsed as JSON
4. **Empty Response**: AI returns empty or invalid data

## How to Debug

### Step 1: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **generate-competitors**
2. Click **"Logs"** tab
3. Look for errors like:
   - `ONBOARDING_OPENROUTER_API_KEY is not set`
   - `OpenRouter API error: 401` (unauthorized)
   - `OpenRouter API error: 402` (insufficient credits)
   - `OpenRouter API error: 429` (rate limited)
   - `Failed to parse competitors`

### Step 2: Verify Secret is Set

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Check if `ONBOARDING_OPENROUTER_API_KEY` exists
3. Verify the value is correct (starts with `sk-or-v1-...`)

### Step 3: Test the Function Directly

In Supabase Dashboard → Edge Functions → generate-competitors → Invoke:

```json
{
  "brandSummary": "A SaaS platform for brand tracking and analytics"
}
```

Check the response and logs.

### Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for errors when competitors page loads
4. Check **Network** tab for failed requests

## Common Fixes

### Fix 1: API Key Not Set

**Symptom:** Logs show "ONBOARDING_OPENROUTER_API_KEY is not set"

**Solution:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add secret:
   - Key: `ONBOARDING_OPENROUTER_API_KEY`
   - Value: Your OpenRouter API key
3. Redeploy function

### Fix 2: API Key Invalid

**Symptom:** Logs show "OpenRouter API error: 401"

**Solution:**
1. Verify API key is correct
2. Check OpenRouter dashboard for key status
3. Regenerate key if needed
4. Update secret in Supabase

### Fix 3: Insufficient Credits

**Symptom:** Logs show "OpenRouter API error: 402"

**Solution:**
1. Go to https://openrouter.ai/settings/credits
2. Add credits to your account
3. Or use a free model (already configured)

### Fix 4: Rate Limited

**Symptom:** Logs show "OpenRouter API error: 429"

**Solution:**
- Function automatically tries fallback model (Groq)
- Wait a few minutes and try again
- Or upgrade OpenRouter plan

### Fix 5: Parse Error

**Symptom:** Logs show "Failed to parse competitors"

**Solution:**
- Check logs for the actual AI response
- The function now returns empty array instead of fallback
- User can add competitors manually

## Updated Behavior

After the fix:
- ✅ Better error logging
- ✅ Returns empty array instead of fake competitors
- ✅ Shows proper error messages to user
- ✅ Automatically tries fallback model on rate limits
- ✅ Checks API key before calling

## Next Steps

1. **Check Edge Function logs** to see exact error
2. **Verify secret is set** correctly
3. **Test function** directly in Supabase Dashboard
4. **Check browser console** for frontend errors

The function will now show proper error messages instead of fake competitors, making it easier to debug!

