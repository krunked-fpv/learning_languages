import type {
  AvatarId,
  BadgeDefinition,
  BadgeId,
  CosmeticId,
  CosmeticItem,
  GradeRequest,
  GradeResult,
  KidProfile,
  LeagueEntry,
  LeagueTier,
} from '../types/contracts';

export function normalizeAnswer(
  input: string,
  _options?: { stripAccents?: boolean; expandGerman?: boolean }
): string {
  return input.trim().toLowerCase();
}

export function gradeAnswer(req: GradeRequest): GradeResult {
  const normSub = normalizeAnswer(req.submitted);
  const normExp = normalizeAnswer(req.expected);
  const ok = normSub === normExp;
  return {
    isCorrect: ok,
    exactMatch: ok,
    normalizedSubmitted: normSub,
    normalizedExpected: normExp,
    heartPenalty: ok ? 0 : 1,
  };
}

export function calculateComboMultiplier(comboCount: number): {
  multiplier: number;
  label: string;
  bonusGems: number;
} {
  if (comboCount >= 5) return { multiplier: 2, label: 'ON FIRE!', bonusGems: 3 };
  if (comboCount >= 3) return { multiplier: 1.5, label: `${comboCount}x`, bonusGems: 1 };
  return { multiplier: 1, label: comboCount > 1 ? `${comboCount}x` : '', bonusGems: 0 };
}

export function calculateLessonRewards(params: {
  baseXp: number;
  baseGems: number;
  maxCombo: number;
  mistakesCount: number;
}): { xpEarned: number; gemsEarned: number; stars: 1 | 2 | 3 } {
  const stars: 1 | 2 | 3 = params.mistakesCount === 0 ? 3 : params.mistakesCount <= 2 ? 2 : 1;
  return { xpEarned: params.baseXp, gemsEarned: params.baseGems, stars };
}

export function applyDailyPracticeStreak(profile: KidProfile, _todayISO?: string): KidProfile {
  return profile;
}

export const BADGE_CATALOG: readonly BadgeDefinition[] = [];
export function evaluateUnlockedBadges(_profile: KidProfile): BadgeId[] {
  return [];
}

export const LEAGUE_TIER_META: Record<
  LeagueTier,
  { label: string; minXpHint: number; color: string; crestBg: string }
> = {
  bronze_acorn: { label: 'Bronze Acorn', minXpHint: 0, color: '#B45309', crestBg: '#FEF3C7' },
  silver_compass: { label: 'Silver Compass', minXpHint: 150, color: '#475569', crestBg: '#F1F5F9' },
  gold_feather: { label: 'Gold Feather', minXpHint: 400, color: '#CA8A04', crestBg: '#FEF9C3' },
  sapphire_sky: { label: 'Sapphire Sky', minXpHint: 800, color: '#0284C7', crestBg: '#E0F2FE' },
  starlight_legend: { label: 'Starlight Legend', minXpHint: 1400, color: '#6D28D9', crestBg: '#EDE9FE' },
};

export function buildWeeklyLeaderboard(profile: KidProfile): LeagueEntry[] {
  return [
    {
      id: profile.id,
      name: profile.name,
      avatarId: profile.avatarId as AvatarId,
      weeklyXp: profile.weeklyXp,
      isPlayer: true,
      rank: 1,
    },
  ];
}

export const COSMETIC_CATALOG: readonly CosmeticItem[] = [];
export const STREAK_SHIELD_COST_GEMS = 45;
export type { CosmeticId };
