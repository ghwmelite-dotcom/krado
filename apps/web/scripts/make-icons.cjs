/* One-off PNG placeholder generator (no deps): paints the kente band
 * pattern (2:1:2:1:2:1:2) as vertical stripes on the mist background.
 * Run: node scripts/make-icons.cjs  (from apps/web)
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Kente band: gold, black, green, red, gold, black, green at 2:1:2:1:2:1:2.
const BANDS = [
  [2, [0xba, 0x75, 0x17]],
  [1, [0x2c, 0x2c, 0x2a]],
  [2, [0x3b, 0x6d, 0x11]],
  [1, [0xa3, 0x2d, 0x2d]],
  [2, [0xba, 0x75, 0x17]],
  [1, [0x2c, 0x2c, 0x2a]],
  [2, [0x3b, 0x6d, 0x11]],
];
const UNITS = BANDS.reduce((sum, [w]) => sum + w, 0);
const MIST = [0xf1, 0xef, 0xe8];

function colorAt(x, y, size) {
  // Mist canvas with a centered horizontal kente strip (strip height = size/5).
  const stripTop = Math.floor(size * 0.4);
  const stripBottom = Math.floor(size * 0.6);
  if (y < stripTop || y >= stripBottom) return MIST;
  const unit = (x / size) * UNITS;
  let acc = 0;
  for (const [w, rgb] of BANDS) {
    acc += w;
    if (unit < acc) return rgb;
  }
  return MIST;
}

function png(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = colorAt(x, y, size);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png(size));
  console.log(`wrote icons/icon-${size}.png`);
}
