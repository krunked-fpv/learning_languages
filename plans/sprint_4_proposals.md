# Studio Wanderling — Sprint 4 Proposals (`Operation Celestial Summit`)

**Sprint Status:** `GREENLIT — IN EXECUTION` (`S4-001`–`S4-006`, `PT-001`–`PT-135` Gate)  
**Curator:** Coordinator & **Vera (`vera-s4`)**  
**Origin:** Promoted from Sprint 3 Playtest Scouts (`devon-s3`, `mila-s3`, `vera-s3`) in [sprint_3_proposals.md](./sprint_3_proposals.md).

---

### S4-001 — Mask & Parent-Gate Adult Track Metadata in `ProfileVaultModal` During Quarantined Co-Op (`GREENLIT — IN EXECUTION`)
- **Priority:** `P2` | **Owner:** `liam-s4`
- **Summary:** Thread `coopSafeMask` from `App.tsx` into `ProfileVaultModal`; while `coopSafeMask.active` is `true` and Parent override is locked, mask Adult active languages on Explorer cards, suppress 7-tap/keycode unlock triggers, hide After-Hours re-entry/toggle controls behind a kid-safe banner (`profile-modal-coop-safe-mask`), and provide a 18+ `Parent Controls (18+)` confirmation gate for parents.

### S4-002 — Mobile `Safe Atlas` Pill Label & Above-the-Fold `375x667` Co-Op Fit (`GREENLIT — IN EXECUTION`)
- **Priority:** `P2` | **Owners:** `leo-s4`, `liam-s4`
- **Summary:** Keep full `Family Co-Op Safe Atlas` text for desktop/Screen Readers while displaying a crisp visible `Safe Atlas` label on `<640px` `tophud-coop-safe-atlas-badge`, tighten mobile `TopHud` padding + `Install App` wrap, and compact the `ArcadeHub` Co-Op roster bar & Pair Streak badge on `375x667` so Page-1 cabinet launch buttons stay visible inside `100dvh`.

### S4-003 — Space-Insensitive Multi-Syllable Numeric & Romanized Pinyin Matching (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owner:** `julian-s4`
- **Summary:** Support unspaced multi-syllable Mandarin numeric/romanized Pinyin inputs (`"ni3hao3"`, `"wo3de5ming2zi5jiao4Ma3te4'ao4"`, `"ni2hao3"`) against multi-word canonical targets (`"Nǐ hǎo!"`, `"Wǒ de míngzi jiào Mǎtèào."`) across `grader.ts` (preserving exact/tone-forgiving `heartPenalty: 0`) and `hintEngine.ts` (compact prefix alignment & tone coaching without false `hasWrongSuffix`).

### S4-004 — Offline Handoff `"Mini Offline Deck"` Guard Indicator (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owner:** `leo-s4`
- **Summary:** Render explicit high-contrast WCAG AA `"Mini Offline Deck (8 Starter Cards)"` indicators (`coop-mini-offline-deck-badge`, `(Mini Offline Deck)` Handoff start button warning, and `cabinet-mini-offline-deck-pill` in `ArcadeReadyCard`) whenever a partner's lazy course fails offline so families clearly recognize fallback starter decks before starting a turn.

### S4-005 — Multi-Line `FreeRecallHintBar` Tone Radius & Tap-to-Apply Pinyin Preview Chip (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owner:** `liam-s4`
- **Summary:** Use `borderRadius: 12` on `free-recall-tone-coaching` so multi-line mobile tone tips wrap cleanly on `375x667`, and add an interactive `"Tap to apply"` button (`pinyin-preview-apply-btn`) inside `pinyin-tone-number-preview` (wired through `useFreeRecallInput.applyConvertedText`) across `WordBankView` & `BossGauntletView` while preserving focus and caret position.

### S4-006 — Scrollable Mobile Adult Controls Inside `ProfileVaultModal` (`<=640px`) (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owner:** `liam-s4`
- **Summary:** Move the unlocked Adult re-entry, `Switch back to [KidName]`, and `Switch back to Kid Explorer on Study Break` block inside `ProfileVaultModal`'s scrollable container below `Offline Atlas Pack`, freeing ~95px of height for `Explorer Profiles` and `Pack & Boosters` on `375x667`.

---

## Sprint 5 Backlog Proposals (`S5-###`)

Reserved for non-bug big enhancements discovered during Sprint 4 (`PT-001`–`PT-135`) by `mila-s4`, `devon-s4`, and `vera-s4`.
