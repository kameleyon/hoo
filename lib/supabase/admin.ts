import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase with the secret key. Bypasses row-level security entirely.
 *
 * Exactly one caller should need this: the Stripe webhook, which has no
 * signed-in reader and must write public.subscriptions — the table no reader is
 * allowed to write. Never import this from anything that runs in a browser, and
 * never use it to serve reader-facing reads, because it would ignore RLS.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error('SUPABASE_SECRET_KEY (or the project URL) is not set');
  }

  client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
