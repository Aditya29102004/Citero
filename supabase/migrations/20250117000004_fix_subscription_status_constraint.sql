-- Fix subscription status constraint to allow 'pending' status
-- This ensures subscriptions can be created with pending status

-- Drop the old constraint if it exists
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add new constraint that includes 'pending' and other statuses
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'past_due', 'halted'));

-- Ensure all required columns exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS seats_allowed INTEGER DEFAULT 1;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_founder ON public.subscriptions(is_founder);

-- Migrate data
UPDATE public.subscriptions 
SET subscription_id = razorpay_subscription_id 
WHERE subscription_id IS NULL AND razorpay_subscription_id IS NOT NULL;

UPDATE public.subscriptions 
SET seats_allowed = CASE 
  WHEN plan_type = 'pro' OR plan_type = 'enterprise' THEN 5 
  ELSE 1 
END
WHERE seats_allowed IS NULL OR seats_allowed = 0;

