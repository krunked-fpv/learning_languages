# Studio Wanderling — Sprint 2 Proposals (RFCs) — SHIPPED & VERIFIED

**Sprint Status:** **SHIPPED & VERIFIED (`Operation Starlight Horizon`, Sprint 2)** — All `7` RFCs (`S2-001`–`S2-007`) shipped, `19/19` Vitest suites (`251/251` tests, `115/115` playtests `PT-001`–`PT-115`), `11/11` `BUG-S2-###` verified closed, `0` TS/console/HTTP errors.
Curator: **Vera (`vera-redteam` / `vera-s2`)**
Contributors: **Mila (`mila-playtester`)**, **Devon (`devon-chaos`)**, Coordinator Guidance (`#7`, `#77`)

> **Release Gate Met:** All 7 Sprint 2 RFCs (`S2-001`–`S2-007`) are shipped & verified across `115`-playtest verification (`PT-001`–`PT-115`), live `/wanderling-subpath/` browser audits, and Sprint 2 Bug Board closure (`0` open `BUG-S2-###`).

---

### S2-001 — Per-Language & Course Data Dynamic Code-Splitting (Eliminate 6.7 MB Base Bundle) — `SHIPPED & VERIFIED`
- **Title:** Dynamic Per-Language & Unit Curriculum Chunking
- **Triggered By:** Vite production build warning (`index` base bundle `~6.7 MB`) + PWA precache footprint analysis (`PT-098`, `PT-104`)
- **Player Value & Comedy/Learning Upside:** Slashes first-load time on mobile tablets by loading only the player's active language (`es` by default) + background-prefetching unlocked lands, making offline PWA installs tiny and snappy for kids on school/family Wi-Fi.
- **Proposed Scope & Architecture Impact:** Mirror the lazy `import()` pattern used in `src/curriculum/adultRegistry.ts` for the 16 base languages (`COURSES` registry hydration + React suspense/fallback helper in `src/curriculum/index.ts`), plus automatic build-time SW asset manifest injection.
- **Specialists Needed:** `julian-architect`, `hannah-platform`
- **Effort / Risk:** `L` / `M`
- **Recommended Priority:** `P1`

---

### S2-002 — Romanized Pinyin & Romaji Free-Recall Hint Engine v2 — `SHIPPED & VERIFIED`
- **Title:** Multi-Script Romanized Free-Recall Prefix & Tone Coaching Engine
- **Triggered By:** `BUG-004` (`PT-019` — `zh`/`ja` valid Pinyin/Romaji inputs fail grapheme prefix comparison against Hanzi/Kana while showing tone bar)
- **Player Value & Comedy/Learning Upside:** Unlocks joyful typing practice for learners on standard QWERTY keyboards across Mandarin (`zh`), Japanese (`ja`), Hindi/Bengali, Arabic/Egyptian Arabic, and Russian without requiring OS IME installation.
- **Proposed Scope & Architecture Impact:** Extend `resolveFreeRecallHint` in `src/core/hintEngine.ts` and `FreeRecallHintBar` to detect Latin script input when `usesSpaces === false`, match against normalized `acceptedSentences` romanized candidates, show word/syllable-aware ghost previews, and award partial tone coaching.
- **Specialists Needed:** `liam-gameplay`, `clara-linguist`, `marcus-lexicographer`
- **Effort / Risk:** `M` / `M`
- **Recommended Priority:** `P1`

---

### S2-003 — Full-Asset PWA Precache Manifest & Offline Dynamic Chunk Recovery — `SHIPPED & VERIFIED`
- **Title:** Build-Generated SW Precache Manifest + Offline Chunk Resilience
- **Triggered By:** `BUG-006` (`PT-104` — HTTP `503` & permanent spinner when launching unvisited After-Hours chunks offline)
- **Player Value & Comedy/Learning Upside:** Guarantees zero-wifi airplane/car-ride reliability for every language land and After-Hours Mashup once installed.
- **Proposed Scope & Architecture Impact:** Emit a generated `dist/sw-precache-manifest.json` (or inject Vite build chunks into `public/sw.js` during `vite build`), add runtime cache-on-install toggles for downloaded tracks, and add an offline error + "Return to Kid Atlas" fallback card in `AdultTrackLoadingCard` (`src/components/shell/adultCurriculumSync.ts`).
- **Specialists Needed:** `hannah-platform`, `julian-architect`
- **Effort / Risk:** `M` / `S`
- **Recommended Priority:** `P1`

---

### S2-004 — Watchdog-Triggered Marimba Phonetic Rescue & `SpeechOutcome` v2 — `SHIPPED & VERIFIED`
- **Title:** Audio Watchdog Phonetic Cadence Rescue (`SpeechOutcome` v2)
- **Triggered By:** `PT-106` (`src/audio/speechEngine.ts:70, 584-588` silently resolves at `4500ms` with `{ usedNativeVoice: true }` due to locked v1 unit-test contracts at `tests/adult-easter-egg.test.tsx:1165` and `tests/speech-audio.test.ts:242`)
- **Player Value & Comedy/Learning Upside:** When stripped Android/Chromebook browsers silently hang inside `speechSynthesis.speak`, learners automatically receive rhythmic marimba syllable playback + visual phonetic cue instead of awkward 4.5-second silence.
- **Proposed Scope & Architecture Impact:** Evolve `SpeechOutcome` with `watchdogTriggered: boolean`, trigger `playPhoneticCadence` fallback upon `4500ms` stall, surface a subtle toast explaining phonetic mode, and update `tests/speech-audio.test.ts` + `tests/adult-easter-egg.test.tsx` in lockstep.
- **Specialists Needed:** `nadia-audio`, `liam-gameplay`
- **Effort / Risk:** `M` / `M`
- **Recommended Priority:** `P2`

---

### S2-005 — Mid-Lesson 1-Tap Study Break Panic Switch (After-Hours Atlas) — `SHIPPED & VERIFIED`
- **Title:** In-Lesson 1-Tap Study Break Panic Button
- **Triggered By:** Observation in Cohort B (`TopHud` with `Return to Kid Atlas` is hidden while `LessonArena` is active, leaving no 1-tap mid-lesson escape)
- **Player Value & Comedy/Learning Upside:** Preserves instant, hilarious stealth recovery even in the middle of an After-Hours boss battle or lesson screen—one tap swaps straight back to the kid's `lastBaseLanguage` Adventure Map cleanly.
- **Proposed Scope & Architecture Impact:** Mount a compact optional panic pill in `LessonArena`'s top header bar whenever `isAdultLanguage(language)`, cleanly cancelling active speech timers (`stopSpeech()`), resetting arena state, and invoking `vaultActions.disarmAdultToBaseLanguage()`.
- **Specialists Needed:** `liam-gameplay`, `tessa-satirist`
- **Effort / Risk:** `S` / `S`
- **Recommended Priority:** `P2`

---

### S2-006 — Elision & Proclitic-Aware Multi-Script Tokenizer + Virtual IME Drawer — `SHIPPED & VERIFIED`
- **Title:** Clitic-Aware Tap-to-Peek/Cloze Engine & On-Screen Script Drawer
- **Triggered By:** `BUG-007` (`fr`/`it` apostrophe elisions & `ru` em-dash) & `BUG-009` (`ar` proclitic `و`) + learner typing friction across `zh`/`ja`/`ar`/`hi`/`bn`/`ru`
- **Player Value & Comedy/Learning Upside:** Gives learners effortless single-tap glosses on contractions/proclitics and an interactive mini Kana/Pinyin/Arabic/Devanagari picker drawer for Free-Recall challenges without memorizing OS keyboard layouts.
- **Proposed Scope & Architecture Impact:** Upgrade `lessonHelpers.ts` tokenizer + `ContextClozeView` prefix attachment support + expandable character drawer integrated alongside `LANGUAGE_META[lang].helperAccents`.
- **Specialists Needed:** `clara-linguist`, `marcus-lexicographer`, `liam-gameplay`
- **Effort / Risk:** `L` / `M`
- **Recommended Priority:** `P2`

---

### S2-007 — Spaced-Repetition Review Quests & Dual-Player Family Co-Op Arcade — `SHIPPED & VERIFIED`
- **Title:** Adaptive SRS Decay Quests + Pass-and-Play Family Arcade Battles
- **Triggered By:** Phrasebook (`2,400+` stickers across `16` languages) + *Family Show-Off Mode* + `9`-cabinet Arcade engagement observations
- **Player Value & Comedy/Learning Upside:** Gives parents and siblings a hilarious couch co-op quiz/arcade challenge using unlocked Phrasebook stickers while keeping weak words warm through spaced-repetition mini-quests.
- **Proposed Scope & Architecture Impact:** Track `lastReviewedAt` / mastery strength per `vocabId` inside `LanguageProgress`, surface daily SRS quest nodes on `AdventureMap`, and add a 2-profile turn-based scoreboard mode inside `ArcadeHub`.
- **Specialists Needed:** `julian-architect`, `leo-arcade`, `mateo-illustrator`
- **Effort / Risk:** `L` / `M`
- **Recommended Priority:** `P3`

---

## Sprint 3 Backlog Proposals (`S3-001`–`S3-006`) — `PROMOTED TO SPRINT 3`

Promoted into [sprint_3_proposals.md](./sprint_3_proposals.md) (`Operation Aurora Pact`) and curated from Sprint 2 Wave 2 playtesting (`vera-s2`, `devon-s2`, `mila-s2`):

### S3-001 — Safe Atlas Masking in `TopHud` During Kid-Quarantined 2P Co-Op
- **Triggered By:** Co-Op quarantine audit (`devon-s2` #64)
- **Proposal:** Mask/replace any Adult `TopHud` language badge (`TopHud.tsx:160-164, 657-689`) with `"Family Co-Op Safe Atlas"` whenever Kid-Quarantined 2P Co-Op is active so adult track names never appear above a kid-safe board.
- **Specialists Needed:** `@liam-s2`, `@leo-s2` | **Priority:** `P2`

### S3-002 — Pre-Warm Co-Op Base Language Chunks on Handoff + Family Pair Streaks
- **Triggered By:** `BUG-S2-001` lazy-chunk audit (`devon-s2` #64)
- **Proposal:** Pre-warm both P1 & P2 base language chunks when Co-Op starts (with offline Retry guard on Handoff) and celebrate recurring Family Co-Op pair streaks.
- **Specialists Needed:** `@leo-s2`, `@julian-s2` | **Priority:** `P2`

### S3-003 — Strict Vault Date Validation, Co-Op Language Attribution & Partner Delete Guard
- **Triggered By:** `BUG-S2-002`, `BUG-S2-003`, `BUG-S2-004` (`devon-s2` #64)
- **Proposal:** Validate ISO dates strictly (`Number.isFinite(Date.parse(...))`) in `validateVault`, cancel stale `coopMatch` if either partner is deleted/edited mid-match, and attribute Co-Op XP to the turn's played safe language.
- **Specialists Needed:** `@julian-s2`, `@leo-s2` | **Priority:** `P2`

### S3-004 — Unified Compact Script Strip for `<640px` Mobile Free-Recall
- **Triggered By:** `BUG-S2-009` (`mila-s2` #65)
- **Proposal:** Consolidate `helperAccents` and `VirtualScriptDrawer` into a single compact expandable script strip on `<640px` viewports to eliminate duplicate Pinyin/Arabic keys and triple-nested scrollbars.
- **Specialists Needed:** `@liam-s2`, `@mateo-s2` | **Priority:** `P3`

### S3-005 — Pinyin Tone-Number Input (`ni3 hao3`) & Arabic Hamza/Ayn Optionality Note
- **Triggered By:** Multi-script typing UX sweep (`mila-s2` #65)
- **Proposal:** Accept numeric tone notation (`ni3 hao3` -> `nǐ hǎo`) in Free-Recall Pinyin mode and show a one-line optionality hint for Arabic hamza/ayn keys on QWERTY keyboards.
- **Specialists Needed:** `@julian-s2`, `@clara-s2` | **Priority:** `P3`

### S3-006 — Friendly Default Adult Profile Naming & 1-Tap Profile Restore on `Study Break`
- **Triggered By:** After-Hours UX sweep (`mila-s2` #65)
- **Proposal:** Default secondary Adult profile name to `"Parent"` (instead of `"After-Hours"`) and optionally restore the prior kid profile on `Study Break` so `"After-Hours"` does not linger in `TopHud`.
- **Specialists Needed:** `@julian-s2`, `@liam-s2` | **Priority:** `P3`
