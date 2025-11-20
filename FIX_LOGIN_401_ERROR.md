# Fix Login 401 Error

## The Problem
Your `.env.local` file has a placeholder value for the Supabase Anon Key:
```
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here  ← This is a placeholder!
```

This causes authentication to fail with a 401 error.

## Solution

### Step 1: Get Your Supabase Anon Key

1. Go to your Supabase Dashboard:
   **https://supabase.com/dashboard/project/fakhmxfxnszmvxihpann/settings/api**

2. In the **Project API keys** section, find:
   - **anon public** key (this is what you need)
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Copy the entire key** (it's long, make sure you get it all)

### Step 2: Update `.env.local`

1. Open `.env.local` in your project root
2. Replace `your_anon_key_here` with your actual Anon Key:

```env
# Frontend Razorpay Key (Public - Safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Supabase Configuration
VITE_SUPABASE_URL=https://fakhmxfxnszmvxihpann.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← Paste your actual key here
```

### Step 3: Restart Dev Server

**Important:** After updating `.env.local`, you MUST restart your dev server:

1. Stop the current server (press `Ctrl+C` in the terminal)
2. Start it again:
   ```powershell
   npm run dev
   ```

### Step 4: Verify

After restarting, try logging in again. The 401 error should be gone.

## Why This Happens

- Environment variables are loaded when the dev server starts
- If you change `.env.local` while the server is running, it won't pick up the changes
- You must restart the server for new environment variables to take effect

## Quick Checklist

- [ ] Got Anon Key from Supabase Dashboard
- [ ] Updated `.env.local` with actual key
- [ ] Restarted dev server (`Ctrl+C` then `npm run dev`)
- [ ] Tried logging in again

---

**Your Supabase Project:**
- URL: `https://fakhmxfxnszmvxihpann.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/fakhmxfxnszmvxihpann

