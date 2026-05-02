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

  const { ingredients, max_calories, allergies, servings = 1 } = await req.json();
  if (!ingredients?.length) return new Response('Ingredients required', { status: 400 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  // Check credits
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits, tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return new Response('Profile not found', { status: 404 });
  if (profile.credits < 1) return new Response('Insufficient credits', { status: 403 });

  // Generate recipes via OpenAI
  const allergyStr = allergies?.length ? `Avoid these allergens: ${allergies.join(', ')}.` : '';
  const calorieStr = max_calories ? `Max calories per serving: ${max_calories}.` : '';
  const prompt = `Return valid JSON {"recipes": [array of 5 recipe objects]} where each recipe has:
- "title": string (recipe name)
- "description": string (short 1-2 sentence description)
- "ingredients": string[] (required ingredients with quantities)
- "steps": string[] (numbered preparation steps)
- "kcal_per_serving": number (calories per serving)

Use these ingredients: ${ingredients.join(', ')}. ${servings} servings. ${calorieStr} ${allergyStr}`;

  try {
    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const { recipes } = JSON.parse(aiRes.choices[0].message.content!);

    // Deduct credit
    await supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', user.id);

    // Save to history
    await supabase.from('recipes_history').insert({
      user_id: user.id,
      ingredients,
      recipe: recipes,
      max_calories,
      allergies,
      servings
    });

    // Update stats
    await supabase.from('stats').update({
      total_recipes_generated: supabase.rpc('increment', { row_id: user.id, table_name: 'stats', column_name: 'total_recipes_generated' }),
      total_credits_used: supabase.rpc('increment', { row_id: user.id, table_name: 'stats', column_name: 'total_credits_used' })
    }).eq('user_id', user.id);

    return new Response(JSON.stringify(recipes), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to generate recipes' }), { status: 500 });
  }
});
