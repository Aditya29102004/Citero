# Razorpay Subscription Integration - Implementation Checklist

## ✅ Completed Implementation

### 1. Environment Variables
- ✅ Created `.env.local.example` with all required Razorpay configuration
- **Required Variables:**
  - `RAZORPAY_KEY_ID` - Your Razorpay Key ID
  - `RAZORPAY_KEY_SECRET` - Your Razorpay Key Secret
  - `VITE_RAZORPAY_KEY_ID` - Public Razorpay Key ID (for frontend)
  - `PLAN_BASIC_NORMAL` - Plan ID for basic_normal plan
  - `PLAN_PRO_NORMAL` - Plan ID for pro_normal plan
  - `PLAN_BASIC_FOUNDER` - Plan ID for basic_founder plan
  - `PLAN_PRO_FOUNDER` - Plan ID for pro_founder plan

### 2. Supabase Edge Functions Created

#### ✅ `create-subscription` (`supabase/functions/create-subscription/index.ts`)
- Creates Razorpay subscriptions using plan IDs from environment
- Maps plan keys (`basic_normal`, `pro_normal`, `basic_founder`, `pro_founder`) to Razorpay plan IDs
- Checks founder circle limit (max 10 founder subscriptions)
- Creates/updates Razorpay customer
- Stores subscription record in database with `pending` status
- Sets `seats_allowed` based on plan (Pro: 5, Basic: 1)
- Returns subscription object with Razorpay subscription ID

#### ✅ `razorpay-webhook` (`supabase/functions/razorpay-webhook/index.ts`)
- Verifies Razorpay webhook signature
- Handles events:
  - `subscription.activated` / `subscription.charged` - Activates subscription
  - `payment.captured` - Records payment and updates subscription
  - `subscription.halted` / `subscription.paused` - Sets status to `past_due`
  - `subscription.cancelled` - Sets status to `cancelled`
  - `subscription.completed` - Sets status to `expired`
- Updates subscription status and payment records in Supabase

#### ✅ `subscription-success` (`supabase/functions/subscription-success/index.ts`)
- Called from frontend after successful subscription checkout
- Updates subscription status to `active` in database

### 3. Database Schema Updates

#### ✅ Migration: `20250116000001_update_subscriptions_for_razorpay_plans.sql`
- Added `plan_id` column (TEXT) - Stores Razorpay plan ID
- Added `is_founder` column (BOOLEAN) - Flags founder circle subscriptions
- Added `seats_allowed` column (INTEGER) - Number of seats (Pro: 5, Basic: 1)
- Added `metadata` column (JSONB) - Stores Razorpay subscription data
- Updated status constraint to include `pending` and `halted`
- Added indexes:
  - `idx_subscriptions_subscription_id` - For webhook lookups
  - `idx_subscriptions_plan_id` - For plan-based queries
  - `idx_subscriptions_is_founder` - For founder circle queries

### 4. Frontend Updates

#### ✅ Payment Page (`src/pages/Payment.tsx`)
- Updated to use subscription flow instead of one-time payments
- Supports all 4 plan types: `basic_normal`, `pro_normal`, `basic_founder`, `pro_founder`
- Calls `create-subscription` Edge Function
- Opens Razorpay subscription checkout modal
- Handles subscription success callback
- Shows appropriate pricing and descriptions

#### ✅ Pricing Page (`src/pages/Index.tsx`)
- Updated plan buttons to use new plan keys:
  - Basic: `basic_normal`
  - Pro: `pro_normal`
- Added Founder Circle section with buttons:
  - Basic Founder: `basic_founder`
  - Pro Founder: `pro_founder`
- Updated currency symbols to ₹ (INR)

### 5. Founder Circle Limit Logic

#### ✅ Implemented in `create-subscription` Edge Function
- Checks count of existing founder subscriptions before creating new one
- Returns error if count >= 10: "Founder Circle is full! Only 10 founder subscriptions are available."
- Prevents creation of new founder subscriptions once limit is reached

### 6. Dashboard Route Protection

#### ✅ Already Implemented in `src/pages/Dashboard.tsx`
- Checks for active subscription on page load
- Verifies subscription period hasn't expired
- Redirects to `/payment` if no active subscription or expired
- Also checks on auth state changes

#### ✅ Also Protected in `src/pages/Auth.tsx`
- After login/signup, checks for active subscription
- Redirects to dashboard if active subscription exists
- Redirects to payment page if no active subscription

### 7. Seats Support

#### ✅ Implemented in `create-subscription` Edge Function
- Pro plans (`pro_normal`, `pro_founder`): `seats_allowed = 5`
- Basic plans (`basic_normal`, `basic_founder`): `seats_allowed = 1`
- Stored in `subscriptions` table

## 📋 Setup Instructions

### Step 1: Create Razorpay Plans
1. Log in to Razorpay Dashboard
2. Go to **Settings** → **Plans**
3. Create 4 plans:
   - Basic Normal: ₹99/month
   - Pro Normal: ₹249/month
   - Basic Founder: ₹49/month
   - Pro Founder: ₹129/month
4. Copy the Plan IDs (format: `plan_xxxxx`)

### Step 2: Configure Supabase Edge Function Secrets (Backend)
Set these secrets for your Edge Functions:
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret_here
supabase secrets set PLAN_BASIC_NORMAL=plan_xxxxx
supabase secrets set PLAN_PRO_NORMAL=plan_xxxxx
supabase secrets set PLAN_BASIC_FOUNDER=plan_xxxxx
supabase secrets set PLAN_PRO_FOUNDER=plan_xxxxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Note:** These secrets are used by Edge Functions and are NOT exposed to the frontend.

### Step 3: Configure Frontend Environment Variables
Create `.env.local` in your project root with ONLY the public Razorpay Key ID:
```env
# Frontend Razorpay Key (Public - Safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** Only put public keys in `.env.local`. Never put secrets (Key Secret, Plan IDs) here as they would be exposed to the browser!

### Step 4: Run Database Migration
```bash
supabase migration up
```
Or apply manually in Supabase Dashboard SQL Editor:
- Run `supabase/migrations/20250116000001_update_subscriptions_for_razorpay_plans.sql`

### Step 5: Deploy Edge Functions
```bash
supabase functions deploy create-subscription
supabase functions deploy razorpay-webhook
supabase functions deploy subscription-success
```

### Step 6: Configure Razorpay Webhook
1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/razorpay-webhook`
3. Select events:
   - `subscription.activated`
   - `subscription.charged`
   - `payment.captured`
   - `subscription.halted`
   - `subscription.paused`
   - `subscription.cancelled`
   - `subscription.completed`
4. Copy webhook secret and add to Supabase secrets:
   ```bash
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

## 📁 File Structure

```
├── .env.local.example                    # Environment variables template
├── supabase/
│   ├── functions/
│   │   ├── create-subscription/
│   │   │   └── index.ts                  # Creates Razorpay subscriptions
│   │   ├── razorpay-webhook/
│   │   │   └── index.ts                  # Handles Razorpay webhooks
│   │   └── subscription-success/
│   │       └── index.ts                  # Updates subscription on success
│   └── migrations/
│       └── 20250116000001_update_subscriptions_for_razorpay_plans.sql
├── src/
│   ├── pages/
│   │   ├── Payment.tsx                   # Updated for subscriptions
│   │   └── Index.tsx                     # Updated pricing with founder plans
│   └── ...
└── RAZORPAY_SUBSCRIPTION_IMPLEMENTATION.md
```

## 🔄 Subscription Flow

1. **User clicks "Subscribe"** on pricing page
2. **Redirected to login** if not authenticated
3. **Payment page** loads with selected plan
4. **Frontend calls** `create-subscription` Edge Function
5. **Edge Function**:
   - Checks founder limit (if founder plan)
   - Creates Razorpay customer (if needed)
   - Creates Razorpay subscription
   - Stores subscription record in database (`pending` status)
6. **Razorpay checkout** opens with subscription details
7. **User completes payment**
8. **Razorpay webhook** fires → `razorpay-webhook` Edge Function updates subscription to `active`
9. **Frontend callback** → `subscription-success` Edge Function confirms activation
10. **User redirected** to dashboard

## 🛡️ Security Features

- ✅ Webhook signature verification
- ✅ User authentication required for subscription creation
- ✅ Founder circle limit enforcement (10 max)
- ✅ Dashboard route protection (active subscription required)
- ✅ Subscription expiration checking
- ✅ RLS policies on subscriptions table

## 📊 Database Schema

### `subscriptions` table columns:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `subscription_id` (TEXT) - Razorpay subscription ID
- `plan_id` (TEXT) - Razorpay plan ID
- `plan_type` (TEXT) - 'basic' | 'pro' | 'enterprise'
- `status` (TEXT) - 'pending' | 'active' | 'cancelled' | 'expired' | 'past_due' | 'halted'
- `is_founder` (BOOLEAN) - Founder circle flag
- `seats_allowed` (INTEGER) - Number of seats (Pro: 5, Basic: 1)
- `current_period_start` (TIMESTAMPTZ)
- `current_period_end` (TIMESTAMPTZ)
- `amount_paid` (DECIMAL)
- `currency` (TEXT) - Default 'INR'
- `metadata` (JSONB) - Razorpay subscription data
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## ✅ Testing Checklist

- [ ] Create test Razorpay plans
- [ ] Configure environment variables
- [ ] Deploy Edge Functions
- [ ] Configure webhook URL
- [ ] Test Basic Normal subscription flow
- [ ] Test Pro Normal subscription flow
- [ ] Test Basic Founder subscription flow (verify limit)
- [ ] Test Pro Founder subscription flow (verify limit)
- [ ] Test webhook events
- [ ] Test dashboard access without subscription
- [ ] Test dashboard access with active subscription
- [ ] Test subscription expiration handling

## 🚨 Important Notes

1. **Plan IDs**: You must create plans in Razorpay Dashboard and use the actual Plan IDs
2. **Webhook Secret**: Configure webhook secret for production security
3. **Founder Limit**: Currently hardcoded to 10 - adjust in `create-subscription/index.ts` if needed
4. **Currency**: All prices are in INR (₹) - update if needed
5. **Subscription Duration**: Set to 120 cycles (10 years) - adjust in `create-subscription/index.ts` if needed

