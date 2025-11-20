# Debug Razorpay Authentication Dialog

## What's Happening

When you click "Subscribe", a browser authentication dialog appears asking for Razorpay credentials. This is **NOT normal** and indicates an issue.

## Why This Shouldn't Happen

- Edge Functions run **server-side** on Supabase's servers
- Razorpay API calls happen **server-to-server**
- Your browser should **never** see Razorpay API requests
- The browser should only see the Edge Function call, not Razorpay directly

## Debugging Steps

### Step 1: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Try subscribing again
4. Look for:
   - Errors about Edge Function calls
   - Network errors
   - CORS errors
   - Any red error messages

### Step 2: Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Try subscribing again
4. Look for:
   - Request to `create-subscription` Edge Function
   - Status code (should be 200)
   - Response body
   - Any failed requests

### Step 3: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → `create-subscription`
3. Click **Logs** tab
4. Try subscribing again
5. Look for error messages

### Step 4: Verify Edge Function is Deployed

1. Go to Supabase Dashboard → **Edge Functions**
2. Check if `create-subscription` is listed
3. Status should be "Active"
4. URL should be: `https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/create-subscription`

### Step 5: Test Edge Function Directly

Open browser console and run:

```javascript
const { data, error } = await supabase.functions.invoke('create-subscription', {
  body: { plan: 'basic_normal' }
});
console.log('Data:', data);
console.log('Error:', error);
```

## Common Causes

1. **Edge Function not deployed** - Most common
2. **Missing Razorpay secrets** - Check Supabase Dashboard → Edge Functions → Secrets
3. **Invalid Razorpay credentials** - Wrong Key ID or Secret
4. **Network/proxy issue** - Browser or network intercepting requests
5. **CORS issue** - Browser blocking Edge Function call

## Quick Fixes

### Fix 1: Redeploy Edge Function
- Go to Supabase Dashboard → Edge Functions → `create-subscription`
- Click "Redeploy" or update the code

### Fix 2: Check Secrets
- Go to Supabase Dashboard → Edge Functions → Secrets
- Verify:
  - `RAZORPAY_KEY_ID` is set
  - `RAZORPAY_KEY_SECRET` is set
  - `PLAN_BASIC_NORMAL` is set (and other plan IDs)

### Fix 3: Check Razorpay Dashboard
- Go to Razorpay Dashboard → Settings → API Keys
- Verify your keys are active
- For testing, use **Test Keys** (start with `rzp_test_`)

## What to Share for Help

If the issue persists, share:
1. Browser console errors (screenshot)
2. Network tab showing the Edge Function call (screenshot)
3. Edge Function logs (copy/paste)
4. Any error messages you see

The authentication dialog appearing means something is wrong with the Edge Function call or deployment.

