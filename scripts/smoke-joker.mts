import { readLove } from '../lib/love';
for (const [a,b,label] of [['12-31','02-26','someone born Dec 31'],['10-08','12-31','the other way round']] as const) {
  const r = readLove(a, b);
  console.log(`${label}: ${r ? 'reading produced' : 'NO READING — refused'}`);
}
