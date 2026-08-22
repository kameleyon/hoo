/**
 * Rebuilds lib/data/*.json from the exported cardology database
 * (.design-src/cardData.js, the same source the design canvas loads).
 *
 * Two card payloads are emitted on purpose:
 *   cards.json       full records — server-only, used by the static card studies
 *   card-index.json  the subset every client screen needs, so the long-form
 *                    prose never ships in the browser bundle
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, '.design-src/cardData.js'), 'utf8');

/** Slice one `export const NAME = <literal>;` out of the source and parse it. */
function grab(name, closer) {
  const marker = `export const ${name} = `;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`could not find export ${name} in cardData.js`);
  const from = start + marker.length;
  const end = src.indexOf(`${closer};`, from);
  if (end === -1) throw new Error(`unterminated export ${name} in cardData.js`);
  return JSON.parse(src.slice(from, end + 1));
}

const CARDS = grab('CARDS', ']');
const DAY_CARD = grab('DAY_CARD', '}');
const KEYWORDS = grab('KEYWORDS', ']');

if (CARDS.length !== 52) throw new Error(`expected 52 cards, got ${CARDS.length}`);
if (Object.keys(DAY_CARD).length < 365) throw new Error('day-card map looks incomplete');

// `lesson` and `archBullets` are here because the birth-card screen reads them
// and it can only run on the client — the birthday lives in local storage.
const INDEX_FIELDS = [
  'name', 'short', 'sym', 'suit', 'rank', 'code', 'red', 'planet',
  'keywords', 'intensity', 'volatility', 'desc', 'uplifted', 'shadow', 'archName',
  'lesson', 'archBullets',
];

const index = CARDS.map((c) =>
  Object.fromEntries(INDEX_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]])),
);

const out = resolve(root, 'lib/data');
mkdirSync(out, { recursive: true });

function write(file, value) {
  const json = JSON.stringify(value);
  writeFileSync(resolve(out, file), json + '\n');
  return `${file} ${(json.length / 1024).toFixed(1)} KB`;
}

console.log(write('cards.json', CARDS));
console.log(write('card-index.json', index));
console.log(write('day-card.json', DAY_CARD));
console.log(write('keywords.json', KEYWORDS));
