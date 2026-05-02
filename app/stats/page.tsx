'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import type { Stats, Profile } from '@/lib/types';
import { STRIPE_TIERS } from '@/lib/types';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: statsData } = await supabase.from('stats').select('*').eq('user_id', user.id).single();
    setStats(statsData);
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);
  };

  if (!stats || !profile) return <div className="p-4">Loading...</div>;

  const tierConfig = STRIPE_TIERS[profile.tier];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Statistics</h1>
      <div className="bg-white rounded-lg p-4 shadow space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-gray-500">Recipes Generated</h2>
          <p className="text-2xl font-bold">{stats.total_recipes_generated}</p>
        </div>
        <div>
          <h2 className="font-semibold text-sm text-gray-500">Pantry Items Added</h2>
          <p className="text-2xl font-bold">{stats.total_pantry_items}</p>
        </div>
        <div>
          <h2 className="font-semibold text-sm text-gray-500">Credits Used</h2>
          <p className="text-2xl font-bold">{stats.total_credits_used}</p>
        </div>
        {profile.tier !== 'free' && tierConfig && (
          <div>
            <h2 className="font-semibold text-sm text-gray-500">Subscription</h2>
            <p className="capitalize">{profile.tier} - ${tierConfig.price}/mo</p>
            <p className="text-sm text-gray-500">Discount: {tierConfig.discount * 100}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
