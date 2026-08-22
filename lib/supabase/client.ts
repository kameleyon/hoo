import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';

/**
 * Supabase in the browser.
 *
 * Uses the publishable key, which is meant to be public — every table it can
 * reach is guarded by row-level security, so this key grants nothing beyond
 * what the signed-in reader is already allowed to see.
 */
export function supabaseBrowser() {
  const config = supabaseConfig();
  if (!config) throw new Error('Supabase is not configured on this deployment');
  return createBrowserClient(config.url, config.publishableKey);
}
