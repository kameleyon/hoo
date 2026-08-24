/**
 * Checks every date against the rule that generates it.
 *
 *   node scripts/verify-calendar.mjs
 *
 * The day card is not a continuous countdown through the deck. Each month
 * starts two ranks below the last, which the rule expresses directly:
 *
 *   solar value = 55 - (2 x month + day)
 *
 * So January opens on the King of Spades and February opens on the Jack of
 * Spades, not wherever January happened to stop. Reading the January column
 * alone makes it look like a simple run, which is exactly the mistake this
 * guards against: the months are anchored, and a generator that just counted
 * down would agree for thirty-one days and then be wrong for the rest of the
 * year.
 *
 * A value of zero or less has no card. That is December 31, the Joker, which
 * sits outside the spread and has no solar value of its own.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const dayCard = read('lib/data/day-card.json');
const solar = read('lib/data/solar.json');
const cards = read('lib/data/card-index.json');

const codeOfValue = new Map(solar.map((s) => [s.value, s.code]));
const nameOfCode = new Map(cards.map((c) => [c.code, c.name]));

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The card the rule gives, or null where the rule gives the Joker. */
function expected(month, day) {
  const value = 55 - (2 * month + day);
  if (value < 1) return null;
  return nameOfCode.get(codeOfValue.get(value)) ?? null;
}

const wrong = [];
let checked = 0;

for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) {
    const key = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const want = expected(m, d);
    const got = dayCard[key] ?? null;
    checked++;
    if (want !== got) wrong.push({ key, want, got });
  }
}

console.log(`checked ${checked} dates against the rule`);

// The first of each month is where a countdown would drift, so show them.
console.log('\nthe card each month opens on:');
for (let m = 1; m <= 12; m++) {
  const key = `${String(m).padStart(2, '0')}-01`;
  console.log(`  ${key}  ${dayCard[key]}`);
}

if (wrong.length) {
  console.log('\ndates that do not match the rule:');
  for (const w of wrong.slice(0, 20)) {
    console.log(`  ${w.key}  rule says ${w.want ?? 'Joker'}, we ship ${w.got ?? 'nothing'}`);
  }
  console.error(`\n${wrong.length} dates disagree with the rule`);
  process.exit(1);
}

console.log(`\nevery date matches. 12-31 carries no card, which is the Joker.`);
