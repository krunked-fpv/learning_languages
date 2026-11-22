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

const STARS = [
  { x: -0.68, y: -0.66, r: 0.065, rot: 0, gold: true },
  { x: 0.70, y: -0.62, r: 0.075, rot: 0, gold: true },
  { x: -0.74, y: 0.56, r: 0.055, rot: 0.3, gold: false },
  { x: 0.73, y: 0.54, r: 0.060, rot: 0.15, gold: true },
  { x: -0.42, y: -0.78, r: 0.040, rot: 0, gold: false },
  { x: 0.45, y: -0.77, r: 0.042, rot: 0.2, gold: false },
];

const STAR_DOTS = [
  { x: -0.80, y: -0.30, r: 0.018 },
  { x: 0.81, y: -0.22, r: 0.016 },
  { x: -0.58, y: 0.76, r: 0.018 },
  { x: 0.58, y: 0.76, r: 0.016 },
  { x: -0.22, y: -0.84, r: 0.015 },
  { x: 0.24, y: -0.83, r: 0.015 },
];

function renderIcon({ size, maskable, fullBleed }) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = 2.2 / size;
  const artScale = maskable ? 0.75 : fullBleed ? 0.86 : 0.94;
  const artAa = aa / artScale;

  const px = [0, 0, 0, 0];

  for (let py = 0; py < size; py += 1) {
    const ny = ((py + 0.5) / size) * 2 - 1;
    for (let pxIdx = 0; pxIdx < size; pxIdx += 1) {
      const nx = ((pxIdx + 0.5) / size) * 2 - 1;

      px[0] = 0;
      px[1] = 0;
      px[2] = 0;
      px[3] = 0;

      // 1. Indigo #1e1b4b starlit badge background
      const radialDist = Math.hypot(nx, ny + 0.04);
      const glowFactor = Math.exp(-radialDist * radialDist * 1.45);
      const bgR = mix(30, 56, glowFactor);
      const bgG = mix(27, 50, glowFactor);
      const bgB = mix(75, 146, glowFactor);

      // Subtle indigo-to-gold aura highlight near center
      const centerGlow = Math.exp(-radialDist * radialDist * 3.8);
      const skyR = clamp(bgR + 30 * centerGlow, 0, 255);
      const skyG = clamp(bgG + 20 * centerGlow, 0, 255);
      const skyB = clamp(bgB + 40 * centerGlow, 0, 255);

      if (fullBleed) {
        px[0] = skyR;
        px[1] = skyG;
        px[2] = skyB;
        px[3] = 1;
      } else {
        const badgeDist = sdRoundBox(nx, ny, 0, 0, 0.94, 0.94, 0.25);
        const badgeCov = coverage(badgeDist, aa);
        if (badgeCov <= 0) {
          const outIdx = (py * size + pxIdx) * 4;
          rgba[outIdx] = 0;
          rgba[outIdx + 1] = 0;
          rgba[outIdx + 2] = 0;
          rgba[outIdx + 3] = 0;
          continue;
        }
        // Subtle bevel rim around badge
        const rimFactor = smoothstep(-0.045, -0.008, badgeDist);
        const rimR = mix(skyR, 129, rimFactor * 0.45);
        const rimG = mix(skyG, 140, rimFactor * 0.45);
        const rimB = mix(skyB, 248, rimFactor * 0.55);
        blendPixel(px, rimR, rimG, rimB, badgeCov);
      }

      // Scaled art coordinates for safe-zone compliance
      const x = nx / artScale;
      const y = ny / artScale;

      // 2. Twinkling stars in the night sky
      for (const st of STARS) {
        const dStar = sdStar4(x, y, st.x, st.y, st.r, st.r * 0.24, st.rot);
        const cStar = coverage(dStar, artAa);
        if (cStar > 0) {
          if (st.gold) {
            blendPixel(px, 253, 224, 71, cStar * 0.95);
          } else {
            blendPixel(px, 224, 242, 254, cStar * 0.85);
          }
        }
      }
      for (const dot of STAR_DOTS) {
        const dDot = sdCircle(x, y, dot.x, dot.y, dot.r);
        const cDot = coverage(dDot, artAa);
        if (cDot > 0) {
          blendPixel(px, 254, 249, 195, cDot * 0.8);
        }
      }

      // 3. Golden Starlight Compass Backdrop (centered at y = 0.04)
      const cy = 0.04;
      const compassRelY = y - cy;
      const compassRadius = Math.hypot(x, compassRelY);

      // Soft warm golden glow behind compass
      const aura = Math.exp(-compassRadius * compassRadius * 2.5) * 0.28;
      if (aura > 0.01) {
        blendPixel(px, 251, 191, 36, aura);
      }

      // Compass cardinal & diagonal star spires
      const dCardinal = sdStar4(x, compassRelY, 0, 0, 0.84, 0.22, 0);
      const dDiagonal = sdStar4(x, compassRelY, 0, 0, 0.76, 0.20, Math.PI / 4);
      const dSpires = Math.min(dCardinal, dDiagonal);
      const cSpires = coverage(dSpires, artAa);
      if (cSpires > 0) {
        const shade = clamp((0.6 - compassRelY) * 0.65, 0, 1);
        const spireR = mix(217, 254, shade);
        const spireG = mix(119, 240, shade);
        const spireB = mix(6, 138, shade);
        blendPixel(px, spireR, spireG, spireB, cSpires);
      }

      // Outer compass ring & inner twilight dial
      const dRingOuter = sdCircle(x, compassRelY, 0, 0, 0.64);
      const dRingInner = sdCircle(x, compassRelY, 0, 0, 0.51);

      const cOuterRing = coverage(dRingOuter, artAa);
      if (cOuterRing > 0) {
        // Dark crisp rim + sunlit gold bezel
        const rimT = smoothstep(-0.025, 0, dRingOuter);
        const vertGrad = clamp(0.5 - compassRelY * 0.8, 0, 1);
        const goldR = mix(217, 253, vertGrad);
        const goldG = mix(119, 224, vertGrad);
        const goldB = mix(6, 71, vertGrad);
        const r = mix(goldR, 30, rimT * 0.65);
        const g = mix(goldG, 27, rimT * 0.65);
        const b = mix(goldB, 75, rimT * 0.65);
        blendPixel(px, r, g, b, cOuterRing);
      }

      const cDial = coverage(dRingInner, artAa);
      if (cDial > 0) {
        const innerGlow = clamp(1 - compassRadius / 0.51, 0, 1);
        const dialR = mix(24, 49, innerGlow);
        const dialG = mix(22, 46, innerGlow);
        const dialB = mix(68, 129, innerGlow);
        blendPixel(px, dialR, dialG, dialB, cDial);

        // Subtle inner brass ring pinstripe
        const dPin = Math.abs(compassRadius - 0.475) - 0.009;
        const cPin = coverage(dPin, artAa);
        if (cPin > 0) {
          blendPixel(px, 251, 191, 36, cPin * 0.55 * cDial);
        }
      }

      // 4. Pip the Polyglot Starling!
      // Wings (left and right rounded cobalt explorer wings)
      const dWingL = sdEllipse(x, y, -0.31, 0.10, 0.13, 0.21, -0.38);
      const dWingR = sdEllipse(x, y, 0.31, 0.10, 0.13, 0.21, 0.38);
      const dWings = Math.min(dWingL, dWingR);
      const cWings = coverage(dWings, artAa);
      if (cWings > 0) {
        const wingHighlight = clamp(0.5 - (y - 0.04) * 2.5, 0, 1);
        const wR = mix(29, 59, wingHighlight);
        const wG = mix(78, 130, wingHighlight);
        const wB = mix(216, 246, wingHighlight);
        const wingRim = smoothstep(-0.022, 0, dWings);
        blendPixel(
          px,
          mix(wR, 15, wingRim * 0.6),
          mix(wG, 23, wingRim * 0.6),
          mix(wB, 42, wingRim * 0.6),
          cWings
        );
      }

      // Plump body + round head merged with smooth union
      const dTorso = sdEllipse(x, y, 0, 0.16, 0.31, 0.30);
      const dHead = sdCircle(x, y, 0, -0.10, 0.27);
      const dBody = smin(dTorso, dHead, 0.10);

      // Head crest feathers (3 charming starling tufts)
      const dTuftC = sdSegment(x, y, 0, -0.32, 0.01, -0.47, 0.042);
      const dTuftL = sdSegment(x, y, -0.05, -0.31, -0.12, -0.43, 0.036);
      const dTuftR = sdSegment(x, y, 0.05, -0.31, 0.12, -0.42, 0.035);
      const dPipSilhouette = smin(dBody, Math.min(dTuftC, Math.min(dTuftL, dTuftR)), 0.04);

      const cPip = coverage(dPipSilhouette, artAa);
      if (cPip > 0) {
        // Cobalt plumage gradient
        const topLight = clamp(0.55 - y * 1.4, 0, 1);
        let pR = mix(29, 96, topLight * 0.85);
        let pG = mix(78, 165, topLight * 0.85);
        let pB = mix(216, 250, topLight * 0.85);

        // Soft warm-sky chest/belly patch
        const dBelly = sdEllipse(x, y, 0, 0.22, 0.22, 0.21);
        const bellyCov = coverage(dBelly, artAa * 2.5);
        if (bellyCov > 0) {
          pR = mix(pR, 224, bellyCov * 0.92);
          pG = mix(pG, 242, bellyCov * 0.92);
          pB = mix(pB, 254, bellyCov * 0.92);
        }

        // Crisp dark outline around Pip
        const pipRim = smoothstep(-0.022, 0, dPipSilhouette);
        pR = mix(pR, 15, pipRim * 0.65);
        pG = mix(pG, 23, pipRim * 0.65);
        pB = mix(pB, 42, pipRim * 0.65);

        blendPixel(px, pR, pG, pB, cPip);
      }

      // Rosy cheeks
      const dCheekL = sdEllipse(x, y, -0.165, -0.035, 0.055, 0.034);
      const dCheekR = sdEllipse(x, y, 0.165, -0.035, 0.055, 0.034);
      const cCheeks = coverage(Math.min(dCheekL, dCheekR), artAa * 2);
      if (cCheeks > 0) {
        blendPixel(px, 251, 113, 133, cCheeks * 0.55);
      }

      // Expressive eyes + white catchlights
      const dEyeL = sdCircle(x, y, -0.105, -0.12, 0.054);
      const dEyeR = sdCircle(x, y, 0.105, -0.12, 0.054);
      const dEyes = Math.min(dEyeL, dEyeR);
      const cEyes = coverage(dEyes, artAa);
      if (cEyes > 0) {
        blendPixel(px, 15, 23, 42, cEyes);
        const dGlintL = sdCircle(x, y, -0.12, -0.136, 0.020);
        const dGlintR = sdCircle(x, y, 0.09, -0.136, 0.020);
        const cGlint = coverage(Math.min(dGlintL, dGlintR), artAa);
        if (cGlint > 0) {
          blendPixel(px, 255, 255, 255, cGlint * cEyes);
        }
        const dDotL = sdCircle(x, y, -0.09, -0.104, 0.009);
        const dDotR = sdCircle(x, y, 0.12, -0.104, 0.009);
        const cDotEye = coverage(Math.min(dDotL, dDotR), artAa);
        if (cDotEye > 0) {
          blendPixel(px, 255, 255, 255, cDotEye * 0.8 * cEyes);
        }
      }

      // Cute golden beak
      const dBeakUpper = sdTriangle(x, y, 0, -0.088, -0.068, -0.034, 0.068, -0.034);
      const dBeakLower = sdTriangle(x, y, 0, 0.006, -0.054, -0.036, 0.054, -0.036);
      const cBeakL = coverage(dBeakLower, artAa);
      if (cBeakL > 0) {
        blendPixel(px, 234, 88, 12, cBeakL);
      }
      const cBeakU = coverage(dBeakUpper, artAa);
      if (cBeakU > 0) {
        blendPixel(px, 251, 191, 36, cBeakU);
      }

      // 5. Pip's Explorer Lanyard & Brass Compass Medallion on Chest
      const dRibbonL = sdSegment(x, y, -0.16, 0.04, 0, 0.21, 0.022);
      const dRibbonR = sdSegment(x, y, 0.16, 0.04, 0, 0.21, 0.022);
      const cRibbon = coverage(Math.min(dRibbonL, dRibbonR), artAa);
      if (cRibbon > 0) {
        blendPixel(px, 244, 63, 94, cRibbon);
      }

      const dMedalRim = sdCircle(x, y, 0, 0.25, 0.122);
      const cMedalRim = coverage(dMedalRim, artAa);
      if (cMedalRim > 0) {
        const rimDark = smoothstep(-0.016, 0, dMedalRim);
        const mGrad = clamp(0.5 - (y - 0.25) * 4, 0, 1);
        blendPixel(
          px,
          mix(mix(217, 254, mGrad), 120, rimDark * 0.6),
          mix(mix(119, 240, mGrad), 53, rimDark * 0.6),
          mix(mix(6, 138, mGrad), 15, rimDark * 0.6),
          cMedalRim
        );
      }

      const dMedalFace = sdCircle(x, y, 0, 0.25, 0.088);
      const cMedalFace = coverage(dMedalFace, artAa);
      if (cMedalFace > 0) {
        blendPixel(px, 30, 27, 75, cMedalFace);
        const dMedalStar = sdStar4(x, y, 0, 0.25, 0.076, 0.023, 0);
        const cMedalStar = coverage(dMedalStar, artAa);
        if (cMedalStar > 0) {
          blendPixel(px, 254, 240, 138, cMedalStar * cMedalFace);
        }
      }

      const outIdx = (py * size + pxIdx) * 4;
      rgba[outIdx] = clamp(Math.round(px[0]), 0, 255);
      rgba[outIdx + 1] = clamp(Math.round(px[1]), 0, 255);
      rgba[outIdx + 2] = clamp(Math.round(px[2]), 0, 255);
      rgba[outIdx + 3] = clamp(Math.round(px[3] * 255), 0, 255);
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
