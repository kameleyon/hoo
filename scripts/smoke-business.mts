import { readBusiness } from '../lib/business';
const r = readBusiness('Haus of Oracle', '09-15', '10-08');
if (!r) { console.log('no reading'); process.exit(1); }
console.log(`name "${r.inputs.name}" -> ${r.nameCard.name} (total ${r.nameCard.total}, value ${r.nameCard.value})`);
console.log(`launch ${r.inputs.launch} -> ${r.launchCard.name} (${r.launchCard.value})`);
console.log(`founder ${r.inputs.founder} -> ${r.founderCard.name} (${r.founderCard.value})`);
console.log(`\nBusiness ID : ${r.businessId.name}  [displaces ${r.businessId.displaced?.name}]  ${r.businessId.row}/${r.businessId.column}`);
console.log(`Dynamic     : ${r.dynamic.name}  [displaces ${r.dynamic.displaced?.name}]  ${r.dynamic.row}/${r.dynamic.column}`);
console.log(`link=${r.link.direction} seat=${r.link.bSeat ?? r.link.aSeat ?? 'none'} shared=${r.contacts.shared.join(',')||'none'} suited=${r.suited} echo=${r.echo.length}`);
console.log('');
for (const c of r.categories) console.log(`  ${String(c.score).padStart(3)}  ${c.name}`);
console.log(`  ${String(r.overall).padStart(3)}  Overall`);
console.log('\nhook:', r.hook);
