# Quick Guide: Switch to Test Mode

## Current Status
Your `.env.local` currently has:
```
VITE_RAZORPAY_KEY_ID=rzp_live_RhiIyDnDCb33s6
```

## What You Need to Do

### 1. Get Test Keys from Razorpay
1. Go to https://dashboard.razorpay.com/
2. Click **Test Mode** toggle (top right)
3. Go to **Settings** → **API Keys**
4. Generate test keys if you don't have them
5. Copy your **Test Key ID** (starts with `rzp_test_`)

### 2. Update `.env.local` File
Open `.env.local` and change:
```env
# Change this line:
VITE_RAZORPAY_KEY_ID=rzp_live_RhiIyDnDCb33s6

# To your test key (example):
VITE_RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_HERE
```

### 3. Update Supabase Secrets
Run these commands (replace with your actual test keys):

```bash
# Update Razorpay Key ID
supabase secrets set RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID

# Update Razorpay Key Secret  
supabase secrets set RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET

# Get test plan IDs from Razorpay Dashboard → Settings → Plans (in Test Mode)
# Then update:
supabase secrets set PLAN_BASIC_NORMAL=plan_YOUR_TEST_PLAN_ID
supabase secrets set PLAN_PRO_NORMAL=plan_YOUR_TEST_PLAN_ID
supabase secrets set PLAN_BASIC_FOUNDER=plan_YOUR_TEST_PLAN_ID
supabase secrets set PLAN_PRO_FOUNDER=plan_YOUR_TEST_PLAN_ID
```

### 4. Create Test Plans (If Needed)
In Razorpay Dashboard (Test Mode):
- Create plans matching your pricing:
  - Basic: $99/mo
  - Pro: $179/mo
  - Basic Founder: $39/mo
  - Pro Founder: $89/mo
- Copy the Plan IDs and use them in Step 3

### 5. Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Test Cards
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

