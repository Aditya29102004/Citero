# Switch Razorpay from Test Mode to Live Mode

## Overview
This guide will help you switch your Razorpay integration from **Test Mode** to **Live Mode** for production payments.

## Prerequisites

1. ✅ Your Razorpay account is activated for live mode
2. ✅ You have completed KYC verification in Razorpay Dashboard
3. ✅ You have generated Live API keys from Razorpay Dashboard
4. ✅ You have created Live Plans in Razorpay Dashboard

## Step 1: Get Live Razorpay Credentials

1. **Log in to Razorpay Dashboard**: https://dashboard.razorpay.com/
2. **Switch to Live Mode**: Toggle at the top right (switch from Test to Live)
3. **Go to Settings** → **API Keys**
4. **Generate Live Keys** (if not already generated):
   - Click **"Generate Live Key"**
   - Copy your **Live Key ID** (starts with `rzp_live_`)
   - Copy your **Live Key Secret** (long string - keep this SECRET!)
   - ⚠️ **Important**: Never expose Key Secret in client-side code

## Step 2: Create Live Plans in Razorpay Dashboard

1. In **Live Mode**, go to **Settings** → **Plans**
2. Create plans matching your subscription tiers:
   - **Basic Plan** (Normal): `plan_live_xxxxx`
   - **Pro Plan** (Normal): `plan_live_xxxxx`
   - **Basic Plan** (Founder): `plan_live_xxxxx`
   - **Pro Plan** (Founder): `plan_live_xxxxx`
3. **Copy the Plan IDs** (format: `plan_live_xxxxx`)

## Step 3: Update Frontend Environment Variables

Update your `.env.local` file (or production environment variables):

```env
# Frontend Razorpay Key (Public - Safe to expose)
# Change from rzp_test_ to rzp_live_
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID

# Supabase Configuration (keep existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**For Production Deployment:**
- If using Vercel/Netlify: Add `VITE_RAZORPAY_KEY_ID` in your deployment platform's environment variables
- If using other platforms: Set the environment variable in your hosting platform

## Step 4: Update Supabase Edge Function Secrets

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** → **Secrets** (or **Settings** → **Secrets**)
4. Update these secrets:

   **Secret 1: RAZORPAY_KEY_ID**
   - Click **Edit** on `RAZORPAY_KEY_ID`
   - Change value from `rzp_test_xxxxx` to `rzp_live_xxxxx`
   - Click **Save**

   **Secret 2: RAZORPAY_KEY_SECRET**
   - Click **Edit** on `RAZORPAY_KEY_SECRET`
   - Change value to your Live Key Secret
   - Click **Save**

   **Secret 3-6: Plan IDs**
   - Update `PLAN_BASIC_NORMAL` → Your live Basic plan ID (`plan_live_xxxxx`)
   - Update `PLAN_PRO_NORMAL` → Your live Pro plan ID (`plan_live_xxxxx`)
   - Update `PLAN_BASIC_FOUNDER` → Your live Basic Founder plan ID (`plan_live_xxxxx`)
   - Update `PLAN_PRO_FOUNDER` → Your live Pro Founder plan ID (`plan_live_xxxxx`)

   **Secret 7: RAZORPAY_WEBHOOK_SECRET** (if using webhooks)
   - Update `RAZORPAY_WEBHOOK_SECRET` → Your live webhook secret

### Option B: Using Supabase CLI

```bash
# Update Razorpay Key ID (use your live key ID)
supabase secrets set RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID

# Update Razorpay Key Secret (use your live key secret)
supabase secrets set RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET

# Update Plan IDs (get these from Razorpay Dashboard → Settings → Plans in LIVE MODE)
supabase secrets set PLAN_BASIC_NORMAL=plan_live_YOUR_BASIC_PLAN_ID
supabase secrets set PLAN_PRO_NORMAL=plan_live_YOUR_PRO_PLAN_ID
supabase secrets set PLAN_BASIC_FOUNDER=plan_live_YOUR_BASIC_FOUNDER_PLAN_ID
supabase secrets set PLAN_PRO_FOUNDER=plan_live_YOUR_PRO_FOUNDER_PLAN_ID

# Update Webhook Secret (if you have live webhooks)
supabase secrets set RAZORPAY_WEBHOOK_SECRET=YOUR_LIVE_WEBHOOK_SECRET

# Verify secrets are set correctly
supabase secrets list
```

## Step 5: Configure Live Webhook (Important!)

1. **In Razorpay Dashboard (Live Mode)**, go to **Settings** → **Webhooks**
2. Click **"Add New Webhook"**
3. **Webhook URL**: 
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
   ```
   Replace `YOUR_PROJECT_REF` with your Supabase project reference ID
4. **Select Events** (check these):
   - ✅ `subscription.activated` - Subscription activated
   - ✅ `subscription.charged` - Subscription charged
   - ✅ `subscription.completed` - Subscription completed
   - ✅ `subscription.cancelled` - Subscription cancelled
   - ✅ `payment.authorized` - Payment authorized
   - ✅ `payment.captured` - Payment captured
   - ✅ `payment.failed` - Payment failed
5. **Secret**: Generate a webhook secret and save it
6. **Update Supabase Secret**: Add this secret to `RAZORPAY_WEBHOOK_SECRET` in Supabase

## Step 6: Verify Configuration

### Check Frontend
1. Open your app in production
2. Go to the Payment page
3. Check browser console - should show Razorpay initialized with live key
4. The Razorpay checkout should show "Live Mode" (or no test mode indicator)

### Check Backend
1. Test creating a subscription:
   ```bash
   # Use Supabase Dashboard → Edge Functions → Invoke
   # Function: create-subscription
   # Body: { "planType": "basic", "isFounder": false }
   ```
2. Verify it uses live plans and creates subscriptions in Razorpay Live Mode

## Step 7: Test with Real Payment (Small Amount)

1. **Create a test subscription** with the smallest amount
2. **Complete payment** using a real payment method
3. **Verify**:
   - Payment appears in Razorpay Dashboard (Live Mode)
   - Subscription is created in your database
   - Webhook receives the event (if configured)

## Important Notes

⚠️ **Security**:
- Never commit `.env.local` with live keys to git
- Never expose `RAZORPAY_KEY_SECRET` in frontend code
- Keep webhook secrets secure

⚠️ **Testing**:
- Test thoroughly before going live
- Start with small amounts
- Monitor Razorpay Dashboard for transactions

⚠️ **Rollback**:
- If issues occur, you can switch back to test mode by updating secrets back to test keys
- Test subscriptions won't work with live keys and vice versa

## Checklist

- [ ] Generated Live API Keys from Razorpay Dashboard
- [ ] Created Live Plans in Razorpay Dashboard
- [ ] Updated `VITE_RAZORPAY_KEY_ID` in `.env.local` (or production env vars)
- [ ] Updated `RAZORPAY_KEY_ID` in Supabase Secrets
- [ ] Updated `RAZORPAY_KEY_SECRET` in Supabase Secrets
- [ ] Updated all Plan IDs (`PLAN_BASIC_NORMAL`, `PLAN_PRO_NORMAL`, etc.) in Supabase Secrets
- [ ] Configured Live Webhook in Razorpay Dashboard
- [ ] Updated `RAZORPAY_WEBHOOK_SECRET` in Supabase Secrets
- [ ] Tested payment flow with real payment (small amount)
- [ ] Verified subscription creation in database
- [ ] Verified webhook events (if configured)

## Support

If you encounter issues:
1. Check Razorpay Dashboard → Logs for errors
2. Check Supabase Edge Function logs
3. Verify all secrets are set correctly
4. Ensure you're using Live Mode keys (not Test Mode keys)

