# Environment Variables Setup

## Two Places for Configuration:

### 1. Supabase Edge Function Secrets (Backend - Required)

Set these secrets for your Edge Functions using Supabase CLI:

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here
supabase secrets set PLAN_BASIC_NORMAL=plan_xxxxx
supabase secrets set PLAN_PRO_NORMAL=plan_xxxxx
supabase secrets set PLAN_BASIC_FOUNDER=plan_xxxxx
supabase secrets set PLAN_PRO_FOUNDER=plan_xxxxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Why?** These are used by Edge Functions (`create-subscription`, `razorpay-webhook`) and should NOT be exposed to the frontend.

### 2. `.env.local` file (Frontend - Required)

Create `.env.local` in your project root with ONLY the public Razorpay Key ID:

```env
# Frontend Razorpay Key (Public - Safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Why?** The frontend needs `VITE_RAZORPAY_KEY_ID` to initialize Razorpay checkout. The `VITE_` prefix makes it available in the browser.

## Important Security Notes:

- ✅ **Supabase Secrets**: Use for sensitive data (Key Secret, Plan IDs, Webhook Secret)
- ✅ **`.env.local`**: Only use for public keys that are safe to expose (Razorpay Key ID)
- ❌ **Never** put `RAZORPAY_KEY_SECRET` or Plan IDs in `.env.local` - they would be exposed to the browser!

## Where to find Razorpay credentials:

1. **Key ID & Secret**: Razorpay Dashboard → Settings → API Keys
2. **Plan IDs**: Razorpay Dashboard → Settings → Plans → Copy the Plan ID (format: `plan_xxxxx`)
3. **Webhook Secret**: Razorpay Dashboard → Settings → Webhooks → Copy webhook secret

