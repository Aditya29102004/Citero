import { generateQuestions, generateAIQuestions } from "./questionGenerator.ts";
import { callAI } from "./aiClient.ts";
import { extractDomains, isBrandMentioned, isBrandFirstMention, normalizeDomain } from "./responseParser.ts";
import { extractCompetitors } from "./competitorExtractor.ts";
import { analyzeSentiment } from "./sentiment.ts";
import { generateInsights } from "./insights.ts";
import { computeMetrics } from "./citationMetrics.ts";
import * as db from "./database.ts";

export function parseLLMResponse(
  rawText: string,
  brandName: string,
  competitorNames: string[]
): {
  answer: string;
  brandMentioned: boolean;
  sentiment: "positive" | "neutral" | "negative";
  competitors: string[];
  sources: string[];
} {
  let cleaned = rawText.trim();
  
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    
    const answer = parsed.answer || rawText;
    const brandMentioned = typeof parsed.brand_mentioned === 'boolean' 
      ? parsed.brand_mentioned 
      : isBrandMentioned(answer, brandName);
      
    let sentiment = parsed.brand_sentiment || parsed.sentiment || 'neutral';
    if (!['positive', 'neutral', 'negative'].includes(sentiment)) {
      sentiment = 'neutral';
    }
    
    const competitors = Array.isArray(parsed.mentioned_competitors) 
      ? parsed.mentioned_competitors 
      : Array.isArray(parsed.competitors) 
        ? parsed.competitors 
        : extractCompetitors(answer, competitorNames, brandName);

    const sources = Array.isArray(parsed.sources) 
      ? parsed.sources 
      : extractDomains(answer);

    return { answer, brandMentioned, sentiment, competitors, sources };
  } catch (_err) {
    // Heuristic Fallback
    const answer = rawText;
    const brandMentioned = isBrandMentioned(answer, brandName);
    const competitors = extractCompetitors(answer, competitorNames, brandName);
    const sources = extractDomains(answer);
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const lowerText = answer.toLowerCase();
    const positiveWords = ['great', 'excellent', 'best', 'recommended', 'top', 'leading', 'popular', 'successful', 'innovative', 'outstanding'];
    const negativeWords = ['poor', 'bad', 'limited', 'lacks', 'issues', 'problems', 'concerns', 'disappointing', 'weak'];
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return { answer, brandMentioned, sentiment, competitors, sources };
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = db.createSupabaseClient();
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch {
      // Ignored for non-JSON requests
    }

    const { action } = requestBody;
    const body = requestBody;

    // --- BACKGROUND WORKER ROUTE ---
    // Process exactly ONE pending scan per invocation and exit
    if (action === "process") {
      console.log("Received body:", body);
      console.log("Action:", body.action);
      console.log("Entering process branch");

      console.log("Background worker triggered. Checking for a pending scan...");
      const workerStartTime = Date.now();

      const nextScan = await db.fetchNextScanJob(supabase);
      console.log("Fetched scan:", nextScan);
      if (!nextScan) {
        console.log("No pending scans found in queue. Worker exiting.");
        return new Response(
          JSON.stringify({ success: true, message: "No pending jobs found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const scanId = nextScan.scan_id || nextScan.id;
      const brandId = nextScan.brand_id;
      const userId = nextScan.user_id;
      const provider = nextScan.ai_provider;

      console.log(
        "Processing scan with provider:",
        nextScan.ai_provider
      );

      console.log(
        "Using AI provider:",
        provider
      );

      const scan = { id: scanId };
      console.log("Processing scan:", scan.id);
      const scanStartTime = Date.now();

      try {
        // Fetch brand details
        const brand = await db.fetchBrand(supabase, brandId);
        const brandName = brand.name;
        const topics = brand.topics || [];
        const primaryCompetitors: string[] = Array.isArray(brand.primary_competitors)
          ? brand.primary_competitors.filter((c: any) => typeof c === 'string')
          : [];

        // Retrieve API keys
        const geminiApiKey = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY") ?? "";
        const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
        const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
        const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
        const apiKeys = { geminiApiKey, openaiApiKey, deepseekApiKey, openrouterApiKey };

        // Generate 15 questions dynamically
        const questions = await generateAIQuestions(
          brandName,
          brand.description || "",
          topics,
          primaryCompetitors,
          provider,
          apiKeys
        );
        const totalQuestions = questions.length;
        console.log("Generated questions");
        console.log(`Generated ${questions.length} questions for scan ${scanId}`);

        // Timing diagnostics
        const questionDiagnostics: any[] = [];
        
        // Phase 1: Generate answers & store responses
        const BATCH_SIZE = 3;
        const TIMEOUT_MS = 30000;
        let completedQuestions = 0;

        for (let i = 0; i < questions.length; i += BATCH_SIZE) {
          const batch = questions.slice(i, i + BATCH_SIZE);
          const batchStartTime = Date.now();
          if (i === 0) {
            console.log("Starting batch 1");
          }
          console.log(`[Scan ${scanId}] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(questions.length / BATCH_SIZE)}`);

          const batchPromises = batch.map(async (question, indexInBatch) => {
            const questionNum = i + indexInBatch + 1;
            if (indexInBatch > 0) {
              await new Promise((r) => setTimeout(r, indexInBatch * 1000));
            }
            const prompt = `You are an expert market research assistant simulating a search engine session or LLM conversation.
Analyze the following search query: "${question}"

Brand Context of interest:
- Name: ${brandName}
${brand.description ? `- Description: ${brand.description}` : ''}
${brand.website_url ? `- Website: ${brand.website_url}` : ''}
${brand.country ? `- Location: ${brand.country}` : ''}

Your task is to provide a comprehensive, objective, and realistic answer to the search query. Evaluate whether and how the brand "${brandName}" is mentioned relative to its competitors or alternatives.

You MUST respond in valid JSON format only. Do not wrap the JSON in HTML or other markdown elements except a standard JSON block. The response must match this JSON schema:

{
  "thinking": "Write a brief step-by-step analysis of the question, the brand's presence in the market, whether it should be mentioned, its strengths/weaknesses compared to alternatives, and what sources/competitors are relevant.",
  "answer": "Your comprehensive, detailed, and markdown-formatted search engine style answer to the query.",
  "brand_mentioned": true/false (set to true ONLY if "${brandName}" is actually mentioned in the 'answer' text),
  "brand_sentiment": "positive" | "neutral" | "negative" (the sentiment toward "${brandName}" in the answer; if the brand is not mentioned, use "neutral"),
  "mentioned_competitors": ["Name of Competitor 1", "Name of Competitor 2"] (list of other competitors or alternatives that are explicitly mentioned in the 'answer'),
  "sources": ["domain1.com", "domain2.com"] (list 2 to 5 diverse, relevant external domain names supporting the answer, e.g. g2.com, producthunt.com, reddit.com. Do NOT include "${brandName}"'s own domain or website url)
}`;

            const qStartTime = Date.now();
            try {
              // Call LLM
              const aiResult = await callAI(prompt, provider, apiKeys, TIMEOUT_MS);
              const qDuration = Date.now() - qStartTime;

              // Parse structured JSON response
              const parsedRes = parseLLMResponse(aiResult.text, brandName, primaryCompetitors);

              // Store response in DB
              await db.storeScanResponse(
                supabase,
                scanId,
                brandId,
                userId,
                question,
                parsedRes.answer,
                parsedRes.brandMentioned,
                parsedRes.sentiment,
                parsedRes.competitors
              );

              console.log("Completed question", questionNum);

              // Timing logs
              questionDiagnostics.push({
                questionNum,
                latency: aiResult.latencyMs,
                geminiResponseTime: qDuration,
                retryCount: aiResult.retryCount,
                timeoutCount: aiResult.timeoutCount,
              });

              console.log(`[Scan ${scanId}] Question ${questionNum} completed in ${qDuration}ms (Latency: ${aiResult.latencyMs}ms, Retries: ${aiResult.retryCount}, Timeouts: ${aiResult.timeoutCount})`);
            } catch (e: any) {
              const qDuration = Date.now() - qStartTime;
              console.error(`[Scan ${scanId}] Question ${questionNum} failed. Duration: ${qDuration}ms, Error: ${e.message}`);
              
              questionDiagnostics.push({
                questionNum,
                latency: 0,
                geminiResponseTime: qDuration,
                retryCount: 3,
                timeoutCount: e.message?.toLowerCase().includes("timeout") ? 1 : 0,
                error: e.message,
              });

              await db.storeScanResponse(
                supabase,
                scanId,
                brandId,
                userId,
                question,
                `Failed to generate answer: ${e.message}`,
                false,
                "neutral",
                []
              );
            }
          });

          await Promise.all(batchPromises);
          completedQuestions += batch.length;
          await db.updateScanProgress(supabase, scanId, completedQuestions);
          
          const batchDuration = Date.now() - batchStartTime;
          console.log(`[Scan ${scanId}] Batch completed. Batch Latency: ${batchDuration}ms`);
        }

        // Phase 2: Compute analytics & generate insights
        console.log(`[Scan ${scanId}] Starting Phase 2 (Analytics & Metrics)`);
        
        // Fetch responses
        const { data: storedResponses, error: fetchErr } = await supabase
          .from("scan_responses")
          .select("*")
          .eq("scan_id", scanId);

        if (fetchErr || !storedResponses) {
          throw new Error(`Failed to retrieve responses for analytics: ${fetchErr?.message || "empty"}`);
        }

        const responsesMetricsPayload: any[] = [];
        const domainCitations: Record<string, number> = {};
        const allResponseTexts: string[] = [];
        
        const competitorMetrics: Record<string, { mentions: number; citations: number; positive: number; neutral: number; negative: number }> = {};
        primaryCompetitors.forEach(comp => {
          competitorMetrics[comp] = { mentions: 0, citations: 0, positive: 0, neutral: 0, negative: 0 };
        });

        // Compute competitor mentions and extract domains via code
        for (const resp of storedResponses) {
          const text = resp.ai_response || "";
          allResponseTexts.push(text);
          
          const foundCompetitors = Array.isArray(resp.mentioned_brands) && resp.mentioned_brands.length > 0
            ? resp.mentioned_brands.filter((c: any) => typeof c === 'string')
            : extractCompetitors(text, primaryCompetitors, brandName);

          await db.updateResponseCompetitors(supabase, scanId, resp.question_text, foundCompetitors);

          const rawDomains = extractDomains(text);
          const brandDomain = brand.website_url ? normalizeDomain(brand.website_url) : "";
          const brandNameClean = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

          const extractedDomains = rawDomains.filter(domain => {
            const normalized = normalizeDomain(domain);
            
            // Exclude brand's own domain (or subdomains/parent domains)
            const isBrandSite = brandDomain && (normalized === brandDomain || normalized.endsWith(`.${brandDomain}`) || brandDomain.endsWith(`.${normalized}`));
            
            // Exclude domains matching the brand name (e.g. usebear.ai contains usebear, or usebear matches domain)
            const normalizedClean = normalized.replace(/[^a-z0-9]/g, '');
            const isBrandNameMatch = brandNameClean && (normalizedClean.includes(brandNameClean) || (normalized.split('.')[0] && brandNameClean.includes(normalized.split('.')[0])));

            return !isBrandSite && !isBrandNameMatch;
          });

          extractedDomains.forEach(domain => {
            domainCitations[domain] = (domainCitations[domain] || 0) + 1;
          });

          responsesMetricsPayload.push({
            brandMentioned: resp.brand_mentioned,
            mentionedCompetitors: foundCompetitors,
            domains: extractedDomains,
          });

          foundCompetitors.forEach(comp => {
            if (competitorMetrics[comp]) {
              competitorMetrics[comp].mentions++;
              if (resp.brand_mentioned) {
                competitorMetrics[comp].citations++;
              }
              const respSentiment = resp.sentiment || "neutral";
              if (respSentiment === "positive") competitorMetrics[comp].positive++;
              else if (respSentiment === "negative") competitorMetrics[comp].negative++;
              else competitorMetrics[comp].neutral++;
            }
          });
        }

        // Calculate Visibility, Competitive Visibility, and Citation Score using citationMetrics
        const metrics = computeMetrics(responsesMetricsPayload);
        const brandVisibility = metrics.visibility;
        const competitiveVisibility = metrics.competitiveVisibility;
        const citationScore = metrics.citationScore;

        // Calculate sentiment counts mathematically based on individual responses
        const sentimentPositive = storedResponses.filter(r => r.sentiment === "positive").length;
        const sentimentNegative = storedResponses.filter(r => r.sentiment === "negative").length;
        const sentimentNeutral = storedResponses.filter(r => r.sentiment === "neutral" || !r.sentiment).length;

        const overallSentiment = sentimentPositive > sentimentNegative
          ? "positive"
          : sentimentNegative > sentimentPositive
            ? "negative"
            : "neutral";
        console.log(`[Scan ${scanId}] Mathematical overall sentiment: ${overallSentiment} (P: ${sentimentPositive}, N: ${sentimentNeutral}, Neg: ${sentimentNegative})`);

        // Fetch scan number atomically
        const scanNumber = await db.getNextScanNumber(supabase, brandId);

        // Build competitor scores
        const competitorScores: Record<string, any> = {};
        let maxCompetitorVisibility = 0;
        let maxCompetitorMentions = 0;

        Object.entries(competitorMetrics).forEach(([name, data]) => {
          const vis = (data.mentions / totalQuestions) * 100;
          if (vis > maxCompetitorVisibility) maxCompetitorVisibility = vis;
          if (data.mentions > maxCompetitorMentions) maxCompetitorMentions = data.mentions;

          competitorScores[name] = {
            visibility: vis,
            mentions: data.mentions,
            citations: data.citations,
          };
        });

        // Advanced metrics
        const brandFirstMentionsCount = storedResponses.filter(r => {
          const comps = primaryCompetitors.map(c => c.toLowerCase());
          return isBrandFirstMention(r.ai_response, brandName, comps);
        }).length;
        const brandMentions = storedResponses.filter(r => r.brand_mentioned).length;
        const firstMentionRate = totalQuestions > 0 ? (brandFirstMentionsCount / totalQuestions) * 100 : 0;
        const dominanceScore = maxCompetitorMentions > 0 ? (brandMentions / maxCompetitorMentions) : (brandMentions > 0 ? 10 : 0);
        const visibilityGap = maxCompetitorVisibility - brandVisibility;

        competitorScores["_advanced_metrics"] = {
          firstMentionRate,
          dominanceScore,
          visibilityGap
        };

        const citationSources = Object.entries(domainCitations)
          .map(([domain, count]) => ({ domain, citations: count }))
          .sort((a, b) => b.citations - a.citations)
          .slice(0, 20);

        // Perform ONE insights generation call
        console.log(`[Scan ${scanId}] Running single LLM call for insights generation...`);
        const competitorScoresInput: Record<string, { visibility: number; mentions: number }> = {};
        Object.entries(competitorScores).forEach(([name, data]) => {
          if (name !== "_advanced_metrics") {
            competitorScoresInput[name] = { visibility: data.visibility, mentions: data.mentions };
          }
        });
        const insights = await generateInsights(brandName, brandVisibility, citationScore, competitorScoresInput, overallSentiment, topics, provider, apiKeys);

        // Store results in tables
        await db.storeSourceCitations(supabase, brandId, scanId, domainCitations);
        
        // Update competitor history metrics with mapped sentiment
        const competitorHistoryMetrics: Record<string, any> = {};
        Object.entries(competitorMetrics).forEach(([name, data]) => {
          competitorHistoryMetrics[name] = {
            ...data,
            positive: overallSentiment === "positive" ? data.mentions : 0,
            neutral: overallSentiment === "neutral" ? data.mentions : 0,
            negative: overallSentiment === "negative" ? data.mentions : 0,
          };
        });
        await db.storeCompetitorVisibilityHistory(supabase, brandId, scanId, competitorHistoryMetrics);

        // Insert results to ai_scan_results
        await db.insertScanResults(
          supabase,
          brandId,
          scanNumber,
          brandVisibility,
          citationScore,
          sentimentPositive,
          sentimentNeutral,
          sentimentNegative,
          competitorScores,
          citationSources,
          provider
        );

        console.log("Completed analytics");

        console.log("Marking scan completed");
        // Complete scan with insights
        await db.completeScan(supabase, scanId, completedQuestions, brandVisibility, insights);

        const totalScanDuration = Date.now() - scanStartTime;
        console.log(`[Scan ${scanId}] Processed successfully in ${totalScanDuration}ms.`);
        console.log("Detailed Timing Log:");
        console.table(questionDiagnostics);

      } catch (scanErr: any) {
        console.error(`[Scan ${scanId}] Worker failed during scan:`, scanErr);
        await db.failScan(supabase, scanId, scanErr.message);
      }

      const totalWorkerDuration = Date.now() - workerStartTime;
      return new Response(
        JSON.stringify({ success: true, durationMs: totalWorkerDuration }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // --- TRIGGER SCAN ROUTE (Client Entrypoint) ---
    const { brandId, aiProvider = "openai" } = requestBody;
    console.log("GEO scan trigger request received:", { brandId, aiProvider });

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: "brandId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch brand
    const brand = await db.fetchBrand(supabase, brandId);

    // Create pending scan entry
    const scan = await db.createPendingScan(supabase, brandId, brand.user_id, 15, aiProvider);
    
    console.log("Created pending scan", scan.id);
    console.log("Triggering worker");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    fetch(
      `${SUPABASE_URL}/functions/v1/run-geo-scan`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "process"
        })
      }
    ).catch(err => {
      console.error("Error triggering worker asynchronously:", err);
    });

    console.log("Worker request sent");

    // Return immediately to frontend
    return new Response(
      JSON.stringify({
        success: true,
        scanId: scan.id,
        status: "pending",
        message: "Scan has been queued and will be processed by the background worker."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
    );

  } catch (error: any) {
    console.error("Critical error in request handler:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error", details: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
