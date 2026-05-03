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
  const accessLevel = data.profile?.stats_access_level ?? 'basic';

  // Helper to check if user can access a feature
  const canAccess = (requiredLevel: 'basic' | 'pro' | 'ultra') => {
    const levels = { basic: 1, pro: 2, ultra: 3 };
    return (levels[accessLevel as keyof typeof levels] || 0) >= (levels[requiredLevel] || 0);
  };

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const calories = data.pantry
      .filter(item => {
        const itemDate = new Date(item.created_at);
        return item.kcal && itemDate >= date && itemDate < nextDate;
      })
      .reduce((sum, item) => sum + (item.kcal ?? 0), 0);
    
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      calories
    };
  });

  const maxCalories = Math.max(...weeklyData.map(d => d.calories), 1);

  // Recipe generation trend (last 7 days)
  const recipeTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = data.history.filter(h => {
      const hDate = new Date(h.created_at);
      return hDate >= date && hDate < nextDate;
    }).length;

    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count
    };
  });

  const maxRecipeCount = Math.max(...recipeTrend.map(d => d.count), 1);

  // Donut chart data for ingredient usage
  const totalUsage = ingredientUsage.reduce((sum, [, count]) => sum + count, 0);
  const donutData = ingredientUsage.map(([ingredient, count]) => ({
    ingredient,
    count,
    percentage: totalUsage > 0 ? (count / totalUsage) * 100 : 0
  }));

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

      {/* Basic stats - available for all */}
      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
          <Salad className="h-4 w-4 text-yellow-300" />
          Most Used Ingredients
        </div>
        {canAccess('basic') ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ingredientUsage.map(([ingredient, count]) => (
              <div key={ingredient} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <span className="text-zinc-100">{ingredient}</span>
                <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs text-yellow-100">{count} uses</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-black/30 p-6 text-center">
            <p className="text-sm text-zinc-500">Upgrade to <span className="text-yellow-300 font-semibold">Standard</span> to see ingredient usage</p>
          </div>
        )}
      </section>
      
      {/* Weekly Calorie Distribution - requires basic */}
      {canAccess('basic') ? (
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Flame className="h-4 w-4 text-yellow-300" />
            Weekly Calorie Distribution
          </div>
          <div className="flex h-32 items-end gap-2">
            {weeklyData.map((dayData, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-lg bg-yellow-400/80 transition-all duration-500"
                  style={{ 
                    height: `${(dayData.calories / maxCalories) * 100}%`,
                    minHeight: '4px'
                  }}
                />
                <span className="text-xs text-zinc-500">{dayData.day}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel p-5 opacity-40">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Flame className="h-4 w-4 text-yellow-300" />
            Weekly Calorie Distribution
          </div>
          <div className="rounded-2xl bg-black/30 p-6 text-center">
            <p className="text-sm text-zinc-500">Upgrade to <span className="text-yellow-300 font-semibold">Standard</span> to see calorie distribution</p>
          </div>
        </section>
      )}

      {/* Recipe Generation Trend - requires pro */}
      {canAccess('pro') ? (
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Recipe Generation Trend
          </div>
          <div className="relative h-32">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="rgba(255, 215, 0, 0.8)"
                strokeWidth="2"
                points={recipeTrend.map((d, i) => `${(i / 6) * 100} ${100 - (d.count / maxRecipeCount) * 80}`).join(' ')}
              />
              {recipeTrend.map((d, i) => (
                <circle
                  key={i}
                  cx={`${(i / 6) * 100}`}
                  cy={`${100 - (d.count / maxRecipeCount) * 80}`}
                  r="2"
                  fill="rgba(255, 215, 0, 0.8)"
                />
              ))}
            </svg>
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              {recipeTrend.map((d) => (
                <span key={d.day}>{d.day}</span>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="panel p-5 opacity-40">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Recipe Generation Trend
          </div>
          <div className="rounded-2xl bg-black/30 p-6 text-center">
            <p className="text-sm text-zinc-500">Upgrade to <span className="text-yellow-300 font-semibold">Pro</span> to see recipe trends</p>
          </div>
        </section>
      )}

      {/* Ingredient Usage Distribution - requires ultra (chef) */}
      {canAccess('ultra') ? (
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Salad className="h-4 w-4 text-yellow-300" />
            Ingredient Usage Distribution
          </div>
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full" viewBox="0 0 100 100">
                {donutData.map((d, i) => {
                  const startAngle = donutData.slice(0, i).reduce((sum, item) => sum + (item.percentage / 100) * 360, 0);
                  const endAngle = startAngle + (d.percentage / 100) * 360;
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);
                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);
                  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                  
                  return (
                    <path
                      key={d.ingredient}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill="rgba(255, 215, 0, 0.8)"
                      opacity={0.6 + (i / donutData.length) * 0.4}
                    />
                  );
                })}
                <circle cx="50" cy="50" r="25" fill="#0a0a0a" />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-300 text-xs">
                  {donutData.length}
                </text>
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map((d) => (
                <div key={d.ingredient} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 truncate">{d.ingredient}</span>
                  <span className="ml-2 text-xs text-zinc-500">{d.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="panel p-5 opacity-40">
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
            <Salad className="h-4 w-4 text-yellow-300" />
            Ingredient Usage Distribution
          </div>
          <div className="rounded-2xl bg-black/30 p-6 text-center">
            <p className="text-sm text-zinc-500">Upgrade to <span className="text-yellow-300 font-semibold">Chef</span> to see ingredient distribution charts</p>
          </div>
        </section>
      )}
    </div>
  );
}
