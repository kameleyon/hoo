/**
 * Sanity check on the lesson outline.
 *
 *   node scripts/check-lessons.mjs
 *
 * The number is the database key, so a title inserted above a written lesson
 * would slide that lesson's body under the wrong heading. This prints the
 * boundaries and refuses if two titles collide.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'lib/lessons.ts'), 'utf8');

const start = src.indexOf('const RAW');
const open = src.indexOf('[', src.indexOf('=', start));
const close = src.indexOf('\n];', open);
const literal = src.slice(open, close + 2);

// Pairs of quoted strings. Either quote style: a title containing an apostrophe
// is written with double quotes rather than escaped, and a checker that only
// understood single quotes would silently undercount.
const titles = [];
const re = /\[\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*,\s*'([^']*)'\s*\]/g;
let m;
while ((m = re.exec(literal))) {
  titles.push({ title: m[2].replace(/\\'/g, "'"), mins: m[3] });
}

console.log(`total lessons: ${titles.length}`);
for (const i of [1, 2, 3, 60, 61, 90]) {
  const entry = titles[i - 1];
  console.log(`  ${String(i).padStart(2, '0')}  ${entry ? entry.title : '(none)'}`);
}

const seen = new Map();
let duplicates = 0;
titles.forEach((t, i) => {
  const key = t.title.toLowerCase();
  if (seen.has(key)) {
    console.log(`DUPLICATE  ${String(i + 1).padStart(2, '0')} repeats ${seen.get(key)}: ${t.title}`);
    duplicates++;
  } else {
    seen.set(key, String(i + 1).padStart(2, '0'));
  }
});

if (titles.length > 99) {
  console.log('TOO MANY: the lesson key is two digits, so 99 is the ceiling.');
}

console.log(duplicates === 0 ? 'no duplicate titles' : `${duplicates} duplicate titles`);
process.exit(duplicates === 0 && titles.length <= 99 ? 0 : 1);
