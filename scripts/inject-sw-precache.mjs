#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const ASSETS_DIR = resolve(DIST_DIR, 'assets');
const DIST_SW_PATH = resolve(DIST_DIR, 'sw.js');
const MANIFEST_PATH = resolve(DIST_DIR, 'sw-precache-manifest.json');

const PRECACHE_ASSET_EXT_REGEX = /\.(js|mjs|css|woff2)$/i;
const UNICODE_FLAG_REGEX = /[\u{1F1E6}-\u{1F1FF}]/u;
const EXTERNAL_URL_REGEX = /https?:\/\//i;

const CORE_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

function compareCodePoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isInsideDist(targetPath) {
  const distPrefix = DIST_DIR.endsWith(sep) ? DIST_DIR : `${DIST_DIR}${sep}`;
  return targetPath === DIST_DIR || targetPath.startsWith(distPrefix);
}

/**
 * Recursively collects built JS, MJS, CSS, and WOFF2 paths under dist/assets/.
 */
function collectBuiltAssetPaths(dir) {
  const entries = readdirSync(dir).sort(compareCodePoint);
  const paths = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      paths.push(...collectBuiltAssetPaths(fullPath));
    } else if (st.isFile() && PRECACHE_ASSET_EXT_REGEX.test(entry)) {
      const rel = relative(DIST_DIR, fullPath).replace(/\\/g, '/');
      paths.push(`./${rel}`);
    }
  }

  return paths.sort(compareCodePoint);
}

function formatPrecacheEntry(entry) {
  return entry.includes("'") ? JSON.stringify(entry) : `'${entry}'`;
}

function validatePrecacheEntry(entry) {
  if (typeof entry !== 'string' || !entry.startsWith('./')) {
    throw new Error(`Invalid precache entry (must start with "./"): ${JSON.stringify(entry)}`);
  }
  if (entry.includes('\\')) {
    throw new Error(`Invalid precache entry (must use "/" separators): ${entry}`);
  }
  if (EXTERNAL_URL_REGEX.test(entry)) {
    throw new Error(`Precache entry contains forbidden external URL: ${entry}`);
  }
  if (UNICODE_FLAG_REGEX.test(entry)) {
    throw new Error(`Precache entry contains forbidden Unicode flag emoji: ${entry}`);
  }
  if (entry === './') return;

  const target = resolve(DIST_DIR, entry);
  if (!isInsideDist(target) || !existsSync(target)) {
    throw new Error(`Precache entry references missing dist file: ${entry}`);
  }
}

/**
 * Injects core shell + built dist/assets/ entries into dist/sw.js and emits dist/sw-precache-manifest.json.
 */
export function injectSwPrecache() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`dist/ directory not found at ${DIST_DIR}. Run "vite build" first.`);
  }
  if (!existsSync(ASSETS_DIR)) {
    throw new Error(`dist/assets/ directory not found at ${ASSETS_DIR}.`);
  }
  if (!existsSync(DIST_SW_PATH)) {
    throw new Error(`dist/sw.js not found at ${DIST_SW_PATH}.`);
  }

  const swSource = readFileSync(DIST_SW_PATH, 'utf8');
  const cacheVersionMatch = swSource.match(/CACHE_VERSION\s*=\s*(['"])([^'"]+)\1/);
  if (!cacheVersionMatch || !cacheVersionMatch[2].trim()) {
    throw new Error('dist/sw.js must define a non-empty CACHE_VERSION string.');
  }
  const cacheVersion = cacheVersionMatch[2].trim();

  const precacheBlockRegex = /(?:const|let|var)\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]\s*;?/;
  const precacheMatch = swSource.match(precacheBlockRegex);
  if (!precacheMatch) {
    throw new Error('dist/sw.js must define a PRECACHE_URLS array literal.');
  }

  const extraShellEntries = [];
  const existingEntryRegex = /(['"])([^'"]+)\1/g;
  let existingMatch;
  while ((existingMatch = existingEntryRegex.exec(precacheMatch[1])) !== null) {
    const entry = existingMatch[2].trim();
    if (entry && !entry.startsWith('./assets/')) {
      extraShellEntries.push(entry);
    }
  }

  const builtAssetPaths = collectBuiltAssetPaths(ASSETS_DIR);
  const combinedAssets = Array.from(
    new Set([...CORE_SHELL_URLS, ...extraShellEntries, ...builtAssetPaths])
  );

  for (const entry of combinedAssets) {
    validatePrecacheEntry(entry);
  }

  const formattedEntries = combinedAssets.map((entry) => `  ${formatPrecacheEntry(entry)},`).join('\n');
  const replacementBlock = `const PRECACHE_URLS = [\n${formattedEntries}\n];`;
  const updatedSw = swSource.replace(precacheBlockRegex, replacementBlock);

  if (EXTERNAL_URL_REGEX.test(updatedSw)) {
    throw new Error('Updated dist/sw.js contains forbidden external HTTP/HTTPS URL.');
  }
  if (UNICODE_FLAG_REGEX.test(updatedSw)) {
    throw new Error('Updated dist/sw.js contains forbidden Unicode flag emoji.');
  }

  writeFileSync(DIST_SW_PATH, updatedSw, 'utf8');

  const manifest = {
    cacheVersion,
    generatedAt: new Date().toISOString(),
    assets: combinedAssets,
  };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

  if (EXTERNAL_URL_REGEX.test(manifestJson)) {
    throw new Error('Generated dist/sw-precache-manifest.json contains forbidden external URL.');
  }
  if (UNICODE_FLAG_REGEX.test(manifestJson)) {
    throw new Error('Generated dist/sw-precache-manifest.json contains forbidden Unicode flag emoji.');
  }

  writeFileSync(MANIFEST_PATH, manifestJson, 'utf8');

  console.log(
    `[inject-sw-precache] updated dist/sw.js (${cacheVersion}) with ${combinedAssets.length} deduplicated precache entries (${builtAssetPaths.length} built assets) and wrote dist/sw-precache-manifest.json`
  );

  return manifest;
}

injectSwPrecache();
