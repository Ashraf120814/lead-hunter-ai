// =============================================================================
// Supabase Client (browser + server)
// Safe to import even when env vars are missing (returns null / mock mode).
// =============================================================================

import { createBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { env, isSupabaseConfigured } from '@/config/env';

export function createClient() {
  if (!isSupabaseConfigured()) {
    console.warn('[Lead Hunter] Supabase not configured — running in mock mode');
    return null as any;
  }

  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null as any;
  }

  // Dynamic import of next/headers to avoid issues in non-server contexts
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — ignore
        }
      },
    },
  });
}
