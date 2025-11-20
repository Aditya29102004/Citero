# Fix Razorpay Authentication Dialog Issue

## The Problem

When trying to subscribe, a browser authentication dialog appears asking for Razorpay credentials. This shouldn't happen because:

1. **Edge Functions run server-side** - They make API calls from Supabase's servers, not your browser
2. **Browser shouldn't see Razorpay API calls** - These are backend-to-backend calls

## Possible Causes

1. **Edge Function not deployed correctly** - The function might not be running
2. **CORS issue** - Browser might be blocking the Edge Function call
3. **Network error** - Edge Function call failing, causing browser to try direct Razorpay connection
4. **Incorrect Razorpay credentials** - Invalid API keys causing authentication prompt

## Solutions

### Solution 1: Check Edge Function is Deployed

1. Go to Supabase Dashboard → **Edge Functions**
2. Verify `create-subscription` is listed and shows "Active" status
3. Check the function URL matches: `https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/create-subscription`

### Solution 2: Verify Razorpay Credentials

1. Go to Supabase Dashboard → **Edge Functions** → **Secrets**
2. Verify these secrets are set correctly:
   - `RAZORPAY_KEY_ID` - Should start with `rzp_test_` or `rzp_live_`
   - `RAZORPAY_KEY_SECRET` - Should be a long string (not empty)

### Solution 3: Check Browser Console

Open browser DevTools (F12) → Console tab and look for:
- Errors about Edge Function calls
- CORS errors
- Network errors

### Solution 4: Check Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions** → `create-subscription`
2. Click **Logs** tab
3. Look for error messages when you try to subscribe
4. Common errors:
   - "Razorpay credentials not configured"
   - "Invalid plan"
   - "Unauthorized"

### Solution 5: Test Edge Function Directly

Try calling the Edge Function directly from browser console:

```javascript
const { data, error } = await supabase.functions.invoke('create-subscription', {
  body: { plan: 'basic_normal' }
});
console.log('Response:', data, error);
```

## Most Likely Issue

Based on the authentication dialog appearing, the most likely causes are:

1. **Edge Function not deployed** - Redeploy it
2. **Missing Razorpay secrets** - Set them in Supabase Dashboard
3. **Invalid Razorpay credentials** - Check they're correct

## Next Steps

1. Check Edge Function logs first
2. Verify all secrets are set
3. Try redeploying the Edge Function
4. Check browser console for errors

The authentication dialog suggests the Edge Function call is failing and the browser is trying to authenticate directly with Razorpay, which shouldn't happen.

