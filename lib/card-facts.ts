import 'server-only';
import cards from './data/cards.json';
import { displacedBy } from './love';

/**
 * The full record for a card, for the writers.
 *
 * cards.json rather than card-index.json: the index is the trimmed set the
 * browser gets, and it drops exactly the fields a reading needs most, the four
 * situational ones. Nothing here runs on the client, so the full record costs
 * nothing.
 */
export interface FullCard {
  code: string;
  name: string;
  archetype: string;
  keywords: string[];
  intensity: string;
  uplifted: string;
  shadow: string;
  /** The Primary Life Lesson. */
  lesson: string;
  money: string;
  love: string;
  health: string;
  general: string;
}

type Raw = (typeof cards)[number];

const RAW = new Map(cards.map((c) => [c.code, c as Raw]));

const text = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

export function fullCard(code: string): FullCard | null {
  const c = RAW.get(code);
  if (!c) return null;
  return {
    code: c.code,
    name: c.name,
    archetype: text((c as Record<string, unknown>).archName),
    keywords: Array.isArray(c.keywords) ? c.keywords : [],
    intensity: text(c.intensity),
    uplifted: text(c.uplifted),
    shadow: text(c.shadow),
    lesson: text(c.lesson),
    money: text((c as Record<string, unknown>).money),
    love: text((c as Record<string, unknown>).love),
    health: text((c as Record<string, unknown>).health),
    general: text((c as Record<string, unknown>).general),
  };
}

/** The card whose seat this one took, with just enough to describe it. */
export function displacedFacts(code: string): FullCard | null {
  const displaced = displacedBy(code);
  return displaced ? fullCard(displaced) : null;
}
