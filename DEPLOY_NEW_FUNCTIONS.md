# Deploy New Subscription Edge Functions

You need to deploy **3 new Edge Functions** for the subscription integration:

1. ✅ `create-subscription` - Creates Razorpay subscriptions
2. ✅ `razorpay-webhook` - Handles Razorpay webhook events
3. ✅ `subscription-success` - Updates subscription after checkout

## Option 1: Deploy via Supabase Dashboard (Easiest - No CLI needed)

### Step 1: Deploy `create-subscription`

1. Go to Supabase Dashboard → **Edge Functions**
2. Click **Create a new function**
3. Function name: `create-subscription`
4. Copy the entire content from `supabase/functions/create-subscription/index.ts`
5. Paste it in the code editor
6. Click **Deploy**

### Step 2: Deploy `razorpay-webhook`

1. Click **Create a new function**
2. Function name: `razorpay-webhook`
3. Copy the entire content from `supabase/functions/razorpay-webhook/index.ts`
4. Paste it in the code editor
5. Click **Deploy**

### Step 3: Deploy `subscription-success`

1. Click **Create a new function**
2. Function name: `subscription-success`
3. Copy the entire content from `supabase/functions/subscription-success/index.ts`
4. Paste it in the code editor
5. Click **Deploy**

## Option 2: Deploy via CLI (If you install CLI later)

Once you have Supabase CLI installed:

```bash
# Login first
supabase login

# Link your project
supabase link --project-ref fakhmxfxnszmvxihpann

# Deploy functions
supabase functions deploy create-subscription
supabase functions deploy razorpay-webhook
supabase functions deploy subscription-success
```

## Set Secrets via Dashboard

Since you don't have CLI, set secrets via Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets one by one:

   - **Name**: `RAZORPAY_KEY_ID`
     **Value**: `rzp_test_xxxxx` (your Razorpay Key ID)

   - **Name**: `RAZORPAY_KEY_SECRET`
     **Value**: `your_key_secret` (your Razorpay Key Secret)

   - **Name**: `PLAN_BASIC_NORMAL`
     **Value**: `plan_xxxxx` (your Basic Normal plan ID)

   - **Name**: `PLAN_PRO_NORMAL`
     **Value**: `plan_xxxxx` (your Pro Normal plan ID)

   - **Name**: `PLAN_BASIC_FOUNDER`
     **Value**: `plan_xxxxx` (your Basic Founder plan ID)

   - **Name**: `PLAN_PRO_FOUNDER`
     **Value**: `plan_xxxxx` (your Pro Founder plan ID)

   - **Name**: `RAZORPAY_WEBHOOK_SECRET`
     **Value**: `your_webhook_secret` (after setting up webhook)

## Your Project Details

- **Project Ref**: `fakhmxfxnszmvxihpann`
- **Base URL**: `https://fakhmxfxnszmvxihpann.supabase.co`

## Webhook URL

After deploying `razorpay-webhook`, your webhook URL will be:
```
https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/razorpay-webhook
```

Use this URL when configuring webhooks in Razorpay Dashboard.

