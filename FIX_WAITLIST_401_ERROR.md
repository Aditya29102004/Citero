# Fix Waitlist 401 Error

## The Problem
The waitlist form is trying to fetch the count anonymously, but RLS (Row Level Security) only allows admins to SELECT from the waitlist table.

## Solution

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Allow anonymous users to get waitlist count
CREATE POLICY "Allow anonymous waitlist count"
  ON public.waitlist
  FOR SELECT
  TO anon
  USING (true);
```

## What This Does

- ✅ Allows anonymous users (not logged in) to SELECT from waitlist table
- ✅ This enables the waitlist form to show the count
- ✅ Anonymous users can only READ (SELECT), not INSERT/UPDATE/DELETE
- ✅ The INSERT policy already exists, so signups still work
- ✅ Admin-only full access policy remains unchanged

## Alternative: If You Want More Restriction

If you want to restrict anonymous users to only count queries (not full SELECT), you could create a function:

```sql
-- Create a function that returns only the count
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM public.waitlist;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
```

But the simpler solution above (allowing SELECT to anon) is fine for a waitlist count display.

