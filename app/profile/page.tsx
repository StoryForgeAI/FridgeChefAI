'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Crown, LogOut, Sparkles } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type Profile, type SubscriptionTier } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createBrowserClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setEmail(user.email ?? '');
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }

  async function handleConvertCredits() {
    const supabase = createBrowserClient();
    setLoading(true);
    setActionError('');

    const { data, error } = await supabase.functions.invoke('convert-credits', {
      body: {}
    });

    if (error) {
      setActionError(error.message || 'Credit conversion failed.');
    } else {
      if (data?.profile && profile) {
        setProfile({
          ...profile,
          credits: data.profile.credits,
          tss_credits: data.profile.tss_credits
        });
      } else {
        await loadProfile();
      }

      window.dispatchEvent(new Event('fridgechef:profile-refresh'));
    }

    setLoading(false);
  }

  async function handleUpgrade(tier: Exclude<SubscriptionTier, 'free'>) {
    const priceIds = {
      standard: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID!,
      pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
      chef: process.env.NEXT_PUBLIC_STRIPE_CHEF_PRICE_ID!
    };

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId: priceIds[tier],
        userId: profile?.id,
        email
      })
    });

    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  }

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (!profile) {
    return <div className="panel p-6 text-center text-zinc-300">Loading profile...</div>;
  }

  const tier = resolveProfileTier(profile);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Profile</p>
            <h1 className="mt-2 break-all text-xl font-semibold text-white sm:text-3xl">
              {email || 'FridgeChef User'}
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <button
          onClick={handleConvertCredits}
          disabled={loading || profile.credits < 20}
          className="secondary-button mt-6 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Convert 20 Credits into 1 TSS
        </button>

        {profile.credits < 20 ? (
          <p className="mt-3 text-sm text-zinc-400">You need at least 20 credits to convert.</p>
        ) : null}
        {actionError ? <p className="mt-3 text-sm text-red-200">{actionError}</p> : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          Upgrade your tier
        </div>

        {(['standard', 'pro', 'chef'] as const).map((planTier) => {
          const config = STRIPE_TIERS[planTier];
          const isActive = tier === planTier;

          return (
            <button
              key={planTier}
              onClick={() => handleUpgrade(planTier)}
              className={`panel w-full p-5 text-left transition ${isActive ? 'border-yellow-400/30 bg-yellow-400/10' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-300" />
                    <span className="text-lg font-semibold text-white">{config.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {config.credits} credits / {config.tss_credits} TSS / {config.itemLimit} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-white">${config.price}</p>
                  <p className="text-xs text-zinc-500">per month</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 text-sm text-zinc-300">
                <span>{Math.round(config.discount * 100)}% discount / {config.recipeSuggestions} suggestions</span>
                <span className={isActive ? 'text-yellow-200' : 'text-zinc-500'}>{isActive ? 'Current plan' : 'Upgrade'}</span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
