# Google OAuth and Email Verification Setup Guide

## Overview
This guide will help you set up Google OAuth login and email verification for your Supabase project.

## Step 1: Enable Google OAuth in Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: **Authentication** → **Providers**
4. **Find "Google"** in the list and click on it
5. **Enable Google Provider**:
   - Toggle the "Enable Google provider" switch to ON
   - You'll need to configure Google OAuth credentials (see Step 2)

## Step 2: Create Google OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** (or select existing):
   - Click on project dropdown at the top
   - Click "New Project"
   - Enter project name (e.g., "citero-auth")
   - Click "Create"

3. **Enable Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click on it and click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - If prompted, configure OAuth consent screen first:
     - User Type: **External** (unless you have Google Workspace)
     - App name: **citero**
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Scopes: Add `email`, `profile`, `openid`
     - Click "Save and Continue"
     - Test users: Add your email (for testing)
     - Click "Save and Continue"
   
5. **Create OAuth Client**:
   - Application type: **Web application**
   - Name: **citero Web Client**
   - **Authorized JavaScript origins**:
     ```
     https://YOUR_PROJECT_REF.supabase.co
     http://localhost:5173 (for local development)
     ```
   - **Authorized redirect URIs**:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     http://localhost:5173/auth/v1/callback (for local development)
     ```
   - Click **"Create"**
   - **Copy the Client ID and Client Secret**

## Step 3: Configure Google OAuth in Supabase

1. **Back in Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. **Enter your credentials**:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
3. **Click "Save"**

## Step 4: Enable Email Verification

1. **In Supabase Dashboard** → **Authentication** → **Settings**
2. **Email Auth** section:
   - ✅ **Enable email confirmations**: Toggle ON
   - **Email confirmation method**: Select "Email Link"
   - **Email template**: Customize if needed (optional)
3. **Site URL**: Set to your production URL (e.g., `https://yourdomain.com`)
4. **Redirect URLs**: Add your allowed redirect URLs:
   ```
   https://yourdomain.com/**
   http://localhost:5173/** (for local development)
   ```
5. **Click "Save"**

## Step 5: Configure Email Templates (Optional)

1. **In Supabase Dashboard** → **Authentication** → **Email Templates**
2. **Confirm signup** template:
   - Customize the email template if needed
   - Default template includes verification link
3. **Magic Link** template (if using magic links)
4. **Change Email Address** template

## Step 6: Test Google OAuth

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to** `/auth` page
3. **Click "Continue with Google"**
4. **You should be redirected to Google**:
   - Sign in with your Google account
   - Authorize the app
   - You'll be redirected back to your app

## Step 7: Test Email Verification

1. **Sign up with email/password**:
   - Go to `/auth` page
   - Click "Sign up"
   - Enter name, email, and password
   - Click "Sign Up"

2. **Check your email**:
   - You should receive a verification email
   - Click the verification link
   - You'll be redirected back to your app

3. **Verify the flow**:
   - After clicking the link, you should be logged in
   - The app should redirect to `/pricing` or `/dashboard`

## Important Notes

⚠️ **Production Setup**:
- Update Google OAuth redirect URIs with your production domain
- Update Supabase Site URL and Redirect URLs for production
- Ensure HTTPS is enabled in production

⚠️ **Email Verification**:
- Users must verify their email before they can fully use the app
- Unverified users will see a message prompting them to verify
- The app checks `user.email_confirmed_at` to verify email status

⚠️ **Google OAuth**:
- Google OAuth users are automatically verified (no email verification needed)
- Their profile information (name, email) is automatically synced from Google

## Troubleshooting

### Google OAuth not working:
- Check that redirect URIs match exactly in Google Cloud Console
- Verify Client ID and Secret are correct in Supabase
- Check browser console for errors
- Ensure Google+ API is enabled

### Email verification not sending:
- Check Supabase Dashboard → Authentication → Settings → Email Auth
- Verify SMTP settings (if using custom SMTP)
- Check spam folder
- Verify Site URL is set correctly

### Users can't log in after verification:
- Check that redirect URLs include your domain
- Verify email template includes correct redirect URL
- Check browser console for errors

## Security Best Practices

1. ✅ **Never expose** Google Client Secret in frontend code
2. ✅ **Use HTTPS** in production
3. ✅ **Validate redirect URLs** to prevent open redirects
4. ✅ **Enable email verification** for all email/password signups
5. ✅ **Monitor OAuth usage** in Google Cloud Console

