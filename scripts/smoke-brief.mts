import { compatibilityBrief } from '../lib/love-brief';
const built = compatibilityBrief('10-08', '02-26');
if (!built) throw new Error('no brief');
console.log(built.brief);
console.log('\n--- chars:', built.brief.length, '---');
