# Fix Razorpay Key ID Placeholder Issue

## The Problem

Your `.env.local` file still has the placeholder Razorpay Key ID:
```
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx  ← This is a placeholder!
```

This causes Razorpay checkout to fail with 401 Unauthorized errors.

## The Fix

### Step 1: Get Your Actual Razorpay Key ID

1. Go to Razorpay Dashboard: https://dashboard.razorpay.com/
2. Navigate to **Settings** → **API Keys**
3. Copy your **Key ID** (starts with `rzp_test_` for test or `rzp_live_` for production)
   - Example: `rzp_test_ABC123xyz` (NOT `rzp_test_xxxxx`)

### Step 2: Update `.env.local`

1. Open `.env.local` in your project root
2. Replace the placeholder:

**Before:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

**After:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_ABC123xyz  ← Your actual Key ID
```

### Step 3: Restart Dev Server

**CRITICAL:** You MUST restart your dev server after updating `.env.local`:

1. Stop the server: Press `Ctrl+C` in the terminal
2. Start again: `npm run dev`

### Step 4: Test Again

Try subscribing again. The Razorpay checkout should now work!

## Why This Happens

- Environment variables are loaded when the dev server starts
- Changing `.env.local` while the server is running doesn't update the values
- Razorpay checkout needs the actual Key ID to authenticate
- Placeholder values cause 401 Unauthorized errors

## Verification

After updating and restarting, check the browser console:
- You should see `key_id=rzp_test_ABC123xyz` (your actual key, not `xxxxx`)
- Razorpay checkout should open successfully
- No more 401 errors

## Current Status

✅ **Edge Function is working** - Subscription was created (`sub_Ri8TCW2L1zlKL3`)
❌ **Frontend Key ID is placeholder** - Need to update `.env.local` and restart

Once you update the Key ID and restart, everything should work!

