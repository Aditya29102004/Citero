-- Add question category to scan_responses
ALTER TABLE scan_responses 
ADD COLUMN question_category text;

-- Add meta-analysis fields to scans table
ALTER TABLE scans
ADD COLUMN strengths text[] DEFAULT ARRAY[]::text[],
ADD COLUMN weaknesses text[] DEFAULT ARRAY[]::text[],
ADD COLUMN recommendations text[] DEFAULT ARRAY[]::text[];