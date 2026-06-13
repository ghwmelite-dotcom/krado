/* Dependency-free PNG generator for the Krado mark: forest tile, cream "K",
 * gold dot (the wordmark's period). 4x supersampled for clean edges.
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

const FOREST = [0x04, 0x34, 0x2c];
const CREAM = [0xf1, 0xef, 0xe8];
const GOLD = [0xef, 0x9f, 0x27];

// Normalized geometry (matches favicon.svg on a 64-unit canvas).
const STROKE_HW = 7 / 2 / 64; // half stroke width
const STEM = [[23 / 64, 17 / 64], [23 / 64, 47 / 64]];
const ARM_UP = [[23 / 64, 32 / 64], [41 / 64, 17 / 64]];
const ARM_DN = [[23 / 64, 32 / 64], [43 / 64, 47 / 64]];
const DOT = { c: [48 / 64, 46 / 64], r: 4.5 / 64 };

function distToSeg(px, py, [[ax, ay], [bx, by]]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Colour (RGB) at a normalized point, layering dot > K > tile. */
function markColor(u, v) {
  const dDot = Math.hypot(u - DOT.c[0], v - DOT.c[1]);
  if (dDot <= DOT.r) return GOLD;
  const dK = Math.min(distToSeg(u, v, STEM), distToSeg(u, v, ARM_UP), distToSeg(u, v, ARM_DN));
  if (dK <= STROKE_HW) return CREAM;
  return FOREST;
}

function png(size) {
  const SS = 4; // supersample factor
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor (full-bleed forest tile, no alpha needed)
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const [cr, cg, cb] = markColor(u, v);
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const n = SS * SS;
      raw[row + 1 + x * 3] = Math.round(r / n);
      raw[row + 2 + x * 3] = Math.round(g / n);
      raw[row + 3 + x * 3] = Math.round(b / n);
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [32, 180, 192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png(size));
  console.log(`wrote icons/icon-${size}.png`);
}
