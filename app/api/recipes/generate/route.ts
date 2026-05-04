import { NextRequest, NextResponse } from 'next/server';
import { filterRecipesByCalories, normalizeRecipes } from '@/lib/recipes';
import { openai } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { resolveProfileTier, STRIPE_TIERS, type Profile } from '@/lib/types';

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ingredients, max_calories, allergies, servings = 1 } = await req.json();
  if (!Array.isArray(ingredients) || !ingredients.length) {
    return NextResponse.json({ error: 'Ingredients required' }, { status: 400 });
  }

  const { data: profileData } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
  const profile = profileData as Profile | null;

  const discount = profile?.discount_percent || 0;
  const baseCost = 10;
  const actualCost = Math.max(1, Math.round(baseCost * (1 - discount)));

  const tierConfig = STRIPE_TIERS[resolveProfileTier(profile)];
  if (!profile || profile.credits < actualCost) {
    return NextResponse.json({ error: `Insufficient credits (need ${actualCost}, have ${profile?.credits || 0})` }, { status: 403 });
  }
  
  const allergyStr = allergies?.length ? `Avoid: ${allergies.join(', ')}.` : '';
  const calorieStr = max_calories ? `Each recipe must remain at or below ${max_calories} kcal per serving.` : '';
  const prompt = `Return valid JSON in the shape {"recipes":[...]}. Generate ${Math.max(tierConfig.recipeSuggestions, 5)} recipe ideas using these ingredients: ${ingredients.join(', ')}. Each recipe object must include title, description, ingredients (string array with quantities), prep (string array), steps (string array), and kcal_per_serving (number). The meal plan should make ${servings} servings. ${calorieStr} ${allergyStr}`;

  try {
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content || '{}');
    const normalized = normalizeRecipes(parsed.recipes);
    const filteredRecipes = filterRecipesByCalories(normalized, max_calories, tierConfig.recipeSuggestions);

    if (!filteredRecipes.length) {
      return NextResponse.json(
        { error: 'No recipes matched the calorie target. Try a higher max calorie value.' },
        { status: 422 }
      );
    }

    const { data: history, error: insertError } = await supabaseAdmin
      .from('recipes_history')
      .insert({
        user_id: user.id,
        ingredients,
        recipe: filteredRecipes,
        max_calories,
        allergies,
        servings
      })
      .select('id')
      .single();

    if (insertError || !history) {
      throw insertError || new Error('Failed to save recipe history.');
    }

    const newTssCredits = Math.max(0, (profile.tss_credits || 0) - 1);
    
    const discount = profile.discount_percent || 0;
    const baseCost = 10;
    const actualCost = Math.max(1, Math.round(baseCost * (1 - discount)));
    const newCredits = Math.max(0, profile.credits - actualCost);

    await supabaseAdmin.from('profiles').update({ 
      credits: newCredits,
      tss_credits: newTssCredits
    }).eq('id', user.id);

    const { data: stats } = await supabaseAdmin
      .from('stats')
      .select('total_recipes_generated, total_credits_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (stats) {
      await supabaseAdmin
        .from('stats')
        .update({
          total_recipes_generated: (stats.total_recipes_generated || 0) + 1,
          total_credits_used: (stats.total_credits_used || 0) + actualCost
        })
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      historyId: history.id,
      recipes: filteredRecipes
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate recipes' }, { status: 500 });
  }
}
