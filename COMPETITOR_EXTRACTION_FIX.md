# Competitor Extraction System - Fixed

## Summary

Fixed the competitor extraction system to prevent random words like "for", "its", "they", "this", "recently", "startup", "founders", "however" from being stored as competitors.

## Changes Made

### 1. Updated `generate-competitors` Edge Function
**File:** `supabase/functions/generate-competitors/index.ts`

**Changes:**
- ✅ Updated prompt to enforce strict JSON array output with only brand names
- ✅ Added comprehensive competitor cleaning function with stopword filtering
- ✅ Added validation pipeline that filters out:
  - Words < 3 characters
  - Numbers only
  - Stopwords (for, its, they, this, these, some, other, recently, however, etc.)
  - Punctuation except hyphens
  - All lowercase stopwords
- ✅ Added fallback to predefined competitor list if LLM returns garbage
- ✅ Added retry logic with multiple providers
- ✅ Proper capitalization (e.g., "angellist" → "AngelList")

### 2. Updated `runSimulation.ts` Competitor Extraction
**File:** `src/lib/prompts/runSimulation.ts`

**Changes:**
- ✅ Replaced regex-based extraction that was capturing random words
- ✅ Added strict validation using same stopword list
- ✅ Only extracts capitalized proper nouns that look like brand names
- ✅ Filters out common non-brand words
- ✅ Limits to 10 competitors and cleans them properly

### 3. Created Shared Utility (for future use)
**File:** `supabase/functions/_shared/cleanCompetitors.ts`

**Purpose:**
- Centralized competitor cleaning logic
- Can be imported by other edge functions
- Includes validation and fallback functions

## Stopword List

The following words are now filtered out:
```
for, this, that, the, its, it's, their, they, them, these, those,
other, some, while, recently, however, october, november, december,
january, february, march, april, may, june, july, august, september,
india, know, your, brand, platforms, startup, startups, founders,
companies, ecosystem, also, including, such, like, similar, alternatives,
competitors, competitor, and, or, but, with, from, into, onto, upon
```

## Validation Rules

1. **Length Check:** Must be ≥ 3 characters
2. **Numbers Only:** Rejected if contains only digits
3. **Stopword Filter:** Rejected if in stopword list
4. **Punctuation:** Rejected if contains punctuation except hyphens and spaces
5. **Case Check:** All lowercase stopwords are rejected
6. **Single Word:** Single words < 4 characters are rejected
7. **Deduplication:** Case-insensitive deduplication
8. **Limit:** Maximum 10 competitors

## Fallback Competitors

If LLM returns invalid data, system uses:
```json
[
  "AngelList",
  "Startup India",
  "YourStory",
  "LetsVenture",
  "F6S"
]
```

## Database Format

Competitors are stored in `competitor_scores` as:
```json
{
  "AngelList": {
    "visibility": 28.5,
    "mentions": 12
  },
  "Startup India": {
    "visibility": 20.1,
    "mentions": 5
  }
}
```

**Important:** Only cleaned competitor names are used as keys. No raw words or tokens.

## Testing

### Test Case 1: Valid Competitors
**Input:** "Networking platform for early-stage founders"
**Expected:** `["AngelList", "Founders Network", "Startup Grind"]`
**Status:** ✅ Should pass validation

### Test Case 2: Garbage Input
**Input:** `["for","this","startup","founders","india"]`
**Expected:** `[]` → Fallback triggered
**Status:** ✅ Should be filtered out

### Test Case 3: Mixed Garbage
**Input:** `["AngelList","Some","India","These","Zomato"]`
**Expected:** `["AngelList","Zomato"]`
**Status:** ✅ Should clean to valid brands only

## Next Steps

1. **Deploy Edge Function:** Deploy updated `generate-competitors` function to Supabase
2. **Test:** Run a GEO scan and verify competitors are clean
3. **Monitor:** Check dashboard competitor chart - should only show real brand names
4. **Update run-geo-scan:** When restoring run-geo-scan function, ensure it uses cleaned competitors when building `competitor_scores`

## Notes

- The Dashboard already has competitor filtering logic that will work with cleaned data
- The `cleanCompetitors` function can be reused in other parts of the codebase
- Fallback ensures dashboard never shows empty competitor list

