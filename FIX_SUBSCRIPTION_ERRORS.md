# Fix Subscription Errors

## Error 1: 406 (Not Acceptable) on Subscriptions Query

**Problem:** Using `.single()` when no subscription exists causes a 406 error.

**Fixed:** Changed to use `.limit(1)` and handle empty results gracefully.

## Error 2: 400 (Bad Request) on create-subscription Edge Function

**Possible Causes:**
1. **Missing Plan IDs in Supabase Secrets** - The Edge Function can't find the plan IDs
2. **Invalid plan key** - The plan key being sent doesn't match expected values
3. **Missing Razorpay credentials** - RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set

## How to Fix

### Step 1: Verify Edge Function Secrets

Go to Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**

Make sure these are ALL set:
- ✅ `RAZORPAY_KEY_ID`
- ✅ `RAZORPAY_KEY_SECRET`
- ✅ `PLAN_BASIC_NORMAL`
- ✅ `PLAN_PRO_NORMAL`
- ✅ `PLAN_BASIC_FOUNDER`
- ✅ `PLAN_PRO_FOUNDER`

### Step 2: Check Plan Keys Being Sent

The frontend sends plan keys like:
- `basic_normal`
- `pro_normal`
- `basic_founder`
- `pro_founder`

Make sure these match what's in `PLAN_CONFIGS` in `Payment.tsx`.

### Step 3: Check Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions** → **create-subscription**
2. Click **Logs**
3. Look for error messages that show what's missing

### Step 4: Test with Correct Plan

Try subscribing with a plan that you know has a Plan ID set in secrets.

## Common Issues

### Issue: "Plan ID not configured for plan: xxx"
**Solution:** Set the corresponding secret in Supabase Dashboard:
- For `basic_normal` → Set `PLAN_BASIC_NORMAL`
- For `pro_normal` → Set `PLAN_PRO_NORMAL`
- etc.

### Issue: "Razorpay credentials not configured"
**Solution:** Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Supabase Dashboard → Edge Functions → Secrets

### Issue: "Invalid plan: xxx"
**Solution:** Check that the plan key matches exactly:
- Must be: `basic_normal`, `pro_normal`, `basic_founder`, or `pro_founder`
- Case-sensitive!

## Testing

After fixing secrets, try subscribing again. The Edge Function will now provide clearer error messages if something is still wrong.

