/**
 * Where the Supabase connection details come from.
 *
 * Read on the **server** and handed to the browser through React context, not
 * inlined into the bundle at build time. Two reasons that matters:
 *
 *   - The publishable key is public by design — every table it reaches is
 *     behind row-level security — so there is nothing to protect by baking it
 *     into JavaScript.
 *   - `NEXT_PUBLIC_*` is substituted at build. A variable added to the host
 *     afterwards does nothing until the next deploy, and a missing prefix fails
 *     silently. Reading it at runtime removes that whole class of problem.
 *
 * Both the prefixed and unprefixed names are accepted, because the Supabase
 * Marketplace integration ships the unprefixed ones.
 */
export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

let warned = false;

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (url && publishableKey) return { url, publishableKey };

  if (!warned) {
    warned = true;
    const missing = [
      url ? null : 'a project URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)',
      publishableKey
        ? null
        : 'a publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY)',
    ].filter(Boolean);
    console.error(`[supabase] accounts are disabled: missing ${missing.join(' and ')}`);
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}
