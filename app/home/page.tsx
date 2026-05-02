'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChefHat, Flame, PackageOpen, Sparkles } from 'lucide-react';
import RecipeDiscovery from '@/components/recipe/RecipeDiscovery';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type PantryItem, type Profile, type RecipeHistory } from '@/lib/types';

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<RecipeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const supabase = createBrowserClient();
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [profileResult, pantryResult, historyResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('pantry_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('recipes_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      setProfile(profileResult.data);
      setPantry(pantryResult.data || []);
      setRecentHistory((historyResult.data || []) as RecipeHistory[]);
    } catch (dashboardError) {
      setError(dashboardError instanceof Error ? dashboardError.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="panel p-6 text-center text-zinc-300">Loading your command center...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>;
  }

  const tier = resolveProfileTier(profile);
  const tierConfig = STRIPE_TIERS[tier];

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-yellow-300/75">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">FridgeChef Command Center</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
              Premium recipe intelligence powered by your pantry, your credits, and your subscription tier.
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <ChefHat className="h-5 w-5 text-yellow-300" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Credits</p>
            <p className="mt-2 text-2xl font-semibold text-white">{profile?.credits ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">TSS</p>
            <p className="mt-2 text-2xl font-semibold text-white">{profile?.tss_credits ?? 0}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-yellow-100">{tierConfig.label} tier</p>
            <p className="text-xs text-yellow-100/70">
              {tierConfig.itemLimit} pantry items, {tierConfig.recipeSuggestions} recipe suggestions
            </p>
          </div>
          <Link href="/profile" className="text-sm font-medium text-yellow-200 hover:text-yellow-100">
            Manage
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <PackageOpen className="h-4 w-4 text-yellow-300" />
            Pantry Snapshot
          </div>
          <div className="mt-4 space-y-3">
            {pantry.length ? (
              pantry.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm">
                  <span className="text-zinc-100">{item.name}</span>
                  <span className="text-zinc-500">{item.kcal ?? 0} kcal</span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-zinc-400">No pantry items yet. Start scanning to unlock recipe ideas.</p>
            )}
          </div>
          <Link href="/scanner" className="secondary-button mt-5 w-full justify-center gap-2">
            Open Scanner
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            Recent Generations
          </div>
          <div className="mt-4 space-y-3">
            {recentHistory.length ? (
              recentHistory.map((history) => (
                <div key={history.id} className="rounded-2xl bg-black/30 px-4 py-3">
                  <p className="text-sm text-zinc-100">{history.ingredients.slice(0, 3).join(', ')}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(history.created_at).toLocaleDateString()} • {history.recipe.length} ideas saved
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-zinc-400">Generate your first AI recipe pack to populate this feed.</p>
            )}
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-yellow-300" />
              Calorie filters are enforced before the top 5 are shown.
            </div>
          </div>
        </div>
      </section>

      <RecipeDiscovery pantry={pantry} recipeLimit={tierConfig.recipeSuggestions} />
    </div>
  );
}
