# Studio Wanderling — Sprint 3 Proposals (`Operation Aurora Pact`)

**Sprint Status:** `GREENLIT — IN EXECUTION` (`S3-001`–`S3-006`, `PT-001`–`PT-125` Gate)  
**Curator:** Coordinator & **Vera (`vera-s3`)**  
**Origin:** Promoted from Sprint 2 Playtest Scouts (`devon-s2`, `mila-s2`, `vera-s2`) in [sprint_2_proposals.md](./sprint_2_proposals.md).

---

### S3-001 — Safe Atlas Masking in `TopHud` During Kid-Quarantined 2P Co-Op (`GREENLIT — IN EXECUTION`)
- **Priority:** `P2` | **Owners:** `leo-s3`, `liam-s3`
- **Summary:** Emit `CoopSafeAtlasMask` (`{ active, safeLanguage }`) from `ArcadeHub` into `App.tsx` and `TopHud` whenever 2P Family Co-Op is active and Kid-Quarantined, replacing any Adult `TopHud` language badge with `Family Co-Op Safe Atlas`, auto-closing the language popover, hiding `return-to-kid-atlas-btn`, and masking root/BottomNav theme accent metadata to the safe base language.

### S3-002 — Pre-Warm Co-Op Base Language Chunks on Handoff, Offline Retry Guard & Family Pair Streaks (`GREENLIT — IN EXECUTION`)
- **Priority:** `P2` | **Owners:** `julian-s3`, `leo-s3`
- **Summary:** Pre-warm BOTH `p1` and `p2` safe base chunks on Co-Op setup, add offline lazy-chunk load error recovery (`Retry Loading` / `Use Safe Español Deck`) on both the Co-Op selector and `"Pass Console to [Player 2]!"` handoff card, persist sorted-pair `coopPairStreaks` in `wanderling.vault.v1`, and display Pair Streak & credited languages in Co-Op Hub & Finale.

### S3-003 — Strict Vault Date Validation, Credited Language Summary & Live Partner Edit/Import Sync (`GREENLIT — IN EXECUTION`)
- **Priority:** `P2` | **Owners:** `julian-s3`, `leo-s3`
- **Summary:** Extend strict `isValidISODateString` checks across `coopPairStreaks`, JSON export envelope dates (`exportedAt`/`exportedAtISO`), and `createdAtISO` on import/hydration; return `playerOneCreditedLanguage`/`playerTwoCreditedLanguage` in `CoopArcadeSessionSummary`; sync active `coopMatch` metadata live if partners are edited/disarmed/deleted mid-match.

### S3-004 — Unified Compact Script Strip for `<640px` Mobile Free-Recall (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owners:** `liam-s3`
- **Summary:** Unify `[aria-label="Accent character bar"]` + `[data-testid="virtual-script-drawer-toggle"]` into a single horizontal no-wrap strip (`<= 38px` tall) on `<640px` when collapsed, deduplicate keys in `VirtualScriptDrawer`, and replace the strip seamlessly with the expanded drawer grid inside `100dvh` with zero nested vertical scrollbar stack.

### S3-005 — Pinyin Tone-Number Input (`ni3 hao3`) & Arabic Hamza/Ayn Optionality Note (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owners:** `julian-s3`, `liam-s3`
- **Summary:** Convert and grade numeric Pinyin (`ni3 hao3` -> `nǐ hǎo`, `nv3`/`lu:4` -> `nǚ`/`lǜ`) in `src/core/grader.ts` + `hintEngine.ts`, surface live `"Pinyin tones: ..."` preview in `WordBankView` / `BossGauntletView` / `FreeRecallHintBar`, and add a compact QWERTY Arabic hamza/vowel optionality tip on `ar` / `arz` Free-Recall.

### S3-006 — Friendly `"Parent"` Default Name & 1-Tap Prior Kid Restore on `Study Break` (`GREENLIT — IN EXECUTION`)
- **Priority:** `P3` | **Owners:** `julian-s3`, `liam-s3`
- **Summary:** Default secondary Adult profile name/placeholder from `'After-Hours'` to `'Parent'`, record `lastKidProfileId` when transitioning from a kid profile into an Adult profile, add opt-in `restoreKidProfileOnStudyBreak` toggle in `ProfileVaultModal` (preserving legacy `setAdultModeActive(false)` behavior when disabled), and provide 1-tap `Switch back to [KidName]` recovery.

---

## Sprint 4 Backlog Proposals (`S4-###`)

Reserved for non-bug big enhancements discovered during Sprint 3 (`PT-001`–`PT-125`) by `mila-s3`, `devon-s3`, and `vera-s3`.
