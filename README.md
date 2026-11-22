# Wanderling: The Grand Atlas of Living Tongues

**Wanderling** is a kid-friendly, tactile, offline-ready Progressive Web App (PWA) for learning **Spanish**, **French**, **German**, and **Italian**. Players travel alongside **Pip the Polyglot Starling** and four regional animal companions to unlock the Living Phrasebook across 20 themed cultural units.

---

## Four Symmetrical Cultural Lands

| Code | Language | Cultural Land | Regional Companion | Setting |
| :--- | :--- | :--- | :--- | :--- |
| **ES** | Spanish (`Español`) | *El Camino del Sol* | **Mateo** — Axolotl Chef & Guitarist | Sun plazas, churro carts, Pyrenees passes |
| **FR** | French (`Français`) | *La Route des Étoiles* | **Colette** — Boulangerie Fox | Montmartre rooftops, pastry bakeries, lavender hills |
| **DE** | German (`Deutsch`) | *Der Märchenpfad* | **Benni** — Clockwork Badger Tinkerer | Half-timbered Black Forest gables, alpine cable cars |
| **IT** | Italian (`Italiano`) | *La Via del Mare* | **Luca** — Gondolier Sea-Otter | Venetian canals, gelato carts, coastal lemon groves |

---

## Key Features

- **5-Unit Cultural Progression per Language:** Progressive lesson trails (`lesson`, `story`, `chest`, and `boss` nodes) featuring Discovery Cards, bidirectional Word Banks, Listen & Decode challenges, Pair-Match Rush rounds, interactive Mini-Stories, and Companion Boss Gauntlets.
- **Accent-Forgiving & Teachable Grading:** Base ASCII entries (such as `nino`, `garcon`, `fur`, `strasse`, or `caffe`) pass without heart penalties while surfacing a celebratory **Accent Spotlight** explaining exact diacritics (`ñ`, `ç`, `ü`, `ß`, `è`, `à`) and grammatical articles (`el`/`la`, `le`/`la`/`l'`, `der`/`die`/`das`, `il`/`la`/`lo`/`l'`).
- **Zero-Stall Offline Speech & Web Audio:** Synthesizes warm acoustic-style sound effects via `AudioContext` and falls back to a rhythmic marimba syllable cadence plus phonetic clue banners whenever native OS `speechSynthesis` voices are unavailable.
- **Sky-Catcher Fiesta Arcade:** 60fps sky-gliding mini-game that helps young explorers practice unlocked vocabulary and recharge hearts mid-adventure.
- **Multi-Kid Save Vault:** Persists isolated progress across profiles (`localStorage` key `wanderling.vault.v1`) with strict schema-validated JSON export and replace/merge import.
- **Cross-Platform Custom SVG Vector Flags & Art:** All language flags, portraits, and sticker illustrations render as crisp inline SVGs—no platform-dependent Unicode regional flag emojis.
- **Offline-First Relative-Subpath PWA:** Built with Vite `base: './'`, zero external CDN hotlinks, pure-Node raster RGBA PNG icons, and a network-first Service Worker (`./sw.js`).

---

## Getting Started

### Prerequisites

- **Node.js 20+** (tested with Node 22) and **npm**

### Development & Verification Commands

```bash
# Install dependencies
npm install

# Start local Vite dev server
npm run dev

# Run unit tests once
npm test -- --run

# Regenerate pure-Node anti-aliased RGBA PNG icons into public/icons/
npm run generate:icons

# Typecheck + build production bundle into dist/ (runs prebuild icon generation)
npm run build

# Verify dist/ PWA manifest, Service Worker, relative paths, and PNG IHDR headers
npm run verify:artifacts

# Serve dist/ under /wanderling-subpath/ on an ephemeral or custom port
npm run serve:subpath
node scripts/serve-subpath.mjs --port 4173
```

---

## PWA & Subpath Hosting Architecture

Wanderling uses relative `./` paths throughout (`vite.config.ts` `base: './'`, `index.html`, `public/manifest.json`, and `public/sw.js`) so the exact same `dist/` build runs seamlessly at domain root or any nested subpath such as `/<repo-name>/` on GitHub Pages or `/wanderling-subpath/` locally.

| File | Purpose |
| :--- | :--- |
| [`index.html`](./index.html) | Links `./manifest.json`, `./icons/icon-192.png`, `./icons/apple-touch-icon.png`, sets `#1e1b4b` theme color, and registers `./sw.js` with `{ scope: './' }`. |
| [`public/manifest.json`](./public/manifest.json) | Configures standalone PWA metadata, `#1e1b4b` theme/background colors, `./` start/scope URLs, and both `any` and `maskable` icon entries. |
| [`public/sw.js`](./public/sw.js) | Service Worker (`wanderling-cache-v1`) pre-caching core shell assets, purging stale caches on `activate`, and serving same-origin GET requests network-first with cache write-back and offline fallback. |
| [`scripts/generate-pwa-icons.mjs`](./scripts/generate-pwa-icons.mjs) | Zero-dependency Node ESM PNG encoder (`node:zlib` `deflateSync` + IEEE 802.3 CRC32) rendering anti-aliased RGBA icons (`192x192`, `512x512`, maskable safe-zone variants, and `180x180` Apple touch icon). |
| [`scripts/verify-build-artifacts.mjs`](./scripts/verify-build-artifacts.mjs) | Automated release gate verifying `dist/index.html`, `dist/manifest.json`, `dist/sw.js`, binary PNG signatures + `IHDR` dimensions, and absence of root-relative `/assets/`, external hotlinks, or Unicode flag emojis. |
| [`scripts/serve-subpath.mjs`](./scripts/serve-subpath.mjs) | Zero-dependency Node HTTP preview server mounting `dist/` at `/wanderling-subpath/`, redirecting `/`, and printing `READY http://127.0.0.1:<port>/wanderling-subpath/`. |

---

## GitHub Pages Deployment

The workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) runs automatically on pushes to `main` (and via manual `workflow_dispatch`), executing:

1. `npm ci`
2. `npm test -- --run`
3. `npm run build`
4. `node scripts/verify-build-artifacts.mjs`
5. `actions/upload-pages-artifact@v3` & `actions/deploy-pages@v4`

To enable Pages deployment on GitHub, set **Settings -> Pages -> Source** to **GitHub Actions**.
