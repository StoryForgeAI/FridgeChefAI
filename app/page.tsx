'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { STRIPE_TIERS } from '@/lib/types';
import type { Profile, PantryItem } from '@/lib/types';

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      
      const { data: pantryData } = await supabase.from('pantry_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setPantry(pantryData || []);
    } catch (e: any) {
      console.error('Load error:', e);
      setError(e.message || 'Failed to load data');
    }
    setLoading(false);
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  const tierConfig = profile ? STRIPE_TIERS[profile.tier as keyof typeof STRIPE_TIERS] : null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">FridgeChef AI</h1>
      {profile && (
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold capitalize">{profile.tier} Plan</span>
            {tierConfig && <span className="text-sm text-gray-500">${tierConfig.price}/mo</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Credits: {profile.credits}</div>
            <div>TSS: {profile.tss_credits}</div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-2">My Pantry ({pantry.length} items)</h2>
        {pantry.length === 0 ? (
          <p className="text-gray-500 text-sm">Scan items to add to your pantry</p>
        ) : (
          <div className="space-y-2">
            {pantry.slice(0, 5).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                {item.kcal && <span className="text-gray-500">{item.kcal} kcal</span>}
              </div>
            ))}
            {pantry.length > 5 && <p className="text-xs text-gray-500">+{pantry.length - 5} more</p>}
          </div>
        )}
      </div>
      <div className="mt-4">
        <a href="/scanner" className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg">Scan Items</a>
      </div>
    </div>
  );
}
