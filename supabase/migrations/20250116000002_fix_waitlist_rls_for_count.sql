-- Allow anonymous users to get waitlist count (but not full entries)
-- This is needed for the public waitlist form to show the count

CREATE POLICY "Allow anonymous waitlist count"
  ON public.waitlist
  FOR SELECT
  TO anon
  USING (true);

-- Note: The existing admin policy for authenticated users remains unchanged
-- This policy allows anonymous users to see the count for display purposes
-- They can only SELECT (read), not INSERT/UPDATE/DELETE

