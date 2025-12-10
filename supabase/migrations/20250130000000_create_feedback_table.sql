-- Create feedback table to store user feedback and suggestions
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'suggestion',
    'feature-request',
    'bug-report',
    'improvement',
    'other'
  )),
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'archived'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_feedback_type ON public.feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON public.feedback(user_email);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback
-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true); -- Allow anyone to submit feedback (even anonymous users)

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all feedback (you'll need to set up admin role separately)
-- For now, we'll allow service role to access all feedback via service key

-- Add comment for documentation
COMMENT ON TABLE public.feedback IS 'Stores user feedback, suggestions, bug reports, and feature requests';
COMMENT ON COLUMN public.feedback.feedback_type IS 'Type of feedback: suggestion, feature-request, bug-report, improvement, or other';
COMMENT ON COLUMN public.feedback.status IS 'Status of feedback: new, reviewed, resolved, or archived';
COMMENT ON COLUMN public.feedback.user_id IS 'User ID if logged in, null for anonymous feedback';
COMMENT ON COLUMN public.feedback.user_email IS 'User email if available (for anonymous users or logged in users)';

