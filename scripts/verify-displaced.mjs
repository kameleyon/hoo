/**
 * Checks the Displaced Card rule against the source's worked examples.
 *
 *   node scripts/verify-displaced.mjs
 *
 * The source describes the Pure Spread as the original order and the Life
 * Spread as what was made of it, so every card sits in a seat that belonged to
 * another: "Note which card in the Natural spread is displaced by your Birth
 * Card, the card that holds the same position." Same index, two spreads.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const spread = read('lib/data/spread.json');
const solar = read('lib/data/solar.json');
const name = new Map(read('lib/data/card-index.json').map((c) => [c.code, c.name]));

const PURE = [...solar].sort((a, b) => a.value - b.value).map((s) => s.code);
const LIFE = [
  ...spread.rows.flatMap((r) => [...r.cards].reverse()),
  ...spread.crown.map((c) => c.code).reverse(),
];
const at = new Map(LIFE.map((c, i) => [c, i]));
const displaced = (code) => PURE[at.get(code)];

const CASES = [
  { card: '3H', expect: 'AH', quote: 'the 3 H displaces the A H in the Nat. Sp.' },
  { card: '6D', expect: '9C', quote: 'the True Place of the 9 C is displaced by the 6 D' },
];

let failures = 0;
for (const c of CASES) {
  const got = displaced(c.card);
  const ok = got === c.expect;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.get(c.card)} displaces ${name.get(got)}`);
  console.log(`      source: "${c.quote}"`);
}

// A permutation, so nothing may be displaced twice and nothing left out.
const all = new Set(LIFE.map(displaced));
const onto = all.size === 52;
console.log(`${onto ? 'PASS' : 'FAIL'}  each card displaces exactly one other`);
if (!onto) failures++;

console.log(failures === 0 ? '\nthe rule matches the source' : `\n${failures} failed`);
process.exit(failures ? 1 : 0);
