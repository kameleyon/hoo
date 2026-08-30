import 'server-only';
import cards from './data/card-index.json';
import { fullCard } from './card-facts';
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
  // The situational fields only exist on the full record.
  const f = fullCard(side.code);
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
    `Love/Relationships field: ${val(f?.love)}`,
    `Business/Money field: ${val(f?.money)}`,
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
    "## How Each Card Sits In The Other's Chart",
    // The seat one card holds in the other's chart is the most concrete thing
    // in the whole reading: it is a fixed placement with a stated meaning, and
    // it is what the reader recognises when they see it described.
    reading.link.bSeat
      ? `B (${reading.b.name}) holds the ${reading.link.bSeat} seat in A's chart.`
      : `B (${reading.b.name}) holds no seat in A's chart.`,
    reading.link.aSeat
      ? `A (${reading.a.name}) holds the ${reading.link.aSeat} seat in B's chart.`
      : `A (${reading.a.name}) holds no seat in B's chart.`,
    reading.link.aSeat || reading.link.bSeat
      ? 'Explain what that placement does day to day, in plain language. A seat is a permanent placement, so this is a standing condition of the relationship, not a phase.'
      : 'Neither sits in the other. Say what that absence means: nothing about this pairing is automatic, and whatever it becomes has to be built deliberately.',
    '',
    '## Venus Placement',
    reading.venus.aVenusIsB || reading.venus.bVenusIsA
      ? [
          reading.venus.aVenusIsB ? `${reading.b.name} is ${reading.a.name}'s Venus card.` : null,
          reading.venus.bVenusIsA ? `${reading.a.name} is ${reading.b.name}'s Venus card.` : null,
          'This is one of the strongest attraction placements there is. Say so plainly.',
        ]
          .filter(Boolean)
          .join('\n')
      : "Neither card is the other's Venus card. Omit this topic entirely; do not mention Venus placement at all.",
    '',
    '## Ages That Favour Them, And Ages That Do Not',
    'These are years of life, not calendar years, and they apply to whichever',
    'person is that age. Write about them as seasons of the relationship.',
    reading.ages.best.length
      ? 'Best ages: ' +
        reading.ages.best
          .map((w) => `${w.age} (${[w.bInA && `B at A's ${w.bInA}`, w.aInB && `A at B's ${w.aInB}`].filter(Boolean).join(', ')})`)
          .join('; ')
      : 'Best ages: not available',
    reading.ages.worst.length
      ? 'Hardest ages: ' +
        reading.ages.worst
          .map((w) => `${w.age} (${[w.bInA && `B at A's ${w.bInA}`, w.aInB && `A at B's ${w.aInB}`].filter(Boolean).join(', ')})`)
          .join('; ')
      : 'Hardest ages: not available',
    '',
    '## Instructions for missing data',
    // Section 2 of the prompt asks for a quote per person. None of the
    // source's quotes were ever digitised, and a required section with no data
    // is an invitation to fill it: the first run quoted the card database and
    // credited it to a real published book. Saying "not available" was not
    // enough, so the section is now forbidden explicitly.
    'No Sacred Symbols quotes are available for either person.',
    'Omit the Quote Block section entirely. Do not write it.',
    'Never attribute any text to Sacred Symbols of the Ancients, or to any',
    'other named work, anywhere in this report. Text supplied above comes from',
    'our own card notes and must never be presented as a quotation from a book.',
    '',
    '## Scores (already calculated, use verbatim)',
    ...reading.categories.map((c) => `${c.name}: ${c.score}`),
    `Overall: ${reading.overall}`,
  ].join('\n');

  return { brief, reading };
}
