export { gradeAnswer, normalizeAnswer, type NormalizeOptions } from './grader';
export {
  decodeToNormalEnglish,
  type PlainEnglishRequest,
  type PlainEnglishResult,
} from './plainEnglish';
export {
  BADGE_CATALOG,
  LEAGUE_TIER_META,
  TIER_ORDER,
  applyDailyPracticeStreak,
  buildWeeklyLeaderboard,
  calculateComboMultiplier,
  calculateLessonRewards,
  evaluateUnlockedBadges,
  getBadgeProgress,
  resolveLeagueTierForXp,
} from './progression';
export {
  AVATAR_SHOP_CATALOG,
  COSMETIC_CATALOG,
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  HEART_CRYSTAL_COST_GEMS,
  HEART_ELIXIR_COST_GEMS,
  MAX_HEART_CONTAINERS,
  STARTER_AVATAR_IDS,
  STREAK_SHIELD_COST_GEMS,
  UNLOCKABLE_AVATAR_COSTS,
  XP_BOOSTER_CHARGES_PER_BUY,
  XP_BOOSTER_COST_GEMS,
  getAvatarById,
  getCosmeticById,
  type AvatarShopItem,
} from './cosmetics';
export type { CosmeticId } from '../types/contracts';
