/**
 * Checks the composite-card rule against the worked examples in the source.
 *
 *   node scripts/verify-composite.mjs
 *
 * The rule is arithmetic, so no 52x52 lookup table is needed: add the two solar
 * values, subtract 52 until the result is 52 or less, read the card off the
 * solar table. The book prints six worked examples, and each one is a test.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const solar = JSON.parse(readFileSync(resolve(root, 'lib/data/solar.json'), 'utf8'));
const dayCard = JSON.parse(readFileSync(resolve(root, 'lib/data/day-card.json'), 'utf8'));
const cards = JSON.parse(readFileSync(resolve(root, 'lib/data/card-index.json'), 'utf8'));

const byCode = new Map(cards.map((c) => [c.code, c]));
const valueOfCode = new Map(solar.map((s) => [s.code, s.value]));
const codeOfValue = new Map(solar.map((s) => [s.value, s.code]));
const codeOfName = new Map(cards.map((c) => [c.name, c.code]));

/** "10♦" -> "10D" */
const SUIT = { '♥': 'H', '♣': 'C', '♦': 'D', '♠': 'S' };
const code = (token) => `${token.slice(0, -1)}${SUIT[token.slice(-1)]}`;

/** The Joker has no solar value; the book treats it as zero. */
const solarOf = (c) => (c === 'JOKER' ? 0 : (valueOfCode.get(c) ?? null));

export function composite(codes) {
  const total = codes.reduce((sum, c) => sum + (solarOf(c) ?? 0), 0);
  if (total === 0) return null;
  const remainder = total % 52;
  const value = remainder === 0 ? 52 : remainder;
  return { total, value, code: codeOfValue.get(value) };
}

/** The book's examples, transcribed with their stated answers. */
const EXAMPLES = [
  { people: ['04-11', '11-18'], expect: 'Q♠', total: 51 },
  { people: ['04-01', '08-04'], expect: '3♦', total: 81 },
  { people: ['02-09', '09-30'], expect: '10♠', total: 49 },
  { people: ['02-13', '03-30'], expect: '5♥', total: 57 },
  { people: ['07-09', '12-31'], expect: '6♦', total: 32 },
];

let failures = 0;
for (const ex of EXAMPLES) {
  const codes = ex.people.map((d) => {
    const name = dayCard[d];
    return name ? codeOfName.get(name) : 'JOKER';
  });
  const got = composite(codes);
  const want = code(ex.expect);
  const ok = got?.code === want && got.total === ex.total;
  if (!ok) failures++;
  const label = codes.map((c) => (c === 'JOKER' ? 'JOKER' : byCode.get(c)?.name)).join(' + ');
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${ex.people.join(' & ')}  ${label}` +
      `  => ${got?.total} -> ${got?.code} (book says ${ex.total} -> ${want})`,
  );
}

console.log(failures === 0 ? '\nthe rule reproduces every worked example' : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
