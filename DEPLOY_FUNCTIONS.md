# Deploy Razorpay Edge Functions

## Option 1: Using Supabase Dashboard (Easiest)

### Deploy `create-razorpay-order` function:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** in the left sidebar
4. Click **"Create a new function"** or **"New Function"**
5. Set the function name: `create-razorpay-order`
6. Copy the entire contents of `supabase/functions/create-razorpay-order/index.ts`
7. Paste it into the code editor
8. Click **Deploy** or **Save**

### Deploy `verify-razorpay-payment` function:

1. In the Edge Functions page, click **"Create a new function"** again
2. Set the function name: `verify-razorpay-payment`
3. Copy the entire contents of `supabase/functions/verify-razorpay-payment/index.ts`
4. Paste it into the code editor
5. Click **Deploy** or **Save**

### Verify Secrets are Set:

1. Go to **Edge Functions** → **Secrets** (or **Settings** → **Secrets**)
2. Verify these secrets exist:
   - `RAZORPAY_KEY_ID` - Your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET` - Your Razorpay Key Secret

## Option 2: Using Supabase CLI

### Install Supabase CLI:

```bash
# Using npm
npm install -g supabase

# Or using scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Login and Link Project:

```bash
# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy Functions:

```bash
# Deploy create-razorpay-order
supabase functions deploy create-razorpay-order

# Deploy verify-razorpay-payment
supabase functions deploy verify-razorpay-payment
```

## Verify Deployment

After deploying, you can test the functions:

1. Go to **Edge Functions** in your dashboard
2. Click on each function name
3. You should see the function code and be able to invoke it
4. Check the **Logs** tab to see any runtime errors

## Testing

Once deployed, test the payment flow:

1. Navigate to your website's pricing page
2. Click "Subscribe Now" on any plan
3. Complete the payment with a test card:
   - Card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
4. Verify payment is processed and subscription is created

## Troubleshooting

### Function not found
- Ensure function names match exactly: `create-razorpay-order` and `verify-razorpay-payment`
- Check that functions are deployed (should appear in Edge Functions list)

### Secret errors
- Verify secrets are set in Edge Functions → Secrets
- Check secret names match exactly: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Payment verification fails
- Check Edge Function logs for errors
- Verify Razorpay keys are correct (test vs live keys)
- Ensure payment signature verification is working

