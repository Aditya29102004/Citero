-- Add primary_competitors field to brands table for onboarding competitors
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS primary_competitors TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brands_primary_competitors ON public.brands USING gin(primary_competitors);

-- Migrate existing competitors to primary_competitors if they exist
-- Extract competitor names from JSONB competitors field
UPDATE public.brands
SET primary_competitors = (
  SELECT ARRAY_AGG(DISTINCT competitor_text)
  FROM LATERAL jsonb_array_elements_text(competitors) as competitor_text
  WHERE competitor_text IS NOT NULL 
    AND competitor_text != 'null' 
    AND competitor_text != ''
    AND trim(competitor_text) != ''
)
WHERE competitors IS NOT NULL 
  AND jsonb_typeof(competitors) = 'array'
  AND jsonb_array_length(competitors) > 0;

