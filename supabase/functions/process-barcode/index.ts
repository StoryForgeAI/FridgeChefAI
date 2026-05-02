import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';
import OpenAI from 'https://esm.sh/openai@4.14.2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const openai = new OpenAI(Deno.env.get('OPENAI_API_KEY')!);

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { barcode } = await req.json();
  if (!barcode) return new Response('Barcode required', { status: 400 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  // Fetch from Open Food Facts
  let name: string | undefined;
  let kcal: number | undefined;
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const offData = await offRes.json();
    name = offData.product?.product_name;
    kcal = offData.product?.nutriments?.['energy-kcal_100g'];
  } catch {}

  // Fallback to OpenAI
  if (!name) {
    try {
      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Return valid JSON {"name": string, "kcal": number} for grocery barcode ${barcode}. If unknown, return {"name": "Unknown Product", "kcal": 0}`
        }],
        response_format: { type: 'json_object' }
      });
      const aiData = JSON.parse(aiRes.choices[0].message.content!);
      name = aiData.name;
      kcal = aiData.kcal;
    } catch (e) {
      console.error('OpenAI fallback error:', e);
      name = 'Unknown Product';
      kcal = 0;
    }
  }

  const { data, error } = await supabase.from('pantry_items').insert({
    user_id: user.id,
    barcode,
    name: name || 'Unknown Product',
    kcal: kcal || null
  }).select().single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Update stats
  await supabase.from('stats').update({
    total_pantry_items: supabase.rpc('increment', { row_id: user.id, table_name: 'stats', column_name: 'total_pantry_items' })
  }).eq('user_id', user.id);

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
