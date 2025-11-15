// Deno is available in Supabase Edge Functions runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// AI Provider API Keys
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// Question templates organized by dimension
const QUESTION_TEMPLATES = [
  // Awareness (Presence) - Checks if brand is known at all
  { category: 'awareness', template: "What are the most talked-about {product_type} helping {target_audience}?" },
  { category: 'awareness', template: "Which {product_type} platforms or brands are gaining attention in {industry}?" },
  { category: 'awareness', template: "What are the top brands in {industry} that people discuss online?" },
  
  // Reputation (Tone) - Measures trust and credibility
  { category: 'reputation', template: "Is {brand_name} considered reliable or effective?" },
  { category: 'reputation', template: "What do users say about the quality of {brand_name}?" },
  { category: 'reputation', template: "Is {brand_name} trusted by {target_audience}?" },
  
  // Differentiation (Positioning) - How AI distinguishes the brand
  { category: 'differentiation', template: "How is {brand_name} different from other {product_type} platforms?" },
  { category: 'differentiation', template: "What makes {brand_name} unique compared to competitors in {industry}?" },
  { category: 'differentiation', template: "What are the key differences between {brand_name} and its main competitors?" },
  
  // Authority (Thought leadership) - Perceived expertise
  { category: 'authority', template: "Which platforms are most trusted for {niche} advice and education?" },
  { category: 'authority', template: "What brands are considered experts in {industry}?" },
  { category: 'authority', template: "Which companies lead innovation and thought leadership in {industry}?" },
  
  // Momentum (Trend) - Growth perception
  { category: 'momentum', template: "Which new {product_type} platforms are gaining popularity among {target_audience}?" },
  { category: 'momentum', template: "What are the fastest-growing brands in {industry} right now?" },
  { category: 'momentum', template: "Which {product_type} companies are trending or getting more attention recently?" },
];

async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in Edge Function secrets');
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content: 'Answer briefly (2-3 sentences).',
          },
          { role: 'user', content: prompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || JSON.stringify(errorData);
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }
    console.error('OpenAI API error:', errorMessage);
    throw new Error(`OpenAI API failed: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return (typeof text === 'string' ? text : String(text)).trim();
}

async function callGemini(prompt: string, retryCount = 0, modelIndex = 0): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in Edge Function secrets');
  }

  // Use the working model: gemini-2.0-flash-exp (confirmed working)
  // Keep fallbacks in case the experimental model becomes unavailable
  // Note: gemini-1.0-pro is not available in v1beta, removed from fallbacks
  const attempts = [
    { version: 'v1beta', model: 'gemini-2.0-flash-exp' }, // Primary - confirmed working
    { version: 'v1beta', model: 'gemini-1.5-flash' },     // Fallback 1
    { version: 'v1beta', model: 'gemini-1.5-pro' },       // Fallback 2
  ];
  
  let lastError: Error | null = null;
  
  // Start from the specified model index (for retries, continue with the same model)
  for (let i = modelIndex; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: "Answer briefly (2-3 sentences). " + prompt
              }]
            }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 256,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        
        if (text && text.trim().length > 0) {
          return (typeof text === 'string' ? text : String(text)).trim();
        }
      } else {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        const errorData = errorText.includes('{') ? JSON.parse(errorText) : { message: errorText };
        
        // Handle 429 rate limit errors with retry
        if (response.status === 429) {
          // Check if it's a quota/billing issue (not just rate limiting)
          const errorMessage = (errorData.error?.message || errorData.message || errorText).toLowerCase();
          const isQuotaExceeded = errorMessage.includes('billing') || 
                                  errorMessage.includes('quota') || 
                                  errorMessage.includes('rate limit') && errorMessage.includes('increase');
          
          if (isQuotaExceeded) {
            // This is a quota/billing limit, not just temporary rate limiting
            throw new Error(`Gemini API quota exceeded. The free tier has been reached. Please set up billing at https://aistudio.google.com/app/apikey to increase limits, or switch to OpenAI/DeepSeek provider in settings.`);
          }
          
          const maxRetries = 5; // Increased retries
          if (retryCount < maxRetries) {
            // Exponential backoff with jitter: 10s, 20s, 40s, 80s, 160s (much longer for Gemini)
            const baseDelay = Math.pow(2, retryCount + 3) * 1000; // 10s, 20s, 40s, 80s, 160s
            const jitter = Math.random() * 5000; // Add up to 5s random jitter
            const delay = baseDelay + jitter;
            console.log(`Rate limited (429). Retrying in ${Math.round(delay/1000)}s... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Retry with the same model index
            return await callGemini(prompt, retryCount + 1, i);
          }
          // If we've exhausted retries for this model, try next model
          if (i < attempts.length - 1) {
            console.log(`Rate limit retries exhausted for ${attempt.model}, trying next model...`);
            // Add a longer delay before trying next model
            await new Promise(resolve => setTimeout(resolve, 10000));
            continue; // Try next model
          }
          throw new Error(`Gemini API rate limited (429). Please wait and try again later.`);
        }
        
        // Check for quota/billing errors in any error response (not just 429)
        const errorMessage = (errorData.error?.message || errorData.message || errorText).toLowerCase();
        const isQuotaExceeded = errorMessage.includes('billing') || 
                                errorMessage.includes('quota') || 
                                (errorMessage.includes('rate limit') && errorMessage.includes('increase')) ||
                                errorMessage.includes('resource exhausted');
        
        if (isQuotaExceeded || response.status === 403) {
          throw new Error(`Gemini API quota exceeded. The free tier has been reached. Please set up billing at https://aistudio.google.com/app/apikey to increase limits, or switch to OpenAI/DeepSeek provider in settings.`);
        }
        
        lastError = new Error(`Gemini API ${attempt.version}/${attempt.model}: ${response.status} - ${errorData.error?.message || errorData.message || errorText}`);
        
        // Only try next if this one failed with 404
        if (response.status === 404) {
          continue; // Try next model
        }
        // For other errors, throw immediately
        throw lastError;
      }
    } catch (error: any) {
      // If it's our thrown error, re-throw it
      if (error.message && error.message.includes('Gemini API')) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next attempt for network/parsing errors
    }
  }
  
  // If all failed, throw the last error
  if (lastError) {
    throw new Error(`Gemini API failed: ${lastError.message}`);
  }
  
  throw new Error('Gemini API: All attempts failed. Check your API key at https://aistudio.google.com/app/apikey');
}

async function callDeepSeek(prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not set in Edge Function secrets');
  }

  const response = await fetch(
    'https://api.deepseek.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.4,
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content: 'Answer briefly (2-3 sentences).',
          },
          { role: 'user', content: prompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || JSON.stringify(errorData);
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }
    console.error('DeepSeek API error:', errorMessage);
    throw new Error(`DeepSeek API failed: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return (typeof text === 'string' ? text : String(text)).trim();
}

async function callOpenRouter(prompt: string, retryCount = 0): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in Edge Function secrets');
  }

  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://unifr.com',
        'X-Title': 'Uni Brand Tracker',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-4b:free', // Free model - can be changed to paid models like 'openai/gpt-4o-mini'
        temperature: 0.4,
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content: 'Answer briefly (2-3 sentences).',
          },
          { role: 'user', content: prompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    let errorData: any = {};
    try {
      errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }
    
    // Handle specific OpenRouter errors
    if (response.status === 402) {
      const creditError = errorData.error?.message || errorMessage;
      throw new Error(`OpenRouter account has insufficient credits. Please purchase credits at https://openrouter.ai/settings/credits. Error: ${creditError}`);
    }
    
    // Handle rate limiting (429) with retry logic
    if (response.status === 429) {
      const maxRetries = 5;
      if (retryCount < maxRetries) {
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s
        const baseDelay = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s, 40s, 80s
        const jitter = Math.random() * 2000; // Add up to 2s random jitter
        const delay = baseDelay + jitter;
        console.log(`OpenRouter rate limited (429). Retrying in ${Math.round(delay/1000)}s... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await callOpenRouter(prompt, retryCount + 1);
      }
      throw new Error(`OpenRouter API rate limited (429). Please wait and try again later. Free models have strict rate limits.`);
    }
    
    console.error('OpenRouter API error:', errorMessage);
    throw new Error(`OpenRouter API failed: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return (typeof text === 'string' ? text : String(text)).trim();
}

async function callAI(prompt: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter' = 'openai'): Promise<string> {
  if (provider === 'gemini') {
    return await callGemini(prompt);
  } else if (provider === 'deepseek') {
    return await callDeepSeek(prompt);
  } else if (provider === 'openrouter') {
    return await callOpenRouter(prompt);
  } else {
    return await callOpenAI(prompt);
  }
}

function analyzeSentiment(text: string, brandName: string): string | null {
  const lowerText = text.toLowerCase();
  const lowerBrand = brandName.toLowerCase();

  if (!lowerText.includes(lowerBrand)) {
    return null;
  }

  const positiveWords = ['best', 'excellent', 'great', 'top', 'leading', 'innovative', 'trusted', 'quality', 'recommended', 'popular'];
  const negativeWords = ['poor', 'worst', 'bad', 'lacking', 'issues', 'problems', 'unreliable', 'disappointing'];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractMentionedBrands(text: string): string[] {
  const brands: string[] = [];
  const sentences = text.split(/[.!?]/);
  
  sentences.forEach(sentence => {
    const words = sentence.split(/\s+/);
    words.forEach(word => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned.length > 2 && /^[A-Z]/.test(cleaned)) {
        brands.push(cleaned);
      }
    });
  });

  return [...new Set(brands)];
}

async function generateAISummary(responses: any[], brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter' = 'openai'): Promise<string> {
  if (!responses || responses.length === 0) {
    return 'No AI responses were generated for this scan. Try running the scan again.';
  }

  // Limit to first 8 responses and truncate
  const limitedResponses = responses.slice(0, 8)
    .map(r => `Q: ${r.question_text}\nA: ${r.ai_response.substring(0, 120)}`)
    .join('\n\n');

  const summaryPrompt = `Brand: ${brandName}\nResponses: ${limitedResponses}\n\nSummarize in 2-3 sentences: tone, topics, visibility gaps.`;

  return await callAI(summaryPrompt, provider);
}

async function generateMetaAnalysis(responses: any[], brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter' = 'openai'): Promise<{
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}> {
  if (!responses || responses.length === 0) {
    return {
      strengths: [],
      weaknesses: ['No scan data available'],
      recommendations: ['Run a GEO scan to gather insights']
    };
  }

  // Limit to first 8 responses and truncate
  const limitedResponses = responses.slice(0, 8)
    .map(r => `[${r.question_category}] ${r.ai_response.substring(0, 100)}`)
    .join('\n');

  const analysisPrompt = `Brand: ${brandName}\nResponses: ${limitedResponses}\n\nOutput JSON: {"strengths": ["s1", "s2", "s3"], "weaknesses": ["w1", "w2", "w3"], "recommendations": ["r1", "r2", "r3"]}`;

  try {
    const response = await callAI(analysisPrompt, provider);
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || []
      };
    }
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.error('Error parsing meta-analysis:', error);
    return {
      strengths: ['Brand has some visibility in AI search results'],
      weaknesses: ['Limited detailed insights available', 'Analysis needs more data'],
      recommendations: ['Run more scans to build better insights', 'Increase content marketing efforts']
    };
  }
}

function calculateVisibilityScore(responses: any[]): number {
  const totalQuestions = responses.length;
  if (totalQuestions === 0) return 0;

  const mentionedCount = responses.filter(r => r.brand_mentioned).length;
  const positiveCount = responses.filter(r => r.sentiment === 'positive').length;
  const neutralCount = responses.filter(r => r.sentiment === 'neutral').length;

  const mentionRate = (mentionedCount / totalQuestions) * 100;
  const sentimentBonus = (positiveCount * 10) + (neutralCount * 5);
  const base = (mentionRate * 0.7) + (sentimentBonus / totalQuestions);
  const score = Math.round(base);
  return Math.min(Math.max(score, 0), 100);
}

// ============================================
// AI INSIGHT ENGINE - Step 1: Perception Summary
// ============================================
async function generatePerceptionSummary(responses: any[], brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  const responsesText = responses
    .map(r => `Q: ${r.question_text}\nA: ${r.ai_response}`)
    .join('\n\n');

  // Limit responses text to avoid token limits
  const limitedResponses = responses.slice(0, 10).map(r => `Q: ${r.question_text}\nA: ${r.ai_response.substring(0, 150)}`).join('\n\n');
  
  const prompt = `Analyze brand ${brandName} from these responses:\n\n${limitedResponses}\n\nOutput JSON: {"summary": "2-3 sentences", "tone": "positive/neutral/negative", "visibility_tier": "Tier 1/2/3", "visibility_score": 0-100, "drivers": ["reason1", "reason2", "reason3"]}`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating perception summary:', error);
  }

  // Fallback
  return {
    summary: 'Unable to generate perception summary.',
    tone: 'neutral',
    visibility_tier: 'Tier 3',
    visibility_score: 0,
    drivers: ['Analysis unavailable']
  };
}

// ============================================
// AI INSIGHT ENGINE - Step 2: Deep Insight Analysis
// ============================================
async function generateDeepInsights(perceptionSummary: any, sentimentStats: any, brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  const prompt = `Brand: ${brandName}\nPerception: ${JSON.stringify(perceptionSummary)}\nSentiment: ${JSON.stringify(sentimentStats)}\n\nOutput JSON: {"insight_summary": "1-2 sentences", "competitive_gap": "1 sentence", "narrative_gap": "1 sentence", "visibility_levers": ["lever1", "lever2", "lever3"]}`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating deep insights:', error);
  }

  return {
    insight_summary: 'Analysis unavailable',
    competitive_gap: 'Unable to determine',
    narrative_gap: 'Unable to determine',
    visibility_levers: []
  };
}

// ============================================
// AI INSIGHT ENGINE - Step 3: Strengths & Gaps
// ============================================
async function generateStrengthsAndGaps(responses: any[], brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  // Limit to first 8 responses and truncate each
  const limitedResponses = responses.slice(0, 8)
    .map(r => `[${r.question_category}] ${r.ai_response.substring(0, 100)}`)
    .join('\n');

  const prompt = `Brand: ${brandName}\nResponses: ${limitedResponses}\n\nOutput JSON: {"strengths": ["s1", "s2", "s3"], "gaps": ["g1", "g2", "g3"], "opportunity_topic": "topic"}`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating strengths and gaps:', error);
  }

  return {
    strengths: [],
    gaps: [],
    opportunity_topic: ''
  };
}

// ============================================
// AI INSIGHT ENGINE - Step 4: Actionable Recommendations
// ============================================
async function generateRecommendations(perceptionSummary: any, gaps: any, brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  const prompt = `Brand: ${brandName}\nPerception: ${JSON.stringify(perceptionSummary)}\nGaps: ${JSON.stringify(gaps)}\n\nOutput JSON array: [{"action": "1 sentence", "priority": "Urgent/Moderate/Low", "focus_area": "Content/PR/SEO/Product"}]`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating recommendations:', error);
  }

  return [];
}

// ============================================
// AI INSIGHT ENGINE - Step 5: Content Ideas
// ============================================
async function generateContentIdeas(gaps: any, brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  const prompt = `Brand: ${brandName}\nGaps: ${JSON.stringify(gaps)}\n\nOutput JSON array: [{"title": "idea", "description": "1 sentence", "improves_topic": "topic", "impact": "impact"}]`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating content ideas:', error);
  }

  return [];
}

// ============================================
// AI INSIGHT ENGINE - Step 6: Week-over-Week Change
// ============================================
async function generateWeekOverWeekChange(currentSummary: any, previousSummary: any, brandName: string, provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter'): Promise<any> {
  if (!previousSummary) {
    return {
      change_summary: 'This is the first scan. No previous data to compare.',
      gained_topics: [],
      lost_topics: [],
      competitor_change: 'N/A',
      main_cause: 'First scan'
    };
  }

  const prompt = `Brand: ${brandName}\nPrevious: ${JSON.stringify(previousSummary)}\nCurrent: ${JSON.stringify(currentSummary)}\n\nOutput JSON: {"change_summary": "1-2 sentences", "gained_topics": ["t1", "t2"], "lost_topics": ["t1", "t2"], "competitor_change": "1 sentence", "main_cause": "1 sentence"}`;

  try {
    const response = await callAI(prompt, provider);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating week-over-week change:', error);
  }

  return {
    change_summary: 'Unable to compare scans',
    gained_topics: [],
    lost_topics: [],
    competitor_change: 'Unable to determine',
    main_cause: 'Analysis unavailable'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body safely
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { brandId, aiProvider } = requestBody;
    
    if (!brandId) {
      return new Response(
        JSON.stringify({ error: 'brandId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Determine which AI provider to use
    let provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter' = 'openai';
    
    if (aiProvider && (aiProvider === 'openai' || aiProvider === 'gemini' || aiProvider === 'deepseek' || aiProvider === 'openrouter')) {
      provider = aiProvider;
    } else {
      // Get provider from brand settings (if field exists)
      try {
        const { data: brand } = await supabase
          .from('brands')
          .select('ai_provider')
          .eq('id', brandId)
          .single();
        
        if (brand?.ai_provider && (brand.ai_provider === 'openai' || brand.ai_provider === 'gemini' || brand.ai_provider === 'deepseek' || brand.ai_provider === 'openrouter')) {
          provider = brand.ai_provider;
        }
      } catch (e) {
        // Field might not exist if migration hasn't been run - use default
        console.log('Could not fetch ai_provider from brand, using default:', e);
      }
    }
    
    // Check if required API key is set
    if (provider === 'gemini' && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'GEMINI_API_KEY is not configured. Please set it in Edge Function secrets. Get your key from https://aistudio.google.com/app/apikey' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (provider === 'openai' && !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY is not configured. Please set it in Edge Function secrets. Get your key from https://platform.openai.com/api-keys' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (provider === 'deepseek' && !DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'DEEPSEEK_API_KEY is not configured. Please set it in Edge Function secrets. Get your key from https://platform.deepseek.com/api_keys' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (provider === 'openrouter' && !OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENROUTER_API_KEY is not configured. Please set it in Edge Function secrets. Get your key from https://openrouter.ai/keys' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found');
    }

    console.log('Starting GEO scan for brand:', brand.name);

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        status: 'running',
        total_questions: QUESTION_TEMPLATES.length,
        completed_questions: 0,
      })
      .select()
      .single();

    if (scanError || !scan) {
      throw new Error('Failed to create scan');
    }

    // Process questions - we'll do this synchronously to avoid shutdown issues
    // But return response immediately and process in background
    const processQuestions = async () => {
      console.log('Starting background processing for scan:', scan.id);
      console.log(`Using provider: ${provider}`);
      const responses: any[] = [];
      let stoppedEarlyDueToQuota = false;
      
      try {
        // Add initial delay for Gemini to avoid immediate rate limiting
        if (provider === 'gemini') {
          console.log('Waiting 10 seconds before starting questions (rate limit protection)...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        for (let i = 0; i < QUESTION_TEMPLATES.length; i++) {
          const questionItem = QUESTION_TEMPLATES[i];
          const questionText = questionItem.template
            .replace('{brand_name}', brand.name)
            .replace('{industry}', brand.description || 'technology')
            .replace('{product_type}', brand.description || 'products')
            .replace('{target_audience}', 'professionals')
            .replace('{niche}', brand.description || 'innovation');

          console.log(`Processing question ${i + 1}/${QUESTION_TEMPLATES.length}:`, questionText);

          try {
            const aiResponse = await callAI(questionText, provider);
            
            if (!aiResponse || aiResponse.trim().length === 0) {
              console.error(`Empty response from API for question ${i + 1}`);
              continue;
            }
            
            const sentiment = analyzeSentiment(aiResponse, brand.name);
            const mentionedBrands = extractMentionedBrands(aiResponse);
            const brandMentioned = sentiment !== null;

            const { data: responseData, error: responseError } = await supabase
              .from('scan_responses')
              .insert({
                scan_id: scan.id,
                brand_id: brandId,
                user_id: user.id,
                question_template: questionItem.template,
                question_text: questionText,
                question_category: questionItem.category,
                ai_response: aiResponse,
                mentioned_brands: mentionedBrands,
                brand_mentioned: brandMentioned,
                sentiment: sentiment,
              })
              .select()
              .single();

            if (responseError) {
              console.error(`Error saving response for question ${i + 1}:`, responseError);
              console.error('Response data that failed:', { questionText, aiResponse: aiResponse.substring(0, 100) });
            } else if (responseData) {
              responses.push(responseData);
              console.log(`Question ${i + 1} completed. Brand mentioned:`, brandMentioned);
            } else {
              console.error(`No data returned after insert for question ${i + 1}`);
            }

            // Update progress
            const { error: updateError } = await supabase
              .from('scans')
              .update({ completed_questions: i + 1 })
              .eq('id', scan.id);

            if (updateError) {
              console.error('Error updating progress:', updateError);
            }

            // Rate limiting - aggressive delays for Gemini and OpenRouter to avoid 429 errors
            // Gemini free tier: ~15 requests per minute = 4 seconds per request minimum
            // OpenRouter free models: Rate limits vary, using 5 seconds base to be safe
            // Using longer delays with exponential backoff to be very safe
            // Each question waits longer to avoid hitting limits
            const baseDelay = provider === 'gemini' ? 15000 : (provider === 'openrouter' ? 5000 : 1000); // 15s for Gemini, 5s for OpenRouter, 1s for others
            const exponentialDelay = (provider === 'gemini' || provider === 'openrouter') ? (i * 1000) : 0; // Add 1s per question for Gemini/OpenRouter
            const jitter = (provider === 'gemini' || provider === 'openrouter') ? (Math.random() * 3000) : 0; // Add up to 3s random jitter
            const delay = baseDelay + exponentialDelay + jitter;
            
            if (provider === 'gemini' || provider === 'openrouter') {
              console.log(`Waiting ${Math.round(delay/1000)}s before next question (rate limit protection for ${provider})...`);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          } catch (error: any) {
            console.error(`Error processing question ${i + 1}:`, error);
            console.error(`Error details:`, {
              message: error?.message,
              stack: error?.stack,
              provider: provider
            });
            
            // Check if this is a quota exceeded error - if so, stop processing early
            const isQuotaExceeded = error?.message && (
              error.message.includes('quota exceeded') || 
              error.message.includes('billing') ||
              error.message.includes('free tier has been reached') ||
              error.message.includes('insufficient credits') ||
              error.message.includes('never purchased credits') ||
              error.message.includes('Insufficient credits')
            );
            
            if (isQuotaExceeded) {
              console.error(`Quota exceeded detected. Stopping scan early. Processed ${responses.length}/${i + 1} questions successfully.`);
              
              // Update scan to show partial completion
              await supabase
                .from('scans')
                .update({ 
                  completed_questions: responses.length,
                  status: 'failed',
                  completed_at: new Date().toISOString(),
                  ai_summary: `Scan stopped early: ${error.message}. Only ${responses.length} of ${QUESTION_TEMPLATES.length} questions were completed before quota was reached.`
                })
                .eq('id', scan.id);
              
              // If we have some responses, try to generate a partial summary
              if (responses.length > 0) {
                console.log(`Attempting to generate partial summary with ${responses.length} responses...`);
                try {
                  const partialSummary = await generateAISummary(responses, brand.name, provider);
                  const visibilityScore = calculateVisibilityScore(responses);
                  
                  await supabase
                    .from('scans')
                    .update({
                      visibility_score: visibilityScore,
                      ai_summary: `Partial scan results (${responses.length}/${QUESTION_TEMPLATES.length} questions): ${partialSummary}\n\nNote: Scan stopped early due to API quota limit.`
                    })
                    .eq('id', scan.id);
                } catch (summaryError) {
                  console.error('Failed to generate partial summary:', summaryError);
                }
              }
              
              // Break out of the loop - don't continue processing
              stoppedEarlyDueToQuota = true;
              break;
            }
            
            // If rate limited (but not quota), wait longer before continuing
            if (error?.message && (error.message.includes('rate limit') || error.message.includes('429')) && !isQuotaExceeded) {
              const errorDelay = provider === 'gemini' ? 30000 : (provider === 'openrouter' ? 20000 : 5000); // 30s for Gemini, 20s for OpenRouter, 5s for others
              console.log(`Rate limit error detected (429). Waiting ${errorDelay/1000}s before continuing...`);
              await new Promise(resolve => setTimeout(resolve, errorDelay));
            }
            // Continue with next question for other errors
          }
        }

        console.log(`All questions processed. Total responses saved: ${responses.length}/${QUESTION_TEMPLATES.length}`);
        console.log(`Provider used: ${provider}`);
        console.log(`API keys available: OPENAI=${!!OPENAI_API_KEY}, GEMINI=${!!GEMINI_API_KEY}, DEEPSEEK=${!!DEEPSEEK_API_KEY}, OPENROUTER=${!!OPENROUTER_API_KEY}`);

        // If we stopped early due to quota, skip the rest of processing
        if (stoppedEarlyDueToQuota) {
          console.log('Scan stopped early due to quota limit. Skipping insight generation.');
          return; // Exit early - scan already marked as failed with partial results
        }

        if (responses.length === 0) {
          let errorMsg = `No responses were saved! Provider: ${provider}`;
          
          // Add provider-specific guidance
          if (provider === 'openrouter') {
            errorMsg += `. OPENROUTER_KEY: ${OPENROUTER_API_KEY ? 'set' : 'missing'}. `;
            errorMsg += `OpenRouter requires credits to be purchased. If you see "insufficient credits" errors, please purchase credits at https://openrouter.ai/settings/credits`;
          } else {
            errorMsg += `, OPENAI_KEY: ${OPENAI_API_KEY ? 'set' : 'missing'}, GEMINI_KEY: ${GEMINI_API_KEY ? 'set' : 'missing'}, DEEPSEEK_KEY: ${DEEPSEEK_API_KEY ? 'set' : 'missing'}`;
          }
          
          errorMsg += `. Check Edge Function logs above for API errors.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Generate AI summary and meta-analysis
        const aiSummary = await generateAISummary(responses, brand.name, provider);
        const metaAnalysis = await generateMetaAnalysis(responses, brand.name, provider);
        const visibilityScore = calculateVisibilityScore(responses);

        // Calculate sentiment counts
        const positiveMentions = responses.filter(r => r.sentiment === 'positive').length;
        const neutralMentions = responses.filter(r => r.sentiment === 'neutral').length;
        const negativeMentions = responses.filter(r => r.sentiment === 'negative').length;
        const totalMentions = responses.filter(r => r.brand_mentioned).length;

        console.log('Scan results:', { visibilityScore, positiveMentions, neutralMentions, negativeMentions, totalMentions });

        // ============================================
        // AI INSIGHT ENGINE - Generate all insights
        // ============================================
        console.log('Starting AI Insight Engine...');
        
        // Add delay before starting insights to avoid rate limits
        // (We just made 15 API calls for questions, need to space out the insight calls)
        if (provider === 'gemini') {
          console.log('Waiting 60 seconds before generating insights (rate limit protection)...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
        
        // Step 1: Perception Summary
        console.log('Step 1: Generating perception summary...');
        let perceptionSummary: any = null;
        try {
          perceptionSummary = await generatePerceptionSummary(responses, brand.name, provider);
          if (provider === 'gemini') {
            console.log('Waiting 15 seconds before next insight step...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          } else if (provider === 'deepseek') await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to generate perception summary, using fallback:', error);
          perceptionSummary = {
            summary: aiSummary,
            tone: positiveMentions > negativeMentions ? 'positive' : negativeMentions > positiveMentions ? 'negative' : 'neutral',
            visibility_tier: visibilityScore >= 70 ? 'Tier 1' : visibilityScore >= 40 ? 'Tier 2' : 'Tier 3',
            visibility_score: visibilityScore,
            drivers: ['Analysis unavailable due to rate limits']
          };
        }
        
        // Step 2: Deep Insight Analysis
        console.log('Step 2: Generating deep insights...');
        const sentimentStats = {
          positive: positiveMentions,
          neutral: neutralMentions,
          negative: negativeMentions,
          total: totalMentions
        };
        let deepInsights: any = null;
        try {
          deepInsights = await generateDeepInsights(perceptionSummary, sentimentStats, brand.name, provider);
          if (provider === 'gemini') {
            console.log('Waiting 15 seconds before next insight step...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          } else if (provider === 'deepseek') await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to generate deep insights, using fallback:', error);
          deepInsights = {
            insight_summary: 'Analysis temporarily unavailable due to rate limits.',
            competitive_gap: 'Unable to determine',
            narrative_gap: 'Unable to determine',
            visibility_levers: []
          };
        }
        
        // Step 3: Strengths & Gaps
        console.log('Step 3: Generating strengths and gaps...');
        let strengthsAndGaps: any = null;
        try {
          strengthsAndGaps = await generateStrengthsAndGaps(responses, brand.name, provider);
          if (provider === 'gemini') {
            console.log('Waiting 15 seconds before next insight step...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          } else if (provider === 'deepseek') await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to generate strengths and gaps, using fallback:', error);
          strengthsAndGaps = {
            strengths: metaAnalysis.strengths || [],
            gaps: metaAnalysis.weaknesses || [],
            opportunity_topic: ''
          };
        }
        
        // Step 4: Actionable Recommendations
        console.log('Step 4: Generating recommendations...');
        let recommendations: any = [];
        try {
          recommendations = await generateRecommendations(perceptionSummary, strengthsAndGaps, brand.name, provider);
          if (provider === 'gemini') {
            console.log('Waiting 15 seconds before next insight step...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          } else if (provider === 'deepseek') await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to generate recommendations, using fallback:', error);
          // Convert old format recommendations to new format
          recommendations = (metaAnalysis.recommendations || []).map((rec: string) => ({
            action: rec,
            priority: 'Moderate',
            focus_area: 'General'
          }));
        }
        
        // Step 5: Content Ideas
        console.log('Step 5: Generating content ideas...');
        let contentIdeas: any = [];
        try {
          contentIdeas = await generateContentIdeas(strengthsAndGaps, brand.name, provider);
          if (provider === 'gemini') {
            console.log('Waiting 15 seconds before next insight step...');
            await new Promise(resolve => setTimeout(resolve, 15000));
          } else if (provider === 'deepseek') await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to generate content ideas, using fallback:', error);
          contentIdeas = [];
        }
        
        // Step 6: Week-over-Week Change
        console.log('Step 6: Generating week-over-week comparison...');
        // Get previous scan for comparison
        const { data: previousScans } = await supabase
          .from('scans')
          .select('ai_perception_summary, visibility_score, completed_at')
          .eq('brand_id', brandId)
          .eq('status', 'completed')
          .neq('id', scan.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const previousSummary = previousScans?.ai_perception_summary || null;
        let weekOverWeekChange: any = null;
        try {
          weekOverWeekChange = await generateWeekOverWeekChange(perceptionSummary, previousSummary, brand.name, provider);
        } catch (error) {
          console.error('Failed to generate week-over-week change, using fallback:', error);
          weekOverWeekChange = {
            change_summary: previousSummary ? 'Unable to compare due to rate limits.' : 'This is the first scan.',
            gained_topics: [],
            lost_topics: [],
            competitor_change: 'Unable to determine',
            main_cause: 'Analysis unavailable'
          };
        }
        
        console.log('AI Insight Engine completed!');

        // Update scan with all results including insights
        const { error: scanUpdateError } = await supabase
          .from('scans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            visibility_score: visibilityScore,
            ai_summary: aiSummary,
            strengths: metaAnalysis.strengths,
            weaknesses: metaAnalysis.weaknesses,
            recommendations: metaAnalysis.recommendations,
            // AI Insight Engine fields
            ai_perception_summary: perceptionSummary,
            deep_insight_analysis: deepInsights,
            strengths_and_gaps: strengthsAndGaps,
            actionable_recommendations: recommendations,
            content_ideas: contentIdeas,
            week_over_week_change: weekOverWeekChange,
          })
          .eq('id', scan.id);

        if (scanUpdateError) {
          console.error('Error updating scan:', scanUpdateError);
          throw scanUpdateError;
        }

        // Store visibility score
        const { error: scoreError } = await supabase
          .from('brand_visibility_scores')
          .insert({
            brand_id: brandId,
            user_id: user.id,
            scan_id: scan.id,
            score: visibilityScore,
            positive_mentions: positiveMentions,
            neutral_mentions: neutralMentions,
            negative_mentions: negativeMentions,
            total_mentions: totalMentions,
          });

        if (scoreError) {
          console.error('Error storing visibility score:', scoreError);
          throw scoreError;
        }

        console.log('GEO scan completed successfully for scan:', scan.id);
        
        // ============================================
        // Send Email Notification (Optional)
        // ============================================
        try {
          // Get user email for notification
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();
          
          if (userProfile?.email) {
            // Note: Supabase doesn't have built-in email sending
            // You can integrate with SendGrid, Resend, or other email services
            // For now, we'll just log it - you can add email service integration later
            console.log(`Email notification would be sent to: ${userProfile.email}`);
            console.log(`Subject: GEO Scan Complete - ${brand.name}`);
            console.log(`Visibility Score: ${visibilityScore}`);
            console.log(`Top Recommendations:`, recommendations.slice(0, 2).map((r: any) => r.action || r));
          }
        } catch (emailError) {
          // Email notification is optional, don't fail the scan if it errors
          console.log('Email notification skipped:', emailError);
        }
      } catch (error: any) {
        console.error('Fatal error in background processing:', error);
        // Extract helpful error message
        let errorMessage = error?.message || 'Unknown error occurred';
        
        // Provide specific guidance for quota/billing errors
        if (errorMessage.includes('quota exceeded') || errorMessage.includes('billing')) {
          errorMessage = 'Gemini API quota exceeded. Free tier limit reached. Please set up billing at https://aistudio.google.com/app/apikey or switch to OpenAI/DeepSeek provider.';
        }
        
        // Mark scan as failed with error message
        await supabase
          .from('scans')
          .update({ 
            status: 'failed', 
            completed_at: new Date().toISOString(),
            // Store error in ai_summary field if available, or we could add an error_message field
            ai_summary: `Scan failed: ${errorMessage}`
          })
          .eq('id', scan.id);
        throw error;
      }
    };

    // Start background processing immediately yessss
    // The function will return response but processing continues
    processQuestions().catch(async (error: any) => {
      console.error('Background processing failed:', error);
      // Ensure scan is marked as failed if processing fails
      try {
        let errorMessage = error?.message || 'Unknown error occurred';
        
        // Provide specific guidance for quota/billing errors
        if (errorMessage.includes('quota exceeded') || errorMessage.includes('billing')) {
          errorMessage = 'Gemini API quota exceeded. Free tier limit reached. Please set up billing at https://aistudio.google.com/app/apikey or switch to OpenAI/DeepSeek provider.';
        }
        
        const { error: updateError } = await supabase
          .from('scans')
          .update({ 
            status: 'failed', 
            completed_at: new Date().toISOString(),
            ai_summary: `Scan failed: ${errorMessage}`
          })
          .eq('id', scan.id);
        if (updateError) {
          console.error('Failed to update scan status:', updateError);
        }
      } catch (err) {
        console.error('Error updating scan status:', err);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'GEO scan started successfully',
        scanId: scan.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in run-geo-scan:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
