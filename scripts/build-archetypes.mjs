/**
 * Fills in the card archetypes from the catalogue export.
 *
 *   node scripts/build-archetypes.mjs
 *
 * The design export that `npm run data` reads carries an archetype for only six
 * of the fifty-two, but lib/data/sources/CardsGrid_view.csv has one for every
 * card. This copies them across into the generated JSON.
 *
 * The column was written by hand over time and comes in three shapes, so each
 * is parsed rather than assumed:
 *
 *   The Intuitive Leader\n- Receptive\n- Service-oriented
 *   Archetype: The Desire Engine | Traits: passionate, magnetic
 *   The Master Workman - authoritative; wise; steady
 *
 * Existing archetypes are left alone. Six were curated by hand and this has no
 * way of knowing whether the catalogue's version is an improvement.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = resolve(root, 'lib/data/sources/CardsGrid_view.csv');

/** Minimal CSV reader that respects quoted fields and embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const header = rows.shift();
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** A dash separator, however it survived the round trip through Excel. */
const DASH = /\s+(?:[-–—�])\s+/;

function parseArchetype(raw) {
  const text = (raw ?? '').trim();
  if (!text) return null;

  // "Archetype: The Desire Engine | Traits: passionate, magnetic"
  if (/^archetype\s*:/i.test(text)) {
    const [left, right = ''] = text.split('|');
    const name = left.replace(/^archetype\s*:/i, '').trim();
    const traits = right
      .replace(/^\s*traits\s*:/i, '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return name ? { name, bullets: traits } : null;
  }

  // "The Heart Initiator\n- Warm, magnetic\n- Renews connection"
  if (text.includes('\n')) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const name = lines[0].replace(/^archetype\s+name\s*:/i, '').trim();
    const bullets = lines.slice(1).map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    return name ? { name, bullets } : null;
  }

  // "The Master Workman - authoritative; wise; steady"
  const parts = text.split(DASH);
  if (parts.length > 1) {
    const name = parts[0].trim();
    const bullets = parts
      .slice(1)
      .join(' ')
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
    return name ? { name, bullets } : null;
  }

  return { name: text, bullets: [] };
}

const rows = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));

const byCode = new Map();
for (const r of rows) {
  const code = (r['Card Code'] ?? '').trim();
  const parsed = parseArchetype(r['Card Archetype']);
  if (code && parsed) byCode.set(code, parsed);
}

console.log(`archetypes parsed from the catalogue: ${byCode.size}`);

let filled = 0;
let kept = 0;
const missing = [];

for (const file of ['lib/data/cards.json', 'lib/data/card-index.json']) {
  const path = resolve(root, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;

  for (const card of data) {
    if ((card.archName ?? '').trim()) { kept++; continue; }
    const found = byCode.get(card.code);
    if (!found) { missing.push(card.code); continue; }
    card.archName = found.name;
    if (!card.archBullets?.length) card.archBullets = found.bullets;
    touched++;
  }

  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ${file}: filled ${touched}`);
  filled += touched;
}

const withArch = JSON.parse(readFileSync(resolve(root, 'lib/data/card-index.json'), 'utf8'))
  .filter((c) => (c.archName ?? '').trim()).length;

console.log(`\nfilled ${filled}, left alone ${kept}`);
if (missing.length) console.log(`no catalogue entry for: ${[...new Set(missing)].join(', ')}`);
console.log(`cards with an archetype: ${withArch} of 52`);

if (withArch !== 52) {
  console.error('some cards still have no archetype');
  process.exit(1);
}
