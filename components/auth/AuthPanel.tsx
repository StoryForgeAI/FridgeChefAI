'use client';

import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createBrowserClient> | null>(null);

  useEffect(() => {
    setSupabaseClient(createBrowserClient());
  }, []);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    const {
      data: { subscription }
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace(searchParams.get('next') || '/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams, supabaseClient]);

  if (!supabaseClient) {
    return <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-400">Loading auth...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel overflow-hidden p-8">
        <div className="mb-8 flex items-center gap-3 text-yellow-300">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-[0.28em] text-yellow-200/80">
            Cyber-Chef Access
          </span>
        </div>
        <h1 className="max-w-md text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Log in to your premium fridge intelligence layer.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400">
          Scan groceries, generate recipes, and keep your macro stats flowing from a single dark-mode command
          center.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            'Barcode scanner with pantry sync',
            'AI recipe cards with calorie filters',
            'Chef tutorial audio playback',
            'Stripe-backed plan upgrades'
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2 text-yellow-300">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-sm font-medium">Supabase Auth UI</p>
        </div>
        <Auth
          supabaseClient={supabaseClient}
          providers={[]}
          theme="dark"
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#FFD700',
                  brandAccent: '#FDE047',
                  inputBackground: '#111111',
                  inputBorder: '#27272A',
                  inputText: '#FAFAFA',
                  inputPlaceholder: '#71717A',
                  messageText: '#F5F5F5'
                },
                radii: {
                  borderRadiusButton: '1rem',
                  buttonBorderRadius: '1rem',
                  inputBorderRadius: '1rem'
                }
              }
            },
            className: {
              anchor: 'text-yellow-300 hover:text-yellow-200',
              button: 'shadow-lg shadow-yellow-500/20',
              container: 'space-y-4',
              divider: 'bg-zinc-800',
              input: '!bg-zinc-950 !border-zinc-800 !text-zinc-50',
              label: '!text-zinc-300',
              message: '!text-zinc-300'
            }
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Password',
                button_label: 'Enter FridgeChef',
                link_text: 'Already have an account? Sign in'
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Password',
                button_label: 'Create account',
                link_text: "Need an account? Sign up"
              },
              forgotten_password: {
                link_text: 'Forgot your password?'
              }
            }
          }}
        />
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          <span>New users land straight in the protected app.</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </section>
    </div>
  );
}
