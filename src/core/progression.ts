import {
  LANGUAGE_LIST,
  type AvatarId,
  type BadgeDefinition,
  type BadgeId,
  type KidProfile,
  type LeagueEntry,
  type LeagueTier,
} from '../types/contracts';

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
}): { xpEarned: number; gemsEarned: number; stars: 1 | 2 | 3 } {
  const baseXp = Math.max(0, Math.round(params.baseXp));
  const baseGems = Math.max(0, Math.round(params.baseGems));
  const mistakes = Math.max(0, Math.floor(params.mistakesCount));
  const stars: 1 | 2 | 3 = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  const combo = calculateComboMultiplier(params.maxCombo);
  const starXpBonus = baseXp > 0 ? (stars === 3 ? 5 : stars === 2 ? 2 : 0) : 0;
  const starGemBonus = baseGems > 0 && stars === 3 ? 2 : 0;

  return {
    xpEarned: Math.round(baseXp * combo.multiplier) + starXpBonus,
    gemsEarned: baseGems + combo.bonusGems + starGemBonus,
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
] as const;

function isBadgeConditionMet(badgeId: BadgeId, profile: KidProfile): boolean {
  const languagesPracticed = LANGUAGE_LIST.filter(
    (lang) =>
      profile.languageProgress[lang].xpEarned > 0 ||
      profile.languageProgress[lang].completedNodeIds.length > 0
  ).length;

  const totalCompletedNodes = LANGUAGE_LIST.reduce(
    (sum, lang) => sum + profile.languageProgress[lang].completedNodeIds.length,
    0
  );

  const totalUnlockedStickers = LANGUAGE_LIST.reduce(
    (sum, lang) => sum + profile.languageProgress[lang].unlockedVocabIds.length,
    0
  );

  const totalClaimedChests = LANGUAGE_LIST.reduce(
    (sum, lang) => sum + profile.languageProgress[lang].claimedChestIds.length,
    0
  );

  switch (badgeId) {
    case 'first_hello':
      return profile.stats.lessonsCompleted >= 1 || totalCompletedNodes >= 1;
    case 'polyglot_explorer':
      return languagesPracticed >= 2;
    case 'turtle_listener':
      return profile.stats.turtlePlaysCount >= 5;
    case 'combo_comet':
      return profile.stats.bestComboStreak >= 5;
    case 'phrasebook_collector':
      return totalUnlockedStickers >= 15;
    case 'arcade_ace':
      return profile.stats.arcadeGamesWon >= 3;
    case 'boss_befriender':
      return profile.stats.bossesCleared >= 1;
    case 'accent_scholar':
      return profile.stats.accentSpotlightsSeen >= 3;
    case 'streak_spark':
      return profile.streakDays >= 3;
    case 'chest_hunter':
      return totalClaimedChests >= 2;
    case 'story_reader':
      return profile.stats.storiesCompleted >= 2;
    case 'starlight_master':
      return profile.totalXp >= 300;
  }
}

export function evaluateUnlockedBadges(profile: KidProfile): BadgeId[] {
  const existing = new Set<BadgeId>(profile.badges);
  const unlocked: BadgeId[] = [];

  for (const def of BADGE_CATALOG) {
    if (existing.has(def.id) || isBadgeConditionMet(def.id, profile)) {
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
};

const TIER_ORDER: readonly LeagueTier[] = [
  'bronze_acorn',
  'silver_compass',
  'gold_feather',
  'sapphire_sky',
  'starlight_legend',
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
    id: 'npc-mateo-chef',
    name: 'Chef Mateo',
    avatarId: 'mateo_chef',
    multiplier: 1.24,
    offset: 28,
    floorXp: 115,
  },
  {
    id: 'npc-colette-fox',
    name: 'Baker Colette',
    avatarId: 'colette_baker',
    multiplier: 1.11,
    offset: 14,
    floorXp: 88,
  },
  {
    id: 'npc-benni-badger',
    name: 'Tinker Benni',
    avatarId: 'benni_tinker',
    multiplier: 1.03,
    offset: 5,
    floorXp: 64,
  },
  {
    id: 'npc-luca-otter',
    name: 'Captain Luca',
    avatarId: 'luca_captain',
    multiplier: 0.92,
    offset: -6,
    floorXp: 46,
  },
  {
    id: 'npc-aria-star',
    name: 'Aria Starling',
    avatarId: 'star_compass',
    multiplier: 0.78,
    offset: -10,
    floorXp: 32,
  },
  {
    id: 'npc-koa-scout',
    name: 'Scout Koa',
    avatarId: 'pip_explorer',
    multiplier: 0.62,
    offset: -12,
    floorXp: 18,
  },
  {
    id: 'npc-zoe-lantern',
    name: 'Zoe Lantern',
    avatarId: 'colette_baker',
    multiplier: 0.45,
    offset: -10,
    floorXp: 8,
  },
];

export function buildWeeklyLeaderboard(profile: KidProfile): LeagueEntry[] {
  const playerXp = Math.max(0, Math.round(profile.weeklyXp));
  const tierHint = LEAGUE_TIER_META[profile.leagueTier].minXpHint;
  const baseline = Math.max(playerXp, Math.round(tierHint * 0.4));

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
