'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '@/lib/supabase/config';

/**
 * The browser's Supabase client, built from configuration the server read at
 * request time and passed down — see lib/supabase/config.ts for why it is not
 * baked into the bundle.
 *
 * `null` means this deployment has no Supabase. That is a supported state: the
 * card of the day, the deck, the fifty-two studies, Learn and the reference all
 * work without one, and only signing in is unavailable.
 */
const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  config,
  children,
}: {
  config: SupabaseConfig | null;
  children: ReactNode;
}) {
  const client = useMemo(
    () => (config ? createBrowserClient(config.url, config.publishableKey) : null),
    [config],
  );

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

/** The client, or null when accounts are not configured. Callers must check. */
export function useSupabase(): SupabaseClient | null {
  return useContext(SupabaseContext);
}
