import { questionBrief } from '../lib/question-brief';
const b = questionBrief('Should I take the offer in Berlin, or wait for the one I actually want?', '10-08');
if (!b) throw new Error('no brief');
console.log(b.brief);
console.log('\n--- chars:', b.brief.length, '---');
