# Understanding "Shutdown" in Edge Function Logs

## What "Shutdown" Means

When you see "shutdown" in the Edge Function logs, it means:
- ✅ The function has **returned a response** to the client
- ✅ The function execution context is being cleaned up
- ⚠️ **BUT** - Background tasks should continue running

## Is This a Problem?

**Usually NO** - The "shutdown" message is normal. It just means:
1. Your function received the request
2. It created the scan record
3. It returned a success response
4. The execution context logged "shutdown"

The background processing (`processQuestions()`) should continue running even after shutdown.

## How to Verify It's Working

1. **Check the scan status in your database:**
   - Go to Supabase Dashboard → Table Editor → `scans` table
   - Look for your scan
   - Check if `completed_questions` is increasing
   - Check if `status` changes from 'running' to 'completed'

2. **Check for more logs after shutdown:**
   - Look for logs like:
     - "Starting background processing for scan: ..."
     - "Processing question 1/15: ..."
     - "Question 1 completed..."
   - These should appear AFTER the shutdown message

3. **Wait a few minutes:**
   - The scan takes time (15 questions × ~2-3 seconds each = 30-45 seconds minimum)
   - Check back in 1-2 minutes

## If Background Processing IS Stopping

If you see "shutdown" but the scan never completes:

1. **Check for errors before shutdown:**
   - Look for error messages in the logs
   - Common issues:
     - API key missing
     - API errors (401, 404, 429)
     - Database permission errors

2. **Check execution timeout:**
   - Supabase Edge Functions have execution limits
   - Free tier: ~60 seconds
   - If processing takes longer, it might timeout

3. **Solution:** The function is designed to process in the background. If it's being killed, check:
   - Edge Function logs for errors
   - API key configuration
   - Database permissions

## Normal Flow

1. Request comes in → Function starts
2. Scan record created → Status: 'running'
3. Response returned → "shutdown" logged
4. Background processing continues → Questions processed
5. Scan updated → Status: 'completed'

The "shutdown" is step 3 - it's normal! The processing continues in the background.

## Quick Check

After running a scan:
1. Wait 1-2 minutes
2. Check your dashboard - does the scan show progress?
3. Check the `scans` table - is `completed_questions` increasing?
4. If yes → Everything is working! ✅
5. If no → Check logs for errors before the shutdown message

