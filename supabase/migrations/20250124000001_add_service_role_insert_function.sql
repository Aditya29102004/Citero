-- Create a function to insert scan results that bypasses RLS
-- This allows the edge function (using service role) to insert results
CREATE OR REPLACE FUNCTION insert_ai_scan_result(
  p_brand_id UUID,
  p_scan_number INTEGER,
  p_visibility_score FLOAT8,
  p_citation_share FLOAT8,
  p_sentiment_positive INTEGER,
  p_sentiment_neutral INTEGER,
  p_sentiment_negative INTEGER,
  p_competitor_scores JSONB,
  p_citation_sources JSONB,
  p_platform TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.ai_scan_results (
    brand_id,
    scan_number,
    visibility_score,
    citation_share,
    sentiment_positive,
    sentiment_neutral,
    sentiment_negative,
    competitor_scores,
    citation_sources,
    provider
  ) VALUES (
    p_brand_id,
    p_scan_number,
    p_visibility_score,
    p_citation_share,
    p_sentiment_positive,
    p_sentiment_neutral,
    p_sentiment_negative,
    p_competitor_scores,
    p_citation_sources,
    p_platform
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO authenticated;
GRANT EXECUTE ON FUNCTION insert_ai_scan_result TO service_role;

