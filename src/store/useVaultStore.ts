import { useSyncExternalStore } from 'react';
import {
  BADGE_CATALOG,
  COSMETIC_CATALOG,
  HEART_CRYSTAL_COST_GEMS,
  HEART_ELIXIR_COST_GEMS,
  MAX_HEART_CONTAINERS,
  STARTER_AVATAR_IDS,
  STREAK_SHIELD_COST_GEMS,
  TIER_ORDER,
  UNLOCKABLE_AVATAR_COSTS,
  XP_BOOSTER_CHARGES_PER_BUY,
  XP_BOOSTER_COST_GEMS,
  applyDailyPracticeStreak,
  evaluateUnlockedBadges,
  getCosmeticById,
  resolveLeagueTierForXp,
} from '../core';
import {
  ADULT_EASTER_EGG_CODES,
  ADULT_EASTER_EGG_LANGUAGES,
  ALL_LANGUAGE_LIST,
  LANGUAGE_LIST,
  PROFICIENCY_TIERS,
  isAdultLanguage,
  isDefaultKidProfileId,
  type AdultLanguageCode,
  type AvatarId,
  type BadgeId,
  type BaseLanguageCode,
  type CosmeticId,
  type CosmeticSlot,
  type EquippedCosmetics,
  type ImportVaultResult,
  type KidProfile,
  type LanguageCode,
  type LanguageProgressMap,
  type LanguageProgressState,
  type LeagueTier,
  type ProficiencyTier,
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
  'origami_crane_crest',
  'clockwork_owl_crest',
  'fennec_voyager',
  'grand_laureate_crest',
]);

const VALID_BASE_LANGUAGES = new Set<BaseLanguageCode>(LANGUAGE_LIST);
const VALID_ADULT_LANGUAGES = new Set<AdultLanguageCode>(ADULT_EASTER_EGG_LANGUAGES);
const VALID_ALL_LANGUAGES = new Set<LanguageCode>(ALL_LANGUAGE_LIST);

const VALID_LEAGUE_TIERS = new Set<LeagueTier>(TIER_ORDER);

const VALID_PROFICIENCY_TIERS = new Set<ProficiencyTier>(PROFICIENCY_TIERS);
const VALID_UNLOCKABLE_TIERS = new Set<Exclude<ProficiencyTier, 'A1'>>(['A2', 'B1', 'B2', 'C1_C2']);

const VALID_COSMETIC_SLOTS = new Set<CosmeticSlot>([
  'hat',
  'glasses',
  'cape',
  'aura',
  'prop',
  'pet',
  'theme',
]);

const VALID_COSMETIC_IDS = new Set<CosmeticId>(COSMETIC_CATALOG.map((c) => c.id));
const VALID_BADGE_IDS = new Set<BadgeId>(BADGE_CATALOG.map((b) => b.id));

const TIER_RANK: Record<LeagueTier, number> = {
  bronze_acorn: 0,
  silver_compass: 1,
  gold_feather: 2,
  sapphire_sky: 3,
  starlight_legend: 4,
  emerald_diplomat: 5,
  amethyst_symposium: 6,
  grand_polyglot_laureate: 7,
};

const MAX_SEEN_EXERCISES = 1500;

function emptyLangProgress(): LanguageProgressState {
  return {
    completedNodeIds: [],
    nodeStars: {},
    unlockedVocabIds: [],
    claimedChestIds: [],
    currentUnitIndex: 0,
    xpEarned: 0,
    seenExerciseIds: [],
    unlockedTiers: [],
  };
}

function defaultBaseLangForProfile(profileId: string): BaseLanguageCode {
  return profileId === 'kid-maya' ? 'fr' : 'es';
}

function resolveLastBaseLanguage(params: {
  id: string;
  lastBaseLanguage?: unknown;
  activeLanguage?: unknown;
}): BaseLanguageCode {
  if (
    typeof params.lastBaseLanguage === 'string' &&
    VALID_BASE_LANGUAGES.has(params.lastBaseLanguage as BaseLanguageCode)
  ) {
    return params.lastBaseLanguage as BaseLanguageCode;
  }
  if (
    typeof params.activeLanguage === 'string' &&
    VALID_BASE_LANGUAGES.has(params.activeLanguage as BaseLanguageCode)
  ) {
    return params.activeLanguage as BaseLanguageCode;
  }
  return defaultBaseLangForProfile(params.id);
}

function canUseAdultMode(profile: Pick<KidProfile, 'id' | 'adultModeUnlocked'>): boolean {
  return !isDefaultKidProfileId(profile.id) && Boolean(profile.adultModeUnlocked);
}

function buildLanguageProgressMap(
  existing: Partial<Record<LanguageCode, LanguageProgressState>> | undefined,
  includeAdult: boolean,
  cloneEntries = true
): LanguageProgressMap {
  const progress = {} as LanguageProgressMap;
  for (const lang of LANGUAGE_LIST) {
    const entry = existing?.[lang];
    progress[lang] = entry ? (cloneEntries ? cloneLangProgress(entry) : entry) : emptyLangProgress();
  }
  if (includeAdult) {
    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const entry = existing?.[lang];
      progress[lang] = entry
        ? cloneEntries
          ? cloneLangProgress(entry)
          : entry
        : emptyLangProgress();
    }
  }
  return progress;
}

function withUpdatedLanguageProgress(
  profile: KidProfile,
  lang: LanguageCode,
  nextState: LanguageProgressState
): LanguageProgressMap {
  const includeAdult = canUseAdultMode(profile);
  const baseMap = buildLanguageProgressMap(profile.languageProgress, includeAdult, false);
  if (!isAdultLanguage(lang) || includeAdult) {
    baseMap[lang] = nextState;
  }
  return baseMap;
}

function disarmProfileAdultMode(profile: KidProfile): KidProfile {
  const fallbackBase = resolveLastBaseLanguage(profile);
  const nextActiveLang = isAdultLanguage(profile.activeLanguage)
    ? fallbackBase
    : profile.activeLanguage;
  if (
    !profile.adultModeActive &&
    profile.activeLanguage === nextActiveLang &&
    profile.lastBaseLanguage === fallbackBase
  ) {
    return profile;
  }
  return {
    ...profile,
    adultModeActive: false,
    lastBaseLanguage: fallbackBase,
    activeLanguage: nextActiveLang,
  };
}

function makeFreshProfile(params: {
  id: string;
  name: string;
  avatarId: AvatarId;
  bannerColor: string;
  activeLanguage: LanguageCode;
  lastBaseLanguage?: BaseLanguageCode;
  adultModeUnlocked?: boolean;
  adultModeActive?: boolean;
  gems?: number;
}): KidProfile {
  const isDefaultKid = isDefaultKidProfileId(params.id);
  const adultModeUnlocked = !isDefaultKid && Boolean(params.adultModeUnlocked);
  const adultModeActive = adultModeUnlocked && Boolean(params.adultModeActive);
  const lastBaseLanguage = resolveLastBaseLanguage({
    id: params.id,
    lastBaseLanguage: params.lastBaseLanguage,
    activeLanguage: params.activeLanguage,
  });
  const activeLanguage: LanguageCode =
    adultModeActive && VALID_ALL_LANGUAGES.has(params.activeLanguage)
      ? params.activeLanguage
      : !isAdultLanguage(params.activeLanguage) &&
          VALID_BASE_LANGUAGES.has(params.activeLanguage)
        ? params.activeLanguage
        : lastBaseLanguage;

  return {
    id: params.id,
    name: params.name,
    avatarId: params.avatarId,
    bannerColor: params.bannerColor,
    activeLanguage,
    lastBaseLanguage,
    adultModeUnlocked,
    adultModeActive,
    gems: params.gems ?? 80,
    hearts: 5,
    maxHearts: 5,
    streakDays: 1,
    lastPracticeISO: null,
    streakShields: 1,
    heartElixirs: 0,
    xpBoosterCharges: 0,
    unlockedAvatars: Array.from(new Set([...STARTER_AVATAR_IDS, params.avatarId])),
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
      freeRecallSolved: 0,
      fluentPlaysCount: 0,
      checkpointsPassed: 0,
      clozeSolved: 0,
      hintsUsedCount: 0,
    },
    languageProgress: buildLanguageProgressMap(undefined, adultModeUnlocked, false),
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
  const hintCounts = lp.hintAssistedCounts;
  const hasHintCounts = Boolean(hintCounts && Object.keys(hintCounts).length > 0);
  return {
    completedNodeIds: [...lp.completedNodeIds],
    nodeStars: { ...lp.nodeStars },
    unlockedVocabIds: [...lp.unlockedVocabIds],
    claimedChestIds: [...lp.claimedChestIds],
    currentUnitIndex: lp.currentUnitIndex,
    xpEarned: lp.xpEarned,
    seenExerciseIds: lp.seenExerciseIds ? [...lp.seenExerciseIds] : [],
    unlockedTiers: lp.unlockedTiers ? [...lp.unlockedTiers] : [],
    ...(hasHintCounts ? { hintAssistedCounts: { ...hintCounts } } : {}),
  };
}

function cloneProfile(profile: KidProfile): KidProfile {
  const isDefaultKid = isDefaultKidProfileId(profile.id);
  const adultModeUnlocked = !isDefaultKid && Boolean(profile.adultModeUnlocked);
  const adultModeActive = adultModeUnlocked && Boolean(profile.adultModeActive);
  const lastBaseLanguage = resolveLastBaseLanguage(profile);
  const activeLanguage: LanguageCode =
    adultModeActive && VALID_ALL_LANGUAGES.has(profile.activeLanguage)
      ? profile.activeLanguage
      : !isAdultLanguage(profile.activeLanguage) &&
          VALID_BASE_LANGUAGES.has(profile.activeLanguage)
        ? profile.activeLanguage
        : lastBaseLanguage;

  const languageProgress = buildLanguageProgressMap(
    profile.languageProgress,
    adultModeUnlocked,
    true
  );

  return {
    ...profile,
    activeLanguage,
    lastBaseLanguage,
    adultModeUnlocked,
    adultModeActive,
    heartElixirs: profile.heartElixirs ?? 0,
    xpBoosterCharges: profile.xpBoosterCharges ?? 0,
    unlockedAvatars: Array.from(
      new Set([...STARTER_AVATAR_IDS, ...(profile.unlockedAvatars ?? []), profile.avatarId])
    ),
    secretArcadeUnlocked: Boolean(profile.secretArcadeUnlocked),
    secretArcadeBestScore: profile.secretArcadeBestScore ?? 0,
    arcadeHighScores: profile.arcadeHighScores ? { ...profile.arcadeHighScores } : {},
    equippedCosmetics: { ...profile.equippedCosmetics },
    unlockedCosmetics: [...profile.unlockedCosmetics],
    badges: [...profile.badges],
    stats: {
      ...profile.stats,
      freeRecallSolved: profile.stats.freeRecallSolved ?? 0,
      fluentPlaysCount: profile.stats.fluentPlaysCount ?? 0,
      checkpointsPassed: profile.stats.checkpointsPassed ?? 0,
      clozeSolved: profile.stats.clozeSolved ?? 0,
      hintsUsedCount: profile.stats.hintsUsedCount ?? 0,
    },
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
  let unlockedTiers: ProficiencyTier[] = [];
  if (raw.unlockedTiers !== undefined) {
    if (
      !Array.isArray(raw.unlockedTiers) ||
      !raw.unlockedTiers.every(
        (t) => typeof t === 'string' && VALID_PROFICIENCY_TIERS.has(t as ProficiencyTier)
      )
    ) {
      return { ok: false, error: `${label}.unlockedTiers contains invalid proficiency tiers.` };
    }
    unlockedTiers = Array.from(new Set(raw.unlockedTiers as ProficiencyTier[]));
  }
  const hintAssistedCounts: Record<string, number> = {};
  if (raw.hintAssistedCounts !== undefined) {
    if (!isPlainObject(raw.hintAssistedCounts)) {
      return { ok: false, error: `${label}.hintAssistedCounts must be an object.` };
    }
    for (const [exId, countVal] of Object.entries(raw.hintAssistedCounts)) {
      if (exId.trim().length === 0 || !isNonNegNumber(countVal)) {
        return {
          ok: false,
          error: `${label}.hintAssistedCounts["${exId}"] must be a non-negative number.`,
        };
      }
      const floored = Math.floor(countVal);
      if (floored > 0) {
        hintAssistedCounts[exId] = floored;
      }
    }
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
      unlockedTiers,
      ...(Object.keys(hintAssistedCounts).length > 0 ? { hintAssistedCounts } : {}),
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
  const profileId = raw.id.trim();
  const isDefaultKid = isDefaultKidProfileId(profileId);

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
    !VALID_ALL_LANGUAGES.has(raw.activeLanguage as LanguageCode)
  ) {
    return {
      ok: false,
      error: `${prefix}.activeLanguage "${String(raw.activeLanguage)}" is invalid.`,
    };
  }
  if (
    raw.lastBaseLanguage !== undefined &&
    (typeof raw.lastBaseLanguage !== 'string' ||
      !VALID_BASE_LANGUAGES.has(raw.lastBaseLanguage as BaseLanguageCode))
  ) {
    return {
      ok: false,
      error: `${prefix}.lastBaseLanguage "${String(raw.lastBaseLanguage)}" is invalid.`,
    };
  }
  if (raw.adultModeUnlocked !== undefined && typeof raw.adultModeUnlocked !== 'boolean') {
    return { ok: false, error: `${prefix}.adultModeUnlocked must be a boolean.` };
  }
  if (raw.adultModeActive !== undefined && typeof raw.adultModeActive !== 'boolean') {
    return { ok: false, error: `${prefix}.adultModeActive must be a boolean.` };
  }

  const adultModeUnlocked = !isDefaultKid && raw.adultModeUnlocked === true;
  const adultModeActive = adultModeUnlocked && raw.adultModeActive === true;
  const lastBaseLanguage = resolveLastBaseLanguage({
    id: profileId,
    lastBaseLanguage: raw.lastBaseLanguage,
    activeLanguage: raw.activeLanguage,
  });
  const activeLanguage: LanguageCode =
    adultModeActive && VALID_ALL_LANGUAGES.has(raw.activeLanguage as LanguageCode)
      ? (raw.activeLanguage as LanguageCode)
      : !isAdultLanguage(raw.activeLanguage) &&
          VALID_BASE_LANGUAGES.has(raw.activeLanguage as BaseLanguageCode)
        ? (raw.activeLanguage as BaseLanguageCode)
        : lastBaseLanguage;
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
  if (raw.heartElixirs !== undefined && !isNonNegNumber(raw.heartElixirs)) {
    return { ok: false, error: `${prefix}.heartElixirs must be a non-negative number.` };
  }
  if (raw.xpBoosterCharges !== undefined && !isNonNegNumber(raw.xpBoosterCharges)) {
    return { ok: false, error: `${prefix}.xpBoosterCharges must be a non-negative number.` };
  }
  if (
    raw.unlockedAvatars !== undefined &&
    (!Array.isArray(raw.unlockedAvatars) ||
      !raw.unlockedAvatars.every(
        (id) => typeof id === 'string' && VALID_AVATARS.has(id as AvatarId)
      ))
  ) {
    return { ok: false, error: `${prefix}.unlockedAvatars contains invalid avatar IDs.` };
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
  const optionalStatKeys = [
    'freeRecallSolved',
    'fluentPlaysCount',
    'checkpointsPassed',
    'clozeSolved',
    'hintsUsedCount',
  ] as const;
  for (const key of optionalStatKeys) {
    if (raw.stats[key] !== undefined && !isNonNegNumber(raw.stats[key])) {
      return { ok: false, error: `${prefix}.stats.${key} must be a non-negative number.` };
    }
  }

  if (!isPlainObject(raw.languageProgress)) {
    return { ok: false, error: `${prefix}.languageProgress must be an object.` };
  }
  const rawLangProgress = raw.languageProgress;
  const allowedCheckLangs: readonly LanguageCode[] = adultModeUnlocked
    ? ALL_LANGUAGE_LIST
    : LANGUAGE_LIST;
  const hasAtLeastOneValidLang = allowedCheckLangs.some(
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

  const validatedLangProgress = {} as LanguageProgressMap;
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

  if (adultModeUnlocked) {
    for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
      const rawEntry = rawLangProgress[lang];
      if (rawEntry === undefined) {
        validatedLangProgress[lang] = emptyLangProgress();
        continue;
      }
      const res = validateLangProgress(rawEntry, `${prefix}.languageProgress.${lang}`);
      if (!res.ok) return res;
      validatedLangProgress[lang] = res.value;
    }
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
  const hydratedUnlockedAvatars = Array.from(
    new Set([
      ...STARTER_AVATAR_IDS,
      ...((raw.unlockedAvatars as AvatarId[] | undefined) ?? []),
      raw.avatarId as AvatarId,
    ])
  );

  return {
    ok: true,
    value: {
      id: profileId,
      name: raw.name.trim(),
      avatarId: raw.avatarId as AvatarId,
      bannerColor: raw.bannerColor.trim(),
      activeLanguage,
      lastBaseLanguage,
      adultModeUnlocked,
      adultModeActive,
      gems: Math.floor(raw.gems),
      hearts: Math.min(maxHearts, Math.floor(raw.hearts)),
      maxHearts,
      streakDays: Math.floor(raw.streakDays),
      lastPracticeISO: raw.lastPracticeISO,
      streakShields: Math.floor(raw.streakShields),
      heartElixirs: raw.heartElixirs !== undefined ? Math.floor(raw.heartElixirs) : 0,
      xpBoosterCharges:
        raw.xpBoosterCharges !== undefined ? Math.floor(raw.xpBoosterCharges) : 0,
      unlockedAvatars: hydratedUnlockedAvatars,
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
        freeRecallSolved:
          raw.stats.freeRecallSolved !== undefined
            ? Math.floor(raw.stats.freeRecallSolved as number)
            : 0,
        fluentPlaysCount:
          raw.stats.fluentPlaysCount !== undefined
            ? Math.floor(raw.stats.fluentPlaysCount as number)
            : 0,
        checkpointsPassed:
          raw.stats.checkpointsPassed !== undefined
            ? Math.floor(raw.stats.checkpointsPassed as number)
            : 0,
        clozeSolved:
          raw.stats.clozeSolved !== undefined ? Math.floor(raw.stats.clozeSolved as number) : 0,
        hintsUsedCount:
          raw.stats.hintsUsedCount !== undefined
            ? Math.floor(raw.stats.hintsUsedCount as number)
            : 0,
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
  const isDefaultKid = isDefaultKidProfileId(existing.id);
  const adultModeUnlocked =
    !isDefaultKid && Boolean(existing.adultModeUnlocked || incoming.adultModeUnlocked);
  const adultModeActive = adultModeUnlocked && Boolean(existing.adultModeActive);
  const lastBaseLanguage = resolveLastBaseLanguage({
    id: existing.id,
    lastBaseLanguage: existing.lastBaseLanguage ?? incoming.lastBaseLanguage,
    activeLanguage: existing.activeLanguage,
  });
  const activeLanguage: LanguageCode =
    adultModeActive && VALID_ALL_LANGUAGES.has(existing.activeLanguage)
      ? existing.activeLanguage
      : !isAdultLanguage(existing.activeLanguage) &&
          VALID_BASE_LANGUAGES.has(existing.activeLanguage)
        ? existing.activeLanguage
        : lastBaseLanguage;

  const langsToMerge: readonly LanguageCode[] = adultModeUnlocked
    ? ALL_LANGUAGE_LIST
    : LANGUAGE_LIST;
  const mergedLanguageProgress = {} as LanguageProgressMap;

  for (const lang of langsToMerge) {
    const a = existing.languageProgress[lang] ?? emptyLangProgress();
    const b = incoming.languageProgress[lang] ?? emptyLangProgress();
    const mergedStars: Record<string, 1 | 2 | 3> = { ...a.nodeStars };
    for (const [nodeId, star] of Object.entries(b.nodeStars)) {
      const prev = mergedStars[nodeId] ?? 0;
      mergedStars[nodeId] = Math.max(prev, star) as 1 | 2 | 3;
    }

    const mergedHintCounts: Record<string, number> = { ...(a.hintAssistedCounts ?? {}) };
    for (const [exId, count] of Object.entries(b.hintAssistedCounts ?? {})) {
      if (count > 0) {
        mergedHintCounts[exId] = Math.max(mergedHintCounts[exId] ?? 0, count);
      }
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
      unlockedTiers: Array.from(
        new Set([...(a.unlockedTiers ?? []), ...(b.unlockedTiers ?? [])])
      ),
      ...(Object.keys(mergedHintCounts).length > 0 ? { hintAssistedCounts: mergedHintCounts } : {}),
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
    activeLanguage,
    lastBaseLanguage,
    adultModeUnlocked,
    adultModeActive,
    gems: Math.max(existing.gems, incoming.gems),
    maxHearts,
    hearts: Math.min(maxHearts, Math.max(existing.hearts, incoming.hearts)),
    streakDays: Math.max(existing.streakDays, incoming.streakDays),
    lastPracticeISO,
    streakShields: Math.max(existing.streakShields, incoming.streakShields),
    heartElixirs: Math.max(existing.heartElixirs ?? 0, incoming.heartElixirs ?? 0),
    xpBoosterCharges: Math.max(existing.xpBoosterCharges ?? 0, incoming.xpBoosterCharges ?? 0),
    unlockedAvatars: Array.from(
      new Set([
        ...STARTER_AVATAR_IDS,
        ...(existing.unlockedAvatars ?? []),
        ...(incoming.unlockedAvatars ?? []),
        existing.avatarId,
      ])
    ),
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
      freeRecallSolved: Math.max(
        existing.stats.freeRecallSolved ?? 0,
        incoming.stats.freeRecallSolved ?? 0
      ),
      fluentPlaysCount: Math.max(
        existing.stats.fluentPlaysCount ?? 0,
        incoming.stats.fluentPlaysCount ?? 0
      ),
      checkpointsPassed: Math.max(
        existing.stats.checkpointsPassed ?? 0,
        incoming.stats.checkpointsPassed ?? 0
      ),
      clozeSolved: Math.max(existing.stats.clozeSolved ?? 0, incoming.stats.clozeSolved ?? 0),
      hintsUsedCount: Math.max(
        existing.stats.hintsUsedCount ?? 0,
        incoming.stats.hintsUsedCount ?? 0
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

function generateUniqueProfileId(
  name: string,
  existingProfiles: readonly KidProfile[],
  prefix: 'kid' | 'adult' = 'kid'
): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 16) || 'explorer';
  const existingIds = new Set(existingProfiles.map((p) => p.id));
  let candidate = `${prefix}-${slug}`;
  if (!existingIds.has(candidate) && !isDefaultKidProfileId(candidate)) return candidate;

  do {
    profileSequenceCounter += 1;
    candidate = `${prefix}-${slug}-${Date.now().toString(36)}-${profileSequenceCounter}`;
  } while (existingIds.has(candidate) || isDefaultKidProfileId(candidate));

  return candidate;
}

function getActiveProfileSnapshot(): KidProfile | undefined {
  return (
    memoryVault.profiles.find((p) => p.id === memoryVault.activeProfileId) ??
    memoryVault.profiles[0]
  );
}

function resolveBoostedXp(
  profile: KidProfile,
  rawXp: number
): { earnedXp: number; nextBoosterCharges: number } {
  const safeXp = Number.isFinite(rawXp) ? Math.max(0, Math.round(rawXp)) : 0;
  const charges = profile.xpBoosterCharges ?? 0;
  if (safeXp > 0 && charges > 0) {
    return {
      earnedXp: safeXp * 2,
      nextBoosterCharges: charges - 1,
    };
  }
  return {
    earnedXp: safeXp,
    nextBoosterCharges: charges,
  };
}

function applyTierUnlockToLangProgress(
  langProg: LanguageProgressState,
  params: {
    targetTier: Exclude<ProficiencyTier, 'A1'>;
    prerequisiteNodeIds?: readonly string[];
    targetUnitIndex?: number;
  }
): LanguageProgressState {
  const validPrereqs = (params.prerequisiteNodeIds ?? []).filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  );
  const nextStars: Record<string, 1 | 2 | 3> = { ...langProg.nodeStars };
  for (const prereqId of validPrereqs) {
    if (nextStars[prereqId] === undefined) {
      nextStars[prereqId] = 2;
    }
  }
  const nextUnitIndex =
    params.targetUnitIndex !== undefined && Number.isFinite(params.targetUnitIndex)
      ? Math.max(0, Math.floor(params.targetUnitIndex))
      : langProg.currentUnitIndex;

  return {
    ...langProg,
    completedNodeIds: Array.from(new Set([...langProg.completedNodeIds, ...validPrereqs])),
    nodeStars: nextStars,
    unlockedTiers: Array.from(new Set([...(langProg.unlockedTiers ?? []), params.targetTier])),
    currentUnitIndex: nextUnitIndex,
  };
}

function bumpProfileStat(
  key: 'turtlePlaysCount' | 'fluentPlaysCount' | 'freeRecallSolved' | 'clozeSolved' | 'hintsUsedCount'
): void {
  updateActiveProfile((profile) => {
    const updated: KidProfile = {
      ...profile,
      stats: {
        ...profile.stats,
        [key]: (profile.stats[key] ?? 0) + 1,
      },
    };
    return {
      ...updated,
      badges: evaluateUnlockedBadges(updated),
    };
  });
}

function awardArcadeResultToProfile(params: {
  gameId: string;
  score: number;
  heartsWon: number;
  bonusGems: number;
  xpEarned?: number;
  preserveXpBooster?: boolean;
}): void {
  updateActiveProfile((profile) => {
    const safeScore = Number.isFinite(params.score) ? Math.max(0, Math.floor(params.score)) : 0;
    const heartsWon = Number.isFinite(params.heartsWon)
      ? Math.max(0, Math.floor(params.heartsWon))
      : 0;
    const bonusGems = Number.isFinite(params.bonusGems)
      ? Math.max(0, Math.floor(params.bonusGems))
      : 0;
    const rawXp = Number.isFinite(params.xpEarned ?? 15)
      ? Math.max(0, Math.round(params.xpEarned ?? 15))
      : 15;
    const { earnedXp, nextBoosterCharges } = params.preserveXpBooster
      ? { earnedXp: rawXp, nextBoosterCharges: profile.xpBoosterCharges ?? 0 }
      : resolveBoostedXp(profile, rawXp);
    const prevScores = profile.arcadeHighScores ?? {};
    const nextBest = Math.max(prevScores[params.gameId] ?? 0, safeScore);
    const activeLang = profile.activeLanguage;
    const langProg = profile.languageProgress[activeLang] ?? emptyLangProgress();
    const nextWeeklyXp = profile.weeklyXp + earnedXp;

    const updated: KidProfile = {
      ...profile,
      hearts: Math.min(profile.maxHearts, profile.hearts + heartsWon),
      gems: profile.gems + bonusGems,
      xpBoosterCharges: nextBoosterCharges,
      weeklyXp: nextWeeklyXp,
      totalXp: profile.totalXp + earnedXp,
      leagueTier: resolveLeagueTierForXp(nextWeeklyXp, profile.leagueTier),
      arcadeHighScores: {
        ...prevScores,
        [params.gameId]: nextBest,
      },
      secretArcadeBestScore:
        params.gameId === 'starlight_choir'
          ? Math.max(profile.secretArcadeBestScore ?? 0, safeScore)
          : profile.secretArcadeBestScore,
      stats: {
        ...profile.stats,
        arcadeGamesWon: profile.stats.arcadeGamesWon + 1,
      },
      languageProgress: withUpdatedLanguageProgress(profile, activeLang, {
        ...langProg,
        xpEarned: langProg.xpEarned + earnedXp,
      }),
    };

    return {
      ...updated,
      badges: evaluateUnlockedBadges(updated),
    };
  });
}

export const vaultActions = {
  switchProfile(profileId: string): void {
    const target = memoryVault.profiles.find((p) => p.id === profileId);
    if (!target) return;
    if (memoryVault.activeProfileId === profileId) return;

    const targetIsAdultActive = canUseAdultMode(target) && Boolean(target.adultModeActive);
    const nextProfiles = targetIsAdultActive
      ? memoryVault.profiles
      : memoryVault.profiles.map((p) => {
          if (p.id === profileId) return p;
          if (!p.adultModeActive && !isAdultLanguage(p.activeLanguage)) return p;
          return disarmProfileAdultMode(p);
        });

    commitVault({
      ...memoryVault,
      activeProfileId: profileId,
      profiles: nextProfiles,
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
    const activeLanguage: BaseLanguageCode =
      input.activeLanguage && VALID_BASE_LANGUAGES.has(input.activeLanguage as BaseLanguageCode)
        ? (input.activeLanguage as BaseLanguageCode)
        : 'es';
    const id = generateUniqueProfileId(cleanName, memoryVault.profiles);

    const created = makeFreshProfile({
      id,
      name: cleanName,
      avatarId,
      bannerColor,
      activeLanguage,
      lastBaseLanguage: activeLanguage,
      adultModeUnlocked: false,
      adultModeActive: false,
      gems: 80,
    });

    commitVault({
      ...memoryVault,
      activeProfileId: created.id,
      profiles: [...memoryVault.profiles, created],
    });

    return created;
  },

  verifyAdultEasterEggCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    const normalized = code.trim().toUpperCase();
    return (ADULT_EASTER_EGG_CODES as readonly string[]).includes(normalized);
  },

  unlockAdultMode(options?: {
    adultProfileName?: string;
    initialTrack?: AdultLanguageCode;
  }): KidProfile {
    const requestedTrack: AdultLanguageCode | undefined =
      options?.initialTrack && VALID_ADULT_LANGUAGES.has(options.initialTrack)
        ? options.initialTrack
        : undefined;
    const active = getActiveProfileSnapshot();

    if (!active || isDefaultKidProfileId(active.id)) {
      const inheritedBaseLanguage: BaseLanguageCode =
        active &&
        !isAdultLanguage(active.activeLanguage) &&
        VALID_BASE_LANGUAGES.has(active.activeLanguage)
          ? active.activeLanguage
          : active
            ? resolveLastBaseLanguage(active)
            : 'en';
      const existingAdult = memoryVault.profiles.find((p) => canUseAdultMode(p));
      if (existingAdult) {
        const nextTrack: AdultLanguageCode =
          requestedTrack ??
          (isAdultLanguage(existingAdult.activeLanguage) ? existingAdult.activeLanguage : 'ebonics');
        const updatedAdult: KidProfile = {
          ...existingAdult,
          adultModeUnlocked: true,
          adultModeActive: true,
          lastBaseLanguage: existingAdult.lastBaseLanguage
            ? resolveLastBaseLanguage(existingAdult)
            : inheritedBaseLanguage,
          activeLanguage: nextTrack,
          languageProgress: buildLanguageProgressMap(existingAdult.languageProgress, true, false),
        };
        const nextProfiles = memoryVault.profiles.map((p) =>
          p.id === existingAdult.id ? updatedAdult : p
        );
        commitVault({
          ...memoryVault,
          activeProfileId: updatedAdult.id,
          profiles: nextProfiles,
        });
        return updatedAdult;
      }

      const cleanName = options?.adultProfileName?.trim() || 'After-Hours';
      const id = generateUniqueProfileId(cleanName, memoryVault.profiles, 'adult');
      const created = makeFreshProfile({
        id,
        name: cleanName,
        avatarId: 'star_compass',
        bannerColor: '#7C3AED',
        activeLanguage: requestedTrack ?? 'ebonics',
        lastBaseLanguage: inheritedBaseLanguage,
        adultModeUnlocked: true,
        adultModeActive: true,
        gems: 80,
      });

      commitVault({
        ...memoryVault,
        activeProfileId: created.id,
        profiles: [...memoryVault.profiles, created],
      });
      return created;
    }

    updateActiveProfile((profile) => {
      const lastBaseLanguage = resolveLastBaseLanguage(profile);
      const nextTrack: AdultLanguageCode =
        requestedTrack ??
        (profile.adultModeActive && isAdultLanguage(profile.activeLanguage)
          ? profile.activeLanguage
          : 'ebonics');
      return {
        ...profile,
        adultModeUnlocked: true,
        adultModeActive: true,
        lastBaseLanguage,
        activeLanguage: nextTrack,
        languageProgress: buildLanguageProgressMap(profile.languageProgress, true, false),
      };
    });

    return getActiveProfileSnapshot()!;
  },

  setAdultModeActive(active: boolean): void {
    updateActiveProfile((profile) => {
      if (!active) {
        const fallbackBase = resolveLastBaseLanguage(profile);
        if (
          !profile.adultModeActive &&
          profile.activeLanguage === fallbackBase &&
          profile.lastBaseLanguage === fallbackBase
        ) {
          return profile;
        }
        return {
          ...profile,
          adultModeActive: false,
          lastBaseLanguage: fallbackBase,
          activeLanguage: fallbackBase,
        };
      }

      if (!canUseAdultMode(profile)) return profile;
      const lastBaseLanguage = resolveLastBaseLanguage(profile);
      const nextLanguage: LanguageCode = isAdultLanguage(profile.activeLanguage)
        ? profile.activeLanguage
        : 'ebonics';
      return {
        ...profile,
        adultModeActive: true,
        lastBaseLanguage,
        activeLanguage: nextLanguage,
        languageProgress: buildLanguageProgressMap(profile.languageProgress, true, false),
      };
    });
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
    if (!VALID_ALL_LANGUAGES.has(lang)) return;
    updateActiveProfile((profile) => {
      if (isAdultLanguage(lang)) {
        if (!canUseAdultMode(profile) || !profile.adultModeActive) return profile;
        const preservedLastBase = resolveLastBaseLanguage(profile);
        const hasAllAdultKeys = ADULT_EASTER_EGG_LANGUAGES.every(
          (code) => profile.languageProgress[code] !== undefined
        );
        if (
          profile.activeLanguage === lang &&
          profile.lastBaseLanguage === preservedLastBase &&
          hasAllAdultKeys
        ) {
          return profile;
        }
        return {
          ...profile,
          activeLanguage: lang,
          lastBaseLanguage: preservedLastBase,
          languageProgress: buildLanguageProgressMap(profile.languageProgress, true, false),
        };
      }

      if (profile.activeLanguage === lang && profile.lastBaseLanguage === lang) {
        return profile;
      }
      return {
        ...profile,
        activeLanguage: lang,
        lastBaseLanguage: lang,
      };
    });
  },

  setCurrentUnitIndex(lang: LanguageCode, unitIndex: number): void {
    if (!VALID_ALL_LANGUAGES.has(lang)) return;
    const safeUnitIndex = Number.isFinite(unitIndex) ? Math.max(0, Math.floor(unitIndex)) : 0;
    updateActiveProfile((profile) => {
      if (isAdultLanguage(lang) && !canUseAdultMode(profile)) return profile;
      const langProg = profile.languageProgress[lang] ?? emptyLangProgress();
      if (langProg.currentUnitIndex === safeUnitIndex) return profile;
      return {
        ...profile,
        languageProgress: withUpdatedLanguageProgress(profile, lang, {
          ...langProg,
          currentUnitIndex: safeUnitIndex,
        }),
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
    bumpProfileStat('turtlePlaysCount');
  },

  recordFluentPlay(): void {
    bumpProfileStat('fluentPlaysCount');
  },

  recordFreeRecallSolve(): void {
    bumpProfileStat('freeRecallSolved');
  },

  recordClozeSolve(): void {
    bumpProfileStat('clozeSolved');
  },

  recordHintUsed(): void {
    bumpProfileStat('hintsUsedCount');
  },

  unlockProficiencyTier(params: {
    language: LanguageCode;
    targetTier: Exclude<ProficiencyTier, 'A1'>;
    prerequisiteNodeIds: readonly string[];
    targetUnitIndex: number;
  }): void {
    if (!VALID_ALL_LANGUAGES.has(params.language)) return;
    if (!VALID_UNLOCKABLE_TIERS.has(params.targetTier)) return;

    updateActiveProfile((profile) => {
      if (isAdultLanguage(params.language) && !canUseAdultMode(profile)) return profile;
      const langProg = profile.languageProgress[params.language] ?? emptyLangProgress();
      const nextLangProg = applyTierUnlockToLangProgress(langProg, params);
      const updated: KidProfile = {
        ...profile,
        stats: {
          ...profile.stats,
          checkpointsPassed: (profile.stats.checkpointsPassed ?? 0) + 1,
        },
        languageProgress: withUpdatedLanguageProgress(profile, params.language, nextLangProg),
      };

      const withStreak = applyDailyPracticeStreak(updated);
      return {
        ...withStreak,
        badges: evaluateUnlockedBadges(withStreak),
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
    checkpointUnlock?: {
      targetTier: Exclude<ProficiencyTier, 'A1'>;
      prerequisiteNodeIds?: readonly string[];
      targetUnitIndex?: number;
    };
  }): void {
    if (!VALID_ALL_LANGUAGES.has(params.language)) return;
    updateActiveProfile((profile) => {
      if (isAdultLanguage(params.language) && !canUseAdultMode(profile)) return profile;
      const langProg = profile.languageProgress[params.language] ?? emptyLangProgress();
      const { earnedXp, nextBoosterCharges } = resolveBoostedXp(profile, params.xpEarned);
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

      let nextLangProg: LanguageProgressState = {
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
        xpEarned: langProg.xpEarned + earnedXp,
      };

      const checkpointUnlock =
        params.checkpointUnlock && VALID_UNLOCKABLE_TIERS.has(params.checkpointUnlock.targetTier)
          ? params.checkpointUnlock
          : undefined;

      if (checkpointUnlock) {
        nextLangProg = applyTierUnlockToLangProgress(nextLangProg, checkpointUnlock);
      }

      const nextWeeklyXp = profile.weeklyXp + earnedXp;
      const nextTotalXp = profile.totalXp + earnedXp;
      const isCheckpoint = Boolean(checkpointUnlock);
      const isLesson = !params.isStory && !params.isBoss && !params.isChest && !isCheckpoint;
      const nextLessonsCompleted = profile.stats.lessonsCompleted + (isLesson ? 1 : 0);

      const nextLanguageProgress = withUpdatedLanguageProgress(
        profile,
        params.language,
        nextLangProg
      );
      const trackedLangs: readonly LanguageCode[] = canUseAdultMode(profile)
        ? ALL_LANGUAGE_LIST
        : LANGUAGE_LIST;
      const totalCompletedNodes = trackedLangs.reduce(
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
        xpBoosterCharges: nextBoosterCharges,
        weeklyXp: nextWeeklyXp,
        totalXp: nextTotalXp,
        leagueTier: resolveLeagueTierForXp(nextWeeklyXp, profile.leagueTier),
        secretArcadeUnlocked: shouldUnlockSecretArcade,
        stats: {
          ...profile.stats,
          lessonsCompleted: nextLessonsCompleted,
          storiesCompleted: profile.stats.storiesCompleted + (params.isStory ? 1 : 0),
          bossesCleared: profile.stats.bossesCleared + (params.isBoss ? 1 : 0),
          checkpointsPassed: (profile.stats.checkpointsPassed ?? 0) + (isCheckpoint ? 1 : 0),
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

  recordSeenExercises(
    lang: LanguageCode,
    exerciseIds: readonly string[],
    hintAssistedMap?: Readonly<Record<string, number>>
  ): void {
    if (!VALID_ALL_LANGUAGES.has(lang) || exerciseIds.length === 0) return;
    updateActiveProfile((profile) => {
      if (isAdultLanguage(lang) && !canUseAdultMode(profile)) return profile;
      const langProg = profile.languageProgress[lang] ?? emptyLangProgress();
      const existing = langProg.seenExerciseIds ?? [];
      const prevHintCounts = langProg.hintAssistedCounts ?? {};
      const hasIncomingHints = Boolean(
        hintAssistedMap && Object.values(hintAssistedMap).some((v) => v > 0)
      );
      const hasExistingHints = Object.keys(prevHintCounts).length > 0;

      if (!hasIncomingHints && !hasExistingHints) {
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
          languageProgress: withUpdatedLanguageProgress(profile, lang, {
            ...langProg,
            seenExerciseIds: nextSeen,
          }),
        };
      }

      // SRS-aware update: elevate hint-assisted exercises toward the front of seenExerciseIds
      // so they resurface sooner, while graduating items solved unassisted.
      const nextHintCounts: Record<string, number> = { ...prevHintCounts };
      for (const rawId of exerciseIds) {
        if (typeof rawId !== 'string' || rawId.length === 0) continue;
        const used = hintAssistedMap?.[rawId] ?? 0;
        if (used > 0) {
          nextHintCounts[rawId] = (nextHintCounts[rawId] ?? 0) + Math.floor(used);
        } else if (hintAssistedMap && nextHintCounts[rawId] !== undefined) {
          if (nextHintCounts[rawId] > 1) {
            nextHintCounts[rawId] -= 1;
          } else {
            delete nextHintCounts[rawId];
          }
        }
      }

      const uniqueIds: string[] = [];
      const seenSet = new Set<string>();
      for (const id of existing) {
        if (id && !seenSet.has(id)) {
          seenSet.add(id);
          uniqueIds.push(id);
        }
      }
      for (const id of exerciseIds) {
        if (typeof id === 'string' && id.length > 0 && !seenSet.has(id)) {
          seenSet.add(id);
          uniqueIds.push(id);
        }
      }

      const assisted = uniqueIds
        .filter((id) => (nextHintCounts[id] ?? 0) > 0)
        .sort((a, b) => (nextHintCounts[b] ?? 0) - (nextHintCounts[a] ?? 0));
      const unassisted = uniqueIds.filter((id) => (nextHintCounts[id] ?? 0) <= 0);
      const keepAssisted = assisted.slice(0, MAX_SEEN_EXERCISES);
      const remainingCap = Math.max(0, MAX_SEEN_EXERCISES - keepAssisted.length);
      const nextSeen = [...keepAssisted, ...unassisted.slice(Math.max(0, unassisted.length - remainingCap))];

      const nextLangProg: LanguageProgressState = {
        ...langProg,
        seenExerciseIds: nextSeen,
      };
      if (Object.keys(nextHintCounts).length > 0) {
        nextLangProg.hintAssistedCounts = nextHintCounts;
      } else {
        delete nextLangProg.hintAssistedCounts;
      }

      return {
        ...profile,
        languageProgress: withUpdatedLanguageProgress(profile, lang, nextLangProg),
      };
    });
  },

  unlockSecretArcade(): boolean {
    const activeProfile = getActiveProfileSnapshot();
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
    xpEarned?: number;
  }): void {
    awardArcadeResultToProfile({
      gameId: 'starlight_choir',
      score: params.score,
      heartsWon: params.heartsWon,
      bonusGems: params.bonusGems,
      xpEarned: params.xpEarned,
    });
  },

  recordArcadeGameResult(params: {
    gameId: string;
    score: number;
    heartsWon: number;
    bonusGems: number;
    xpEarned?: number;
    preserveXpBooster?: boolean;
  }): void {
    const cleanGameId = typeof params.gameId === 'string' ? params.gameId.trim() : '';
    if (!cleanGameId) return;

    awardArcadeResultToProfile({
      gameId: cleanGameId,
      score: params.score,
      heartsWon: params.heartsWon,
      bonusGems: params.bonusGems,
      xpEarned: params.xpEarned,
      preserveXpBooster: params.preserveXpBooster,
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

    const activeProfile = getActiveProfileSnapshot();
    if (!activeProfile) return false;

    const alreadyOwned = activeProfile.unlockedCosmetics.includes(cosmeticId);
    if (!alreadyOwned && activeProfile.gems < item.costGems) {
      return false;
    }

    updateActiveProfile((profile) => {
      const ownedNow = profile.unlockedCosmetics.includes(cosmeticId);
      if (!ownedNow && profile.gems < item.costGems) return profile;

      const updated: KidProfile = {
        ...profile,
        gems: ownedNow ? profile.gems : profile.gems - item.costGems,
        unlockedCosmetics: ownedNow
          ? profile.unlockedCosmetics
          : [...profile.unlockedCosmetics, cosmeticId],
        equippedCosmetics: {
          ...profile.equippedCosmetics,
          [item.slot]: cosmeticId,
        },
      };

      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });

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
    const activeProfile = getActiveProfileSnapshot();
    if (!activeProfile || activeProfile.gems < STREAK_SHIELD_COST_GEMS) {
      return false;
    }

    updateActiveProfile((profile) => {
      if (profile.gems < STREAK_SHIELD_COST_GEMS) return profile;
      return {
        ...profile,
        gems: profile.gems - STREAK_SHIELD_COST_GEMS,
        streakShields: profile.streakShields + 1,
      };
    });

    return true;
  },

  buyHeartElixir(): boolean {
    const activeProfile = getActiveProfileSnapshot();
    if (!activeProfile || activeProfile.gems < HEART_ELIXIR_COST_GEMS) {
      return false;
    }

    updateActiveProfile((profile) => {
      if (profile.gems < HEART_ELIXIR_COST_GEMS) return profile;
      const needsImmediateRefill = profile.hearts < profile.maxHearts;
      return {
        ...profile,
        gems: profile.gems - HEART_ELIXIR_COST_GEMS,
        hearts: needsImmediateRefill ? profile.maxHearts : profile.hearts,
        heartElixirs: needsImmediateRefill
          ? (profile.heartElixirs ?? 0)
          : (profile.heartElixirs ?? 0) + 1,
      };
    });

    return true;
  },

  useHeartElixir(): boolean {
    const activeProfile = getActiveProfileSnapshot();
    if (
      !activeProfile ||
      (activeProfile.heartElixirs ?? 0) <= 0 ||
      activeProfile.hearts >= activeProfile.maxHearts
    ) {
      return false;
    }

    updateActiveProfile((profile) => {
      const currentElixirs = profile.heartElixirs ?? 0;
      if (currentElixirs <= 0 || profile.hearts >= profile.maxHearts) {
        return profile;
      }
      return {
        ...profile,
        heartElixirs: currentElixirs - 1,
        hearts: profile.maxHearts,
      };
    });

    return true;
  },

  buyHeartCrystal(): boolean {
    const activeProfile = getActiveProfileSnapshot();
    if (
      !activeProfile ||
      activeProfile.maxHearts >= MAX_HEART_CONTAINERS ||
      activeProfile.gems < HEART_CRYSTAL_COST_GEMS
    ) {
      return false;
    }

    updateActiveProfile((profile) => {
      if (
        profile.maxHearts >= MAX_HEART_CONTAINERS ||
        profile.gems < HEART_CRYSTAL_COST_GEMS
      ) {
        return profile;
      }
      const nextMax = Math.min(MAX_HEART_CONTAINERS, profile.maxHearts + 1);
      const nextHearts = Math.min(nextMax, profile.hearts + 1);
      const updated: KidProfile = {
        ...profile,
        gems: profile.gems - HEART_CRYSTAL_COST_GEMS,
        maxHearts: nextMax,
        hearts: nextHearts,
      };
      return {
        ...updated,
        badges: evaluateUnlockedBadges(updated),
      };
    });

    return true;
  },

  buyXpBooster(): boolean {
    const activeProfile = getActiveProfileSnapshot();
    if (!activeProfile || activeProfile.gems < XP_BOOSTER_COST_GEMS) {
      return false;
    }

    updateActiveProfile((profile) => {
      if (profile.gems < XP_BOOSTER_COST_GEMS) return profile;
      return {
        ...profile,
        gems: profile.gems - XP_BOOSTER_COST_GEMS,
        xpBoosterCharges: (profile.xpBoosterCharges ?? 0) + XP_BOOSTER_CHARGES_PER_BUY,
      };
    });

    return true;
  },

  buyAndSelectAvatar(avatarId: AvatarId): boolean {
    if (!VALID_AVATARS.has(avatarId)) return false;
    const activeProfile = getActiveProfileSnapshot();
    if (!activeProfile) return false;

    const currentUnlocked = activeProfile.unlockedAvatars ?? [...STARTER_AVATAR_IDS];
    const isStarter = STARTER_AVATAR_IDS.includes(avatarId);
    const alreadyUnlocked = isStarter || currentUnlocked.includes(avatarId);
    const cost = alreadyUnlocked ? 0 : (UNLOCKABLE_AVATAR_COSTS[avatarId] ?? 0);
    if (!alreadyUnlocked && activeProfile.gems < cost) {
      return false;
    }

    updateActiveProfile((profile) => {
      const unlocked = profile.unlockedAvatars ?? [...STARTER_AVATAR_IDS];
      const ownedNow = STARTER_AVATAR_IDS.includes(avatarId) || unlocked.includes(avatarId);
      const requiredCost = ownedNow ? 0 : (UNLOCKABLE_AVATAR_COSTS[avatarId] ?? 0);
      if (!ownedNow && profile.gems < requiredCost) return profile;

      return {
        ...profile,
        gems: profile.gems - requiredCost,
        unlockedAvatars: Array.from(new Set([...STARTER_AVATAR_IDS, ...unlocked, avatarId])),
        avatarId,
      };
    });

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
