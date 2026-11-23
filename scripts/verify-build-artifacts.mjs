import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WOFF2_SIGNATURE = Buffer.from('wOF2', 'ascii');
const UNICODE_FLAG_REGEX = /[\u{1F1E6}-\u{1F1FF}]/u;
const TEXT_FILE_EXT_REGEX = /\.(html|htm|js|mjs|cjs|css|json|webmanifest|svg|txt|xml|md|map)$/i;
const JS_EXTERNAL_URL_REGEX = /https?:\/\/[^\s'"`<>\\)\]}]*/gi;
const MAX_JS_CHUNK_BYTES = 500 * 1024;
const PRECACHE_ASSET_EXT_REGEX = /\.(js|mjs|css|woff2)$/i;
const CORE_SHELL_PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];
// React DOM & Lucide embed standard W3C XML/DOM namespace URIs, and React 18's
// production runtime includes its invariant decoder URL template in minified builds.
const ALLOWED_JS_EXTERNAL_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/XML/1998/namespace',
  'https://reactjs.org/docs/error-decoder.html?invariant=',
]);

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

const EXPECTED_ICONS = new Map([
  ['icon-192.png', { width: 192, height: 192 }],
  ['icon-512.png', { width: 512, height: 512 }],
  ['icon-maskable-192.png', { width: 192, height: 192 }],
  ['icon-maskable-512.png', { width: 512, height: 512 }],
  ['apple-touch-icon.png', { width: 180, height: 180 }],
]);

const EXPECTED_LANDMARKS = [
  'El Camino del Sol',
  'La Route des Étoiles',
  'Der Märchenpfad',
  'La Via del Mare',
  'A Trilha Tropical',
  'The Starlight Compass Isles',
  'The Lantern Cloud Peaks',
  'Sakura Sky Trail',
  'The Marigold Palace Trail',
  'The Lotus River Delta',
  'Oasis of Golden Stars',
  'Nile Felucca Breeze',
  'The Starlight Frost Express',
  'Emerald Archipelago Voyage',
  'Lantern Bay & Bamboo Peaks',
  'Savanna Sun & Dhow Coast',
];

const errors = [];
const flagCheckedPaths = new Set();

function fail(message) {
  errors.push(message);
}

function isInsideDist(targetPath) {
  const distPrefix = DIST_DIR.endsWith(sep) ? DIST_DIR : `${DIST_DIR}${sep}`;
  return targetPath === DIST_DIR || targetPath.startsWith(distPrefix);
}

function checkNoFlagEmojis(label, text) {
  const normalized = label.replace(/\\/g, '/');
  if (flagCheckedPaths.has(normalized)) return;
  flagCheckedPaths.add(normalized);
  if (UNICODE_FLAG_REGEX.test(text)) {
    fail(`${normalized}: contains prohibited Unicode regional indicator flag emoji (U+1F1E6-U+1F1FF).`);
  }
}

function decodeJsEscapes(text) {
  return text.replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
    (fullMatch, uBrace, u4, x2) => {
      const code = Number.parseInt(uBrace || u4 || x2, 16);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
        return fullMatch;
      }
      return String.fromCodePoint(code);
    }
  );
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      out.push(...walkFiles(fullPath));
    } else if (st.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function verifyNoLazyMashupModulepreload(html) {
  const linkTagRegex = /<link\b[^>]*>/gi;
  let linkMatch;
  while ((linkMatch = linkTagRegex.exec(html)) !== null) {
    const tag = linkMatch[0];
    const relMatch = tag.match(/\brel\s*=\s*(?:(["'])([^"']*)\1|([^\s>]+))/i);
    const relValue = (relMatch?.[2] ?? relMatch?.[3] ?? '').toLowerCase();
    const relTokens = relValue.split(/\s+/).filter(Boolean);
    if (!relTokens.includes('modulepreload')) continue;

    const hrefMatch = tag.match(/\bhref\s*=\s*(?:(["'])([^"']*)\1|([^\s>]+))/i);
    const hrefValue = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();
    if (/adult-mashup-/i.test(hrefValue)) {
      fail(`dist/index.html must NOT <link rel="modulepreload"> lazy mashup chunk: ${hrefValue}`);
    } else if (/course-(?!es-)/i.test(hrefValue)) {
      fail(`dist/index.html must NOT <link rel="modulepreload"> lazy non-es course chunk: ${hrefValue}`);
    }
  }
}

function verifyIndexHtml() {
  const indexPath = resolve(DIST_DIR, 'index.html');
  if (!existsSync(indexPath)) {
    fail('dist/index.html is missing.');
    return;
  }

  const html = readFileSync(indexPath, 'utf8');
  checkNoFlagEmojis('dist/index.html', html);

  const bannedRootRelativePatterns = [
    { label: '"/assets/', regex: /["']\/assets\//i },
    { label: '"/icons/', regex: /["']\/icons\//i },
    { label: '"/manifest.json', regex: /["']\/manifest\.json/i },
    { label: '"/sw.js', regex: /["']\/sw\.js/i },
    { label: 'root-relative src/href attribute', regex: /<(?:script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*["']\/(?!\/)/i },
  ];

  for (const { label, regex } of bannedRootRelativePatterns) {
    if (regex.test(html)) {
      fail(`dist/index.html contains forbidden root-relative path matching ${label}`);
    }
  }

  const externalHotlinkPatterns = [
    /<script\b[^>]*?\bsrc\s*=\s*["'](?:https?:)?\/\//i,
    /<link\b[^>]*?\bhref\s*=\s*["'](?:https?:)?\/\//i,
    /<img\b[^>]*?\bsrc\s*=\s*["'](?:https?:)?\/\//i,
    /<source\b[^>]*?\bsrc\s*=\s*["'](?:https?:)?\/\//i,
  ];

  for (const regex of externalHotlinkPatterns) {
    if (regex.test(html)) {
      fail(`dist/index.html contains forbidden external HTTP/HTTPS hotlink matching ${regex}`);
    }
  }

  const requiredSnippets = [
    './manifest.json',
    './icons/icon-192.png',
    './icons/apple-touch-icon.png',
    './sw.js',
    'theme-color',
  ];

  for (const snippet of requiredSnippets) {
    if (!html.includes(snippet)) {
      fail(`dist/index.html is missing required PWA reference: ${snippet}`);
    }
  }
  if (!/scope\s*:\s*['"]\.\/['"]/.test(html)) {
    fail(`dist/index.html must register Service Worker with relative scope './'.`);
  }
  verifyNoLazyMashupModulepreload(html);

  const attrRefRegex = /<(script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*(["'])([^"']+)\2[^>]*>/gi;
  let hasEntryJsAsset = false;
  let hasCssAsset = false;
  let attrMatch;

  while ((attrMatch = attrRefRegex.exec(html)) !== null) {
    const tagName = attrMatch[1].toLowerCase();
    const rawRef = attrMatch[3].trim();
    if (!rawRef || rawRef.startsWith('#') || rawRef.startsWith('data:') || rawRef.startsWith('blob:')) {
      continue;
    }
    if (/^(?:https?:)?\/\//i.test(rawRef) || rawRef.startsWith('/')) {
      continue; // Already reported above
    }
    if (!rawRef.startsWith('./')) {
      fail(`dist/index.html asset reference must use relative "./" prefix, got ${JSON.stringify(rawRef)}`);
      continue;
    }

    const cleanRel = rawRef.split(/[?#]/)[0];
    if (tagName === 'script' && /adult-mashup-/i.test(cleanRel)) {
      fail(`dist/index.html must not eagerly reference lazy mashup script chunk: ${rawRef}`);
    }
    if (/^\.\/assets\/.+\.m?js$/i.test(cleanRel)) {
      hasEntryJsAsset = true;
    }
    if (/^\.\/assets\/.+\.css$/i.test(cleanRel)) {
      hasCssAsset = true;
    }

    const targetPath = resolve(DIST_DIR, cleanRel);
    if (!isInsideDist(targetPath) || !existsSync(targetPath)) {
      fail(`dist/index.html references missing relative build asset: ${rawRef}`);
    }
  }

  if (!hasEntryJsAsset) {
    fail('dist/index.html must reference at least one relative ./assets/*.js module script.');
  }
  if (!hasCssAsset) {
    fail('dist/index.html must reference at least one relative ./assets/*.css stylesheet.');
  }
}

function verifyManifestJson() {
  const manifestPath = resolve(DIST_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail('dist/manifest.json is missing.');
    return;
  }

  const raw = readFileSync(manifestPath, 'utf8');
  checkNoFlagEmojis('dist/manifest.json', raw);
  if (/https?:\/\//i.test(raw)) {
    fail('dist/manifest.json contains forbidden external HTTP/HTTPS URL.');
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    fail(`dist/manifest.json is invalid JSON: ${err.message}`);
    return;
  }

  if (manifest.display !== 'standalone') {
    fail(`dist/manifest.json "display" must be "standalone", got ${JSON.stringify(manifest.display)}`);
  }
  if (manifest.start_url !== './') {
    fail(`dist/manifest.json "start_url" must be "./", got ${JSON.stringify(manifest.start_url)}`);
  }
  if (manifest.scope !== './') {
    fail(`dist/manifest.json "scope" must be "./", got ${JSON.stringify(manifest.scope)}`);
  }
  if (manifest.background_color !== '#1e1b4b') {
    fail(`dist/manifest.json "background_color" must be "#1e1b4b", got ${JSON.stringify(manifest.background_color)}`);
  }
  if (manifest.theme_color !== '#1e1b4b') {
    fail(`dist/manifest.json "theme_color" must be "#1e1b4b", got ${JSON.stringify(manifest.theme_color)}`);
  }

  if (!Array.isArray(manifest.icons) || manifest.icons.length < 4) {
    fail('dist/manifest.json "icons" must contain at least 4 entries.');
    return;
  }

  const seenPurposes = new Set();
  for (const icon of manifest.icons) {
    if (typeof icon.src !== 'string' || !icon.src.startsWith('./icons/')) {
      fail(`dist/manifest.json icon src must start with "./icons/", got ${JSON.stringify(icon.src)}`);
      continue;
    }
    const targetFile = resolve(DIST_DIR, icon.src);
    if (!isInsideDist(targetFile) || !existsSync(targetFile)) {
      fail(`dist/manifest.json references missing icon file: ${icon.src}`);
    }
    if (typeof icon.purpose === 'string') {
      for (const token of icon.purpose.split(/\s+/)) {
        if (token) seenPurposes.add(token);
      }
    }
  }

  if (!seenPurposes.has('any') || !seenPurposes.has('maskable')) {
    fail('dist/manifest.json icons must include both "any" and "maskable" purposes.');
  }
}

function verifyServiceWorker() {
  const swPath = resolve(DIST_DIR, 'sw.js');
  if (!existsSync(swPath)) {
    fail('dist/sw.js is missing.');
    return { cacheVersion: '', precacheSet: new Set() };
  }

  const sw = readFileSync(swPath, 'utf8');
  checkNoFlagEmojis('dist/sw.js', sw);

  if (!/addEventListener\s*\(\s*['"]fetch['"]/.test(sw)) {
    fail(`dist/sw.js must register a 'fetch' listener.`);
  }
  if (!/addEventListener\s*\(\s*['"]activate['"]/.test(sw)) {
    fail(`dist/sw.js must register an 'activate' listener.`);
  }
  if (!/addEventListener\s*\(\s*['"]install['"]/.test(sw)) {
    fail(`dist/sw.js must register an 'install' listener.`);
  }
  const cacheVersionMatch = sw.match(/CACHE_VERSION\s*=\s*(['"])([^'"]+)\1/);
  const cacheVersion = cacheVersionMatch ? cacheVersionMatch[2].trim() : '';
  if (!cacheVersion) {
    fail('dist/sw.js must define a non-empty CACHE_VERSION string.');
  }
  if (!sw.includes('caches.delete')) {
    fail('dist/sw.js must purge stale caches via caches.delete.');
  }
  if (/["']\/(?:assets|icons|manifest\.json|sw\.js)/i.test(sw)) {
    fail('dist/sw.js contains forbidden root-relative path.');
  }
  if (/https?:\/\//i.test(sw)) {
    fail('dist/sw.js contains forbidden external HTTP/HTTPS URL.');
  }

  const precacheSet = new Set();
  const precacheMatch = sw.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/);
  if (!precacheMatch) {
    fail('dist/sw.js must define PRECACHE_URLS.');
  } else {
    const entryRegex = /(['"])([^'"]+)\1/g;
    let entry;
    while ((entry = entryRegex.exec(precacheMatch[1])) !== null) {
      const precacheRef = entry[2];
      if (!precacheRef.startsWith('./')) {
        fail(`dist/sw.js PRECACHE_URLS entry must be relative "./", got ${JSON.stringify(precacheRef)}`);
        continue;
      }
      if (precacheSet.has(precacheRef)) {
        fail(`dist/sw.js PRECACHE_URLS contains duplicate entry: ${precacheRef}`);
      } else {
        precacheSet.add(precacheRef);
      }
      if (precacheRef === './') continue;
      const resolvedTarget = resolve(DIST_DIR, precacheRef);
      if (!isInsideDist(resolvedTarget) || !existsSync(resolvedTarget)) {
        fail(`dist/sw.js PRECACHE_URLS references missing dist file: ${precacheRef}`);
      }
    }

    for (const shellEntry of CORE_SHELL_PRECACHE_URLS) {
      if (!precacheSet.has(shellEntry)) {
        fail(`dist/sw.js PRECACHE_URLS is missing core shell entry: ${shellEntry}`);
      }
    }
  }

  return { cacheVersion, precacheSet };
}

function verifyPngIcons() {
  const iconsDir = resolve(DIST_DIR, 'icons');
  if (!existsSync(iconsDir)) {
    fail('dist/icons directory is missing.');
    return;
  }

  const entries = readdirSync(iconsDir).filter((name) => name.toLowerCase().endsWith('.png'));

  for (const [requiredName] of EXPECTED_ICONS) {
    if (!entries.includes(requiredName)) {
      fail(`dist/icons/${requiredName} is missing.`);
    }
  }

  for (const fileName of entries) {
    const fullPath = join(iconsDir, fileName);
    const buf = readFileSync(fullPath);

    if (buf.length < 33) {
      fail(`dist/icons/${fileName} is too small (${buf.length} bytes) to be a valid PNG.`);
      continue;
    }

    if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      fail(`dist/icons/${fileName} does not start with valid PNG magic signature 89 50 4E 47 0D 0A 1A 0A.`);
      continue;
    }

    let offset = 8;
    const chunkTypes = [];
    const idatChunks = [];
    let ihdrWidth = 0;
    let ihdrHeight = 0;
    let chunkError = false;

    while (offset < buf.length) {
      if (offset + 12 > buf.length) {
        fail(`dist/icons/${fileName} has truncated PNG chunk header at offset ${offset}.`);
        chunkError = true;
        break;
      }

      const len = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
      const dataStart = offset + 8;
      const dataEnd = dataStart + len;

      if (dataEnd + 4 > buf.length) {
        fail(`dist/icons/${fileName} chunk ${type} extends past EOF (len=${len}).`);
        chunkError = true;
        break;
      }

      const data = buf.subarray(dataStart, dataEnd);
      const expectedCrc = buf.readUInt32BE(dataEnd);
      const actualCrc = crc32(buf.subarray(offset + 4, dataEnd));
      if (actualCrc !== expectedCrc) {
        fail(`dist/icons/${fileName} chunk ${type} CRC32 mismatch.`);
        chunkError = true;
        break;
      }

      chunkTypes.push(type);
      if (type === 'IHDR') {
        if (len !== 13) {
          fail(`dist/icons/${fileName} has invalid IHDR length ${len} (expected 13).`);
          chunkError = true;
          break;
        }
        ihdrWidth = data.readUInt32BE(0);
        ihdrHeight = data.readUInt32BE(4);
        const bitDepth = data[8];
        const colorType = data[9];
        if (bitDepth !== 8 || colorType !== 6) {
          fail(
            `dist/icons/${fileName} expected 8-bit RGBA (bitDepth=8, colorType=6), got bitDepth=${bitDepth}, colorType=${colorType}.`
          );
        }
        const expectedDims = EXPECTED_ICONS.get(fileName);
        if (expectedDims && (ihdrWidth !== expectedDims.width || ihdrHeight !== expectedDims.height)) {
          fail(
            `dist/icons/${fileName} expected ${expectedDims.width}x${expectedDims.height}, got ${ihdrWidth}x${ihdrHeight}.`
          );
        }
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      }

      offset = dataEnd + 4;
    }

    if (chunkError) continue;

    if (chunkTypes[0] !== 'IHDR') {
      fail(`dist/icons/${fileName} first chunk must be IHDR, got ${chunkTypes[0]}.`);
    }
    if (chunkTypes[chunkTypes.length - 1] !== 'IEND') {
      fail(`dist/icons/${fileName} is missing trailing IEND chunk.`);
    }
    if (idatChunks.length === 0) {
      fail(`dist/icons/${fileName} contains no IDAT image data chunks.`);
      continue;
    }

    if (ihdrWidth > 0 && ihdrHeight > 0) {
      try {
        const inflated = inflateSync(Buffer.concat(idatChunks));
        const expectedBytes = ihdrHeight * (1 + ihdrWidth * 4);
        if (inflated.length !== expectedBytes) {
          fail(
            `dist/icons/${fileName} inflated IDAT byte length ${inflated.length} does not match expected ${expectedBytes}.`
          );
        }
      } catch (err) {
        fail(`dist/icons/${fileName} failed IDAT zlib inflation: ${err.message}`);
      }
    }
  }
}

let verifiedWoff2Count = 0;
let verifiedCssCount = 0;
let jsChunkCount = 0;
let totalJsBytes = 0;

function verifyCssFontReference(cssFullPath, cssRelLabel, rawRef) {
  const ref = rawRef.trim().replace(/^['"]|['"]$/g, '');
  if (!ref || ref.startsWith('data:') || ref.startsWith('#')) return;

  if (/^https?:\/\//i.test(ref) || ref.startsWith('//')) {
    fail(`${cssRelLabel} contains external font/asset URL: ${ref}`);
    return;
  }

  if (ref.startsWith('/')) {
    fail(`${cssRelLabel} contains forbidden root-relative URL: ${ref}`);
    return;
  }

  const cleanRel = ref.split(/[?#]/)[0];
  if (!/\.(woff2|woff|ttf|otf)$/i.test(cleanRel)) return;

  const fromCssDir = resolve(dirname(cssFullPath), cleanRel);
  const fromAssetsDir = resolve(DIST_DIR, 'assets', cleanRel);
  const fromDistRoot = resolve(DIST_DIR, cleanRel);

  const candidates = cleanRel.startsWith('./assets/')
    ? [fromDistRoot, fromCssDir]
    : [fromCssDir, fromAssetsDir, fromDistRoot];

  const targetExists = candidates.some((candidate) => isInsideDist(candidate) && existsSync(candidate));

  if (!targetExists) {
    fail(`${cssRelLabel} references missing bundled font ${ref}`);
  }
}

function verifyJsChunkNoExternalUrls(relLabel, content, decodedChunk) {
  const sources = decodedChunk ? [content, decodedChunk] : [content];
  const disallowed = new Set();

  for (const source of sources) {
    JS_EXTERNAL_URL_REGEX.lastIndex = 0;
    let match;
    while ((match = JS_EXTERNAL_URL_REGEX.exec(source)) !== null) {
      const url = match[0];
      if (!ALLOWED_JS_EXTERNAL_URLS.has(url)) {
        disallowed.add(url);
      }
    }
  }

  for (const url of disallowed) {
    fail(`${relLabel} contains forbidden external runtime URL: ${url}`);
  }
}

function verifyAssetsAndFonts() {
  const assetsDir = resolve(DIST_DIR, 'assets');
  if (!existsSync(assetsDir)) {
    fail('dist/assets directory is missing.');
    return [];
  }

  const foundLandmarks = new Set();
  const builtPrecacheAssets = [];

  for (const fullPath of walkFiles(assetsDir)) {
    const relFromDist = relative(DIST_DIR, fullPath).replace(/\\/g, '/');
    const relLabel = `dist/${relFromDist}`;
    const lowerName = fullPath.toLowerCase();

    if (PRECACHE_ASSET_EXT_REGEX.test(lowerName)) {
      builtPrecacheAssets.push(`./${relFromDist}`);
    }

    if (lowerName.endsWith('.woff2')) {
      const buf = readFileSync(fullPath);
      if (buf.length < 4 || !buf.subarray(0, 4).equals(WOFF2_SIGNATURE)) {
        fail(`${relLabel} is not a valid WOFF2 font binary (missing wOF2 signature).`);
      } else {
        verifiedWoff2Count += 1;
      }
      continue;
    }

    if (!/\.(js|mjs|css|html)$/i.test(lowerName)) continue;

    const content = readFileSync(fullPath, 'utf8');
    checkNoFlagEmojis(relLabel, content);

    if (lowerName.endsWith('.js') || lowerName.endsWith('.mjs')) {
      const chunkBytes = Buffer.byteLength(content, 'utf8');
      jsChunkCount += 1;
      totalJsBytes += chunkBytes;

      if (chunkBytes > MAX_JS_CHUNK_BYTES) {
        fail(
          `${relLabel} exceeds strict 500 KiB chunk budget (${(chunkBytes / 1024).toFixed(1)} KiB > 500.0 KiB; max ${MAX_JS_CHUNK_BYTES} bytes).`
        );
      }

      if (content.trim().length === 0) {
        fail(`${relLabel} built JS chunk is empty.`);
        continue;
      }

      if (/["']\/(?:assets|icons|manifest\.json|sw\.js)/i.test(content)) {
        fail(`${relLabel} contains forbidden root-relative asset path.`);
      }

      const decodedChunk = /\\(?:u|x)/.test(content) ? decodeJsEscapes(content) : null;
      verifyJsChunkNoExternalUrls(relLabel, content, decodedChunk);

      const missingLiterals = [];
      for (const landmark of EXPECTED_LANDMARKS) {
        if (foundLandmarks.has(landmark)) continue;
        if (content.includes(landmark)) {
          foundLandmarks.add(landmark);
        } else {
          missingLiterals.push(landmark);
        }
      }

      if (missingLiterals.length > 0 && decodedChunk) {
        for (const landmark of missingLiterals) {
          if (decodedChunk.includes(landmark)) {
            foundLandmarks.add(landmark);
          }
        }
      }
      continue;
    }

    if (lowerName.endsWith('.css')) {
      verifiedCssCount += 1;
      const urlRegex = /url\(\s*([^)]+?)\s*\)/gi;
      let match;
      while ((match = urlRegex.exec(content)) !== null) {
        verifyCssFontReference(fullPath, relLabel, match[1]);
      }
    }
  }

  if (verifiedWoff2Count === 0) {
    fail('dist/assets/ must contain at least one bundled .woff2 font binary.');
  }

  if (verifiedCssCount === 0) {
    fail('dist/assets/ must contain at least one built CSS stylesheet.');
  }

  if (jsChunkCount === 0) {
    fail('dist/assets/ must contain at least one built JS bundle.');
  } else {
    for (const landmark of EXPECTED_LANDMARKS) {
      if (!foundLandmarks.has(landmark)) {
        fail(`Built JS bundle(s) missing expected 16-language cultural landmark: "${landmark}"`);
      }
    }
  }

  return builtPrecacheAssets;
}

let verifiedPrecacheManifestCount = 0;

/**
 * Verifies dist/sw-precache-manifest.json and ensures dist/sw.js + manifest cover all built assets.
 */
function verifySwPrecacheManifest(builtPrecacheAssets, swInfo) {
  const manifestPath = resolve(DIST_DIR, 'sw-precache-manifest.json');
  if (!existsSync(manifestPath)) {
    fail('dist/sw-precache-manifest.json is missing.');
    return;
  }

  const raw = readFileSync(manifestPath, 'utf8');
  checkNoFlagEmojis('dist/sw-precache-manifest.json', raw);
  if (/https?:\/\//i.test(raw)) {
    fail('dist/sw-precache-manifest.json contains forbidden external HTTP/HTTPS URL.');
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    fail(`dist/sw-precache-manifest.json is invalid JSON: ${err.message}`);
    return;
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    fail('dist/sw-precache-manifest.json must be a JSON object.');
    return;
  }

  if (typeof manifest.cacheVersion !== 'string' || !manifest.cacheVersion.trim()) {
    fail('dist/sw-precache-manifest.json must define a non-empty "cacheVersion" string.');
  } else if (swInfo.cacheVersion && manifest.cacheVersion !== swInfo.cacheVersion) {
    fail(
      `dist/sw-precache-manifest.json cacheVersion (${manifest.cacheVersion}) does not match dist/sw.js CACHE_VERSION (${swInfo.cacheVersion}).`
    );
  }

  if (typeof manifest.generatedAt !== 'string' || Number.isNaN(Date.parse(manifest.generatedAt))) {
    fail('dist/sw-precache-manifest.json must define a valid ISO "generatedAt" timestamp.');
  }

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    fail('dist/sw-precache-manifest.json "assets" must be a non-empty array.');
    return;
  }

  const manifestAssetSet = new Set();
  for (const entry of manifest.assets) {
    if (typeof entry !== 'string' || !entry.startsWith('./')) {
      fail(`dist/sw-precache-manifest.json asset entry must start with "./", got ${JSON.stringify(entry)}`);
      continue;
    }
    if (entry.includes('\\')) {
      fail(`dist/sw-precache-manifest.json asset entry must use forward slashes: ${entry}`);
    }
    if (manifestAssetSet.has(entry)) {
      fail(`dist/sw-precache-manifest.json contains duplicate asset entry: ${entry}`);
    } else {
      manifestAssetSet.add(entry);
    }
    if (entry === './') continue;
    const resolvedTarget = resolve(DIST_DIR, entry);
    if (!isInsideDist(resolvedTarget) || !existsSync(resolvedTarget)) {
      fail(`dist/sw-precache-manifest.json references missing dist file: ${entry}`);
    }
  }

  for (const shellEntry of CORE_SHELL_PRECACHE_URLS) {
    if (!manifestAssetSet.has(shellEntry)) {
      fail(`dist/sw-precache-manifest.json is missing core shell entry: ${shellEntry}`);
    }
  }

  for (const builtAsset of builtPrecacheAssets) {
    if (!manifestAssetSet.has(builtAsset)) {
      fail(`dist/sw-precache-manifest.json is missing built asset: ${builtAsset}`);
    }
    if (!swInfo.precacheSet.has(builtAsset)) {
      fail(`dist/sw.js PRECACHE_URLS is missing built asset: ${builtAsset}`);
    }
  }

  verifiedPrecacheManifestCount = manifestAssetSet.size;
}

let verifiedTextFileCount = 0;

function verifyAllDistTextNoFlags() {
  for (const fullPath of walkFiles(DIST_DIR)) {
    if (!TEXT_FILE_EXT_REGEX.test(fullPath)) continue;
    const relLabel = `dist/${relative(DIST_DIR, fullPath).replace(/\\/g, '/')}`;
    const text = readFileSync(fullPath, 'utf8');
    checkNoFlagEmojis(relLabel, text);
    verifiedTextFileCount += 1;
  }
}

if (!existsSync(DIST_DIR)) {
  fail('dist/ directory does not exist. Run "npm run build" before verifying artifacts.');
} else {
  verifyIndexHtml();
  verifyManifestJson();
  const swInfo = verifyServiceWorker();
  verifyPngIcons();
  const builtPrecacheAssets = verifyAssetsAndFonts();
  verifySwPrecacheManifest(builtPrecacheAssets, swInfo);
  verifyAllDistTextNoFlags();
}

if (errors.length > 0) {
  console.error('[verify-build-artifacts] FAILED with errors:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `[verify-build-artifacts] PASS: dist/index.html (zero eager adult-mashup-/lazy-course modulepreloads), dist/manifest.json, dist/sw.js, dist/sw-precache-manifest.json (${verifiedPrecacheManifestCount} entries), all 5 RGBA PNG icons, ${verifiedWoff2Count} relative ./assets/*.woff2 font(s), ${jsChunkCount} JS chunk(s) <= 500 KiB (${(totalJsBytes / 1024).toFixed(1)} KiB total) with zero leaked external URLs, ${EXPECTED_LANDMARKS.length} cultural landmarks, and ${verifiedTextFileCount} dist/ text file(s) verified.`
);
