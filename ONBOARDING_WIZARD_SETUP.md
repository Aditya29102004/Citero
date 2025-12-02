# Onboarding Wizard Setup Guide

## 🎯 Overview

The onboarding wizard guides new users through a 6-step process to set up their brand tracking:
1. **Website** - Enter and analyze website URL
2. **Description** - Review and refine AI-generated description
3. **Topics** - Select relevant categories
4. **Competitors** - Review and edit competitor list
5. **Analysis** - Generate brand analysis with loading animation
6. **Complete** - Save everything and redirect to dashboard

## 📁 Files Created

### Frontend Pages
- `src/pages/onboarding/Website.tsx` - Website URL input
- `src/pages/onboarding/Description.tsx` - Description refinement
- `src/pages/onboarding/Topics.tsx` - Topic selection
- `src/pages/onboarding/Competitors.tsx` - Competitor management
- `src/pages/onboarding/Analysis.tsx` - Analysis with loading steps
- `src/pages/onboarding/Complete.tsx` - Completion and save

### Components
- `src/components/OnboardingStepper.tsx` - Sidebar stepper with progress
- `src/components/WritingLoader.tsx` - Typing animation loader

### State Management
- `src/lib/onboardingState.ts` - LocalStorage-based state management

### Edge Functions
- `supabase/functions/scrape-url/index.ts` - Website scraping and AI analysis
- `supabase/functions/generate-topics/index.ts` - AI topic generation
- `supabase/functions/generate-competitors/index.ts` - AI competitor generation
- `supabase/functions/save-onboarding/index.ts` - Save brand to database

### Database Migration
- `supabase/migrations/20250118000000_add_onboarding_fields.sql` - Add onboarding fields

## 🔧 Setup Instructions

### 1. Environment Variables

Add to Supabase Dashboard → Edge Functions → Secrets:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=qwen/qwen-2.5-7b-instruct
```

Or set fallback model:
```bash
OPENROUTER_MODEL=groq/llama-3.1-8b-instant
```

### 2. Deploy Edge Functions

Deploy all Edge Functions to Supabase:

```bash
# Deploy scrape-url
supabase functions deploy scrape-url

# Deploy generate-topics
supabase functions deploy generate-topics

# Deploy generate-competitors
supabase functions deploy generate-competitors

# Deploy save-onboarding
supabase functions deploy save-onboarding
```

Or deploy via Supabase Dashboard:
1. Go to Edge Functions
2. Create/Edit each function
3. Copy-paste the code
4. Deploy

### 3. Run Database Migration

Run the migration to add onboarding fields:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS audience TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_brands_onboarding_completed ON public.brands(onboarding_completed);
```

### 4. Routes Added

Routes are automatically added to `src/App.tsx`:
- `/onboarding/website`
- `/onboarding/description`
- `/onboarding/topics`
- `/onboarding/competitors`
- `/onboarding/analysis`
- `/onboarding/complete`

## 🎨 Features

### Stepper Sidebar
- Shows all 6 steps
- Green checkmarks for completed steps
- Current step highlighted
- Clean, modern design matching Bear AI

### Writing Animation
- Typing effect for each loading step
- Smooth transitions
- Visual feedback with pulsing dots

### Error Handling
- Retry logic for failed API calls
- Fallback to Groq if Qwen rate limits
- Graceful degradation with default values
- User-friendly error messages

### State Management
- LocalStorage persistence
- Data persists across page refreshes
- Automatic cleanup on completion

### Navigation Guards
- Dashboard checks onboarding completion
- Redirects to onboarding if no brands exist
- Prevents skipping steps

## 🔄 Flow

1. **User logs in** → Dashboard checks onboarding
2. **No brands found** → Redirect to `/onboarding/website`
3. **User enters URL** → Calls `scrape-url` Edge Function
4. **AI analyzes** → Extracts summary, industry, audience, keywords
5. **User refines** → Edits description on Description page
6. **Topics generated** → Calls `generate-topics` Edge Function
7. **User selects** → Multi-select topic pills
8. **Competitors generated** → Calls `generate-competitors` Edge Function
9. **User edits** → Add/remove competitors
10. **Analysis runs** → Shows loading animation with steps
11. **Results shown** → Brand score, visibility potential, ranking
12. **Save to DB** → Calls `save-onboarding` Edge Function
13. **Redirect** → Goes to dashboard

## 🛠️ API Endpoints

### POST `/functions/v1/scrape-url`
**Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "summary": "...",
  "industry": "...",
  "audience": "...",
  "keywords": ["..."]
}
```

### POST `/functions/v1/generate-topics`
**Body:**
```json
{
  "brandSummary": "..."
}
```

**Response:**
```json
{
  "topics": ["Topic 1", "Topic 2", ...]
}
```

### POST `/functions/v1/generate-competitors`
**Body:**
```json
{
  "brandSummary": "..."
}
```

**Response:**
```json
{
  "competitors": [
    { "name": "...", "url": "..." }
  ]
}
```

### POST `/functions/v1/save-onboarding`
**Body:**
```json
{
  "websiteUrl": "...",
  "summary": "...",
  "industry": "...",
  "audience": "...",
  "topics": ["..."],
  "competitors": [{ "name": "...", "url": "..." }]
}
```

**Response:**
```json
{
  "success": true,
  "brandId": "...",
  "message": "Brand created successfully"
}
```

## 🎯 Testing

1. **Test Website Scraping:**
   - Enter a valid website URL
   - Verify AI extracts summary, industry, audience
   - Check error handling for invalid URLs

2. **Test Topic Generation:**
   - Verify AI generates 12 relevant topics
   - Test multi-select functionality
   - Ensure at least one topic must be selected

3. **Test Competitor Generation:**
   - Verify AI generates competitor list
   - Test add/remove functionality
   - Verify URL validation

4. **Test Analysis:**
   - Verify loading animation works
   - Check all steps display correctly
   - Verify results cards show

5. **Test Save:**
   - Verify brand is created in database
   - Check all fields are saved correctly
   - Verify redirect to dashboard

## 🐛 Troubleshooting

### OpenRouter Rate Limits
- Function automatically falls back to Groq model
- Check Edge Function logs for rate limit errors
- Consider upgrading OpenRouter plan

### Website Scraping Fails
- Check CORS headers on target website
- Verify URL is accessible
- Check Edge Function logs

### Database Errors
- Ensure migration has been run
- Check RLS policies allow inserts
- Verify user is authenticated

### Navigation Issues
- Clear localStorage if stuck
- Check browser console for errors
- Verify routes are registered in App.tsx

## 📝 Notes

- Onboarding data is stored in localStorage during the flow
- Data is cleared after successful save
- Users can navigate back/forward through steps
- Progress is preserved if user refreshes page
- Dashboard automatically redirects if onboarding incomplete

