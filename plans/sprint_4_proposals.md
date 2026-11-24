# Studio Wanderling — Sprint 4 Proposals (`Operation Celestial Summit`)

**Sprint Status:** `SHIPPED & VERIFIED` (`S4-001`–`S4-006` shipped & verified on `main @ 49fc736`; `281 / 281` tests across `21 / 21` suites including `PT-001`–`PT-135` and `BUG-S4-001`–`BUG-S4-006` regression gates pass; `0` open Sprint 4 bugs in [playtest_bug_board.md](./playtest_bug_board.md))  
**Curator:** Coordinator & **Vera (`vera-s4` / `vera-s4-close`)**  
**Origin:** Promoted from Sprint 3 Playtest Scouts (`devon-s3`, `mila-s3`, `vera-s3`) in [sprint_3_proposals.md](./sprint_3_proposals.md).

---

### S4-001 — Mask & Parent-Gate Adult Track Metadata in `ProfileVaultModal` During Quarantined Co-Op (`SHIPPED & VERIFIED`)
- **Priority:** `P2` | **Owners:** `liam-s4`, `liam-s4-fix` (`BUG-S4-001` `bb1190e` / `49fc736`)
- **Summary:** Thread `coopSafeMask` from `App.tsx` into `ProfileVaultModal`; while `coopSafeMask.active` is `true` and Parent override is locked, mask Adult active languages on Explorer cards, suppress 7-tap/keycode/new-explorer unlock triggers, hide After-Hours re-entry/toggle controls behind a kid-safe banner (`profile-modal-coop-safe-mask`), provide a 18+ `Parent Controls (18+)` confirmation gate for parents, and block masked `adultModeActive: true` card switches and `replace`/`merge` JSON imports behind `profile-modal-parent-gate` with kid-safe feedback.

### S4-002 — Mobile `Safe Atlas` Pill Label & Above-the-Fold `375x667` Co-Op Fit (`SHIPPED & VERIFIED`)
- **Priority:** `P2` | **Owners:** `leo-s4`, `liam-s4`, `leo-s4-fix` (`BUG-S4-004` `39ed076` / `f885768`)
- **Summary:** Keep full `Family Co-Op Safe Atlas` text for desktop/Screen Readers while displaying a crisp visible `Safe Atlas` label on `<640px` `tophud-coop-safe-atlas-badge`, tighten mobile `TopHud` padding + `Install App` wrap, and compact the `ArcadeHub` Co-Op roster bar & Pair Streak badge on `375x667` with `gridAutoRows: 'minmax(118px, auto)'`, `lineHeight: 1.18`, and `.console-scroll-pane` scroll so Page-1 cabinet launch buttons and `"Constellation Memory Twins"` render unclipped with or without the offline guard.

### S4-003 — Space-Insensitive Multi-Syllable Numeric & Romanized Pinyin Matching (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owner:** `julian-s4` (`b651cfb` / `c3cebb0`)
- **Summary:** Support unspaced multi-syllable Mandarin numeric/romanized Pinyin inputs (`"ni3hao3"`, `"wo3de5ming2zi5jiao4Ma3te4'ao4"`, `"ni2hao3"`) against multi-word canonical targets (`"Nǐ hǎo!"`, `"Wǒ de míngzi jiào Mǎtèào."`) across `grader.ts` (preserving exact/tone-forgiving `heartPenalty: 0`) and `hintEngine.ts` (compact prefix alignment & tone coaching without false `hasWrongSuffix`).

### S4-004 — Offline Handoff `"Mini Offline Deck"` Guard Indicator (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owners:** `leo-s4`, `liam-s4-fix` (`BUG-S4-002` `bb1190e` / `49fc736`), `leo-s4-fix` (`BUG-S4-003`, `BUG-S4-004` `39ed076` / `f885768`)
- **Summary:** Render explicit high-contrast WCAG AA `"Mini Offline Deck (8 Starter Cards)"` indicators (`coop-mini-offline-deck-badge`, `(Mini Offline Deck)` Handoff start button warning, and shared `ArcadeMiniOfflineDeckPill` / `cabinet-mini-offline-deck-pill` across `ArcadeReadyCard` and Cabinet #9 `StarlightSecretGame`) whenever a lazy course fails offline, and allow solo `Arcade` tab navigation into `ArcadeHub` on uncached offline base languages while keeping `base-track-loading-card` on `Map` & `Phrasebook`.

### S4-005 — Multi-Line `FreeRecallHintBar` Tone Radius & Tap-to-Apply Pinyin Preview Chip (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owners:** `liam-s4`, `liam-s4-fix` (`BUG-S4-005`, `BUG-S4-006` `bb1190e` / `49fc736`)
- **Summary:** Use `borderRadius: 12` on `free-recall-tone-coaching` so multi-line mobile tone tips wrap cleanly on `375x667`, add an interactive `"Tap to apply"` button (`pinyin-preview-apply-btn`) inside `pinyin-tone-number-preview` (wired through `useFreeRecallInput.applyConvertedText`) with partial-initial tolerance (`convertNumericPinyinWithPartialTailSafe` for `"ni3h"`/`"wo3de5m"`) across `WordBankView` & `BossGauntletView` while preserving focus and caret position, and hide `BossGauntletView` `exercise.introLine` (`hud-hide-xs`) with `marginLeft: 'auto'` CTAs so `.lesson-arena-stage` fits cleanly inside `375x667`.

### S4-006 — Scrollable Mobile Adult Controls Inside `ProfileVaultModal` (`<=640px`) (`SHIPPED & VERIFIED`)
- **Priority:** `P3` | **Owner:** `liam-s4` (`fcd6684` / `4b865e0`)
- **Summary:** Move the unlocked Adult re-entry, `Switch back to [KidName]`, and `Switch back to Kid Explorer on Study Break` block inside `ProfileVaultModal`'s scrollable container below `Offline Atlas Pack`, freeing ~95px of height for `Explorer Profiles` and `Pack & Boosters` on `375x667`.

---

## Sprint 5 Backlog Proposals (`S5-###`)

None — 0 remaining backlog proposals
