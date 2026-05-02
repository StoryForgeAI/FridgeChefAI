'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { STRIPE_TIERS } from '@/lib/types';
import type { Profile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  };

  const handleConvertCredits = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convert-credits`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (res.ok) loadProfile();
    setLoading(false);
  };

  const handleUpgrade = async (tier: 'standard' | 'pro' | 'chef') => {
    const priceIds = {
      standard: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID!,
      pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
      chef: process.env.NEXT_PUBLIC_STRIPE_CHEF_PRICE_ID!
    };
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: priceIds[tier], userId: profile?.id })
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  if (!profile) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Credits</p>
            <p className="text-xl font-bold">{profile.credits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">TSS Credits</p>
            <p className="text-xl font-bold">{profile.tss_credits}</p>
          </div>
        </div>
        <button
          onClick={handleConvertCredits}
          disabled={loading || profile.credits < 20}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
        >
          Convert 20 Credits → 1 TSS
        </button>
      </div>
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="font-semibold mb-2">Upgrade Plan</h2>
        <div className="space-y-2">
          {(['standard', 'pro', 'chef'] as const).map((tier) => {
            const config = STRIPE_TIERS[tier];
            return (
              <button
                key={tier}
                onClick={() => handleUpgrade(tier)}
                className="w-full border border-gray-300 p-3 rounded-lg text-left"
              >
                <div className="flex justify-between">
                  <span className="capitalize font-medium">{tier}</span>
                  <span>${config.price}/mo</span>
                </div>
                <p className="text-xs text-gray-500">{config.credits} credits, {config.tss_credits} TSS</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
