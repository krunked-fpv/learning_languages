# Wanderling 2.0: The Grand Atlas of Living Tongues (16 Living Languages)

**Wanderling 2.0** is a kid-friendly, tactile, offline-ready Progressive Web App (PWA) game console for learning **16 living languages** across Latin, Arabic, Cyrillic, Devanagari, Bengali, Simplified Chinese, and Japanese scripts. Young explorers journey alongside **Pip the Polyglot Starling** and regional animal companions (**Mateo**, **Colette**, **Benni**, and **Luca**) across **128 themed cultural units** and **896 adventure map nodes** to collect **1,600+ Living Phrasebook stickers**.

---

## Sixteen Cultural Lands

| Code | Language | Native Script | Direction | Cultural Land | Companion | Setting |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ES** | Spanish (`Español`) | Latin (`latin`) | `LTR` | *El Camino del Sol* | **Mateo** — Axolotl Chef & Guitarist | Sun plazas, churro carts, Pyrenees passes |
| **FR** | French (`Français`) | Latin (`latin`) | `LTR` | *La Route des Étoiles* | **Colette** — Boulangerie Fox | Montmartre rooftops, pastry bakeries, lavender hills |
| **DE** | German (`Deutsch`) | Latin (`latin`) | `LTR` | *Der Märchenpfad* | **Benni** — Clockwork Badger Tinkerer | Half-timbered Black Forest gables, alpine cable cars |
| **IT** | Italian (`Italiano`) | Latin (`latin`) | `LTR` | *La Via del Mare* | **Luca** — Gondolier Sea-Otter | Venetian canals, gelato carts, coastal lemon groves |
| **PT** | Portuguese (`Português`) | Latin (`latin`) | `LTR` | *A Trilha Tropical* | **Mateo** — Carnival Rhythm Guitarist | Tropical Sugarloaf bay, palm hills, carnival rhythm plazas |
| **EN** | English (`English`) | Latin (`latin`) | `LTR` | *The Starlight Compass Isles* | **Colette** — Storybook Harbor Guide | Coastal lighthouse harbor, storybook piers, clocktower quay |
| **ZH** | Mandarin Chinese (`中文`) | Simplified Hanzi (`hanzi`, spaceless) | `LTR` | *The Lantern Cloud Peaks* | **Mateo** — Moon-Gate Lantern Chef | Misty karst peaks, moon-gate pavilions, glowing red lanterns |
| **JA** | Japanese (`日本語`) | Kana & Kanji (`japanese`, spaceless) | `LTR` | *Sakura Sky Trail* | **Colette** — Sakura Origami Fox | Vermilion torii gates, sakura blossoms, snow-capped Mt. Fuji |
| **HI** | Hindi (`हिन्दी`) | Devanagari (`devanagari`) | `LTR` | *The Marigold Palace Trail* | **Mateo** — Marigold Spice Musician | Marigold garland arches, spice markets, sandstone domes |
| **BN** | Bengali (`বাংলা`) | Bangla (`bengali`) | `LTR` | *The Lotus River Delta* | **Benni** — Riverboat Lantern Tinkerer | Lotus-dotted river delta, wooden country boats, emerald banks |
| **AR** | Modern Standard Arabic (`العربية الفصحى`) | Arabic (`arabic`) | `RTL` | *Oasis of Golden Stars* | **Benni** — Astrolabe Star Navigator | Starlit desert oasis palms, astrolabe arches, golden dunes |
| **ARZ** | Egyptian Arabic (`مصري`) | Arabic (`arabic`) | `RTL` | *Nile Felucca Breeze* | **Luca** — Nile Felucca Captain | Golden Nile pyramids, white-sailed feluccas, Cairo river breezes |
| **RU** | Russian (`Русский`) | Cyrillic (`cyrillic`) | `LTR` | *The Starlight Frost Express* | **Benni** — Trans-Aurora Train Engineer | Colorful onion domes, snowy northern pines, aurora railway |
| **ID** | Indonesian (`Bahasa Indonesia`) | Latin (`latin`) | `LTR` | *Emerald Archipelago Voyage* | **Luca** — Island Schooner Sea-Otter | Emerald volcanic archipelago peaks, island coves, outrigger prahu |
| **VI** | Vietnamese (`Tiếng Việt`) | Latin (`latin`, stacked diacritics) | `LTR` | *Lantern Bay & Bamboo Peaks* | **Colette** — Silk-Lantern Harbor Baker | Emerald karst bay, bamboo peaks, floating silk lanterns |
| **SW** | Swahili (`Kiswahili`) | Latin (`latin`) | `LTR` | *Savanna Sun & Dhow Coast* | **Luca** — Zanzibar Dhow Captain | Golden savanna acacias, Kilimanjaro vista, Zanzibar coastal dhows |

---

## What's New in 2.0 & Core Features

- **128 Units / 896 Map Nodes / 1,600+ Phrasebook Stickers:** Every single one of the 16 courses spans **8 symmetrical cultural units** (`4` lessons + `1` story + `1` treasure chest + `1` boss gauntlet = **56 nodes per language**, **896 nodes total**)—from Greetings, Cafe & Kid Treats, Animal Friends & Nature, Family & Colors, and Grand Expedition through *Music & Hobbies* (Unit 6), *Cozy Home & Clothes* (Unit 7), and *Starlight Cosmos* (Unit 8)—presented inside a chapter-carousel **Adventure Map** diorama covering **72 bespoke SVG illustrations** and custom regional scenery.
- **Deep Non-Repeating Level Pool (`levelPool.ts`):** Dynamically expands exercises across all 896 map nodes (`lesson` pools and `boss` gauntlets) while tracking seen exercise IDs in the save vault so replayed lessons and boss challenges stay fresh.
- **Multi-Script & RTL Lesson / Arcade Support:** Full right-to-left (`dir="rtl"`) layout and word-bank assembly for **Modern Standard Arabic (`ar`)** and **Egyptian Arabic (`arz`)**, spaceless CJK phrasing and token segmentation for **Mandarin Chinese (`zh`)** and **Japanese (`ja`)**, authentic **Devanagari (`hi`)**, **Bangla (`bn`)**, **Cyrillic (`ru`)**, and **Vietnamese (`vi`)** diacritic rendering, plus `romanized` (Pinyin/Romaji/transliteration) cues alongside kid-friendly syllable phonetics in lessons, stories, phrasebook cards, and all 7 arcade cabinets.
- **Forgiving Polyglot Grader (`src/core/grader.ts`):** Normalizes international punctuation (`¡!¿?.,;:"“”`, CJK `。？！，、・「」『』（）`, Arabic `،؟؛` + tatweel `\u0640`, Indic danda `।॥`), grants full-heart passes with celebratory **Accent Spotlight** coaching on unaccented Latin/stacked Vietnamese (`đ -> d`, `\u1E00–\u1EFF`), Portuguese (`ã, õ, ç, â, ê, ô`), German (`ß -> ss`, `ä/ö/ü`), and Russian (`ё -> е`), strips optional Arabic harakat/tashkeel and normalizes alef/ya/ta-marbuta variants (`أ/إ/آ/ٱ -> ا`, `ى -> ي`, `ة -> ه`), collapses spaces between adjacent CJK/Kana characters, accepts romanized/Pinyin/Romaji answers, and surfaces **Article & Grammar Coaching** (`ARTICLE_META`) across all 16 languages.
- **16-Locale Web Speech & Marimba Cadence Fallback (`src/audio/`):** `SPEECH_LOCALE_MAP` covers all 16 `LanguageCode`s with tier-ranked voice matching (for example `arz` prioritizes `ar-EG`, `ar` prioritizes `ar-SA`/`ar-001`, `id` supports `id-ID`/`in-ID`, and `zh` supports `zh-CN`/`cmn-Hans-CN`), `0.95` normal and `0.65` slow turtle speeds, a `4500ms` hung-utterance watchdog, and seamless offline fallback to warm Web Audio sine/triangle marimba cadence (`playPhoneticCadence`) plus acoustic sound effects (`star_pop`, `whoosh_transition`, `bubble_pop`, `secret_fanfare`).
- **Multi-Kid Save Vault v1 Migration & SVG Flags (`src/store/useVaultStore.ts`):** Isolates kid profiles in `localStorage` (`wanderling.vault.v1`) with strict schema-validated JSON export/import (`replace` and `merge`) and automatic legacy 4-language (`es, fr, de, it`) save migration into all 16 `LANGUAGE_LIST` slots without wiping XP, gems, streaks, hearts, unlocked stickers, seen exercises, arcade high scores, or equipped cosmetics. Renders all 16 flags via crisp inline SVGs (`FlagIcon`, zero Unicode flag emojis) in a bounded 2-column `TopHud` switcher, `ProfileVaultModal`, and `PhrasebookVault`.
- **7 Tactile Arcade Mini-Games (`ArcadeHub`):**
  1. **Sky-Catcher Fiesta:** 60fps sky-gliding word-lantern catcher that practices unlocked vocabulary and restores hearts mid-lesson (`0`-heart recovery).
  2. **Cosmic Meteor Blaster:** Twin-laser starship word defense against drifting vocabulary asteroids across 3 cosmic lanes.
  3. **Gelato & Pastry Tower:** Precision timing stacker dropping matching treat scoops for golden drizzle streaks.
  4. **Constellation Memory Twins:** Cosmic 3D star-chart card flip matching with glowing constellation lines.
  5. **Alpine Express Switcher:** 3-track clockwork railway junction routing Benni's train to matching cargo words.
  6. **Beat Kitchen Rhythm:** 4-pad musical beat catcher with pentatonic chord harmonies.
  7. **Secret Unlockable — *Starlight Critter Choir*:** 45-second musical word-bubble rhythm celebration featuring all 5 companions (`Pip`, `Mateo`, `Colette`, `Benni`, and `Luca`) and a 5-streak **Starlight Disco Fever** meter. Unlock it by **clearing 3 lessons**, **clearing any Unit Boss**, or **tapping the Golden Starlight Compass 5 times in the top HUD**!
- **9 Unlockable Color Palettes (featuring *Cosmic Galaxy Nebula*):** Switch between Default (*Storybook Parchment*) and 8 unlockable themes in the Gem Shop or Top HUD Palette Quick-Switcher—**Cosmic Galaxy Nebula**, **Arctic Aurora Borealis**, **Starlight Indigo**, **Solaris Gold & Velvet**, **Sunset Plaza**, **Sakura Berry Sorbet**, **Capri Turquoise Lagoon**, and **Alpine Meadow**—paired with a live animated **Ambient Backdrop**.
- **Zero-Scroll `100dvh` Game Console & Self-Hosted Fonts:** Locked `100dvh` viewport across `375x667`, `768x1024`, and `1440x900`, bundling `@fontsource-variable/fredoka` and `@fontsource-variable/nunito` `.woff2` fonts in `dist/assets/` alongside offline system font fallback stacks for Arabic, CJK, Devanagari, Bengali, and Cyrillic (zero external CDN requests).

---

## Getting Started

### Prerequisites

- **Node.js 20+** (tested with Node 22) and **npm**

### Development, Testing & PWA Subpath Verification Commands

```bash
# Install dependencies
npm install

# Start local Vite dev server
npm run dev

# Run the full Vitest suite once (cross-platform, avoids watch mode in PowerShell)
npx vitest run

# Regenerate pure-Node anti-aliased RGBA PNG icons into public/icons/
npm run generate:icons

# Typecheck + build production bundle into dist/ (runs prebuild icon generation)
npm run build

# Verify dist/ PWA manifest, Service Worker, PNG IHDR headers, relative .woff2 fonts,
# 16 cultural landmarks in the built bundle, and zero Unicode flag emojis across dist/
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
| [`index.html`](./index.html) | Links `./manifest.json`, `./icons/icon-192.png`, `./icons/apple-touch-icon.png`, sets `#1e1b4b` theme color, documents the 16-language Grand Atlas, and registers `./sw.js` with `{ scope: './' }`. |
| [`public/manifest.json`](./public/manifest.json) | Configures standalone PWA metadata, `#1e1b4b` theme/background colors, `./` start/scope URLs, and both `any` and `maskable` icon entries. |
| [`public/sw.js`](./public/sw.js) | Service Worker (`wanderling-cache-v2`) pre-caching core shell & icon assets, purging stale caches on `activate`, and serving same-origin GET requests network-first with cache write-back and offline fallback. |
| [`scripts/generate-pwa-icons.mjs`](./scripts/generate-pwa-icons.mjs) | Zero-dependency Node ESM PNG encoder (`node:zlib` `deflateSync` + IEEE 802.3 CRC32) rendering anti-aliased RGBA icons (`192x192`, `512x512`, maskable safe-zone variants, and `180x180` Apple touch icon). |
| [`scripts/verify-build-artifacts.mjs`](./scripts/verify-build-artifacts.mjs) | Automated release gate verifying `dist/index.html`, `dist/manifest.json`, `dist/sw.js`, binary PNG signatures + `IHDR` dimensions, relative `./assets/*.woff2` bundled fonts, all 16 cultural landmarks in built JS bundles, and zero root-relative `/assets/`, external hotlinks, or Unicode flag emojis across `dist/`. |
| [`scripts/serve-subpath.mjs`](./scripts/serve-subpath.mjs) | Zero-dependency Node HTTP preview server mounting `dist/` at `/wanderling-subpath/`, redirecting `/`, and printing `READY http://127.0.0.1:<port>/wanderling-subpath/`. |

---

## GitHub Pages Deployment

The workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) runs automatically on pushes to `main` (and via manual `workflow_dispatch`), executing:

1. `npm ci`
2. `npx vitest run`
3. `npm run build`
4. `node scripts/verify-build-artifacts.mjs`
5. `actions/upload-pages-artifact@v3` & `actions/deploy-pages@v4`

To enable Pages deployment on GitHub, set **Settings -> Pages -> Source** to **GitHub Actions**.
