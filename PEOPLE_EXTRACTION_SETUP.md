# People Extraction System - Implementation Summary

## ✅ What's Been Implemented

### Layer 1 - Raw Scan Processor Integration
- ✅ Added people extraction call in the scan loop (`supabase/functions/run-geo-scan/index.ts`)
- ✅ Extracts people from each LLM response during scan processing
- ✅ Collects all extracted people before deduplication

### Layer 2 - People Extraction Function
- ✅ Created `extractPeopleFromLLMResponse()` function
- ✅ Uses Gemini API (via existing `callAI` wrapper)
- ✅ Handles JSON parsing with fallback logic
- ✅ Returns structured people data

### Layer 3 - LLM Prompt
- ✅ Created `PEOPLE_EXTRACTION_PROMPT` constant
- ✅ Follows strict extraction rules (no hallucination)
- ✅ Returns JSON format with name, role, company, relevance, snippet

### Layer 4 - Database Schema
⚠️ **ACTION REQUIRED**: Create the following table in Supabase:

```sql
CREATE TABLE ai_people_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  name text,
  role text,
  company text,
  relevance text,
  snippet text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_ai_people_mentions_brand_id ON ai_people_mentions(brand_id);
CREATE INDEX idx_ai_people_mentions_scan_id ON ai_people_mentions(scan_id);
CREATE INDEX idx_ai_people_mentions_created_at ON ai_people_mentions(created_at DESC);
```

### Layer 5 - Deduplication Logic
- ✅ Created `dedupePeople()` function
- ✅ Deduplicates by name-role-company combination
- ✅ Applied before database storage

### Layer 6 - Database Storage
- ✅ Stores deduplicated people in `ai_people_mentions` table
- ✅ Batch insertion (50 records per batch) to avoid payload limits
- ✅ Error handling and logging

### Layer 7 - UI Component
- ✅ Created `LeadsList` component (`src/components/LeadsList.tsx`)
- ✅ Displays people cards with name, role, company, relevance, snippet
- ✅ Shows mention count badges
- ✅ Loading and empty states
- ✅ Modern card design matching existing UI patterns

## 📋 Next Steps

1. **Create Database Table**: Run the SQL above in Supabase SQL Editor
2. **Add to Dashboard**: Import and use `<LeadsList brandId={brandId} />` in your dashboard
3. **Test**: Run a GEO scan and verify people are extracted and stored
4. **Optional**: Add filtering, sorting, or export functionality to LeadsList

## 🔄 How It Works

1. User runs GEO scan
2. For each question prompt:
   - LLM generates response
   - `extractPeopleFromLLMResponse()` extracts people from response
   - People are collected in `allExtractedPeople` array
3. After all questions processed:
   - `dedupePeople()` removes duplicates
   - Unique people are stored in `ai_people_mentions` table
4. Dashboard displays leads via `<LeadsList>` component

## 📝 Usage Example

```tsx
import { LeadsList } from "@/components/LeadsList";

// In your dashboard component:
<LeadsList brandId={selectedBrandId} limit={10} />
```

## 🎯 Features

- ✅ Automatic extraction during scans
- ✅ Deduplication by name-role-company
- ✅ Batch database storage
- ✅ Beautiful UI with cards
- ✅ Mention count tracking
- ✅ Loading and empty states
- ✅ Error handling

## 🔧 Configuration

The extraction uses Gemini API (via `callAI`). The model is automatically selected from available Gemini models (`gemini-2.0-flash` or `gemini-2.5-pro`).

To use a specific model, modify the `extractPeopleFromLLMResponse` function to call a dedicated Gemini endpoint with the desired model.

