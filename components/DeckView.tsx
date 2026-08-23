'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { CardFace } from './CardFace';
import { useDeckFilter } from './DeckFilterProvider';
import type { SuitFilter } from './DeckFilterProvider';
import { CARD_INDEX, SUITS, SUIT_SYMBOL } from '@/lib/card-index';
import { JOKER, birthdayCountLabel } from '@/lib/cardology';
import { clock } from '@/lib/duration';
import type { Suit } from '@/lib/types';

const FILTERS: SuitFilter[] = ['All', 'Hearts', 'Clubs', 'Diamonds', 'Spades'];

const isRedSuit = (s: Suit) => s === 'Hearts' || s === 'Diamonds';

export interface LessonHit {
  n: string;
  title: string;
  audioSeconds: number | null;
}

export function DeckView({
  lessons = [],
  initialQ = '',
  initialSuit = 'All',
}: {
  lessons?: LessonHit[];
  initialQ?: string;
  initialSuit?: SuitFilter;
}) {
  const { q, setQ, suit, setSuit, hydrated } = useDeckFilter();

  // Before the provider has read the URL, use what the server filtered on —
  // otherwise a shared /deck?q=… link renders the whole deck and then snaps.
  const activeQ = hydrated ? q : initialQ;
  const activeSuit = hydrated ? suit : initialSuit;

  const groups = useMemo(() => {
    const needle = activeQ.trim().toLowerCase();
    const matches = CARD_INDEX.filter(
      (c) =>
        (activeSuit === 'All' || c.suit === activeSuit) &&
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
  }, [activeQ, activeSuit]);

  const needle = activeQ.trim().toLowerCase();

  // Lessons only surface when something is being looked for — the deck is the
  // deck, not a mixed feed.
  const lessonHits = useMemo(
    () => (needle ? lessons.filter((l) => l.title.toLowerCase().includes(needle)) : []),
    [needle, lessons],
  );

  // The Joker belongs to no suit, so a suit filter hides it; a search only finds
  // it by name.
  const showJoker =
    activeSuit === 'All' && (!needle || JOKER.name.toLowerCase().includes(needle) || 'joker'.includes(needle));

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
              aria-pressed={activeSuit === f}
              onClick={() => setSuit(f)}
            >
              <span aria-hidden="true">{f === 'All' ? 'All' : SUIT_SYMBOL[f]}</span>
              <span className="visually-hidden">{f}</span>
            </button>
          ))}
        </div>
      </div>

      {lessonHits.length > 0 && (
        <section className="deck__group">
          <div className="deck__group-head">
            <span className="deck__group-sym" aria-hidden="true">
              ¶
            </span>
            <h2 className="label">Lessons</h2>
          </div>
          <ul className="lessons" style={{ marginTop: 0, borderTop: 0, paddingTop: 8 }}>
            {lessonHits.map((lesson) => (
              <li key={lesson.n} className="lessons__row">
                <Link href={`/learn/${lesson.n}`} className="lessons__title lessons__title--ready">
                  {lesson.title}
                </Link>
                <span className="lessons__mins">{clock(lesson.audioSeconds) ?? 'Read'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* Outside the fifty-two, so outside the four rows — but it is dealt to a
          real date, and people come looking for it. */}
      {showJoker && (
        <section className="deck__group deck__group--joker">
          <div className="deck__group-head">
            <span className="deck__group-sym" aria-hidden="true">
              ★
            </span>
            <h2 className="label">Outside the deck</h2>
          </div>
          <ul className="deck__grid">
            <li>
              <Link href={`/deck/${JOKER.code}`} className="deck__cell">
                <CardFace card={JOKER} variant="grid" />
                <span className="visually-hidden">{JOKER.name}</span>
                <span className="deck__cell-caption">Dec 31</span>
              </Link>
            </li>
          </ul>
        </section>
      )}

      {groups.length === 0 && !showJoker && lessonHits.length === 0 && (
        <p className="deck__empty">Nothing in the deck or the lessons matches that.</p>
      )}
    </main>
  );
}
