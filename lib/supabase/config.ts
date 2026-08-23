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

let warned = false;

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && publishableKey) return { url, publishableKey };

  // Half-configured is almost always a typo or a missing NEXT_PUBLIC_ prefix,
  // not a deliberate choice — so say which half is missing rather than going
  // quiet. Names only; the values are not printed.
  if (!warned && (url || publishableKey)) {
    warned = true;
    const missing = [
      url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
      publishableKey ? null : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ].filter(Boolean);
    console.error(
      `[supabase] accounts are disabled: ${missing.join(' and ')} missing. ` +
        'Note the NEXT_PUBLIC_ prefix — the browser cannot read an unprefixed variable, ' +
        'and these are inlined at build time, so add them and redeploy.',
    );
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}
