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

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
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
  const rowSub = Buffer.alloc(stride);
  const rowUp = Buffer.alloc(stride);
  const rowAvg = Buffer.alloc(stride);
  const rowPaeth = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const srcOff = y * stride;
    const prevOff = (y - 1) * stride;
    const dstOff = y * (stride + 1);

    let scoreNone = 0;
    let scoreSub = 0;
    let scoreUp = 0;
    let scoreAvg = 0;
    let scorePaeth = 0;

    for (let i = 0; i < stride; i += 1) {
      const x = rgba[srcOff + i];
      const a = i >= 4 ? rgba[srcOff + i - 4] : 0;
      const b = y > 0 ? rgba[prevOff + i] : 0;
      const c = y > 0 && i >= 4 ? rgba[prevOff + i - 4] : 0;

      const sVal = (x - a) & 0xff;
      const uVal = (x - b) & 0xff;
      const aVal = (x - ((a + b) >>> 1)) & 0xff;
      const pVal = (x - paethPredictor(a, b, c)) & 0xff;

      rowSub[i] = sVal;
      rowUp[i] = uVal;
      rowAvg[i] = aVal;
      rowPaeth[i] = pVal;

      scoreNone += x > 127 ? 256 - x : x;
      scoreSub += sVal > 127 ? 256 - sVal : sVal;
      scoreUp += uVal > 127 ? 256 - uVal : uVal;
      scoreAvg += aVal > 127 ? 256 - aVal : aVal;
      scorePaeth += pVal > 127 ? 256 - pVal : pVal;
    }

    const best = Math.min(scoreNone, scoreSub, scoreUp, scoreAvg, scorePaeth);
    if (best === scorePaeth) {
      raw[dstOff] = 4; // Paeth
      rowPaeth.copy(raw, dstOff + 1);
    } else if (best === scoreAvg) {
      raw[dstOff] = 3; // Average
      rowAvg.copy(raw, dstOff + 1);
    } else if (best === scoreSub) {
      raw[dstOff] = 1; // Sub
      rowSub.copy(raw, dstOff + 1);
    } else if (best === scoreUp) {
      raw[dstOff] = 2; // Up
      rowUp.copy(raw, dstOff + 1);
    } else {
      raw[dstOff] = 0; // None
      rgba.copy(raw, dstOff + 1, srcOff, srcOff + stride);
    }
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

function sdRoundBox(x, y, cx, cy, bx, by, r) {
  const qx = Math.abs(x - cx) - (bx - r);
  const qy = Math.abs(y - cy) - (by - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdDiamond(px, py, cx, cy, rx, ry) {
  const dx = Math.abs(px - cx) / rx;
  const dy = Math.abs(py - cy) / ry;
  return (dx + dy - 1) / Math.hypot(1 / rx, 1 / ry);
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
  const u = Math.min(ax, ay);
  const v = Math.max(ax, ay);
  const abx = rInner;
  const aby = rInner - rOuter;
  const apx = u;
  const apy = v - rOuter;
  const t = clamp((apx * abx + apy * aby) / (abx * abx + aby * aby), 0, 1);
  const dist = Math.hypot(apx - abx * t, apy - aby * t);
  const cross = abx * apy - aby * apx;
  return cross <= 0 ? -dist : dist;
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

// Smooth anti-aliased fill coverage (soft hermite ramp avoids 192px stair-stepping)
function fillCov(dist, aa) {
  return smoothstep(aa * 0.65, -aa * 0.65, dist);
}

// Soft anti-aliased stroke coverage with subpixel thinning compensation
function strokeCov(dist, width, aa) {
  const minW = aa * 1.15;
  const effW = Math.max(width, minW);
  const weight = width < minW ? width / minW : 1;
  return smoothstep(aa * 0.72, -aa * 0.72, Math.abs(dist) - effW * 0.5) * weight;
}

// ==========================================
// Deterministic Watercolor & Paper-Fiber Noise
// ==========================================

function hashGrid(ix, iy) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(u, v) {
  const ix = Math.floor(u);
  const iy = Math.floor(v);
  const fx = u - ix;
  const fy = v - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hashGrid(ix, iy);
  const n10 = hashGrid(ix + 1, iy);
  const n01 = hashGrid(ix, iy + 1);
  const n11 = hashGrid(ix + 1, iy + 1);
  return mix(mix(n00, n10, sx), mix(n01, n11, sx), sy);
}

// Soft low-frequency gouache clouding + subtle woven rag paper fibers (compresses cleanly)
function paperWash(nx, ny) {
  const blotch = valueNoise(nx * 2.4 + 4.1, ny * 2.4 + 7.3) - 0.5;
  const mottle = valueNoise(nx * 5.2 + 11.7, ny * 5.2 + 2.9) - 0.5;
  const weaveH = valueNoise(nx * 3.5 + 19.2, ny * 10.5 + 3.4) - 0.5;
  const weaveV = valueNoise(nx * 10.5 + 6.1, ny * 3.5 + 14.8) - 0.5;
  return blotch * 8.5 + mottle * 4.2 + (weaveH + weaveV) * 2.2;
}

// ==========================================
// Cozy Storybook Palette (Bible: warm sepia ink, zero pure black)
// ==========================================

const INK = [74, 52, 38]; // --ink-warm #4a3426
const INK_SOFT = [110, 82, 60]; // --ink-soft
const PAPER_LIGHT = [250, 239, 214];
const PAPER_SHADE = [220, 192, 148];
const VIGNETTE_UMBER = [166, 126, 86];
const LANTERN = [255, 216, 142];
const AMBIENT = [184, 166, 192]; // cool-violet fill, lower-right
const BRASS_HI = [254, 236, 174];
const BRASS_MID = [214, 158, 66];
const BRASS_SHADE = [132, 84, 34];
const GOLD_LIGHT = [250, 224, 138];
const GOLD_SHADE = [188, 126, 44];
const VERMILION_HI = [224, 96, 62];
const VERMILION_SHADE = [152, 52, 36];
const TEAL_HI = [116, 180, 170];
const TEAL_SHADE = [56, 108, 104];
const IVORY_HI = [255, 248, 228];

const TWO_PI = Math.PI * 2;
const SQRT1_2 = Math.SQRT1_2;
// Key light direction vector (~10 o'clock, upper-left)
const LIGHT_X = -0.68;
const LIGHT_Y = -0.733;

function sampleIconPixel(nx, ny, aa, artScale, artAa, fullBleed, out) {
  const x = nx / artScale;
  const y = ny / artScale;
  const rArt = Math.hypot(x, y);
  const rNorm = Math.hypot(nx, ny);

  // Badge clip for non-fullBleed icons
  let shapeAlpha = 1;
  let dBadge = -1;
  if (!fullBleed) {
    dBadge = sdRoundBox(nx, ny, 0, 0, 0.965, 0.965, 0.34);
    shapeAlpha = fillCov(dBadge, aa * 1.15);
    if (shapeAlpha <= 0.001) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      return;
    }
  }

  // 1. Gouache parchment atlas field: upper-left key light, lower-right cool-violet fill, warm vignette
  const diag = clamp((nx + ny + 2) * 0.25, 0, 1);
  let r = mix(PAPER_LIGHT[0], PAPER_SHADE[0], diag * 0.88);
  let g = mix(PAPER_LIGHT[1], PAPER_SHADE[1], diag * 0.88);
  let b = mix(PAPER_LIGHT[2], PAPER_SHADE[2], diag * 0.88);

  // Cool-violet ambient fill pooling lower-right
  const ambient = smoothstep(0.28, 1.0, diag) * 0.24;
  r = mix(r, AMBIENT[0], ambient);
  g = mix(g, AMBIENT[1], ambient);
  b = mix(b, AMBIENT[2], ambient);

  // Warm heirloom watercolor vignette toward edges
  const vig = smoothstep(0.58, 1.28, rNorm) * 0.36;
  r = mix(r, VIGNETTE_UMBER[0], vig);
  g = mix(g, VIGNETTE_UMBER[1], vig);
  b = mix(b, VIGNETTE_UMBER[2], vig);

  // Soft amber reading-lamp pool upper-left
  const lampD = Math.hypot(nx + 0.34, ny + 0.38);
  const lampGlow = Math.exp(-(lampD * lampD) * 1.95) * 0.62;
  r = mix(r, LANTERN[0], lampGlow);
  g = mix(g, LANTERN[1], lampGlow);
  b = mix(b, LANTERN[2], lampGlow);

  // Soft low-frequency watercolor & woven-rag texture
  const wash = paperWash(nx, ny);
  r += wash;
  g += wash * 0.92;
  b += wash * 0.72;

  out[0] = r;
  out[1] = g;
  out[2] = b;
  out[3] = 1;

  // 2. Cartographic background behind medallion: sepia rhumb lines & faint latitude/longitude arcs
  if (rArt > 0.74) {
    const ang = Math.atan2(y, x);
    const rhumbStep = TWO_PI / 16;
    const localRhumb = (((ang % rhumbStep) + rhumbStep * 1.5) % rhumbStep) - rhumbStep * 0.5;
    const dRhumb = rArt * Math.abs(Math.sin(localRhumb));
    const rhumbCov = strokeCov(dRhumb, 0.008, artAa) * (0.2 + 0.12 * smoothstep(0.76, 1.15, rArt));
    blendPixel(out, INK_SOFT[0], INK_SOFT[1], INK_SOFT[2], rhumbCov);

    // Faint curved latitude & longitude arcs across the atlas parchment
    const dLat1 = Math.hypot(nx, ny + 1.55) - 2.18;
    const dLat2 = Math.hypot(nx, ny - 1.55) - 2.18;
    const dLon1 = Math.hypot(nx + 1.55, ny) - 2.18;
    const dLon2 = Math.hypot(nx - 1.55, ny) - 2.18;
    const dArc = Math.min(Math.abs(dLat1), Math.abs(dLat2), Math.abs(dLon1), Math.abs(dLon2));
    blendPixel(out, INK_SOFT[0], INK_SOFT[1], INK_SOFT[2], strokeCov(dArc, 0.007, aa) * 0.22);

    // Faint outer decorative compass track circle in the margins
    const dOuterTrack = Math.hypot(x, y) - 0.91;
    blendPixel(out, INK_SOFT[0], INK_SOFT[1], INK_SOFT[2], strokeCov(dOuterTrack, 0.007, artAa) * 0.2);
  }

  // 3. Non-maskable book-cover frame & brass corner filigree
  if (!fullBleed) {
    // Subtle bevel highlight inside top-left edge, shade bottom-right
    const bevelBand = fillCov(Math.abs(dBadge + 0.036) - 0.022, aa * 1.15);
    if (bevelBand > 0) {
      const edgeLit = clamp(0.5 - (nx + ny) * 0.65, 0, 1);
      blendPixel(
        out,
        mix(VIGNETTE_UMBER[0] - 22, BRASS_HI[0], edgeLit),
        mix(VIGNETTE_UMBER[1] - 24, BRASS_HI[1], edgeLit),
        mix(VIGNETTE_UMBER[2] - 22, BRASS_HI[2], edgeLit),
        bevelBand * 0.42
      );
    }

    // Warm sepia outer ink contour (smooth AA)
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dBadge + 0.022, 0.024, aa * 1.15) * 0.9);
    // Inner gilt hairline border
    const dGilt = dBadge + 0.078;
    blendPixel(out, BRASS_MID[0], BRASS_MID[1], BRASS_MID[2], strokeCov(dGilt, 0.011, aa * 1.15) * 0.85);

    // Delicate brass book-corner filigree (symmetric in all 4 corners, nestled outside the medallion)
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    if (ax > 0.52 && ay > 0.52 && rArt > 0.81) {
      const cornerLight = clamp(0.55 - (nx + ny) * 0.35, 0, 1);
      const filR = mix(BRASS_SHADE[0] + 24, BRASS_HI[0], cornerLight);
      const filG = mix(BRASS_SHADE[1] + 24, BRASS_HI[1], cornerLight);
      const filB = mix(BRASS_SHADE[2] + 18, BRASS_HI[2], cornerLight);

      // Corner accent clasp along inner gilt corner
      const dClasp = Math.max(Math.abs(dBadge + 0.088) - 0.014, 0.64 - Math.min(ax, ay));
      const cClasp = fillCov(dClasp, aa * 1.15);
      if (cClasp > 0) {
        blendPixel(out, filR, filG, filB, cClasp * 0.92);
        blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dClasp, 0.008, aa * 1.15) * 0.65);
      }

      // Corner brass fleur diamond & flanking bead rivets
      const dCornerPip = sdDiamond(ax, ay, 0.785, 0.785, 0.052, 0.052);
      const dBead1 = Math.hypot(ax - 0.835, ay - 0.685) - 0.017;
      const dBead2 = Math.hypot(ax - 0.685, ay - 0.835) - 0.017;
      const dFiligree = Math.min(dCornerPip, dBead1, dBead2);
      const cFil = fillCov(dFiligree, aa * 1.15);
      if (cFil > 0) {
        blendPixel(out, filR, filG, filB, cFil * 0.95);
      }
      blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dFiligree, 0.009, aa * 1.15) * 0.72);
    }
  }

  // 4. Medallion cast shadow (soft warm sepia down-right, never grey/black)
  const rOuter = 0.775;
  const rMidBezel = 0.675;
  const rDial = 0.625;
  const rSeaInner = 0.535;

  const dShadow = Math.hypot(x - 0.036, y - 0.048) - rOuter;
  const shadowCov = smoothstep(0.11, -0.04, dShadow) * 0.28;
  blendPixel(out, INK[0], INK[1], INK[2], shadowCov);

  // 5. Bevelled Double-Brass Bezel (outer sculpted rim + recessed inner brass lip)
  const dOuter = rArt - rOuter;
  const cOuter = fillCov(dOuter, artAa * 1.15);
  if (cOuter > 0) {
    // Directional metallic sheen along the bezel circumference (lit ~10 o'clock)
    const invR = rArt > 1e-5 ? 1 / rArt : 0;
    const ux = x * invR;
    const uy = y * invR;
    const dirLight = ux * LIGHT_X + uy * LIGHT_Y; // +1 at 10 o'clock, -1 at 4 o'clock

    // Radial crown profile across outer bezel (0.675 -> 0.775)
    const bezelT = clamp((rArt - rMidBezel) / (rOuter - rMidBezel), 0, 1);
    const crown = Math.sin(bezelT * Math.PI); // 1 at crest, 0 at inner/outer edges
    const rimSpec = Math.pow(clamp(dirLight * 0.5 + 0.5, 0, 1), 1.65) * (0.45 + 0.55 * crown);
    const coolBounce = smoothstep(0.35, 1.0, -dirLight) * (1 - bezelT * 0.5) * 0.2;

    let brR = mix(BRASS_SHADE[0], BRASS_MID[0], 0.35 + 0.65 * crown);
    let brG = mix(BRASS_SHADE[1], BRASS_MID[1], 0.35 + 0.65 * crown);
    let brB = mix(BRASS_SHADE[2], BRASS_MID[2], 0.35 + 0.65 * crown);

    brR = mix(brR, BRASS_HI[0], rimSpec * 0.88);
    brG = mix(brG, BRASS_HI[1], rimSpec * 0.88);
    brB = mix(brB, BRASS_HI[2], rimSpec * 0.88);

    // Subtle cool-violet ambient bounce on lower-right bronze shadow
    brR = mix(brR, AMBIENT[0], coolBounce);
    brG = mix(brG, AMBIENT[1], coolBounce);
    brB = mix(brB, AMBIENT[2], coolBounce);

    blendPixel(out, brR, brG, brB, cOuter);

    // Inner recessed brass step (0.625 -> 0.675) with inverted bevel lighting
    const dStep = rArt - rMidBezel;
    const cStep = fillCov(dStep, artAa * 1.15);
    if (cStep > 0) {
      // Recessed inner bevel catches light on bottom-right, casts shadow on top-left
      const invLight = clamp(-dirLight * 0.5 + 0.5, 0, 1);
      const stepR = mix(BRASS_SHADE[0] - 12, BRASS_HI[0] - 14, invLight * 0.8);
      const stepG = mix(BRASS_SHADE[1] - 10, BRASS_HI[1] - 24, invLight * 0.8);
      const stepB = mix(BRASS_SHADE[2] - 6, BRASS_HI[2] - 28, invLight * 0.8);
      blendPixel(out, stepR, stepG, stepB, cStep);
    }
  }

  // Smooth warm-ink contour lines for double brass bezel
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dOuter, 0.026, artAa * 1.15) * 0.94);
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(rArt - rMidBezel, 0.012, artAa * 1.15) * 0.68);

  // Cardinal N/E/S/W bevelled enamel diamond pips & 4 diagonal brass rivets on outer bezel
  const rBezelMid = 0.725;
  if (rArt > 0.65 && rArt < 0.81) {
    const dPipN = sdDiamond(x, y, 0, -rBezelMid, 0.036, 0.048);
    const dPipS = sdDiamond(x, y, 0, rBezelMid, 0.031, 0.04);
    const dPipE = sdDiamond(x, y, rBezelMid, 0, 0.04, 0.031);
    const dPipW = sdDiamond(x, y, -rBezelMid, 0, 0.04, 0.031);

    // North ruby-vermilion enamel diamond
    const cPipN = fillCov(dPipN, artAa * 1.15);
    if (cPipN > 0) {
      const nFacet = smoothstep(artAa, -artAa, x);
      blendPixel(
        out,
        mix(VERMILION_SHADE[0] + 14, VERMILION_HI[0] + 18, nFacet),
        mix(VERMILION_SHADE[1] + 6, VERMILION_HI[1] + 14, nFacet),
        mix(VERMILION_SHADE[2] + 4, VERMILION_HI[2] + 12, nFacet),
        cPipN
      );
    }
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dPipN, 0.011, artAa * 1.15) * 0.88);

    // E / S / W ivory-gold enamel diamonds
    const dOtherPips = Math.min(dPipS, dPipE, dPipW);
    const cOtherPips = fillCov(dOtherPips, artAa * 1.15);
    if (cOtherPips > 0) {
      const pLit = clamp(0.55 - (x + y) * 0.3, 0, 1);
      blendPixel(
        out,
        mix(GOLD_LIGHT[0], IVORY_HI[0], pLit),
        mix(GOLD_LIGHT[1], IVORY_HI[1], pLit),
        mix(GOLD_LIGHT[2], IVORY_HI[2], pLit),
        cOtherPips
      );
    }
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dOtherPips, 0.01, artAa * 1.15) * 0.82);

    // 4 diagonal brass rivets
    const diagR = rBezelMid * SQRT1_2;
    const dRivet = Math.hypot(Math.abs(x) - diagR, Math.abs(y) - diagR) - 0.017;
    const cRivet = fillCov(dRivet, artAa * 1.15);
    if (cRivet > 0) {
      const rLit = clamp(0.6 - (x + y) * 0.35, 0, 1);
      blendPixel(
        out,
        mix(BRASS_SHADE[0] + 20, IVORY_HI[0], rLit),
        mix(BRASS_SHADE[1] + 20, IVORY_HI[1], rLit),
        mix(BRASS_SHADE[2] + 12, IVORY_HI[2], rLit),
        cRivet
      );
    }
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dRivet, 0.008, artAa * 1.15) * 0.72);
  }

  // 6. Recessed Illuminated Vellum Compass Dial (r <= 0.625)
  const dDial = rArt - rDial;
  const cDial = fillCov(dDial, artAa * 1.15);
  if (cDial > 0) {
    // Lantern-lit vellum face with subtle dish warmth and delicate paper grain
    const dialLit = Math.exp(-((x + 0.18) * (x + 0.18) + (y + 0.2) * (y + 0.2)) * 2.1);
    const dialShade = smoothstep(0.1, 0.65, rArt);
    const dialWash = wash * 0.55;
    let dR = mix(244, 255, dialLit) - dialShade * 10 + dialWash;
    let dG = mix(228, 243, dialLit) - dialShade * 14 + dialWash * 0.9;
    let dB = mix(194, 206, dialLit) - dialShade * 18 + dialWash * 0.7;

    // Soft inner shadow cast by the raised upper-left bezel rim onto the dial
    const innerRimShadow = smoothstep(rDial - 0.085, rDial, Math.hypot(x + 0.032, y + 0.038)) * 0.24;
    dR = mix(dR, INK[0], innerRimShadow);
    dG = mix(dG, INK[1], innerRimShadow);
    dB = mix(dB, INK[2], innerRimShadow);

    blendPixel(out, dR, dG, dB, cDial);

    // Teal-verdigris watercolor sea-wash track band (0.535 -> 0.625)
    const dSeaBand = Math.max(rArt - rDial, rSeaInner - rArt);
    const cSea = fillCov(dSeaBand, artAa * 1.15);
    if (cSea > 0) {
      const seaLit = clamp(0.55 - (x + y) * 0.55, 0, 1);
      blendPixel(
        out,
        mix(TEAL_SHADE[0] + 18, TEAL_HI[0], seaLit),
        mix(TEAL_SHADE[1] + 22, TEAL_HI[1], seaLit),
        mix(TEAL_SHADE[2] + 20, TEAL_HI[2], seaLit),
        cSea * 0.42
      );
    }

    // Inner track ring & concentric astrolabe ring
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(rArt - rSeaInner, 0.013, artAa * 1.15) * 0.78);
    blendPixel(out, BRASS_MID[0], BRASS_MID[1], BRASS_MID[2], strokeCov(rArt - 0.35, 0.01, artAa * 1.15) * 0.55);

    // 32 O(1) polar-folded degree ticks inside the sea-wash track
    if (rArt > 0.525 && rArt < rDial) {
      const ang = Math.atan2(y, x);
      const step32 = TWO_PI / 32;
      const idx = Math.round(ang / step32);
      const nearestAng = idx * step32;
      let dAng = ang - nearestAng;
      if (dAng > Math.PI) dAng -= TWO_PI;
      if (dAng < -Math.PI) dAng += TWO_PI;
      const dPerp = rArt * Math.abs(Math.sin(dAng));

      const mod8 = ((idx % 8) + 8) % 8;
      const isMajor = mod8 === 0 || mod8 === 4;
      const isMed = mod8 % 2 === 0;
      const tickR0 = isMajor ? 0.538 : isMed ? 0.558 : 0.578;
      const tickW = isMajor ? 0.013 : isMed ? 0.009 : 0.0065;
      const dRadial = Math.max(tickR0 - rArt, rArt - 0.618);
      const dTick = Math.max(dPerp - tickW * 0.5, dRadial);
      blendPixel(out, INK[0], INK[1], INK[2], fillCov(dTick, artAa * 1.15) * (isMajor ? 0.78 : isMed ? 0.62 : 0.44));
    }
  }
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dDial, 0.02, artAa * 1.15) * 0.88);

  // 7. Painterly 8-Point Compass Rose (split-facet bevelled star needles)
  const dMain = sdStar4(x, y, 0, 0, 0.585, 0.132, 0);
  const dDiag = sdStar4(x, y, 0, 0, 0.415, 0.09, Math.PI * 0.25);

  // Soft tinted drop shadow beneath the rose
  const dRoseShadow = Math.min(
    sdStar4(x - 0.024, y - 0.032, 0, 0, 0.585, 0.132, 0),
    sdStar4(x - 0.024, y - 0.032, 0, 0, 0.415, 0.09, Math.PI * 0.25)
  );
  blendPixel(out, INK[0], INK[1], INK[2], smoothstep(0.055, -0.018, dRoseShadow) * 0.23);

  // Secondary diagonal star (NE/SE/SW/NW) — bevelled sea-teal facets
  const cDiag = fillCov(dDiag, artAa * 1.15);
  if (cDiag > 0) {
    // Rotate into diagonal star axes
    const rx = (x + y) * SQRT1_2;
    const ry = (-x + y) * SQRT1_2;
    const isVertDiag = Math.abs(ry) >= Math.abs(rx);
    const ridgeCoord = isVertDiag ? (ry < 0 ? -rx : rx) : (rx < 0 ? -ry : ry);
    const facet = smoothstep(-artAa * 1.2, artAa * 1.2, ridgeCoord);
    const armGrad = clamp(0.55 - (x + y) * 0.55, 0, 1);
    const litT = clamp(facet * 0.82 + armGrad * 0.18, 0, 1);
    blendPixel(
      out,
      mix(TEAL_SHADE[0], TEAL_HI[0], litT),
      mix(TEAL_SHADE[1], TEAL_HI[1], litT),
      mix(TEAL_SHADE[2], TEAL_HI[2], litT),
      cDiag
    );
  }
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dDiag, 0.015, artAa * 1.15) * 0.84);

  // Primary cardinal star (N/E/S/W) — nautical split-facet gold + vermilion North needle
  const cMain = fillCov(dMain, artAa * 1.15);
  if (cMain > 0) {
    const isVert = Math.abs(y) >= Math.abs(x);
    // Consistent upper-left key-light bevel down every needle's spine
    const ridgeSigned = isVert ? -x : -y;
    const facetLit = smoothstep(-artAa * 1.2, artAa * 1.2, ridgeSigned);
    const radialWarm = clamp(1 - rArt * 0.65, 0, 1);

    if (isVert && y < 0) {
      // North needle: heirloom vermilion-terracotta lacquer
      const lit = clamp(facetLit * 0.85 + radialWarm * 0.15, 0, 1);
      blendPixel(
        out,
        mix(VERMILION_SHADE[0], VERMILION_HI[0], lit),
        mix(VERMILION_SHADE[1], VERMILION_HI[1], lit),
        mix(VERMILION_SHADE[2], VERMILION_HI[2], lit),
        cMain
      );
    } else {
      // E / S / W needles: antique burnished gold
      const southDim = isVert && y > 0 ? 0.82 : 1.0;
      const lit = clamp((facetLit * 0.82 + radialWarm * 0.18) * southDim, 0, 1);
      blendPixel(
        out,
        mix(GOLD_SHADE[0], GOLD_LIGHT[0], lit),
        mix(GOLD_SHADE[1], GOLD_LIGHT[1], lit),
        mix(GOLD_SHADE[2], GOLD_LIGHT[2], lit),
        cMain
      );
    }

    // Subtle warm-ink ridge seam down each needle spine
    const dRidge = isVert ? Math.abs(x) : Math.abs(y);
    blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dRidge, 0.007, artAa * 1.15) * cMain * 0.35);
  }
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dMain, 0.022, artAa * 1.15) * 0.94);

  // 8. Central Layered Brass & Lantern-Pearl Hub
  const dHubOuter = rArt - 0.115;
  const cHubOuter = fillCov(dHubOuter, artAa * 1.15);
  if (cHubOuter > 0) {
    const hLit = clamp(0.55 - (x + y) * 3.8, 0, 1);
    blendPixel(
      out,
      mix(BRASS_SHADE[0], BRASS_HI[0], hLit),
      mix(BRASS_SHADE[1], BRASS_HI[1], hLit),
      mix(BRASS_SHADE[2], BRASS_HI[2], hLit),
      cHubOuter
    );
  }
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dHubOuter, 0.019, artAa * 1.15) * 0.92);

  // Inner lantern-pearl cabochon dome
  const dPearl = rArt - 0.068;
  const cPearl = fillCov(dPearl, artAa * 1.15);
  if (cPearl > 0) {
    const pLit = Math.exp(-((x + 0.024) * (x + 0.024) + (y + 0.026) * (y + 0.026)) * 220);
    blendPixel(
      out,
      mix(GOLD_SHADE[0] + 24, 255, pLit * 0.92),
      mix(GOLD_SHADE[1] + 38, 250, pLit * 0.92),
      mix(GOLD_SHADE[2] + 44, 224, pLit * 0.92),
      cPearl
    );
  }
  blendPixel(out, INK[0], INK[1], INK[2], strokeCov(dPearl, 0.011, artAa * 1.15) * 0.72);
  // Crisp sunlit catchlight spark on the pearl
  blendPixel(out, 255, 252, 236, fillCov(Math.hypot(x + 0.024, y + 0.026) - 0.018, artAa * 1.15) * 0.95);

  // 9. Gentle upper-left reading-lamp atmosphere glaze uniting the whole icon
  const bloomD = Math.hypot(x + 0.45, y + 0.48);
  const bloom = Math.exp(-(bloomD * bloomD) * 2.4) * 0.11;
  blendPixel(out, LANTERN[0], LANTERN[1], LANTERN[2], bloom);

  out[3] = shapeAlpha;
}

// 2x2 rotated-grid supersampling offsets for silky curves at small sizes (180/192px)
const RGSS_OFFSETS = [
  [-0.375, -0.125],
  [0.125, -0.375],
  [-0.125, 0.375],
  [0.375, 0.125],
];

// Round RGB to even values (2.1M colors, visually identical, ~25% smaller PNG deflate)
const quantRgb = (v) => clamp(Math.round(v * 0.5) * 2, 0, 254);

function renderIcon({ size, maskable, fullBleed }) {
  const rgba = Buffer.alloc(size * size * 4);
  const aa = 2.15 / size;
  // Enlarged heirloom medallion: fills ~94% of maskable 80% safe circle, proud home-screen silhouette
  const artScale = maskable ? 0.96 : fullBleed ? 1.02 : 0.98;
  const artAa = aa / artScale;
  const useSupersample = size <= 256;
  const sample = [0, 0, 0, 0];

  for (let py = 0; py < size; py += 1) {
    for (let pxIdx = 0; pxIdx < size; pxIdx += 1) {
      const outIdx = (py * size + pxIdx) * 4;

      if (useSupersample) {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        for (let s = 0; s < 4; s += 1) {
          const nx = ((pxIdx + 0.5 + RGSS_OFFSETS[s][0]) / size) * 2 - 1;
          const ny = ((py + 0.5 + RGSS_OFFSETS[s][1]) / size) * 2 - 1;
          sampleIconPixel(nx, ny, aa * 0.62, artScale, artAa * 0.62, fullBleed, sample);
          const sa = sample[3];
          sumR += sample[0] * sa;
          sumG += sample[1] * sa;
          sumB += sample[2] * sa;
          sumA += sa;
        }
        const avgA = sumA * 0.25;
        if (avgA > 1e-4) {
          rgba[outIdx] = quantRgb(sumR / sumA);
          rgba[outIdx + 1] = quantRgb(sumG / sumA);
          rgba[outIdx + 2] = quantRgb(sumB / sumA);
          rgba[outIdx + 3] = clamp(Math.round(avgA * 255), 0, 255);
        }
      } else {
        const nx = ((pxIdx + 0.5) / size) * 2 - 1;
        const ny = ((py + 0.5) / size) * 2 - 1;
        sampleIconPixel(nx, ny, aa, artScale, artAa, fullBleed, sample);
        if (sample[3] > 1e-4) {
          rgba[outIdx] = quantRgb(sample[0]);
          rgba[outIdx + 1] = quantRgb(sample[1]);
          rgba[outIdx + 2] = quantRgb(sample[2]);
          rgba[outIdx + 3] = clamp(Math.round(sample[3] * 255), 0, 255);
        }
      }
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
