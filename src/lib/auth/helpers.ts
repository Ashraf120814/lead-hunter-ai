// =============================================================================
// Auth Helpers
// Works with Supabase Auth. Falls back gracefully in mock mode.
// =============================================================================

import type { Profile, UserRole } from '@/types';
import { createServerSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/config/env';

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

/**
 * Get the current authenticated user + profile (server-side).
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) {
    // Mock mode: return a fake admin user for local development
    if (process.env.NODE_ENV === 'development') {
      return {
        id: 'mock-user-id',
        email: 'demo@leadhunter.ai',
        profile: {
          id: 'mock-user-id',
          email: 'demo@leadhunter.ai',
          full_name: 'Demo User',
          avatar_url: null,
          role: 'ADMIN',
          company_name: 'D-Mappers',
          phone: null,
          timezone: 'UTC',
          preferred_language: 'en',
          theme_preference: 'system',
          is_active: true,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          onboarding_completed: true,
          last_login_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
    return null;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    profile: profile as Profile | null,
  };
}

/**
 * Require authentication. Throws / redirects if not logged in.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

/**
 * Require a specific role (or higher).
 */
export async function requireRole(allowed: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  const role = user.profile?.role ?? 'USER';
  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/**
 * Check if user is admin.
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'ADMIN';
}

/**
 * Public routes that do not require auth.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

/**
 * Admin-only route prefixes.
 */
export const ADMIN_ROUTE_PREFIXES = ['/admin'];
