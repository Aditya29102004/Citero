-- Migration: Add AI Insight Engine fields to scans table
-- This adds comprehensive analysis fields for the AI Insight Engine

ALTER TABLE public.scans
ADD COLUMN IF NOT EXISTS ai_perception_summary JSONB,
ADD COLUMN IF NOT EXISTS deep_insight_analysis JSONB,
ADD COLUMN IF NOT EXISTS strengths_and_gaps JSONB,
ADD COLUMN IF NOT EXISTS actionable_recommendations JSONB,
ADD COLUMN IF NOT EXISTS content_ideas JSONB,
ADD COLUMN IF NOT EXISTS week_over_week_change JSONB;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_ai_perception ON public.scans USING gin (ai_perception_summary);
CREATE INDEX IF NOT EXISTS idx_scans_insights ON public.scans USING gin (deep_insight_analysis);

-- Add comment for documentation
COMMENT ON COLUMN public.scans.ai_perception_summary IS 'Step 1: Perception summary with visibility tier, score, tone, and drivers';
COMMENT ON COLUMN public.scans.deep_insight_analysis IS 'Step 2: Strategic interpretation, competitive gaps, narrative gaps, visibility levers';
COMMENT ON COLUMN public.scans.strengths_and_gaps IS 'Step 3: Data-based strengths, gaps, and opportunity topics';
COMMENT ON COLUMN public.scans.actionable_recommendations IS 'Step 4: Prioritized action items with focus areas';
COMMENT ON COLUMN public.scans.content_ideas IS 'Step 5: Content/PR campaign suggestions';
COMMENT ON COLUMN public.scans.week_over_week_change IS 'Step 6: Comparison with previous scan showing changes';

