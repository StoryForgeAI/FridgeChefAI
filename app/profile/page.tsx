'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Crown, LogOut, Sparkles } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type Profile, type SubscriptionTier } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const isSuccess = typeof window !== 'undefined' && window.location.search.includes('success=true');
    if (isSuccess && profile?.id) {
      setProcessingPayment(true);
      const attemptSync = async () => {
        try {
          const res = await fetch('/api/stripe/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id, email })
          });
          const result = await res.json();
          if (result.synced) {
            await loadProfile();
            setProcessingPayment(false);
            window.history.replaceState({}, '', '/profile');
          }
        } catch {
          // retry
        }
      };
      attemptSync();
      const interval = setInterval(attemptSync, 2000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setProcessingPayment(false);
      }, 30000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [profile?.id]);

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
    // Price IDs must be exposed to the client via NEXT_PUBLIC_ environment variables
    const priceIds = {
      standard: (process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || '') as string,
      pro: (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '') as string,
      chef: (process.env.NEXT_PUBLIC_STRIPE_CHEF_PRICE_ID || '') as string
    };

    const priceId = priceIds[tier];
    const allPricesConfigured = Boolean(priceIds.standard && priceIds.pro && priceIds.chef);
    if (!priceId || !allPricesConfigured) {
      // Do not attempt to upgrade if pricing is not configured; show no disruptive error
      return;
    }

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId,
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

  async function handleManagePortal() {
    if (!profile?.id) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: profile.id, return_url: origin + '/profile' })
    });
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  if (!profile) {
    return <div className="panel p-6 text-center text-zinc-300">Loading profile...</div>;
  }

  const tier = resolveProfileTier(profile);
  const hasSubscription = Boolean(profile.stripe_subscription_id);

  // Client-side price configuration check (pricing IDs exposed as NEXT_PUBLIC_ vars)
  const priceIdsTop = {
    standard: (process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || '') as string,
    pro: (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '') as string,
    chef: (process.env.NEXT_PUBLIC_STRIPE_CHEF_PRICE_ID || '') as string
  };
  const hasAnyPriceConfigured = Boolean(priceIdsTop.standard || priceIdsTop.pro || priceIdsTop.chef);

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

        {processingPayment ? (
          <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-center">
            <p className="text-sm text-yellow-200">Processing your subscription...</p>
            <p className="mt-1 text-xs text-zinc-400">Please wait while we confirm your payment.</p>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-black/30 p-3">
            <p className="text-xs text-zinc-500">Tier</p>
            <p className="mt-1 font-semibold text-white capitalize">{tier}</p>
          </div>
          <div className="rounded-2xl bg-black/30 p-3">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="mt-1 font-semibold text-white capitalize">{profile.subscription_status || 'free'}</p>
          </div>
          <div className="rounded-2xl bg-black/30 p-3">
            <p className="text-xs text-zinc-500">Credits</p>
            <p className="mt-1 font-semibold text-white">{profile.credits}</p>
          </div>
          <div className="rounded-2xl bg-black/30 p-3">
            <p className="text-xs text-zinc-500">TSS</p>
            <p className="mt-1 font-semibold text-white">{profile.tss_credits}</p>
          </div>
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
        {hasSubscription ? (
          <button
            className="panel mt-4 w-full text-left p-4 border border-red-400/20 rounded-md bg-red-400/5 text-sm text-red-200 transition hover:border-red-400/40"
            onClick={handleManagePortal}
          >
            Cancel / Manage Subscription
          </button>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <Sparkles className="h-4 w-4 text-yellow-300" />
          Upgrade your tier
        </div>

        {!hasAnyPriceConfigured ? (
          <p className="mt-2 text-sm text-zinc-400">Upgrade pricing is not configured in this environment.</p>
        ) : null}

        {(['standard', 'pro', 'chef'] as const).map((planTier) => {
          const config = STRIPE_TIERS[planTier];
          const isActive = tier === planTier;

          return (
            <button
              key={planTier}
              onClick={() => handleUpgrade(planTier)}
              className={`panel w-full p-5 text-left transition ${isActive ? 'border-yellow-400/30 bg-yellow-400/10' : ''}`}
              disabled={!hasAnyPriceConfigured}
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
