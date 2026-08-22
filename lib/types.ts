export type Suit = 'Hearts' | 'Clubs' | 'Diamonds' | 'Spades';

/** The fields every screen needs. Shipped to the browser. */
export interface CardIndexEntry {
  name: string;
  short: string;
  sym: string;
  suit: Suit;
  rank: string;
  code: string;
  red: boolean;
  planet: string;
  keywords: string[];
  intensity: string;
  volatility: string;
  desc: string;
  uplifted: string;
  shadow: string;
  archName: string;
  lesson: string;
  archBullets: string[];
}

/** The full study. Server-only — see lib/cards.ts. */
export interface Card extends CardIndexEntry {
  general: string;
  love: string;
  money: string;
  health: string;
  spirit: string;
  bizBullets: string[];
  intentions: string[];
}

export interface Keyword {
  k: string;
  cat: string;
  def: string;
}

/** "MM-DD" — the year never changes which card a date returns. */
export type DayKey = string;
