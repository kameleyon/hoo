/**
 * Checks the Age Spreads against what the source says about them.
 *
 *   node scripts/verify-ages.mjs
 *
 * The source describes ninety spreads. The first, the Pure Spread, is the deck
 * in perfect order: Ace to King, Hearts then Clubs then Diamonds then Spades.
 * A layout technique called quadration turns it into the Life Spread, and
 * repeating that technique eighty-nine more times returns it to the Pure
 * Spread. Those ninety layouts are the Age Spreads, Age 0 being the Life
 * Spread and Age 89 the Pure Spread.
 *
 * The procedure itself is never written down in anything we hold, but it does
 * not need to be. Both ends are known: the Pure Spread is the solar order and
 * the Life Spread is already shipped. The permutation between them is
 * therefore recoverable by comparison, and if it is the right one it must
 * return to its starting point after exactly ninety applications.
 *
 * That is the test. A permutation of fifty-two cards landing on an order of
 * exactly ninety by coincidence is not a thing that happens, so this passing
 * confirms the inferred permutation, the Life Spread's own ordering, and the
 * identification of the Pure Spread, all at once.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const spread = read('lib/data/spread.json');
const solar = read('lib/data/solar.json');

const PURE = [...solar].sort((a, b) => a.value - b.value).map((s) => s.code);

const LIFE = [
  ...spread.rows.flatMap((r) => [...r.cards].reverse()),
  ...spread.crown.map((c) => c.code).reverse(),
];

const where = new Map(PURE.map((c, i) => [c, i]));
const QUADRATION = LIFE.map((c) => where.get(c));

const apply = (seq) => QUADRATION.map((from) => seq[from]);

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

check('the Pure Spread runs A of Hearts to K of Spades', PURE[0] === 'AH' && PURE[51] === 'KS');
check('all fifty-two appear once in each spread', new Set(PURE).size === 52 && new Set(LIFE).size === 52);

// One quadration takes the Pure Spread to the Life Spread, by construction.
check('one quadration gives the Life Spread', JSON.stringify(apply(PURE)) === JSON.stringify(LIFE));

// Age 0 is the Life Spread; Age 89 is the Pure Spread again.
let seq = PURE;
const ages = [];
for (let n = 0; n < 90; n++) {
  seq = apply(seq);
  ages.push(seq);
}

check('Age 0 is the Life Spread', JSON.stringify(ages[0]) === JSON.stringify(LIFE));
check('Age 89 is the Pure Spread', JSON.stringify(ages[89]) === JSON.stringify(PURE));

// And nothing repeats before then, or there would be fewer than ninety.
const seen = new Set(ages.slice(0, 89).map((a) => a.join(',')));
check('the ninety spreads are all different', seen.size === 89);

console.log(
  failures === 0
    ? '\nthe inferred quadration reproduces every claim the source makes'
    : `\n${failures} failed`,
);
process.exit(failures ? 1 : 0);
