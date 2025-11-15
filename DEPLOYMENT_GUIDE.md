# Deployment Guide - Fixing Errors

## Issues Fixed
✅ Updated CORS headers in Edge Functions to include proper methods and status codes

## Step 1: Fix Authentication Settings (400 Error)

The 400 error on `/auth/v1/token` is likely due to email confirmation requirements.

### In Supabase Dashboard:
1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, find **"Confirm email"**
3. **Disable** "Confirm email" (toggle it off) for development
   - This allows users to sign in immediately without email confirmation
4. Save changes

**Note:** For production, you should keep email confirmation enabled and set up proper email templates.

---

## Step 2: Deploy Edge Functions

Your Edge Functions need to be deployed to Supabase. You have two options:

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref fakhmxfxnszmvxihpann
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy run-geo-scan
   supabase functions deploy refresh-mentions
   ```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in your Supabase Dashboard
2. Click **"Create a new function"**
3. For each function (`run-geo-scan` and `refresh-mentions`):
   - Name: `run-geo-scan` (or `refresh-mentions`)
   - Copy the entire contents of `supabase/functions/[function-name]/index.ts`
   - Paste into the editor
   - Click **Deploy**

---

## Step 3: Set Edge Function Secrets

Edge Functions need environment variables. Set them in Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

   ```
   SUPABASE_URL=https://fakhmxfxnszmvxihpann.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   OPENAI_API_KEY=your_openai_api_key_here (required for ChatGPT option)
   GEMINI_API_KEY=your_gemini_api_key_here (required for Gemini option)
   ```

   **To get your keys:**
   - **service_role key**: Go to **Project Settings** → **API** → Find **"service_role"** key (⚠️ Keep this secret!)
   - **OpenAI API key**: Go to https://platform.openai.com/api-keys → Create new secret key
   - **Gemini API key**: Go to https://makersuite.google.com/app/apikey → Create new API key

---

## Step 4: Verify Setup

### Test Authentication:
1. Restart your dev server: `npm run dev`
2. Try signing up with a new account
3. You should be able to log in immediately (if email confirmation is disabled)

### Test Edge Functions:
1. After deploying functions and setting secrets
2. Try using the GEO scan feature in your app
3. Check the browser console for any remaining errors

---

## Troubleshooting

### Still getting CORS errors?
- Make sure functions are deployed (not just saved locally)
- Check that the function URL matches: `https://fakhmxfxnszmvxihpann.supabase.co/functions/v1/[function-name]`
- Verify secrets are set correctly

### Still getting 400 auth errors?
- Check Supabase Dashboard → Authentication → Users
- Verify the user exists
- Check Authentication → Settings for any restrictions
- Try creating a new user account

### Functions not working?
- Check Edge Functions logs in Supabase Dashboard
- Verify all secrets are set correctly
- Make sure the function code matches what's in your local files

---

## Quick Checklist

- [ ] Disabled email confirmation in Auth settings
- [ ] Deployed `run-geo-scan` function
- [ ] Deployed `refresh-mentions` function
- [ ] Set `SUPABASE_URL` secret
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` secret
- [ ] Set `OPENAI_API_KEY` secret (for ChatGPT option - get from https://platform.openai.com/api-keys)
- [ ] Set `GEMINI_API_KEY` secret (for Gemini option - get from https://makersuite.google.com/app/apikey)
- [ ] Run database migration to add AI provider field (see `supabase_migration_ai_provider.sql`)
- [ ] Restarted dev server
- [ ] Tested authentication
- [ ] Tested Edge Functions

