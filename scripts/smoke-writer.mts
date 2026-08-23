import { compatibilityBrief } from '../lib/love-brief';
import { writeLoveReport } from '../lib/writer';

const built = compatibilityBrief('10-08', '02-26');
if (!built) throw new Error('no brief');

console.log('--- BRIEF ---');
console.log(built.brief.slice(0, 700) + '\n...\n');
console.log('brief chars:', built.brief.length);

const t = Date.now();
const written = await writeLoveReport(built.brief);
console.log('\n--- WRITTEN ---');
console.log('model     :', process.env.OPENROUTER_MODEL ?? 'default');
console.log('seconds   :', ((Date.now() - t) / 1000).toFixed(1));
console.log('words     :', written.words, '(target 2000-2200)');
console.log('em dashes :', (written.markdown.match(/—/g) ?? []).length, '(must be 0)');
console.log('\n' + written.markdown.slice(0, 1200));
