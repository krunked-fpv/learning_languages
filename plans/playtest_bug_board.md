# Studio Wanderling — Master Playtest Bug Board

## Sprint 2 — Operation Starlight Horizon (`PT-001`–`PT-115`)

- **Sprint 2 Status:** `VERIFIED_CLOSED` (`0` open Sprint 2 bugs; `11 / 11` verified closed; `S2-001`–`S2-007` shipped & verified; `npx tsc --noEmit` -> `0` errors; unfiltered `npx vitest run` -> `19 / 19` suites & `251 / 251` tests passing including `115 / 115` playtests `PT-001`–`PT-115` and `16 / 16` `tests/playtests/bug-board-regressions.test.tsx`; live `http://127.0.0.1:4173/wanderling-subpath/` Chrome audits across `1440x900`, `768x1024`, `375x667` -> `0` console/page/HTTP errors, `0` outer overflow)
- **Lead Quartermaster:** **Vera (`vera-s2`)** | **Scouts:** **Devon (`devon-s2`)**, **Mila (`mila-s2`)**
- **Sprint 2 Playtest Coverage:** `115` playtests (`PT-001`–`PT-100` regression + `PT-101`–`PT-115` Cohort F) + `16 / 16` targeted Bug Board gates (`BUG-005, 006, 010, 013, 014` & `BUG-S2-001`–`BUG-S2-011`) + `12` baseline suites (`251 / 251` tests) + live `http://127.0.0.1:4173/wanderling-subpath/` Chrome audits
- **Open Sprint 2 Bugs (`BUG-S2-###`):** `0` (`11 / 11` `VERIFIED_CLOSED`)

| Bug ID | Playtest / Area | Severity | Owner | Status | Fix Commit & Closure Summary |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `BUG-S2-001` | `PT-101` / `PT-107` (`S2-001`, `S2-007`) | `P1` | `@leo-s2` | `VERIFIED_CLOSED` | `4dfe6f2` (`0002cae`): `useArcadeDeck` subscribes to `subscribeBaseRegistry` & triggers `ensureBaseCourseLoaded` on Co-Op Turn 2 & Quarantined fallback (verified in `[BUG-S2-001]` & live Chrome `vera-w2-coop-ru-hydrated.png`) |
| `BUG-S2-002` | `PT-107` / `PT-114` (`S2-007`) | `P2` | `@leo-s2` | `VERIFIED_CLOSED` | `4dfe6f2` (`0002cae`): `ArcadeHub` aborts stale `coopMatch` if a partner disappears mid-Handoff or `recordCoopArcadeSession` returns `null` (verified in `[BUG-S2-002]` & live Chrome) |
| `BUG-S2-003` | `PT-111` (`S2-007`) | `P2` | `@julian-s2` | `VERIFIED_CLOSED` | `5305797` (`91e0871`): strict calendar `isValidISODateString`, storage date sanitization, & chronological `pickNewestISO` comparison (verified in `[BUG-S2-003]`) |
| `BUG-S2-004` | `PT-108` (`S2-005`, `S2-007`) | `P3` | `@julian-s2` / `@leo-s2` | `VERIFIED_CLOSED` | `5305797` (`91e0871`) + `4dfe6f2` (`0002cae`): Co-Op passes & settles played safe `playerOneLanguage`/`playerTwoLanguage` instead of quarantined Adult track (verified in `[BUG-S2-004]`) |
| `BUG-S2-005` | `PT-106` / `PT-113` (`S2-005`) | `P1` | `@liam-s2` | `VERIFIED_CLOSED` | `7f24e97` (`1b6637b`): `.lesson-arena-header` 2-row responsive wrap on `<=640px` (`min-width: 64px` progress track, zero overflow on `375x667`; verified in `[BUG-S2-005]` & `vera-w2-bug005-adult-remix-375.png`) |
| `BUG-S2-006` | `PT-103` / `PT-109` (`S2-002`, `S2-006`) | `P2` | `@liam-s2` | `VERIFIED_CLOSED` | `7f24e97` (`1b6637b`): empty RTL Free-Recall placeholders isolate LTR left alignment & concise compact copy across `ar`/`arz`/`vi` (verified in `[BUG-S2-006]` & `vera-w2-bug006-ar-placeholder-375.png`) |
| `BUG-S2-007` | `PT-109` (`S2-006`) | `P2` | `@liam-s2` | `VERIFIED_CLOSED` | `7f24e97` (`1b6637b`): `useFreeRecallInput` maintains synchronous ref-backed text/selection across `WordBankView` & `BossGauntletView` (verified in `[BUG-S2-007]` & live Chrome) |
| `BUG-S2-008` | `PT-110` (`S2-006`) | `P2` | `@clara-s2` | `VERIFIED_CLOSED` | `3027c73` (`0b13695`): `ELISION_PREFIX_RULES` expanded with Italian `gl'`, `bell'`, `anch'`, `ch'` + curly apostrophe normalization (verified in `[BUG-S2-008]`) |
| `BUG-S2-009` | `PT-109` / `PT-113` (`S2-006`) | `P3` | `@liam-s2` | `VERIFIED_CLOSED` | `7f24e97` (`1b6637b`): hides duplicate `Accent character bar` while `VirtualScriptDrawer` is open & keeps `375x667` stage bounded (`565===565`; verified in `[BUG-S2-009]` & `vera-w2-bug009-zh-drawer-375.png`) |
| `BUG-S2-010` | `PT-101` / Suite (`S2-001`) | `P1` | `@clara-s2` / `@coordinator` | `VERIFIED_CLOSED` | `fe7b783`: `vite.config.ts` sets `test.include: ['tests/**/*.{test,spec}.{ts,tsx}']`; unfiltered `npx vitest run` exits `0` (`19/19`, verified in `[BUG-S2-010]`) |
| `BUG-S2-011` | `PT-108` (`S2-005`) | `P2` | `@leo-s2` | `VERIFIED_CLOSED` | `4dfe6f2` (`0002cae`): `isAdultProfileActive` / `isCoopTurnQuarantined` enforce `adultModeActive` across Hub & cabinets, blocking Adult Turn 2 bleed (verified in `[BUG-S2-011]` & live Chrome) |

### Sprint 2 Canonical Bug Details (`BUG-S2-001`–`BUG-S2-011`)

#### BUG-S2-001 — `useArcadeDeck` omits base curriculum lazy hydration during Co-Op Turn 2 & Kid-Quarantined fallback
- **Status:** `VERIFIED_CLOSED` (`4dfe6f2`, merged `0002cae`) | **Severity:** `P1` | **Owner:** `@leo-s2` | **Reporter:** `devon-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/arcade/arcadeShared.tsx:1310-1338`; `src/curriculum/baseCoursesLoader.prod.ts:16-41`; `src/App.tsx:361`
- **Repro Steps:** In production build (`http://127.0.0.1:4173/wanderling-subpath/`), keep P1 (`Leo`) on eager `'es'` and P2 (`Maya`) on lazy `'fr'`/`'ru'`, launch 2P Family Co-Op, finish Turn 1, and start Maya's Turn 2 before Maya's language was visited.
- **Closure Note:** Verified via `[BUG-S2-001]` in `tests/playtests/bug-board-regressions.test.tsx` (both Co-Op Turn 2 & direct `useArcadeDeck` Kid-Quarantined fallback trigger `ensureBaseCourseLoaded('fr')` and hydrate via `subscribeBaseRegistry`) and live headless Chrome (`course-ru-*.js` fetched when Co-Op is armed and Russian Cyrillic rendered on Turn 2, `vera-w2-coop-ru-hydrated.png`).

#### BUG-S2-002 — Ghost `coopMatch` survives partner deletion mid-Handoff and renders unpersisted Finale
- **Status:** `VERIFIED_CLOSED` (`4dfe6f2`, merged `0002cae`) | **Severity:** `P2` | **Owner:** `@leo-s2` | **Reporter:** `devon-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/arcade/ArcadeHub.tsx:303-313, 456-460`; `src/store/useVaultStore.ts`
- **Repro Steps:** Start a 2P Co-Op match (`Leo` vs `Maya`), finish Turn 1 to reach `"Pass Console to Maya!"` (`handoff`), open `ProfileVaultModal` from `TopHud` and delete `Maya`, then close modal.
- **Closure Note:** Verified via `[BUG-S2-002]` (`bug-board-regressions.test.tsx`) and live Chrome on `1440x900`: deleting `Maya` mid-Handoff immediately aborts `coopMatch` back to Hub (`handoffAfterDelete: false`), and `recordCoopArcadeSession` returning `null` aborts without rendering a fake Finale.

#### BUG-S2-003 — `validateVault` accepts non-date strings and `pickNewestISO` overwrites valid dates on `merge` import
- **Status:** `VERIFIED_CLOSED` (`5305797`, merged `91e0871`) | **Severity:** `P2` | **Owner:** `@julian-s2` | **Reporter:** `devon-s2` (verified by `vera-s2`)
- **File / Line:** `src/store/useVaultStore.ts:625-745, 1149-1163`
- **Repro Steps:** Import via `importVaultJson(json, 'merge')` or `'replace'` a save whose `lastSrsQuestCompletedISO`, `vocabMastery[id].lastReviewedISO`, or `lastPracticeISO` is `"not-a-date"` / `"2026-02-31"` over valid `"2026-11-23"`.
- **Closure Note:** Verified via `[BUG-S2-003]` (`bug-board-regressions.test.tsx`): invalid ISO dates fail both `'replace'` and `'merge'` imports, invalid dates already in `localStorage` sanitize cleanly on hydration without wiping valid saves, and `'merge'` preserves chronologically newer valid ISO timestamps.

#### BUG-S2-004 — Kid-Quarantined Co-Op credits XP to Adult active language instead of played base language
- **Status:** `VERIFIED_CLOSED` (`5305797` + `4dfe6f2`, merged `91e0871` / `0002cae`) | **Severity:** `P3` | **Owner:** `@julian-s2` / `@leo-s2` | **Reporter:** `devon-s2` (verified by `vera-s2`)
- **File / Line:** `src/store/useVaultStore.ts:1648-1700, 2371-2413`; `src/components/arcade/ArcadeHub.tsx:443-453`
- **Repro Steps:** Pair an Adult profile (`ebonics`, `lastBaseLanguage: 'fr'`) with `kid-leo` in 2P Co-Op, settle a Co-Op session, and inspect `languageProgress.fr.xpEarned` vs `languageProgress.ebonics.xpEarned`.
- **Closure Note:** Verified via `[BUG-S2-004]` (`bug-board-regressions.test.tsx`): Kid-Quarantined Co-Op credits XP solely to the played safe base language (`fr` / `es`) even if `'ebonics'` is passed, while two active Adult profiles settle to their Adult tracks cleanly.

#### BUG-S2-005 — Adult `Study Break` + `Remix` + `ON FIRE!` pills overflow `375x667` header and crush `.lesson-progress-track`
- **Status:** `VERIFIED_CLOSED` (`7f24e97`, merged `1b6637b`) | **Severity:** `P1` | **Owner:** `@liam-s2` | **Reporter:** `mila-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/lesson/LessonArena.tsx:717-816`; `src/styles/theme.css:1105-1145, 1267-1296`
- **Repro Steps:** At `375x667`, unlock After-Hours (`ebonics`) and open an active lesson / `Remix` with `Study Break` and `5/5` Hearts visible.
- **Closure Note:** Verified via `[BUG-S2-005]` (`bug-board-regressions.test.tsx`) and live Chrome at `375x667` (`hdrW: 375 === hdrScrollW: 375`, `trackW: 258`, `heartsLeft: 316, heartsRight: 365`, `shellH: 667 === shellScrollH: 667`, 1-tap `Study Break` cleanly exits Adult Mode — `vera-w2-bug005-adult-remix-375.png`).

#### BUG-S2-006 — Free-Recall `to_foreign` RTL `<input dir="rtl">` clips English placeholder on `375x667` (`ar`/`arz`) and truncates `vi`
- **Status:** `VERIFIED_CLOSED` (`7f24e97`, merged `1b6637b`) | **Severity:** `P2` | **Owner:** `@liam-s2` | **Reporter:** `mila-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/lesson/useFreeRecallInput.ts:52-109`; `src/components/lesson/WordBankView.tsx:527-572`; `src/components/lesson/BossGauntletView.tsx:703-746`; `src/styles/theme.css:1298-1307`
- **Repro Steps:** At `375x667`, open `ar`, `arz`, or `vi` `to_foreign` WordBank Free-Recall when empty, then enter Arabic text.
- **Closure Note:** Verified via `[BUG-S2-006]` (`bug-board-regressions.test.tsx`) and live Chrome `375x667` across `ar`, `arz`, and `vi` (`computedDirection: "ltr"`, `textAlign: "left"`, `"Type in Arabic or romanized"` / `"Type in Egyptian or romanized"` / `"Type in Vietnamese..."`, flipping `textAlign` to `"right"` upon typing `'مرحبا'`, `vera-w2-bug006-ar-placeholder-375.png`).

#### BUG-S2-007 — Rapid consecutive `VirtualScriptDrawer` / accent key taps drop the first inserted character
- **Status:** `VERIFIED_CLOSED` (`7f24e97`, merged `1b6637b`) | **Severity:** `P2` | **Owner:** `@liam-s2` | **Reporter:** `mila-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/lesson/useFreeRecallInput.ts:115-200`; `src/components/lesson/WordBankView.tsx:197-201`; `src/components/lesson/BossGauntletView.tsx`
- **Repro Steps:** Open `zh` Free-Recall (`"ab"`, caret at `1`) and click two `VirtualScriptDrawer` keys (`nǐ`, `hǎo`) synchronously in a single tick.
- **Closure Note:** Verified via `[BUG-S2-007]` across both `WordBankView` & `BossGauntletView` (`input.value === 'anǐhǎob'`, `selectionStart === 6`) and live Chrome `375x667` synchronous double-tap (`anǐhǎob`, `selStart: 6`).

#### BUG-S2-008 — `ELISION_PREFIX_RULES` omits Italian `gl'` (`bell'`, `anch'`, `ch'`) elision rules
- **Status:** `VERIFIED_CLOSED` (`3027c73`, merged `0b13695`) | **Severity:** `P2` | **Owner:** `@clara-s2` | **Reporter:** `mila-s2` (verified by `vera-s2`)
- **File / Line:** `src/curriculum/helpers.ts:67-289`
- **Repro Steps:** Call `lookupGlossaryEntry("gl'amici", itGlossary)` / `"Gl’amici!"` / `"anch'io"` / `"ch'è"` / `"bell'albero"` / `"bell'uomo"`.
- **Closure Note:** Verified via `[BUG-S2-008]` (`bug-board-regressions.test.tsx`) against `getCourseGlossary('it')` across straight and curly apostrophes.

#### BUG-S2-009 — Duplicate `Accent character bar` + `VirtualScriptDrawer` keys clip bottom drawer row on `375x667`
- **Status:** `VERIFIED_CLOSED` (`7f24e97`, merged `1b6637b`) | **Severity:** `P3` | **Owner:** `@liam-s2` | **Reporter:** `mila-s2` (verified by `vera-s2`)
- **File / Line:** `src/components/lesson/WordBankView.tsx:576-624`; `src/components/lesson/BossGauntletView.tsx:747-790`; `src/components/lesson/VirtualScriptDrawer.tsx:260-325`
- **Repro Steps:** At `375x667`, toggle `Script Keys` open and closed inside `zh` `to_foreign` Free-Recall.
- **Closure Note:** Verified via `[BUG-S2-009]` (`WordBankView` + `BossGauntletView`) and live Chrome `375x667` (`accentBarVisibleWhileOpen: false`, `stageClientH: 565 === stageScrollH: 565`, `drawerBottom: 491 <= footerTop: 609`, restored cleanly on collapse — `vera-w2-bug009-zh-drawer-375.png`).

#### BUG-S2-010 — Unfiltered `npx vitest run` picks up `src/curriculum/baseCoursesLoader.test.ts` and fails with `No test suite found`
- **Status:** `VERIFIED_CLOSED` (`fe7b783`) | **Severity:** `P1` | **Owner:** `@clara-s2` / `@coordinator` | **Reporter:** `vera-s2`
- **File / Line:** `vite.config.ts:122-127`
- **Repro Steps:** Run `npx vitest run` with no arguments.
- **Closure Note:** Verified via `[BUG-S2-010]` (`bug-board-regressions.test.tsx`) and unfiltered `npx vitest run` exiting `0` (`19 / 19` suites, `251 / 251` tests).

#### BUG-S2-011 — `ArcadeHub` Co-Op quarantine omits `adultModeActive` check across two Adult-unlocked profiles
- **Status:** `VERIFIED_CLOSED` (`4dfe6f2`, merged `0002cae`) | **Severity:** `P2` | **Owner:** `@leo-s2` | **Reporter:** `vera-s2`
- **File / Line:** `src/components/arcade/ArcadeHub.tsx:257-269, 315-325`; `src/components/arcade/arcadeShared.tsx:1284-1326`
- **Repro Steps:** Pair two Adult-unlocked profiles where P1 has `adultModeActive: false` (`'fr'`) and P2 has `adultModeActive: true` (`'suburban'`) in 2P Co-Op, play Turn 1, and inspect Turn 2 (`Taylor`).
- **Closure Note:** Verified via `[BUG-S2-011]` (`bug-board-regressions.test.tsx`) and live Chrome (`turnPill: "P2: Taylor"`, `hasSayItNormally: false`, `hasSuburbanBadge: false`).

---

# Operation Ironclad Atlas (Sprint 1 Archive) — Master Playtest Bug Board

Lead Quartermaster: **Vera (`vera-redteam`)**  
Scouts: **Mila (`mila-playtester`)**, **Devon (`devon-chaos`)**  
Test Suite: `tests/playtests/cohortA–E` (`PT-001`–`PT-100`) + `tests/playtests/bug-board-regressions.test.tsx` + Live Chromium Subpath Verification (`http://127.0.0.1:4173/wanderling-subpath/`)

> **Quarantine Rules:**  
> - Concrete Sprint 1 bugs only (`BUG-001`+). No scope creep: major architectural redesigns, Watchdog v2 (`PT-106`), code-splitting (`6.7 MB` bundle warning), and new modes live strictly in [sprint_2_proposals.md](./sprint_2_proposals.md).  
> - Failing `[PT-###]` regression checks remain failing until Phase 2 fixes land cleanly and Phase 3 Regression Lock passes 100%.

---

## Phase 3 Regression Lock Status

- **Phase Status:** `VERIFIED_CLOSED` (`0` open Sprint 1 bugs, `17 / 17` verified closed)
- **Playtest Scorecard:** `100 / 100` passing (`PT-001`–`PT-100`: Cohort A `32/32`, Cohort B `14/14`, Cohort C `27/27`, Cohort D `15/15`, Cohort E `12/12`)
- **Targeted Bug Board & Repo Regression Suites:**
  - `tests/playtests/bug-board-regressions.test.tsx`: `5 / 5 PASS` (`BUG-005`, `BUG-006`, `BUG-010`, `BUG-013`, `BUG-014` + `BUG-002` Shop cooldown)
  - `tests/multilang-polish-redteam.test.tsx`: `12 / 12 PASS`
  - `tests/ui-redteam.test.tsx`: `16 / 16 PASS` (post-`dc27282` hotfix); `11 / 11` repo baseline files `115 / 115 PASS` (pre-`dc27282` on `e77fd77`)
  - TypeScript: `npx --no-install tsc --noEmit` -> `0` errors
- **Post-Rebuild Live Chromium Verification (`http://127.0.0.1:4173/wanderling-subpath/`):** `1440x900`, `768x1024`, `375x667` -> `0` console errors, `0` page errors, `0` HTTP 4xx/5xx responses, `0` outer scroll overflow, `0` Unicode flags (`phase3-dark-map-cosmic.png`, `phase3-mobile-shop-fixed.png`, `phase3-mobile-bridge-ar-fixed.png`, `phase3-mobile-rtl-wordbank-fixed.png`, `phase3-offline-mashup-recovery.png`)

---

## Severity Summary

| Severity | Count | Closed | Open | Bug IDs |
| :--- | :---: | :---: | :---: | :--- |
| **P0 — Critical / Softlock / Unfair Loss** | 2 | 2 | 0 | `BUG-001`, `BUG-002` |
| **P1 — High / Contrast / Core Flow / Offline** | 4 | 4 | 0 | `BUG-003`, `BUG-004`, `BUG-005`, `BUG-006` |
| **P2 — Medium / Linguistics / State / Migration** | 6 | 6 | 0 | `BUG-007`, `BUG-008`, `BUG-009`, `BUG-010`, `BUG-011`, `BUG-012` |
| **P3 — Low / Polish / Leaks / Metadata** | 5 | 5 | 0 | `BUG-013`, `BUG-014`, `BUG-015`, `BUG-016`, `BUG-017` |

---

## Canonical Bug Register

### BUG-001 — TowerStackArcade symmetric sine glide causes scoop collision & IEEE-754 rounding coin-flip
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P0`
- **Owner:** `leo-arcade`
- **Fix Commit:** `57b499f` (`243e753`, `ironclad/leo-arcade`)
- **Playtests / Reporter:** `PT-053`–`PT-055` (`PT-101`) | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/arcade/TowerStackArcade.tsx:133-140, 204-210, 319-322`
- **Repro Steps:** Launch *Gelato & Pastry Tower*, click `Start Stacking!`, wait until target scoop reaches center (`x = 50%`), and click `Drop Scoop!`.
- **Expected vs Actual:** Expected target and distractor scoops on offset phases/lanes so the target passes `x = 50%` cleanly separated. Actual computes `xA = 50 + Math.sin(phase) * 29` and `xB = 50 + Math.sin(phase + Math.PI) * 29`, guaranteeing `|xA - 50| === |xB - 50|` (delta `< 1e-11`); both scoops overlap dead center, and `.sort((a, b) => Math.abs(a.x - 50) - Math.abs(b.x - 50))` picks the distractor ~47% of the time via IEEE-754 ULP rounding.
- **Regression Gate:** `tests/playtests/cohortC-arcade-matrix.test.tsx` (`[PT-053]`–`[PT-055]`) — `PASS`

### BUG-002 — Synchronous double-click races trigger `-2` heart loss, skipped exercises, un-keyed `Check`/`Continue` DOM reuse, blank-stage softlock & double shop spend
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P0`
- **Owner:** `liam-gameplay` & `liam-shop-hotfix`
- **Fix Commit:** `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`) + `dc27282` (`c73855b`, `ironclad/liam-shop-lock`)
- **Playtests / Reporter:** `PT-100` (`PT-102`) | `vera-redteam` & `devon-chaos`
- **File / Line:**
  - `src/components/lesson/LessonArena.tsx:318-341` (`advanceExercise`), `354-355` (`handleCheck`), `484-501` (`handleDiscoveryCollect`), `505-516` (`chestClaimed`), `1312-1341` (un-keyed `Continue`/`Check` footer buttons)
  - `src/components/lesson/BossGauntletView.tsx:276-343` (`handleCheckTurn`, `handleNextTurn`, `onComplete`)
  - `src/components/lesson/MiniStoryView.tsx:121-140` (`handleAdvance`)
  - `src/components/lesson/PairMatchRushView.tsx:448`
  - `src/components/meta/CompanionShop.tsx:59-93, 133-266, 498-513` (per-`actionKey` `350ms` cooldown lock + inventory/state-backed consumable button `key`s)
- **Repro Steps:**
  1. In `LessonArena`, select a wrong answer and double-click `Check` in the same frame -> hearts drop by `2` for `1` mistake; or double-click across two ticks -> un-keyed `Check` DOM node becomes `Continue` and click #2 immediately skips feedback.
  2. Double-click `Speak & Collect` -> skips next exercise; double-click `Continue` on penultimate exercise (`71%`) -> `exerciseIndex === exercises.length` renders blank `100%` softlock with only `X` exit and no completion rewards.
  3. Double-click `Buy Shield (45 Gems)` / `Buy Elixir (35 Gems)` / cosmetic buy or Boss `Send Reply!` / `Collect Boss Chest & Finish!` -> double gem deduction or duplicate turn callbacks.
- **Expected vs Actual:** Expected synchronous `useRef` action locks + distinct `key` props on `Check`/`Continue` & consumable buttons + idempotent per-`actionKey` cooldown across Lesson, Boss, Story, PairMatch, and Shop. Fixed cleanly with `useRef` turn/advance locks, `350ms` per-key Shop cooldown, and state-backed button keys.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-100]`) + `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-014]` stale-ref & cross-commit consumable double-click checks) — `PASS`

### BUG-003 — Dark-theme CEFR tier pills on `AdventureMap` render near-invisible contrast (`~1.01:1–1.15:1`)
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P1`
- **Owner:** `mateo-illustrator`
- **Fix Commit:** `ed62265` (`e09a6e3`, `ironclad/mateo-illustrator`)
- **Playtests / Reporter:** `PT-074`, `PT-076`, `PT-078`, `PT-079`, `PT-082`, `PT-085`, `PT-086`, `PT-088` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/components/map/AdventureMap.tsx:618-624` (pastel tints in `src/types/contracts.ts:742, 753, 763, 773, 782`)
- **Repro Steps:** Equip any dark palette (`theme_starlight_indigo`, `theme_cosmic_galaxy`, `theme_aurora_borealis`, `theme_royal_velvet`, `theme_emerald_rainforest`, `theme_neon_night_market`, `theme_laureate_imperial`) with `A2+` unlocked and view the CEFR tier strip on `AdventureMap`.
- **Expected vs Actual:** Expected dark ink (`#0F172A`) on pastel `meta.surfaceTint` (`#ECFDF5`, `#E0F2FE`, `#EDE9FE`, `#FEF3C7`, `#FCE7F3`) matching Lesson/Phrasebook/Shop pills. Actual set `color: 'var(--text-main, #0f172a)'`, resolving to near-white in dark palettes. Resolved with crisp `#0F172A` (`rgb(15, 23, 42)`) ink & jewel active pills.
- **Regression Gate:** `tests/playtests/cohortD-palettes-viewports.test.tsx` (`[PT-076]`, `[PT-078]`, `[PT-079]`, `[PT-082]`, `[PT-085]`, `[PT-086]`, `[PT-088]`) + Playwright `phase3-dark-map-cosmic.png` (`rgb(15, 23, 42)` verified) — `PASS`

### BUG-004 — Mandarin (`zh`) & Japanese (`ja`) Free-Recall Hint Bar rejects valid Pinyin/Romaji prefixes
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P1`
- **Owner:** `julian-architect`
- **Fix Commit:** `d325cba` (`2cc6bc1`, `ironclad/julian-architect`)
- **Playtests / Reporter:** `PT-019`, `PT-023`, `PT-024` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/core/hintEngine.ts:472-479` (consumed by `src/components/lesson/WordBankView.tsx:547`)
- **Repro Steps:** Switch to `zh` (`zh-u15-n2`) or `ja`, open a `to_foreign` WordBank, enable `Keyboard Free-Recall`, press `+ Hint` twice, and type valid Pinyin (`"Ma"`, `"Wan"`) or Romaji (`"Oya"`).
- **Expected vs Actual:** Expected romanized prefix recognition matching the prompt `"Type in Mandarin Chinese or romanized"`. Fixed romanized Latin-prefix branch against normalized `acceptedSentences` so Pinyin/Romaji prefixes advance cleanly without false `"Check word after prefix"` coaching errors.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-023]`, `[PT-024]`) — `PASS`

### BUG-005 — `StarlightBridgeArcade` vertically clips bottom choice planks on mobile (`375x667`) for Master RTL/CJK prompts
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P1`
- **Owner:** `leo-arcade`
- **Fix Commit:** `57b499f` (`243e753`, `ironclad/leo-arcade`)
- **Playtests / Reporter:** `PT-070`, `PT-103` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/arcade/StarlightBridgeArcade.tsx:970-1085`
- **Repro Steps:** At `375x667`, switch to `ar` or `zh`, pick `Master C1-C2`, and start *Starlight Bridge Cloze Builder*.
- **Expected vs Actual:** Expected all 4 bridge choice planks fully visible inside the `100dvh` card. Fixed with compact `maxHeight: 43%` + `overflowY: auto` on the Cloze prompt box and un-ellipsized instruction wrapping; verified live on `375x667` (`ar` and `zh` all 4 plank bottoms `<= 575px`, zero clipping).
- **Regression Gate:** `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-005]`) + `tests/playtests/cohortC-arcade-matrix.test.tsx` (`[PT-070]`) + Playwright `phase3-mobile-bridge-ar-fixed.png` — `PASS`

### BUG-006 — Offline PWA fails with HTTP `503` & infinite spinner when opening uncached After-Hours Mashup chunks
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P1`
- **Owner:** `hannah-platform` & `liam-gameplay`
- **Fix Commit:** `de6a105` (`522977a`, `ironclad/hannah-platform`) + `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-099`, `PT-104` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `public/sw.js` (`wanderling-cache-v7`), `src/components/shell/adultCurriculumSync.ts`, `src/App.tsx` (`AdultTrackLoadingCard`), `src/curriculum/adultRegistry.ts`
- **Repro Steps:** Load app twice online so `sw.js` controls scope, go offline, reload, unlock After-Hours (`7` taps), and pick an unvisited Mashup (`stoner_tactical`) whose lazy chunk was never fetched online.
- **Expected vs Actual:** Resolved by bumping `sw.js` precache to `wanderling-cache-v7` and wrapping dynamic Mashup hydration in `AdultTrackLoadingCard` offline error recovery (`OFFLINE FALLBACK` badge, `Retry Loading`, and `Return to Kid Atlas` exit).
- **Regression Gate:** `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-006]`) + `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-098]`, `[PT-099]`) + Playwright `phase3-offline-mashup-recovery.png` — `PASS`

### BUG-007 — Tap-to-Peek strips internal apostrophes (`fr`/`it`) & exposes Russian standalone `"—"` as clickable token
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `clara-linguist` & `liam-gameplay`
- **Fix Commit:** `8940ce8` (`7b91a37`, `ironclad/clara-linguist`) + `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-003`, `PT-006`, `PT-013` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/components/lesson/lessonHelpers.ts:22-23, 198-207`
- **Repro Steps:** Open Discovery cards containing Romance elisions (`fr-u1-c5` `"s'il"`, `fr-u2-c1` `"l'eau"`, `it-u1-c3` `"d’oro!"`, `it-u2-c1` `"l'acqua"`) or Russian em-dash (`ru-u1-c9` `"Моё имя — Пип."`), and tap those tokens.
- **Expected vs Actual:** Resolved with boundary-only punctuation stripping preserving internal apostrophes for glossary lookup and skipping standalone punctuation/em-dash tokens (`isClickable` false).
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-002]` `fr`, `[PT-004]` `it`, `[PT-013]` `ru`) — `PASS`

### BUG-008 — Duplicate / case-colliding distractor tiles in Egyptian Arabic & Portuguese WordBanks
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `clara-linguist`
- **Fix Commit:** `8940ce8` (`7b91a37`, `ironclad/clara-linguist`)
- **Playtests / Reporter:** `PT-005`, `PT-012` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:**
  - `src/curriculum/arzUnits9to16.ts:3540-3541` (`arz-u16-boss` turn `arz-u16-b2`: removed duplicate `'مع'` distractor)
  - `src/curriculum/pt.ts:2557-2558, 2631-2632` (`pt-u3-n3-e7`, `pt-u3-n4-e7`: replaced case-colliding distractors `'o'`/`'a'`)
- **Expected vs Actual:** Distractor tiles are now lexically distinct (even case-insensitively) from all `targetTokens` in the same exercise.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-005]`, `[PT-012]`) — `PASS`

### BUG-009 — Arabic (`ar`) ContextCloze splits bound proclitic `و` outside blank word
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `clara-linguist`
- **Fix Commit:** `8940ce8` (`7b91a37`, `ironclad/clara-linguist`)
- **Playtests / Reporter:** `PT-011` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/curriculum/arUnits9to16.ts:2948-2955` (`ar-u14-n4-cloze` and derived `ar-u14-n1/n2/n3-pool-cc-3`)
- **Repro Steps:** Open `ar-u14-n4` ContextCloze (`"يقوي السلام [______] روابط المجتمع بأسره."`).
- **Expected vs Actual:** Bound conjunction `و` now attaches directly inside `expectedBlank: 'والوئام'` (`sentenceBeforeBlank: 'يقوي السلام'`, choices prefixed cleanly). Test expectation synced in `tests/multilang-polish-redteam.test.tsx:209` (Option A approved `#34`).
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-011]`) + `tests/multilang-polish-redteam.test.tsx` — `PASS`

### BUG-010 — `FloatingPopToast` stack overlaps active Lesson card controls on mobile (`375x667`)
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `liam-gameplay`
- **Fix Commit:** `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-081` | `mila-playtester` (verified by `vera-redteam`)
- **File / Line:** `src/components/fx/JuiceEngine.tsx:123-138`, `src/components/lesson/LessonArena.tsx:166-171`
- **Repro Steps:** At `375x667`, quickly collect 2 Discovery stickers into a 3x Combo exercise.
- **Expected vs Actual:** Compact viewports now anchor a single `.is-compact` toast slot at `top: 10px`, leaving lesson header controls (`TRANSLATE TO...`, `+ Hint`, audio speed) completely unobstructed.
- **Regression Gate:** `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-010]`) + Playwright `phase3-mobile-rtl-wordbank-fixed.png` (`top: 10px`, 1 toast pill) — `PASS`

### BUG-011 — Tier Placement Checkpoints inflate `stats.lessonsCompleted`
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `julian-architect` & `liam-gameplay`
- **Fix Commit:** `d325cba` (`2cc6bc1`, `ironclad/julian-architect`) + `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-017`–`PT-032`, `PT-105` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/components/lesson/LessonArena.tsx:266-277, 290-294`, `src/store/useVaultStore.ts:1702-1734`
- **Repro Steps:** Complete `buildTierCheckpointNode('es', 'B1')` through `LessonArena`.
- **Expected vs Actual:** `completeMapNode` now receives `checkpointUnlock` atomically so `stats.checkpointsPassed === 1` without inflating `stats.lessonsCompleted`.
- **Regression Gate:** `tests/playtests/cohortA-base-campaigns.test.tsx` (`[PT-017]`–`[PT-032]`) — `PASS`

### BUG-012 — `importVaultJson` rejects sparse valid v1 saves before `normalizeProfile` backfills optional fields
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P2`
- **Owner:** `julian-architect`
- **Fix Commit:** `d325cba` (`2cc6bc1`, `ironclad/julian-architect`)
- **Playtests / Reporter:** `PT-094`, `PT-107` | `devon-chaos` (verified by `vera-redteam`)
- **File / Line:** `src/store/useVaultStore.ts:470-537` (`validateProfile`)
- **Repro Steps:** Call `importVaultJson` on a `schemaVersion: 1` save with valid required fields (`id`, `name`, `languageProgress`) omitting optional fields (`avatarId`, `gems`, `stats`).
- **Expected vs Actual:** `validateProfile` now safely allows optional v1 fields so `normalizeProfile` backfills defaults losslessly during legacy save migration.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-094]`) — `PASS`

### BUG-013 — RTL `WordBankTray` places `"Preview:"` label at visual left (end) of Arabic reading line
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P3`
- **Owner:** `liam-gameplay`
- **Fix Commit:** `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-045`, `PT-046`, `PT-078` | `mila-playtester` & `vera-redteam`
- **File / Line:** `src/components/lesson/WordBankTray.tsx:186-215`
- **Repro Steps:** Assemble tiles in an `ar` or `arz` `to_foreign` WordBank (`ar-u1-n1` / `ar-u15-n2`) to show the preview line.
- **Expected vs Actual:** Preview container sets `dir={dir}` and `textAlign: dir === 'rtl' ? 'right' : 'left'`, isolating `"Preview:"` in `<bdi dir="ltr">` at the RTL start (`left: 288px, right: 339px` on `375x667`) while Arabic words flow cleanly leftward (`left: 220px, right: 285px`).
- **Regression Gate:** `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-013]`) + `tests/playtests/cohortB-adult-quarantine.test.tsx` (`[PT-045]`) + Playwright `phase3-mobile-rtl-wordbank-fixed.png` — `PASS`

### BUG-014 — Mobile Gem Shop horizontal pedestal slices Streak Freeze card + CTA pill contrast below WCAG AA
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P3`
- **Owner:** `liam-gameplay` & `liam-shop-hotfix`
- **Fix Commit:** `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`) + `dc27282` (`c73855b`, `ironclad/liam-shop-lock`)
- **Playtests / Reporter:** `PT-085` | `mila-playtester` (verified in `src/styles/theme.css:1299-1304`)
- **File / Line:** `src/styles/theme.css:1299-1304`, `src/components/meta/CompanionShop.tsx`
- **Repro Steps:** Open Gem Shop at `375x667` (`phase3-mobile-shop-fixed.png`) and measure contrast on emerald/amber/indigo/rose CTA pills.
- **Expected vs Actual:** `.shop-pedestal-col` stacks vertically (`overflow: visible`, `flex-direction: column`) with `Buy Shield (45 Gems)` unclipped inside `375px` (`clipRight: false`), darkened WCAG AA CTA buttons (`>= 4.5:1`), and hardened consumable purchase locks.
- **Regression Gate:** `tests/playtests/bug-board-regressions.test.tsx` (`[BUG-014]`) + Playwright `phase3-mobile-shop-fixed.png` — `PASS`

### BUG-015 — `TargetPromptBar` `Say It Normally` toggle (`plainOpen`) stays open across Arcade target changes
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P3`
- **Owner:** `leo-arcade`
- **Fix Commit:** `57b499f` (`243e753`, `ironclad/leo-arcade`)
- **Playtests / Reporter:** `PT-047`–`PT-073`, `PT-108` | `devon-chaos` (verified in `src/components/arcade/arcadeShared.tsx:1849-1878`)
- **File / Line:** `src/components/arcade/arcadeShared.tsx:1849-1878`
- **Repro Steps:** Expand `Say It Normally` in Adult Mode Arcade cabinets, clear the round, and advance to the next target.
- **Expected vs Actual:** `TargetPromptBar` now resets `plainOpen` to `false` on `targetItem.id` changes consistently across all Arcade cabinets.
- **Regression Gate:** `tests/playtests/cohortB-adult-quarantine.test.tsx` (`[PT-033]`) + `tests/playtests/cohortC-arcade-matrix.test.tsx` — `PASS`

### BUG-016 — Uncleaned `window.setTimeout` handles on unmount in `LessonArena.tsx` & `PairMatchRushView.tsx`
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P3`
- **Owner:** `liam-gameplay`
- **Fix Commit:** `e77fd77` (`1a6ffa0`, `ironclad/liam-gameplay`)
- **Playtests / Reporter:** `PT-109` | `devon-chaos` (verified in `src/components/lesson/PairMatchRushView.tsx:107-111`, `src/components/lesson/LessonArena.tsx:169, 176-177`)
- **File / Line:** `src/components/lesson/LessonArena.tsx`; `src/components/lesson/PairMatchRushView.tsx`
- **Repro Steps:** Trigger confetti burst in `LessonArena` or mismatch shake in `PairMatchRushView`, then unmount immediately before timeout expiry (`420ms`).
- **Expected vs Actual:** Both views now store and clear timeout handles in unmount cleanup effects with zero stale post-unmount state updates.
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-100]`) — `PASS`

### BUG-017 — Stale `"4-language"` metadata in `package.json` & `DESIGN.md`
- **Status:** `VERIFIED_CLOSED`
- **Severity:** `P3`
- **Owner:** `hannah-platform` & `coordinator`
- **Fix Commit:** `e6075f0` (`package.json`) + `de6a105` (`522977a`, `ironclad/hannah-platform`)
- **Playtests / Reporter:** `PT-110` | `devon-chaos` & `vera-redteam`
- **File / Line:** `package.json:6`; `DESIGN.md`; `README.md`
- **Expected vs Actual:** Root metadata, design overview, and README all accurately describe all 16 living languages (+ 7 After-Hours Atlas tracks).
- **Regression Gate:** `tests/playtests/cohortE-chaos-vault-pwa.test.tsx` (`[PT-098]`) — `PASS`

---

## Contract Guardrail Note (`src/types/contracts.ts`)
- Zero breaking edits to `src/types/contracts.ts` were required to resolve and close `BUG-001`–`BUG-017`.
- `SpeechOutcome` contract & `4500ms` hung-utterance watchdog behavior (`PT-106`, locked by `tests/adult-easter-egg.test.tsx:1165` and `tests/speech-audio.test.ts:242`) remain intact for Sprint 1 and queued in [sprint_2_proposals.md](./sprint_2_proposals.md) (`S2-004`).
