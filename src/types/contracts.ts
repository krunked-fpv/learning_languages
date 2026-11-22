export type LanguageCode = 'es' | 'fr' | 'de' | 'it';

export type CompanionId = 'pip' | 'mateo' | 'colette' | 'benni' | 'luca';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  landTitle: string;
  companionId: Exclude<CompanionId, 'pip'>;
  companionName: string;
  companionRole: string;
  speechLocales: readonly string[];
  accentPalette: {
    primary: string;
    secondary: string;
    glow: string;
    bevel: string;
    surfaceTint: string;
  };
  helperAccents: readonly string[];
}

export const LANGUAGE_LIST: readonly LanguageCode[] = ['es', 'fr', 'de', 'it'] as const;

export const LANGUAGE_META: Record<LanguageCode, LanguageMeta> = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    landTitle: 'El Camino del Sol',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Axolotl Chef & Guitarist',
    speechLocales: ['es-MX', 'es-ES', 'es'],
    accentPalette: {
      primary: '#EA580C',
      secondary: '#FBBF24',
      glow: '#FDBA74',
      bevel: '#9A3412',
      surfaceTint: '#FFF7ED',
    },
    helperAccents: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¡', '¿'],
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    landTitle: 'La Route des Étoiles',
    companionId: 'colette',
    companionName: 'Colette',
    companionRole: 'Boulangerie Fox',
    speechLocales: ['fr-FR', 'fr-CA', 'fr'],
    accentPalette: {
      primary: '#2563EB',
      secondary: '#F43F5E',
      glow: '#93C5FD',
      bevel: '#1E40AF',
      surfaceTint: '#EFF6FF',
    },
    helperAccents: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ô', 'ù', 'û'],
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    landTitle: 'Der Märchenpfad',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Clockwork Badger Tinkerer',
    speechLocales: ['de-DE', 'de-AT', 'de'],
    accentPalette: {
      primary: '#D97706',
      secondary: '#15803D',
      glow: '#FCD34D',
      bevel: '#92400E',
      surfaceTint: '#FFFBEB',
    },
    helperAccents: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    landTitle: 'La Via del Mare',
    companionId: 'luca',
    companionName: 'Luca',
    companionRole: 'Gondolier Sea-Otter',
    speechLocales: ['it-IT', 'it'],
    accentPalette: {
      primary: '#059669',
      secondary: '#0284C7',
      glow: '#6EE7B7',
      bevel: '#065F46',
      surfaceTint: '#ECFDF5',
    },
    helperAccents: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  },
};

export type GenderCategory = 'masculine' | 'feminine' | 'neuter' | 'plural' | 'invariant';

export interface GenderBadgeMeta {
  label: string;
  shortLabel: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const GENDER_BADGE_META: Record<GenderCategory, GenderBadgeMeta> = {
  masculine: {
    label: 'Masculine',
    shortLabel: 'M',
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8',
    borderColor: '#60A5FA',
  },
  feminine: {
    label: 'Feminine',
    shortLabel: 'F',
    bgColor: '#FCE7F3',
    textColor: '#BE185D',
    borderColor: '#F472B6',
  },
  neuter: {
    label: 'Neuter',
    shortLabel: 'N',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FBBF24',
  },
  plural: {
    label: 'Plural',
    shortLabel: 'PL',
    bgColor: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#A78BFA',
  },
  invariant: {
    label: 'Expression',
    shortLabel: 'EXP',
    bgColor: '#DCFCE7',
    textColor: '#15803D',
    borderColor: '#4ADE80',
  },
};

export const ILLUSTRATION_KEYS = [
  // Unit 1: Greetings, Smiles & Magic Words
  'wave_hello',
  'morning_sun',
  'night_stars',
  'see_you_soon',
  'magic_please',
  'thank_you_gift',
  'youre_welcome',
  'happy_smile',
  'name_tag',
  'thumbs_yes',
  'gentle_no',
  'friendly_handshake',
  // Unit 2: Cafe, Market & Kid Treats
  'water_carafe',
  'warm_bread',
  'golden_cheese',
  'flaky_pastry',
  'hot_chocolate',
  'orange_juice',
  'sweet_gelato',
  'crispy_treat',
  'fresh_apple',
  'ripe_strawberry',
  'polite_order',
  'delicious_sparkles',
  // Unit 3: Animal Friends & Nature Walk
  'playful_dog',
  'cozy_cat',
  'songbird_branch',
  'jumping_fish',
  'gentle_horse',
  'wise_turtle',
  'colorful_butterfly',
  'clever_rabbit',
  'tall_oak_tree',
  'blooming_flower',
  'sunny_mountain',
  'sparkling_sea',
  // Unit 4: Family, Colors & Counting Treasures
  'loving_mother',
  'caring_father',
  'happy_sibling',
  'wise_grandparent',
  'best_friends',
  'cozy_home',
  'ruby_red',
  'sapphire_blue',
  'sunflower_yellow',
  'emerald_green',
  'treasure_count_three',
  'treasure_count_ten',
  // Unit 5: Grand Expedition & Everyday Adventures
  'express_train',
  'golden_ticket',
  'city_park',
  'compass_map',
  'bicycle_ride',
  'sunny_weather',
  'rainy_umbrella',
  'direction_left_right',
  'museum_lantern',
  'backpack_ready',
  'party_confetti',
  'starlight_trophy',
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export interface TapHintToken {
  surface: string;
  normalizedId: string;
  translation: string;
  phonetic: string;
  articleNote?: string;
  accentNote?: string;
  speakText: string;
}

export interface AccentCallout {
  char: string;
  base: string;
  tip: string;
}

export interface VocabCard {
  id: string;
  language: LanguageCode;
  unitId: string;
  foreignWithArticle: string;
  bareForeign: string;
  article?: string;
  gender: GenderCategory;
  english: string;
  acceptedEnglish: string[];
  acceptedForeign: string[];
  phonetic: string;
  accentCallout?: AccentCallout;
  illustrationKey: IllustrationKey;
  exampleForeign: string;
  exampleEnglish: string;
  examplePhonetic: string;
}

export interface DiscoveryCardExercise {
  type: 'discovery_card';
  id: string;
  vocabId: string;
  promptHint?: string;
}

export interface WordBankExercise {
  type: 'word_bank';
  id: string;
  direction: 'to_english' | 'to_foreign';
  promptText: string;
  promptPhonetic?: string;
  promptSpeakText?: string;
  promptTokens: TapHintToken[];
  expectedSentence: string;
  acceptedSentences: string[];
  targetTokens: string[];
  distractorTokens: string[];
  phoneticHint: string;
  articleHint?: string;
  vocabIds: string[];
}

export interface ListenDecodeExercise {
  type: 'listen_decode';
  id: string;
  mode: 'select_meaning' | 'assemble_heard';
  audioText: string;
  phonetic: string;
  voiceFallbackPhoneticPrompt: string;
  englishMeaning: string;
  choices?: string[];
  targetTokens?: string[];
  distractorTokens?: string[];
  acceptedAnswers: string[];
  tapHints: TapHintToken[];
  vocabIds: string[];
}

export interface PairMatchItem {
  id: string;
  foreign: string;
  english: string;
  phonetic: string;
  vocabId?: string;
}

export interface PairMatchRushExercise {
  type: 'pair_match_rush';
  id: string;
  title: string;
  timeBonusSeconds: number;
  pairs: PairMatchItem[];
}

export interface StoryBubble {
  id: string;
  speakerId: CompanionId;
  speakerName: string;
  side: 'left' | 'right';
  foreignText: string;
  englishText: string;
  phonetic: string;
  tapHints: TapHintToken[];
}

export interface StoryDecision {
  afterBubbleIndex: number;
  questionEnglish: string;
  options: {
    id: string;
    label: string;
    phonetic?: string;
    isCorrect: boolean;
    reactionEnglish: string;
    reactionForeign?: string;
  }[];
}

export interface MiniStoryExercise {
  type: 'mini_story';
  id: string;
  title: string;
  settingSubtitle: string;
  bubbles: StoryBubble[];
  decisions: StoryDecision[];
  vocabIds: string[];
}

export interface BossTurn {
  id: string;
  companionSayForeign: string;
  companionSayEnglish: string;
  companionPhonetic: string;
  tapHints: TapHintToken[];
  promptEnglish: string;
  mode: 'word_bank' | 'choice';
  choices?: string[];
  targetTokens?: string[];
  distractorTokens?: string[];
  expectedAnswer: string;
  acceptedAnswers: string[];
  phoneticAnswer: string;
  victoryReplyForeign: string;
  victoryReplyEnglish: string;
}

export interface BossGauntletExercise {
  type: 'boss_gauntlet';
  id: string;
  companionId: Exclude<CompanionId, 'pip'>;
  companionName: string;
  title: string;
  introLine: string;
  turns: BossTurn[];
  rewardChestGems: number;
  vocabIds: string[];
}

export type LessonExercise =
  | DiscoveryCardExercise
  | WordBankExercise
  | ListenDecodeExercise
  | PairMatchRushExercise
  | MiniStoryExercise
  | BossGauntletExercise;

export type MapNodeType = 'lesson' | 'story' | 'chest' | 'boss';

export interface MapNode {
  id: string;
  unitId: string;
  order: number;
  nodeType: MapNodeType;
  title: string;
  subtitle: string;
  xpReward: number;
  gemReward: number;
  exercises: LessonExercise[];
  rewardVocabIds: string[];
}

export interface CourseUnit {
  id: string;
  language: LanguageCode;
  order: number;
  title: string;
  culturalLandmark: string;
  subtitle: string;
  themeColor: string;
  vocabCards: VocabCard[];
  nodes: MapNode[];
}

export interface LanguageCourse {
  language: LanguageCode;
  meta: LanguageMeta;
  units: CourseUnit[];
  vocabById: Record<string, VocabCard>;
}

export interface ArcadeLanternItem {
  id: string;
  language: LanguageCode;
  foreign: string;
  english: string;
  phonetic: string;
  illustrationKey: IllustrationKey;
}

// ==========================================
// Grading & Progression Contracts
// ==========================================

export interface GradeRequest {
  submitted: string;
  expected: string;
  accepted?: readonly string[];
  language: LanguageCode;
  expectedArticle?: string;
}

export interface AccentCoaching {
  expected: string;
  submitted: string;
  highlightedChars: string[];
  friendlyTip: string;
}

export interface ArticleCoaching {
  article: string;
  gender: GenderCategory;
  note: string;
}

export interface GradeResult {
  isCorrect: boolean;
  exactMatch: boolean;
  normalizedSubmitted: string;
  normalizedExpected: string;
  heartPenalty: 0 | 1;
  accentCoaching?: AccentCoaching;
  articleCoaching?: ArticleCoaching;
}

// ==========================================
// Cosmetics, Badges, Leagues & Multi-Kid Vault
// ==========================================

export type CosmeticSlot = 'hat' | 'glasses' | 'cape' | 'aura' | 'theme';

export type CosmeticId =
  | 'hat_explorer_beret'
  | 'hat_fiesta_sombrero'
  | 'hat_alpine_tyrolean'
  | 'hat_gondolier_boater'
  | 'hat_starlight_wizard'
  | 'glasses_brass_aviator'
  | 'cape_rainbow_wings'
  | 'aura_golden_compass'
  | 'aura_fireflies'
  | 'theme_sunset_plaza'
  | 'theme_starlight_indigo'
  | 'theme_alpine_meadow';

export interface EquippedCosmetics {
  hat?: CosmeticId;
  glasses?: CosmeticId;
  cape?: CosmeticId;
  aura?: CosmeticId;
  theme?: CosmeticId;
}

export interface CosmeticItem {
  id: CosmeticId;
  slot: CosmeticSlot;
  name: string;
  description: string;
  costGems: number;
  accentColor: string;
}

export type AvatarId =
  | 'pip_explorer'
  | 'mateo_chef'
  | 'colette_baker'
  | 'benni_tinker'
  | 'luca_captain'
  | 'star_compass';

export type BadgeId =
  | 'first_hello'
  | 'polyglot_explorer'
  | 'turtle_listener'
  | 'combo_comet'
  | 'phrasebook_collector'
  | 'arcade_ace'
  | 'boss_befriender'
  | 'accent_scholar'
  | 'streak_spark'
  | 'chest_hunter'
  | 'story_reader'
  | 'starlight_master';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  iconKey: IllustrationKey;
  targetCount: number;
}

export type LeagueTier =
  | 'bronze_acorn'
  | 'silver_compass'
  | 'gold_feather'
  | 'sapphire_sky'
  | 'starlight_legend';

export interface LeagueEntry {
  id: string;
  name: string;
  avatarId: AvatarId;
  weeklyXp: number;
  isPlayer: boolean;
  rank: number;
}

export interface LanguageProgressState {
  completedNodeIds: string[];
  nodeStars: Record<string, 1 | 2 | 3>;
  unlockedVocabIds: string[];
  claimedChestIds: string[];
  currentUnitIndex: number;
  xpEarned: number;
  seenExerciseIds?: string[];
}

export interface KidProfile {
  id: string;
  name: string;
  avatarId: AvatarId;
  bannerColor: string;
  activeLanguage: LanguageCode;
  gems: number;
  hearts: number;
  maxHearts: number;
  streakDays: number;
  lastPracticeISO: string | null;
  streakShields: number;
  equippedCosmetics: EquippedCosmetics;
  unlockedCosmetics: CosmeticId[];
  badges: BadgeId[];
  weeklyXp: number;
  totalXp: number;
  leagueTier: LeagueTier;
  secretArcadeUnlocked?: boolean;
  secretArcadeBestScore?: number;
  stats: {
    lessonsCompleted: number;
    storiesCompleted: number;
    bossesCleared: number;
    arcadeGamesWon: number;
    turtlePlaysCount: number;
    bestComboStreak: number;
    accentSpotlightsSeen: number;
  };
  languageProgress: Record<LanguageCode, LanguageProgressState>;
}

export interface SaveVault {
  schemaVersion: 1;
  activeProfileId: string;
  profiles: KidProfile[];
  audioSettings: {
    volume: number;
    muted: boolean;
  };
}

export interface ImportVaultResult {
  ok: boolean;
  error?: string;
  importedProfilesCount?: number;
}

// ==========================================
// Character Animation & Audio Engine Contracts
// ==========================================

export type CharacterPose =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'happy'
  | 'streak_fire'
  | 'sympathetic'
  | 'boss_intro'
  | 'victory_dance';

export type SoundEffectId =
  | 'tile_tap'
  | 'tile_remove'
  | 'correct_chime'
  | 'combo_3x'
  | 'combo_5x'
  | 'combo_fire'
  | 'gentle_nudge'
  | 'accent_sparkle'
  | 'heart_win'
  | 'chest_open'
  | 'boss_hit'
  | 'unit_fanfare'
  | 'button_click'
  | 'flip_card'
  | 'star_pop'
  | 'whoosh_transition'
  | 'bubble_pop'
  | 'secret_fanfare';

export interface SpeakRequest {
  text: string;
  language: LanguageCode | 'en';
  slow?: boolean;
  phonetic?: string;
}

export interface SpeakOutcome {
  usedNativeVoice: boolean;
  fallbackActive: boolean;
  localeUsed?: string;
}

export interface SpeechRuntimeState {
  isSpeaking: boolean;
  activeText: string | null;
  activeSpeed: 'normal' | 'slow' | null;
  fallbackActive: boolean;
  voicesReady: boolean;
}
