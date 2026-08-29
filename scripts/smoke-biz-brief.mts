import { businessBrief } from '../lib/business-brief';
const b = businessBrief('Haus of Oracle', '09-15', '10-08');
if (!b) throw new Error('no brief');
console.log(b.brief);
console.log('\n--- chars:', b.brief.length, '---');
