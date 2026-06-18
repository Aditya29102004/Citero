-- Add ai_provider to scans table
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'openai';

-- Create atomic scan number generator
CREATE OR REPLACE FUNCTION get_next_scan_number(p_brand_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_num INTEGER;
BEGIN
  -- Lock the brand row to prevent concurrent scan_number generation for the same brand
  PERFORM 1 FROM public.brands WHERE id = p_brand_id FOR UPDATE;

  -- Get the next scan number
  SELECT COALESCE(MAX(scan_number), 0) + 1 INTO v_next_num
  FROM public.ai_scan_results
  WHERE brand_id = p_brand_id;

  RETURN v_next_num;
END;
$$;

-- Grant execute on get_next_scan_number
GRANT EXECUTE ON FUNCTION get_next_scan_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_scan_number TO service_role;

-- Create atomic queue fetcher
CREATE OR REPLACE FUNCTION process_next_scan()
RETURNS TABLE (
  scan_id UUID,
  brand_id UUID,
  user_id UUID,
  ai_provider TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_id UUID;
BEGIN
  -- Select and lock one pending scan
  SELECT s.id INTO v_scan_id
  FROM public.scans s
  WHERE s.status = 'pending'
  ORDER BY s.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If a scan was found, update its status to 'running'
  IF v_scan_id IS NOT NULL THEN
    UPDATE public.scans
    SET status = 'running', started_at = clock_timestamp()
    WHERE scans.id = v_scan_id;

    RETURN QUERY
    SELECT s.id AS scan_id, s.brand_id, s.user_id, COALESCE(s.ai_provider, 'openai')::TEXT
    FROM public.scans s
    WHERE s.id = v_scan_id;
  END IF;
END;
$$;

-- Grant execute on process_next_scan
GRANT EXECUTE ON FUNCTION process_next_scan TO authenticated;
GRANT EXECUTE ON FUNCTION process_next_scan TO service_role;
