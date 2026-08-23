/**
 * Cross-checks the dropped source files against each other and against the data
 * the app already ships.
 *
 *   node scripts/audit-sources.mjs
 *
 * Run before converting anything. Several of these files cover the same ground
 * — three date calendars, two birthday charts, two planetary tables — and a
 * disagreement between them is a wrong reading for somebody, so it has to be
 * resolved by a person rather than by whichever file got parsed last.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = resolve(root, 'lib/data/sources');

const shipped = JSON.parse(readFileSync(resolve(root, 'lib/data/day-card.json'), 'utf8'));
const spread = JSON.parse(readFileSync(resolve(root, 'lib/data/spread.json'), 'utf8'));

const read = (name) => {
  const path = resolve(sources, name);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
};

/** Minimal CSV split that respects quoted fields. */
function splitRow(line) {
  const out = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cell); cell = ''; }
    else cell += c;
  }
  out.push(cell);
  return out.map((s) => s.trim());
}

function rows(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const header = splitRow(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(splitRow(l).map((v, i) => [header[i], v])));
}

const SUIT = { '♥': 'Hearts', '♣': 'Clubs', '♦': 'Diamonds', '♠': 'Spades' };
const RANK = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
const expand = (token) => {
  const t = token.trim();
  if (!t || t === '-') return null;
  const suit = SUIT[t.slice(-1)];
  if (!suit) return t; // already a full name
  const r = t.slice(0, -1);
  return `${RANK[r] ?? r} of ${suit}`;
};

const report = [];
const note = (line) => { console.log(line); report.push(line); };

// --- the three date calendars ----------------------------------------------
const calendars = {};

const aq = read('day_card_calendar_aquarius_maximus.csv');
if (aq) calendars['aquarius_maximus'] = Object.fromEntries(rows(aq).map((r) => [r['MM-DD'], r.Card]));

const corrected = read('day_card_calendar_corrected.csv');
if (corrected) calendars['corrected'] = Object.fromEntries(rows(corrected).map((r) => [r['MM-DD'], r.Card]));

const chart = read('Cleaned_52_Card_Birthday_Chart.csv') ?? read('52_Card_Birthday_Chart.csv');
if (chart) {
  const map = {};
  for (const r of rows(chart)) {
    const day = String(r.Day).padStart(2, '0');
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].forEach((m, i) => {
      const card = expand(r[m] ?? '');
      if (card) map[`${String(i + 1).padStart(2, '0')}-${day}`] = card;
    });
  }
  calendars['birthday_chart'] = map;
}

calendars['SHIPPED (lib/data)'] = shipped;

note('=== date -> card, across every source ===');
for (const [name, map] of Object.entries(calendars)) {
  note(`  ${name.padEnd(22)} ${Object.keys(map).length} dates`);
}

const names = Object.keys(calendars);
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = calendars[names[i]];
    const b = calendars[names[j]];
    const shared = Object.keys(a).filter((k) => k in b);
    const differ = shared.filter((k) => a[k] !== b[k]);
    const onlyA = Object.keys(a).filter((k) => !(k in b));
    const onlyB = Object.keys(b).filter((k) => !(k in a));
    note(`\n  ${names[i]}  vs  ${names[j]}`);
    note(`    shared ${shared.length}, disagree ${differ.length}, only-left ${onlyA.length}, only-right ${onlyB.length}`);
    for (const k of differ.slice(0, 8)) note(`      ${k}: ${a[k]}  vs  ${b[k]}`);
    if (differ.length > 8) note(`      …and ${differ.length - 8} more`);
    if (onlyA.length && onlyA.length <= 4) note(`      only in left: ${onlyA.join(', ')}`);
    if (onlyB.length && onlyB.length <= 4) note(`      only in right: ${onlyB.join(', ')}`);
  }
}

// --- planetary position -----------------------------------------------------
const planetary = read('CardPlanetary_Position.csv');
if (planetary) {
  note('\n=== planetary position: CSV vs the shipped spread ===');
  const byName = {};
  for (const [code, pos] of Object.entries(spread.positions)) byName[code] = pos;
  const cardsJson = JSON.parse(readFileSync(resolve(root, 'lib/data/card-index.json'), 'utf8'));
  const codeOf = Object.fromEntries(cardsJson.map((c) => [c.name, c.code]));

  let same = 0;
  const mismatches = [];
  for (const r of rows(planetary)) {
    const code = codeOf[r.Card];
    const shippedPos = code ? byName[code] : undefined;
    if (!shippedPos) { mismatches.push(`${r.Card}: not in the shipped grid (Crown?)`); continue; }
    const csv = `${r['Row Planet']}/${r['Column Planet']}`;
    const ours = `${shippedPos.row}/${shippedPos.column}`;
    if (csv === ours) same++;
    else mismatches.push(`${r.Card}: csv ${csv}  vs  shipped ${ours}`);
  }
  note(`  agree ${same}, differ ${mismatches.length}`);
  for (const m of mismatches.slice(0, 10)) note(`    ${m}`);
  if (mismatches.length > 10) note(`    …and ${mismatches.length - 10} more`);
}
