# Waitlist Setup Instructions

## Overview
A waitlist form has been added to the homepage below the hero section. All login/sign-in buttons have been removed from the public-facing website and replaced with "Join Waitlist" buttons that scroll to the waitlist form.

## Changes Made

### Frontend Changes
1. **Created `WaitlistForm` component** (`src/components/WaitlistForm.tsx`)
   - Professional form with email, plan selection, and comments
   - Success state after submission
   - Form validation and error handling

2. **Updated Homepage** (`src/pages/Index.tsx`)
   - Added waitlist section below hero
   - Replaced all "Get Started" and "Sign In" buttons with "Join Waitlist" buttons
   - Removed navigation to `/auth` from public pages

3. **Updated Header** (`src/components/HomeHeader.tsx`)
   - Removed "Sign In" button
   - Changed "Get Started" to "Join Waitlist"

### Backend Setup Required

Run the SQL migration file in your Supabase SQL Editor:

**File: `supabase_migration_waitlist.sql`**

This migration will:
- Add `is_admin` column to `profiles` table
- Create `waitlist` table with proper schema
- Set up Row Level Security (RLS) policies
- Allow public signups (anyone can insert)
- Restrict viewing to admins only

## Database Schema

The waitlist table includes:
- `id` (UUID, primary key)
- `email` (TEXT, unique, required)
- `plan` (TEXT, required: 'basic', 'pro', or 'enterprise')
- `comments` (TEXT, optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Admin Access

### How Admins Access the System

1. **Login**: Admins can access the login page in two ways:
   - **Via Header Button**: Click "Login as Admin" button in the top-right corner of the homepage header
   - **Direct URL**: Navigate to `/auth` (e.g., `https://your-domain.com/auth`)
   - Use your admin email and password to sign in

2. **Admin Dashboard**: Once logged in, admins will see:
   - Regular dashboard access
   - An "Admin" section in the sidebar with a "Waitlist" link
   - Access to `/admin/waitlist` page to view all waitlist entries

3. **Waitlist Management Page** (`/admin/waitlist`):
   - View all waitlist entries
   - See email, plan selection, comments, and signup date
   - Export waitlist to CSV
   - Real-time updates

### Setting Up Admin Access

To make a user an admin, run this SQL in Supabase:

```sql
-- Set yourself as admin (replace with your email)
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-admin-email@example.com';
```

**Admin Requirements:**
- User must be authenticated (logged in)
- User must have `is_admin = true` in their profile, OR
- User email must match 'admin@unifr.com'

### Admin Features

- **Waitlist Viewing**: Only admins can see waitlist entries
- **CSV Export**: Download all waitlist entries as CSV
- **Full Dashboard Access**: Admins have full access to all features
- **Sidebar Link**: "Waitlist" appears in sidebar under "Admin" section (only visible to admins)

## Testing

1. Visit the homepage
2. Scroll to the waitlist section (or click any "Join Waitlist" button)
3. Fill out the form with:
   - Valid email address
   - Plan selection (Basic, Pro, or Enterprise)
   - Optional comments
4. Submit and verify success message appears
5. Check Supabase dashboard to see the entry in the `waitlist` table

## Notes

- The website is now in "launching soon" mode
- Login/auth pages still exist but are not linked from public pages
- Admin users can still access the dashboard via direct URL
- All public CTAs now point to the waitlist form

