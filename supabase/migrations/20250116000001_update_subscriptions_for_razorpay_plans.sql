-- Update subscriptions table to support Razorpay subscription plans
-- Add new columns for subscription management

-- Add plan_id column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Add is_founder column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;

-- Add seats_allowed column
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS seats_allowed INTEGER DEFAULT 1;

-- Add metadata column for storing Razorpay subscription data
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update plan_type check constraint to include new plan types
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('basic', 'pro', 'enterprise'));

-- Update status check constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'past_due', 'halted'));

-- Add index on subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);

-- Add index on plan_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Add index on is_founder for founder circle queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_founder ON public.subscriptions(is_founder);

-- Update the unique index to allow multiple pending subscriptions
DROP INDEX IF EXISTS idx_subscriptions_user_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active 
  ON public.subscriptions(user_id) 
  WHERE status = 'active';

-- Add comment to table
COMMENT ON COLUMN public.subscriptions.plan_id IS 'Razorpay plan ID (plan_xxxxx)';
COMMENT ON COLUMN public.subscriptions.is_founder IS 'Whether this is a founder circle subscription';
COMMENT ON COLUMN public.subscriptions.seats_allowed IS 'Number of seats allowed for this subscription (Pro: 5, Basic: 1)';
COMMENT ON COLUMN public.subscriptions.metadata IS 'Additional Razorpay subscription metadata';

