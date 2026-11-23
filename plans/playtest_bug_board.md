# Operation Ironclad Atlas — Master Playtest Bug Board

Lead Quartermaster: **Vera (`vera-redteam`)**  
Scouts: **Mila (`mila-playtester`)**, **Devon (`devon-chaos`)**  
Test Suite: `tests/playtests/cohortA–E` (`PT-001`–`PT-100`) + Live Chromium Subpath Verification (`http://127.0.0.1:4173/wanderling-subpath/`)

> **Quarantine Rules:**  
> - Concrete Sprint 1 bugs only (`BUG-001`+). No scope creep: major architectural redesigns, Watchdog v2 (`PT-106`), code-splitting (`6.7 MB` bundle warning), and new modes live strictly in [sprint_2_proposals.md](./sprint_2_proposals.md).  
> - Failing `[PT-###]` regression checks remain failing until Phase 2 fixes land cleanly and Phase 3 Regression Lock passes 100%.

---

## Severity Summary

| Severity | Count | Bug IDs |
| :--- | :---: | :--- |
| **P0 — Critical / Softlock / Unfair Loss** | 2 | `BUG-001`, `BUG-002` |
| **P1 — High / Contrast / Core Flow / Offline** | 4 | `BUG-003`, `BUG-004`, `BUG-005`, `BUG-006` |
| **P2 — Medium / Linguistics / State / Migration** | 6 | `BUG-007`, `BUG-008`, `BUG-009`, `BUG-010`, `BUG-011`, `BUG-012` |
| **P3 — Low / Polish / Leaks / Metadata** | 5 | `BUG-013`, `BUG-014`, `BUG-015`, `BUG-016`, `BUG-017` |

---

## Canonical Bug Register

### BUG-001 — TowerStackArcade symmetric sine glide causes scoop collision & IEEE-754 rounding coin-flip
- **Severity:** `P0`
- **Owner:** `leo-arcade`
- **Playtests / Reporter:** `PT-053`–`PT-055` (`PT-101`) | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/arcade/TowerStackArcade.tsx:133-140, 204-210, 319-322`
- **Repro Steps:** Launch *Gelato & Pastry Tower*, click `Start Stacking!`, wait until target scoop reaches center (`x = 50%`), and click `Drop Scoop!`.
- **Expected vs Actual:** Expected target and distractor scoops on offset phases/lanes so the target passes `x = 50%` cleanly separated. Actual computes `xA = 50 + Math.sin(phase) * 29` and `xB = 50 + Math.sin(phase + Math.PI) * 29`, guaranteeing `|xA - 50| === |xB - 50|` (delta `< 1e-11`); both scoops overlap dead center, and `.sort((a, b) => Math.abs(a.x - 50) - Math.abs(b.x - 50))` picks the distractor ~47% of the time via IEEE-754 ULP rounding.
- **Regression Gate:** `tests/playtests/cohortC-arcade-matrix.test.tsx` (`[PT-053]`/`[PT-055]`)

### BUG-002 — Synchronous double-click races trigger `-2` heart loss, skipped exercises, un-keyed `Check`/`Continue` DOM reuse, blank-stage softlock & double shop spend
- **Severity:** `P0`
- **Owner:** `liam-gameplay`
- **Playtests / Reporter:** `PT-100` (`PT-102`) | `vera-redteam` & `devon-chaos`
- **File / Line:**
  - `src/components/lesson/LessonArena.tsx:318-341` (`advanceExercise`), `354-355` (`handleCheck`), `484-501` (`handleDiscoveryCollect`), `505-516` (`chestClaimed`), `1312-1341` (un-keyed `Continue`/`Check` footer buttons)
  - `src/components/lesson/BossGauntletView.tsx:276-343` (`handleCheckTurn`, `handleNextTurn`, `onComplete`)
  - `src/components/lesson/MiniStoryView.tsx:121-140` (`handleAdvance`)
  - `src/components/lesson/PairMatchRushView.tsx:448`
  - `src/components/meta/CompanionShop.tsx:118-174`
- **Repro Steps:**
  1. In `LessonArena`, select a wrong answer and double-click `Check` in the same frame -> hearts drop by `2` for `1` mistake; or double-click across two ticks -> un-keyed `Check` DOM node becomes `Continue` and click #2 immediately skips feedback.
  2. Double-click `Speak & Collect` -> skips next exercise; double-click `Continue` on penultimate exercise (`71%`) -> `exerciseIndex === exercises.length` renders blank `100%` softlock with only `X` exit and no completion rewards.
  3. Double-click `Buy Elixir (35 Gems)` / cosmetic buy or Boss `Send Reply!` / `Collect Boss Chest & Finish!` -> double gem deduction or duplicate turn callbacks.
- **Expected vs Actual:** Expected synchronous `useRef` action locks + distinct `key` props on `Check`/`Continue` buttons + idempotent store guards across Lesson, Boss, Story, PairMatch, and Shop. Actual relies on async React state or no guard at all.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-100]`)

### BUG-003 — Dark-theme CEFR tier pills on `AdventureMap` render near-invisible contrast (`~1.01:1–1.15:1`)
- **Severity:** `P1`
- **Owner:** `liam-gameplay` / `julian-architect`
- **Playtests / Reporter:** `PT-074`, `PT-076`, `PT-078`, `PT-079`, `PT-082`, `PT-085`, `PT-086`, `PT-088` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/components/map/AdventureMap.tsx:618-624` (pastel tints in `src/types/contracts.ts:742, 753, 763, 773, 782`)
- **Repro Steps:** Equip any dark palette (`theme_starlight_indigo`, `theme_cosmic_galaxy`, `theme_aurora_borealis`, `theme_royal_velvet`, `theme_emerald_rainforest`, `theme_neon_night_market`, `theme_laureate_imperial`) with `A2+` unlocked and view the CEFR tier strip on `AdventureMap`.
- **Expected vs Actual:** Expected dark ink (`#0F172A`) on pastel `meta.surfaceTint` (`#ECFDF5`, `#E0F2FE`, `#EDE9FE`, `#FEF3C7`, `#FCE7F3`) matching Lesson/Phrasebook/Shop pills. Actual sets `color: 'var(--text-main, #0f172a)'`, resolving to near-white in all 7 dark palettes (`1.01:1–1.15:1` contrast).
- **Regression Gate:** `tests/playtests/cohortD-palettes-viewports.test.tsx` (`[PT-076]`, `[PT-078]`, `[PT-079]`, `[PT-082]`, `[PT-085]`, `[PT-086]`, `[PT-088]`)

### BUG-004 — Mandarin (`zh`) & Japanese (`ja`) Free-Recall Hint Bar rejects valid Pinyin/Romaji prefixes
- **Severity:** `P1`
- **Owner:** `liam-gameplay`
- **Playtests / Reporter:** `PT-019`, `PT-023`, `PT-024` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/core/hintEngine.ts:472-479` (consumed by `src/components/lesson/WordBankView.tsx:547`)
- **Repro Steps:** Switch to `zh` (`zh-u15-n2`) or `ja`, open a `to_foreign` WordBank, enable `Keyboard Free-Recall`, press `+ Hint` twice, and type valid Pinyin (`"Ma"`, `"Wan"`) or Romaji (`"Oya"`).
- **Expected vs Actual:** Expected romanized prefix recognition matching the prompt `"Type in Mandarin Chinese or romanized"`. Actual branches solely on `LANGUAGE_META[language].usesSpaces` (`false`), splitting Latin text via `splitGraphemes` against native Hanzi/Kana tokens, returning `validWordPrefixCount: 0, hasWrongSuffix: true`, and showing false error `"Check word after prefix"`.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-023]`, `[PT-024]`)

### BUG-005 — `StarlightBridgeArcade` vertically clips bottom choice planks on mobile (`375x667`) for Master RTL/CJK prompts
- **Severity:** `P1`
- **Owner:** `leo-arcade` / `julian-architect`
- **Playtests / Reporter:** `PT-070`, `PT-103` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/arcade/StarlightBridgeArcade.tsx:970-1085`
- **Repro Steps:** At `375x667`, switch to `ar` or `zh`, pick `Master C1-C2`, and start *Starlight Bridge Cloze Builder*.
- **Expected vs Actual:** Expected all 4 bridge choice planks fully visible inside the `100dvh` card. Actual long C1_C2 prompt + romanized + phonetic + Hint stack overflows the `overflow-y: hidden` stage container, clipping `Plank 3`/`Plank 4` bottoms (`ar` `-4px`, `zh` `-27px`) and ellipsizing sub-bar instructions.
- **Regression Gate:** Live Chromium `375x667` bounding-box check (`verify_live_browser.py` / `tests/playtests/cohortC-arcade-matrix.test.tsx`)

### BUG-006 — Offline PWA fails with HTTP `503` & infinite spinner when opening uncached After-Hours Mashup chunks
- **Severity:** `P1`
- **Owner:** `hannah-platform`
- **Playtests / Reporter:** `PT-099`, `PT-104` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `public/sw.js:3-18, 65-77`, `src/components/shell/adultCurriculumSync.ts:45-46`, `src/curriculum/adultRegistry.ts:187-230`
- **Repro Steps:** Load app twice online so `sw.js` controls scope, go offline, reload, unlock After-Hours (`7` taps), and pick an unvisited Mashup (`stoner_tactical`) whose lazy chunk (`dist/assets/adult-mashup-*.js`) was never fetched online.
- **Expected vs Actual:** Expected either precached chunks (or clear offline fallback/retry UI in `AdultTrackLoadingCard`). Actual `sw.js` precaches only 8 static shell URLs (`PRECACHE_URLS`), returns `503 Service Unavailable`, emits uncaught dynamic import `pageerror`, and traps `AdultTrackLoadingCard` in an infinite spinner.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-099]` verifies SW precache/offline chunk cache vs `503` miss; live Chromium verifies uncached Mashup spinner lock)

### BUG-007 — Tap-to-Peek strips internal apostrophes (`fr`/`it`) & exposes Russian standalone `"—"` as clickable token
- **Severity:** `P2`
- **Owner:** `clara-linguist` / `liam-gameplay`
- **Playtests / Reporter:** `PT-003`, `PT-006`, `PT-013` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/components/lesson/lessonHelpers.ts:22-23, 198-207`
- **Repro Steps:** Open Discovery cards containing Romance elisions (`fr-u1-c5` `"s'il"`, `fr-u2-c1` `"l'eau"`, `it-u1-c3` `"d’oro!"`, `it-u2-c1` `"l'acqua"`) or Russian em-dash (`ru-u1-c9` `"Моё имя — Пип."`), and tap those tokens.
- **Expected vs Actual:** Expected boundary-only punctuation stripping preserving internal apostrophes for glossary lookup, and non-clickable standalone punctuation. Actual `.replace(EDGE_PUNCT_STRIP_RE, '')` uses global `/g`, turning `"s'il"` -> `"sil"` and `"d’oro!"` -> `"doro"` (`40/1113` French and `21/1091` Italian tokens fall back to full-sentence translation), and leaves `"—"` (`3/996` Russian tokens) clickable.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-002]` `fr`, `[PT-013]` `ru`)

### BUG-008 — Duplicate / case-colliding distractor tiles in Egyptian Arabic & Portuguese WordBanks
- **Severity:** `P2`
- **Owner:** `clara-linguist`
- **Playtests / Reporter:** `PT-005`, `PT-012` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:**
  - `src/curriculum/arzUnits9to16.ts:3540-3541` (`arz-u16-boss` turn `arz-u16-b2`: `'مع'` appears in both `targetTokens` and `distractorTokens`)
  - `src/curriculum/pt.ts:2557-2558` (`pt-u3-n3-e7`: distractor `'o'` collides case-insensitively with target `'O'`)
  - `src/curriculum/pt.ts:2631-2632` (`pt-u3-n4-e7`: distractor `'a'` collides case-insensitively with target `'A'`)
- **Expected vs Actual:** Distractor tiles must be lexically distinct from all `targetTokens` in the same exercise.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-005]`, `[PT-012]`)

### BUG-009 — Arabic (`ar`) ContextCloze splits bound proclitic `و` outside blank word
- **Severity:** `P2`
- **Owner:** `clara-linguist`
- **Playtests / Reporter:** `PT-011` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/curriculum/arUnits9to16.ts:2948-2955` (`ar-u14-n4-cloze` and derived `ar-u14-n1/n2/n3-pool-cc-3`)
- **Repro Steps:** Open `ar-u14-n4` ContextCloze (`"يقوي السلام و[______] روابط المجتمع بأسره."`).
- **Expected vs Actual:** Bound conjunction `و` should stay attached inside `expectedBlank: 'والوئام'` (`sentenceBeforeBlank: 'يقوي السلام'`, choices prefixed cleanly) rather than leaving detached `و` against the dashed blank box.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-011]`)

### BUG-010 — `FloatingPopToast` stack overlaps active Lesson card controls on mobile (`375x667`)
- **Severity:** `P2`
- **Owner:** `liam-gameplay`
- **Playtests / Reporter:** `PT-081` | `mila-playtester` (verified by `vera-redteam` via `shot-mobile-ar-rtl-wordbank.png`)
- **File / Line:** `src/components/fx/JuiceEngine.tsx:123-138`, `src/components/lesson/LessonArena.tsx:166-171`
- **Repro Steps:** At `375x667`, quickly collect 2 Discovery stickers into a 3x Combo exercise.
- **Expected vs Actual:** Up to 3 stacked toasts (`top: 66px`, `1150ms`) cover `"TRANSLATE TO..."`, register chip, and `+ Hint` controls on compact mobile screens.
- **Regression Gate:** Live `375x667` bounding-box overlap check + `JuiceEngine` toast slot bounds.

### BUG-011 — Tier Placement Checkpoints inflate `stats.lessonsCompleted`
- **Severity:** `P2`
- **Owner:** `liam-gameplay` / `julian-architect`
- **Playtests / Reporter:** `PT-017`–`PT-032`, `PT-105` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/lesson/LessonArena.tsx:266-277, 290-294`, `src/store/useVaultStore.ts:1702-1734`
- **Repro Steps:** Complete `buildTierCheckpointNode('es', 'B1')` through `LessonArena`.
- **Expected vs Actual:** Expected `stats.checkpointsPassed === 1` and `stats.lessonsCompleted === 0`. Actual invokes `completeMapNode` without `checkpointUnlock` (calling `unlockProficiencyTier` separately), evaluating `isCheckpoint = false` and incrementing both counters.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-017]`–`[PT-032]`)

### BUG-012 — `importVaultJson` rejects sparse valid v1 saves before `normalizeProfile` backfills optional fields
- **Severity:** `P2`
- **Owner:** `julian-architect`
- **Playtests / Reporter:** `PT-094`, `PT-107` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/store/useVaultStore.ts:470-537` (`validateProfile`)
- **Repro Steps:** Call `importVaultJson` on a `schemaVersion: 1` save with valid required fields (`id`, `name`, `languageProgress`) omitting optional fields (`avatarId`, `gems`, `stats`).
- **Expected vs Actual:** Expected `normalizeProfile` defaults applied safely on v1 migration. Actual `validateProfile` rejects early (`profiles[0].avatarId "undefined" is invalid.` / `gems must be a non-negative number.`).
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-094]`)

### BUG-013 — RTL `WordBankTray` places `"Preview:"` label at visual left (end) of Arabic reading line
- **Severity:** `P3`
- **Owner:** `liam-gameplay`
- **Playtests / Reporter:** `PT-045`, `PT-046`, `PT-078` | `mila-playtester` & `vera-redteam` (confirmed visually in `shot-mobile-ar-rtl-wordbank.png`)
- **File / Line:** `src/components/lesson/WordBankTray.tsx:186-209`
- **Repro Steps:** Assemble tiles in an `ar` or `arz` `to_foreign` WordBank (`ar-u15-n2`) to show the preview line.
- **Expected vs Actual:** Container uses `<div dir="ltr">Preview: <span dir={dir} style={{ unicodeBidi: 'isolate' }}>` inside an RTL screen, rendering English `"Preview:"` at the visual left (sentence end) after right-to-left Arabic words rather than leading from the RTL start or sitting cleanly above/isolated via `<bdi>`.
- **Regression Gate:** Live `375x667` RTL WordBank visual check (`shot-mobile-ar-rtl-wordbank.png`) + `tests/playtests/cohortB-adult-quarantine.test.tsx` (`[PT-045]`)

### BUG-014 — Mobile Gem Shop horizontal pedestal slices Streak Freeze card + CTA pill contrast below WCAG AA
- **Severity:** `P3`
- **Owner:** `julian-architect` / `liam-gameplay`
- **Playtests / Reporter:** `PT-085` | `mila-playtester` (verified in `src/styles/theme.css:1299-1304`)
- **File / Line:** `src/styles/theme.css:1299-1304`, `src/components/meta/CompanionShop.tsx:239`
- **Repro Steps:** Open Gem Shop at `375x667` (`shot-dark-shop-mobile.png`) and measure contrast on bright amber (`0.65x Turtle`, `Keyboard Free-Recall`, `Family Show-Off Mode` `~2.15:1`), emerald (`A1 Sprout`, `Speak & Collect`, `Next Card` `~2.54:1`), and orange (`~2.73:1`) white-text pills.
- **Expected vs Actual:** Stack Streak Freeze without slicing off the viewport right edge; deepen CTA pill backgrounds to meet WCAG `>= 4.5:1` / large-text `>= 3.0:1`.
- **Regression Gate:** Live `375x667` Shop viewport geometry + contrast check.

### BUG-015 — `TargetPromptBar` `Say It Normally` toggle (`plainOpen`) stays open across Arcade target changes
- **Severity:** `P3`
- **Owner:** `leo-arcade`
- **Playtests / Reporter:** `PT-047`–`PT-073`, `PT-108` | `devon-chaos` (verified in `src/components/arcade/arcadeShared.tsx:1849-1878`)
- **File / Line:** `src/components/arcade/arcadeShared.tsx:1849-1878`
- **Repro Steps:** Expand `Say It Normally` in Adult Mode *Sky-Catcher*/*Meteor Blaster*/*Tower Stack*/*Train Switcher*/*Rhythm Chef*/*Critter Choir*, clear the round, and advance to the next target.
- **Expected vs Actual:** Expected `plainOpen` to reset to `false` on `targetItem.id` change (consistent with `CafeOrderRushArcade:130`, `ConstellationMemoryArcade:104`, `StarlightBridgeArcade:244`). Actual leaves the spoiler drawer open across targets.
- **Regression Gate:** `tests/playtests/cohortB-adult-quarantine.test.tsx` (`[PT-033]`)

### BUG-016 — Uncleaned `window.setTimeout` handles on unmount in `LessonArena.tsx` & `PairMatchRushView.tsx`
- **Severity:** `P3`
- **Owner:** `liam-gameplay`
- **Playtests / Reporter:** `PT-109` | `devon-chaos` (verified in `src/components/lesson/PairMatchRushView.tsx:107-111`, `src/components/lesson/LessonArena.tsx:169, 176-177`)
- **File / Line:** `src/components/lesson/LessonArena.tsx:169, 176-177`; `src/components/lesson/PairMatchRushView.tsx:107-111`
- **Repro Steps:** Trigger confetti burst in `LessonArena` or mismatch shake in `PairMatchRushView`, then unmount immediately before timeout expiry (`420ms`).
- **Expected vs Actual:** Cleanup timeout handles on unmount to eliminate stale post-unmount state updates/timer leaks.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-100]`)

### BUG-017 — Stale `"4-language"` metadata in `package.json` & `DESIGN.md`
- **Severity:** `P3`
- **Owner:** `hannah-platform`
- **Playtests / Reporter:** `PT-110` | `devon-chaos` & `vera-redteam`
- **File / Line:** `package.json:6` (`"4-language interactive learning adventure & offline PWA."`); `DESIGN.md:6, 23` (`"Four Symmetrical Cultural Lands"`, `ES, FR, DE, IT`)
- **Expected vs Actual:** Update root metadata and design header to reflect all 16 living languages (+ 7 After-Hours Atlas tracks) consistently with `README.md`.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-098]`)

---

## Contract Guardrail Note (`src/types/contracts.ts`)
- No breaking edits to `src/types/contracts.ts` are required to resolve `BUG-001`–`BUG-017`.
- `SpeechOutcome` contract & `4500ms` hung-utterance watchdog behavior (`PT-106`, locked by `tests/adult-easter-egg.test.tsx:1165` and `tests/speech-audio.test.ts:242`) are intentionally preserved for Sprint 1 and queued in [sprint_2_proposals.md](./sprint_2_proposals.md) (`S2-004`).
