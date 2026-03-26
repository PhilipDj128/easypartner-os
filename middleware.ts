import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes som INTE kräver auth (publika)
const PUBLIC_PATHS = [
  '/client/login',
  '/quotes/sign/',        // Kund-signering (publik)
  '/api/quotes/sign/',    // Sign API (publik)
  '/api/auth/',           // Auth endpoints
  '/api/auto-prospect',   // Cron (egen auth via CRON_SECRET)
  '/api/email/reminder',  // Cron
  '/api/monitoring',      // Cron
  '/api/health-check',    // Publik health check
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// Admin-sidor som kräver att man är inloggad
const ADMIN_PATHS = [
  '/crm',
  '/customers',
  '/economy',
  '/domains',
  '/leads',
  '/prospektering',
  '/quotes',
  '/seo',
  '/audit',
  '/chat',
  '/client/dashboard',
];

// Admin-API:er som kräver auth (allt utom publika)
const ADMIN_API_PREFIXES = [
  '/api/crm',
  '/api/customers',
  '/api/dashboard',
  '/api/domains',
  '/api/economy',
  '/api/expenses',
  '/api/revenue',
  '/api/prospects',
  '/api/quotes',    // skyddas, men /api/quotes/sign/ undantas ovan
  '/api/seo',
  '/api/sms',
  '/api/email',
  '/api/chat',
  '/api/audit',
];

function isAdminPath(pathname: string): boolean {
  return (
    ADMIN_PATHS.some((p) => pathname.startsWith(p)) ||
    ADMIN_API_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Publika paths — släpp igenom direkt
  if (isPublicPath(pathname)) {
    return updateSession(request);
  }

  // Admin paths — kolla auth
  if (isAdminPath(pathname)) {
    const response = await updateSession(request);

    // För API-routes: kolla Supabase-session via cookie
    if (pathname.startsWith('/api/')) {
      const { createServerClient } = await import('@supabase/ssr');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        // Supabase inte konfigurerad — släpp igenom (dev mode)
        return response;
      }

      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Ej autentiserad' },
          { status: 401 }
        );
      }
    } else {
      // UI-sidor: redirect till login om ej inloggad
      const { createServerClient } = await import('@supabase/ssr');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        const supabase = createServerClient(url, key, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return NextResponse.redirect(new URL('/client/login', request.url));
        }
      }
    }

    return response;
  }

  // Allt annat (startsida, statiska filer) — släpp igenom
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Matcha alla request-paths UTOM:
     * - _next/static (statiska filer)
     * - _next/image (bildoptimering)
     * - favicon.ico, robots.txt, sitemap
     * - Publika assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
