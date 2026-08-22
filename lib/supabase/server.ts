import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase on the server, reading the session from cookies.
 *
 * Still the publishable key: requests run as the signed-in reader and RLS
 * applies. For the Stripe webhook, which has no reader, use lib/supabase/admin.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * The signed-in reader, or null.
 *
 * Uses getUser() rather than getSession(): getSession reads the cookie without
 * checking it, so it can be spoofed. getUser verifies with Supabase.
 */
export async function currentUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
