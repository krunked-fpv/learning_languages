export type LanguageCode =
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'en'
  | 'zh'
  | 'ja'
  | 'hi'
  | 'bn'
  | 'ar'
  | 'arz'
  | 'ru'
  | 'id'
  | 'vi'
  | 'sw';

export type TextDirection = 'ltr' | 'rtl';

export type ScriptType =
  | 'latin'
  | 'cyrillic'
  | 'arabic'
  | 'devanagari'
  | 'bengali'
  | 'hanzi'
  | 'japanese';

export type CompanionId = 'pip' | 'mateo' | 'colette' | 'benni' | 'luca';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: TextDirection;
  scriptType: ScriptType;
  usesSpaces: boolean;
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

export const LANGUAGE_LIST: readonly LanguageCode[] = [
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'en',
  'zh',
  'ja',
  'hi',
  'bn',
  'ar',
  'arz',
  'ru',
  'id',
  'vi',
  'sw',
] as const;

export const LANGUAGE_META: Record<LanguageCode, LanguageMeta> = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
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
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
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
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
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
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
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
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'A Trilha Tropical',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Carnival Rhythm Guitarist',
    speechLocales: ['pt-BR', 'pt-PT', 'pt'],
    accentPalette: {
      primary: '#0D9488',
      secondary: '#F59E0B',
      glow: '#5EEAD4',
      bevel: '#115E59',
      surfaceTint: '#F0FDFA',
    },
    helperAccents: ['ã', 'õ', 'ç', 'á', 'â', 'à', 'é', 'ê', 'í', 'ó', 'ô', 'ú'],
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Starlight Compass Isles',
    companionId: 'colette',
    companionName: 'Colette',
    companionRole: 'Storybook Harbor Guide',
    speechLocales: ['en-US', 'en-GB', 'en'],
    accentPalette: {
      primary: '#1D4ED8',
      secondary: '#F59E0B',
      glow: '#93C5FD',
      bevel: '#1E3A8A',
      surfaceTint: '#EFF6FF',
    },
    helperAccents: ["'", '-', '!', '?'],
  },
  zh: {
    code: 'zh',
    name: 'Mandarin Chinese',
    nativeName: '中文',
    dir: 'ltr',
    scriptType: 'hanzi',
    usesSpaces: false,
    landTitle: 'The Lantern Cloud Peaks',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Moon-Gate Lantern Chef',
    speechLocales: ['zh-CN', 'cmn-Hans-CN', 'zh-SG', 'zh-TW', 'zh'],
    accentPalette: {
      primary: '#DC2626',
      secondary: '#F59E0B',
      glow: '#FCA5A5',
      bevel: '#991B1B',
      surfaceTint: '#FEF2F2',
    },
    helperAccents: [
      'ā', 'á', 'ǎ', 'à',
      'ē', 'é', 'ě', 'è',
      'ī', 'í', 'ǐ', 'ì',
      'ō', 'ó', 'ǒ', 'ò',
      'ū', 'ú', 'ǔ', 'ù',
      'ǖ', 'ǘ', 'ǚ', 'ǜ',
    ],
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    dir: 'ltr',
    scriptType: 'japanese',
    usesSpaces: false,
    landTitle: 'Sakura Sky Trail',
    companionId: 'colette',
    companionName: 'Colette',
    companionRole: 'Sakura Origami Fox',
    speechLocales: ['ja-JP', 'ja'],
    accentPalette: {
      primary: '#DB2777',
      secondary: '#6366F1',
      glow: '#F9A8D4',
      bevel: '#9D174D',
      surfaceTint: '#FDF2F8',
    },
    helperAccents: ['ā', 'ī', 'ū', 'ē', 'ō', 'っ', 'ん', 'ー'],
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dir: 'ltr',
    scriptType: 'devanagari',
    usesSpaces: true,
    landTitle: 'The Marigold Palace Trail',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Marigold Spice Musician',
    speechLocales: ['hi-IN', 'hi'],
    accentPalette: {
      primary: '#EA580C',
      secondary: '#0D9488',
      glow: '#FDBA74',
      bevel: '#9A3412',
      surfaceTint: '#FFF7ED',
    },
    helperAccents: ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ँ', '्'],
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    dir: 'ltr',
    scriptType: 'bengali',
    usesSpaces: true,
    landTitle: 'The Lotus River Delta',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Riverboat Lantern Tinkerer',
    speechLocales: ['bn-BD', 'bn-IN', 'bn'],
    accentPalette: {
      primary: '#047857',
      secondary: '#F43F5E',
      glow: '#6EE7B7',
      bevel: '#064E3B',
      surfaceTint: '#ECFDF5',
    },
    helperAccents: ['া', 'ি', 'ী', 'ু', 'ূ', 'ে', 'ৈ', 'ো', 'ৌ', 'ং', 'ঁ', '্'],
  },
  ar: {
    code: 'ar',
    name: 'Modern Standard Arabic',
    nativeName: 'العربية الفصحى',
    dir: 'rtl',
    scriptType: 'arabic',
    usesSpaces: true,
    landTitle: 'Oasis of Golden Stars',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Astrolabe Star Navigator',
    speechLocales: ['ar-SA', 'ar-001', 'ar-AE', 'ar'],
    accentPalette: {
      primary: '#059669',
      secondary: '#D97706',
      glow: '#6EE7B7',
      bevel: '#065F46',
      surfaceTint: '#ECFDF5',
    },
    helperAccents: ['أ', 'إ', 'آ', 'ة', 'ى', 'ئ', 'ؤ', 'ء', '؟'],
  },
  arz: {
    code: 'arz',
    name: 'Egyptian Arabic',
    nativeName: 'مصري',
    dir: 'rtl',
    scriptType: 'arabic',
    usesSpaces: true,
    landTitle: 'Nile Felucca Breeze',
    companionId: 'luca',
    companionName: 'Luca',
    companionRole: 'Nile Felucca Captain',
    speechLocales: ['ar-EG', 'ar'],
    accentPalette: {
      primary: '#0284C7',
      secondary: '#EAB308',
      glow: '#7DD3FC',
      bevel: '#075985',
      surfaceTint: '#F0F9FF',
    },
    helperAccents: ['أ', 'إ', 'آ', 'ة', 'ى', 'ئ', 'ؤ', 'ء', '؟'],
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    dir: 'ltr',
    scriptType: 'cyrillic',
    usesSpaces: true,
    landTitle: 'The Starlight Frost Express',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Trans-Aurora Train Engineer',
    speechLocales: ['ru-RU', 'ru'],
    accentPalette: {
      primary: '#4F46E5',
      secondary: '#E11D48',
      glow: '#A5B4FC',
      bevel: '#3730A3',
      surfaceTint: '#EEF2FF',
    },
    helperAccents: ['ё', 'й', 'щ', 'ч', 'ш', 'ж', 'ю', 'я', 'ь', 'э'],
  },
  id: {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'Emerald Archipelago Voyage',
    companionId: 'luca',
    companionName: 'Luca',
    companionRole: 'Island Schooner Sea-Otter',
    speechLocales: ['id-ID', 'in-ID', 'id'],
    accentPalette: {
      primary: '#0891B2',
      secondary: '#F97316',
      glow: '#67E8F9',
      bevel: '#155E75',
      surfaceTint: '#ECFEFF',
    },
    helperAccents: ['-', "'", 'é'],
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'Lantern Bay & Bamboo Peaks',
    companionId: 'colette',
    companionName: 'Colette',
    companionRole: 'Silk-Lantern Harbor Baker',
    speechLocales: ['vi-VN', 'vi'],
    accentPalette: {
      primary: '#E11D48',
      secondary: '#10B981',
      glow: '#FDA4AF',
      bevel: '#9F1239',
      surfaceTint: '#FFF1F2',
    },
    helperAccents: ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư', 'á', 'à', 'ả', 'ã', 'ạ'],
  },
  sw: {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'Savanna Sun & Dhow Coast',
    companionId: 'luca',
    companionName: 'Luca',
    companionRole: 'Zanzibar Dhow Captain',
    speechLocales: ['sw-KE', 'sw-TZ', 'sw'],
    accentPalette: {
      primary: '#D97706',
      secondary: '#0EA5E9',
      glow: '#FCD34D',
      bevel: '#92400E',
      surfaceTint: '#FFFBEB',
    },
    helperAccents: ["'", '-', '!'],
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
  // Units 6–8: Music & Hobbies, Cozy Home & Clothes, Starlight Cosmos
  'acoustic_guitar',
  'soccer_ball',
  'paint_palette',
  'storybook_open',
  'cozy_bed',
  'explorer_boots',
  'winter_coat',
  'sunny_window',
  'crescent_moon',
  'ringed_planet',
  'starlight_rocket',
  'rainbow_arc',
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export interface TapHintToken {
  surface: string;
  normalizedId: string;
  translation: string;
  phonetic: string;
  romanized?: string;
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
  romanized?: string;
  accentCallout?: AccentCallout;
  illustrationKey: IllustrationKey;
  exampleForeign: string;
  exampleEnglish: string;
  examplePhonetic: string;
  exampleRomanized?: string;
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
  promptRomanized?: string;
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
  romanized?: string;
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
  romanized?: string;
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
  romanized?: string;
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
  companionRomanized?: string;
  tapHints: TapHintToken[];
  promptEnglish: string;
  mode: 'word_bank' | 'choice';
  choices?: string[];
  targetTokens?: string[];
  distractorTokens?: string[];
  expectedAnswer: string;
  acceptedAnswers: string[];
  phoneticAnswer: string;
  romanizedAnswer?: string;
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
  romanized?: string;
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
  | 'theme_alpine_meadow'
  | 'theme_cosmic_galaxy'
  | 'theme_aurora_borealis'
  | 'theme_candy_sakura'
  | 'theme_ocean_lagoon'
  | 'theme_royal_velvet';

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
  arcadeHighScores?: Record<string, number>;
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
