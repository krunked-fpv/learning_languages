import { useSyncExternalStore } from 'react';
import {
  BADGE_CATALOG,
  COSMETIC_CATALOG,
  STREAK_SHIELD_COST_GEMS,
  applyDailyPracticeStreak,
  evaluateUnlockedBadges,
  getCosmeticById,
  resolveLeagueTierForXp,
} from '../core';
import {
  LANGUAGE_LIST,
  type AvatarId,
  type BadgeId,
  type CosmeticId,
  type CosmeticSlot,
  type EquippedCosmetics,
  type ImportVaultResult,
  type KidProfile,
  type LanguageCode,
  type LanguageProgressState,
  type LeagueTier,
  type SaveVault,
} from '../types/contracts';

export const STORAGE_KEY = 'wanderling.vault.v1';

const VALID_AVATARS = new Set<AvatarId>([
  'pip_explorer',
  'mateo_chef',
  'colette_baker',
  'benni_tinker',
  'luca_captain',
  'star_compass',
]);

const VALID_LANGUAGES = new Set<LanguageCode>(LANGUAGE_LIST);

const VALID_LEAGUE_TIERS = new Set<LeagueTier>([
  'bronze_acorn',
  'silver_compass',
  'gold_feather',
  'sapphire_sky',
  'starlight_legend',
]);

const VALID_COSMETIC_SLOTS = new Set<CosmeticSlot>(['hat', 'glasses', 'cape', 'aura', 'theme']);

const VALID_COSMETIC_IDS = new Set<CosmeticId>(COSMETIC_CATALOG.map((c) => c.id));
const VALID_BADGE_IDS = new Set<BadgeId>(BADGE_CATALOG.map((b) => b.id));

const TIER_RANK: Record<LeagueTier, number> = {
  bronze_acorn: 0,
  silver_compass: 1,
  gold_feather: 2,
  sapphire_sky: 3,
  starlight_legend: 4,
};

const MAX_SEEN_EXERCISES = 600;

function emptyLangProgress(): LanguageProgressState {
  return {
    completedNodeIds: [],
    nodeStars: {},
    unlockedVocabIds: [],
    claimedChestIds: [],
    currentUnitIndex: 0,
    xpEarned: 0,
    seenExerciseIds: [],
  };
}

function createAllLangProgress(): Record<LanguageCode, LanguageProgressState> {
  const progress = {} as Record<LanguageCode, LanguageProgressState>;
  for (const lang of LANGUAGE_LIST) {
    progress[lang] = emptyLangProgress();
  }
  return progress;
}

function makeFreshProfile(params: {
  id: string;
  name: string;
  avatarId: AvatarId;
  bannerColor: string;
  activeLanguage: LanguageCode;
  gems?: number;
}): KidProfile {
  return {
    id: params.id,
    name: params.name,
    avatarId: params.avatarId,
    bannerColor: params.bannerColor,
    activeLanguage: params.activeLanguage,
    gems: params.gems ?? 80,
    hearts: 5,
    maxHearts: 5,
    streakDays: 1,
    lastPracticeISO: null,
    streakShields: 1,
    equippedCosmetics: {},
    unlockedCosmetics: [],
    badges: [],
    weeklyXp: 0,
    totalXp: 0,
    leagueTier: 'bronze_acorn',
    secretArcadeUnlocked: false,
    secretArcadeBestScore: 0,
    arcadeHighScores: {},
    stats: {
      lessonsCompleted: 0,
      storiesCompleted: 0,
      bossesCleared: 0,
      arcadeGamesWon: 0,
      turtlePlaysCount: 0,
      bestComboStreak: 0,
      accentSpotlightsSeen: 0,
    },
    languageProgress: createAllLangProgress(),
  };
}

export function createDefaultVault(): SaveVault {
  const leo = makeFreshProfile({
    id: 'kid-leo',
    name: 'Leo',
    avatarId: 'pip_explorer',
    bannerColor: '#2563EB',
    activeLanguage: 'es',
    gems: 80,
  });

  const maya = makeFreshProfile({
    id: 'kid-maya',
    name: 'Maya',
    avatarId: 'colette_baker',
    bannerColor: '#EC4899',
    activeLanguage: 'fr',
    gems: 80,
  });

  return {
    schemaVersion: 1,
    activeProfileId: leo.id,
    profiles: [leo, maya],
    audioSettings: { volume: 0.85, muted: false },
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function cloneLangProgress(lp: LanguageProgressState): LanguageProgressState {
  return {
    completedNodeIds: [...lp.completedNodeIds],
    nodeStars: { ...lp.nodeStars },
    unlockedVocabIds: [...lp.unlockedVocabIds],
    claimedChestIds: [...lp.claimedChestIds],
    currentUnitIndex: lp.currentUnitIndex,
    xpEarned: lp.xpEarned,
    seenExerciseIds: lp.seenExerciseIds ? [...lp.seenExerciseIds] : [],
  };
}

function cloneProfile(profile: KidProfile): KidProfile {
  const languageProgress = {} as Record<LanguageCode, LanguageProgressState>;
  for (const lang of LANGUAGE_LIST) {
    const existing = profile.languageProgress[lang];
    languageProgress[lang] = existing ? cloneLangProgress(existing) : emptyLangProgress();
  }

  return {
    ...profile,
    secretArcadeUnlocked: Boolean(profile.secretArcadeUnlocked),
    secretArcadeBestScore: profile.secretArcadeBestScore ?? 0,
    arcadeHighScores: profile.arcadeHighScores ? { ...profile.arcadeHighScores } : {},
    equippedCosmetics: { ...profile.equippedCosmetics },
    unlockedCosmetics: [...profile.unlockedCosmetics],
    badges: [...profile.badges],
    stats: { ...profile.stats },
    languageProgress,
  };
}

function validateLangProgress(
  raw: unknown,
  label: string
): { ok: true; value: LanguageProgressState } | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: `${label} must be an object.` };
  }
  if (!isStringArray(raw.completedNodeIds)) {
    return { ok: false, error: `${label}.completedNodeIds must be an array of strings.` };
  }
  if (!isPlainObject(raw.nodeStars)) {
    return { ok: false, error: `${label}.nodeStars must be an object.` };
  }
  const nodeStars: Record<string, 1 | 2 | 3> = {};
  for (const [nodeId, starVal] of Object.entries(raw.nodeStars)) {
    if (starVal !== 1 && starVal !== 2 && starVal !== 3) {
      return { ok: false, error: `${label}.nodeStars["${nodeId}"] must be 1, 2, or 3.` };
    }
    nodeStars[nodeId] = starVal;
  }
  if (!isStringArray(raw.unlockedVocabIds)) {
    return { ok: false, error: `${label}.unlockedVocabIds must be an array of strings.` };
  }
  if (!isStringArray(raw.claimedChestIds)) {
    return { ok: false, error: `${label}.claimedChestIds must be an array of strings.` };
  }
  if (!isNonNegNumber(raw.currentUnitIndex)) {
    return { ok: false, error: `${label}.currentUnitIndex must be a non-negative number.` };
  }
  if (!isNonNegNumber(raw.xpEarned)) {
    return { ok: false, error: `${label}.xpEarned must be a non-negative number.` };
  }
  let seenExerciseIds: string[] = [];
  if (raw.seenExerciseIds !== undefined) {
    if (!isStringArray(raw.seenExerciseIds)) {
      return { ok: false, error: `${label}.seenExerciseIds must be an array of strings.` };
    }
    seenExerciseIds = Array.from(new Set(raw.seenExerciseIds)).slice(-MAX_SEEN_EXERCISES);
  }

  return {
    ok: true,
    value: {
      completedNodeIds: Array.from(new Set(raw.completedNodeIds)),
      nodeStars,
      unlockedVocabIds: Array.from(new Set(raw.unlockedVocabIds)),
      claimedChestIds: Array.from(new Set(raw.claimedChestIds)),
      currentUnitIndex: Math.floor(raw.currentUnitIndex),
      xpEarned: Math.round(raw.xpEarned),
      seenExerciseIds,
    },
  };
}

function validateKidProfile(
  raw: unknown,
  index: number
): { ok: true; value: KidProfile } | { ok: false; error: string } {
  const prefix = `profiles[${index}]`;
  if (!isPlainObject(raw)) {
    return { ok: false, error: `${prefix} must be an object.` };
  }
  if (typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    return { ok: false, error: `${prefix}.id must be a non-empty string.` };
  }
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    return { ok: false, error: `${prefix}.name must be a non-empty string.` };
  }
  if (typeof raw.avatarId !== 'string' || !VALID_AVATARS.has(raw.avatarId as AvatarId)) {
    return { ok: false, error: `${prefix}.avatarId "${String(raw.avatarId)}" is invalid.` };
  }
  if (typeof raw.bannerColor !== 'string' || raw.bannerColor.trim().length === 0) {
    return { ok: false, error: `${prefix}.bannerColor must be a non-empty string.` };
  }
  if (
    typeof raw.activeLanguage !== 'string' ||
    !VALID_LANGUAGES.has(raw.activeLanguage as LanguageCode)
  ) {
    return {
      ok: false,
      error: `${prefix}.activeLanguage "${String(raw.activeLanguage)}" is invalid.`,
    };
  }
  if (!isNonNegNumber(raw.gems)) {
    return { ok: false, error: `${prefix}.gems must be a non-negative number.` };
  }
  if (!isNonNegNumber(raw.maxHearts) || raw.maxHearts < 1) {
    return { ok: false, error: `${prefix}.maxHearts must be at least 1.` };
  }
  if (!isNonNegNumber(raw.hearts)) {
    return { ok: false, error: `${prefix}.hearts must be a non-negative number.` };
  }
  if (!isNonNegNumber(raw.streakDays)) {
    return { ok: false, error: `${prefix}.streakDays must be a non-negative number.` };
  }
  if (raw.lastPracticeISO !== null && typeof raw.lastPracticeISO !== 'string') {
    return { ok: false, error: `${prefix}.lastPracticeISO must be null or an ISO string.` };
  }
  if (!isNonNegNumber(raw.streakShields)) {
    return { ok: false, error: `${prefix}.streakShields must be a non-negative number.` };
  }
  if (!isNonNegNumber(raw.weeklyXp) || !isNonNegNumber(raw.totalXp)) {
    return { ok: false, error: `${prefix}.weeklyXp and totalXp must be non-negative numbers.` };
  }
  if (
    typeof raw.leagueTier !== 'string' ||
    !VALID_LEAGUE_TIERS.has(raw.leagueTier as LeagueTier)
  ) {
    return { ok: false, error: `${prefix}.leagueTier "${String(raw.leagueTier)}" is invalid.` };
  }

  if (!isPlainObject(raw.equippedCosmetics)) {
    return { ok: false, error: `${prefix}.equippedCosmetics must be an object.` };
  }
  const equippedCosmetics: EquippedCosmetics = {};
  for (const [slotKey, cosmeticVal] of Object.entries(raw.equippedCosmetics)) {
    if (!VALID_COSMETIC_SLOTS.has(slotKey as CosmeticSlot)) {
      return { ok: false, error: `${prefix}.equippedCosmetics has invalid slot "${slotKey}".` };
    }
    if (cosmeticVal !== undefined) {
      if (
        typeof cosmeticVal !== 'string' ||
        !VALID_COSMETIC_IDS.has(cosmeticVal as CosmeticId)
      ) {
        return {
          ok: false,
          error: `${prefix}.equippedCosmetics.${slotKey} has invalid cosmetic "${String(cosmeticVal)}".`,
        };
      }
      const def = getCosmeticById(cosmeticVal as CosmeticId);
      if (!def || def.slot !== slotKey) {
        return {
          ok: false,
          error: `${prefix}.equippedCosmetics.${slotKey} cosmetic "${cosmeticVal}" does not fit slot "${slotKey}".`,
        };
      }
      equippedCosmetics[slotKey as CosmeticSlot] = cosmeticVal as CosmeticId;
    }
  }

  if (
    !Array.isArray(raw.unlockedCosmetics) ||
    !raw.unlockedCosmetics.every(
      (id) => typeof id === 'string' && VALID_COSMETIC_IDS.has(id as CosmeticId)
    )
  ) {
    return { ok: false, error: `${prefix}.unlockedCosmetics contains invalid cosmetic IDs.` };
  }

  if (
    !Array.isArray(raw.badges) ||
    !raw.badges.every((id) => typeof id === 'string' && VALID_BADGE_IDS.has(id as BadgeId))
  ) {
    return { ok: false, error: `${prefix}.badges contains invalid badge IDs.` };
  }

  if (!isPlainObject(raw.stats)) {
    return { ok: false, error: `${prefix}.stats must be an object.` };
  }
  const statKeys = [
    'lessonsCompleted',
    'storiesCompleted',
    'bossesCleared',
    'arcadeGamesWon',
    'turtlePlaysCount',
    'bestComboStreak',
    'accentSpotlightsSeen',
  ] as const;
  for (const key of statKeys) {
    if (!isNonNegNumber(raw.stats[key])) {
      return { ok: false, error: `${prefix}.stats.${key} must be a non-negative number.` };
    }
  }

  if (!isPlainObject(raw.languageProgress)) {
    return { ok: false, error: `${prefix}.languageProgress must be an object.` };
  }
  const rawLangProgress = raw.languageProgress;
  const hasAtLeastOneValidLang = LANGUAGE_LIST.some(
    (lang) =>
      Object.prototype.hasOwnProperty.call(rawLangProgress, lang) &&
      rawLangProgress[lang] !== undefined
  );
  if (!hasAtLeastOneValidLang) {
    return {
      ok: false,
      error: `${prefix}.languageProgress must contain at least one valid language entry.`,
    };
  }

  const validatedLangProgress = {} as Record<LanguageCode, LanguageProgressState>;
  for (const lang of LANGUAGE_LIST) {
    const rawEntry = rawLangProgress[lang];
    if (rawEntry === undefined) {
      validatedLangProgress[lang] = emptyLangProgress();
      continue;
    }
    const res = validateLangProgress(rawEntry, `${prefix}.languageProgress.${lang}`);
    if (!res.ok) return res;
    validatedLangProgress[lang] = res.value;
  }

  if (
    raw.secretArcadeUnlocked !== undefined &&
    typeof raw.secretArcadeUnlocked !== 'boolean'
  ) {
    return { ok: false, error: `${prefix}.secretArcadeUnlocked must be a boolean.` };
  }
  if (raw.secretArcadeBestScore !== undefined && !isNonNegNumber(raw.secretArcadeBestScore)) {
    return {
      ok: false,
      error: `${prefix}.secretArcadeBestScore must be a non-negative number.`,
    };
  }
  const arcadeHighScores: Record<string, number> = {};
  if (raw.arcadeHighScores !== undefined) {
    if (!isPlainObject(raw.arcadeHighScores)) {
      return { ok: false, error: `${prefix}.arcadeHighScores must be an object.` };
    }
    for (const [gameId, scoreVal] of Object.entries(raw.arcadeHighScores)) {
      if (gameId.trim().length === 0 || !isNonNegNumber(scoreVal)) {
        return {
          ok: false,
          error: `${prefix}.arcadeHighScores["${gameId}"] must be a non-negative number.`,
        };
      }
      arcadeHighScores[gameId] = Math.floor(scoreVal);
    }
  }

  const maxHearts = Math.floor(raw.maxHearts);
  return {
    ok: true,
    value: {
      id: raw.id.trim(),
      name: raw.name.trim(),
      avatarId: raw.avatarId as AvatarId,
      bannerColor: raw.bannerColor.trim(),
      activeLanguage: raw.activeLanguage as LanguageCode,
      gems: Math.floor(raw.gems),
      hearts: Math.min(maxHearts, Math.floor(raw.hearts)),
      maxHearts,
      streakDays: Math.floor(raw.streakDays),
      lastPracticeISO: raw.lastPracticeISO,
      streakShields: Math.floor(raw.streakShields),
      equippedCosmetics,
      unlockedCosmetics: Array.from(new Set(raw.unlockedCosmetics as CosmeticId[])),
      badges: Array.from(new Set(raw.badges as BadgeId[])),
      weeklyXp: Math.round(raw.weeklyXp),
      totalXp: Math.round(raw.totalXp),
      leagueTier: raw.leagueTier as LeagueTier,
      secretArcadeUnlocked: raw.secretArcadeUnlocked ?? false,
      secretArcadeBestScore:
        raw.secretArcadeBestScore !== undefined ? Math.floor(raw.secretArcadeBestScore) : 0,
      arcadeHighScores,
      stats: {
        lessonsCompleted: Math.floor(raw.stats.lessonsCompleted as number),
        storiesCompleted: Math.floor(raw.stats.storiesCompleted as number),
        bossesCleared: Math.floor(raw.stats.bossesCleared as number),
        arcadeGamesWon: Math.floor(raw.stats.arcadeGamesWon as number),
        turtlePlaysCount: Math.floor(raw.stats.turtlePlaysCount as number),
        bestComboStreak: Math.floor(raw.stats.bestComboStreak as number),
        accentSpotlightsSeen: Math.floor(raw.stats.accentSpotlightsSeen as number),
      },
      languageProgress: validatedLangProgress,
    },
  };
}

function validateVaultObject(
  raw: unknown
): { ok: true; value: SaveVault } | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: 'Save data must be a JSON object.' };
  }
  if (raw.schemaVersion !== 1) {
    return {
      ok: false,
      error: `Unsupported save schemaVersion "${String(raw.schemaVersion)}". Expected version 1.`,
    };
  }
  if (typeof raw.activeProfileId !== 'string' || raw.activeProfileId.trim().length === 0) {
    return { ok: false, error: 'Missing or invalid activeProfileId.' };
  }
  if (!Array.isArray(raw.profiles) || raw.profiles.length === 0) {
    return { ok: false, error: 'Save file must contain at least one kid profile.' };
  }

  const profiles: KidProfile[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < raw.profiles.length; i++) {
    const validatedProfile = validateKidProfile(raw.profiles[i], i);
    if (!validatedProfile.ok) return validatedProfile;
    if (seenIds.has(validatedProfile.value.id)) {
      return {
        ok: false,
        error: `Duplicate profile id "${validatedProfile.value.id}" in save file.`,
      };
    }
    seenIds.add(validatedProfile.value.id);
    profiles.push(validatedProfile.value);
  }

  const activeId = raw.activeProfileId.trim();
  if (!seenIds.has(activeId)) {
    return {
      ok: false,
      error: `activeProfileId "${activeId}" does not match any profile in the save file.`,
    };
  }

  if (!isPlainObject(raw.audioSettings)) {
    return { ok: false, error: 'Missing or invalid audioSettings.' };
  }
  if (
    typeof raw.audioSettings.volume !== 'number' ||
    !Number.isFinite(raw.audioSettings.volume) ||
    raw.audioSettings.volume < 0 ||
    raw.audioSettings.volume > 1
  ) {
    return { ok: false, error: 'audioSettings.volume must be a number between 0 and 1.' };
  }
  if (typeof raw.audioSettings.muted !== 'boolean') {
    return { ok: false, error: 'audioSettings.muted must be a boolean.' };
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      activeProfileId: activeId,
      profiles,
      audioSettings: {
        volume: raw.audioSettings.volume,
        muted: raw.audioSettings.muted,
      },
    },
  };
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return (globalThis as { localStorage?: Storage }).localStorage ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function persistVault(vault: SaveVault): void {
  const storage = getSafeStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(vault));
  } catch {
    // Ignore storage quota or private-mode write blocks gracefully
  }
}

export function loadVaultFromStorage(): SaveVault {
  const storage = getSafeStorage();
  if (!storage) return createDefaultVault();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultVault();
    const parsed: unknown = JSON.parse(raw);
    const validated = validateVaultObject(parsed);
    if (!validated.ok) return createDefaultVault();
    return validated.value;
  } catch {
    return createDefaultVault();
  }
}

let memoryVault: SaveVault = loadVaultFromStorage();
const listeners = new Set<() => void>();

function commitVault(nextVault: SaveVault): void {
  memoryVault = nextVault;
  persistVault(nextVault);
  listeners.forEach((listener) => listener());
}

function updateActiveProfile(updater: (profile: KidProfile) => KidProfile): void {
  const currentActiveId =
    memoryVault.profiles.find((p) => p.id === memoryVault.activeProfileId)?.id ??
    memoryVault.profiles[0]?.id;
  if (!currentActiveId) return;

  let changed = false;
  const nextProfiles = memoryVault.profiles.map((profile) => {
    if (profile.id !== currentActiveId) return profile;
    const updated = updater(profile);
    if (updated !== profile) changed = true;
    return updated;
  });

  if (!changed) return;
  commitVault({
    ...memoryVault,
    profiles: nextProfiles,
  });
}

function mergeTwoProfiles(existing: KidProfile, incoming: KidProfile): KidProfile {
  const mergedLanguageProgress = createAllLangProgress();

  for (const lang of LANGUAGE_LIST) {
    const a = existing.languageProgress[lang] ?? emptyLangProgress();
    const b = incoming.languageProgress[lang] ?? emptyLangProgress();
    const mergedStars: Record<string, 1 | 2 | 3> = { ...a.nodeStars };
    for (const [nodeId, star] of Object.entries(b.nodeStars)) {
      const prev = mergedStars[nodeId] ?? 0;
      mergedStars[nodeId] = Math.max(prev, star) as 1 | 2 | 3;
    }

    mergedLanguageProgress[lang] = {
      completedNodeIds: Array.from(new Set([...a.completedNodeIds, ...b.completedNodeIds])),
      nodeStars: mergedStars,
      unlockedVocabIds: Array.from(new Set([...a.unlockedVocabIds, ...b.unlockedVocabIds])),
      claimedChestIds: Array.from(new Set([...a.claimedChestIds, ...b.claimedChestIds])),
      currentUnitIndex: Math.max(a.currentUnitIndex, b.currentUnitIndex),
      xpEarned: Math.max(a.xpEarned, b.xpEarned),
      seenExerciseIds: Array.from(
        new Set([...(a.seenExerciseIds ?? []), ...(b.seenExerciseIds ?? [])])
      ).slice(-MAX_SEEN_EXERCISES),
    };
  }

  const maxHearts = Math.max(existing.maxHearts, incoming.maxHearts);
  const weeklyXp = Math.max(existing.weeklyXp, incoming.weeklyXp);
  const higherTier =
    TIER_RANK[existing.leagueTier] >= TIER_RANK[incoming.leagueTier]
      ? existing.leagueTier
      : incoming.leagueTier;
  const lastPracticeISO =
    [existing.lastPracticeISO, incoming.lastPracticeISO].filter(Boolean).sort().pop() ?? null;

  const mergedHighScores: Record<string, number> = { ...(existing.arcadeHighScores ?? {}) };
  for (const [gameId, score] of Object.entries(incoming.arcadeHighScores ?? {})) {
    mergedHighScores[gameId] = Math.max(mergedHighScores[gameId] ?? 0, score);
  }

  const merged: KidProfile = {
    ...existing,
    gems: Math.max(existing.gems, incoming.gems),
    maxHearts,
    hearts: Math.min(maxHearts, Math.max(existing.hearts, incoming.hearts)),
    streakDays: Math.max(existing.streakDays, incoming.streakDays),
    lastPracticeISO,
    streakShields: Math.max(existing.streakShields, incoming.streakShields),
    equippedCosmetics: { ...incoming.equippedCosmetics, ...existing.equippedCosmetics },
    unlockedCosmetics: Array.from(
      new Set([...existing.unlockedCosmetics, ...incoming.unlockedCosmetics])
    ),
    badges: Array.from(new Set([...existing.badges, ...incoming.badges])),
    weeklyXp,
    totalXp: Math.max(existing.totalXp, incoming.totalXp),
    leagueTier: resolveLeagueTierForXp(weeklyXp, higherTier),
    secretArcadeUnlocked: Boolean(
      existing.secretArcadeUnlocked || incoming.secretArcadeUnlocked
    ),
    secretArcadeBestScore: Math.max(
      existing.secretArcadeBestScore ?? 0,
      incoming.secretArcadeBestScore ?? 0
    ),
    arcadeHighScores: mergedHighScores,
    stats: {
      lessonsCompleted: Math.max(
        existing.stats.lessonsCompleted,
        incoming.stats.lessonsCompleted
      ),
      storiesCompleted: Math.max(
        existing.stats.storiesCompleted,
        incoming.stats.storiesCompleted
      ),
      bossesCleared: Math.max(existing.stats.bossesCleared, incoming.stats.bossesCleared),
      arcadeGamesWon: Math.max(existing.stats.arcadeGamesWon, incoming.stats.arcadeGamesWon),
      turtlePlaysCount: Math.max(
        existing.stats.turtlePlaysCount,
        incoming.stats.turtlePlaysCount
      ),
      bestComboStreak: Math.max(existing.stats.bestComboStreak, incoming.stats.bestComboStreak),
      accentSpotlightsSeen: Math.max(
        existing.stats.accentSpotlightsSeen,
        incoming.stats.accentSpotlightsSeen
      ),
    },
    languageProgress: mergedLanguageProgress,
  };

  return {
    ...merged,
    badges: evaluateUnlockedBadges(merged),
  };
}

export function exportVaultJson(vault: SaveVault = memoryVault): string {
  return JSON.stringify(vault, null, 2);
}

export function importVaultJson(
  rawJson: string,
  mode: 'replace' | 'merge' = 'replace'
): ImportVaultResult {
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    return { ok: false, error: 'Save file is empty. Please choose a valid Wanderling save JSON.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON syntax. Please verify the save file was not corrupted or truncated.',
    };
  }

  const validated = validateVaultObject(parsed);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const incomingVault = validated.value;

  if (mode === 'replace') {
    commitVault({
      schemaVersion: 1,
      activeProfileId: incomingVault.activeProfileId,
      profiles: incomingVault.profiles.map(cloneProfile),
      audioSettings: { ...incomingVault.audioSettings },
    });
    return {
      ok: true,
      importedProfilesCount: incomingVault.profiles.length,
    };
  }

  const existingById = new Map<string, KidProfile>(
    memoryVault.profiles.map((p) => [p.id, cloneProfile(p)])
  );
  const mergedProfiles: KidProfile[] = memoryVault.profiles.map(cloneProfile);

  for (const imp of incomingVault.profiles) {
    const existing = existingById.get(imp.id);
    if (existing) {
      const merged = mergeTwoProfiles(existing, imp);
      const idx = mergedProfiles.findIndex((p) => p.id === imp.id);
      if (idx >= 0) mergedProfiles[idx] = merged;
    } else {
      mergedProfiles.push(cloneProfile(imp));
    }
  }

  const activeStillValid = mergedProfiles.some((p) => p.id === memoryVault.activeProfileId);
  commitVault({
    schemaVersion: 1,
    activeProfileId: activeStillValid ? memoryVault.activeProfileId : mergedProfiles[0].id,
    profiles: mergedProfiles,
    audioSettings: { ...memoryVault.audioSettings },
  });

  return {
    ok: true,
    importedProfilesCount: incomingVault.profiles.length,
  };
}

let profileSequenceCounter = 0;

function generateUniqueProfileId(name: string, existingProfiles: readonly KidProfile[]): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 16) || 'explorer';
  const existingIds = new Set(existingProfiles.map((p) => p.id));
  let candidate = `kid-${slug}`;
  if (!existingIds.has(candidate)) return candidate;

  do {
    profileSequenceCounter += 1;
    candidate = `kid-${slug}-${Date.now().toString(36)}-${profileSequenceCounter}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export const vaultActions = {
  switchProfile(profileId: string): void {
    if (!memoryVault.profiles.some((p) => p.id === profileId)) return;
    if (memoryVault.activeProfileId === profileId) return;
    commitVault({
      ...memoryVault,
      activeProfileId: profileId,
    });
  },

  createProfile(input: {
    name: string;
    avatarId: AvatarId;
    bannerColor: string;
    activeLanguage?: LanguageCode;
  }): KidProfile {
    const cleanName = input.name.trim() || 'Explorer';
    const avatarId: AvatarId = VALID_AVATARS.has(input.avatarId) ? input.avatarId : 'pip_explorer';
    const bannerColor = input.bannerColor.trim() || '#2563EB';
    const activeLanguage: LanguageCode =
      input.activeLanguage && VALID_LANGUAGES.has(input.activeLanguage)
        ? input.activeLanguage
        : 'es';
    const id = generateUniqueProfileId(cleanName, memoryVault.profiles);

    const created = makeFreshProfile({
      id,
      name: cleanName,
      avatarId,
      bannerColor,
      activeLanguage,
      gems: 80,
    });

    commitVault({
      ...memoryVault,
      activeProfileId: created.id,
      profiles: [...memoryVault.profiles, created],
    });

    return created;
  },

  deleteProfile(profileId: string): boolean {
    if (memoryVault.profiles.length <= 1) return false;
    const exists = memoryVault.profiles.some((p) => p.id === profileId);
    if (!exists) return false;

    const remaining = memoryVault.profiles.filter((p) => p.id !== profileId);
    const nextActiveId =
      memoryVault.activeProfileId === profileId ? remaining[0].id : memoryVault.activeProfileId;

    commitVault({
      ...memoryVault,
      activeProfileId: nextActiveId,
      profiles: remaining,
    });
    return true;
  },

  setActiveLanguage(lang: LanguageCode): void {
    if (!VALID_LANGUAGES.has(lang)) return;
    updateActiveProfile((profile) => {
      if (profile.activeLanguage === lang) return profile;
      return {
        ...profile,
        activeLanguage: lang,
      };
    });
  },

  setCurrentUnitIndex(lang: LanguageCode, unitIndex: number): void {
    if (!VALID_LANGUAGES.has(lang)) return;
    const safeUnitIndex = Number.isFinite(unitIndex) ? Math.max(0, Math.floor(unitIndex)) : 0;
    updateActiveProfile((profile) => {
      const langProg = profile.languageProgress[lang] ?? emptyLangProgress();
      if (langProg.currentUnitIndex === safeUnitIndex) return profile;
      return {
        ...profile,
        languageProgress: {
          ...createAllLangProgress(),
          ...profile.languageProgress,
          [lang]: {
            ...langProg,
            currentUnitIndex: safeUnitIndex,
          },
        },
      };
    });
  },

  recordAnswerOutcome(params: {
    isCorrect: boolean;
    comboCount: number;
    usedAccentCoaching?: boolean;
  }): void {
    updateActiveProfile((profile) => {
      const nextHearts = params.isCorrect ? profile.hearts : Math.max(0, profile.hearts - 1);
      const nextBestCombo = params.isCorrect
        ? Math.max(profile.stats.bestComboStreak, Math.max(0, Math.floor(params.comboCount)))
        : profile.stats.bestComboStreak;
      const nextSpotlights =
        params.isCorrect && params.usedAccentCoaching
          ? profile.stats.accentSpotlightsSeen + 1
          : profile.stats.accentSpotlightsSeen;

      const updated: KidProfile = {
        ...profile,
        hearts: nextHearts,
        stats: {
          ...profile.stats,
          bestComboStreak: nextBestCombo,
          accentSpotlightsSeen: nextSpotlights,
        },
      };

      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });
  },

  recordTurtlePlay(): void {
    updateActiveProfile((profile) => {
      const updated: KidProfile = {
        ...profile,
        stats: {
          ...profile.stats,
          turtlePlaysCount: profile.stats.turtlePlaysCount + 1,
        },
      };
      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });
  },

  completeMapNode(params: {
    language: LanguageCode;
    nodeId: string;
    stars: 1 | 2 | 3;
    xpEarned: number;
    gemsEarned: number;
    unlockedVocabIds: string[];
    maxCombo: number;
    isStory?: boolean;
    isBoss?: boolean;
    isChest?: boolean;
  }): void {
    if (!VALID_LANGUAGES.has(params.language)) return;
    updateActiveProfile((profile) => {
      const langProg = profile.languageProgress[params.language] ?? emptyLangProgress();
      const safeXp = Number.isFinite(params.xpEarned) ? Math.max(0, Math.round(params.xpEarned)) : 0;
      const isAlreadyClaimedChest = Boolean(
        params.isChest && langProg.claimedChestIds.includes(params.nodeId)
      );
      const safeGems = isAlreadyClaimedChest
        ? 0
        : Number.isFinite(params.gemsEarned)
          ? Math.max(0, Math.round(params.gemsEarned))
          : 0;

      const prevStars = langProg.nodeStars[params.nodeId] ?? 0;
      const nextStars = Math.max(prevStars, params.stars) as 1 | 2 | 3;

      const nextLangProg: LanguageProgressState = {
        ...langProg,
        completedNodeIds: Array.from(new Set([...langProg.completedNodeIds, params.nodeId])),
        nodeStars: {
          ...langProg.nodeStars,
          [params.nodeId]: nextStars,
        },
        unlockedVocabIds: Array.from(
          new Set([...langProg.unlockedVocabIds, ...params.unlockedVocabIds])
        ),
        claimedChestIds: params.isChest
          ? Array.from(new Set([...langProg.claimedChestIds, params.nodeId]))
          : langProg.claimedChestIds,
        xpEarned: langProg.xpEarned + safeXp,
      };

      const nextWeeklyXp = profile.weeklyXp + safeXp;
      const nextTotalXp = profile.totalXp + safeXp;
      const isLesson = !params.isStory && !params.isBoss && !params.isChest;
      const nextLessonsCompleted = profile.stats.lessonsCompleted + (isLesson ? 1 : 0);

      const nextLanguageProgress: Record<LanguageCode, LanguageProgressState> = {
        ...createAllLangProgress(),
        ...profile.languageProgress,
        [params.language]: nextLangProg,
      };
      const totalCompletedNodes = LANGUAGE_LIST.reduce(
        (sum, lang) => sum + (nextLanguageProgress[lang]?.completedNodeIds.length ?? 0),
        0
      );
      const shouldUnlockSecretArcade =
        Boolean(profile.secretArcadeUnlocked) ||
        Boolean(params.isBoss) ||
        totalCompletedNodes >= 3 ||
        nextLessonsCompleted >= 3;

      const updated: KidProfile = {
        ...profile,
        gems: profile.gems + safeGems,
        weeklyXp: nextWeeklyXp,
        totalXp: nextTotalXp,
        leagueTier: resolveLeagueTierForXp(nextWeeklyXp, profile.leagueTier),
        secretArcadeUnlocked: shouldUnlockSecretArcade,
        stats: {
          ...profile.stats,
          lessonsCompleted: nextLessonsCompleted,
          storiesCompleted: profile.stats.storiesCompleted + (params.isStory ? 1 : 0),
          bossesCleared: profile.stats.bossesCleared + (params.isBoss ? 1 : 0),
          bestComboStreak: Math.max(
            profile.stats.bestComboStreak,
            Math.max(0, Math.floor(params.maxCombo))
          ),
        },
        languageProgress: nextLanguageProgress,
      };

      const withStreak = applyDailyPracticeStreak(updated);
      return {
        ...withStreak,
        badges: evaluateUnlockedBadges(withStreak),
      };
    });
  },

  recordSeenExercises(lang: LanguageCode, exerciseIds: readonly string[]): void {
    if (!VALID_LANGUAGES.has(lang) || exerciseIds.length === 0) return;
    updateActiveProfile((profile) => {
      const langProg = profile.languageProgress[lang] ?? emptyLangProgress();
      const existing = langProg.seenExerciseIds ?? [];
      const seenSet = new Set(existing);
      const toAppend: string[] = [];

      for (const rawId of exerciseIds) {
        if (typeof rawId === 'string' && rawId.length > 0 && !seenSet.has(rawId)) {
          seenSet.add(rawId);
          toAppend.push(rawId);
        }
      }

      if (toAppend.length === 0) return profile;

      const nextSeen = [...existing, ...toAppend].slice(-MAX_SEEN_EXERCISES);
      return {
        ...profile,
        languageProgress: {
          ...createAllLangProgress(),
          ...profile.languageProgress,
          [lang]: {
            ...langProg,
            seenExerciseIds: nextSeen,
          },
        },
      };
    });
  },

  unlockSecretArcade(): boolean {
    const activeProfile =
      memoryVault.profiles.find((p) => p.id === memoryVault.activeProfileId) ??
      memoryVault.profiles[0];
    if (!activeProfile || activeProfile.secretArcadeUnlocked) return false;

    updateActiveProfile((profile) => {
      if (profile.secretArcadeUnlocked) return profile;
      return {
        ...profile,
        secretArcadeUnlocked: true,
        gems: profile.gems + 15,
      };
    });
    return true;
  },

  completeSecretArcadeRun(params: {
    score: number;
    heartsWon: number;
    bonusGems: number;
  }): void {
    updateActiveProfile((profile) => {
      const safeScore = Number.isFinite(params.score)
        ? Math.max(0, Math.floor(params.score))
        : 0;
      const heartsWon = Number.isFinite(params.heartsWon)
        ? Math.max(0, Math.floor(params.heartsWon))
        : 0;
      const bonusGems = Number.isFinite(params.bonusGems)
        ? Math.max(0, Math.floor(params.bonusGems))
        : 0;
      const prevScores = profile.arcadeHighScores ?? {};

      const updated: KidProfile = {
        ...profile,
        hearts: Math.min(profile.maxHearts, profile.hearts + heartsWon),
        gems: profile.gems + bonusGems,
        secretArcadeBestScore: Math.max(profile.secretArcadeBestScore ?? 0, safeScore),
        arcadeHighScores: {
          ...prevScores,
          starlight_choir: Math.max(prevScores.starlight_choir ?? 0, safeScore),
        },
        stats: {
          ...profile.stats,
          arcadeGamesWon: profile.stats.arcadeGamesWon + 1,
        },
      };

      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });
  },

  recordArcadeGameResult(params: {
    gameId: string;
    score: number;
    heartsWon: number;
    bonusGems: number;
  }): void {
    const cleanGameId = typeof params.gameId === 'string' ? params.gameId.trim() : '';
    if (!cleanGameId) return;

    updateActiveProfile((profile) => {
      const safeScore = Number.isFinite(params.score)
        ? Math.max(0, Math.floor(params.score))
        : 0;
      const heartsWon = Number.isFinite(params.heartsWon)
        ? Math.max(0, Math.floor(params.heartsWon))
        : 0;
      const bonusGems = Number.isFinite(params.bonusGems)
        ? Math.max(0, Math.floor(params.bonusGems))
        : 0;
      const prevScores = profile.arcadeHighScores ?? {};
      const nextBest = Math.max(prevScores[cleanGameId] ?? 0, safeScore);

      const updated: KidProfile = {
        ...profile,
        hearts: Math.min(profile.maxHearts, profile.hearts + heartsWon),
        gems: profile.gems + bonusGems,
        arcadeHighScores: {
          ...prevScores,
          [cleanGameId]: nextBest,
        },
        secretArcadeBestScore:
          cleanGameId === 'starlight_choir'
            ? Math.max(profile.secretArcadeBestScore ?? 0, safeScore)
            : profile.secretArcadeBestScore,
        stats: {
          ...profile.stats,
          arcadeGamesWon: profile.stats.arcadeGamesWon + 1,
        },
      };

      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });
  },

  restoreHeartsFromArcade(params: { heartsWon: number; bonusGems: number }): void {
    updateActiveProfile((profile) => {
      const heartsWon = Number.isFinite(params.heartsWon)
        ? Math.max(0, Math.floor(params.heartsWon))
        : 0;
      const bonusGems = Number.isFinite(params.bonusGems)
        ? Math.max(0, Math.floor(params.bonusGems))
        : 0;

      const updated: KidProfile = {
        ...profile,
        hearts: Math.min(profile.maxHearts, profile.hearts + heartsWon),
        gems: profile.gems + bonusGems,
        stats: {
          ...profile.stats,
          arcadeGamesWon: profile.stats.arcadeGamesWon + (heartsWon > 0 ? 1 : 0),
        },
      };

      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });
  },

  buyAndEquipCosmetic(cosmeticId: CosmeticId): boolean {
    const item = getCosmeticById(cosmeticId);
    if (!item) return false;

    const activeProfile =
      memoryVault.profiles.find((p) => p.id === memoryVault.activeProfileId) ??
      memoryVault.profiles[0];
    if (!activeProfile) return false;

    const alreadyOwned = activeProfile.unlockedCosmetics.includes(cosmeticId);
    if (!alreadyOwned && activeProfile.gems < item.costGems) {
      return false;
    }

    updateActiveProfile((profile) => ({
      ...profile,
      gems: alreadyOwned ? profile.gems : profile.gems - item.costGems,
      unlockedCosmetics: alreadyOwned
        ? profile.unlockedCosmetics
        : [...profile.unlockedCosmetics, cosmeticId],
      equippedCosmetics: {
        ...profile.equippedCosmetics,
        [item.slot]: cosmeticId,
      },
    }));

    return true;
  },

  equipCosmetic(slot: CosmeticSlot, cosmeticId?: CosmeticId): void {
    if (!VALID_COSMETIC_SLOTS.has(slot)) return;

    updateActiveProfile((profile) => {
      if (cosmeticId === undefined) {
        if (profile.equippedCosmetics[slot] === undefined) return profile;
        const nextEquipped = { ...profile.equippedCosmetics };
        delete nextEquipped[slot];
        return {
          ...profile,
          equippedCosmetics: nextEquipped,
        };
      }

      const item = getCosmeticById(cosmeticId);
      if (!item || item.slot !== slot) return profile;
      if (!profile.unlockedCosmetics.includes(cosmeticId)) return profile;

      return {
        ...profile,
        equippedCosmetics: {
          ...profile.equippedCosmetics,
          [slot]: cosmeticId,
        },
      };
    });
  },

  buyStreakShield(): boolean {
    const activeProfile =
      memoryVault.profiles.find((p) => p.id === memoryVault.activeProfileId) ??
      memoryVault.profiles[0];
    if (!activeProfile || activeProfile.gems < STREAK_SHIELD_COST_GEMS) {
      return false;
    }

    updateActiveProfile((profile) => ({
      ...profile,
      gems: profile.gems - STREAK_SHIELD_COST_GEMS,
      streakShields: profile.streakShields + 1,
    }));

    return true;
  },

  setAudioSettings(partial: Partial<{ volume: number; muted: boolean }>): void {
    const current = memoryVault.audioSettings;
    const nextVolume =
      typeof partial.volume === 'number' && Number.isFinite(partial.volume)
        ? Math.min(1, Math.max(0, partial.volume))
        : current.volume;
    const nextMuted = typeof partial.muted === 'boolean' ? partial.muted : current.muted;

    if (nextVolume === current.volume && nextMuted === current.muted) return;

    commitVault({
      ...memoryVault,
      audioSettings: {
        volume: nextVolume,
        muted: nextMuted,
      },
    });
  },

  resetVaultToDefaults(): void {
    commitVault(createDefaultVault());
  },
};

const EMPTY_PROGRESS_FALLBACK: LanguageProgressState = emptyLangProgress();

export function useVaultStore(): {
  vault: SaveVault;
  activeProfile: KidProfile;
  activeProgress: LanguageProgressState;
} {
  const vault = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => memoryVault,
    () => memoryVault
  );
  const activeProfile =
    vault.profiles.find((p) => p.id === vault.activeProfileId) ?? vault.profiles[0];
  const activeProgress =
    activeProfile.languageProgress[activeProfile.activeLanguage] ?? EMPTY_PROGRESS_FALLBACK;
  return { vault, activeProfile, activeProgress };
}
