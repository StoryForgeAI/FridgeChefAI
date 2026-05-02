'use client';

import { useEffect, useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const appPrefixes = ['/home', '/scanner', '/stats', '/profile', '/recipe'];

export default function CreditsDock() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const isAppRoute = appPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!isAppRoute) {
      return;
    }

    const supabase = createBrowserClient();

    async function loadProfile() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }

    loadProfile();

    const onRefresh = () => {
      loadProfile();
    };

    window.addEventListener('focus', onRefresh);
    window.addEventListener('fridgechef:profile-refresh', onRefresh);

    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('fridgechef:profile-refresh', onRefresh);
    };
  }, [pathname]);

  const showDock = appPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!showDock || !profile) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl justify-center xl:justify-end">
        <div className="pointer-events-auto flex items-center gap-2 rounded-[1.35rem] border border-yellow-300/20 bg-zinc-950/75 px-3 py-2 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
          <DockPill icon={Coins} label="Credits" value={profile.credits} />
          <DockPill icon={Sparkles} label="TSS" value={profile.tss_credits} />
        </div>
      </div>
    </div>
  );
}

function DockPill({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Coins;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-[96px] items-center gap-2 rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/12 text-yellow-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
