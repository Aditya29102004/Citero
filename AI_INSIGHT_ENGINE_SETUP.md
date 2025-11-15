# AI Insight Engine Setup Guide

## Overview

The AI Insight Engine automatically runs after every GEO Scan and generates comprehensive, analyst-level insights about your brand's AI visibility.

## What It Does

After each scan completes, the engine automatically:

1. **Perception Summary** - Analyzes how AI models perceive your brand
2. **Deep Insights** - Provides strategic interpretation and competitive analysis
3. **Strengths & Gaps** - Identifies specific strengths and visibility gaps
4. **Actionable Recommendations** - Suggests prioritized next steps
5. **Content Ideas** - Proposes content/PR campaigns to improve visibility
6. **Week-over-Week Change** - Compares with previous scans

## Setup Steps

### Step 1: Run Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `supabase_migration_ai_insights.sql`
3. Click **Run**

This adds 6 new JSONB columns to the `scans` table:
- `ai_perception_summary`
- `deep_insight_analysis`
- `strengths_and_gaps`
- `actionable_recommendations`
- `content_ideas`
- `week_over_week_change`

### Step 2: Redeploy Edge Function

1. Copy the updated code from `supabase/functions/run-geo-scan/index.ts`
2. Go to **Supabase Dashboard** → **Edge Functions** → `run-geo-scan`
3. Paste the code and **Deploy**

The function now automatically generates all insights after each scan completes.

### Step 3: Verify It's Working

1. Run a new GEO Scan
2. Wait for it to complete (takes a bit longer now due to insight generation)
3. Check the dashboard - you should see all 6 insight sections

## Dashboard Sections

### 1. AI Perception Summary
- Visibility Tier (Tier 1/2/3)
- Tone (positive/neutral/negative)
- Visibility Score
- Key perception drivers

### 2. Deep Insight Analysis
- Strategic interpretation
- Competitive gap analysis
- Narrative gap identification
- Visibility levers (fast wins)

### 3. Key Strengths & Visibility Gaps
- Data-based strengths
- Specific visibility gaps
- Opportunity topics

### 4. What To Do Next
- 5 prioritized action items
- Priority levels (Urgent/Moderate/Low)
- Focus areas (Content/PR/SEO/Positioning)

### 5. Suggested Content Topics
- 3-5 content/PR campaign ideas
- Impact assessment
- Topics they improve

### 6. This Week's Change
- Comparison with previous scan
- Gained/lost topics
- Competitor shifts
- Main cause of changes

## How It Works

1. **After Scan Completes**: The engine automatically runs all 6 analysis steps
2. **Uses Same AI Provider**: Uses the same provider (ChatGPT/Gemini) you selected for the scan
3. **Saves to Database**: All insights are saved in the `scans` table
4. **Displays Instantly**: Dashboard updates automatically when scan completes

## Performance

- **Additional Time**: Adds ~30-60 seconds to scan completion (6 AI calls)
- **Automatic**: No manual steps required
- **Intelligent**: Compares with previous scans automatically

## Troubleshooting

### Insights Not Showing

1. **Check Migration**: Make sure you ran `supabase_migration_ai_insights.sql`
2. **Check Function**: Verify the Edge Function was redeployed
3. **Check Logs**: Look for "AI Insight Engine" messages in Edge Function logs
4. **Run New Scan**: Insights only generate for new scans after migration

### Missing Previous Scan Comparison

- First scan won't have week-over-week comparison
- Second scan will compare with the first
- Each subsequent scan compares with the most recent completed scan

## Next Steps

- ✅ Run the migration
- ✅ Redeploy the function
- ✅ Run a new scan
- ✅ View insights in dashboard

The engine is now fully automated and will generate insights after every scan!

