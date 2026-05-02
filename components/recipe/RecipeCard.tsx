'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Flame, PlayCircle } from 'lucide-react';
import type { Recipe } from '@/lib/types';

export default function RecipeCard({
  recipe,
  index,
  expanded,
  onToggle,
  historyId
}: {
  recipe: Recipe;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  historyId: string;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="panel overflow-hidden"
    >
      <button className="w-full p-5 text-left" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-300/75">Recipe {index + 1}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{recipe.title}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{recipe.description}</p>
          </div>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-yellow-300 transition ${expanded ? 'rotate-180' : ''}`}
          />
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
          <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-yellow-100">
            <Flame className="h-3.5 w-3.5" />
            {recipe.kcal_per_serving} kcal
          </span>
          <span>{recipe.ingredients.length} ingredients</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="overflow-hidden border-t border-yellow-400/10"
          >
            <div className="space-y-4 p-5">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.22em] text-zinc-500">Ingredients</p>
                <ul className="space-y-2 text-sm text-zinc-300">
                  {recipe.ingredients.slice(0, 5).map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              <Link href={`/recipe/${historyId}?recipe=${index}`} className="glow-button w-full gap-2">
                <PlayCircle className="h-4 w-4" />
                Start Tutorial
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
