import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from '@/lib/supabase/config';

/**
 * Keeps the Supabase session alive.
 *
 * Access tokens are short-lived. Without something refreshing them on the way
 * past, a reader is silently signed out mid-session. This runs before every
 * page render, refreshes the token if it is due, and writes the new cookies
 * onto the response.
 *
 * In Next.js 16 this file is `proxy.ts` — `middleware.ts` is deprecated.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Almost none of this app needs an account. If Supabase is not configured on
  // this deployment, serve the site and leave signing in disabled — throwing
  // here would 500 every page, including the static card studies.
  const config = supabaseConfig();
  if (!config) return response;

  const supabase = createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching getUser() is what triggers the refresh. Nothing is gated here:
  // the app is open, and only Pro content checks entitlement, server-side.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never carry a
     * session and refreshing on them would just burn requests.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|oracle-mark.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
