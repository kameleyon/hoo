/**
 * The design project's oracle-mark.png came back clipped at the read tool's
 * 256 KiB cap — the last ~23% of its scanlines are missing. This rebuilds a
 * structurally valid PNG from the rows that did arrive so the app has a usable
 * mark; replace public/oracle-mark.png with the original whenever it is to hand.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync, constants } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, '.design-src/oracle-mark.png'));

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// --- walk what chunks survived -------------------------------------------
let off = 8;
const idats = [];
let ihdr = null;
while (off + 8 <= src.length) {
  const len = src.readUInt32BE(off);
  const type = src.toString('ascii', off + 4, off + 8);
  const available = src.length - (off + 8);
  const payload = src.subarray(off + 8, off + 8 + Math.min(len, available));
  if (type === 'IHDR') ihdr = payload;
  if (type === 'IDAT') idats.push(payload);
  if (len > available) break; // the clipped tail — its bytes are still usable
  off += 12 + len;
}
if (!ihdr) throw new Error('no IHDR');

const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const channels = 4; // colour type 6, 8-bit RGBA
const stride = 1 + width * channels;

const raw = inflateSync(Buffer.concat(idats), { finishFlush: constants.Z_SYNC_FLUSH });
const rows = Math.floor(raw.length / stride);

// --- pad the missing rows with transparency and re-encode -----------------
const full = Buffer.alloc(stride * height, 0);
raw.subarray(0, rows * stride).copy(full);
for (let y = rows; y < height; y++) full[y * stride] = 0; // filter type: none

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
};

const out = Buffer.concat([
  SIGNATURE,
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(full, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(resolve(root, 'public/oracle-mark.png'), out);
console.log(
  `${width}x${height}, ${rows} of ${height} rows recovered (${Math.round((rows / height) * 100)}%) -> public/oracle-mark.png`,
);
