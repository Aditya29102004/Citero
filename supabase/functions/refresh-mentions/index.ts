import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { brandName } = await req.json();
    console.log('Refreshing mentions for brand:', brandName);

    // Find the brand by name for this user
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('name', brandName)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found');
    }

    // Generate dummy mentions
    const sources = ['Twitter', 'Reddit', 'News Article', 'Blog Post', 'YouTube'];
    const sentiments = ['positive', 'neutral', 'negative'];
    const titles = [
      'Great experience with this brand',
      'Product review and comparison',
      'Latest updates and news',
      'Customer feedback and thoughts',
    ];
    const snippets = [
      'Really impressed with the quality and service provided...',
      'Found this interesting after trying it out for a week...',
      'Here are my thoughts on the latest developments...',
      'Comparing this with similar options in the market...',
    ];

    const mentions = [];
    for (let i = 0; i < 4; i++) {
      mentions.push({
        brand_id: brand.id,
        user_id: user.id,
        source: sources[Math.floor(Math.random() * sources.length)],
        title: titles[i],
        snippet: snippets[i],
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
        ai_summary: 'This is a sample AI-generated summary of the mention content.',
      });
    }

    const { error: insertError } = await supabase
      .from('mentions')
      .insert(mentions);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Successfully inserted', mentions.length, 'mentions');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully added ${mentions.length} mentions for ${brandName}` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in refresh-mentions function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
