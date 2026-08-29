/**
 * Rebuilds the small mark from the full-size one.
 *
 *   npm run mark
 *
 * public/oracle-mark-96.png is base64-embedded into the header of every page
 * of every PDF, so its file size is multiplied by every page we ever render.
 * The full-size mark is 250px and around 63 KB; at 96px it is around 12 KB and
 * looks identical at the 24pt the header draws it. Run this whenever the logo
 * changes, or the saving quietly disappears.
 */
import { execFileSync } from 'node:child_process';

const script = `
from PIL import Image
im = Image.open('public/oracle-mark.png').convert('RGBA')
im.thumbnail((96, 96), Image.LANCZOS)
im.save('public/oracle-mark-96.png', 'PNG', optimize=True)
print(f'{im.size[0]}x{im.size[1]}')
`;

try {
  const out = execFileSync('python', ['-c', script], { encoding: 'utf8' }).trim();
  console.log(`public/oracle-mark-96.png rebuilt at ${out}`);
} catch (error) {
  console.error('could not rebuild the mark. Pillow is needed: python -m pip install Pillow');
  console.error(error.message);
  process.exit(1);
}
