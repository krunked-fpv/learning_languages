# Studio Wanderling — Operation Ironclad Atlas Playtest Bug Board

**Sprint:** Operation Ironclad Atlas (Sprint 1 Bug Sweep)
**Scope:** 100 Front-to-Back Playtests (`PT-001`–`PT-100`) across Base Languages, After-Hours Atlas & Kid Quarantine, 9 Arcade Mini-Games × 3 Tiers, 15 Palettes × 3 Viewports, and Chaos/Save Vault/Offline PWA.

## Studio Guardrails
1. Strictly relative subpath PWA (`base: './'`) — zero root-relative paths.
2. 100% offline self-contained bundle — zero external URLs or runtime `fetch()`, binary RGBA PNG icons, bundled WOFF2 fonts.
3. Zero Unicode country flag emojis (`U+1F1E6`–`U+1F1FF`) anywhere in `src/`, `public/`, `index.html`, `tests/`, or `README.md`.
4. Save Vault sanctity (`wanderling.vault.v1`) — lossless hydration/migration/import/export and last-profile deletion guard.
5. Zero-scroll `100dvh` console across `1440x900`, `768x1024`, and `375x667`, across all 15 palettes.
6. Base-game kid-safety sanctity (`0` Adult Mode leakage) & zero-stall audio (`4500ms` watchdog + marimba fallback).

## Sprint Summary Metrics
- **Total Playtests Executed:** `0 / 100`
- **Playtests Passing (`PT-001`–`PT-100`):** `0 / 100`
- **Open Bugs (`OPEN` / `IN_PROGRESS` / `FIXED`):** `0`
- **Verified Closed (`VERIFIED_CLOSED`):** `0`

---

## Cohort Execution Ledger (`PT-001`–`PT-100`)
- **Cohort A (`PT-001`–`PT-032`):** Full `A1->C2` Base-Language Campaign Traversals (16 Languages × 2 Archetypes) — *Pending*
- **Cohort B (`PT-033`–`PT-046`):** After-Hours Atlas Front-to-Back, Kid-Safety Quarantine & RTL Deep-Dives — *Pending*
- **Cohort C (`PT-047`–`PT-073`):** 9 Arcade Mini-Games × 3 Tiers (`sprout`, `voyager`, `master`) — *Pending*
- **Cohort D (`PT-074`–`PT-088`):** 15 Palettes × 3 Viewports (`1440x900`, `768x1024`, `375x667`) Subpath Browser Matrix — *Pending*
- **Cohort E (`PT-089`–`PT-100`):** Chaos, Resilience, Save Vault & Offline PWA — *Pending*

---

## Canonical Bug Table

| Bug ID | Playtest ID(s) | Severity | Owner | Status | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| _None logged yet_ | — | — | — | — | *Scouts and QA lead will populate during Phase 1 blitz* |

---

## Detailed Bug Repros & Fix Records

<!-- Template for each confirmed Sprint 1 bug:
### BUG-### — <Concise Title>
- **Playtest ID(s):** `PT-###`
- **Severity:** `P0` | `P1` | `P2` | `P3`
- **Owner:** `<specialist-swarm-name>`
- **Status:** `OPEN` | `IN_PROGRESS` | `FIXED` | `VERIFIED_CLOSED`
- **Repro & Root Cause:** <exact file, line, steps to reproduce, expected vs actual behavior>
- **Fix & Regression Test:** <specialist branch/commit, root fix summary, Vitest regression test name/file>
-->
