-- Ensure all required columns exist in subscriptions table
-- This migration ensures compatibility even if previous migrations weren't run

-- Add subscription_id column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Add is_founder column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;

-- Add seats_allowed column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS seats_allowed INTEGER DEFAULT 1;

-- Add plan_id column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Add metadata column if it doesn't exist
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_founder ON public.subscriptions(is_founder);

-- Migrate data from razorpay_subscription_id to subscription_id if needed
UPDATE public.subscriptions 
SET subscription_id = razorpay_subscription_id 
WHERE subscription_id IS NULL AND razorpay_subscription_id IS NOT NULL;

-- Update seats_allowed based on plan_type if not set
UPDATE public.subscriptions 
SET seats_allowed = CASE 
  WHEN plan_type = 'pro' THEN 5 
  ELSE 1 
END
WHERE seats_allowed IS NULL OR seats_allowed = 0;

