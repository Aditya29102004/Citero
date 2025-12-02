# Competitor Analysis System - Complete Rebuild

## Overview

This document outlines the complete rebuild of the competitor analysis system to ensure stable, accurate, and meaningful competitor visibility, ranking, and trend analysis.

## Key Components

### 1. Database Schema

#### `brands` table additions:
- `primary_competitors` (TEXT[]) - Competitors added during onboarding
- `competitors` (JSONB) - Legacy field (still supported)

#### `competitor_visibility_history` table:
- Tracks historical visibility scores per competitor per scan
- Enables trend analysis
- Stores sentiment-weighted scores

#### `ai_scan_results` table:
- `competitor_scores` (JSONB) - Format: `{ "CompetitorName": { "visibility": 45.2, "mentions": 12 } }`

### 2. Competitor Extraction Flow

#### Step 1: Get Initial Competitors
```typescript
// From brands.primary_competitors (onboarding)
// OR from brands.competitors (legacy)
const initialCompetitors = brand.primary_competitors || extractFromCompetitors(brand.competitors);
```

#### Step 2: AI Extraction
- Call `generate-competitors` edge function with improved prompt
- Extract competitors from AI responses using regex matching
- Clean and validate all competitor names

#### Step 3: Merge
```typescript
const finalCompetitors = mergeCompetitors(initialCompetitors, aiExtractedCompetitors);
```

### 3. Visibility Calculation

```typescript
visibilityScore = (mentionsOfCompetitor / totalMentionsAcrossAllCompetitors) * 100
```

Where:
- `mentionsOfCompetitor` = count of responses containing competitor name (regex match)
- `totalMentionsAcrossAllCompetitors` = sum of all competitor mentions

### 4. Citation Share Calculation

```typescript
citationShare = (competitorMentions / totalMentionsInResponses) * 100
```

Where:
- `competitorMentions` = explicit mentions of competitor in responses
- `totalMentionsInResponses` = total number of scan responses

### 5. Sentiment-Weighted Score

```typescript
sentimentWeighted = ((positiveMentions * 1 + neutralMentions * 0.5 + negativeMentions * -1) / total) + 1) * 50
```

Normalized to 0-100 scale.

### 6. Ranking Logic

Sort by:
1. `visibilityScore` DESC
2. `citationShare` DESC  
3. `sentimentWeighted` DESC
4. `name` (alphabetical) - tie-breaker to ensure no ties

Assign rank = index + 1

### 7. Trend Calculation

```typescript
trend = currentVisibility - previousVisibility
- diff > 2% → 'rising'
- diff < -2% → 'falling'
- else → 'stable'
```

### 8. Nonsense Competitor Filtering

Remove competitors with:
- No mentions after 3+ scans
- Sentiment weighted score < -20
- Visibility < 1% for 5+ scans
- Name length < 3 characters

## Implementation Files

### Frontend:
- `src/lib/utils/competitorAnalysis.ts` - Core utilities
- `src/pages/Competitors.tsx` - Competitors page (updated)
- `src/pages/Dashboard.tsx` - Dashboard competitor chart (updated)

### Backend (Edge Functions):
- `supabase/functions/generate-competitors/index.ts` - Improved prompt
- `supabase/functions/run-geo-scan/index.ts` - Needs update to:
  - Extract competitors from responses using regex
  - Calculate visibility/citation share correctly
  - Store in competitor_visibility_history
  - Merge initial + AI-extracted competitors

### Database Migrations:
- `supabase/migrations/20250126000000_add_primary_competitors_to_brands.sql`
- `supabase/migrations/20250126000001_create_competitor_visibility_history.sql`

## Next Steps

1. ✅ Created competitor analysis utilities
2. ✅ Updated Competitors page
3. ✅ Updated Dashboard to merge initial competitors
4. ⏳ Update run-geo-scan edge function to:
   - Extract competitors using regex matching
   - Calculate metrics correctly
   - Store in competitor_visibility_history
   - Merge initial + AI competitors
5. ⏳ Update prompt generation for GEO scans
6. ⏳ Test end-to-end flow

