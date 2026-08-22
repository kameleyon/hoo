/**
 * Checks the shipped card data against the reference tables in cardreftab.md.
 *
 *   node scripts/verify-reference.mjs
 *
 * Table 1 (the birthday chart) is the same information as lib/data/day-card.json,
 * arrived at independently. If the two disagree, every reading in the app is
 * wrong for at least one date, so this compares all 366 of them.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const doc = readFileSync(resolve(root, 'cardreftab.md'), 'utf8');
const dayCard = JSON.parse(readFileSync(resolve(root, 'lib/data/day-card.json'), 'utf8'));

const SUIT = { '♥': 'Hearts', '♣': 'Clubs', '♦': 'Diamonds', '♠': 'Spades' };
const RANK = {
  A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King',
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
};

/** "K♠" -> "King of Spades"; "10♦" -> "10 of Diamonds" */
function toName(cell) {
  const token = cell.trim();
  if (!token || token === '-') return null;
  if (token === 'Joker') return 'Joker';
  const suit = SUIT[token.slice(-1)];
  const rank = RANK[token.slice(0, -1)];
  if (!suit || !rank) return `?${token}`;
  return `${rank} of ${suit}`;
}

// --- parse table 1 ---------------------------------------------------------
const lines = doc.split('\n');
const start = lines.findIndex((l) => l.includes('| Day | Jan |'));
if (start === -1) throw new Error('could not find the birthday chart');

const fromDoc = new Map();
for (const line of lines.slice(start + 2)) {
  if (!line.trim().startsWith('|')) break;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  const day = Number(cells[0]);
  if (!Number.isInteger(day)) continue;
  cells.slice(1, 13).forEach((cell, monthIndex) => {
    const name = toName(cell);
    if (!name) return;
    const key = `${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    fromDoc.set(key, name);
  });
}

console.log(`reference table: ${fromDoc.size} dates`);
console.log(`shipped data:    ${Object.keys(dayCard).length} dates\n`);

// --- compare ---------------------------------------------------------------
const mismatches = [];
const missingFromApp = [];
for (const [key, name] of fromDoc) {
  const shipped = dayCard[key];
  if (name === 'Joker') {
    if (shipped) mismatches.push(`${key}: reference says Joker, app says ${shipped}`);
    continue;
  }
  if (!shipped) missingFromApp.push(`${key}: reference says ${name}, app has nothing`);
  else if (shipped !== name) mismatches.push(`${key}: reference ${name} vs app ${shipped}`);
}

const extraInApp = Object.keys(dayCard).filter((k) => !fromDoc.has(k));

if (mismatches.length === 0 && missingFromApp.length === 0) {
  console.log(`OK  all ${fromDoc.size} dates in the reference match the shipped data`);
} else {
  for (const m of [...mismatches, ...missingFromApp]) console.log(`MISMATCH  ${m}`);
}

if (extraInApp.length) {
  console.log(`\nDates the app has that the table does not list: ${extraInApp.join(', ')}`);
  for (const key of extraInApp) console.log(`  ${key} -> ${dayCard[key]}`);
}

process.exit(mismatches.length + missingFromApp.length === 0 ? 0 : 1);
