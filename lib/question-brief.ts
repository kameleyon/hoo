import 'server-only';
import { cardForKey } from './cardology';
import { displacedFacts, fullCard, type FullCard } from './card-facts';
import type { DayKey } from './types';

/**
 * The Question Data block the One Question prompt expects.
 *
 * The only report with no scorecard: there is nothing to score, because the
 * reader asked something specific and wants an answer rather than a rating.
 * So this brief carries one card, the card it displaced, and the question
 * exactly as it was typed.
 *
 * The category is deliberately not assigned here. Classifying a question is
 * reading comprehension, which is the writer's job, and a keyword matcher
 * would file "should I leave him and take the job in Berlin" under whichever
 * word it happened to see first.
 */

const NA = 'not available';
const val = (v: string) => (v.trim() ? v.trim() : NA);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sayDate(key: DayKey): string {
  const [m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1] ?? ''}`.trim();
}

/** Kept short on purpose: the displaced card is an undercurrent, not a subject. */
function displacedLine(c: FullCard | null): string {
  if (!c) return NA;
  const note = c.shadow || c.uplifted;
  const first = note ? note.split(/(?<=[.!?])\s/)[0] : '';
  return [c.name, c.archetype ? `Archetype: ${c.archetype}` : null, first || null]
    .filter(Boolean)
    .join(' / ');
}

export interface QuestionReading {
  question: string;
  birthday: DayKey;
  card: FullCard;
  displaced: FullCard | null;
}

export function questionBrief(
  question: string,
  birthday: DayKey,
): { brief: string; reading: QuestionReading } | null {
  const asked = question.trim();
  if (!asked) return null;

  const day = cardForKey(birthday);
  if (!day) return null;

  const card = fullCard(day.code);
  if (!card) return null;

  const displaced = displacedFacts(day.code);

  const brief = [
    '# QUESTION DATA',
    '',
    '## Inputs',
    // Verbatim, including its own punctuation. Answering the question someone
    // actually typed is the entire product; tidying it up loses the thing they
    // were really asking.
    `The Question (verbatim): ${asked}`,
    `Birthday: ${sayDate(birthday)}`,
    'Question Category (assigned in Step One): assign this yourself by reading the question.',
    '',
    '## Birth Card',
    `Card: ${card.name}`,
    `Archetype: ${val(card.archetype)}`,
    `Core Keywords: ${card.keywords.join(', ') || NA}`,
    `Intensity: ${val(card.intensity)}`,
    `Uplifted Expression: ${val(card.uplifted)}`,
    `Shadow Expression: ${val(card.shadow)}`,
    `Primary Life Lesson: ${val(card.lesson)}`,
    `Business-Money field: ${val(card.money)}`,
    `Love-Relationships field: ${val(card.love)}`,
    `Health-Wellbeing field: ${val(card.health)}`,
    `General Energy (Everyday) field: ${val(card.general)}`,
    '',
    '## Displaced Card',
    `Card: ${displacedLine(displaced)}`,
    'A displaced card is the one whose seat this card took. It works underneath,',
    'subconsciously, and is often why a question is harder to sit with than it looks.',
    '',
    '## Instructions for missing data',
    'Never attribute any text to a named book, author or system. Everything above',
    'comes from our own notes and must never be presented as a quotation.',
  ].join('\n');

  return { brief, reading: { question: asked, birthday, card, displaced } };
}
