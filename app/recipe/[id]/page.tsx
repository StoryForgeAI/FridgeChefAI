'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { AudioLines, Flame, ListChecks } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import type { Recipe, RecipeHistory } from '@/lib/types';

const highlightPattern = /(\b\d+\s?(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)\b|\b(?:high|medium|low)\sheat\b|\b\d+\s?(?:°c|°f)\b)/gi;

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24
  });

  useEffect(() => {
    loadRecipe();
  }, [params.id, searchParams]);

  async function loadRecipe() {
    const supabase = createBrowserClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data } = await supabase
      .from('recipes_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    const history = data as RecipeHistory | null;
    const recipeIndex = Number(searchParams.get('recipe') || 0);
    if (history?.recipe?.[recipeIndex]) {
      setRecipe(history.recipe[recipeIndex]);
    }
  }

  async function playAudio() {
    const supabase = createBrowserClient();
    if (!recipe) {
      return;
    }

    const text = `Ingredients: ${recipe.ingredients.join(', ')}. Prep: ${(recipe.prep || []).join('. ')}. Steps: ${recipe.steps.join('. ')}`;
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`
      },
      body: JSON.stringify({ text })
    });

    const blob = await response.blob();
    setAudioUrl(URL.createObjectURL(blob));
    setPlaying(true);
  }

  if (!recipe) {
    return <div className="panel p-6 text-center text-zinc-300">Loading tutorial...</div>;
  }

  return (
    <div className="space-y-4 pb-6">
      <motion.div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-yellow-300" style={{ scaleX: progress }} />

      <section className="panel p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Chef Tutorial</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{recipe.title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{recipe.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-yellow-100">
            <Flame className="h-4 w-4" />
            {recipe.kcal_per_serving} kcal per serving
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-zinc-300">
            <ListChecks className="h-4 w-4 text-yellow-300" />
            {(recipe.prep?.length || 0) + recipe.steps.length} guided steps
          </span>
        </div>
      </section>

      <div className="sticky top-20 z-30 space-y-3">
        <button onClick={playAudio} className="glow-button w-full gap-2">
          <AudioLines className="h-4 w-4" />
          {playing ? 'Playing Audio...' : 'Play Audio'}
        </button>
        {audioUrl ? <audio src={audioUrl} autoPlay controls className="panel w-full p-3" /> : null}
      </div>

      <TutorialSection title="Ingredients" items={recipe.ingredients} />
      {recipe.prep?.length ? <TutorialSection title="Prep" items={recipe.prep} /> : null}
      <TutorialSection title="Steps" items={recipe.steps} ordered />
    </div>
  );
}

function TutorialSection({
  title,
  items,
  ordered = false
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 border-b border-yellow-400/20 pb-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <ListTag className="space-y-3 text-sm leading-7 text-zinc-300">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className={ordered ? 'ml-5 list-decimal rounded-2xl bg-black/20 px-4 py-3 marker:text-yellow-300' : 'rounded-2xl bg-black/20 px-4 py-3'}
          >
            {renderHighlightedText(item)}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function renderHighlightedText(value: string) {
  const parts = value.split(highlightPattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    if (highlightPattern.test(part)) {
      highlightPattern.lastIndex = 0;
      return (
        <span key={`${part}-${index}`} className="font-semibold text-yellow-300">
          {part}
        </span>
      );
    }

    highlightPattern.lastIndex = 0;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
