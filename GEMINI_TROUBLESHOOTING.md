# Gemini API Troubleshooting

## Current Issue
All Gemini models are returning 404 errors, suggesting the API key or model access might be the issue.

## Quick Fix Options

### Option 1: Check Your API Key
1. Go to https://makersuite.google.com/app/apikey
2. Verify your API key is active
3. Check if there are any restrictions on the key
4. Try creating a NEW API key and updating it in Supabase secrets

### Option 2: Verify API Key Access
Your Gemini API key might need to be enabled for the Generative AI API:
1. Go to https://console.cloud.google.com/apis/library
2. Search for "Generative Language API"
3. Make sure it's enabled for your project
4. If not enabled, enable it

### Option 3: Check Model Availability
The model `gemini-1.5-flash` should be available. If it's not:
1. Your API key might be from an older account
2. You might need to enable the API in Google Cloud Console
3. Try using a different Google account to generate the API key

### Option 4: Use OpenAI Instead (Temporary)
If Gemini continues to fail, you can:
1. Use ChatGPT (OpenAI) in the dashboard - it's working fine
2. This will let you continue using the app while we fix Gemini

## If You Have the Original Lovable Code

If you can access the original Lovable version where Gemini worked:
1. Check what API endpoint it was using
2. Check what model name it was using
3. Share that information and we can match it exactly

## Alternative: Test API Key Directly

You can test your Gemini API key directly using curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, how are you?"
      }]
    }]
  }'
```

Replace `YOUR_API_KEY` with your actual key. If this works, the key is valid and the issue is in the Edge Function. If it doesn't work, the key or API access is the problem.

## Most Likely Causes

1. **API Key Restrictions** - The key might be restricted to certain APIs
2. **API Not Enabled** - Generative Language API might not be enabled in Google Cloud
3. **Wrong API Key Type** - You might need a different type of key
4. **Account Limitations** - Your Google account might have restrictions

## Next Steps

1. Try creating a fresh API key from https://makersuite.google.com/app/apikey
2. Make sure Generative Language API is enabled in Google Cloud Console
3. Update the `GEMINI_API_KEY` secret in Supabase
4. Redeploy the function
5. Test again

If it still doesn't work, we can:
- Use OpenAI instead (which is working)
- Or investigate the exact API endpoint Lovable was using

