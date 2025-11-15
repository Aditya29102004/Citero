# Fix CORS Error - Step by Step

## The Error You're Seeing:
```
Access to fetch at '.../run-geo-scan' from origin 'http://localhost:8080' has been blocked by CORS policy
```

This means the Edge Function either:
1. **Hasn't been redeployed** with the updated code
2. **Is crashing** before it can respond to OPTIONS request
3. **Has a syntax error** preventing it from running

---

## Solution: Redeploy the Function

### Step 1: Copy the Updated Code

1. Open: `supabase/functions/run-geo-scan/index.ts`
2. Select ALL (Ctrl+A)
3. Copy (Ctrl+C)

### Step 2: Deploy in Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: `fakhmxfxnszmvxihpann`
3. Click **"Edge Functions"** (left sidebar)
4. Click on **"run-geo-scan"**
5. Click **"Edit"** or open the code editor
6. **Delete ALL existing code**
7. **Paste** the new code you copied
8. Click **"Deploy"** or **"Save"**

### Step 3: Verify Deployment

1. After deploying, check the function logs:
   - Click **"Logs"** tab in the function
   - You should see "Listening on..." message
   - No syntax errors

2. Test again:
   - Go back to your app
   - Try running a scan
   - Check browser console (F12) for errors

---

## If Still Getting CORS Error:

### Check 1: Function is Actually Deployed
- Go to Edge Functions → `run-geo-scan` → Logs
- If you see errors, the function isn't running correctly

### Check 2: OPTIONS Request Handling
The function should handle OPTIONS like this:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  });
}
```

### Check 3: Check Function Logs
- Supabase Dashboard → Edge Functions → `run-geo-scan` → Logs
- Look for any error messages
- Share the error if you see one

### Check 4: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache

---

## Quick Test:

After redeploying, check the function logs. You should see:
- ✅ "Listening on..." message
- ✅ No syntax errors
- ✅ Function is active

If you see errors in the logs, share them and I'll help fix them!

---

## Most Common Issue:

**The function code hasn't been updated in Supabase yet!**

Make sure you:
1. ✅ Copied the ENTIRE file contents
2. ✅ Pasted it into Supabase Dashboard
3. ✅ Clicked "Deploy" or "Save"
4. ✅ Waited for deployment to complete

The updated code has better error handling and should work now!

