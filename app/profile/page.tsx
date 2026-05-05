'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Bolt, CreditCard, Crown, LogOut, Sparkles, Zap } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { PRODUCTS, type Profile } from '@/lib/types';

type ProductKey = keyof typeof PRODUCTS;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [syncError, setSyncError] = useState<string>('');
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isSuccess = params?.get('success') === 'true';
    const sessionId = params?.get('session_id');

    if (isSuccess && profile?.id) {
      setProcessingPayment(true);
      setSyncError('');
      let attempts = 0;
      const maxAttempts = 15;
      let isSyncing = false;

      const attemptSync = async () => {
        if (isSyncing) return;
        attempts++;
        isSyncing = true;
        try {
          const res = await fetch('/api/stripe/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id, sessionId })
          });
          const result = await res.json();
          
          if (result.synced) {
            await loadProfile();
            setProcessingPayment(false);
            setSyncResult(result);
            window.history.replaceState({}, '', '/profile');
          } else if (attempts >= maxAttempts) {
            setProcessingPayment(false);
            setSyncError(result.error || result.reason || 'Sync failed');
          }
        } catch {
          if (attempts >= maxAttempts) {
            setProcessingPayment(false);
            setSyncError('Network error');
          }
        } finally {
          isSyncing = false;
        }
      };
      
      const timeout1 = setTimeout(attemptSync, 3000);
      const interval = setInterval(attemptSync, 3000);
      return () => { clearTimeout(timeout1); clearInterval(interval); };
    }
  }, [profile?.id]);

  async function loadProfile() {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? '');
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data);
  }

  async function handleConvertCredits() {
    const supabase = createBrowserClient();
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('convert-credits', { body: {} });
    if (!error && data?.profile) {
      await loadProfile();
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await createBrowserClient().auth.signOut();
    window.location.href = '/login';
  }

  async function handlePurchase(productKey: ProductKey) {
    if (!profile) return;

    setProcessingPayment(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey, userId: profile.id, email })
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch {
      setProcessingPayment(false);
    }
  }

  if (!profile) return <div className="panel p-6 text-center text-zinc-300">Loading profile...</div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
      {/* Profile Header & Balance */}
      <section className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Profile</p>
            <h1 className="mt-2 break-all text-xl font-semibold text-white sm:text-3xl">{email || 'FridgeChef User'}</h1>
          </div>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-400/40 hover:text-red-100">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-2xl bg-black/30 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Credits</p>
            <p className="mt-1 text-3xl font-bold text-yellow-100">{profile.credits}</p>
          </div>
          <div className="rounded-2xl bg-black/30 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">TSS Credits</p>
            <p className="mt-1 text-3xl font-bold text-yellow-100">{profile.tss_credits}</p>
          </div>
          <div className="rounded-2xl bg-black/30 p-4 flex flex-col items-center justify-center gap-2">
            <button onClick={handleConvertCredits} disabled={loading || profile.credits < 20} className="secondary-button w-full gap-2 text-xs disabled:opacity-50">
              <ArrowRightLeft className="h-3 w-3" /> Convert 20 Cr to 1 TSS
            </button>
            {profile.credits < 20 && <p className="text-[10px] text-zinc-500">Need 20 credits</p>}
          </div>
          <div className="rounded-2xl bg-black/30 p-4 flex items-center justify-center">
             <span className="text-xs text-zinc-400">More items needed?</span>
          </div>
        </div>

        {processingPayment && (
          <div className="mt-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4 text-center">
            <p className="text-sm text-yellow-200">Processing your payment...</p>
            <p className="mt-1 text-xs text-zinc-400">Please wait while we confirm your purchase.</p>
          </div>
        )}
        {syncError && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{syncError}</div>}
        {syncResult?.synced && (
          <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/5 p-3 text-sm text-green-200">
            Purchase successful! Added {syncResult.addedCredits} Credits & {syncResult.addedTss} TSS.
          </div>
        )}
      </section>

      {/* Store Section */}
      <section className="space-y-8">
        {/* Bundles (Best Value) */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-yellow-300" />
            <h2 className="text-lg font-semibold text-white">Bundles (Best Value)</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(['bundle_standard', 'bundle_pro', 'bundle_chef', 'bundle_unstoppable'] as const).map((key) => (
              <ProductCard key={key} productKey={key} onClick={handlePurchase} />
            ))}
          </div>
        </div>

        {/* Credits */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bolt className="h-5 w-5 text-yellow-300" />
            <h2 className="text-lg font-semibold text-white">Credit Packs</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(['credit_60', 'credit_200', 'credit_450'] as const).map((key) => (
              <ProductCard key={key} productKey={key} onClick={handlePurchase} />
            ))}
          </div>
        </div>

        {/* TSS Packs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-yellow-300" />
            <h2 className="text-lg font-semibold text-white">TSS Credit Packs</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(['tss_3', 'tss_10', 'tss_25'] as const).map((key) => (
              <ProductCard key={key} productKey={key} onClick={handlePurchase} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ productKey, onClick }: { productKey: keyof typeof PRODUCTS; onClick: (key: typeof productKey) => void }) {
  const product = PRODUCTS[productKey];
  const priceEnvKey = product.envKey;
  // In Next.js client components we can't read env directly, so we pass a simple ID to backend which maps it
  // BUT backend needs the Price ID. 
  // Let's use a proxy ID that backend knows, or pass the Env Key? 
  // Actually, better: The backend has the map. We send `productKey` and backend looks up price ID from its own config.
  
  return (
    <button 
      onClick={() => onClick(productKey)}
      className="panel w-full p-5 text-left transition group hover:border-yellow-400/30 hover:bg-yellow-400/5"
    >
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-zinc-300">{product.label}</span>
        <span className="text-lg font-bold text-white">${product.price}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">{product.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
        <span>Instant delivery</span>
        <span className="group-hover:text-yellow-300 transition">Buy Now &rarr;</span>
      </div>
    </button>
  );
}
