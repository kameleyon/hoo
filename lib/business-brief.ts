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
 * Two fields are permanently marked unavailable. The Reward seat and the Peak
 * seat are named in the report spec but are not defined in any source we hold,
 * and the prompt's own rule is to write around a missing field rather than
 * guess at one.
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
    '## Reward and Peak Seats',
    // Named in the report spec, defined in nothing we hold. Saying so is what
    // stops sections eleven and twelve inventing a seat to hang themselves on.
    `Business ID's Reward Card: ${NA}`,
    `Business ID's Peak Card: ${NA}`,
    `Dynamic Card's Reward Card: ${NA}`,
    `Dynamic Card's Peak Card: ${NA}`,
    'No Reward or Peak seat data exists for either card. Ground sections 11 and 12 in the uplifted and shadow expressions instead, and do not mention a Reward or Peak seat at all.',
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
