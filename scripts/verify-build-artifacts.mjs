import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WOFF2_SIGNATURE = Buffer.from('wOF2', 'ascii');
const UNICODE_FLAG_REGEX = /[\u{1F1E6}-\u{1F1FF}]/u;
const TEXT_FILE_EXT_REGEX = /\.(html|htm|js|mjs|cjs|css|json|webmanifest|svg|txt|xml|md|map)$/i;

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
    (_, uBrace, u4, x2) => {
      const code = Number.parseInt(uBrace || u4 || x2, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
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
  ];

  for (const { label, regex } of bannedRootRelativePatterns) {
    if (regex.test(html)) {
      fail(`dist/index.html contains forbidden root-relative path matching ${label}`);
    }
  }

  const externalHotlinkPatterns = [
    /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i,
    /<link\b[^>]*\bhref\s*=\s*["']https?:\/\//i,
    /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i,
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
}

function verifyManifestJson() {
  const manifestPath = resolve(DIST_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail('dist/manifest.json is missing.');
    return;
  }

  const raw = readFileSync(manifestPath, 'utf8');
  checkNoFlagEmojis('dist/manifest.json', raw);

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
    if (!existsSync(targetFile)) {
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
    return;
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
  if (!sw.includes('CACHE_VERSION')) {
    fail('dist/sw.js must define CACHE_VERSION.');
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

    const ihdrLength = buf.readUInt32BE(8);
    const ihdrType = buf.subarray(12, 16).toString('ascii');
    if (ihdrType !== 'IHDR' || ihdrLength !== 13) {
      fail(`dist/icons/${fileName} has invalid IHDR header (type=${ihdrType}, len=${ihdrLength}).`);
      continue;
    }

    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];

    if (bitDepth !== 8 || colorType !== 6) {
      fail(`dist/icons/${fileName} expected 8-bit RGBA (bitDepth=8, colorType=6), got bitDepth=${bitDepth}, colorType=${colorType}.`);
    }

    const expectedDims = EXPECTED_ICONS.get(fileName);
    if (expectedDims && (width !== expectedDims.width || height !== expectedDims.height)) {
      fail(
        `dist/icons/${fileName} expected ${expectedDims.width}x${expectedDims.height}, got ${width}x${height}.`
      );
    }

    const iendType = buf.subarray(buf.length - 8, buf.length - 4).toString('ascii');
    if (iendType !== 'IEND') {
      fail(`dist/icons/${fileName} is missing trailing IEND chunk.`);
    }
  }
}

let verifiedWoff2Count = 0;

function verifyCssFontReference(cssFileName, rawRef) {
  const ref = rawRef.trim().replace(/^['"]|['"]$/g, '');
  if (!ref || ref.startsWith('data:') || ref.startsWith('#')) return;

  if (/^https?:\/\//i.test(ref) || ref.startsWith('//')) {
    fail(`dist/assets/${cssFileName} contains external font/asset URL: ${ref}`);
    return;
  }

  if (ref.startsWith('/')) {
    fail(`dist/assets/${cssFileName} contains forbidden root-relative URL: ${ref}`);
    return;
  }

  const cleanRel = ref.split(/[?#]/)[0];
  if (!cleanRel.toLowerCase().endsWith('.woff2')) return;

  const fromCssDir = resolve(DIST_DIR, 'assets', cleanRel);
  const fromDistRoot = resolve(DIST_DIR, cleanRel);
  const targetExists =
    (cleanRel.startsWith('./assets/') && existsSync(fromDistRoot)) ||
    existsSync(fromCssDir) ||
    existsSync(fromDistRoot);

  if (!targetExists) {
    fail(`dist/assets/${cssFileName} references missing bundled font ${ref}`);
  }
}

function verifyAssetsAndFonts() {
  const assetsDir = resolve(DIST_DIR, 'assets');
  if (!existsSync(assetsDir)) {
    fail('dist/assets directory is missing.');
    return;
  }

  const jsBundles = [];

  for (const fileName of readdirSync(assetsDir)) {
    const fullPath = join(assetsDir, fileName);
    if (!statSync(fullPath).isFile()) continue;

    if (fileName.toLowerCase().endsWith('.woff2')) {
      const buf = readFileSync(fullPath);
      if (buf.length < 4 || !buf.subarray(0, 4).equals(WOFF2_SIGNATURE)) {
        fail(`./assets/${fileName} is not a valid WOFF2 font binary (missing wOF2 signature).`);
      } else {
        verifiedWoff2Count += 1;
      }
      continue;
    }

    if (!/\.(js|mjs|css|html)$/i.test(fileName)) continue;

    const content = readFileSync(fullPath, 'utf8');
    checkNoFlagEmojis(`dist/assets/${fileName}`, content);

    if (/\.(js|mjs)$/i.test(fileName)) {
      jsBundles.push(content);
    }

    if (fileName.toLowerCase().endsWith('.css')) {
      const urlRegex = /url\(\s*([^)]+?)\s*\)/gi;
      let match;
      while ((match = urlRegex.exec(content)) !== null) {
        verifyCssFontReference(fileName, match[1]);
      }
    }
  }

  if (verifiedWoff2Count === 0) {
    fail('dist/assets/ must contain at least one bundled .woff2 font binary.');
  }

  if (jsBundles.length === 0) {
    fail('dist/assets/ must contain at least one built JS bundle.');
  } else {
    const combinedJs = jsBundles.join('\n');
    const decodedJs = decodeJsEscapes(combinedJs);
    for (const landmark of EXPECTED_LANDMARKS) {
      if (!combinedJs.includes(landmark) && !decodedJs.includes(landmark)) {
        fail(`Built JS bundle is missing expected 16-language cultural landmark: "${landmark}"`);
      }
    }
  }
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
  verifyServiceWorker();
  verifyPngIcons();
  verifyAssetsAndFonts();
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
  `[verify-build-artifacts] PASS: dist/index.html, dist/manifest.json, dist/sw.js, all 5 RGBA PNG icons, ${verifiedWoff2Count} relative ./assets/*.woff2 font(s), ${EXPECTED_LANDMARKS.length} cultural landmarks, and ${verifiedTextFileCount} dist/ text file(s) verified.`
);
