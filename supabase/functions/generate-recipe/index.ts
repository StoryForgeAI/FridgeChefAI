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

const recipeLimits = {
  free: 5,
  standard: 5,
  pro: 5,
  chef: 10
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  const { ingredients, max_calories, allergies, servings = 1 } = await req.json();
  if (!Array.isArray(ingredients) || !ingredients.length) {
    return new Response(JSON.stringify({ error: 'Ingredients required' }), { status: 400, headers: corsHeaders });
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

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: corsHeaders });
  }

  if (profile.credits < 1) {
    return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 403, headers: corsHeaders });
  }

  const tier = profile.subscription_tier ?? profile.tier ?? 'free';
  const recipeLimit = profile.recipe_suggestion_limit ?? recipeLimits[tier as keyof typeof recipeLimits];
  const allergyStr = allergies?.length ? `Avoid these allergens: ${allergies.join(', ')}.` : '';
  const calorieStr = max_calories ? `Every recipe must stay at or below ${max_calories} kcal per serving.` : '';

  try {
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Return valid JSON {"recipes":[...]} with title, description, ingredients, prep, steps, and kcal_per_serving for each recipe. Use these ingredients: ${ingredients.join(', ')}. Make ${servings} servings. ${calorieStr} ${allergyStr}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content || '{}');
    const normalized = Array.isArray(parsed.recipes) ? parsed.recipes : [];
    const filtered = normalized
      .filter((recipe) => recipe?.title && recipe?.description && Array.isArray(recipe?.ingredients) && Array.isArray(recipe?.steps))
      .filter((recipe) => (typeof max_calories === 'number' ? Number(recipe.kcal_per_serving) <= max_calories : true))
      .slice(0, recipeLimit);

    if (!filtered.length) {
      return new Response(JSON.stringify({ error: 'No recipes matched the calorie target.' }), {
        status: 422,
        headers: corsHeaders
      });
    }

    const { data: history } = await supabase
      .from('recipes_history')
      .insert({
        user_id: user.id,
        ingredients,
        recipe: filtered,
        max_calories,
        allergies,
        servings
      })
      .select('id')
      .single();

    await supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', user.id);

    const { data: stats } = await supabase
      .from('stats')
      .select('total_recipes_generated, total_credits_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (stats) {
      await supabase
        .from('stats')
        .update({
          total_recipes_generated: (stats.total_recipes_generated || 0) + 1,
          total_credits_used: (stats.total_credits_used || 0) + 1
        })
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({ historyId: history?.id, recipes: filtered }), {
      headers: corsHeaders
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to generate recipes' }), { status: 500, headers: corsHeaders });
  }
});
