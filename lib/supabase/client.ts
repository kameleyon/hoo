import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase in the browser.
 *
 * Uses the publishable key, which is meant to be public — every table it can
 * reach is guarded by row-level security, so this key grants nothing beyond
 * what the signed-in reader is already allowed to see.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
