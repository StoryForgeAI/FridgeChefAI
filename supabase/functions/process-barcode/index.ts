import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';
import OpenAI from 'https://esm.sh/openai@4.14.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
});

const planItemLimits = {
  free: 5,
  standard: 10,
  pro: 50,
  chef: 100
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const { barcode, mode = 'preview', name: incomingName, kcal: incomingKcal, image_url: incomingImageUrl } = await req.json();
  if (!barcode) {
    return new Response(JSON.stringify({ error: 'Barcode required' }), { status: 400, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const [{ data: profile }, pantryCountResult] = await Promise.all([
    supabase.from('profiles').select('tier, subscription_tier, item_limit').eq('id', user.id).single(),
    supabase.from('pantry_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  ]);

  const tier = profile?.subscription_tier ?? profile?.tier ?? 'free';
  const itemLimit = profile?.item_limit ?? planItemLimits[tier as keyof typeof planItemLimits];
  const currentCount = pantryCountResult.count || 0;

  if (currentCount >= itemLimit) {
    return new Response(JSON.stringify({ error: `Plan limit reached. Your tier allows ${itemLimit} pantry items.` }), {
      status: 403,
      headers: corsHeaders
    });
  }

  let name: string | undefined = incomingName;
  let kcal: number | undefined = typeof incomingKcal === 'number' ? incomingKcal : undefined;
  let imageUrl: string | null | undefined = incomingImageUrl;

  if (mode === 'preview' || !name) {
    try {
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const offData = await offResponse.json();
      name = offData.product?.product_name || offData.product?.generic_name;
      kcal = Number(offData.product?.nutriments?.['energy-kcal_100g']) || 0;
      imageUrl = offData.product?.image_front_url || offData.product?.image_url || null;
    } catch {
      // Fall through to OpenAI fallback.
    }
  }

  if (!name) {
    try {
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Return valid JSON {"name": string, "kcal": number} for grocery barcode ${barcode}. If unknown, return {"name":"Unknown Product","kcal":0}.`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const aiData = JSON.parse(aiResponse.choices[0].message.content || '{}');
      name = aiData.name;
      kcal = Number(aiData.kcal) || 0;
    } catch {
      name = 'Unknown Product';
      kcal = 0;
    }
  }

  if (mode === 'preview') {
    return new Response(
      JSON.stringify({
        barcode,
        name: name || 'Unknown Product',
        kcal: kcal || 0,
        image_url: imageUrl || null
      }),
      {
        headers: corsHeaders
      }
    );
  }

  const { data: pantryItem, error: insertError } = await supabase
    .from('pantry_items')
    .insert({
      user_id: user.id,
      barcode,
      name: name || 'Unknown Product',
      kcal: kcal || null
    })
    .select()
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
  }

  const { data: stats } = await supabase
    .from('stats')
    .select('total_pantry_items, extra_stats')
    .eq('user_id', user.id)
    .maybeSingle();

  if (stats) {
    const currentCalories = Number(stats.extra_stats?.total_calories_scanned || 0);
    await supabase
      .from('stats')
      .update({
        total_pantry_items: (stats.total_pantry_items || 0) + 1,
        extra_stats: {
          ...(stats.extra_stats || {}),
          total_calories_scanned: currentCalories + (kcal || 0)
        }
      })
      .eq('user_id', user.id);
  }

  return new Response(JSON.stringify(pantryItem), {
    headers: corsHeaders
  });
});
