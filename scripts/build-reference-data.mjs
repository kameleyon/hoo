/**
 * Generates lib/data/spread.json and lib/data/solar.json from cardreftab.md.
 *
 *   node scripts/build-reference-data.mjs
 *
 * Parsed rather than retyped: a transcription slip in a 49-cell grid or a
 * 52-row cipher table is invisible by eye and wrong in every reading built on
 * it. Both outputs are checked for completeness before being written — all
 * fifty-two cards must appear exactly once.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const doc = readFileSync(resolve(root, 'cardreftab.md'), 'utf8');
const cards = JSON.parse(readFileSync(resolve(root, 'lib/data/card-index.json'), 'utf8'));

const SUIT_LETTER = { '♥': 'H', '♣': 'C', '♦': 'D', '♠': 'S' };
const RANK_WORD = {
  Ace: 'A', Two: '2', Three: '3', Four: '4', Five: '5', Six: '6', Seven: '7',
  Eight: '8', Nine: '9', Ten: '10', Jack: 'J', Queen: 'Q', King: 'K',
};

const byCode = new Map(cards.map((c) => [c.code, c]));
const codeOf = (token) => {
  const t = token.trim();
  const suit = SUIT_LETTER[t.slice(-1)];
  const rank = t.slice(0, -1);
  const code = `${rank}${suit}`;
  if (!byCode.has(code)) throw new Error(`unknown card in reference: "${t}" -> ${code}`);
  return code;
};

const lines = doc.split('\n');
const rowsAfter = (needle, count) => {
  const at = lines.findIndex((l) => l.includes(needle));
  if (at === -1) throw new Error(`could not find "${needle}"`);
  return lines.slice(at + count);
};

// --- Table 2: the Mundane / Grand Solar Spread -----------------------------
const PLANETS = ['Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury'];

const grid = [];
for (const line of rowsAfter('| ♆ Neptune | ♅ Uranus |', 2)) {
  if (!line.trim().startsWith('|')) break;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  const rowPlanet = cells[0].replace(/\*\*/g, '').replace(/^[^A-Za-z]+/, '').trim();
  if (!PLANETS.includes(rowPlanet)) continue;
  grid.push({ row: rowPlanet, cards: cells.slice(1, 8).map(codeOf) });
}
if (grid.length !== 7) throw new Error(`expected 7 spread rows, got ${grid.length}`);

/** code -> { rowPlanet, columnPlanet } */
const positions = {};
for (const { row, cards: rowCards } of grid) {
  rowCards.forEach((code, i) => {
    positions[code] = { row, column: PLANETS[i] };
  });
}

// The three Crown Cards sit above the grid and move through it.
const CROWN = [
  { code: 'KS', position: 'Saturn' },
  { code: '8D', position: 'Jupiter' },
  { code: '10C', position: 'Mars' },
];

// Three cards never move from their Mundane position.
const FIXED = ['JH', '8C', 'KS'];

const placed = Object.keys(positions).length + CROWN.filter((c) => !positions[c.code]).length;
if (placed !== 52) {
  throw new Error(`spread covers ${placed} cards, expected 52`);
}

const PLANET_ENERGY = {};
for (const line of rowsAfter('| Planet | Row/Column Energy |', 2)) {
  if (!line.trim().startsWith('|')) break;
  const [planetCell, energy] = line.split('|').slice(1, -1).map((c) => c.trim());
  const planet = planetCell.replace(/^[^A-Za-z]+/, '').trim();
  if (planet) PLANET_ENERGY[planet] = energy;
}

// --- Table 3: solar values and letter codes --------------------------------
const solar = [];
for (const line of rowsAfter('| # | Letter | Card | Suit |', 2)) {
  if (!line.trim().startsWith('|')) break;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  // Four blocks of "# | Letter | Card | Suit", separated by a spacer column.
  for (let i = 0; i + 3 < cells.length; i += 5) {
    const [value, letter, rankWord, suitSymbol] = cells.slice(i, i + 4);
    if (!/^\d+$/.test(value)) continue;
    const rank = RANK_WORD[rankWord];
    const suit = SUIT_LETTER[suitSymbol];
    if (!rank || !suit) throw new Error(`unreadable solar row: ${cells.slice(i, i + 4)}`);
    solar.push({ value: Number(value), letter, code: `${rank}${suit}` });
  }
}

solar.sort((a, b) => a.value - b.value);
if (solar.length !== 52) throw new Error(`expected 52 solar values, got ${solar.length}`);
solar.forEach((entry, i) => {
  if (entry.value !== i + 1) throw new Error(`solar values are not 1..52 (saw ${entry.value})`);
});
if (new Set(solar.map((s) => s.letter)).size !== 52) throw new Error('duplicate letter codes');
if (new Set(solar.map((s) => s.code)).size !== 52) throw new Error('duplicate cards in solar table');

// --- write ------------------------------------------------------------------
const out = resolve(root, 'lib/data');
const write = (file, value) => {
  writeFileSync(resolve(out, file), `${JSON.stringify(value)}\n`);
  console.log(`${file}  ${(JSON.stringify(value).length / 1024).toFixed(1)} KB`);
};

write('spread.json', {
  planets: PLANETS,
  rows: grid,
  positions,
  crown: CROWN,
  fixed: FIXED,
  energy: PLANET_ENERGY,
});
write('solar.json', solar);

console.log(`\nspread: 49 grid cards + ${CROWN.length} crown = 52`);
console.log(`solar:  ${solar.length} values, 1..52, letters and cards unique`);
