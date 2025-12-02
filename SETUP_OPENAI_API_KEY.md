# Setting Up OpenAI API Key for GEO Scans

## Problem
If GEO scans are not working, it's likely because the `OPENAI_API_KEY` is not set in Supabase Edge Function secrets.

## Solution: Set OpenAI API Key in Supabase

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. **Important**: Make sure you have credits/billing set up in your OpenAI account
   - Go to [Billing](https://platform.openai.com/account/billing)
   - Add a payment method if needed
   - Add credits (minimum $5)
4. Go back to [API Keys](https://platform.openai.com/api-keys)
5. Click "Create new secret key"
6. **IMPORTANT**: Copy the ENTIRE API key immediately (you won't be able to see it again!)
   - The key starts with `sk-` and is very long
   - Make sure you copy the complete key, not just part of it
7. Store it securely (you'll need to paste it into Supabase)

### Step 2: Set the Secret in Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. **If `OPENAI_API_KEY` already exists**:
   - Click on it to edit
   - Delete the old value completely
   - Paste your NEW API key
   - Click **Save**
4. **If `OPENAI_API_KEY` doesn't exist**:
   - Click **Add new secret**
   - Set:
     - **Name**: `OPENAI_API_KEY`
     - **Value**: Your OpenAI API key (starts with `sk-...` and is very long)
   - Click **Save**
5. **Important**: 
   - Make sure you paste the COMPLETE key (it should be around 50+ characters)
   - Don't add any spaces or extra characters
   - Wait 1-2 minutes after saving for the secret to propagate

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the secret
supabase secrets set OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Verify the Secret is Set

1. Go to Supabase Dashboard → Edge Functions → Logs
2. Run a GEO scan
3. Check the logs - you should see: `API keys available: OPENAI=true`

### Step 4: Test the GEO Scan

1. Go to Dashboard in your app
2. Select a brand
3. Click "Run GEO Scan"
4. The scan should start successfully

## Troubleshooting

### Error: "OPENAI_API_KEY is not configured"
- **Solution**: Make sure you've set the secret in Supabase Edge Functions secrets
- **Check**: Go to Supabase Dashboard → Edge Functions → Secrets and verify `OPENAI_API_KEY` exists

### Error: "OpenAI API failed: 401" or "Incorrect API key provided"
- **Solution**: Your API key is invalid, expired, or incorrect
- **Steps to fix**:
  1. Go to [OpenAI Platform API Keys](https://platform.openai.com/api-keys)
  2. Check if your current key exists and is active
  3. If not, click "Create new secret key"
  4. Copy the NEW key (starts with `sk-...`)
  5. Update it in Supabase Edge Function secrets:
     - Go to Supabase Dashboard → Edge Functions → Secrets
     - Find `OPENAI_API_KEY`
     - Click "Edit" or delete and recreate
     - Paste the NEW key
     - Save
  6. **Important**: Make sure you copy the ENTIRE key (it's long, starts with `sk-` and ends with many characters)
  7. Wait 1-2 minutes for the secret to propagate
  8. Try running the scan again

### Error: "OpenAI API failed: 429"
- **Solution**: You've hit rate limits or don't have credits
- **Check**: Go to OpenAI Platform → Billing and ensure you have credits

### Error: "OpenAI API failed: 402"
- **Solution**: You need to add payment method and credits to your OpenAI account
- **Check**: Go to OpenAI Platform → Billing → Add payment method

## Additional API Keys (Optional)

If you want to use other providers, you can also set:

- `GEMINI_API_KEY` - For Google Gemini
- `DEEPSEEK_API_KEY` - For DeepSeek
- `OPENROUTER_API_KEY` - For OpenRouter (uses multiple models)

Set these the same way as `OPENAI_API_KEY` in Supabase Edge Functions secrets.

## Notes

- API keys are stored securely in Supabase Edge Functions secrets
- Never commit API keys to your code repository
- If you change your API key, update it in Supabase secrets
- The Edge Function will automatically use the updated key

