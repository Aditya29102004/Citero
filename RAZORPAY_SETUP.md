# Razorpay Payment Integration Setup Guide

This guide will help you set up Razorpay payments for your website.

## Prerequisites

1. A Razorpay account (sign up at https://razorpay.com/)
2. Access to your Supabase project dashboard
3. Razorpay API keys (Key ID and Key Secret)

## Step 1: Get Razorpay API Keys

1. Log in to your Razorpay Dashboard: https://dashboard.razorpay.com/
2. Go to **Settings** → **API Keys** (in the left sidebar)
3. If you don't have keys yet:
   - For **Testing**: Click **"Generate Test Key"** (use this first!)
   - For **Production**: Click **"Generate Live Key"** (only after testing)
4. Copy your **Key ID** and **Key Secret**
   - **Key ID**: Starts with `rzp_test_` (test) or `rzp_live_` (production)
   - **Key Secret**: Long string - keep this SECRET!
   - **Important**: Never expose Key Secret in client-side code

## Step 1.5: Configure Razorpay Dashboard Settings

### Enable Payment Methods
1. Go to **Settings** → **Payment Methods**
2. Enable payment methods you want:
   - ✅ **Cards** (Credit/Debit) - Recommended
   - ✅ **UPI** - Recommended for India
   - ✅ **Netbanking** - Optional
   - ✅ **Wallets** (Paytm, PhonePe) - Optional

### Configure Payment Pages
1. Go to **Settings** → **Payment Pages**
2. Customize:
   - Upload your logo
   - Set brand colors
   - Company name: "unifr"

### Set Up Webhooks (Optional but Recommended)
1. Go to **Settings** → **Webhooks**
2. Click **"Add New Webhook"**
3. **Webhook URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-razorpay-payment`
4. **Events to subscribe**:
   - ✅ `payment.authorized`
   - ✅ `payment.captured`
   - ✅ `payment.failed`
5. Generate and save webhook secret

## Step 2: Add Razorpay Keys to Supabase Edge Functions

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **Secrets**
3. Add the following secrets:
   - **Name:** `RAZORPAY_KEY_ID`
     - **Value:** Your Razorpay Key ID
   - **Name:** `RAZORPAY_KEY_SECRET`
     - **Value:** Your Razorpay Key Secret

## Step 3: Run Database Migration

Run the migration to create the subscriptions and payments tables:

1. Go to **SQL Editor** in your Supabase Dashboard
2. Copy and paste the contents of `supabase/migrations/20250115000000_add_payments_subscriptions.sql`
3. Click **Run** to execute the migration

Alternatively, if you're using Supabase CLI:
```bash
supabase db push
```

## Step 4: Deploy Edge Functions

Deploy the Razorpay Edge Functions to Supabase:

### Option A: Using Supabase CLI (Recommended)

```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in your Supabase Dashboard
2. Click **Create a new function**
3. For each function:
   - **Function Name:** `create-razorpay-order` (or `verify-razorpay-payment`)
   - Copy the entire contents of `supabase/functions/[function-name]/index.ts`
   - Paste into the editor
   - Click **Deploy**

## Step 5: Update Environment Variables (Optional)

If you're using environment variables for your frontend, make sure your `.env` file includes:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Step 6: Test the Integration

1. **Test Mode**: Use Razorpay test keys and test cards:
   - Test Card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Name: Any name

2. Navigate to your pricing page and click "Subscribe Now" on any plan
3. Complete the payment flow
4. Verify that:
   - Payment is processed successfully
   - Subscription is created in the database
   - User is redirected to dashboard

## Payment Flow

1. User clicks "Subscribe Now" on a pricing plan
2. User is redirected to `/payment?plan=[plan-type]`
3. Payment page loads Razorpay checkout
4. User completes payment via Razorpay
5. On success, payment is verified via Edge Function
6. Subscription is created/updated in database
7. User is redirected to dashboard

## Database Tables

### `subscriptions`
Stores user subscription information:
- `plan_type`: basic, pro, or enterprise
- `status`: active, cancelled, expired, past_due
- `current_period_start` and `current_period_end`
- `amount_paid` and `currency`

### `payments`
Stores payment transaction records:
- `razorpay_payment_id`: Unique payment ID from Razorpay
- `razorpay_order_id`: Order ID from Razorpay
- `status`: pending, completed, failed, refunded
- `plan_type`: Which plan was purchased
- `metadata`: Additional payment data

## Security Notes

1. **Never expose your Razorpay Key Secret** in client-side code
2. All payment operations happen server-side via Edge Functions
3. Payment signatures are verified server-side before creating subscriptions
4. Row Level Security (RLS) is enabled on all payment/subscription tables

## Troubleshooting

### Payment verification fails
- Check that Razorpay keys are correctly set in Edge Function secrets
- Verify signature verification logic is working correctly
- Check Edge Function logs in Supabase Dashboard

### Edge Function errors
- Ensure all required secrets are set
- Check function logs in Supabase Dashboard
- Verify Supabase URL and keys are correct

### Database errors
- Ensure migration has been run successfully
- Check RLS policies are correctly set
- Verify user has proper permissions

## Support

For Razorpay-specific issues:
- Razorpay Documentation: https://razorpay.com/docs/
- Razorpay Support: support@razorpay.com

For integration issues:
- Check Supabase Edge Function logs
- Review database migration status
- Verify environment variables are set correctly

