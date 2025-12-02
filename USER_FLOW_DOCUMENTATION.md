# 🔄 User Flow: Payment → Onboarding → Dashboard

## ✅ Current Flow (Correct!)

### For New Subscribers (Non-Founder):

1. **User Subscribes & Pays** (`/payment`)
   - User selects plan and completes Razorpay payment
   - Payment success → Subscription activated in database

2. **Redirect to Onboarding** (`/onboarding/website`)
   - After 3 seconds, user is redirected to onboarding
   - User completes onboarding steps:
     - Website URL
     - Description
     - Topics
     - Competitors
     - Analysis

3. **Complete Onboarding** (`/onboarding/complete`)
   - Brand is created in database
   - `onboarding_completed` is set to `true`
   - User redirected to dashboard

4. **Dashboard Access** (`/dashboard`)
   - User can now access dashboard
   - If they try to access dashboard before completing onboarding, they're redirected back to onboarding

---

### For Founder Users:

1. **Founder Subscribes & Pays** (`/payment`)
   - Same payment flow

2. **Skip Onboarding** ✅
   - Founders are automatically redirected to dashboard
   - No onboarding required

3. **Dashboard Access** (`/dashboard`)
   - Direct access without onboarding

---

## 📋 Code Flow Details

### Payment Success Handler (`src/pages/Payment.tsx`)

```typescript
// Line 202-205: After successful payment
setPaymentStatus("success");
toast.success("Subscription activated! Your subscription is now active.");

// Redirect to onboarding after 3 seconds (since they just purchased)
setTimeout(() => {
  navigate("/onboarding/website");
}, 3000);
```

### Onboarding Completion (`src/pages/onboarding/Complete.tsx`)

```typescript
// Line 126-131: After completing onboarding
toast.success("Brand created successfully! Redirecting to dashboard...");

setTimeout(() => {
  navigate("/dashboard");
}, 1500);
```

### Dashboard Check (`src/pages/Dashboard.tsx`)

```typescript
// Line 107-129: Check onboarding status
const isFounder = subscriptionLimits.isFounder === true;

if (!isFounder) {
  // Only check onboarding for non-founder users
  let onboardingComplete = await checkOnboardingComplete();
  
  if (!onboardingComplete) {
    navigate("/onboarding/website", { replace: true });
    return;
  }
}
// Founder users skip this check
```

---

## 🎯 Flow Diagram

```
New User Flow:
┌─────────────┐
│   Payment   │
│   Success   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /website       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /description   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /topics        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /competitors   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /analysis      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Onboarding     │
│  /complete      │
│  (Creates Brand)│
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │ ✅
└─────────────┘

Founder User Flow:
┌─────────────┐
│   Payment   │
│   Success   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │ ✅ (Skip Onboarding)
└─────────────┘
```

---

## ✅ Verification Checklist

- [x] Payment success redirects to `/onboarding/website`
- [x] Onboarding completion redirects to `/dashboard`
- [x] Dashboard checks onboarding and redirects if incomplete
- [x] Founder users skip onboarding
- [x] Non-founder users must complete onboarding

---

## 🔧 How It Works

1. **Payment Success**: User completes Razorpay payment → Subscription created with `status = 'pending'` → Webhook activates it → Redirects to onboarding

2. **Onboarding Check**: Dashboard checks if user has brands and `onboarding_completed = true`

3. **Founder Skip**: Founders (`is_founder = true`) automatically skip onboarding check

4. **Protection**: If user tries to access dashboard without completing onboarding, they're redirected back

---

## 📝 Notes

- **New subscribers**: Always go through onboarding (unless founder)
- **Founders**: Skip onboarding entirely
- **Returning users**: If they already completed onboarding, go straight to dashboard
- **Incomplete onboarding**: Users are redirected back to onboarding if they try to access dashboard

This flow ensures all new users (except founders) set up their brand properly before accessing the dashboard!

