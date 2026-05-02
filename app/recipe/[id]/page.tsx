'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import type { Recipe } from '@/lib/types';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadRecipe();
  }, []);

  const loadRecipe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('recipes_history')
      .select('recipe')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data?.recipe?.[parseInt(id as string)]) setRecipe(data.recipe[parseInt(id as string)]);
  };

  const playAudio = async () => {
    if (!recipe) return;
    const text = `Ingredients: ${recipe.ingredients.join(', ')}. Steps: ${recipe.steps.join('. ')}`;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ text })
    });
    const blob = await res.blob();
    setAudioUrl(URL.createObjectURL(blob));
    setPlaying(true);
  };

  if (!recipe) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">{recipe.title}</h1>
      <p className="text-gray-600 text-sm mb-4">{recipe.description}</p>
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <h2 className="font-bold mb-2">Ingredients</h2>
        <ul className="list-disc pl-4 text-sm space-y-1">
          {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
        </ul>
      </div>
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <h2 className="font-bold mb-2">Steps</h2>
        <ol className="list-decimal pl-4 text-sm space-y-2">
          {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </div>
      <button onClick={playAudio} className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium mb-2">
        {playing ? 'Playing...' : 'Play Audio Tutorial'}
      </button>
      {audioUrl && <audio src={audioUrl} autoPlay controls className="w-full" />}
      <p className="text-center text-sm text-gray-500 mt-2">{recipe.kcal_per_serving} kcal per serving</p>
    </div>
  );
}
