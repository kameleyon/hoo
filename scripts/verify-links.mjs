/**
 * Checks the Link algorithm against the worked examples in the source.
 *
 *   node scripts/verify-links.mjs
 *
 * The Link is the single largest term in the compatibility rubric, so it is
 * worth proving rather than trusting. The source prints two counts with every
 * intermediate card named, which makes them exact tests: a grid that is
 * transposed, mirrored or off by one fails them immediately.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spread = JSON.parse(readFileSync(resolve(root, 'lib/data/spread.json'), 'utf8'));

/** rows[r][c] -> card code. Row 0 is Mercury, the top of the body. */
const GRID = spread.rows.map((r) => r.cards);
const ROWS = GRID.length;
const COLS = GRID[0].length;

/**
 * Positions are counted in planetary order, the Sun being the card you start
 * from. So the first card away from the Sun is Mercury, not the Sun itself.
 */
const ORDER = [
  'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'Bacchus', 'Vulcan', 'Moon', 'Earth',
];

const at = (r, c) => GRID[r]?.[c];
const find = (code) => {
  for (let r = 0; r < ROWS; r++) {
    const c = GRID[r].indexOf(code);
    if (c !== -1) return { r, c };
  }
  return null;
};

/** Walks a straight line from the Sun card and names the step it lands on. */
function walk(from, dr, dc, target, limit = 12) {
  let { r, c } = from;
  const path = [];
  for (let step = 1; step <= limit; step++) {
    r += dr;
    c += dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    path.push(at(r, c));
    if (at(r, c) === target) return { planet: ORDER[step], step, path };
  }
  return null;
}

/**
 * Two straight legs at right angles. The turn may happen at any point along
 * the first leg, so every turning point is tried and the shortest count wins.
 */
function rectangular(from, target) {
  const legs = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
  ];
  let best = null;
  for (const [dr1, dc1] of legs) {
    for (const [dr2, dc2] of legs) {
      if (dr1 === dr2 && dc1 === dc2) continue;
      if (dr1 === -dr2 && dc1 === -dc2) continue;
      for (let turn = 1; turn <= 6; turn++) {
        let r = from.r;
        let c = from.c;
        let step = 0;
        const path = [];
        let ok = true;
        for (let i = 0; i < turn; i++) {
          r += dr1; c += dc1; step++;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { ok = false; break; }
          path.push(at(r, c));
          if (at(r, c) === target) { ok = false; break; }
        }
        if (!ok) continue;
        for (let i = 0; i < 8; i++) {
          r += dr2; c += dc2; step++;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
          path.push(at(r, c));
          if (at(r, c) === target) {
            if (!best || step < best.step) best = { planet: ORDER[step], step, path };
            break;
          }
        }
      }
    }
  }
  return best;
}

const CASES = [
  {
    name: 'Vertical, Life Spread: 9S down to 7C',
    from: '9S', to: '7C',
    run: (a, b) => walk(a, 1, 0, b),
    expect: { planet: 'Mars', path: ['JS', 'AH', '7C'] },
  },
  {
    name: 'Rectangular, Life Spread: 5C to 5D',
    from: '5C', to: '5D',
    run: (a, b) => rectangular(a, b),
    expect: { planet: 'Uranus', path: ['3D', 'AS', '2H', '8C', 'AD', '5D'] },
  },
];

let bad = 0;
for (const t of CASES) {
  const a = find(t.from);
  const got = t.run(a, t.to);
  const planetOk = got?.planet === t.expect.planet;
  const pathOk = !t.expect.path || JSON.stringify(got?.path ?? []) === JSON.stringify(t.expect.path);
  const ok = planetOk && (t.expect.path ? pathOk : true);
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${t.name}`);
  console.log(`      got    ${got?.planet} via ${(got?.path ?? []).join(' ')}`);
  console.log(`      book   ${t.expect.planet} via ${t.expect.path.join(' ')}`);
}

console.log(bad === 0 ? '\nthe grid and the counts agree with the source' : `\n${bad} failed`);
process.exit(bad ? 1 : 0);
