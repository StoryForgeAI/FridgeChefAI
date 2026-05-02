'use client';

import { useEffect, useState } from 'react';
import { Flame, Salad, Sparkles } from 'lucide-react';
import EmptyFridgeState from '@/components/ui/EmptyFridgeState';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type PantryItem, type Profile, type RecipeHistory, type Stats } from '@/lib/types';

type StatsView = {
  profile: Profile | null;
  stats: Stats | null;
  pantry: PantryItem[];
  history: RecipeHistory[];
};

export default function StatsPage() {
  const [data, setData] = useState<StatsView>({
    profile: null,
    stats: null,
    pantry: [],
    history: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const supabase = createBrowserClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [profileResult, statsResult, pantryResult, historyResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('stats').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('pantry_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recipes_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25)
    ]);

    setData({
      profile: profileResult.data,
      stats: statsResult.data,
      pantry: pantryResult.data || [],
      history: (historyResult.data || []) as RecipeHistory[]
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="panel p-6 text-center text-zinc-300">Loading your stats grid...</div>;
  }

  const isEmpty =
    !data.pantry.length &&
    !data.history.length &&
    (data.stats?.total_pantry_items ?? 0) === 0 &&
    (data.stats?.total_recipes_generated ?? 0) === 0;

  if (isEmpty) {
    return (
      <EmptyFridgeState
        title="Empty Fridge, Zero Noise"
        copy="Your stats will light up once you scan groceries and generate recipes. Right now the kitchen grid is waiting for its first signal."
        ctaHref="/scanner"
        ctaLabel="Start Scanning"
      />
    );
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const dailyCalories = data.pantry
    .filter((item) => item.kcal && new Date(item.created_at) >= dayStart)
    .reduce((total, item) => total + (item.kcal ?? 0), 0);
  const weeklyCalories = data.pantry
    .filter((item) => item.kcal && new Date(item.created_at) >= weekStart)
    .reduce((total, item) => total + (item.kcal ?? 0), 0);

  const ingredientUsage = Object.entries(
    data.history.reduce<Record<string, number>>((accumulator, history) => {
      history.ingredients.forEach((ingredient) => {
        const key = ingredient.trim();
        if (!key) {
          return;
        }

        accumulator[key] = (accumulator[key] || 0) + 1;
      });

      return accumulator;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);

  const tierConfig = STRIPE_TIERS[resolveProfileTier(data.profile)];

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Stats</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Macro and pantry intelligence</h1>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
            {tierConfig.label}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Flame className="h-4 w-4 text-yellow-300" />
            Total Calories Scanned
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Daily</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dailyCalories}</p>
            </div>
            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Weekly</p>
              <p className="mt-2 text-2xl font-semibold text-white">{weeklyCalories}</p>
            </div>
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Activity Totals
          </div>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3">
              <span>Recipes generated</span>
              <span className="font-semibold text-white">{data.stats?.total_recipes_generated ?? data.history.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3">
              <span>Pantry items scanned</span>
              <span className="font-semibold text-white">{data.stats?.total_pantry_items ?? data.pantry.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3">
              <span>Credits used</span>
              <span className="font-semibold text-white">{data.stats?.total_credits_used ?? 0}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
          <Salad className="h-4 w-4 text-yellow-300" />
          Most Used Ingredients
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ingredientUsage.map(([ingredient, count]) => (
            <div key={ingredient} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <span className="text-zinc-100">{ingredient}</span>
              <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-100">{count} uses</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
