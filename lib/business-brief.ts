import 'server-only';
import { readBusiness, type BusinessReading, type CardFacts } from './business';
import type { DayKey } from './types';

/**
 * The Business Data block the writing prompt expects.
 *
 * Same discipline as the love brief: everything arrives solved, and anything
 * genuinely missing says "not available" rather than being left blank, because
 * a blank after a label is an invitation to fill it.
 *
 * The report spec originally asked for a "Reward seat" and a "Peak seat".
 * Neither name appears in any source we hold. The seats it meant are numbers
 * nine and ten of a card's own chart, which the source's TABLE OF NUMBER
 * RULERS names Bacchus and Vulcan, so those are supplied under their real
 * names rather than approximated under invented ones.
 */

const NA = 'not available';
const val = (v: string | null | undefined) => (v && v.trim() ? v.trim() : NA);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sayDate(key: DayKey): string {
  const [m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1] ?? ''}`.trim();
}

function cardBlock(label: string, c: CardFacts, sum: string): string {
  return [
    `## ${label}`,
    sum,
    `Card: ${c.name}`,
    `Archetype: ${val(c.archetype)}`,
    `Core Keywords: ${c.keywords.join(', ') || NA}`,
    `Intensity: ${val(c.intensity)}`,
    `Uplifted Expression: ${val(c.uplifted)}`,
    `Shadow Expression: ${val(c.shadow)}`,
    `Business-Money field: ${val(c.money)}`,
    `Primary Life Lesson: ${val(c.lesson)}`,
    `Row Planet: ${val(c.row)}`,
    `Column Planet: ${val(c.column)}`,
  ].join('\n');
}

const DIRECTION: Record<string, string> = {
  mutual: 'mutual, each is seated in the other',
  'a-in-b': "one-directional, the Business ID occupies a seat in the Dynamic Card's chart",
  'b-in-a': "one-directional, the Dynamic Card occupies a seat in the Business ID's chart",
  none: 'none, neither is seated in the other',
};

export function businessBrief(
  name: string,
  launch: DayKey,
  founder: DayKey,
): { brief: string; reading: BusinessReading } | null {
  const reading = readBusiness(name, launch, founder);
  if (!reading) return null;

  const seat = reading.link.bSeat ?? reading.link.aSeat;

  const brief = [
    '# BUSINESS DATA',
    '',
    '## Inputs',
    `Business Name: ${reading.inputs.name}`,
    `Launch Date: ${sayDate(reading.inputs.launch)}`,
    `Founder Date of Birth: ${sayDate(reading.inputs.founder)}`,
    '',
    '## Name Card',
    `Resulting Card: ${reading.nameCard.name} (the letters of the name total ${reading.nameCard.total}, which reduces to ${reading.nameCard.value})`,
    '',
    '## Launch Card',
    `Resulting Card: ${reading.launchCard.name} (value ${reading.launchCard.value})`,
    '',
    `Founder Card, for the second sum only: ${reading.founderCard.name} (value ${reading.founderCard.value}). Do not profile this card on its own.`,
    '',
    cardBlock(
      'Business ID',
      reading.businessId,
      `Name Card value ${reading.nameCard.value} + Launch Card value ${reading.launchCard.value} = ${reading.businessId.name}`,
    ),
    '',
    cardBlock(
      'Business+Person Dynamic',
      reading.dynamic,
      `Launch Card value ${reading.launchCard.value} + Founder Card value ${reading.founderCard.value} = ${reading.dynamic.name}`,
    ),
    '',
    '## Displaced Cards',
    `Business ID's Displaced Card: ${reading.businessId.displaced?.name ?? NA}`,
    `Dynamic Card's Displaced Card: ${reading.dynamic.displaced?.name ?? NA}`,
    'A displaced card is the one whose seat this card took. Its influence works underneath, not on the surface.',
    '',
    '## The Link',
    `Direction: ${DIRECTION[reading.link.direction]}`,
    `Seat occupied: ${seat ?? 'none'}`,
    `Named seat description: ${reading.seatMeaning ?? NA}`,
    '',
    '## Echo Cards',
    reading.echo.length
      ? `Cards seated in both charts: ${reading.echo.map((c) => c.name).join(', ')}`
      : 'none found',
    '',
    '## Contact Points',
    `Shared Row/Column Planets (count and which): ${
      reading.contacts.shared.length
        ? `${reading.contacts.shared.length} (${reading.contacts.shared.join(', ')})`
        : '0 (none)'
    }`,
    `Suit pairing named compatible by the source: ${reading.suited ? 'yes' : 'no'}`,
    '',
    '## Seats Nine and Ten',
    'The source numbers the thirteen seats from zero: Sun, Mercury, Venus, Mars,',
    'Jupiter, Saturn, Uranus, Neptune, Pluto, Bacchus, Vulcan, Moon, Earth.',
    'Bacchus is the ninth and rules the Ten. Vulcan is the tenth and rules the Jack.',
    `Business ID's Bacchus card: ${reading.businessId.bacchus?.name ?? NA}`,
    `Business ID's Vulcan card: ${reading.businessId.vulcan?.name ?? NA}`,
    `Dynamic Card's Bacchus card: ${reading.dynamic.bacchus?.name ?? NA}`,
    `Dynamic Card's Vulcan card: ${reading.dynamic.vulcan?.name ?? NA}`,
    'Use these seats by their real names, Bacchus and Vulcan. Never call either a',
    '"Reward" or a "Peak" seat: those are not terms this system uses.',
    '',
    '## How This Business Evolves',
    'These are years of the business, counting its first year as year one. Each',
    'line is the seat the two cards hold in each other that year, which is what',
    'gives the year its character. A year with no seat either way is a quiet one:',
    'the business runs on its own momentum rather than on the founder.',
    ...reading.timeline.map((y) => {
      const parts = [
        y.bInA ? `the Dynamic sits at the Business ID's ${y.bInA}` : null,
        y.aInB ? `the Business ID sits at the Dynamic's ${y.aInB}` : null,
      ].filter(Boolean);
      return `Year ${y.age}: ${parts.length ? parts.join(', and ') : 'no seat either way'}`;
    }),
    'After year seven the cycle continues through the same sequence of seats.',
    'Write year one, then years one through seven as a shape, then what comes after.',
    '',
    '## Important Periods to Watch',
    'Standout years across the life of the business, from the same sequence.',
    reading.ages.best.length
      ? 'Strongest years: ' +
        reading.ages.best
          .map((w) => `year ${w.age + 1} (${[w.bInA && `Dynamic at ${w.bInA}`, w.aInB && `Business ID at ${w.aInB}`].filter(Boolean).join(', ')})`)
          .join('; ')
      : 'Strongest years: not available',
    reading.ages.worst.length
      ? 'Hardest years: ' +
        reading.ages.worst
          .map((w) => `year ${w.age + 1} (${[w.bInA && `Dynamic at ${w.bInA}`, w.aInB && `Business ID at ${w.aInB}`].filter(Boolean).join(', ')})`)
          .join('; ')
      : 'Hardest years: not available',
    'Describe these as conditions, never as predictions of events.',
    '',
    '## Instructions for missing data',
    'Never attribute any text to a named book, author or system. Everything above',
    'comes from our own notes and must never be presented as a quotation.',
    '',
    '## Scores (already calculated, use verbatim)',
    ...reading.categories.map((c) => `${c.name}: ${c.score}`),
    `Overall: ${reading.overall}`,
  ].join('\n');

  return { brief, reading };
}
