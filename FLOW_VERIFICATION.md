# Complete Flow Verification

## ✅ Flow Summary

### 1. Signup → Onboarding → Brand Creation
- **Signup**: User creates account
- **Redirect**: Auth page checks onboarding → redirects to `/onboarding/website` if not completed
- **Onboarding**: User completes all steps (website, description, topics, competitors, analysis)
- **Brand Creation**: `save-onboarding` Edge Function creates brand with:
  - `onboarding_completed = true`
  - All onboarding data (topics, competitors, etc.)
  - **Prevents duplicates**: Checks for existing brand before creating

### 2. Payment → Subscription → Dashboard Unlock
- **Payment**: User subscribes via Razorpay
- **Subscription Created**: `subscription-success` Edge Function activates subscription
- **Redirect Logic**: 
  - Checks if onboarding completed
  - If yes → `/dashboard` (uses existing brand)
  - If no → `/onboarding/website`
- **No Brand Creation**: Payment flow does NOT create brands

### 3. Dashboard → Uses Existing Brand
- **Brand Fetching**: `fetchUserBrands()` gets all brands for user
- **Auto-Select**: First brand (most recent) is auto-selected
- **Uses Onboarding Brand**: The brand created during onboarding is used
- **No Duplicates**: Only one brand per user from onboarding

## ✅ Protection Mechanisms

### 1. One-Time Onboarding Per Email
- **Frontend Check**: `Website.tsx` and `Complete.tsx` check for existing brands
- **Backend Check**: `save-onboarding` Edge Function prevents duplicate brand creation
- **Detection**: Checks `onboarding_completed` flag and presence of onboarding data

### 2. No Unnecessary API Calls
- **Dashboard**: Only fetches data when brand is selected
- **Scans**: Only run when user explicitly clicks "Run GEO Scan"
- **No Auto-Scans**: No automatic scans on payment or dashboard load
- **Efficient Polling**: Only polls when scan is running (2s interval)

### 3. Brand Association
- **Single Brand**: One brand per user from onboarding
- **Reused**: Same brand used after payment
- **No Recreation**: Payment doesn't create new brand

## ✅ Error Prevention

1. **Duplicate Onboarding**: Blocked at frontend and backend
2. **Missing Brand**: Dashboard checks for brands before rendering
3. **Subscription Check**: Dashboard verifies subscription before allowing access
4. **Onboarding Check**: Dashboard verifies onboarding completion

## ✅ Credit Optimization

1. **No Auto-Scans**: Scans only run when user clicks button
2. **Efficient Polling**: Only polls during active scans
3. **Single Brand**: One brand per user prevents duplicate scans
4. **On-Demand Data**: Dashboard fetches data only when needed

## Flow Diagram

```
Signup
  ↓
Auth Check → Onboarding Complete? 
  ├─ No → /onboarding/website
  └─ Yes → Subscription Check
            ├─ No → /pricing
            └─ Yes → /dashboard

Onboarding
  ↓
save-onboarding Edge Function
  ↓
Brand Created (with onboarding_completed=true)
  ↓
Complete.tsx → Shows Score → Redirects to /pricing

Payment
  ↓
subscription-success Edge Function
  ↓
Subscription Activated
  ↓
Redirect Check:
  ├─ Onboarding Complete? → /dashboard (uses existing brand)
  └─ Not Complete → /onboarding/website

Dashboard
  ↓
fetchUserBrands() → Gets existing brand from onboarding
  ↓
Auto-selects brand
  ↓
Shows dashboard data for that brand
```

## ✅ Verification Checklist

- [x] Non-subscribed users can complete onboarding once
- [x] Payment doesn't create new brand
- [x] Dashboard uses existing brand from onboarding
- [x] No duplicate brand creation
- [x] No unnecessary API calls
- [x] Scans only run on user action
- [x] Efficient polling (only during scans)
- [x] Proper redirects based on onboarding/subscription status

