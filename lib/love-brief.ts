import 'server-only';
import cards from './data/card-index.json';
import { chartOf, readLove, type LoveReading } from './love';
import type { DayKey } from './types';

/**
 * The Compatibility Data block the writing prompt expects.
 *
 * The prompt is emphatic that the model calculates nothing: every card, seat
 * and count arrives already solved, and anything genuinely unavailable is
 * marked so rather than left blank. A blank invites a guess; "not available"
 * is an instruction the prompt already knows how to obey, which is to write
 * around the gap instead of inventing one.
 */

const CARD = new Map(cards.map((c) => [c.code, c]));

const NA = 'not available';

/**
 * Empty is not the same as absent to a reader, but it is to a model: a blank
 * after a label reads as a gap to fill. Anything missing says so out loud,
 * because the prompt knows how to write around "not available" and knows
 * nothing about an empty line.
 */
const val = (v: string | null | undefined): string => (v && v.trim() ? v.trim() : NA);

/** A person's Mercury card is simply the second seat in their own chart. */
function seatCard(code: string, seat: string): string | null {
  for (const [card, name] of chartOf(code)) {
    if (name === seat) return CARD.get(card)?.name ?? card;
  }
  return null;
}

function person(label: string, side: LoveReading['a'], key: DayKey): string {
  const c = CARD.get(side.code);
  const planets = side.code;
  return [
    `## ${label}`,
    `Birth Card: ${side.name}`,
    `Birthdate(s): ${key}`,
    `Archetype: ${val(c?.archName)}`,
    `Core Keywords: ${c?.keywords?.join(', ') || NA}`,
    `Intensity: ${val(c?.intensity)}`,
    `Uplifted Expression: ${val(c?.uplifted)}`,
    `Shadow Expression: ${val(c?.shadow)}`,
    `Love/Relationships field: ${val(c?.desc)}`,
    `Business/Money field: ${val(c?.lesson)}`,
    `Mercury companion card: ${seatCard(planets, 'Mercury') ?? NA}`,
    // The source's quotes were never digitised per card, and the prompt forbids
    // inventing one, so this stays absent rather than approximated.
    `Sacred Symbols quote (verbatim, short): ${NA}`,
  ].join('\n');
}

const DIRECTION: Record<string, string> = {
  mutual: 'mutual',
  'a-in-b': 'one-directional (A occupies a seat in B’s chart)',
  'b-in-a': 'one-directional (B occupies a seat in A’s chart)',
  none: 'none',
};

export function compatibilityBrief(aKey: DayKey, bKey: DayKey): { brief: string; reading: LoveReading } | null {
  const reading = readLove(aKey, bKey);
  if (!reading) return null;

  const comp = reading.composite ? CARD.get(reading.composite) : null;
  const pa = reading.contacts.a;
  const pb = reading.contacts.b;

  const brief = [
    '# COMPATIBILITY DATA',
    '',
    person('Person A', reading.a, aKey),
    `Row Planet: ${pa?.row ?? NA}`,
    `Column Planet: ${pa?.column ?? NA}`,
    '',
    person('Person B', reading.b, bKey),
    `Row Planet: ${pb?.row ?? NA}`,
    `Column Planet: ${pb?.column ?? NA}`,
    '',
    '## The Composite Card',
    `Card: ${comp?.name ?? NA}`,
    `Archetype: ${val(comp?.archName)}`,
    `Uplifted Expression: ${val(comp?.uplifted)}`,
    `Shadow Expression: ${val(comp?.shadow)}`,
    `Core Keywords: ${comp?.keywords?.join(', ') || NA}`,
    '',
    '## The Spark Check',
    `Match found: ${reading.spark.match ? 'yes' : 'no'}`,
    `Person A's true complement card: ${
      reading.spark.aCard ? (CARD.get(reading.spark.aCard)?.name ?? reading.spark.aCard) : NA
    }${reading.spark.aSeat ? ` (seated at their ${reading.spark.aSeat})` : ''}`,
    `Person B's true complement card: ${
      reading.spark.bCard ? (CARD.get(reading.spark.bCard)?.name ?? reading.spark.bCard) : NA
    }${reading.spark.bSeat ? ` (seated at their ${reading.spark.bSeat})` : ''}`,
    '',
    '## The Link',
    `Direction: ${DIRECTION[reading.link.direction]}`,
    `Seat occupied (if any): ${
      [
        reading.link.aSeat ? `A holds the ${reading.link.aSeat} seat in B's chart` : null,
        reading.link.bSeat ? `B holds the ${reading.link.bSeat} seat in A's chart` : null,
      ]
        .filter(Boolean)
        .join('; ') || 'none'
    }`,
    `Notes: ${
      reading.link.direction === 'none'
        ? 'Neither card is seated in the other’s chart. The connection is built rather than given.'
        : 'A seat is a permanent placement, not a passing influence.'
    }`,
    '',
    '## Contact Points',
    `Shared Row/Column Planets (count and which): ${
      reading.contacts.shared.length
        ? `${reading.contacts.shared.length} (${reading.contacts.shared.join(', ')})`
        : '0 (none)'
    }`,
    `Suit pairing stated compatible by the source: ${reading.suited ? 'yes' : 'no'}`,
    '',
    '## Shared Echo (optional)',
    reading.echo.length
      ? `Cards seated in both charts: ${reading.echo
          .map((code) => CARD.get(code)?.name ?? code)
          .join(', ')}`
      : `Any card that appears as a companion in both charts: ${NA}`,
    '',
    '## Scores (already calculated, use verbatim)',
    ...reading.categories.map((c) => `${c.name}: ${c.score}`),
    `Overall: ${reading.overall}`,
  ].join('\n');

  return { brief, reading };
}
