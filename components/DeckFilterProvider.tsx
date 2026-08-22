'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Suit } from '@/lib/types';

export type SuitFilter = 'All' | Suit;

interface DeckFilterValue {
  q: string;
  setQ: (q: string) => void;
  suit: SuitFilter;
  setSuit: (s: SuitFilter) => void;
}

const DeckFilterContext = createContext<DeckFilterValue>({
  q: '',
  setQ: () => {},
  suit: 'All',
  setSuit: () => {},
});

const SUIT_VALUES: SuitFilter[] = ['All', 'Hearts', 'Clubs', 'Diamonds', 'Spades'];

/**
 * The deck's search box and suit filter live above both places that render
 * them — the standing top bar and the deck itself — so typing in one is
 * reflected in the other. While the reader is on the deck the pair is mirrored
 * into the URL (via history.replaceState, so no navigation is triggered) which
 * makes a filtered deck linkable.
 */
export function DeckFilterProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [suit, setSuit] = useState<SuitFilter>('All');
  const [hydrated, setHydrated] = useState(false);

  // Seed from the URL once, so /deck?q=love&suit=Hearts opens filtered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQ = params.get('q');
    const urlSuit = params.get('suit') as SuitFilter | null;
    if (urlQ) setQ(urlQ);
    if (urlSuit && SUIT_VALUES.includes(urlSuit)) setSuit(urlSuit);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || pathname !== '/deck') return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (suit !== 'All') params.set('suit', suit);
    const search = params.toString();
    window.history.replaceState(null, '', search ? `/deck?${search}` : '/deck');
  }, [q, suit, pathname, hydrated]);

  const value = useMemo(() => ({ q, setQ, suit, setSuit }), [q, suit]);

  return <DeckFilterContext.Provider value={value}>{children}</DeckFilterContext.Provider>;
}

export function useDeckFilter(): DeckFilterValue {
  return useContext(DeckFilterContext);
}
