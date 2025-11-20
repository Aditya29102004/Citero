# Complete Setup Guide - Razorpay Subscription Integration

Follow these steps **in order** to complete your Razorpay subscription integration.

---

## Step 1: Create Razorpay Plans

### 1.1 Login to Razorpay Dashboard
- Go to https://dashboard.razorpay.com/
- Login with your Razorpay account

### 1.2 Create Plans
Navigate to **Settings** → **Plans** → Click **Create Plan**

Create these 4 plans:

#### Plan 1: Basic Normal
- **Plan Name**: `Basic Normal` (or any name you prefer)
- **Amount**: `₹99` (9900 paise)
- **Billing Period**: `Monthly`
- **Plan Type**: `Recurring`
- Click **Create Plan**
- **Copy the Plan ID** (format: `plan_xxxxx`) - You'll need this!

#### Plan 2: Pro Normal
- **Plan Name**: `Pro Normal`
- **Amount**: `₹249` (24900 paise)
- **Billing Period**: `Monthly`
- **Plan Type**: `Recurring`
- Click **Create Plan**
- **Copy the Plan ID**

#### Plan 3: Basic Founder
- **Plan Name**: `Basic Founder`
- **Amount**: `₹49` (4900 paise)
- **Billing Period**: `Monthly`
- **Plan Type**: `Recurring`
- Click **Create Plan**
- **Copy the Plan ID**

#### Plan 4: Pro Founder
- **Plan Name**: `Pro Founder`
- **Amount**: `₹129` (12900 paise)
- **Billing Period**: `Monthly`
- **Plan Type**: `Recurring`
- Click **Create Plan**
- **Copy the Plan ID**

**📝 Note:** Keep all 4 Plan IDs handy - you'll need them in Step 3.

---

## Step 2: Get Razorpay API Credentials

### 2.1 Get Key ID and Secret
1. In Razorpay Dashboard, go to **Settings** → **API Keys**
2. If you don't have keys, click **Generate Test Key** (for testing) or **Generate Live Key** (for production)
3. **Copy the Key ID** (format: `rzp_test_xxxxx` or `rzp_live_xxxxx`)
4. **Copy the Key Secret** (you'll only see this once - save it securely!)

**📝 Note:** 
- Use **Test Keys** for development/testing
- Use **Live Keys** for production
- Key Secret is shown only once - if you lose it, generate a new key pair

---

## Step 3: Configure Supabase Edge Function Secrets

### 3.1 Install Supabase CLI (if not installed)
```bash
# Windows (using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

### 3.2 Login to Supabase
```bash
supabase login
```
This will open your browser to authenticate.

### 3.3 Link Your Project
```bash
supabase link --project-ref fakhmxfxnszmvxihpann
```
**Your project ref**: `fakhmxfxnszmvxihpann`

### 3.4 Set All Secrets
Run these commands one by one, replacing the values with your actual credentials:

```bash
# Razorpay Credentials
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here

# Plan IDs (replace with your actual Plan IDs from Step 1)
supabase secrets set PLAN_BASIC_NORMAL=plan_xxxxx
supabase secrets set PLAN_PRO_NORMAL=plan_xxxxx
supabase secrets set PLAN_BASIC_FOUNDER=plan_xxxxx
supabase secrets set PLAN_PRO_FOUNDER=plan_xxxxx
```

**Example:**
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_ABC123xyz
supabase secrets set RAZORPAY_KEY_SECRET=secret_XYZ789abc
supabase secrets set PLAN_BASIC_NORMAL=plan_HIJ456def
supabase secrets set PLAN_PRO_NORMAL=plan_KLM789ghi
supabase secrets set PLAN_BASIC_FOUNDER=plan_NOP012jkl
supabase secrets set PLAN_PRO_FOUNDER=plan_QRS345mno
```

### 3.5 Verify Secrets (Optional)
```bash
supabase secrets list
```
This will show you all set secrets (values are hidden for security).

---

## Step 4: Create Frontend Environment File

### 4.1 Create `.env.local` file
In your project root (`C:\Users\agrsm\Downloads\uni-brand-track-6b73bdcd\`), create a file named `.env.local`

### 4.2 Add Content
Open `.env.local` and add:

```env
# Frontend Razorpay Key (Public - Safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Replace:**
- `rzp_test_xxxxx` with your Razorpay Key ID (same as Step 3.4)
- `https://your-project.supabase.co` with your Supabase URL
- `your_anon_key_here` with your Supabase Anon Key (find in Supabase Dashboard → Project Settings → API)

**📝 Note:** 
- The `.env.local` file is already in `.gitignore` - it won't be committed to git
- Only put the **Key ID** here (not the Secret!)
- The Key ID is public and safe to expose in the browser

---

## Step 5: Run Database Migration

### 5.1 Apply Migration
Run this command to update your database schema:

```bash
supabase db push
```

Or manually run the migration in Supabase Dashboard:
1. Go to **SQL Editor** in Supabase Dashboard
2. Open file: `supabase/migrations/20250116000001_update_subscriptions_for_razorpay_plans.sql`
3. Copy the entire SQL content
4. Paste in SQL Editor
5. Click **Run**

**What this does:**
- Adds `plan_id`, `is_founder`, `seats_allowed`, `metadata` columns to `subscriptions` table
- Updates constraints and adds indexes

---

## Step 6: Deploy Edge Functions

Deploy all three Edge Functions:

```bash
# Deploy create-subscription function
supabase functions deploy create-subscription

# Deploy razorpay-webhook function
supabase functions deploy razorpay-webhook

# Deploy subscription-success function
supabase functions deploy subscription-success
```

**Wait for each deployment to complete** before running the next command.

**Expected output:** Each function should show "Deployed function create-subscription" (or similar).

---

## Step 7: Configure Razorpay Webhook

### 7.1 Get Your Webhook URL
Your webhook URL:
```
https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/razorpay-webhook
```

**Your project ref**: `fakhmxfxnszmvxihpann`

### 7.2 Add Webhook in Razorpay Dashboard
1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. **Webhook URL**: Paste your webhook URL from Step 7.1
4. **Secret**: Click **Generate Secret** (or enter a custom secret)
5. **Copy the Secret** - You'll need it in Step 7.3
6. **Select Events** (check these):
   - ✅ `subscription.activated`
   - ✅ `subscription.charged`
   - ✅ `payment.captured`
   - ✅ `subscription.halted`
   - ✅ `subscription.paused`
   - ✅ `subscription.cancelled`
   - ✅ `subscription.completed`
7. Click **Create Webhook**

### 7.3 Set Webhook Secret in Supabase
```bash
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

Replace `your_webhook_secret_here` with the secret you copied in Step 7.2.

---

## Step 8: Test the Integration

### 8.1 Start Your Development Server
```bash
npm run dev
```

### 8.2 Test Subscription Flow
1. **Go to your landing page** (usually `http://localhost:8080`)
2. **Scroll to Pricing section**
3. **Click "Subscribe Now"** on any plan
4. **Login/Signup** if prompted
5. **You should see the Payment page** with plan details
6. **Click "Subscribe for ₹XX/month"**
7. **Razorpay checkout should open**
8. **Use Razorpay Test Cards**:
   - Card Number: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name
9. **Complete the payment**
10. **You should be redirected to Dashboard**

### 8.3 Verify in Database
1. Go to Supabase Dashboard → **Table Editor** → `subscriptions`
2. You should see a new subscription record with:
   - `status`: `active`
   - `plan_id`: Your plan ID
   - `is_founder`: `true` or `false` (depending on plan)
   - `seats_allowed`: `1` (Basic) or `5` (Pro)

### 8.4 Test Founder Limit
1. Try to create 10 founder subscriptions
2. The 11th attempt should show error: "Founder Circle is full!"

---

## Step 9: Verify Webhook is Working

### 9.1 Check Webhook Logs
1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Click on your webhook
3. Check **Webhook Logs** - you should see successful deliveries

### 9.2 Check Edge Function Logs
```bash
supabase functions logs razorpay-webhook
```

You should see webhook events being processed.

---

## Troubleshooting

### Issue: "Razorpay credentials not configured"
**Solution:** Make sure you ran `supabase secrets set` commands in Step 3.

### Issue: "Invalid plan: xxx"
**Solution:** Check that Plan IDs in Supabase secrets match your Razorpay plans exactly.

### Issue: Webhook not receiving events
**Solution:** 
- Verify webhook URL is correct
- Check webhook secret is set in Supabase
- Ensure webhook is active in Razorpay Dashboard

### Issue: "Razorpay Key ID not configured" in browser
**Solution:** Make sure `.env.local` has `VITE_RAZORPAY_KEY_ID` set correctly.

### Issue: Subscription created but status is "pending"
**Solution:** 
- Check webhook is configured correctly
- Verify webhook secret matches
- Check Edge Function logs for errors

---

## Production Checklist

Before going live:

- [ ] Switch to **Live Keys** in Razorpay (not test keys)
- [ ] Update all secrets with live credentials
- [ ] Update `.env.local` with live Razorpay Key ID
- [ ] Test with real payment (small amount)
- [ ] Verify webhook is working in production
- [ ] Set up monitoring/alerts for failed webhooks
- [ ] Review and test all 4 plan types
- [ ] Test founder limit enforcement
- [ ] Verify dashboard access protection

---

## Quick Reference

### All Commands Summary
```bash
# 1. Set Supabase Secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret
supabase secrets set PLAN_BASIC_NORMAL=plan_xxxxx
supabase secrets set PLAN_PRO_NORMAL=plan_xxxxx
supabase secrets set PLAN_BASIC_FOUNDER=plan_xxxxx
supabase secrets set PLAN_PRO_FOUNDER=plan_xxxxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=webhook_secret

# 2. Deploy Functions
supabase functions deploy create-subscription
supabase functions deploy razorpay-webhook
supabase functions deploy subscription-success

# 3. Run Migration
supabase db push
```

### File Locations
- `.env.local` → Project root
- Edge Functions → `supabase/functions/`
- Migrations → `supabase/migrations/`

---

## Need Help?

If you encounter issues:
1. Check Edge Function logs: `supabase functions logs <function-name>`
2. Check Razorpay webhook logs in Dashboard
3. Check Supabase logs in Dashboard → Logs
4. Verify all secrets are set: `supabase secrets list`

---

**🎉 Once all steps are complete, your Razorpay subscription integration is ready!**

