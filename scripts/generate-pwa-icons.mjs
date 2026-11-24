import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const ICONS_DIR = resolve(ROOT_DIR, 'public', 'icons');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Precompute IEEE 802.3 CRC32 lookup table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: adaptive
  ihdr[12] = 0; // interlace: none

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0 (None)
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ==========================================
// Analytical 2D Signed Distance Field Math
// ==========================================

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function sdEllipse(x, y, cx, cy, rx, ry, angle = 0) {
  let dx = x - cx;
  let dy = y - cy;
  if (angle !== 0) {
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    const nx = dx * c - dy * s;
    const ny = dx * s + dy * c;
    dx = nx;
    dy = ny;
  }
  const px = dx / rx;
  const py = dy / ry;
  const k0 = Math.hypot(px, py);
  if (k0 < 1e-6) return -Math.min(rx, ry);
  const gx = dx / (rx * rx);
  const gy = dy / (ry * ry);
  const k1 = Math.hypot(gx, gy);
  return (k0 * (k0 - 1)) / k1;
}

function sdRoundBox(x, y, cx, cy, bx, by, r) {
  const qx = Math.abs(x - cx) - (bx - r);
  const qy = Math.abs(y - cy) - (by - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(x, y, ax, ay, bx, by, r) {
  const pax = x - ax;
  const pay = y - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay;
  const h = denom > 0 ? clamp((pax * bax + pay * bay) / denom, 0, 1) : 0;
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

function sdTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const e0x = bx - ax, e0y = by - ay;
  const e1x = cx - bx, e1y = cy - by;
  const e2x = ax - cx, e2y = ay - cy;

  const v0x = px - ax, v0y = py - ay;
  const v1x = px - bx, v1y = py - by;
  const v2x = px - cx, v2y = py - cy;

  const pq0t = clamp((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y), 0, 1);
  const pq1t = clamp((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y), 0, 1);
  const pq2t = clamp((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y), 0, 1);

  const d0x = v0x - e0x * pq0t, d0y = v0y - e0y * pq0t;
  const d1x = v1x - e1x * pq1t, d1y = v1y - e1y * pq1t;
  const d2x = v2x - e2x * pq2t, d2y = v2y - e2y * pq2t;

  const d0 = d0x * d0x + d0y * d0y;
  const d1 = d1x * d1x + d1y * d1y;
  const d2 = d2x * d2x + d2y * d2y;

  const s = Math.sign(e0x * e2y - e0y * e2x);
  const c0 = s * (v0x * e0y - v0y * e0x);
  const c1 = s * (v1x * e1y - v1y * e1x);
  const c2 = s * (v2x * e2y - v2y * e2x);

  const minD = Math.min(d0, d1, d2);
  const inside = Math.min(c0, c1, c2) >= 0;
  return (inside ? -1 : 1) * Math.sqrt(minD);
}

function sdStar4(px, py, cx, cy, rOuter, rInner, rot = 0) {
  let x = px - cx;
  let y = py - cy;
  if (rot !== 0) {
    const c = Math.cos(-rot);
    const s = Math.sin(-rot);
    const nx = x * c - y * s;
    const ny = x * s + y * c;
    x = nx;
    y = ny;
  }
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  // Fold into octant 0 <= u <= v; the star boundary here is a single segment A -> B
  const u = Math.min(ax, ay);
  const v = Math.max(ax, ay);
  const bx = rInner;
  const by = rInner;
  const abx = bx;
  const aby = by - rOuter;
  const apx = u;
  const apy = v - rOuter;
  const t = clamp((apx * abx + apy * aby) / (abx * abx + aby * aby), 0, 1);
  const dist = Math.hypot(apx - abx * t, apy - aby * t);
  const cross = abx * apy - aby * apx;
  return cross <= 0 ? -dist : dist;
}

function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return mix(b, a, h) - k * h * (1 - h);
}

function blendPixel(acc, r, g, b, alpha) {
  const a = clamp(alpha, 0, 1);
  if (a <= 0) return;
  const inv = 1 - a;
  acc[0] = r * a + acc[0] * inv;
  acc[1] = g * a + acc[1] * inv;
  acc[2] = b * a + acc[2] * inv;
  acc[3] = a + acc[3] * inv;
}

function coverage(dist, aa) {
  return clamp(0.5 - dist / aa, 0, 1);
}


// ==========================================
// Cozy Storybook palette (art bible: warm ink, never pure black)
// ==========================================
const INK = [74, 52, 38]; // --ink-warm #4a3426
const PAPER_LIGHT = [248, 236, 208];
const PAPER_SHADE = [222, 196, 156];
const LANTERN = [255, 214, 140];
const AMBIENT = [196, 178, 196]; // cool-violet fill, lower-right
const GOLD = [226, 168, 74];
const GOLD_LIGHT = [247, 211, 128];
const VERMILION = [186, 78, 54];
const TEAL = [74, 128, 122];

// Deterministic hash noise (static paper grain)
function hash2(ix, iy) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

function renderIcon({ size, maskable, fullBleed }) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = 2.2 / size;
  const artScale = maskable ? 0.8 : fullBleed ? 0.88 : 0.92;
  const artAa = aa / artScale;
  const px = [0, 0, 0, 0];
  const ink = (d, w) => coverage(Math.abs(d) - w / 2, artAa);

  for (let py = 0; py < size; py += 1) {
    const ny = ((py + 0.5) / size) * 2 - 1;
    for (let pxIdx = 0; pxIdx < size; pxIdx += 1) {
      const nx = ((pxIdx + 0.5) / size) * 2 - 1;
      const x = nx / artScale;
      const y = ny / artScale;
      px[0] = 0;
      px[1] = 0;
      px[2] = 0;
      px[3] = 0;

      // 1. Gouache paper: light upper-left, shade + cool fill lower-right
      const diag = clamp((nx + ny + 2) / 4, 0, 1);
      let r = mix(PAPER_LIGHT[0], PAPER_SHADE[0], diag * 0.9);
      let g = mix(PAPER_LIGHT[1], PAPER_SHADE[1], diag * 0.9);
      let b = mix(PAPER_LIGHT[2], PAPER_SHADE[2], diag * 0.9);
      const ambient = smoothstep(0.2, 1.0, diag) * 0.22;
      r = mix(r, AMBIENT[0], ambient);
      g = mix(g, AMBIENT[1], ambient);
      b = mix(b, AMBIENT[2], ambient);
      // soft lantern glow pooling upper-left of centre
      const gd = Math.hypot(nx + 0.22, ny + 0.26);
      const glow = Math.exp(-gd * gd * 2.4) * 0.75;
      r = mix(r, LANTERN[0], glow);
      g = mix(g, LANTERN[1], glow);
      b = mix(b, LANTERN[2], glow);
      // static grain + faint fibre streaks
      const grain = (hash2(pxIdx, py) - 0.5) * 7 + (hash2(pxIdx >> 3, py) - 0.5) * 4;
      r += grain;
      g += grain;
      b += grain * 0.8;

      let shapeAlpha = 1;
      if (!fullBleed) {
        const dBadge = sdRoundBox(nx, ny, 0, 0, 0.97, 0.97, 0.36);
        shapeAlpha = coverage(dBadge, aa);
        if (shapeAlpha <= 0) continue;
        // warm ink border + inner gilt hairline
        const edge = coverage(Math.abs(dBadge + 0.03) - 0.014, aa);
        r = mix(r, INK[0], edge * 0.85);
        g = mix(g, INK[1], edge * 0.85);
        b = mix(b, INK[2], edge * 0.85);
        const gilt = coverage(Math.abs(dBadge + 0.085) - 0.006, aa);
        r = mix(r, GOLD[0], gilt * 0.7);
        g = mix(g, GOLD[1], gilt * 0.7);
        b = mix(b, GOLD[2], gilt * 0.7);
      }
      px[0] = r;
      px[1] = g;
      px[2] = b;
      px[3] = 1;

      // 2. Compass dial: tinted drop-shadow, ink ring, inner wash
      const dDial = Math.hypot(x, y) - 0.7;
      const dialShadow = coverage(Math.hypot(x - 0.03, y - 0.04) - 0.7, artAa * 9) * 0.22;
      blendPixel(px, INK[0], INK[1], INK[2], dialShadow);
      const cDisc = coverage(dDial + 0.0, artAa);
      if (cDisc > 0) {
        const lit = Math.exp(-(Math.hypot(x + 0.25, y + 0.28) ** 2) * 2.2);
        blendPixel(px, mix(246, 255, lit), mix(232, 238, lit), mix(200, 184, lit), cDisc * 0.9);
      }
      // teal sea-wash ring band
      const dBand = Math.abs(Math.hypot(x, y) - 0.62) - 0.035;
      blendPixel(px, TEAL[0], TEAL[1], TEAL[2], coverage(dBand, artAa) * 0.38);
      blendPixel(px, INK[0], INK[1], INK[2], ink(dDial, 0.04));
      blendPixel(px, INK[0], INK[1], INK[2], ink(Math.hypot(x, y) - 0.585, 0.014) * 0.7);

      // 3. Degree ticks (16)
      let dTick = 1;
      for (let i = 0; i < 16; i += 1) {
        const ang = (i / 16) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const long = i % 4 === 0;
        const r0 = long ? 0.5 : 0.53;
        dTick = Math.min(dTick, sdSegment(x, y, ca * r0, sa * r0, ca * 0.575, sa * 0.575, 0.0));
      }
      blendPixel(px, INK[0], INK[1], INK[2], coverage(dTick - 0.006, artAa) * 0.6);

      // 4. Compass rose: shadow, diagonal star (teal), main star (gold), north needle (vermilion)
      const dMain = sdStar4(x, y, 0, 0, 0.56, 0.11, 0);
      const dDiag = sdStar4(x, y, 0, 0, 0.36, 0.07, Math.PI / 4);
      const dRose = Math.min(dMain, dDiag);
      blendPixel(px, INK[0], INK[1], INK[2], coverage(sdStar4(x - 0.025, y - 0.035, 0, 0, 0.56, 0.11, 0), artAa * 5) * 0.2);

      const cDiag = coverage(dDiag, artAa);
      if (cDiag > 0) {
        const sh = clamp(0.5 + (x + y) * 0.9, 0, 1);
        blendPixel(px, mix(110, 66, sh), mix(160, 112, sh), mix(150, 108, sh), cDiag);
      }
      blendPixel(px, INK[0], INK[1], INK[2], ink(dDiag, 0.014) * 0.75);

      const cMain = coverage(dMain, artAa);
      if (cMain > 0) {
        // lit upper-left half / shaded lower-right half of each arm
        const lightSide = clamp(0.5 - (x + y) * 2.2, 0, 1);
        blendPixel(
          px,
          mix(GOLD[0] - 28, GOLD_LIGHT[0], lightSide),
          mix(GOLD[1] - 36, GOLD_LIGHT[1], lightSide),
          mix(GOLD[2] - 30, GOLD_LIGHT[2], lightSide),
          cMain
        );
        const dNeedle = sdTriangle(x, y, 0, -0.56, -0.11, -0.11, 0.11, -0.11);
        const cNeedle = coverage(Math.max(dNeedle, dMain), artAa);
        if (cNeedle > 0) {
          const ls = x < 0 ? 1 : 0.78;
          blendPixel(px, VERMILION[0] * ls + 20, VERMILION[1] * ls + 8, VERMILION[2] * ls + 6, cNeedle);
        }
      }
      blendPixel(px, INK[0], INK[1], INK[2], ink(dMain, 0.026));

      // 5. Central gilded hub with lantern spark
      const dHub = Math.hypot(x, y) - 0.085;
      const cHub = coverage(dHub, artAa);
      if (cHub > 0) {
        const hl = clamp(0.5 - (x + y) * 4, 0, 1);
        blendPixel(px, mix(190, 255, hl), mix(130, 232, hl), mix(54, 160, hl), cHub);
      }
      blendPixel(px, INK[0], INK[1], INK[2], ink(dHub, 0.022));
      blendPixel(px, 255, 246, 214, coverage(Math.hypot(x + 0.028, y + 0.03) - 0.016, artAa) * 0.95);

      // 6. Soft lantern bloom over the whole scene (warm, upper-left)
      const bloom = Math.exp(-(Math.hypot(x + 0.5, y + 0.55) ** 2) * 3.5) * 0.12;
      blendPixel(px, LANTERN[0], LANTERN[1], LANTERN[2], bloom);

      const outIdx = (py * size + pxIdx) * 4;
      rgba[outIdx] = clamp(Math.round(px[0]), 0, 255);
      rgba[outIdx + 1] = clamp(Math.round(px[1]), 0, 255);
      rgba[outIdx + 2] = clamp(Math.round(px[2]), 0, 255);
      rgba[outIdx + 3] = clamp(Math.round(shapeAlpha * 255), 0, 255);
    }
  }

  return encodeRgbaPng(size, size, rgba);
}

const ICON_TARGETS = [
  { filename: 'icon-192.png', size: 192, maskable: false, fullBleed: false },
  { filename: 'icon-512.png', size: 512, maskable: false, fullBleed: false },
  { filename: 'icon-maskable-192.png', size: 192, maskable: true, fullBleed: true },
  { filename: 'icon-maskable-512.png', size: 512, maskable: true, fullBleed: true },
  { filename: 'apple-touch-icon.png', size: 180, maskable: false, fullBleed: true },
];

mkdirSync(ICONS_DIR, { recursive: true });

const startMs = Date.now();
for (const target of ICON_TARGETS) {
  const pngBuffer = renderIcon(target);
  const outPath = resolve(ICONS_DIR, target.filename);
  writeFileSync(outPath, pngBuffer);
  console.log(
    `[generate-pwa-icons] wrote ${target.filename} (${target.size}x${target.size}, ${pngBuffer.length} bytes)`
  );
}
console.log(`[generate-pwa-icons] all 5 PNG icons generated in ${Date.now() - startMs}ms`);
