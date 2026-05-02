'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, ChefHat, Sparkles } from 'lucide-react';
import RecipeCard from './RecipeCard';
import RecipeConfig from './RecipeConfig';
import type { PantryItem, Recipe } from '@/lib/types';
import { createBrowserClient } from '@/lib/supabase';

export default function RecipeDiscovery({
  pantry,
  recipeLimit,
  resultLimit = 3
}: {
  pantry: PantryItem[];
  recipeLimit: number;
  resultLimit?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [historyId, setHistoryId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds(pantry.map((item) => item.id));
  }, [pantry]);

  const selectedItems = useMemo(
    () => pantry.filter((item) => selectedIds.includes(item.id)),
    [pantry, selectedIds]
  );
  const pantryNames = useMemo(() => selectedItems.map((item) => item.name), [selectedItems]);

  const toggleIngredient = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

  const handleGenerate = async ({
    servings,
    maxCalories,
    allergies
  }: {
    servings: number;
    maxCalories: number | null;
    allergies: string[];
  }) => {
    if (!pantryNames.length) {
      setError('Choose at least one ingredient before generating recipes.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`
        },
        body: JSON.stringify({
          ingredients: pantryNames,
          max_calories: maxCalories,
          allergies,
          servings
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Recipe generation failed.');
      }

      setHistoryId(payload.historyId);
      setRecipes(payload.recipes.slice(0, Math.min(recipeLimit, resultLimit)));
      setExpandedCard(0);
      window.dispatchEvent(new Event('fridgechef:profile-refresh'));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Recipe generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Recipe Discovery</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Ask the Cyber-Chef for your next move</h2>
        </div>
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
          <ChefHat className="h-5 w-5 text-yellow-300" />
        </div>
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          Select the pantry ingredients you want to cook with
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setSelectedIds(pantry.map((item) => item.id))} className="secondary-button px-4 py-2 text-sm">
            <CheckCheck className="mr-2 h-4 w-4" />
            Use All
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-100"
          >
            Clear
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {pantry.map((item) => {
            const active = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleIngredient(item.id)}
                className={`rounded-full px-3 py-2 text-xs transition ${
                  active
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                    : 'border border-white/10 bg-white/5 text-zinc-300 hover:border-yellow-400/40'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <RecipeConfig onGenerate={handleGenerate} loading={loading} />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      {recipes.length ? (
        <div className="space-y-4">
          {recipes.map((recipe, index) => (
            <RecipeCard
              key={`${recipe.title}-${index}`}
              recipe={recipe}
              index={index}
              expanded={expandedCard === index}
              onToggle={() => setExpandedCard((current) => (current === index ? null : index))}
              historyId={historyId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
