'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { CardFace } from './CardFace';
import { useDeckFilter } from './DeckFilterProvider';
import type { SuitFilter } from './DeckFilterProvider';
import { CARD_INDEX, SUITS, SUIT_SYMBOL } from '@/lib/card-index';
import { birthdayCountLabel } from '@/lib/cardology';
import type { Suit } from '@/lib/types';

const FILTERS: SuitFilter[] = ['All', 'Hearts', 'Clubs', 'Diamonds', 'Spades'];

const isRedSuit = (s: Suit) => s === 'Hearts' || s === 'Diamonds';

export function DeckView() {
  const { q, setQ, suit, setSuit } = useDeckFilter();

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = CARD_INDEX.filter(
      (c) =>
        (suit === 'All' || c.suit === suit) &&
        (!needle ||
          c.name.toLowerCase().includes(needle) ||
          c.keywords.join(' ').toLowerCase().includes(needle) ||
          c.archName.toLowerCase().includes(needle)),
    );

    return SUITS.map((name) => ({
      label: name,
      sym: SUIT_SYMBOL[name],
      red: isRedSuit(name),
      cards: matches.filter((c) => c.suit === name),
    })).filter((g) => g.cards.length > 0);
  }, [q, suit]);

  return (
    <main className="view">
      {/* On the phone this stacks title / search / filters; at width the search
          is already in the standing top bar and the filters move up beside the
          title. */}
      <div className="deck__head">
        <div>
          <h1 className="page-title">The Deck</h1>
          <p className="page-lede">Fifty-two cards, one for every birthday.</p>
        </div>

        <div className="deck__search-wrap">
          <label htmlFor="deck-search-mobile" className="visually-hidden">
            Search a card or a keyword
          </label>
          <input
            id="deck-search-mobile"
            type="search"
            className="deck__search"
            placeholder="Search a card or a keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="suits" role="group" aria-label="Filter by suit">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`suits__btn${f !== 'All' && isRedSuit(f) ? ' suits__btn--red' : ''}`}
              aria-pressed={suit === f}
              onClick={() => setSuit(f)}
            >
              <span aria-hidden="true">{f === 'All' ? 'All' : SUIT_SYMBOL[f]}</span>
              <span className="visually-hidden">{f}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.label} className="deck__group">
          <div className="deck__group-head">
            <span
              className="deck__group-sym"
              style={{ '--suit': group.red ? 'var(--red)' : 'var(--ink)' } as CSSProperties}
              aria-hidden="true"
            >
              {group.sym}
            </span>
            <h2 className="label">{group.label}</h2>
          </div>

          <ul className="deck__grid">
            {group.cards.map((card) => (
              <li key={card.code}>
                <Link href={`/deck/${card.code}`} className="deck__cell">
                  <CardFace card={card} variant="grid" />
                  <span className="visually-hidden">{card.name}</span>
                  <span className="deck__cell-caption">{birthdayCountLabel(card.name)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {groups.length === 0 && <p className="deck__empty">Nothing in the deck matches that.</p>}
    </main>
  );
}
