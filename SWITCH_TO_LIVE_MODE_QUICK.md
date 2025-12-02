# Quick Guide: Switch Razorpay to Live Mode

## Prerequisites
- ✅ Razorpay account activated for live mode
- ✅ KYC verification completed
- ✅ Live API keys generated from Razorpay Dashboard
- ✅ Live Plans created in Razorpay Dashboard

## Step 1: Get Live Credentials from Razorpay

1. Go to https://dashboard.razorpay.com/
2. **Switch to Live Mode** (toggle at top right)
3. **Settings** → **API Keys**
   - Copy **Live Key ID** (starts with `rzp_live_`)
   - Copy **Live Key Secret** (keep secret!)
4. **Settings** → **Plans**
   - Copy Live Plan IDs:
     - Basic Normal: `plan_live_xxxxx`
     - Pro Normal: `plan_live_xxxxx`
     - Basic Founder: `plan_live_xxxxx`
     - Pro Founder: `plan_live_xxxxx`

## Step 2: Update Frontend Environment Variable

### For Local Development:
**Update `.env.local` file in your project root:**

```env
# Change from rzp_test_ to rzp_live_
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
```

**Note:** `.env.local` is for local development only. It's gitignored and won't be deployed.

### For Production Hosting:
**Set environment variables in your hosting platform's dashboard** (NOT in `.env` file):

**Vercel:**
1. Go to your project → **Settings** → **Environment Variables**
2. Add/Update: `VITE_RAZORPAY_KEY_ID` = `rzp_live_YOUR_LIVE_KEY_ID`
3. Select environment: Production (and Preview if needed)
4. Redeploy your application

**Netlify:**
1. Go to your site → **Site settings** → **Environment variables**
2. Add/Update: `VITE_RAZORPAY_KEY_ID` = `rzp_live_YOUR_LIVE_KEY_ID`
3. Redeploy your site

**Other Platforms:**
- Set `VITE_RAZORPAY_KEY_ID` in your hosting platform's environment variables section
- Value: `rzp_live_YOUR_LIVE_KEY_ID`
- Redeploy after setting

## Step 3: Update Supabase Edge Function Secrets

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → Your Project → **Edge Functions** → **Secrets**
2. Update these secrets:

| Secret Name | Change From | Change To |
|------------|--------------|-----------|
| `RAZORPAY_KEY_ID` | `rzp_test_xxxxx` | `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | Test secret | Live secret |
| `PLAN_BASIC_NORMAL` | `plan_test_xxxxx` | `plan_live_xxxxx` |
| `PLAN_PRO_NORMAL` | `plan_test_xxxxx` | `plan_live_xxxxx` |
| `PLAN_BASIC_FOUNDER` | `plan_test_xxxxx` | `plan_live_xxxxx` |
| `PLAN_PRO_FOUNDER` | `plan_test_xxxxx` | `plan_live_xxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | Test secret | Live secret (if using webhooks) |

### Option B: Using Supabase CLI

```bash
# Update Razorpay Key ID
supabase secrets set RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID

# Update Razorpay Key Secret
supabase secrets set RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET

# Update Plan IDs
supabase secrets set PLAN_BASIC_NORMAL=plan_live_YOUR_BASIC_PLAN_ID
supabase secrets set PLAN_PRO_NORMAL=plan_live_YOUR_PRO_PLAN_ID
supabase secrets set PLAN_BASIC_FOUNDER=plan_live_YOUR_BASIC_FOUNDER_PLAN_ID
supabase secrets set PLAN_PRO_FOUNDER=plan_live_YOUR_PRO_FOUNDER_PLAN_ID

# Update Webhook Secret (if using webhooks)
supabase secrets set RAZORPAY_WEBHOOK_SECRET=YOUR_LIVE_WEBHOOK_SECRET

# Verify secrets
supabase secrets list
```

## Step 4: Configure Live Webhook (Important!)

1. In **Razorpay Dashboard (Live Mode)** → **Settings** → **Webhooks**
2. Click **"Add New Webhook"**
3. **Webhook URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
   - Replace `YOUR_PROJECT_REF` with your Supabase project reference ID
4. **Select Events**:
   - ✅ `subscription.activated`
   - ✅ `subscription.charged`
   - ✅ `subscription.completed`
   - ✅ `subscription.cancelled`
   - ✅ `payment.authorized`
   - ✅ `payment.captured`
   - ✅ `payment.failed`
5. **Generate and save webhook secret**
6. **Update Supabase Secret**: Add this secret to `RAZORPAY_WEBHOOK_SECRET` in Supabase

## Step 5: Restart/Redeploy

### For Local Development:
```bash
# Stop dev server (Ctrl+C)
# Restart dev server to load updated .env.local
npm run dev
```

### For Production:
- **Frontend**: Redeploy your application after setting environment variables in hosting platform
- **Backend**: Edge Functions automatically use updated Supabase secrets (no redeploy needed)

## Step 6: Verify Configuration

### Check Frontend:
1. Open your app
2. Go to Payment page
3. Check browser console - should show Razorpay initialized with live key
4. Razorpay checkout should show "Live Mode" (or no test mode indicator)

### Check Backend:
1. Test creating a subscription
2. Verify it uses live plans
3. Check Razorpay Dashboard (Live Mode) for transactions

## Checklist

- [ ] Generated Live API Keys from Razorpay Dashboard
- [ ] Created Live Plans in Razorpay Dashboard
- [ ] Updated `VITE_RAZORPAY_KEY_ID` in `.env.local` (for local dev)
- [ ] Set `VITE_RAZORPAY_KEY_ID` in hosting platform's environment variables (for production)
- [ ] Updated `RAZORPAY_KEY_ID` in Supabase Secrets
- [ ] Updated `RAZORPAY_KEY_SECRET` in Supabase Secrets
- [ ] Updated `PLAN_BASIC_NORMAL` in Supabase Secrets
- [ ] Updated `PLAN_PRO_NORMAL` in Supabase Secrets
- [ ] Updated `PLAN_BASIC_FOUNDER` in Supabase Secrets
- [ ] Updated `PLAN_PRO_FOUNDER` in Supabase Secrets
- [ ] Configured Live Webhook in Razorpay Dashboard
- [ ] Updated `RAZORPAY_WEBHOOK_SECRET` in Supabase Secrets
- [ ] Restarted dev server / Redeployed production
- [ ] Tested payment flow with real payment (small amount)
- [ ] Verified subscription creation in database

## Edge Functions Using Razorpay Secrets

These functions will automatically use the updated secrets:
- `create-subscription` - Creates Razorpay subscriptions
- `create-razorpay-order` - Creates Razorpay orders
- `verify-razorpay-payment` - Verifies payment signatures
- `subscription-success` - Handles successful subscriptions
- `razorpay-webhook` - Handles webhook events

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
- If issues occur, switch back to test mode by updating secrets back to test keys
- Test subscriptions won't work with live keys and vice versa

## Support

If you encounter issues:
1. Check Razorpay Dashboard → Logs for errors
2. Check Supabase Edge Function logs
3. Verify all secrets are set correctly
4. Ensure you're using Live Mode keys (not Test Mode keys)

