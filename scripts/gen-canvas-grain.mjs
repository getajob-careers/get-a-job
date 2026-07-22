// Bakes the canvas ground "paper grain" into a static, seamlessly-tiling PNG.
//
// WHY this exists: the original canvas grain was a runtime <feTurbulence> SVG
// filter. It was retired (it evaluated every paint and, via mix-blend multiply,
// greyed the cream). The look — fine organic paper fiber — is still wanted. This
// script reproduces that look by rendering fractal value-noise ONCE, ahead of
// time, into a small grayscale tile. At runtime the browser only blits a bitmap;
// no feTurbulence is evaluated. The tile is applied with `mix-blend-mode:
// soft-light` (mean-preserving) so the cream is NOT greyed.
//
// Run: node scripts/gen-canvas-grain.mjs
// Output: src/pages/_preview/assets/canvas-grain.png (grayscale, 128x128, tileable)

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SIZE = 128; // tile edge in px; grain is fine so repeats are invisible
const OCTAVES = [
  // [cells across the tile, amplitude] — cells must divide SIZE so each octave
  // wraps seamlessly (pixel at SIZE maps back to 0). Energy biased to fine
  // scales to match the retired feTurbulence baseFrequency ~0.85 fiber.
  [16, 0.34],
  [32, 0.44],
  [64, 0.6],
  [128, 0.5],
];
const CONTRAST = 1.0; // 1 = raw; the preview also dials strength via layer opacity
const SEED = 7;

// --- deterministic hash -> [0,1) lattice value, wrapping on the cell grid ---
function latticeValue(gx, gy, cells, seed) {
  const x = ((gx % cells) + cells) % cells;
  const y = ((gy % cells) + cells) % cells;
  let h =
    (x * 374761393 + y * 668265263 + seed * 2246822519 + cells * 3266489917) >>>
    0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
const lerp = (a, b, t) => a + (b - a) * t;

function octaveNoise(px, py, cells, seed) {
  const fx = (px / SIZE) * cells;
  const fy = (py / SIZE) * cells;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const v00 = latticeValue(x0, y0, cells, seed);
  const v10 = latticeValue(x0 + 1, y0, cells, seed);
  const v01 = latticeValue(x0, y0 + 1, cells, seed);
  const v11 = latticeValue(x0 + 1, y0 + 1, cells, seed);
  return lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
}

// --- build grayscale pixel buffer, normalized then contrast-mapped around 0.5 ---
const gray = new Float64Array(SIZE * SIZE);
const ampTotal = OCTAVES.reduce((s, [, a]) => s + a, 0);
let lo = Infinity;
let hi = -Infinity;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let sum = 0;
    OCTAVES.forEach(([cells, amp], i) => {
      sum += amp * octaveNoise(x, y, cells, SEED + i * 101);
    });
    const v = sum / ampTotal;
    gray[y * SIZE + x] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
}

const raw = Buffer.alloc(SIZE * (SIZE + 1)); // one filter byte (0) per scanline
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    let v = (gray[y * SIZE + x] - lo) / (hi - lo); // normalize to [0,1]
    v = 0.5 + (v - 0.5) * CONTRAST; // contrast around mid
    raw[y * (SIZE + 1) + 1 + x] = Math.max(
      0,
      Math.min(255, Math.round(v * 255)),
    );
  }
}

// --- minimal grayscale PNG encoder ---
const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 0; // color type 0 = grayscale
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "pages",
  "_preview",
  "assets",
);
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "canvas-grain.png");
writeFileSync(outPath, png);
console.log(
  `wrote ${outPath} — ${(png.length / 1024).toFixed(1)}KB (${SIZE}x${SIZE} grayscale)`,
);
