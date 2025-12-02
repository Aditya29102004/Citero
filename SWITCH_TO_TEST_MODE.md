# Switch to Test Mode - Razorpay Configuration

## Overview
You're currently using **Live Mode** (`rzp_live_`). To test safely, you need to switch to **Test Mode** (`rzp_test_`).

## Step 1: Get Test Keys from Razorpay Dashboard

1. Go to **Razorpay Dashboard**: https://dashboard.razorpay.com/
2. Navigate to **Settings** → **API Keys**
3. Make sure you're in **Test Mode** (toggle at the top right)
4. If you don't have test keys yet, click **"Generate Test Key"**
5. Copy both:
   - **Test Key ID** (starts with `rzp_test_`)
   - **Test Key Secret** (long string - keep secret!)

## Step 2: Update Frontend (.env.local)

✅ **Already updated!** Your `.env.local` file has been updated to use test keys.

## Step 3: Update Supabase Edge Function Secrets (Backend)

You need to update the secrets in Supabase for your Edge Functions:

### Option A: Using Supabase CLI (Recommended)

```bash
# Update Razorpay Key ID (use your test key ID)
supabase secrets set RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID

# Update Razorpay Key Secret (use your test key secret)
supabase secrets set RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET

# Update Plan IDs (get these from Razorpay Dashboard → Settings → Plans in TEST MODE)
supabase secrets set PLAN_BASIC_NORMAL=plan_TEST_PLAN_ID
supabase secrets set PLAN_PRO_NORMAL=plan_TEST_PLAN_ID
supabase secrets set PLAN_BASIC_FOUNDER=plan_TEST_PLAN_ID
supabase secrets set PLAN_PRO_FOUNDER=plan_TEST_PLAN_ID

# Update Webhook Secret (if you have test webhooks)
supabase secrets set RAZORPAY_WEBHOOK_SECRET=YOUR_TEST_WEBHOOK_SECRET
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/fakhmxfxnszmvxihpann
2. Navigate to **Edge Functions** → **Secrets**
3. Update these secrets:
   - `RAZORPAY_KEY_ID` → Your test key ID (`rzp_test_...`)
   - `RAZORPAY_KEY_SECRET` → Your test key secret
   - `PLAN_BASIC_NORMAL` → Test plan ID for Basic Normal
   - `PLAN_PRO_NORMAL` → Test plan ID for Pro Normal
   - `PLAN_BASIC_FOUNDER` → Test plan ID for Basic Founder
   - `PLAN_PRO_FOUNDER` → Test plan ID for Pro Founder
   - `RAZORPAY_WEBHOOK_SECRET` → Test webhook secret (if applicable)

## Step 4: Create Test Plans in Razorpay (If Needed)

If you don't have test plans yet:

1. Go to Razorpay Dashboard → **Settings** → **Plans**
2. Make sure you're in **Test Mode** (toggle at top right)
3. Create 4 plans:
   - **Basic Normal**: $99/month
   - **Pro Normal**: $179/month
   - **Basic Founder**: $39/month
   - **Pro Founder**: $89/month
4. Copy the Plan IDs (format: `plan_xxxxx`)
5. Update the Supabase secrets with these Plan IDs

## Step 5: Restart Your Dev Server

After updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 6: Test Payment Flow

1. Try subscribing to a plan
2. Use Razorpay test cards:
   - **Success**: `4111 1111 1111 1111`
   - **Failure**: `4000 0000 0000 0002`
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date

## Important Notes

- ✅ **Test Mode**: No real money is charged
- ✅ **Test Cards**: Use Razorpay test card numbers
- ✅ **Separate Plans**: Test and Live plans are separate - create plans in test mode
- ⚠️ **Switch Back**: When ready for production, switch back to live keys

## Verification Checklist

- [ ] Test Key ID starts with `rzp_test_` (not `rzp_live_`)
- [ ] `.env.local` updated with test key ID
- [ ] Supabase secrets updated with test keys
- [ ] Test plans created in Razorpay Dashboard
- [ ] Dev server restarted
- [ ] Test payment successful with test card

## Current Status

- ✅ Frontend (`.env.local`): Updated to test mode
- ⏳ Backend (Supabase Secrets): **You need to update these manually**
- ⏳ Test Plans: **Create these in Razorpay Dashboard (Test Mode)**

