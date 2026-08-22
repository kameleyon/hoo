/**
 * The system itself: which card a date returns, what the Joker is doing on
 * December 31, and the seven fifty-two-day planetary periods.
 *
 * Client-safe — only depends on lib/card-index.ts.
 */
import { BY_NAME, DAY_CARD } from './card-index';
import type { CardIndexEntry, DayKey } from './types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DOW = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const PLANETS = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
];

/** February keeps 29 — the 29th is dealt a card like any other date. */
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** December 31 falls outside the fifty-two. */
export const JOKER: CardIndexEntry = {
  name: 'Joker',
  short: '★',
  sym: '',
  suit: 'Spades',
  rank: 'Joker',
  code: 'JOKER',
  red: false,
  planet: 'Outside the wheel',
  keywords: [],
  intensity: '—',
  volatility: '—',
  desc:
    'This date falls outside the fifty-two. The Joker belongs to no suit and no house — read the days around it instead.',
  uplifted: '',
  shadow: '',
  archName: '',
  lesson: '',
  archBullets: [],
};

/** month is 0-indexed, matching Date#getMonth. */
export function dayKey(month: number, day: number): DayKey {
  return `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDayKey(key: DayKey): { month: number; day: number } | null {
  const m = /^(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  if (month < 0 || month > 11 || day < 1 || day > DAYS_IN_MONTH[month]) return null;
  return { month, day };
}

export function cardNameForKey(key: DayKey): string | undefined {
  return DAY_CARD[key];
}

/** Every date returns a card. Dates outside the fifty-two return the Joker. */
export function cardForKey(key: DayKey): CardIndexEntry {
  const name = DAY_CARD[key];
  return (name && BY_NAME[name]) || JOKER;
}

export function cardForDate(date: Date): CardIndexEntry {
  return cardForKey(dayKey(date.getMonth(), date.getDate()));
}

export function formatDayKey(key: DayKey): string {
  const p = parseDayKey(key);
  return p ? `${MONTHS[p.month]} ${p.day}` : key;
}

export function formatDayKeyShort(key: DayKey): string {
  const p = parseDayKey(key);
  return p ? `${MONTHS[p.month].slice(0, 3)} ${p.day}` : key;
}

/** Every birthday dealt this card, as "Jul 12" strings, in calendar order. */
export function birthdaysFor(name: string): string[] {
  const out: string[] = [];
  for (const key of Object.keys(DAY_CARD)) {
    if (DAY_CARD[key] === name) out.push(formatDayKeyShort(key));
  }
  return out;
}

export function birthdayCountLabel(name: string): string {
  const n = birthdaysFor(name).length;
  return n === 1 ? '1 date' : `${n} dates`;
}

/** The design's leading-sentence trim, used for card blurbs. */
export function firstSentence(text: string | undefined): string {
  if (!text) return '';
  const i = text.indexOf('. ');
  return i > 30 ? text.slice(0, i + 1) : text;
}

export interface Period {
  planet: string;
  start: Date;
  end: Date;
  range: string;
  active: boolean;
}

/**
 * Seven fifty-two-day stretches counted from the birthday, not from January.
 * `now` is passed in so callers control the clock (and so this stays pure).
 */
export function planetaryPeriods(birthday: DayKey, now: Date): Period[] {
  const parsed = parseDayKey(birthday);
  if (!parsed) return [];

  const start = new Date(now.getFullYear(), parsed.month, parsed.day);
  if (start > now) start.setFullYear(start.getFullYear() - 1);

  const fmt = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

  return PLANETS.map((planet, i) => {
    const s = new Date(start);
    s.setDate(s.getDate() + i * 52);
    const e = new Date(s);
    e.setDate(e.getDate() + 51);
    return {
      planet,
      start: s,
      end: e,
      range: `${fmt(s)} – ${fmt(e)}`,
      active: now >= s && now <= e,
    };
  });
}

export function currentPeriod(birthday: DayKey, now: Date): Period | undefined {
  return planetaryPeriods(birthday, now).find((p) => p.active);
}

/** Today, plus the next six days, each with the card it is dealt. */
export function readingWeek(now: Date): { day: string; key: DayKey; card: CardIndexEntry }[] {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const key = dayKey(d.getMonth(), d.getDate());
    out.push({
      day: i === 0 ? 'Today' : DOW[d.getDay()].slice(0, 3),
      key,
      card: cardForKey(key),
    });
  }
  return out;
}

export function todayLabel(now: Date): string {
  return `${DOW[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

/** The subtitle under every card name: its archetype if it has one, else its planet. */
export function cardSubtitle(card: Pick<CardIndexEntry, 'archName' | 'planet'>): string {
  return card.archName || card.planet || '';
}
