# Complete Razorpay Dashboard Setup Guide

This guide will walk you through setting up Razorpay in your dashboard to accept payments.

## Step 1: Get Your API Keys

1. **Log in to Razorpay Dashboard**: https://dashboard.razorpay.com/
2. **Go to Settings** → **API Keys** (in the left sidebar)
3. **Generate Keys**:
   - For **Testing**: Click "Generate Test Key" (use test mode first!)
   - For **Production**: Click "Generate Live Key" (only after testing)
4. **Copy Both Keys**:
   - **Key ID** (starts with `rzp_test_` for test or `rzp_live_` for live)
   - **Key Secret** (long string - keep this SECRET!)

## Step 2: Configure Payment Settings

### 2.1 Enable Payment Methods

1. Go to **Settings** → **Payment Methods**
2. Enable the payment methods you want to accept:
   - ✅ **Cards** (Credit/Debit) - Recommended
   - ✅ **Netbanking** - Optional
   - ✅ **UPI** - Recommended for India
   - ✅ **Wallet** (Paytm, PhonePe, etc.) - Optional
   - ✅ **EMI** - Optional

### 2.2 Configure Payment Pages

1. Go to **Settings** → **Payment Pages**
2. **Customize your checkout**:
   - Upload your logo
   - Set brand colors
   - Add company name: "unifr"
   - Set up payment page URL (optional)

### 2.3 Set Up Webhooks (Important!)

Webhooks notify your server when payments succeed/fail. This is crucial for your integration.

1. Go to **Settings** → **Webhooks**
2. Click **"Add New Webhook"**
3. **Webhook URL**: 
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-razorpay-payment
   ```
   Replace `YOUR_PROJECT_REF` with your Supabase project reference ID
4. **Select Events** (check these):
   - ✅ `payment.authorized` - Payment was authorized
   - ✅ `payment.captured` - Payment was captured
   - ✅ `payment.failed` - Payment failed
   - ✅ `order.paid` - Order was paid
5. **Secret**: Generate a webhook secret (save this!)
6. Click **"Create Webhook"**

**Note**: For now, you can skip webhooks since your frontend handles payment verification. But it's good to have for production.

## Step 3: Configure Account Settings

### 3.1 Business Details

1. Go to **Settings** → **Account & Settings**
2. Fill in your business details:
   - Business name
   - Business type
   - Contact information
   - Bank account details (for settlements)

### 3.2 Settlement Settings

1. Go to **Settings** → **Settlements**
2. Configure:
   - Settlement schedule (daily/weekly)
   - Bank account for payouts
   - Settlement currency (INR)

## Step 4: Add API Keys to Supabase

Now add your Razorpay keys to Supabase Edge Functions:

### Option A: Using Supabase Dashboard

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** → **Secrets** (or **Settings** → **Secrets**)
4. Click **"Add Secret"** and add:

   **Secret 1:**
   - **Name**: `RAZORPAY_KEY_ID`
   - **Value**: Your Razorpay Key ID (e.g., `rzp_test_xxxxx`)

   **Secret 2:**
   - **Name**: `RAZORPAY_KEY_SECRET`
   - **Value**: Your Razorpay Key Secret

5. Click **"Save"** for each secret

### Option B: Using Supabase CLI

```bash
# Set secrets
supabase secrets set RAZORPAY_KEY_ID=your_key_id_here
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here

# Verify secrets are set
supabase secrets list
```

## Step 5: Deploy Edge Functions

### Option A: Using Supabase Dashboard

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Create a new function"**

   **Function 1: `create-razorpay-order`**
   - Copy contents from `supabase/functions/create-razorpay-order/index.ts`
   - Paste into editor
   - Click **Deploy**

   **Function 2: `verify-razorpay-payment`**
   - Copy contents from `supabase/functions/verify-razorpay-payment/index.ts`
   - Paste into editor
   - Click **Deploy**

### Option B: Using Supabase CLI

```bash
# Make sure you're logged in and linked
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

## Step 6: Run Database Migration

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/migrations/20250115000000_add_payments_subscriptions.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run** to execute

This creates:
- `subscriptions` table
- `payments` table
- Required indexes and RLS policies

## Step 7: Test Your Setup

### 7.1 Test Mode Setup

1. Make sure you're using **Test Keys** (start with `rzp_test_`)
2. Use Razorpay test cards:

   **Success Card:**
   - Card Number: `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., `123`)
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name

   **Failure Card:**
   - Card Number: `4000 0000 0000 0002`
   - CVV: Any 3 digits
   - Expiry: Any future date

### 7.2 Test Payment Flow

1. Start your development server: `npm run dev`
2. Navigate to your pricing page
3. Click **"Subscribe Now"** on any plan
4. You'll be redirected to login (if not logged in)
5. After login, you'll see the payment page
6. Click **"Pay ₹XX"** button
7. Razorpay checkout will open
8. Use test card details
9. Complete payment
10. You should be redirected back with success message

### 7.3 Verify Payment

1. Check **Razorpay Dashboard** → **Transactions**
   - You should see the test payment
   - Status should be "Captured"

2. Check **Supabase Dashboard** → **Table Editor**
   - Go to `payments` table - should have new record
   - Go to `subscriptions` table - should have new subscription

## Step 8: Production Setup

Once testing is complete:

### 8.1 Switch to Live Mode

1. In Razorpay Dashboard, go to **Settings** → **API Keys**
2. Click **"Generate Live Key"**
3. Copy the new **Live Key ID** and **Live Key Secret**
4. Update Supabase secrets with live keys:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxxxx
   supabase secrets set RAZORPAY_KEY_SECRET=your_live_secret
   ```

### 8.2 Complete KYC (Know Your Customer)

1. Go to **Settings** → **Account & Settings** → **KYC**
2. Upload required documents:
   - Business registration documents
   - Bank account details
   - Identity proof
   - Address proof
3. Wait for Razorpay to verify (usually 1-2 business days)

### 8.3 Activate Live Mode

1. Once KYC is approved, Razorpay will activate your account
2. You can now accept real payments!

## Step 9: Monitor Payments

### In Razorpay Dashboard:

1. **Transactions**: View all payments
2. **Settlements**: See when money is transferred to your bank
3. **Reports**: Generate payment reports
4. **Refunds**: Process refunds if needed

### In Supabase Dashboard:

1. **Table Editor** → `payments`: View payment records
2. **Table Editor** → `subscriptions`: View active subscriptions
3. **Edge Functions** → **Logs**: Check function execution logs

## Common Issues & Solutions

### Issue: "Razorpay credentials not configured"
**Solution**: Make sure secrets are set in Supabase Edge Functions

### Issue: Payment succeeds but subscription not created
**Solution**: 
- Check Edge Function logs in Supabase
- Verify database migration ran successfully
- Check RLS policies allow inserts

### Issue: "Invalid signature" error
**Solution**: 
- Verify Key Secret is correct
- Check signature verification logic in `verify-razorpay-payment`

### Issue: Test payments not working
**Solution**:
- Make sure you're using test keys (`rzp_test_`)
- Use test card numbers provided above
- Check Razorpay dashboard for error messages

## Security Checklist

- ✅ Never expose Key Secret in frontend code
- ✅ All payment operations happen server-side
- ✅ Payment signatures are verified
- ✅ RLS policies protect user data
- ✅ Use HTTPS for all requests
- ✅ Keep webhook secrets secure

## Support Resources

- **Razorpay Docs**: https://razorpay.com/docs/
- **Razorpay Support**: support@razorpay.com
- **Supabase Docs**: https://supabase.com/docs
- **Razorpay Dashboard**: https://dashboard.razorpay.com/

## Quick Reference

**Test Card (Success):**
- Number: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: `12/25`

**Test Card (Failure):**
- Number: `4000 0000 0000 0002`
- CVV: `123`
- Expiry: `12/25`

**Razorpay API Endpoints:**
- Create Order: `POST https://api.razorpay.com/v1/orders`
- Verify Payment: Done via signature verification

**Supabase Secrets Required:**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

