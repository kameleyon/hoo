/**
 * The two reference tables that sit under everything else: the Grand Solar
 * (Mundane) Spread, and the solar values with their letter codes.
 *
 * Both are generated from cardreftab.md — see scripts/build-reference-data.mjs.
 * Client-safe: only card codes, no long-form prose.
 */
import spreadJson from './data/spread.json';
import solarJson from './data/solar.json';
import { BY_CODE } from './card-index';
import type { CardIndexEntry } from './types';

export interface SpreadPosition {
  row: string;
  column: string;
}

interface SpreadData {
  planets: string[];
  rows: { row: string; cards: string[] }[];
  positions: Record<string, SpreadPosition>;
  crown: { code: string; position: string }[];
  fixed: string[];
  energy: Record<string, string>;
}

const spread = spreadJson as SpreadData;

/** Columns run Neptune to Mercury, left to right. */
export const PLANETS = spread.planets;

/** What each planet means as a row or a column. */
export const PLANET_ENERGY = spread.energy;

export const SPREAD_ROWS = spread.rows;

/**
 * The three Crown Cards sit above the grid rather than in it, and move through
 * it — so they have a position but no fixed row and column.
 */
export const CROWN_CARDS = spread.crown;

/** The three cards that never move from their Mundane position. */
export const FIXED_CARDS = spread.fixed;

/**
 * Where a card sits in the spread. The row planet and the column planet are two
 * of the three major forces on that card's pattern; the third is the personal
 * planetary ruler from astrology, which this system does not hold.
 */
export function planetaryPosition(code: string): SpreadPosition | null {
  return spread.positions[code] ?? null;
}

export function isCrown(code: string): boolean {
  return CROWN_CARDS.some((c) => c.code === code);
}

export function isFixed(code: string): boolean {
  return FIXED_CARDS.includes(code);
}

/* -- solar values ---------------------------------------------------------- */

export interface SolarEntry {
  /** 1–52, in suit order: Hearts, Clubs, Diamonds, Spades. */
  value: number;
  /** Hearts a–m, Clubs n–z, Diamonds A–M, Spades N–Z. Case matters. */
  letter: string;
  code: string;
}

export const SOLAR: SolarEntry[] = solarJson as SolarEntry[];

const byLetter = new Map(SOLAR.map((s) => [s.letter, s]));
const byCardCode = new Map(SOLAR.map((s) => [s.code, s]));
const byValue = new Map(SOLAR.map((s) => [s.value, s]));

export function solarForCard(code: string): SolarEntry | null {
  return byCardCode.get(code) ?? null;
}

export function cardForSolarValue(value: number): CardIndexEntry | null {
  const entry = byValue.get(value);
  return entry ? (BY_CODE[entry.code] ?? null) : null;
}

/** One letter's card. Case-sensitive — 'a' and 'A' are different cards. */
export function cardForLetter(letter: string): CardIndexEntry | null {
  const entry = byLetter.get(letter);
  return entry ? (BY_CODE[entry.code] ?? null) : null;
}

export interface SpelledLetter {
  letter: string;
  value: number;
  card: CardIndexEntry;
}

/**
 * A word or a name taken apart letter by letter.
 *
 * Characters outside the cipher — spaces, digits, punctuation, accents — carry
 * no value and are dropped rather than guessed at.
 */
export function spell(text: string): SpelledLetter[] {
  const out: SpelledLetter[] = [];
  for (const letter of text) {
    const entry = byLetter.get(letter);
    if (!entry) continue;
    const card = BY_CODE[entry.code];
    if (card) out.push({ letter, value: entry.value, card });
  }
  return out;
}

/** The sum of a name's letter values. */
export function wordValue(text: string): number {
  return spell(text).reduce((total, l) => total + l.value, 0);
}
