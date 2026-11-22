# OPERATION WANDERLING — MASTER BLUEPRINT & MODULE CONTRACTS

Every Phase 2 specialist branches from the committed Phase 1 baseline (`main`) using `workspace: "share"`. This blueprint locks exact file ownership, module exports, UI component prop signatures, and layout budgets so all 6 tracks compile cleanly against `src/types/contracts.ts` without cross-track collisions.

---

## 1. Exclusive File Ownership Matrix

| Specialist | Exclusive Owned Paths | Forbidden Paths |
| :--- | :--- | :--- |
| **`julian-architect`** | `src/core/**`, `src/store/**` | `src/types/contracts.ts`, `src/curriculum/**`, `src/art/**`, `src/audio/**`, `src/components/**`, `public/**`, `scripts/**` |
| **`clara-linguist`** | `src/curriculum/**` | Everything outside `src/curriculum/**` |
| **`mateo-illustrator`** | `src/art/**`, `src/components/characters/**`, `src/components/map/**` | Everything outside those 3 directories |
| **`nadia-audio`** | `src/audio/**` | Everything outside `src/audio/**` |
| **`liam-gameplay`** | `src/components/lesson/**`, `src/components/arcade/**`, `src/components/meta/**`, `src/components/shell/**`, `src/styles/**`, `src/App.tsx`, `src/main.tsx` | `src/core/**`, `src/store/**`, `src/curriculum/**`, `src/art/**`, `src/audio/**`, `src/components/characters/**`, `src/components/map/**`, `public/**`, `scripts/**` |
| **`hannah-platform`** | `index.html`, `public/**`, `scripts/**`, `.github/workflows/deploy.yml`, `README.md` | `src/**`, `tests/**` |
| **`vera-redteam`** (Phase 4) | `tests/**` (+ full audit reports) | Production files unless fixing via surgical integration loop |

---

## 2. Locked Export Signatures Across Tracks

### 2.1 `src/core/index.ts` (and submodules `grader.ts`, `progression.ts`, `cosmetics.ts`)
- `gradeAnswer(req: GradeRequest): GradeResult`
- `normalizeAnswer(input: string, options?: { stripAccents?: boolean; expandGerman?: boolean }): string`
- `calculateComboMultiplier(comboCount: number): { multiplier: number; label: string; bonusGems: number }`
- `calculateLessonRewards(params: { baseXp: number; baseGems: number; maxCombo: number; mistakesCount: number }): { xpEarned: number; gemsEarned: number; stars: 1 | 2 | 3 }`
- `applyDailyPracticeStreak(profile: KidProfile, todayISO?: string): KidProfile`
- `BADGE_CATALOG: readonly BadgeDefinition[]` (all 12 `BadgeId`s)
- `evaluateUnlockedBadges(profile: KidProfile): BadgeId[]`
- `getBadgeProgress(profile: KidProfile, badgeId: BadgeId): { current: number; target: number; unlocked: boolean }`
- `LEAGUE_TIER_META: Record<LeagueTier, { label: string; minXpHint: number; color: string; crestBg: string }>`
- `buildWeeklyLeaderboard(profile: KidProfile): LeagueEntry[]`
- `COSMETIC_CATALOG: readonly CosmeticItem[]` (all 17 `CosmeticId`s including 8 unlockable UI theme palettes featuring `'theme_cosmic_galaxy'`)
- `STREAK_SHIELD_COST_GEMS: number`

### 2.2 `src/store/useVaultStore.ts`
- `STORAGE_KEY = 'wanderling.vault.v1'`
- `createDefaultVault(): SaveVault` (seeds *Leo* and *Maya*)
- `loadVaultFromStorage(): SaveVault`
- `exportVaultJson(vault?: SaveVault): string`
- `importVaultJson(rawJson: string, mode?: 'replace' | 'merge'): ImportVaultResult`
- `vaultActions`:
  - `switchProfile(profileId: string): void`
  - `createProfile(input: { name: string; avatarId: AvatarId; bannerColor: string }): KidProfile`
  - `deleteProfile(profileId: string): boolean` (returns `false` and refuses if only 1 profile exists)
  - `setActiveLanguage(lang: LanguageCode): void`
  - `setCurrentUnitIndex(lang: LanguageCode, unitIndex: number): void`
  - `recordAnswerOutcome(params: { isCorrect: boolean; comboCount: number; usedAccentCoaching?: boolean }): void`
  - `recordTurtlePlay(): void`
  - `recordSeenExercises(lang: LanguageCode, exerciseIds: readonly string[]): void`
  - `unlockSecretArcade(): boolean`
  - `completeSecretArcadeRun(params: { score: number; heartsWon: number; bonusGems: number }): void`
  - `recordArcadeGameResult(params: { gameId: string; score: number; heartsWon: number; bonusGems: number }): void`
  - `completeMapNode(params: { language: LanguageCode; nodeId: string; stars: 1 | 2 | 3; xpEarned: number; gemsEarned: number; unlockedVocabIds: string[]; maxCombo: number; isStory?: boolean; isBoss?: boolean; isChest?: boolean }): void`
  - `restoreHeartsFromArcade(params: { heartsWon: number; bonusGems: number }): void`
  - `buyAndEquipCosmetic(cosmeticId: CosmeticId): boolean`
  - `equipCosmetic(slot: CosmeticSlot, cosmeticId?: CosmeticId): void`
  - `buyStreakShield(): boolean`
  - `setAudioSettings(partial: Partial<{ volume: number; muted: boolean }>): void`
  - `resetVaultToDefaults(): void`
- `useVaultStore(): { vault: SaveVault; activeProfile: KidProfile; activeProgress: LanguageProgressState }`

### 2.3 `src/curriculum/index.ts` (and `src/curriculum/levelPool.ts`)
- `COURSES: Record<LanguageCode, LanguageCourse>` (`es`, `fr`, `de`, `it` — 5 units each, ≥55 unique `VocabCard`s each, 4 lessons + 1 story + 1 chest + 1 boss per unit)
- `getCourse(lang: LanguageCode): LanguageCourse`
- `getUnitById(lang: LanguageCode, unitId: string): CourseUnit | undefined`
- `getNodeById(lang: LanguageCode, nodeId: string): MapNode | undefined`
- `getVocabCard(lang: LanguageCode, vocabId: string): VocabCard | undefined`
- `getArcadeLexicon(lang: LanguageCode, unlockedVocabIds: readonly string[], currentUnitIndex: number): ArcadeLanternItem[]`
- `getPlayableNodeExercises(lang: LanguageCode, nodeId: string, seenExerciseIds?: readonly string[], isReplay?: boolean): LessonExercise[]`
- `getNodePoolSize(lang: LanguageCode, nodeId: string): number`

### 2.4 `src/audio/index.ts` (and `synthEngine.ts`, `speechEngine.ts`)
- `playSfx(id: SoundEffectId, comboIndex?: number): void`
- `playPhoneticCadence(phonetic: string, slow?: boolean): Promise<void>`
- `setAudioPreferences(settings: { volume: number; muted: boolean }): void`
- `speakPhrase(req: SpeakRequest): Promise<SpeakOutcome>`
- `stopSpeech(): void`
- `hasNativeVoice(lang: LanguageCode | 'en'): boolean`
- `getSpeechRuntimeState(): SpeechRuntimeState`
- `useSpeechRuntimeState(): SpeechRuntimeState`

### 2.5 `src/art/*`, `src/components/characters/MascotStage.tsx`, `src/components/map/AdventureMap.tsx`
- `FlagIcon({ language, size = 28, className }: { language: LanguageCode; size?: number; className?: string })`
- `AvatarBadge({ avatarId, size = 44, className }: { avatarId: AvatarId; size?: number; className?: string })`
- `VocabIllustration({ illustrationKey, language, size = 120, className }: { illustrationKey: IllustrationKey; language?: LanguageCode; size?: number; className?: string })`
- `MascotStage({ companionId, pose, equippedCosmetics, pointerTarget, comboCount, size = 180, badgeText, className }: { companionId: CompanionId; pose: CharacterPose; equippedCosmetics?: EquippedCosmetics; pointerTarget?: { x: number; y: number } | null; comboCount?: number; size?: number; badgeText?: string; className?: string })`
- `AdventureMap({ course, progress, equippedCosmetics, onSelectNode, onSelectUnit }: { course: LanguageCourse; progress: LanguageProgressState; equippedCosmetics: EquippedCosmetics; onSelectNode: (node: MapNode) => void; onSelectUnit?: (unitIndex: number) => void })`

### 2.6 `100dvh` Full-Viewport Lesson Layout Budget (`liam-gameplay`)
- Lesson Arena root uses `height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; overflow: hidden;` so that across `1440x900`, `768x1024`, and `375x667`, `document.documentElement.scrollHeight <= window.innerHeight` holds true.
- On compact mobile viewports (`<= 640px` height or width), MascotStage scales gracefully (`size={112}`–`140`) beside a compact speech prompt, and only an internal container uses `overflow-y: auto` if needed for multi-bubble comic dialogue while the outer lesson viewport stays strictly locked at `100dvh`.

### 2.7 PWA & Subpath Hosting Contracts (`hannah-platform`)
- `index.html`: `./manifest.json`, `./icons/icon-192.png`, `./icons/apple-touch-icon.png`, `<meta name="theme-color" content="#1e1b4b">`, SW registration `./sw.js` with `{ scope: './' }`.
- `public/manifest.json`: `"start_url": "./"`, `"scope": "./"`, `"display": "standalone"`, `"orientation": "any"`, `"background_color": "#1e1b4b"`, `"theme_color": "#1e1b4b"`, 4+ icon entries covering `"any"` and `"maskable"` with `./icons/...` paths.
- `public/sw.js`: active `install`, `activate` (old cache deletion), and `fetch` listener (network-first + dynamic cache + offline fallback).
- `scripts/generate-pwa-icons.mjs`: writes valid binary RGBA PNGs (`icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).
- `scripts/verify-build-artifacts.mjs`: validates `dist/` outputs and exits non-zero on any violation.
- `scripts/serve-subpath.mjs`: mounts `dist/` under `/wanderling-subpath/` on an open port (or `--port`) and immediately prints `READY http://127.0.0.1:<port>/wanderling-subpath/`.
