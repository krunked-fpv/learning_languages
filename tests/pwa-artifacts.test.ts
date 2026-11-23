import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { LANGUAGE_LIST, LANGUAGE_META } from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;

const EXPECTED_ICONS: ReadonlyArray<{ file: string; width: number; height: number }> = [
  { file: 'icon-192.png', width: 192, height: 192 },
  { file: 'icon-512.png', width: 512, height: 512 },
  { file: 'icon-maskable-192.png', width: 192, height: 192 },
  { file: 'icon-maskable-512.png', width: 512, height: 512 },
  { file: 'apple-touch-icon.png', width: 180, height: 180 },
];

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

describe('Challenge 5-artifacts: Production PWA Build, Manifest, Service Worker & PNG Binaries', () => {
  beforeAll(() => {
    const nodeBinDir = dirname(process.execPath);
    const pathSep = process.platform === 'win32' ? ';' : ':';
    execSync('npm run build', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PATH: `${nodeBinDir}${pathSep}${process.env.PATH ?? ''}`,
      },
    });
  }, 60_000);

  it('outputs dist/index.html with strictly relative ./ paths, zero external hotlinks, and zero flag emojis', () => {
    const indexPath = resolve(DIST_DIR, 'index.html');
    expect(existsSync(indexPath)).toBe(true);
    const html = readFileSync(indexPath, 'utf8');

    expect(UNICODE_FLAG_RE.test(html)).toBe(false);
    expect(html).not.toMatch(/["']\/assets\//i);
    expect(html).not.toMatch(/["']\/icons\//i);
    expect(html).not.toMatch(/["']\/manifest\.json/i);
    expect(html).not.toMatch(/["']\/sw\.js/i);
    expect(html).not.toMatch(/<(?:script|link|img)\b[^>]*\b(?:src|href)\s*=\s*["']https?:\/\//i);

    expect(html).toContain('./manifest.json');
    expect(html).toContain('./icons/icon-192.png');
    expect(html).toContain('./icons/apple-touch-icon.png');
    expect(html).toContain('./sw.js');
    expect(html).toContain('theme-color');
  });

  it('outputs valid dist/manifest.json configured for relative standalone PWA install', () => {
    const manifestPath = resolve(DIST_DIR, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const raw = readFileSync(manifestPath, 'utf8');
    expect(UNICODE_FLAG_RE.test(raw)).toBe(false);

    const manifest = JSON.parse(raw) as {
      display: string;
      start_url: string;
      scope: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.background_color).toBe('#1e1b4b');
    expect(manifest.theme_color).toBe('#1e1b4b');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const purposes = new Set<string>();
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('./icons/')).toBe(true);
      expect(existsSync(resolve(DIST_DIR, icon.src))).toBe(true);
      for (const token of (icon.purpose ?? '').split(/\s+/)) {
        if (token) purposes.add(token);
      }
    }
    expect(purposes.has('any')).toBe(true);
    expect(purposes.has('maskable')).toBe(true);
  });

  it('outputs dist/sw.js with active install, activate cache purge, and fetch listener', () => {
    const swPath = resolve(DIST_DIR, 'sw.js');
    expect(existsSync(swPath)).toBe(true);
    const sw = readFileSync(swPath, 'utf8');

    expect(UNICODE_FLAG_RE.test(sw)).toBe(false);
    expect(sw).toContain('CACHE_VERSION');
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
    expect(sw).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
    expect(sw).toContain('caches.delete');
  });

  it('outputs all 5 raster RGBA PNG icons in dist/icons/ with valid PNG signature, CRC32, IHDR dimensions, and IDAT stream', () => {
    const iconsDir = resolve(DIST_DIR, 'icons');
    expect(existsSync(iconsDir)).toBe(true);

    for (const { file, width, height } of EXPECTED_ICONS) {
      const buf = readFileSync(join(iconsDir, file));
      expect(buf.subarray(0, 8).equals(PNG_SIGNATURE), `${file} PNG signature mismatch`).toBe(true);

      let offset = 8;
      const chunkTypes: string[] = [];
      const idatChunks: Buffer[] = [];
      let ihdrWidth = 0;
      let ihdrHeight = 0;

      while (offset < buf.length) {
        const len = buf.readUInt32BE(offset);
        const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
        const data = buf.subarray(offset + 8, offset + 8 + len);
        const expectedCrc = buf.readUInt32BE(offset + 8 + len);
        const actualCrc = computeCrc32(buf.subarray(offset + 4, offset + 8 + len));
        expect(actualCrc, `${file} chunk ${type} CRC32 mismatch`).toBe(expectedCrc);

        chunkTypes.push(type);
        if (type === 'IHDR') {
          expect(len).toBe(13);
          ihdrWidth = data.readUInt32BE(0);
          ihdrHeight = data.readUInt32BE(4);
          expect(data[8], `${file} expected 8-bit depth`).toBe(8);
          expect(data[9], `${file} expected RGBA colorType 6`).toBe(6);
        } else if (type === 'IDAT') {
          idatChunks.push(data);
        }
        offset += 12 + len;
      }

      expect(ihdrWidth, `${file} width mismatch`).toBe(width);
      expect(ihdrHeight, `${file} height mismatch`).toBe(height);
      expect(chunkTypes[0]).toBe('IHDR');
      expect(chunkTypes[chunkTypes.length - 1]).toBe('IEND');

      const inflated = inflateSync(Buffer.concat(idatChunks));
      // Each scanline has 1 filter byte + width * 4 RGBA bytes
      expect(inflated.length).toBe(height * (1 + width * 4));
    }
  });

  it('verifies built JS/CSS/HTML/JSON assets contain zero Unicode flag emojis and bundle all 16 language land titles', () => {
    const assetsDir = resolve(DIST_DIR, 'assets');
    expect(existsSync(assetsDir)).toBe(true);
    let combinedJs = '';
    for (const file of readdirSync(assetsDir)) {
      if (!/\.(js|css|mjs)$/i.test(file)) continue;
      const text = readFileSync(join(assetsDir, file), 'utf8');
      expect(UNICODE_FLAG_RE.test(text), `Flag emoji leaked into dist/assets/${file}`).toBe(false);
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        combinedJs += text;
      }
    }
    for (const lang of LANGUAGE_LIST) {
      expect(
        combinedJs.includes(LANGUAGE_META[lang].landTitle),
        `Missing 16-language landTitle "${LANGUAGE_META[lang].landTitle}" in built dist/assets/*.js`
      ).toBe(true);
    }
  });
});
