-- ============================================
-- Database Verification Script
-- Run this after running supabase_setup.sql
-- ============================================

-- Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores') 
    THEN '✓ Found'
    ELSE '✗ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
ORDER BY tablename;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
GROUP BY tablename
ORDER BY tablename;

-- Check indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
ORDER BY tablename, indexname;

-- Check trigger exists
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created';

-- Check function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Summary
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
UNION ALL
SELECT 
  'Policies' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
UNION ALL
SELECT 
  'Indexes' as check_type,
  COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'brands', 'mentions', 'scans', 'scan_responses', 'brand_visibility_scores')
UNION ALL
SELECT 
  'Triggers' as check_type,
  COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created'
UNION ALL
SELECT 
  'Functions' as check_type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

