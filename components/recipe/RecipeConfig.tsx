'use client';
import { useState } from 'react';

const SERVING_OPTIONS = [1, 2, 3, 4, 6, 8];
const ALLERGY_OPTIONS = ['Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Shellfish'];

export default function RecipeConfig({
  onGenerate,
  loading
}: {
  onGenerate: (config: { servings: number; maxCalories: number | null; allergies: string[] }) => void;
  loading: boolean;
}) {
  const [servings, setServings] = useState(2);
  const [maxCalories, setMaxCalories] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);

  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleSubmit = () => {
    onGenerate({
      servings,
      maxCalories: maxCalories ? parseInt(maxCalories) : null,
      allergies
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Servings</label>
        <div className="flex flex-wrap gap-2">
          {SERVING_OPTIONS.map((num) => (
            <button
              key={num}
              onClick={() => setServings(num)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                servings === num
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                  : 'border border-white/10 bg-white/5 text-zinc-300 hover:border-yellow-400/40'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Max Calories (optional)</label>
        <input
          type="number"
          value={maxCalories}
          onChange={(e) => setMaxCalories(e.target.value)}
          placeholder="e.g. 500"
          className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-yellow-400/60"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Allergies</label>
        <div className="flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((allergy) => (
            <button
              key={allergy}
              onClick={() => toggleAllergy(allergy)}
              className={`rounded-full px-3 py-2 text-xs transition ${
                allergies.includes(allergy)
                  ? 'bg-yellow-400 text-black'
                  : 'border border-white/10 bg-white/5 text-zinc-300 hover:border-yellow-400/40'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="glow-button w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Generating...' : 'Generate Recipes'}
      </button>
    </div>
  );
}
