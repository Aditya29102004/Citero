-- Add 'cancelled' status to scans table
ALTER TABLE public.scans
DROP CONSTRAINT IF EXISTS scans_status_check;

ALTER TABLE public.scans
ADD CONSTRAINT scans_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
