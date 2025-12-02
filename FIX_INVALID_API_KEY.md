# 🔧 Fix: Invalid OpenAI API Key Error

## Error Message
```
Incorrect API key provided: sk-1234e*******************************efgh
OpenAI API failed: 401
```

## Problem
The OpenAI API key stored in Supabase Edge Function secrets is **invalid, expired, or incorrect**.

## Quick Fix (5 minutes)

### Step 1: Get a Valid API Key from OpenAI

1. **Go to OpenAI Platform**: https://platform.openai.com/api-keys
2. **Sign in** to your account
3. **Check your existing keys**:
   - If you see keys listed, they might be expired or revoked
   - You can't see the full key value (for security)
4. **Create a NEW key**:
   - Click **"Create new secret key"**
   - Give it a name (e.g., "Unifr GEO Scan")
   - Click **"Create secret key"**
   - **IMPORTANT**: Copy the ENTIRE key immediately (you won't see it again!)
     - It starts with `sk-` and is very long (50+ characters)
     - Make sure you copy the complete key

### Step 2: Update the Key in Supabase

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: Project Settings → Edge Functions → Secrets
4. **Find `OPENAI_API_KEY`**:
   - If it exists, click on it to **Edit**
   - If it doesn't exist, click **"Add new secret"**
5. **Update the value**:
   - Delete the old key completely
   - Paste your NEW API key from Step 1
   - Make sure there are no extra spaces or characters
   - The key should start with `sk-` and be very long
6. **Click Save**
7. **Wait 1-2 minutes** for the secret to propagate

### Step 3: Verify Your OpenAI Account Has Credits

1. **Go to OpenAI Billing**: https://platform.openai.com/account/billing
2. **Check your balance**:
   - You should see credits available
   - If balance is $0, add credits (minimum $5)
3. **Add payment method** (if not already added):
   - Go to Payment methods
   - Add a credit card
   - Add credits

### Step 4: Test the Fix

1. **Go back to your app Dashboard**
2. **Select a brand**
3. **Click "Run GEO Scan"**
4. **Check the logs**:
   - Should NOT see "401" or "invalid_api_key" errors
   - Should see "Processing question 1/15..." messages
   - Should see responses being saved

## Common Mistakes

❌ **Copying only part of the key** - Make sure you copy the ENTIRE key  
❌ **Adding spaces** - Don't add spaces before or after the key  
❌ **Using an old/expired key** - Create a new key if unsure  
❌ **Wrong key format** - Should start with `sk-` and be 50+ characters  
❌ **Not waiting** - Wait 1-2 minutes after updating the secret  

## Still Not Working?

1. **Double-check the key**:
   - Go to OpenAI → API Keys
   - Create a fresh key
   - Copy it completely
   - Update in Supabase

2. **Check Supabase logs**:
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for the latest scan attempt
   - Check if the error changed

3. **Verify billing**:
   - Make sure you have credits in OpenAI
   - Check payment method is valid

4. **Try a different provider** (temporary):
   - In Dashboard, switch to "Gemini" or "OpenRouter"
   - This will help verify if it's specifically an OpenAI issue

## Need Help?

If you're still seeing errors:
1. Check the Supabase Edge Function logs for the full error
2. Verify the API key format matches: `sk-` followed by many characters
3. Make sure you waited 1-2 minutes after updating the secret
4. Try creating a completely new API key from OpenAI

