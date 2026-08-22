/**
 * Whether this deployment has Supabase wired up at all.
 *
 * Accounts are one feature among many: the card of the day, the deck, the
 * fifty-two studies, Learn and the reference tables all work with no database
 * and no session. So a missing key disables signing in — it must never take the
 * site down, which is exactly what it did the first time round.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so adding them to the host
 * needs a redeploy before they take effect.
 */
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}
