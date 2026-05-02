'use client';

import { useEffect, useState } from 'react';
import { ChefHat, ScrollText } from 'lucide-react';
import RecipeDiscovery from '@/components/recipe/RecipeDiscovery';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type PantryItem, type Profile } from '@/lib/types';

export default function RecipesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecipeStudio();
  }, []);

  async function loadRecipeStudio() {
    const supabase = createBrowserClient();

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [profileResult, pantryResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('pantry_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      setProfile(profileResult.data);
      setPantry(pantryResult.data || []);
    } catch (recipeStudioError) {
      setError(recipeStudioError instanceof Error ? recipeStudioError.message : 'Failed to load recipe studio.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="panel p-6 text-center text-zinc-300">Loading recipe studio...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>;
  }

  const tier = resolveProfileTier(profile);
  const tierConfig = STRIPE_TIERS[tier];

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Recipes</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Recipe Studio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Choose exactly which ingredients to use, apply your filters, and get a tighter recipe set built for
              phone screens.
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <ScrollText className="h-5 w-5 text-yellow-300" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          <ChefHat className="h-4 w-4" />
          Showing the best {Math.min(tierConfig.recipeSuggestions, 3)} recipes to keep the mobile flow tight.
        </div>
      </section>

      <RecipeDiscovery pantry={pantry} recipeLimit={tierConfig.recipeSuggestions} resultLimit={3} />
    </div>
  );
}
