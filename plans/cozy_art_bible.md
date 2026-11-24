# Wanderling — Cozy ASMR Storybook Art Bible (1 page, LOCKED)

North star: an heirloom hand-illustrated atlas by a sunlit window or reading lamp. Ghibli gouache × crafted-world tactility × Monument Valley calm. Every worker obeys this so the game reads as one artist's hand.

## 1. Key light & shadow
- One warm key light from **upper-left (~10 o'clock, ~35°)**; cool-violet ambient fill from lower-right.
- Highlights sit upper-left on every form; cast shadows fall **down-right**, soft and **tinted, never grey/black**: `color-mix(in oklab, var(--ink-warm, #4a3426) 22%, transparent)`.

## 2. Warm ink contours
- No `#000` strokes. Daylight palettes: sepia ink (`--ink-warm`, ~`#4a3426`). Dark palettes: antique gold / warm umber (~`#d9b46a`).
- Silhouette strokes 1.5–2.5px, inner contours thinner and lighter (`--ink-soft`); `stroke-linecap/linejoin: round`.

## 3. Shared CSS tokens (owner: liam-gameplay adds them to ALL 15 palette blocks in `src/styles/theme.css`; everyone else consumes them WITH fallbacks)
`--ink-warm`, `--ink-soft`, `--paper-base`, `--paper-shade`, `--paper-grain-opacity`, `--key-light`, `--ambient-fill`, `--lantern-glow`, `--gild`, `--shadow-tint`, `--surface-material` (comment keyword per family). Example: `var(--ink-warm, #4a3426)`.

## 4. Materiality per palette family (do not flatten into one beige)
- **Daylight** (Parchment, Kyoto Matcha, Alpine Meadow, Sakura, Capri/ocean_lagoon, Sunset Plaza, Sahara, Emerald): watercolor paper, linen, botanical washes, sunlit sepia ink.
- **Candlelit / Celestial** (Starlight Indigo, Cosmic Galaxy, Laureate Imperial, Solaris/royal_velvet): velvet-bound star-chart folio, gold-leaf linework, amber lantern glow.
- **Specialty** (Neon Night Market, Aurora Borealis, Nordic Fjord): rice-paper lanterns on lacquered wood; or carved Nordic woodblock with northern shimmer.
- Legibility: body text ≥ 4.5:1, large text ≥ 3:1 in all 15 palettes.

## 5. Motion personality
- Unhurried, weighted, pillowy. Framer springs `stiffness 170–260, damping 22–30, mass 1–1.4`.
- Press = scale 0.97 + y +2px, then soft settle. Idle loops 3–6s, amplitude ≤ 4px. No shake/jitter.
- Animate only `transform`/`opacity`. Gate every loop with `useReducedMotion` / `prefers-reduced-motion: reduce`.

## 6. Texture & SVG rules
- `feTurbulence` grain is **static/cached only** (one shared layer or data-URI) — never animated, never per-frame.
- Every SVG `<defs>` id is scoped via `React.useId()` (replace `:` with `-`) or a component-unique prefix.
- Zero external URLs/fonts/images/audio/`fetch()`. Zero flag emoji (U+1F1E6–1F1FF); flags are inline SVG. All asset paths `./…` (`base: './'`).

## 7. Audio feel
- Wood tap, thick paper, felt settle, glass celesta, warm kalimba, soft wind-chime shimmer. Attacks ≥ 5ms, no harsh square buzz, generous master headroom. All `SoundEffectId` / `SpeechSpeed` contracts unchanged.

## 8. Hard boundaries
`100dvh` zero outer scroll at 1440x900 / 768x1024 / 375x667; vault `wanderling.vault.v1` & Adult Mode quarantine untouched; no edits to `src/curriculum/**`, `src/core/grader.ts`, `src/types/contracts.ts`.
