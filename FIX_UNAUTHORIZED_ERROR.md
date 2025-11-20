# Fix Unauthorized Error in Edge Functions

## The Problem

The `create-subscription` Edge Function was throwing "Unauthorized" error because it wasn't correctly extracting and using the authentication token.

## The Fix

Changed the authentication pattern to match other working Edge Functions:

**Before:**
```typescript
const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: { headers: { Authorization: authHeader } }
});
await supabaseClient.auth.getUser(); // This doesn't work correctly
```

**After:**
```typescript
const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const token = authHeader.replace(/^Bearer\s+/i, "");
await supabaseClient.auth.getUser(token); // Pass token directly
```

## What Changed

1. **Removed global headers** - Not needed when passing token directly
2. **Extract token** - Remove "Bearer " prefix from Authorization header
3. **Pass token to getUser()** - This is the correct way to authenticate

## Next Steps

1. **Redeploy the Edge Function:**
   - Go to Supabase Dashboard → Edge Functions → `create-subscription`
   - Click "Redeploy" or update the code with the fixed version

2. **Test again:**
   - Try subscribing to a plan
   - The "Unauthorized" error should be gone

## Files Updated

- ✅ `supabase/functions/create-subscription/index.ts`
- ✅ `supabase/functions/subscription-success/index.ts`

Both functions now use the correct authentication pattern.

