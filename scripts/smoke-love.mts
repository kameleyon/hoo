import { readLove } from '../lib/love';

const PAIRS: [string, string, string][] = [
  ['10-08', '02-26', 'the pair from the screenshot'],
  ['07-12', '02-26', 'the seeded default'],
  ['01-01', '01-01', 'identical birthdays'],
];

for (const [a, b, label] of PAIRS) {
  const r = readLove(a as never, b as never);
  if (!r) { console.log('no reading for', a, b); continue; }
  console.log(`\n=== ${label}: ${a} & ${b} ===`);
  console.log(`${r.a.name}  x  ${r.b.name}   composite ${r.compositeName}`);
  console.log(`link=${r.link.direction} (a@${r.link.aSeat} b@${r.link.bSeat})  spark=${r.spark.match}` +
    `  shared=${r.contacts.shared.join(',') || 'none'}  suited=${r.suited}  echo=${r.echo.length}`);
  console.log(`dynamic ${r.spark.aCount}/${r.spark.bCount} balanced=${r.spark.balanced}`);
  for (const c of r.categories) console.log(`   ${String(c.score).padStart(3)}  ${c.name}`);
  console.log(`   ${String(r.overall).padStart(3)}  Overall`);
  console.log(`hook: ${r.hook}`);
}
