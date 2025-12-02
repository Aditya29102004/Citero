-- Add subscription_id column if it doesn't exist
-- This is the Razorpay subscription ID (sub_xxxxx format)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);

-- Migrate data from razorpay_subscription_id to subscription_id if needed
UPDATE public.subscriptions 
SET subscription_id = razorpay_subscription_id 
WHERE subscription_id IS NULL AND razorpay_subscription_id IS NOT NULL;

