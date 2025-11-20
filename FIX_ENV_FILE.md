# Fix: Create .env.local File

## The Problem
The error "no such host: your-project.supabase.co" occurs because the `.env.local` file is missing or has placeholder values.

## Solution

### Step 1: Create `.env.local` file
I've created the file with your project URL. Now you need to:

### Step 2: Get Your Supabase Anon Key
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fakhmxfxnszmvxihpann
2. Navigate to **Project Settings** → **API**
3. Copy the **anon/public** key (starts with `eyJ...`)

### Step 3: Update `.env.local`
Open `.env.local` in your project root and replace:

```env
# Frontend Razorpay Key (Public - Safe to expose)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Supabase Configuration
VITE_SUPABASE_URL=https://fakhmxfxnszmvxihpann.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here  ← Replace this!
```

**Replace:**
- `rzp_test_xxxxx` with your actual Razorpay Key ID
- `your_anon_key_here` with your Supabase Anon Key from Step 2

### Step 4: Restart Dev Server
After updating `.env.local`, restart your development server:

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Your Project Details
- **Project Ref**: `fakhmxfxnszmvxihpann`
- **Supabase URL**: `https://fakhmxfxnszmvxihpann.supabase.co`
- **Anon Key**: Get from Supabase Dashboard → Project Settings → API

## Note
The `.env.local` file is already in `.gitignore`, so it won't be committed to git. This is correct for security.

