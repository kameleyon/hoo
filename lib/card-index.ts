/**
 * Client-safe card data.
 *
 * Everything a screen needs to draw a card face, run the deck search, or show
 * the Today hero — but none of the long-form study prose. Import this from
 * client components; import lib/cards.ts only from server components.
 */
import indexJson from './data/card-index.json';
import dayCardJson from './data/day-card.json';
import type { CardIndexEntry, DayKey, Suit } from './types';

export const CARD_INDEX = indexJson as CardIndexEntry[];

export const DAY_CARD = dayCardJson as Record<DayKey, string>;

export const BY_NAME: Record<string, CardIndexEntry> = Object.fromEntries(
  CARD_INDEX.map((c) => [c.name, c]),
);

export const BY_CODE: Record<string, CardIndexEntry> = Object.fromEntries(
  CARD_INDEX.map((c) => [c.code, c]),
);

export const SUITS: Suit[] = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];

export const SUIT_SYMBOL: Record<Suit, string> = {
  Hearts: '♥',
  Clubs: '♣',
  Diamonds: '♦',
  Spades: '♠',
};
