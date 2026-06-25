import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      websiteUrl,
      summary,
      industry,
      audience,
      topics,
      competitors,
    } = await req.json();

    if (!websiteUrl || !summary) {
      throw new Error("websiteUrl and summary are required");
    }

    // Check if user already has a brand (prevent duplicate onboarding)
    const { data: existingBrands } = await supabaseClient
      .from("brands")
      .select("id, onboarding_completed, topics, competitors")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingBrands && existingBrands.length > 0) {
      const existingBrand = existingBrands[0];
      
      // Check if onboarding is already completed
      if (existingBrand.onboarding_completed === true) {
        return new Response(
          JSON.stringify({ 
            error: "You have already completed onboarding. Each email can only complete onboarding once." 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Check if brand has onboarding data (topics or competitors)
      const hasOnboardingData = 
        (existingBrand.topics && Array.isArray(existingBrand.topics) && existingBrand.topics.length > 0) ||
        (existingBrand.competitors && (Array.isArray(existingBrand.competitors) || typeof existingBrand.competitors === 'object'));

      if (hasOnboardingData) {
        return new Response(
          JSON.stringify({ 
            error: "You have already completed onboarding. Each email can only complete onboarding once." 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Extract brand name from URL or summary
    const brandName = websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(".")[0]
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim() || "My Brand";

    // Create brand record with all onboarding data
    const brandData: any = {
      user_id: user.id,
      name: brandName,
      website_url: websiteUrl,
      description: summary,
      aliases: topics?.join(", ") || null,
    };

    // Add optional fields if they exist in the schema
    if (industry) brandData.industry = industry;
    if (audience) brandData.audience = audience;
    if (topics && topics.length > 0) brandData.topics = topics;
    if (competitors && competitors.length > 0) {
      brandData.competitors = competitors;
      // Also save to primary_competitors as TEXT[] array (extract names)
      const competitorNames = competitors.map((c: any) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && c.name) return c.name;
        return '';
      }).filter((name: string) => name && name.length > 0);
      if (competitorNames.length > 0) {
        brandData.primary_competitors = competitorNames;
      }
    }
    
    // Always set onboarding_completed to true when saving onboarding data
    brandData.onboarding_completed = true;
    
    console.log("Creating brand with data:", {
      user_id: user.id,
      name: brandName,
      website_url: websiteUrl,
      onboarding_completed: true,
      has_industry: !!industry,
      has_audience: !!audience,
      topics_count: topics?.length || 0,
      competitors_count: competitors?.length || 0,
    });

    const { data: brand, error: brandError } = await supabaseClient
      .from("brands")
      .insert(brandData)
      .select()
      .single();

    if (brandError) {
      console.error("Error creating brand:", brandError);
      // Try without optional fields if they don't exist
      if (brandError.code === 'PGRST204' || brandError.message?.includes('column')) {
        const basicBrandData: any = {
          user_id: user.id,
          name: brandName,
          website_url: websiteUrl,
          description: summary,
          aliases: topics?.join(", ") || null,
        };
        
        // Try to set onboarding_completed if column exists
        try {
          basicBrandData.onboarding_completed = true;
        } catch {
          // Column might not exist, that's okay
        }
        
        console.log("Retrying with basic brand data (fallback):", {
          user_id: user.id,
          name: brandName,
          onboarding_completed: basicBrandData.onboarding_completed,
        });
        
        const { data: retryBrand, error: retryError } = await supabaseClient
          .from("brands")
          .insert(basicBrandData)
          .select()
          .single();
        
        if (retryError) {
          throw new Error(`Failed to create brand: ${retryError.message}`);
        }
        
        // Seed database with mock scan history relative to today
        await seedMockData(supabaseClient, retryBrand.id, user.id, brandName, websiteUrl, competitors || []);
        
        return new Response(
          JSON.stringify({
            success: true,
            brandId: retryBrand.id,
            message: "Brand created successfully",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      throw new Error(`Failed to create brand: ${brandError.message}`);
    }

    // Seed database with mock scan history relative to today
    await seedMockData(supabaseClient, brand.id, user.id, brandName, websiteUrl, competitors || []);

    return new Response(
      JSON.stringify({
        success: true,
        brandId: brand.id,
        message: "Brand created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in save-onboarding:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save onboarding data" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function seedMockData(
  supabaseClient: any,
  brandId: string,
  userId: string,
  brandName: string,
  websiteUrl: string,
  competitors: any[]
) {
  try {
    console.log(`Seeding mock data for brand ${brandName} (${brandId})...`);

    // Clean and select competitors
    const competitorNames = (competitors || []).map((c: any) => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object' && c.name) return c.name;
      return '';
    }).filter((name: string) => name && name.length > 0);

    let seedComps = [...competitorNames];
    const defaultComps = ["HubSpot", "ActiveCampaign", "Marketo", "Salesforce", "Semrush"];
    for (const defComp of defaultComps) {
      if (seedComps.length >= 5) break;
      if (!seedComps.some(c => c.toLowerCase() === defComp.toLowerCase())) {
        seedComps.push(defComp);
      }
    }
    seedComps = seedComps.slice(0, 5);

    const cleanBrandDomain = websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] || "mybrand.com";

    // Spaced timestamps relative to now
    const now = new Date();
    const relativeOffsets = [90, 60, 30, 15, 5, 2, 0]; // days ago
    
    // Scans/trend stats
    const trendStats = [
      // 90 days ago
      { visibility: 90.0, citationShare: 85.0, sentiment: { positive: 40, neutral: 100, negative: 10 }, competitorVisibilities: [50.0, 40.0, 25.0, 15.0, 8.0], competitorMentions: [12, 10, 6, 4, 2] },
      // 60 days ago
      { visibility: 92.5, citationShare: 88.0, sentiment: { positive: 41, neutral: 100, negative: 9 }, competitorVisibilities: [52.0, 42.0, 26.0, 16.5, 8.5], competitorMentions: [13, 10, 6, 4, 2] },
      // 30 days ago
      { visibility: 95.0, citationShare: 91.5, sentiment: { positive: 42, neutral: 101, negative: 7 }, competitorVisibilities: [55.0, 41.5, 27.5, 17.0, 9.0], competitorMentions: [14, 10, 7, 4, 2] },
      // 15 days ago
      { visibility: 97.0, citationShare: 94.0, sentiment: { positive: 43, neutral: 102, negative: 5 }, competitorVisibilities: [54.0, 43.0, 28.0, 18.5, 9.5], competitorMentions: [13, 11, 7, 5, 2] },
      // 5 days ago
      { visibility: 98.5, citationShare: 96.5, sentiment: { positive: 43, neutral: 103, negative: 4 }, competitorVisibilities: [56.5, 44.0, 29.0, 19.0, 9.8], competitorMentions: [14, 11, 7, 5, 2] },
      // 2 days ago
      { visibility: 99.0, citationShare: 98.0, sentiment: { positive: 43, neutral: 104, negative: 3 }, competitorVisibilities: [57.0, 44.5, 29.5, 19.5, 10.0], competitorMentions: [14, 11, 7, 5, 3] },
      // today
      { visibility: 100.0, citationShare: 100.0, sentiment: { positive: 43, neutral: 104, negative: 3 }, competitorVisibilities: [58.0, 45.0, 30.0, 20.0, 10.0], competitorMentions: [15, 11, 8, 5, 3] }
    ];

    const providers = ['openai', 'gemini'];

    for (const provider of providers) {
      for (let i = 0; i < relativeOffsets.length; i++) {
        const daysAgo = relativeOffsets[i];
        const stats = trendStats[i];
        
        const scanDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const startedDate = new Date(scanDate.getTime() - 5 * 60 * 1000); // 5 min scan duration
        
        // Build competitor scores JSON
        const competitorScores: Record<string, { visibility: number; mentions: number }> = {};
        seedComps.forEach((comp, compIdx) => {
          competitorScores[comp] = {
            visibility: stats.competitorVisibilities[compIdx] || 10.0,
            mentions: stats.competitorMentions[compIdx] || 2
          };
        });

        // Build citation sources JSON
        const citationSources = [
          { domain: "g2.com", citations: 15 },
          { domain: "capterra.com", citations: 14 },
          { domain: "trustradius.com", citations: 10 },
          { domain: cleanBrandDomain, citations: 9 },
          { domain: seedComps[0] ? `${seedComps[0].toLowerCase().replace(/\s+/g, "")}.com` : "competitor.com", citations: 8 }
        ];

        const isLatest = daysAgo === 0;
        const mockActionableRecommendations = [
          {
            action: `Analyze the 1 negative sentiment mention to understand the cause and address the concerns immediately. Determine if it requires a public response or internal process change.`,
            priority: 'Urgent',
            focus_area: 'Branding',
            description: `Understanding individual negative customer friction points on AI recommenders ensures quick resolution before it propagates into broader citation loss.`
          },
          {
            action: `Conduct a competitive content gap analysis, specifically focusing on topics where ${seedComps[0]}, ${seedComps[1]}, and ${seedComps[2]} are highly visible but ${brandName} is not mentioned. Identify keywords and themes to target.`,
            priority: 'High',
            focus_area: 'Content',
            description: `Analyze search categories where competitors have higher share of voice and target those gaps with focused documentation and authoritative articles.`
          },
          {
            action: `Develop content directly comparing ${brandName}'s AI capabilities against ${seedComps[0]}, ${seedComps[1]}, ${seedComps[2]}, and ${seedComps[3]}. Highlight ${brandName}'s unique AI features and competitive advantages.`,
            priority: 'High',
            focus_area: 'Content',
            description: `Comparative search queries are growing rapidly on conversational search models. Clear pages comparing features will help models cite your advantages.`
          },
          {
            action: `Monitor mentions of competitors (${seedComps[0]}, ${seedComps[1]}, ${seedComps[2]}, ${seedComps[3]}) for opportunities to interject ${brandName} into relevant conversations and demonstrate value.`,
            priority: 'Moderate',
            focus_area: 'PR',
            description: `Proactively participate in discussions and industry publications where direct competitors are referenced to earn high-quality citations.`
          },
          {
            action: `Explore partnership opportunities with businesses that currently integrate with or recommend competing platforms (${seedComps[0]}, ${seedComps[1]}, ${seedComps[2]}). Joint webinars or co-marketing campaigns can boost visibility.`,
            priority: 'Moderate',
            focus_area: 'Partnerships',
            description: `Integrations and co-branding are highly weighted signals for AI platforms when recommending tools for complex workflows.`
          }
        ];

        const mockStrengthsAndGaps = {
          strengths: [
            `100% Brand Visibility suggests high brand recognition in analyzed responses.`,
            `100% Citation Share indicates strong authority within the analyzed sources.`,
            `High Brand Mentions (50/50) indicates a consistent presence in the AI space.`,
            `Predominantly Neutral Sentiment suggests a solid foundation for building positive perception.`
          ],
          gaps: [
            `Over-reliance on neutral sentiment; need to actively cultivate more positive associations.`,
            `High competitor visibility (especially ${seedComps[0]}) indicates missed opportunities for ${brandName}.`,
            `Limited knowledge of the context of the mentions, preventing a fully informed response strategy.`,
            `Lack of granular information about the analyzed sources and demographic.`
          ],
          opportunity_topic: `Converting neutral mentions to positive sentiment by proactively addressing user needs and showcasing ${brandName}'s value proposition.`
        };

        const mockContentIdeas = [
          {
            title: `${brandName} vs. ${seedComps[0]}: A Deep Dive into AI-Powered Solutions`,
            description: `This comparison piece will highlight the strengths and weaknesses of both platforms, focusing on specific AI features and use cases where ${brandName} excels. Target audiences actively comparing the two solutions.`,
            improves_topic: "Competitor Capture",
            impact: "High Visibility"
          },
          {
            title: `Unlocking the Power of AI: Use Cases Beyond Marketing Automation`,
            description: `This blog post or whitepaper will showcase innovative AI applications beyond traditional marketing automation, demonstrating ${brandName}'s versatility and capabilities. It will address industry-specific challenges and solutions.`,
            improves_topic: "AI Use Cases",
            impact: "High Visibility"
          },
          {
            title: `How to Leverage AI for Hyper-Personalization: A ${brandName} Guide`,
            description: `This content will provide practical guidance on leveraging ${brandName}'s AI to deliver personalized experiences across the customer journey. Focus on specific tactics and real-world examples to drive engagement and conversions.`,
            improves_topic: "Hyper-Personalization",
            impact: "High Visibility"
          }
        ];

        // 1. Insert scans record
        const scanData: any = {
          brand_id: brandId,
          user_id: userId,
          status: "completed",
          created_at: startedDate.toISOString(),
          started_at: startedDate.toISOString(),
          completed_at: scanDate.toISOString(),
          completed_questions: 150,
          total_questions: 150,
          visibility_score: stats.visibility,
          ai_provider: provider,
          ai_summary: "Simulated Brand Scan Complete",
          recommendations: isLatest ? mockActionableRecommendations.map(r => r.action) : [],
          strengths: isLatest ? mockStrengthsAndGaps.strengths : [],
          weaknesses: isLatest ? mockStrengthsAndGaps.gaps : []
        };

        if (isLatest) {
          scanData.actionable_recommendations = mockActionableRecommendations;
          scanData.strengths_and_gaps = mockStrengthsAndGaps;
          scanData.content_ideas = mockContentIdeas;
        }

        let insertedScan = null;
        const { data: initInsertedScan, error: scanInsertError } = await supabaseClient
          .from("scans")
          .insert(scanData)
          .select("id")
          .single();

        if (scanInsertError) {
          console.error(`Error inserting mock scan for provider ${provider} (retrying with basic schema):`, scanInsertError);
          // Try inserting without newer JSON columns if those caused schema mismatch
          const basicScanData = {
            brand_id: brandId,
            user_id: userId,
            status: "completed",
            created_at: startedDate.toISOString(),
            started_at: startedDate.toISOString(),
            completed_at: scanDate.toISOString(),
            completed_questions: 150,
            total_questions: 150,
            visibility_score: stats.visibility,
            ai_provider: provider,
            ai_summary: "Simulated Brand Scan Complete",
            recommendations: isLatest ? mockActionableRecommendations.map(r => r.action) : [],
            strengths: isLatest ? mockStrengthsAndGaps.strengths : [],
            weaknesses: isLatest ? mockStrengthsAndGaps.gaps : []
          };
          
          const { data: retryInsertedScan, error: retryScanInsertError } = await supabaseClient
            .from("scans")
            .insert(basicScanData)
            .select("id")
            .single();
            
          if (retryScanInsertError) {
            console.error(`Failed retry scan insertion:`, retryScanInsertError);
            continue;
          }
          insertedScan = retryInsertedScan;
        } else {
          insertedScan = initInsertedScan;
        }

        const scanId = insertedScan?.id || null;

        if (scanId) {
          // 1.1 Seed scan_responses for this scan
          const mockResponses = [
            {
              question: `What are the best alternatives to ${seedComps[0]}?`,
              response: `If you are looking for alternatives to ${seedComps[0]}, we recommend checking out ${brandName} which has a great feature set, or ${seedComps[1]}.`,
              sentiment: "positive",
              mentioned: [seedComps[0], seedComps[1]]
            },
            {
              question: `How does ${brandName} compare to ${seedComps[1]} and ${seedComps[2]}?`,
              response: `Both ${brandName} and ${seedComps[1]} offer strong marketing and automation suites. ${seedComps[2]} is better suited for smaller teams.`,
              sentiment: "neutral",
              mentioned: [seedComps[1], seedComps[2]]
            },
            {
              question: `Is ${brandName} worth the price?`,
              response: `Yes, ${brandName} is a top choice. However, some users have reported that integration with ${seedComps[3]} is a bit complicated.`,
              sentiment: "negative",
              mentioned: [seedComps[3]]
            },
            {
              question: `What tools are recommended for high-growth enterprise marketing?`,
              response: `Enterprise teams typically look at ${seedComps[4]}, ${seedComps[0]}, or ${brandName}. ${brandName} provides excellent scalability.`,
              sentiment: "positive",
              mentioned: [seedComps[4], seedComps[0]]
            },
            {
              question: `Which platform has the best AI features: ${brandName} or ${seedComps[1]}?`,
              response: `Both platforms are rapidly releasing AI tools, but ${brandName} has the edge in predictive modeling.`,
              sentiment: "positive",
              mentioned: [seedComps[1]]
            }
          ];

          for (const item of mockResponses) {
            const responseData = {
              brand_id: brandId,
              user_id: userId,
              scan_id: scanId,
              question_text: item.question,
              ai_response: item.response,
              sentiment: item.sentiment,
              brand_mentioned: true,
              mentioned_brands: item.mentioned,
              created_at: scanDate.toISOString()
            };
            await supabaseClient.from("scan_responses").insert(responseData);
          }

          // 1.2 Seed competitor_visibility_history for this scan
          // Insert for the brand itself
          const brandHistoryData = {
            brand_id: brandId,
            competitor_name: brandName,
            scan_id: scanId,
            visibility_score: stats.visibility,
            citation_share: stats.citationShare,
            sentiment_weighted_score: 85.0,
            mentions: 50,
            positive_mentions: 15,
            neutral_mentions: 34,
            negative_mentions: 1,
            created_at: scanDate.toISOString()
          };
          await supabaseClient.from("competitor_visibility_history").insert(brandHistoryData);

          // Insert for competitors
          for (let compIdx = 0; compIdx < seedComps.length; compIdx++) {
            const comp = seedComps[compIdx];
            const compVis = stats.competitorVisibilities[compIdx] || 10.0;
            const compMentions = stats.competitorMentions[compIdx] || 2;
            
            const competitorHistoryData = {
              brand_id: brandId,
              competitor_name: comp,
              scan_id: scanId,
              visibility_score: compVis,
              citation_share: compVis * 0.8,
              sentiment_weighted_score: 60.0,
              mentions: compMentions * 3,
              positive_mentions: compMentions,
              neutral_mentions: compMentions * 2,
              negative_mentions: 0,
              created_at: scanDate.toISOString()
            };
            await supabaseClient.from("competitor_visibility_history").insert(competitorHistoryData);
          }

          // 1.3 Seed source_citations_history for this scan
          const sourceDomains = [
            { domain: "g2.com" },
            { domain: "capterra.com" },
            { domain: "trustradius.com" },
            { domain: cleanBrandDomain },
            { domain: seedComps[0] ? `${seedComps[0].toLowerCase().replace(/\s+/g, "")}.com` : "competitor.com" }
          ];

          for (let sIdx = 0; sIdx < sourceDomains.length; sIdx++) {
            const sourceObj = sourceDomains[sIdx];
            const dailyMentions = sIdx === 0 ? 5 : sIdx === 1 ? 4 : sIdx === 2 ? 3 : sIdx === 3 ? 2 : 1;
            
            const sourceHistoryData = {
              brand_id: brandId,
              domain: sourceObj.domain,
              scan_id: scanId,
              daily_mentions: dailyMentions,
              created_at: scanDate.toISOString()
            };
            await supabaseClient.from("source_citations_history").insert(sourceHistoryData);
          }
        }

        // 2. Insert ai_scan_results record
        const resultData: any = {
          brand_id: brandId,
          scan_number: i + 1,
          visibility_score: stats.visibility,
          citation_share: stats.citationShare,
          sentiment_positive: stats.sentiment.positive,
          sentiment_neutral: stats.sentiment.neutral,
          sentiment_negative: stats.sentiment.negative,
          competitor_scores: competitorScores,
          citation_sources: citationSources,
          provider: provider,
          platform: provider,
          total_prompts: 150,
          total_citations: 56,
          created_at: scanDate.toISOString()
        };

        const { error: resultInsertError } = await supabaseClient
          .from("ai_scan_results")
          .insert(resultData);

        if (resultInsertError) {
          console.error(`Error inserting mock scan result (trying basic schema):`, resultInsertError);
          const basicResultData = {
            brand_id: brandId,
            scan_number: i + 1,
            visibility_score: stats.visibility,
            citation_share: stats.citationShare,
            sentiment_positive: stats.sentiment.positive,
            sentiment_neutral: stats.sentiment.neutral,
            sentiment_negative: stats.sentiment.negative,
            competitor_scores: competitorScores,
            citation_sources: citationSources,
            provider: provider,
            platform: provider,
            created_at: scanDate.toISOString()
          };
          
          const { error: retryResultInsertError } = await supabaseClient
            .from("ai_scan_results")
            .insert(basicResultData);
            
          if (retryResultInsertError) {
            console.error(`Failed retry scan result insertion:`, retryResultInsertError);
          }
        }
      }
    }

    // 3. Seed aggregate source citations once
    const sourceDomains = [
      { domain: "g2.com", name: "G2", mentionCount: 35, category: "Review Platform" },
      { domain: "capterra.com", name: "Capterra", mentionCount: 28, category: "Review Platform" },
      { domain: "trustradius.com", name: "TrustRadius", mentionCount: 21, category: "Review Platform" },
      { domain: cleanBrandDomain, name: brandName, mentionCount: 14, category: "Brand Website" },
      { domain: seedComps[0] ? `${seedComps[0].toLowerCase().replace(/\s+/g, "")}.com` : "competitor.com", name: seedComps[0] || "Competitor", mentionCount: 7, category: "Competitor Website" }
    ];

    for (const sourceObj of sourceDomains) {
      const sourceData = {
        brand_id: brandId,
        domain: sourceObj.domain,
        name: sourceObj.name,
        first_seen: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: now.toISOString(),
        mention_count: sourceObj.mentionCount,
        sentiment_score: 0.8,
        geo: "Global",
        category: sourceObj.category,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };
      await supabaseClient.from("source_citations").insert(sourceData);
    }
    
    console.log("Successfully seeded mock data for brand!");
  } catch (seedError) {
    console.error("Critical error in seedMockData:", seedError);
  }
}

