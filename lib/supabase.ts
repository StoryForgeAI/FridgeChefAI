import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from './config';

export function createBrowserClient() {
  return createSupabaseBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true
    },
    cookieOptions: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  });
}

export type SupabaseClient = ReturnType<typeof createBrowserClient>;
