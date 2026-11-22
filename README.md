# Wanderling 2.0: The Grand Atlas of Living Tongues

**Wanderling 2.0** is a kid-friendly, tactile, offline-ready Progressive Web App (PWA) game console for learning **Spanish**, **French**, **German**, and **Italian**. Players journey alongside **Pip the Polyglot Starling** and four regional animal companions across **32 themed cultural chapters** to collect **404 Living Phrasebook stickers**.

---

## Four Symmetrical Cultural Lands

| Code | Language | Cultural Land | Regional Companion | Setting |
| :--- | :--- | :--- | :--- | :--- |
| **ES** | Spanish (`Español`) | *El Camino del Sol* | **Mateo** — Axolotl Chef & Guitarist | Sun plazas, churro carts, Pyrenees passes |
| **FR** | French (`Français`) | *La Route des Étoiles* | **Colette** — Boulangerie Fox | Montmartre rooftops, pastry bakeries, lavender hills |
| **DE** | German (`Deutsch`) | *Der Märchenpfad* | **Benni** — Clockwork Badger Tinkerer | Half-timbered Black Forest gables, alpine cable cars |
| **IT** | Italian (`Italiano`) | *La Via del Mare* | **Luca** — Gondolier Sea-Otter | Venetian canals, gelato carts, coastal lemon groves |

---

## What's New & Core Features

- **8 Units per Language (32 Units, 224 Nodes, 404 Stickers):** Each course spans 8 themed cultural chapters—from Greetings, Cafe Treats, Nature, Family, and Expeditions through *Music & Hobbies* (Unit 6), *Cozy Home & Clothes* (Unit 7), and *Starlight Cosmos* (Unit 8)—presented inside a chapter-carousel **Adventure Map** diorama covering **72 bespoke SVG illustrations**.
- **Deep Non-Repeating Level Pool (`levelPool.ts`):** Generates **2,000+ dynamic exercise variations** across the atlas (**23+ unique exercises per lesson node** and **8 turns per boss gauntlet**). Replay remix mode tracks seen exercise IDs in the save vault so replayed lessons and boss encounters deliver fresh, non-repeating challenges.
- **7 Tactile Arcade Mini-Games (`ArcadeHub`):**
  1. **Sky-Catcher Fiesta:** 60fps sky-gliding word-lantern catcher that practices unlocked vocabulary and restores hearts mid-lesson.
  2. **Cosmic Meteor Blaster:** Twin-laser starship word defense against drifting vocabulary asteroids.
  3. **Gelato & Pastry Tower:** Precision timing stacker dropping matching treat scoops for golden drizzle streaks.
  4. **Constellation Memory Twins:** Cosmic star-chart card flip matching with glowing constellation lines.
  5. **Alpine Express Switcher:** 3-track clockwork railway junction routing Benni's train to matching cargo words.
  6. **Beat Kitchen Rhythm:** 4-pad musical beat catcher with pentatonic chord harmonies.
  7. **Secret Unlockable — *Starlight Critter Choir*:** 45-second musical word-bubble rhythm celebration featuring all 5 companions (`Pip`, `Mateo`, `Colette`, `Benni`, and `Luca`) and a 5-streak **Starlight Disco Fever** meter. Unlock it by **clearing 3 lessons**, **clearing any Unit Boss**, or **tapping the Golden Starlight Compass 5 times in the top HUD**!
- **9 Unlockable Color Palettes (featuring *Cosmic Galaxy Nebula*):** Switch effortlessly between the Default (*Storybook Parchment*) palette and 8 unlockable themes in the Gem Shop or Top HUD Palette Quick-Switcher—including **Cosmic Galaxy Nebula**, **Arctic Aurora Borealis**, **Starlight Indigo**, **Solaris Gold & Velvet**, **Sunset Plaza**, **Sakura Berry Sorbet**, **Capri Turquoise Lagoon**, and **Alpine Meadow**—paired with a live animated **Ambient Backdrop**.
- **Zero-Scroll `100dvh` Game Console Viewport:** Locked full-viewport `100dvh` layout with a floating console dock across Atlas Map, Phrasebook, Arcade, Leagues & Badges, Gem Shop, and Lesson Arena so Desktop, Tablet, and Mobile play cleanly without outer page scroll.
- **Self-Hosted Fredoka & Nunito Typography:** Bundles `@fontsource-variable/fredoka` and `@fontsource-variable/nunito` `.woff2` variable fonts directly in `dist/assets/` for crisp game typography completely offline with zero external CDN requests.
- **Double-Juice Toy-Craft Polish:** Celebratory confetti cannons, floating XP/combo pop toasts, staggered victory star slams, snappy spring screen transitions, and warm acoustic Web Audio sound synthesis (`star_pop`, `whoosh_transition`, `bubble_pop`, `secret_fanfare`, and escalating combo harmonics).
- **Accent-Forgiving & Teachable Grading:** Base ASCII entries (such as `nino`, `garcon`, `fur`, `strasse`, or `caffe`) pass without heart penalties while surfacing a celebratory **Accent Spotlight** explaining exact diacritics (`ñ`, `ç`, `ü`, `ß`, `è`, `à`) and grammatical articles (`el`/`la`, `le`/`la`/`l'`, `der`/`die`/`das`, `il`/`la`/`lo`/`l'`).
- **Zero-Stall Offline Speech & Web Audio:** Synthesizes warm acoustic sound effects via `AudioContext` and falls back to a rhythmic marimba syllable cadence plus phonetic clue banners whenever native OS `speechSynthesis` voices are unavailable.
- **Multi-Kid Save Vault & SVG Flags:** Persists isolated progress across profiles (`localStorage` key `wanderling.vault.v1`) with strict schema-validated JSON export/import, and renders all language flags, portraits, and sticker art via crisp inline SVGs (zero Unicode flag emojis).

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

# Verify dist/ PWA manifest, Service Worker, relative paths, bundled fonts, and PNG IHDR headers
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
| [`scripts/verify-build-artifacts.mjs`](./scripts/verify-build-artifacts.mjs) | Automated release gate verifying `dist/index.html`, `dist/manifest.json`, `dist/sw.js`, binary PNG signatures + `IHDR` dimensions, relative `./assets/*.woff2` bundled fonts, and absence of root-relative `/assets/`, external hotlinks, or Unicode flag emojis. |
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
