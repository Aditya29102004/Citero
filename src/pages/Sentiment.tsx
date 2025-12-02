import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { cleanAIResponse, isDuplicateResponse, hasBrandReference, createResponseFingerprint } from "@/lib/utils/cleanAIResponse";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const Sentiment = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [topicSentiment, setTopicSentiment] = useState<any[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [recentMentions, setRecentMentions] = useState<any[]>([]);
  const [sentimentTrend, setSentimentTrend] = useState<any[]>([]);
  const [brandName, setBrandName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBrands();
    }
  }, [session]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchSentimentData();
    }
  }, [selectedBrandId]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name")
      .eq("user_id", session?.user?.id)
      .order("name");

    if (data) {
      setBrands(data);
      if (data.length > 0 && !selectedBrandId) {
        setSelectedBrandId(data[0].id);
        setBrandName(data[0].name);
      }
    }
  };

  const fetchSentimentData = async () => {
    try {
      // Get brand name
      const { data: brandData } = await supabase
        .from("brands")
        .select("name")
        .eq("id", selectedBrandId)
        .single();
      
      const currentBrandName = brandData?.name || "";
      setBrandName(currentBrandName);

      // Fetch scan responses - get ALL responses for proper aggregation
      const { data: allResponses } = await supabase
        .from("scan_responses")
        .select("sentiment, created_at, question_text, ai_response, brand_mentioned, scan_id")
        .eq("brand_id", selectedBrandId)
        .order("created_at", { ascending: false });

      if (!allResponses || allResponses.length === 0) {
        setSentimentData(null);
        return;
      }

      // Clean all responses
      const cleanedResponses = allResponses.map(r => ({
        ...r,
        cleaned_response: cleanAIResponse(r.ai_response || "", currentBrandName),
      }));

      // 1. SENTIMENT AGGREGATION - Count by sentiment, excluding duplicates with aggressive deduplication
      const uniqueResponses = new Map<string, any>();
      const seenFingerprints = new Set<string>();
      
      // Sort by date to keep most recent version of duplicates
      const sortedForDedup = [...cleanedResponses].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      sortedForDedup.forEach(r => {
        const cleaned = r.cleaned_response || "";
        const fingerprint = createResponseFingerprint(cleaned, currentBrandName);
        
        // Check if we've seen a similar response
        let isDuplicate = false;
        for (const seen of seenFingerprints) {
          if (isDuplicateResponse(cleaned, seen, currentBrandName)) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          seenFingerprints.add(cleaned);
          const key = `${r.sentiment || 'neutral'}_${fingerprint}`;
          if (!uniqueResponses.has(key)) {
            uniqueResponses.set(key, r);
          }
        }
      });

      const uniqueArray = Array.from(uniqueResponses.values());
      const positiveCount = uniqueArray.filter(r => r.sentiment === 'positive').length;
      const neutralCount = uniqueArray.filter(r => r.sentiment === 'neutral').length;
      const negativeCount = uniqueArray.filter(r => r.sentiment === 'negative').length;
      const total = positiveCount + neutralCount + negativeCount;

      const positivePercent = total > 0 ? ((positiveCount / total) * 100).toFixed(1) : "0.0";
      const neutralPercent = total > 0 ? ((neutralCount / total) * 100).toFixed(1) : "0.0";
      const negativePercent = total > 0 ? ((negativeCount / total) * 100).toFixed(1) : "0.0";

      setSentimentData({
        positive: positivePercent,
        neutral: neutralPercent,
        negative: negativePercent,
        total,
        pieData: [
          { name: "Positive", value: positiveCount, color: "#10b981" },
          { name: "Neutral", value: neutralCount, color: "#6b7280" },
          { name: "Negative", value: negativeCount, color: "#ef4444" },
        ],
      });

      // 2. TOPIC-LEVEL SENTIMENT
      const topics = ['Product', 'Brand Trust', 'Reputation', 'Competitors', 'Use Cases', 'Market Position'];
      const topicKeywords: Record<string, string[]> = {
        'Product': ['product', 'service', 'feature', 'functionality', 'capability'],
        'Brand Trust': ['trust', 'reliable', 'credible', 'trustworthy', 'dependable'],
        'Reputation': ['reputation', 'reviews', 'rating', 'feedback', 'testimonial'],
        'Competitors': ['competitor', 'alternative', 'compare', 'versus', 'vs', 'competition'],
        'Use Cases': ['use case', 'scenario', 'application', 'use', 'purpose'],
        'Market Position': ['market', 'position', 'leader', 'industry', 'sector'],
      };

      const topicMap: Record<string, { positive: number; neutral: number; negative: number; mentions: number; recent: number[] }> = {};
      
      topics.forEach(topic => {
        topicMap[topic] = { positive: 0, neutral: 0, negative: 0, mentions: 0, recent: [] };
      });

      // Group responses by scan for trend calculation
      const responsesByScan = new Map<string, any[]>();
      cleanedResponses.forEach(r => {
        const scanId = r.scan_id || 'unknown';
        if (!responsesByScan.has(scanId)) {
          responsesByScan.set(scanId, []);
        }
        responsesByScan.get(scanId)!.push(r);
      });

      const scanIds = Array.from(responsesByScan.keys()).sort((a, b) => {
        const scanA = cleanedResponses.find(r => r.scan_id === a);
        const scanB = cleanedResponses.find(r => r.scan_id === b);
        return new Date(scanB?.created_at || 0).getTime() - new Date(scanA?.created_at || 0).getTime();
      });

      cleanedResponses.forEach(r => {
        const responseText = (r.cleaned_response || r.ai_response || "").toLowerCase();
        const questionText = (r.question_text || "").toLowerCase();
        const combinedText = responseText + " " + questionText;

        topics.forEach(topic => {
          const keywords = topicKeywords[topic];
          const matches = keywords.some(keyword => combinedText.includes(keyword));
          
          if (matches) {
            topicMap[topic].mentions++;
            const sentiment = r.sentiment || 'neutral';
            if (sentiment === 'positive') topicMap[topic].positive++;
            else if (sentiment === 'neutral') topicMap[topic].neutral++;
            else if (sentiment === 'negative') topicMap[topic].negative++;
            
            // Track recent mentions (last 3 scans)
            const scanIndex = scanIds.indexOf(r.scan_id || 'unknown');
            if (scanIndex < 3) {
              topicMap[topic].recent.push(sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0);
            }
          }
        });
      });

      const topicList = topics.map(topic => {
        const data = topicMap[topic];
        const total = data.positive + data.neutral + data.negative;
        const dominantSentiment = data.positive >= data.neutral && data.positive >= data.negative ? 'positive' :
                                 data.neutral >= data.negative ? 'neutral' : 'negative';
        
        // Calculate trend: compare last 3 scans vs older scans
        const recentScore = data.recent.reduce((sum, s) => sum + s, 0) / Math.max(data.recent.length, 1);
        const olderResponses = cleanedResponses.filter(r => {
          const scanIndex = scanIds.indexOf(r.scan_id || 'unknown');
          return scanIndex >= 3;
        });
        const olderScore = olderResponses.length > 0 ? 
          olderResponses.reduce((sum, r) => {
            const keywords = topicKeywords[topic];
            const matches = keywords.some(k => (r.cleaned_response + " " + r.question_text).toLowerCase().includes(k));
            if (matches) {
              const s = r.sentiment || 'neutral';
              return sum + (s === 'positive' ? 1 : s === 'negative' ? -1 : 0);
            }
            return sum;
          }, 0) / olderResponses.length : 0;
        
        let trend = 'stable';
        if (data.recent.length > 0 && olderResponses.length > 0) {
          if (recentScore > olderScore + 0.2) trend = 'improving';
          else if (recentScore < olderScore - 0.2) trend = 'declining';
        }

        return {
          topic,
          sentiment: dominantSentiment,
          mentions: data.mentions,
          trend,
        };
      }).filter(t => t.mentions > 0);

      setTopicSentiment(topicList);

      // 3. STRENGTHS & WEAKNESSES - Extract from responses
      const positiveResponses = cleanedResponses.filter(r => r.sentiment === 'positive');
      const negativeResponses = cleanedResponses.filter(r => r.sentiment === 'negative' || (r.sentiment === 'neutral' && r.cleaned_response.toLowerCase().includes('but') || r.cleaned_response.toLowerCase().includes('however')));

      // Extract noun phrases from positive responses
      const strengthsSet = new Set<string>();
      positiveResponses.forEach(r => {
        const text = r.cleaned_response || "";
        // Extract phrases after positive indicators
        const phrases = text.match(/(?:excellent|great|strong|good|effective|powerful|reliable|innovative|leading|top|best)\s+([^.!?]+)/gi);
        if (phrases) {
          phrases.forEach(phrase => {
            const cleaned = phrase.replace(/^(excellent|great|strong|good|effective|powerful|reliable|innovative|leading|top|best)\s+/i, '').trim();
            if (cleaned.length > 10 && cleaned.length < 100) {
              strengthsSet.add(cleaned);
            }
          });
        }
      });
      setStrengths(Array.from(strengthsSet).slice(0, 5));

      // Extract weaknesses
      const weaknessesSet = new Set<string>();
      negativeResponses.forEach(r => {
        const text = r.cleaned_response || "";
        const phrases = text.match(/(?:limited|lacks|weak|poor|issues|concerns|challenges|problems|difficulties)\s+([^.!?]+)/gi);
        if (phrases) {
          phrases.forEach(phrase => {
            const cleaned = phrase.replace(/^(limited|lacks|weak|poor|issues|concerns|challenges|problems|difficulties)\s+/i, '').trim();
            if (cleaned.length > 10 && cleaned.length < 100) {
              weaknessesSet.add(cleaned);
            }
          });
        }
      });
      setWeaknesses(Array.from(weaknessesSet).slice(0, 5));

      // 4. RECENT AI MENTIONS - Ultra-aggressive deduplication and filter
      // Group by question and deduplicate responses per question
      const questionGroups = new Map<string, any[]>();
      
      // First, group responses by cleaned question
      cleanedResponses.forEach(r => {
        // Clean the question too - remove brand description echoing
        let cleanedQuestion = r.question_text || "";
        
        // Remove brand description from question
        if (currentBrandName) {
          const brandDescPattern = new RegExp(
            `${currentBrandName}\\s+is\\s+(a|an)\\s+(platform|service|company|tool|solution|product)[^?]*`,
            'gi'
          );
          cleanedQuestion = cleanedQuestion.replace(brandDescPattern, '').trim();
          
          // Remove repeated brand descriptions
          const brandDesc = `${currentBrandName} is a platform that connects`;
          if (cleanedQuestion.includes(brandDesc)) {
            cleanedQuestion = cleanedQuestion.replace(new RegExp(brandDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
          }
        }
        
        // Normalize question for grouping
        const normalizedQuestion = cleanedQuestion
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100);
        
        if (!questionGroups.has(normalizedQuestion)) {
          questionGroups.set(normalizedQuestion, []);
        }
        
        questionGroups.get(normalizedQuestion)!.push({
          ...r,
          cleaned_question: cleanedQuestion,
        });
      });
      
      const validMentions: any[] = [];
      const seenQuestionResponsePairs = new Set<string>();
      
      // Process each question group
      questionGroups.forEach((responses, normalizedQuestion) => {
        // Sort by date (most recent first)
        const sorted = responses.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // For each question, only keep unique responses
        const uniqueResponsesForQuestion: any[] = [];
        const seenResponsesForQuestion: string[] = [];
        
        sorted.forEach(r => {
          const cleaned = r.cleaned_response || "";
          
          // Skip if no brand reference and not mentioned
          if (!r.brand_mentioned && !hasBrandReference(cleaned || r.ai_response || "", currentBrandName)) {
            return;
          }

          // Skip if cleaned response is too short
          if (cleaned.length < 20) return;
          
          // Check if this response is duplicate for this question
          let isDuplicate = false;
          for (const seen of seenResponsesForQuestion) {
            if (isDuplicateResponse(cleaned, seen, currentBrandName)) {
              isDuplicate = true;
              break;
            }
          }
          
          if (isDuplicate) return;
          
          // Also check against all other question-response pairs
          const pairKey = `${normalizedQuestion}_${cleaned.substring(0, 50).toLowerCase().trim()}`;
          if (seenQuestionResponsePairs.has(pairKey)) {
            return;
          }
          
          seenResponsesForQuestion.push(cleaned);
          seenQuestionResponsePairs.add(pairKey);
          
          uniqueResponsesForQuestion.push(r);
        });
        
        // Add unique responses for this question (limit to 2 per question to avoid spam)
        uniqueResponsesForQuestion.slice(0, 2).forEach(r => {
          validMentions.push({
            question: r.cleaned_question || r.question_text || "",
            response: r.cleaned_response.substring(0, 200),
            sentiment: r.sentiment || "neutral",
            mentioned: r.brand_mentioned || false,
            date: r.created_at,
          });
        });
      });
      
      // Sort by date and limit to 15
      validMentions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setRecentMentions(validMentions.slice(0, 15));

      setRecentMentions(validMentions);

      // 5. SENTIMENT TREND - Last 10 scans averaged
      const scans = Array.from(responsesByScan.entries())
        .map(([scanId, responses]) => ({
          scanId,
          date: responses[0]?.created_at || new Date().toISOString(),
          positive: responses.filter(r => r.sentiment === 'positive').length,
          neutral: responses.filter(r => r.sentiment === 'neutral').length,
          negative: responses.filter(r => r.sentiment === 'negative').length,
          total: responses.length,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .reverse();

      const trendData = scans.map(scan => ({
        date: new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive: scan.total > 0 ? ((scan.positive / scan.total) * 100).toFixed(1) : 0,
        neutral: scan.total > 0 ? ((scan.neutral / scan.total) * 100).toFixed(1) : 0,
        negative: scan.total > 0 ? ((scan.negative / scan.total) * 100).toFixed(1) : 0,
      }));

      setSentimentTrend(trendData);
    } catch (error) {
      console.error("Error fetching sentiment data:", error);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-white">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-white">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Sentiment</h1>
                <p className="text-gray-600">AI-perceived sentiment around your brand</p>
              </div>

              {brands.length > 0 && (
                <div className="mb-6">
                  <Select value={selectedBrandId} onValueChange={(value) => {
                    setSelectedBrandId(value);
                    const brand = brands.find(b => b.id === value);
                    if (brand) setBrandName(brand.name);
                  }}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!selectedBrandId ? (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <p className="text-gray-600">Select a brand to view sentiment analysis</p>
                </Card>
              ) : !sentimentData ? (
                <Card className="p-12 text-center border border-gray-200 bg-white">
                  <p className="text-gray-600">No sentiment data available. Run a GEO Scan to generate sentiment analysis.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Sentiment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border border-green-200 bg-green-50">
                      <p className="text-sm font-medium text-gray-600 mb-2">Positive</p>
                      <p className="text-3xl font-semibold text-green-600">{sentimentData.positive}%</p>
                    </Card>
                    <Card className="p-6 border border-gray-200 bg-gray-50">
                      <p className="text-sm font-medium text-gray-600 mb-2">Neutral</p>
                      <p className="text-3xl font-semibold text-gray-600">{sentimentData.neutral}%</p>
                    </Card>
                    <Card className="p-6 border border-red-200 bg-red-50">
                      <p className="text-sm font-medium text-gray-600 mb-2">Negative</p>
                      <p className="text-3xl font-semibold text-red-600">{sentimentData.negative}%</p>
                    </Card>
                  </div>

                  {/* Pie Chart */}
                  <Card className="p-6 border border-gray-200 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Sentiment Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sentimentData.pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sentimentData.pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Topic-level Sentiment Table */}
                  {topicSentiment.length > 0 && (
                    <Card className="p-6 border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Topic-level Sentiment</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Topic</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Sentiment</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Mentions</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Trend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topicSentiment.map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-900">{item.topic}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                                    {item.sentiment}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700 text-right">{item.mentions}</td>
                                <td className="py-3 px-4 text-sm text-gray-500 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {item.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-600" />}
                                    {item.trend === 'declining' && <TrendingDown className="h-4 w-4 text-red-600" />}
                                    {item.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                                    <span className="capitalize">{item.trend}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* Strengths & Weaknesses */}
                  {(strengths.length > 0 || weaknesses.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {strengths.length > 0 && (
                        <Card className="p-6 border border-green-200 bg-green-50">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strengths</h3>
                          <ul className="space-y-2">
                            {strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {strength}</li>
                            ))}
                          </ul>
                        </Card>
                      )}
                      {weaknesses.length > 0 && (
                        <Card className="p-6 border border-red-200 bg-red-50">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weaknesses</h3>
                          <ul className="space-y-2">
                            {weaknesses.map((weakness, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {weakness}</li>
                            ))}
                          </ul>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Sentiment Trend Graph */}
                  {sentimentTrend.length > 0 && (
                    <Card className="p-6 border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Sentiment Trend (Last 10 Scans)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={sentimentTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} name="Positive" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} name="Neutral" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} name="Negative" dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Recent AI Mentions */}
                  {recentMentions.length > 0 && (
                    <Card className="p-6 border border-gray-200 bg-white">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent AI Mentions ({recentMentions.length})</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Question</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Sentiment</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Mentioned?</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentMentions.map((mention, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-900 max-w-md">{mention.question}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(mention.sentiment)}`}>
                                    {mention.sentiment}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-sm font-medium ${mention.mentioned ? 'text-green-600' : 'text-gray-500'}`}>
                                    {mention.mentioned ? 'Yes' : 'No'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500 text-right">
                                  {new Date(mention.date).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Sentiment;
