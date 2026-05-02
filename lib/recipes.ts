import type { Recipe } from './types';

export function normalizeRecipes(input: unknown): Recipe[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((entry): Recipe | null => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const recipe = entry as Partial<Recipe>;
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.filter((item): item is string => typeof item === 'string')
        : [];
      const prep = Array.isArray(recipe.prep)
        ? recipe.prep.filter((item): item is string => typeof item === 'string')
        : [];
      const steps = Array.isArray(recipe.steps)
        ? recipe.steps.filter((item): item is string => typeof item === 'string')
        : [];
      const kcal = Number(recipe.kcal_per_serving);

      if (!recipe.title || !recipe.description || !ingredients.length || !steps.length || Number.isNaN(kcal)) {
        return null;
      }

      return {
        title: recipe.title,
        description: recipe.description,
        ingredients,
        prep,
        steps,
        kcal_per_serving: kcal
      };
    })
    .filter((recipe): recipe is Recipe => recipe !== null);

  return normalized;
}

export function filterRecipesByCalories(recipes: Recipe[], maxCalories?: number | null, limit = 5) {
  const filtered = typeof maxCalories === 'number'
    ? recipes.filter((recipe) => recipe.kcal_per_serving <= maxCalories)
    : recipes;

  return filtered.slice(0, limit);
}
