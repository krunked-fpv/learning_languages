# WANDERLING: THE GRAND ATLAS OF LIVING TONGUES

## 1. World Premise & Creative Aesthetic
**Wanderling** blends *Nintendo tactile toy-craft* with *Pixar storybook illustration*. Players captain the **Starlight Compass** expedition alongside **Pip the Polyglot Starling** (a round, expressive cobalt-and-gold songbird explorer wearing an oversized brass compass medallion) to awaken the **Living Phrasebook** by mastering real-world languages.

### Four Symmetrical Cultural Lands
1. **Spanish (`es` — `es-MX` / `es-ES`) — *El Camino del Sol***
   - **Regional Companion:** **Mateo the Axolotl Chef & Guitarist**
   - **Setting & Palette:** Terracotta sun plazas, papel picado banners, warm churro carts, Pyrenees mountain passes (`#EA580C`, `#FBBF24`, `#0EA5E9`).
2. **French (`fr` — `fr-FR`) — *La Route des Étoiles***
   - **Regional Companion:** **Colette the Boulangerie Fox**
   - **Setting & Palette:** Montmartre rooftops, warm streetlamps, lavender Provence hillsides, cozy pastry bakeries (`#2563EB`, `#F43F5E`, `#8B5CF6`).
3. **German (`de` — `de-DE`) — *Der Märchenpfad***
   - **Regional Companion:** **Benni the Clockwork Badger Tinkerer**
   - **Setting & Palette:** Half-timbered Black Forest gables, alpine cable cars, pretzel bakeries, brass cuckoo-clock towers (`#D97706`, `#15803D`, `#334155`).
4. **Italian (`it` — `it-IT`) — *La Via del Mare***
   - **Regional Companion:** **Luca the Gondolier Sea-Otter**
   - **Setting & Palette:** Sunlit Venetian canals, artisan gelato carts, Roman stone piazzas, coastal lemon groves (`#059669`, `#DC2626`, `#0284C7`).

---

## 2. Core UX, Craft & Platform Mandates
- **Cross-Platform Custom Vector Flags:** Windows renders Unicode country-flag emojis as plain two-letter text (`ES`, `FR`, `DE`, `IT`). Every language flag in the top HUD, profile cards, and Phrasebook MUST be rendered via crisp inline SVG (`FlagIcon.tsx`), with zero regional-indicator Unicode characters anywhere in code, data, or documentation.
- **Tactile 3D-Bevel Toy-Craft Physics:** Interactive cards, word-bank tiles, and primary action buttons use chunky `border-bottom-width: 4px` (or `5px` for primary CTAs) with spring `translateY(2px)` press feedback and joyful color elevation.
- **Strict `100dvh` Full-Viewport Lesson Arena:** Active lessons frame cleanly inside `100dvh` across Desktop (`1440x900`, `1024x768`), Tablet (`768x1024`), and Mobile (`390x844`, `375x667`) with zero awkward mid-lesson page scrolling (`document.documentElement.scrollHeight <= window.innerHeight`).
- **Kid-Safe Warm Hospitality:** Every café, bakery, and travel dialogue celebrates kid-loved treats (hot chocolate, croissants, churros, pretzels, orange juice, mango gelato, fresh apples)—never alcohol or adult bar themes, and never harsh red buzzers.
- **Accent-Forgiving + Teachable Grading:** Kids typing or selecting base ASCII letters (`nino`, `garcon`, `fur`, `strasse`, `caffe`) pass with **zero heart penalty** while triggering a celebratory golden **Accent Spotlight!** callout teaching the exact diacritic (`ñ`, `ç`, `ü`, `ß`, `è/à`).
- **Zero-Stall Offline Speech & Audio:** All sound effects synthesize natively via Web Audio (`AudioContext`), and when OS Web Speech voices for a language are absent on stripped tablets or headless browsers, Wanderling plays a rhythmic marimba syllable cadence matched to hyphenated phonetics and automatically displays phonetic-assisted clues in *Listen & Decode* so lessons never stall.
- **Offline-Installable GitHub Pages PWA:** Relative `./` routing (`base: './'`), pure-Node anti-aliased RGBA PNG icons (`192x192`, `512x512`, maskable & apple-touch variants), network-first Service Worker (`./sw.js`), and multi-kid local vault with 1-click JSON export/import.
