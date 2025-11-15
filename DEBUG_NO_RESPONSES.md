# Debug: No Responses Generated

## What This Means
All 15 API calls failed, so no responses were saved to the database.

## Check These Things:

### 1. Which Provider Are You Using?
- Check the Edge Function logs for: `Provider used: openai` or `Provider used: gemini`
- Or check your dashboard - which AI provider is selected?

### 2. Are API Keys Set?
Check the logs for:
```
API keys available: OPENAI=true, GEMINI=true
```
If either shows `false`, that key is missing!

**To fix:**
- Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
- Make sure `OPENAI_API_KEY` is set (if using ChatGPT)
- Make sure `GEMINI_API_KEY` is set (if using Gemini)

### 3. Check for API Errors in Logs
Look for errors like:
- `Gemini API failed: 404` → Model name issue (should be fixed now)
- `OpenAI API failed: 401` → Invalid API key
- `OpenAI API failed: 429` → Rate limit exceeded

### 4. Common Issues:

**If using Gemini:**
- ✅ Make sure you redeployed the function with the fixed model name (`gemini-pro`)
- ✅ Check that `GEMINI_API_KEY` secret is set
- ✅ Verify your Gemini API key is valid at https://makersuite.google.com/app/apikey

**If using OpenAI:**
- ✅ Check that `OPENAI_API_KEY` secret is set
- ✅ Verify your OpenAI API key is valid at https://platform.openai.com/api-keys
- ✅ Make sure you have credits/quota available

### 5. Quick Test:
1. Check Edge Function logs for the exact error messages
2. Look for lines like: `Error processing question X:`
3. The error message will tell you what's wrong

## Most Likely Causes:

1. **API Key Missing** - Check secrets in Supabase Dashboard
2. **Invalid API Key** - Regenerate your API key
3. **Wrong Model Name** - Should be fixed now (redeploy needed)
4. **No API Credits** - Check your OpenAI/Gemini account balance

## Next Steps:

1. **Redeploy the function** with the updated code (better error logging)
2. **Check the logs** after running a scan
3. **Look for the specific error** - it will tell you exactly what's wrong
4. **Fix the issue** based on the error message

The updated code now shows:
- Which provider is being used
- Which API keys are available
- Detailed error messages for each failed question

Redeploy and check the logs again!

