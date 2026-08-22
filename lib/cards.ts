/**
 * Full card records — the long-form study for all fifty-two.
 *
 * SERVER ONLY. Importing this from a client component pulls ~116 KB of prose
 * into the browser bundle; use lib/card-index.ts there instead.
 */
import 'server-only';
import cardsJson from './data/cards.json';
import keywordsJson from './data/keywords.json';
import type { Card, Keyword } from './types';

export const CARDS = cardsJson as Card[];

export const KEYWORDS = keywordsJson as Keyword[];

export const CARD_BY_CODE: Record<string, Card> = Object.fromEntries(
  CARDS.map((c) => [c.code, c]),
);

export const CARD_BY_NAME: Record<string, Card> = Object.fromEntries(
  CARDS.map((c) => [c.name, c]),
);

/**
 * The nine study sections, in the order the design reads them, with any the
 * database leaves empty dropped.
 */
export function studySections(card: Card): { label: string; body: string }[] {
  return [
    { label: 'The card', body: card.desc },
    { label: 'Everyday energy', body: card.general },
    { label: 'At its best', body: card.uplifted },
    { label: 'In shadow', body: card.shadow },
    { label: 'The life lesson', body: card.lesson },
    { label: 'Love', body: card.love },
    { label: 'Money and work', body: card.money },
    { label: 'Health', body: card.health },
    { label: 'Spirit', body: card.spirit },
  ].filter((s) => Boolean(s.body));
}
