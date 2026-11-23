import {
  ADULT_EASTER_EGG_LANGUAGES,
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_LIST,
  MAX_HEART_CONTAINERS,
  isDefaultKidProfileId,
  type AvatarId,
  type BadgeDefinition,
  type BadgeId,
  type HintTier,
  type KidProfile,
  type LanguageCode,
  type LanguageProgressState,
  type LeagueEntry,
  type LeagueTier,
  type SrsReviewCandidate,
  type VocabMasteryEntry,
} from '../types/contracts';
import { computeFreeRecallHintedBonus } from './hintEngine';

const MS_PER_DAY = 86_400_000;

export function calculateComboMultiplier(comboCount: number): {
  multiplier: number;
  label: string;
  bonusGems: number;
} {
  const count = Number.isFinite(comboCount) ? Math.max(0, Math.floor(comboCount)) : 0;
  if (count >= 6) return { multiplier: 2.0, label: 'ON FIRE!', bonusGems: 3 };
  if (count >= 5) return { multiplier: 1.5, label: '5x', bonusGems: 2 };
  if (count >= 3) return { multiplier: 1.25, label: `${count}x`, bonusGems: 1 };
  if (count === 2) return { multiplier: 1, label: '2x', bonusGems: 0 };
  return { multiplier: 1, label: '', bonusGems: 0 };
}

export function calculateLessonRewards(params: {
  baseXp: number;
  baseGems: number;
  maxCombo: number;
  mistakesCount: number;
  freeRecallCount?: number;
  freeRecallHintTiers?: readonly HintTier[];
  maxHintTierUsed?: HintTier;
}): { xpEarned: number; gemsEarned: number; stars: 1 | 2 | 3 } {
  const baseXp = Math.max(0, Math.round(params.baseXp));
  const baseGems = Math.max(0, Math.round(params.baseGems));
  const mistakes = Math.max(0, Math.floor(params.mistakesCount));
  const stars: 1 | 2 | 3 = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  const combo = calculateComboMultiplier(params.maxCombo);
  const maxHintTierUsed = params.maxHintTierUsed ?? 0;
  let starXpBonus = baseXp > 0 ? (stars === 3 ? 5 : stars === 2 ? 2 : 0) : 0;
  if (stars === 3 && baseXp > 0 && maxHintTierUsed >= 2) {
    starXpBonus = maxHintTierUsed >= 3 ? 3 : 4;
  }
  const starGemBonus = baseGems > 0 && stars === 3 ? 2 : 0;

  let freeRecallXpBonus = 0;
  let freeRecallGemBonus = 0;
  if (params.freeRecallHintTiers && params.freeRecallHintTiers.length > 0) {
    for (const tier of params.freeRecallHintTiers) {
      const bonus = computeFreeRecallHintedBonus(tier);
      freeRecallXpBonus += bonus.xp;
      freeRecallGemBonus += bonus.gems;
    }
  } else {
    const freeRecallSolves =
      typeof params.freeRecallCount === 'number' && Number.isFinite(params.freeRecallCount)
        ? Math.max(0, Math.floor(params.freeRecallCount))
        : 0;
    freeRecallXpBonus = freeRecallSolves * FREE_RECALL_BONUS_XP;
    freeRecallGemBonus = freeRecallSolves * FREE_RECALL_BONUS_GEMS;
  }

  return {
    xpEarned: Math.round(baseXp * combo.multiplier) + starXpBonus + freeRecallXpBonus,
    gemsEarned: baseGems + combo.bonusGems + starGemBonus + freeRecallGemBonus,
    stars,
  };
}

function formatLocalDayISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseCalendarDay(iso: string): { dayStr: string; utcMs: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utcMs = Date.UTC(year, month - 1, day);
    if (!Number.isNaN(utcMs)) {
      return {
        dayStr: `${match[1]}-${match[2]}-${match[3]}`,
        utcMs,
      };
    }
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return {
    dayStr: `${year}-${month}-${day}`,
    utcMs: Date.UTC(year, parsed.getUTCMonth(), parsed.getUTCDate()),
  };
}

export function applyDailyPracticeStreak(profile: KidProfile, todayISO?: string): KidProfile {
  const todayParsed = parseCalendarDay(todayISO ?? formatLocalDayISO());
  const todayDayStr = todayParsed?.dayStr ?? formatLocalDayISO();
  const todayUtcMs = todayParsed?.utcMs ?? parseCalendarDay(todayDayStr)!.utcMs;

  if (!profile.lastPracticeISO) {
    return {
      ...profile,
      streakDays: Math.max(1, profile.streakDays),
      lastPracticeISO: todayDayStr,
    };
  }

  const lastParsed = parseCalendarDay(profile.lastPracticeISO);
  if (!lastParsed) {
    return {
      ...profile,
      streakDays: Math.max(1, profile.streakDays),
      lastPracticeISO: todayDayStr,
    };
  }

  const diffDays = Math.round((todayUtcMs - lastParsed.utcMs) / MS_PER_DAY);

  if (diffDays <= 0) {
    return {
      ...profile,
      streakDays: Math.max(1, profile.streakDays),
      lastPracticeISO: diffDays === 0 ? todayDayStr : profile.lastPracticeISO,
    };
  }

  if (diffDays === 1) {
    return {
      ...profile,
      streakDays: Math.max(1, profile.streakDays) + 1,
      lastPracticeISO: todayDayStr,
    };
  }

  if (diffDays === 2 && profile.streakShields > 0) {
    return {
      ...profile,
      streakDays: Math.max(1, profile.streakDays) + 1,
      streakShields: profile.streakShields - 1,
      lastPracticeISO: todayDayStr,
    };
  }

  return {
    ...profile,
    streakDays: 1,
    lastPracticeISO: todayDayStr,
  };
}

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    id: 'first_hello',
    name: 'First Hello',
    description: 'Complete your very first expedition lesson.',
    iconKey: 'wave_hello',
    targetCount: 1,
  },
  {
    id: 'polyglot_explorer',
    name: 'Polyglot Explorer',
    description: 'Practice and earn XP in at least 2 different languages.',
    iconKey: 'compass_map',
    targetCount: 2,
  },
  {
    id: 'turtle_listener',
    name: 'Wise Turtle Listener',
    description: 'Use the 0.65x Turtle slow-speech button 5 times.',
    iconKey: 'wise_turtle',
    targetCount: 5,
  },
  {
    id: 'combo_comet',
    name: 'Combo Comet',
    description: 'Hit a 5x answer streak combo during a lesson.',
    iconKey: 'party_confetti',
    targetCount: 5,
  },
  {
    id: 'phrasebook_collector',
    name: 'Phrasebook Collector',
    description: 'Unlock 15 illustrated stickers in your Living Phrasebook.',
    iconKey: 'museum_lantern',
    targetCount: 15,
  },
  {
    id: 'arcade_ace',
    name: 'Sky-Catcher Ace',
    description: 'Win 3 rounds in the Sky-Catcher Arcade.',
    iconKey: 'songbird_branch',
    targetCount: 3,
  },
  {
    id: 'boss_befriender',
    name: 'Boss Befriender',
    description: 'Clear your first Companion Boss Gauntlet.',
    iconKey: 'friendly_handshake',
    targetCount: 1,
  },
  {
    id: 'accent_scholar',
    name: 'Accent Scholar',
    description: 'Discover 3 Accent Spotlight tips while practicing.',
    iconKey: 'delicious_sparkles',
    targetCount: 3,
  },
  {
    id: 'streak_spark',
    name: 'Streak Spark',
    description: 'Reach a 3-day practice streak.',
    iconKey: 'morning_sun',
    targetCount: 3,
  },
  {
    id: 'chest_hunter',
    name: 'Treasure Hunter',
    description: 'Open 2 Treasure Chests along the expedition map.',
    iconKey: 'treasure_count_ten',
    targetCount: 2,
  },
  {
    id: 'story_reader',
    name: 'Storybook Explorer',
    description: 'Complete 2 interactive Companion Mini-Stories.',
    iconKey: 'night_stars',
    targetCount: 2,
  },
  {
    id: 'starlight_master',
    name: 'Starlight Master',
    description: 'Earn 300 total XP across your language adventures.',
    iconKey: 'starlight_trophy',
    targetCount: 300,
  },
  {
    id: 'globe_trotter_5',
    name: 'Globe Trotter',
    description: 'Practice and earn XP in at least 5 different languages.',
    iconKey: 'travel_journal',
    targetCount: 5,
  },
  {
    id: 'grand_atlas_10',
    name: 'Grand Atlas Voyager',
    description: 'Practice and earn XP in at least 10 different languages.',
    iconKey: 'grand_symposium_globe',
    targetCount: 10,
  },
  {
    id: 'storyweaver_b1',
    name: 'Storyweaver (B1)',
    description: 'Unlock B1 tier or reach Unit 9 in any language course.',
    iconKey: 'campfire_story',
    targetCount: 9,
  },
  {
    id: 'diplomat_b2',
    name: 'Wayfinder Diplomat (B2)',
    description: 'Unlock B2 tier or reach Unit 12 in any language course.',
    iconKey: 'balance_scales',
    targetCount: 12,
  },
  {
    id: 'polyglot_laureate_c2',
    name: 'Polyglot Laureate (C1+)',
    description: 'Unlock C1+ tier or reach Unit 15 in any language course.',
    iconKey: 'crystal_owl_crest',
    targetCount: 15,
  },
  {
    id: 'free_recall_virtuoso',
    name: 'Free-Recall Virtuoso',
    description: 'Solve 5 challenges using Keyboard Free-Recall mode.',
    iconKey: 'quill_inkwell',
    targetCount: 5,
  },
  {
    id: 'nuance_detective',
    name: 'Nuance Detective',
    description: 'Complete 5 Context Cloze nuance puzzles across your expeditions.',
    iconKey: 'magnifying_discovery',
    targetCount: 5,
  },
  {
    id: 'fluent_listener',
    name: 'Fluent Ear',
    description: 'Practice listening with the 1.12x Fluent speech button 5 times.',
    iconKey: 'symphony_conductor',
    targetCount: 5,
  },
  {
    id: 'wardrobe_stylist',
    name: 'Wardrobe Stylist',
    description: 'Unlock 5 cosmetics, props, sidekick pets, or UI themes in the Shop.',
    iconKey: 'woven_tapestry',
    targetCount: 5,
  },
  {
    id: 'crystal_heart_guardian',
    name: 'Crystal Heart Guardian',
    description: 'Expand your Heart Containers up to the maximum of 8 with Heart Crystals.',
    iconKey: 'helping_hands',
    targetCount: MAX_HEART_CONTAINERS,
  },
  {
    id: 'arcade_champion',
    name: 'Arcade Champion',
    description: 'Win 10 rounds across any mini-games in the Arcade Hub.',
    iconKey: 'starlight_rocket',
    targetCount: 10,
  },
  {
    id: 'laureate_legend_xp',
    name: 'Laureate Legend',
    description: 'Earn 1,500 total XP across your global polyglot journey.',
    iconKey: 'laureate_wreath',
    targetCount: 1500,
  },
] as const;

function getMaxTierOrUnitReached(langProg: LanguageProgressState | undefined): number {
  if (!langProg) return 0;
  let best = 0;

  const tiers = langProg.unlockedTiers ?? [];
  if (tiers.includes('C1_C2')) best = Math.max(best, 15);
  else if (tiers.includes('B2')) best = Math.max(best, 12);
  else if (tiers.includes('B1')) best = Math.max(best, 9);
  else if (tiers.includes('A2')) best = Math.max(best, 5);

  const distinctUnits = new Set<number>();
  let maxCompletedUnit = 0;
  for (const nodeId of langProg.completedNodeIds) {
    const match = /-u(\d+)-/i.exec(nodeId);
    if (match) {
      const unitNum = Number(match[1]);
      if (Number.isFinite(unitNum) && unitNum > 0) {
        distinctUnits.add(unitNum);
        if (unitNum > maxCompletedUnit) {
          maxCompletedUnit = unitNum;
        }
      }
    }
  }

  return Math.max(best, distinctUnits.size, maxCompletedUnit);
}

function getRawBadgeProgress(badgeId: BadgeId, profile: KidProfile): number {
  const trackedLanguages: readonly LanguageCode[] =
    profile.adultModeUnlocked && !isDefaultKidProfileId(profile.id)
      ? [...LANGUAGE_LIST, ...ADULT_EASTER_EGG_LANGUAGES]
      : LANGUAGE_LIST;

  const languagesPracticed = trackedLanguages.filter(
    (lang) =>
      (profile.languageProgress[lang]?.xpEarned ?? 0) > 0 ||
      (profile.languageProgress[lang]?.completedNodeIds.length ?? 0) > 0
  ).length;

  const totalCompletedNodes = trackedLanguages.reduce(
    (sum, lang) => sum + (profile.languageProgress[lang]?.completedNodeIds.length ?? 0),
    0
  );

  const totalUnlockedStickers = trackedLanguages.reduce(
    (sum, lang) => sum + (profile.languageProgress[lang]?.unlockedVocabIds.length ?? 0),
    0
  );

  const totalClaimedChests = trackedLanguages.reduce(
    (sum, lang) => sum + (profile.languageProgress[lang]?.claimedChestIds.length ?? 0),
    0
  );

  const highestTierOrUnitAcrossLangs = trackedLanguages.reduce(
    (best, lang) => Math.max(best, getMaxTierOrUnitReached(profile.languageProgress[lang])),
    0
  );

  switch (badgeId) {
    case 'first_hello':
      return (
        profile.stats.lessonsCompleted +
        profile.stats.storiesCompleted +
        profile.stats.bossesCleared +
        totalCompletedNodes
      );
    case 'polyglot_explorer':
    case 'globe_trotter_5':
    case 'grand_atlas_10':
      return languagesPracticed;
    case 'turtle_listener':
      return profile.stats.turtlePlaysCount;
    case 'combo_comet':
      return profile.stats.bestComboStreak;
    case 'phrasebook_collector':
      return totalUnlockedStickers;
    case 'arcade_ace':
    case 'arcade_champion':
      return profile.stats.arcadeGamesWon;
    case 'boss_befriender':
      return profile.stats.bossesCleared;
    case 'accent_scholar':
      return profile.stats.accentSpotlightsSeen;
    case 'streak_spark':
      return profile.streakDays;
    case 'chest_hunter':
      return totalClaimedChests;
    case 'story_reader':
      return profile.stats.storiesCompleted;
    case 'starlight_master':
    case 'laureate_legend_xp':
      return profile.totalXp;
    case 'storyweaver_b1':
    case 'diplomat_b2':
    case 'polyglot_laureate_c2':
      return highestTierOrUnitAcrossLangs;
    case 'free_recall_virtuoso':
      return profile.stats.freeRecallSolved ?? 0;
    case 'nuance_detective':
      return profile.stats.clozeSolved ?? 0;
    case 'fluent_listener':
      return profile.stats.fluentPlaysCount ?? 0;
    case 'wardrobe_stylist':
      return profile.unlockedCosmetics.length;
    case 'crystal_heart_guardian':
      return profile.maxHearts;
  }
}

export function getBadgeProgress(
  profile: KidProfile,
  badgeId: BadgeId
): { current: number; target: number; unlocked: boolean } {
  const def = BADGE_CATALOG.find((b) => b.id === badgeId);
  const target = def?.targetCount ?? 1;
  const raw = Math.max(0, getRawBadgeProgress(badgeId, profile));
  const unlocked = profile.badges.includes(badgeId) || raw >= target;
  const current = unlocked ? target : Math.min(target, raw);
  return { current, target, unlocked };
}

export function evaluateUnlockedBadges(profile: KidProfile): BadgeId[] {
  const unlocked: BadgeId[] = [];

  for (const def of BADGE_CATALOG) {
    if (getBadgeProgress(profile, def.id).unlocked) {
      unlocked.push(def.id);
    }
  }

  return unlocked;
}

export const LEAGUE_TIER_META: Record<
  LeagueTier,
  { label: string; minXpHint: number; color: string; crestBg: string }
> = {
  bronze_acorn: { label: 'Bronze Acorn', minXpHint: 0, color: '#B45309', crestBg: '#FEF3C7' },
  silver_compass: { label: 'Silver Compass', minXpHint: 150, color: '#475569', crestBg: '#F1F5F9' },
  gold_feather: { label: 'Gold Feather', minXpHint: 400, color: '#CA8A04', crestBg: '#FEF9C3' },
  sapphire_sky: { label: 'Sapphire Sky', minXpHint: 800, color: '#0284C7', crestBg: '#E0F2FE' },
  starlight_legend: {
    label: 'Starlight Legend',
    minXpHint: 1400,
    color: '#6D28D9',
    crestBg: '#EDE9FE',
  },
  emerald_diplomat: {
    label: 'Emerald Diplomat',
    minXpHint: 2200,
    color: '#059669',
    crestBg: '#D1FAE5',
  },
  amethyst_symposium: {
    label: 'Amethyst Symposium',
    minXpHint: 3200,
    color: '#9333EA',
    crestBg: '#F3E8FF',
  },
  grand_polyglot_laureate: {
    label: 'Grand Polyglot Laureate',
    minXpHint: 4500,
    color: '#DB2777',
    crestBg: '#FCE7F3',
  },
};

export const TIER_ORDER: readonly LeagueTier[] = [
  'bronze_acorn',
  'silver_compass',
  'gold_feather',
  'sapphire_sky',
  'starlight_legend',
  'emerald_diplomat',
  'amethyst_symposium',
  'grand_polyglot_laureate',
] as const;

export function resolveLeagueTierForXp(
  weeklyXp: number,
  currentTier: LeagueTier = 'bronze_acorn'
): LeagueTier {
  let highest: LeagueTier = currentTier;
  let highestIdx = TIER_ORDER.indexOf(currentTier);

  for (let i = 0; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    if (weeklyXp >= LEAGUE_TIER_META[tier].minXpHint && i > highestIdx) {
      highest = tier;
      highestIdx = i;
    }
  }

  return highest;
}

interface NpcRivalTemplate {
  id: string;
  name: string;
  avatarId: AvatarId;
  multiplier: number;
  offset: number;
  floorXp: number;
}

const NPC_RIVAL_TEMPLATES: readonly NpcRivalTemplate[] = [
  {
    id: 'npc-laureate-soren',
    name: 'Laureate Soren',
    avatarId: 'grand_laureate_crest',
    multiplier: 1.24,
    offset: 36,
    floorXp: 135,
  },
  {
    id: 'npc-sage-athena',
    name: 'Sage Athena',
    avatarId: 'clockwork_owl_crest',
    multiplier: 1.15,
    offset: 22,
    floorXp: 118,
  },
  {
    id: 'npc-mateo-chef',
    name: 'Chef Mateo',
    avatarId: 'mateo_chef',
    multiplier: 1.09,
    offset: 16,
    floorXp: 98,
  },
  {
    id: 'npc-voyager-tariq',
    name: 'Voyager Tariq',
    avatarId: 'fennec_voyager',
    multiplier: 1.04,
    offset: 8,
    floorXp: 82,
  },
  {
    id: 'npc-colette-fox',
    name: 'Baker Colette',
    avatarId: 'colette_baker',
    multiplier: 0.96,
    offset: 2,
    floorXp: 68,
  },
  {
    id: 'npc-benni-badger',
    name: 'Tinker Benni',
    avatarId: 'benni_tinker',
    multiplier: 0.88,
    offset: -4,
    floorXp: 54,
  },
  {
    id: 'npc-origami-ren',
    name: 'Origami Ren',
    avatarId: 'origami_crane_crest',
    multiplier: 0.81,
    offset: -8,
    floorXp: 42,
  },
  {
    id: 'npc-luca-otter',
    name: 'Captain Luca',
    avatarId: 'luca_captain',
    multiplier: 0.72,
    offset: -10,
    floorXp: 30,
  },
  {
    id: 'npc-aria-star',
    name: 'Aria Starling',
    avatarId: 'star_compass',
    multiplier: 0.61,
    offset: -12,
    floorXp: 20,
  },
  {
    id: 'npc-koa-scout',
    name: 'Scout Koa',
    avatarId: 'pip_explorer',
    multiplier: 0.48,
    offset: -12,
    floorXp: 10,
  },
];

export function buildWeeklyLeaderboard(profile: KidProfile): LeagueEntry[] {
  const playerXp = Math.max(0, Math.round(profile.weeklyXp));
  const tierHint = LEAGUE_TIER_META[profile.leagueTier]?.minXpHint ?? 0;
  const baseline = Math.max(playerXp, Math.round(tierHint * 0.85));

  const entries: Omit<LeagueEntry, 'rank'>[] = NPC_RIVAL_TEMPLATES.map((npc) => {
    const scaled = Math.round(baseline * npc.multiplier) + npc.offset;
    const weeklyXp = Math.max(npc.floorXp, scaled);
    return {
      id: npc.id,
      name: npc.name,
      avatarId: npc.avatarId,
      weeklyXp,
      isPlayer: false,
    };
  });

  entries.push({
    id: profile.id,
    name: profile.name,
    avatarId: profile.avatarId,
    weeklyXp: playerXp,
    isPlayer: true,
  });

  entries.sort((a, b) => {
    if (b.weeklyXp !== a.weeklyXp) return b.weeklyXp - a.weeklyXp;
    if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

/**
 * Scores unlocked vocabulary cards for adaptive SRS review priority, placing
 * unreviewed, weaker, and older-reviewed cards first.
 */
export function scoreSrsCandidates(
  unlockedVocabIds: readonly string[],
  vocabMastery?: Readonly<Record<string, VocabMasteryEntry>>,
  todayISO?: string
): SrsReviewCandidate[] {
  const fallbackToday = new Date().toISOString().slice(0, 10);
  const todayParsed = parseCalendarDay(todayISO ?? fallbackToday);
  const todayUtcMs = todayParsed?.utcMs ?? parseCalendarDay(fallbackToday)!.utcMs;

  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const rawId of unlockedVocabIds) {
    const id = rawId.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  const candidates: Array<{ item: SrsReviewCandidate; isMissing: boolean; order: number }> =
    uniqueIds.map((vocabId, order) => {
      const entry = vocabMastery?.[vocabId];
      if (!entry) {
        return {
          item: {
            vocabId,
            strength: 0,
            daysSinceReview: 0,
            priorityScore: 60,
          },
          isMissing: true,
          order,
        };
      }

      const strength = Number.isFinite(entry.strength)
        ? Math.min(5, Math.max(0, entry.strength))
        : 0;
      const lastParsed = parseCalendarDay(entry.lastReviewedISO);
      const daysSinceReview = lastParsed
        ? Math.max(0, Math.round((todayUtcMs - lastParsed.utcMs) / MS_PER_DAY))
        : 0;
      const priorityScore = (5 - strength) * 10 + daysSinceReview * 2;

      return {
        item: {
          vocabId,
          strength,
          daysSinceReview,
          priorityScore,
        },
        isMissing: false,
        order,
      };
    });

  candidates.sort((a, b) => {
    if (b.item.priorityScore !== a.item.priorityScore) {
      return b.item.priorityScore - a.item.priorityScore;
    }
    if (a.isMissing !== b.isMissing) {
      return a.isMissing ? -1 : 1;
    }
    if (a.item.strength !== b.item.strength) {
      return a.item.strength - b.item.strength;
    }
    if (b.item.daysSinceReview !== a.item.daysSinceReview) {
      return b.item.daysSinceReview - a.item.daysSinceReview;
    }
    return a.order - b.order;
  });

  return candidates.map((c) => c.item);
}

/**
 * Computes updated SRS mastery entries for practiced vocabulary IDs, boosting
 * strength within [0, 5] (higher on 0 mistakes) and incrementing reviewCount.
 */
export function computeUpdatedVocabMastery(
  prevMastery: Readonly<Record<string, VocabMasteryEntry>> | undefined,
  practicedVocabIds: readonly string[],
  mistakesCount: number,
  todayISO?: string
): Record<string, VocabMasteryEntry> {
  const fallbackToday = new Date().toISOString().slice(0, 10);
  const todayDayStr = parseCalendarDay(todayISO ?? fallbackToday)?.dayStr ?? fallbackToday;
  const safeMistakes = Number.isFinite(mistakesCount)
    ? Math.max(0, Math.floor(mistakesCount))
    : 0;
  const strengthBoost = safeMistakes === 0 ? 2 : 1;

  const next: Record<string, VocabMasteryEntry> = {};
  if (prevMastery) {
    for (const [id, entry] of Object.entries(prevMastery)) {
      if (id && entry) {
        next[id] = {
          strength: Number.isFinite(entry.strength)
            ? Math.min(5, Math.max(0, entry.strength))
            : 0,
          lastReviewedISO: entry.lastReviewedISO,
          reviewCount: Number.isFinite(entry.reviewCount)
            ? Math.max(0, Math.floor(entry.reviewCount))
            : 0,
        };
      }
    }
  }

  const seen = new Set<string>();
  for (const rawId of practicedVocabIds) {
    const vocabId = rawId.trim();
    if (!vocabId || seen.has(vocabId)) continue;
    seen.add(vocabId);
    const prev = next[vocabId];
    const prevStrength = prev ? prev.strength : 0;
    const prevCount = prev ? prev.reviewCount : 0;
    next[vocabId] = {
      strength: Math.min(5, Math.max(0, prevStrength + strengthBoost)),
      lastReviewedISO: todayDayStr,
      reviewCount: prevCount + 1,
    };
  }

  return next;
}
