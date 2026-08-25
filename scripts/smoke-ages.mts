import { readLove } from '../lib/love';
const r = readLove('10-08','12-11')!;
console.log(`${r.a.name} x ${r.b.name}  composite ${r.compositeName}  overall ${r.overall}%`);
console.log(`venus: A's Venus is B? ${r.venus.aVenusIsB}   B's Venus is A? ${r.venus.bVenusIsA}`);
console.log(`seats: B sits at ${r.link.bSeat} in A's chart; A sits at ${r.link.aSeat} in B's`);
console.log('\nbest years:');
for (const w of r.ages.best) console.log(`   age ${String(w.age).padStart(2)}  B@${w.bInA ?? '-'} A@${w.aInB ?? '-'}  (+${w.weight})`);
console.log('worst years:');
for (const w of r.ages.worst) console.log(`   age ${String(w.age).padStart(2)}  B@${w.bInA ?? '-'} A@${w.aInB ?? '-'}  (${w.weight})`);
