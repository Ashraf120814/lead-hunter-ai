// =============================================================================
// Next.js Middleware — Auth protection + basic security headers
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { PUBLIC_ROUTES, ADMIN_ROUTE_PREFIXES } from '@/lib/auth/helpers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and API health checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // In mock / unconfigured mode, allow everything for local development
  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseConfigured) {
    // Still protect admin routes with a simple header check in production later
    return NextResponse.next();
  }

  // TODO: When Supabase is configured, use @supabase/ssr to refresh session
  // and redirect unauthenticated users away from private routes.
  // Example pattern:
  //
  // const supabase = createServerClient(...)
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user && !isPublicRoute(pathname)) {
  //   return NextResponse.redirect(new URL('/login', request.url))
  // }

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  // Placeholder: in real deployment the session check happens here.
  // For now we only add security headers.

  const response = NextResponse.next();

  // Basic security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
