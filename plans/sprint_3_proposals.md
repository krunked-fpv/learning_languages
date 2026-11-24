# Studio Wanderling — Sprint 3 Proposals (`Operation Aurora Pact`)

**Sprint Status:** `SHIPPED & VERIFIED` (`S3-001`–`S3-006` shipped & verified; `265 / 265` tests across `20 / 20` suites including `PT-001`–`PT-125` and `BUG-S3-001`–`BUG-S3-004` regression gates pass; `0` open Sprint 3 bugs)  
**Curator:** Coordinator & **Vera (`vera-s3`)**  
**Origin:** Promoted from Sprint 2 Playtest Scouts (`devon-s2`, `mila-s2`, `vera-s2`) in [sprint_2_proposals.md](./sprint_2_proposals.md).

---

### S3-001 — Safe Atlas Masking in `TopHud` During Kid-Quarantined 2P Co-Op (`SHIPPED & VERIFIED`)
- **Priority:** `P2` | **Owners:** `leo-s3`, `liam-s3`, `leo-s3-fix` (`BUG-S3-001`)
- **Summary:** Emit `CoopSafeAtlasMask` (`{ active, safeLanguage }`) from `ArcadeHub` into `App.tsx` and `TopHud` whenever 2P Family Co-Op is active and Kid-Quarantined, replacing any Adult `TopHud` language badge with `Family Co-Op Safe Atlas`, auto-closing the language popover, hiding `return-to-kid-atlas-btn`, and masking root/BottomNav theme accent metadata to the safe base language.

### S3-002 — Pre-Warm Co-Op Base Language Chunks on Handoff, Offline Retry Guard & Family Pair Streaks (`SHIPPED & VERIFIED`)
- **Priority:** `P2` | **Owners:** `julian-s3`, `leo-s3`
- **Summary:** Pre-warm BOTH `p1` and `p2` safe base chunks on Co-Op setup, add offline lazy-chunk load error recovery (`Retry Loading` / `Use Safe Español Deck`) on both the Co-Op selector and `"Pass Console to [Player 2]!"` handoff card, persist sorted-pair `coopPairStreaks` in `wanderling.vault.v1`, and display Pair Streak & credited languages in Co-Op Hub & Finale.

### S3-003 — Strict Vault Date Validation, Credited Language Summary & Live Partner Edit/Import Sync (`SHIPPED & VERIFIED`)
- **Priority:** `P2` | **Owners:** `julian-s3`, `leo-s3`, `leo-s3-fix` (`BUG-S3-001`), `julian-s3-fix` (`BUG-S3-002`)
- **Summary:** Extend strict `isValidISODateString` and profile-ID checks across `coopPairStreaks`, JSON export envelope dates (`exportedAt`/`exportedAtISO`), and `createdAtISO` on import/hydration; return `playerOneCreditedLanguage`/`playerTwoCreditedLanguage` in `CoopArcadeSessionSummary`; sync active `coopMatch` metadata and remount `turnKey` live if partners are edited/disarmed/deleted mid-match.

### S3-004 — Unified Compact Script Strip for `<640px` Mobile Free-Recall (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owners:** `liam-s3`
- **Summary:** Unify `[aria-label="Accent character bar"]` + `[data-testid="virtual-script-drawer-toggle"]` into a single horizontal no-wrap strip (`<= 38px` tall) on `<640px` when collapsed, deduplicate keys in `VirtualScriptDrawer`, and replace the strip seamlessly with the expanded drawer grid inside `100dvh` with zero nested vertical scrollbar stack.

### S3-005 — Pinyin Tone-Number Input (`ni3 hao3`) & Arabic Hamza/Ayn Optionality Note (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owners:** `julian-s3`, `liam-s3`, `julian-s3-fix` / `liam-s3-fix` (`BUG-S3-003`)
- **Summary:** Convert and grade numeric Pinyin (`ni3 hao3` -> `nǐ hǎo`, `nv3`/`lu:4` -> `nǚ`/`lǜ`, ignoring optional Pinyin syllable apostrophes in exact tone grading) in `src/core/grader.ts` + `hintEngine.ts`, surface live `"Pinyin tones: ..."` preview in `WordBankView` / `BossGauntletView` / `FreeRecallHintBar`, guard empty `highlightedChars` in `LessonArena`, and add a compact QWERTY Arabic hamza/vowel optionality tip on `ar` / `arz` Free-Recall.

### S3-006 — Friendly `"Parent"` Default Name & 1-Tap Prior Kid Restore on `Study Break` (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owners:** `julian-s3`, `liam-s3`, `liam-s3-fix` (`BUG-S3-004`)
- **Summary:** Default secondary Adult profile name/placeholder from `'After-Hours'` to `'Parent'`, record `lastKidProfileId` when transitioning from a kid profile into an Adult profile, add opt-in `restoreKidProfileOnStudyBreak` toggle in `ProfileVaultModal` (preserving legacy `setAdultModeActive(false)` behavior when disabled), provide 1-tap `Switch back to [KidName]` recovery, and deepen `theme_emerald_rainforest` selected tile background contrast (`5.99:1` AA).

---

## Sprint 4 Backlog Proposals (`S4-###`)

Ranked non-bug enhancements discovered during Sprint 3 (`PT-001`–`PT-125`) by `devon-s3` and `mila-s3` (curated by `vera-s3`):

1. **`S4-002` — Mobile Co-Op Safe Atlas Pill Label & Compact Roster Fit (`375x667`):**
   - **Priority:** `P2` | **Origin:** `devon-s3` & `mila-s3`
   - **Scope:** Show a compact `"Safe Co-Op"` label inside `tophud-coop-safe-atlas-badge` on `<640px` (currently flag-only via `.hud-hide-xs`), and tighten `arcade-coop-roster-bar` + `coop-pair-streak-badge` vertical height on `375x667` (and `Install App` wrap) so Page 1 cabinet launch buttons stay cleanly above the fold.
2. **`S4-001` — PIN-Lock or Mask Adult Track Metadata Inside `ProfileVaultModal` During Quarantined Co-Op:**
   - **Priority:** `P2` | **Origin:** `devon-s3`
   - **Scope:** When `coopSafeMask.active` is `true`, mask or require parent confirmation before exposing Adult track labels (`AAVE / Ebonics`, `Study Break`) inside `ProfileVaultModal`.
3. **`S4-003` — Space-Insensitive Multi-Syllable Numeric Pinyin Matching (`"ni3hao3"` vs `"Nǐ hǎo!"`):**
   - **Priority:** `P3` | **Origin:** `devon-s3`
   - **Scope:** Support unspaced multi-syllable numeric Pinyin runs (`"ni3hao3"`) against multi-word canonical targets (`"Nǐ hǎo!"`) across `hintEngine` and `grader`.
4. **`S4-004` — Offline Handoff `"Mini Offline Deck"` Guard Indicator:**
   - **Priority:** `P3` | **Origin:** `devon-s3`
   - **Scope:** Surface a clear `"Mini Offline Deck"` notice (or guard `Start [P2]'s Turn!`) on `arcade-coop-handoff` whenever `coop-handoff-offline-guard` is active so players do not unknowingly enter the static 12-item fallback lexicon.
5. **`S4-005` — Multi-Line `FreeRecallHintBar` Tone Coaching Radius & Tap-to-Apply Preview Chip:**
   - **Priority:** `P3` | **Origin:** `mila-s3`
   - **Scope:** Use `borderRadius: 12` instead of `999` on `free-recall-tone-coaching` when wrapping onto 2+ lines at `375x667`, and add an optional tap-to-apply chip on `pinyin-tone-number-preview`.
6. **`S4-006` — Scrollable Mobile Adult Footer Inside `ProfileVaultModal` (`<=640px`):**
   - **Priority:** `P3` | **Origin:** `mila-s3`
   - **Scope:** On `<=640px`, fold the unlocked Adult footer (`Enter After-Hours Atlas`, `Switch back to [Kid]`, Study Break toggle) into the scroll pane or a compact collapsible strip so more of `Pack & Boosters` stays visible without scrolling.
