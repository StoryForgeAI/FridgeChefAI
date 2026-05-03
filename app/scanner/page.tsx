'use client';

import { useEffect, useState } from 'react';
import { ScanLine, Trash2 } from 'lucide-react';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import { createBrowserClient } from '@/lib/supabase';
import { resolveProfileTier, STRIPE_TIERS, type PantryItem, type Profile } from '@/lib/types';

export default function ScannerPage() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadPantryAndProfile();
  }, []);

  async function loadPantryAndProfile() {
    const supabase = createBrowserClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const [pantryResult, profileResult] = await Promise.all([
      supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    ]);

    setPantry(pantryResult.data || []);
    setProfile(profileResult.data as Profile | null);

    if (profileResult.data) {
      const tier = resolveProfileTier(profileResult.data);
      const tierConfig = STRIPE_TIERS[tier];
      setLimitReached((pantryResult.data?.length || 0) >= tierConfig.itemLimit);
    }
  }

  async function removeItem(id: string) {
    const supabase = createBrowserClient();
    await supabase.from('pantry_items').delete().eq('id', id);
    setPantry((current) => {
      const newPantry = current.filter((item) => item.id !== id);
      if (profile) {
        const tier = resolveProfileTier(profile);
        const tierConfig = STRIPE_TIERS[tier];
        setLimitReached(newPantry.length >= tierConfig.itemLimit);
      }
      return newPantry;
    });
  }

  const itemLimit = profile ? STRIPE_TIERS[resolveProfileTier(profile)].itemLimit : 5;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-yellow-300/75">Scanner</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">High-tech pantry capture</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Aim the camera at a barcode to enrich your pantry and feed the recipe engine.
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <ScanLine className="h-5 w-5 text-yellow-300" />
          </div>
        </div>

        {limitReached ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            You've reached your plan limit of {itemLimit} pantry items. Remove items or upgrade your plan to add more.
          </div>
        ) : null}

        <div className="mt-6">
          <BarcodeScanner
            onPreviewStateChange={setShowPreview}
          />
        </div>
      </section>

      {!showPreview ? (
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Pantry Items</h2>
            <span className="text-sm text-zinc-500">{pantry.length}/{itemLimit} items</span>
          </div>
          <div className="space-y-3">
            {pantry.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-100">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.barcode}</p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/20 px-3 py-2 text-xs text-red-200 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
