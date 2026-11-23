export type BaseLanguageCode =
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

export type ClassicAdultLanguageCode = 'ebonics' | 'suburban';

export type AdultMashupLanguageCode =
  | 'corp_trades'
  | 'midwest_northeast'
  | 'south_genz'
  | 'cali_country'
  | 'stoner_tactical';

export type AdultLanguageCode = ClassicAdultLanguageCode | AdultMashupLanguageCode;

export type LanguageCode = BaseLanguageCode | AdultLanguageCode;

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
  isAdultOnly?: boolean;
  isMashup?: boolean;
  dialectA?: string;
  dialectB?: string;
  translationLanguageLabel?: string;
  pairDirectionBadge?: string;
}

export const VISIBLE_BASE_LANGUAGES: readonly BaseLanguageCode[] = [
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

export const LANGUAGE_LIST: readonly BaseLanguageCode[] = VISIBLE_BASE_LANGUAGES;

export const CLASSIC_ADULT_LANGUAGES: readonly ClassicAdultLanguageCode[] = [
  'ebonics',
  'suburban',
] as const;

export const ADULT_MASHUP_LANGUAGES: readonly AdultMashupLanguageCode[] = [
  'corp_trades',
  'midwest_northeast',
  'south_genz',
  'cali_country',
  'stoner_tactical',
] as const;

export const ADULT_EASTER_EGG_LANGUAGES: readonly AdultLanguageCode[] = [
  ...CLASSIC_ADULT_LANGUAGES,
  ...ADULT_MASHUP_LANGUAGES,
] as const;

export const ALL_LANGUAGE_LIST: readonly LanguageCode[] = [
  ...VISIBLE_BASE_LANGUAGES,
  ...ADULT_EASTER_EGG_LANGUAGES,
] as const;

export const DEFAULT_KID_PROFILE_IDS: readonly string[] = ['kid-leo', 'kid-maya'] as const;
export const ADULT_EASTER_EGG_CODES = ['AFTERHOURS', 'COOKOUT'] as const;
export const ADULT_EASTER_EGG_TAP_COUNT = 7;

const ADULT_LANGUAGE_SET: ReadonlySet<string> = new Set<string>(ADULT_EASTER_EGG_LANGUAGES);
const ADULT_MASHUP_SET: ReadonlySet<string> = new Set<string>(ADULT_MASHUP_LANGUAGES);

export function isAdultLanguage(code: string): code is AdultLanguageCode {
  return ADULT_LANGUAGE_SET.has(code);
}

export function isAdultMashupLanguage(code: string): code is AdultMashupLanguageCode {
  return ADULT_MASHUP_SET.has(code);
}

export function isDefaultKidProfileId(profileId: string): boolean {
  return profileId === 'kid-leo' || profileId === 'kid-maya';
}

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
  ebonics: {
    code: 'ebonics',
    name: 'AAVE / Ebonics',
    nativeName: 'AAVE → Suburban',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Block & Cookout Ave',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Block Party DJ & Grillmaster',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#7C3AED',
      secondary: '#F59E0B',
      glow: '#C4B5FD',
      bevel: '#4C1D95',
      surfaceTint: '#F5F3FF',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    translationLanguageLabel: 'Suburban Vernacular',
    pairDirectionBadge: 'AAVE → Suburban ("White Boy")',
  },
  suburban: {
    code: 'suburban',
    name: 'Suburban ("White Boy")',
    nativeName: 'Suburban → AAVE',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Cul-de-Sac & Craft Patio',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Cul-de-Sac Lawn & Patio Captain',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#0284C7',
      secondary: '#EA580C',
      glow: '#7DD3FC',
      bevel: '#075985',
      surfaceTint: '#F0F9FF',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    translationLanguageLabel: 'AAVE / Ebonics',
    pairDirectionBadge: 'Suburban ("White Boy") → AAVE',
  },
  corp_trades: {
    code: 'corp_trades',
    name: 'Corporate <-> Trades',
    nativeName: 'LinkedIn <-> Jobsite',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Synergy Cubicle & Drywall Frontier',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'VP of Drywall & Synergy Ops',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#0F766E',
      secondary: '#F59E0B',
      glow: '#5EEAD4',
      bevel: '#115E59',
      surfaceTint: '#F0FDFA',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    isMashup: true,
    dialectA: 'Corporate LinkedIn',
    dialectB: 'Blue-Collar Trades',
    translationLanguageLabel: 'Blue-Collar Trades',
    pairDirectionBadge: 'Corporate LinkedIn <-> Blue-Collar Trades',
  },
  midwest_northeast: {
    code: 'midwest_northeast',
    name: 'Midwest <-> Northeast',
    nativeName: 'Ope Nice <-> East Coast',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Ope-to-Fuggedaboutit Turnpike',
    companionId: 'colette',
    companionName: 'Colette',
    companionRole: 'Casserole & Bodega Diplomat',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#B91C1C',
      secondary: '#0284C7',
      glow: '#FCA5A5',
      bevel: '#7F1D1D',
      surfaceTint: '#FEF2F2',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    isMashup: true,
    dialectA: 'Midwest Nice',
    dialectB: 'Northeast Direct',
    translationLanguageLabel: 'Northeast Direct',
    pairDirectionBadge: 'Midwest Nice <-> Northeast Direct',
  },
  south_genz: {
    code: 'south_genz',
    name: 'Deep South <-> Gen-Z',
    nativeName: 'Sweet Tea <-> Brainrot',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'Front Porch Sweet Tea & The For-You Swamp',
    companionId: 'mateo',
    companionName: 'Mateo',
    companionRole: 'Porch Gossip & Algorithm Bard',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#C026D3',
      secondary: '#D97706',
      glow: '#F0ABFC',
      bevel: '#86198F',
      surfaceTint: '#FDF4FF',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    isMashup: true,
    dialectA: 'Southern Polite-Shade',
    dialectB: 'Gen-Z Brainrot',
    translationLanguageLabel: 'Gen-Z Brainrot',
    pairDirectionBadge: 'Southern Polite-Shade <-> Gen-Z Brainrot',
  },
  cali_country: {
    code: 'cali_country',
    name: 'Cali Wellness <-> Country',
    nativeName: 'Biohacker <-> Holler',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Erewhon Juice Bar & Holler Creek',
    companionId: 'luca',
    companionName: 'Luca',
    companionRole: 'Cold-Plunge & Tailgate Guide',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#059669',
      secondary: '#EA580C',
      glow: '#6EE7B7',
      bevel: '#065F46',
      surfaceTint: '#ECFDF5',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    isMashup: true,
    dialectA: 'Cali Woo-Woo Wellness',
    dialectB: 'Appalachian Country',
    translationLanguageLabel: 'Appalachian Country',
    pairDirectionBadge: 'Cali Wellness <-> Appalachian Country',
  },
  stoner_tactical: {
    code: 'stoner_tactical',
    name: 'Skater Chill <-> Tactical Dad',
    nativeName: 'Couch Vibe <-> Lawn-Ops',
    dir: 'ltr',
    scriptType: 'latin',
    usesSpaces: true,
    landTitle: 'The Half-Pipe Hotbox & Perimeter Cul-de-Sac',
    companionId: 'benni',
    companionName: 'Benni',
    companionRole: 'Half-Pipe & Perimeter Commander',
    speechLocales: ['en-US', 'en'],
    accentPalette: {
      primary: '#4D7C0F',
      secondary: '#6366F1',
      glow: '#BEF264',
      bevel: '#365314',
      surfaceTint: '#F7FEE7',
    },
    helperAccents: ["'", '-', '!', '?'],
    isAdultOnly: true,
    isMashup: true,
    dialectA: 'Stoner / Skater Chill',
    dialectB: 'Tactical Lawn-Ops Dad',
    translationLanguageLabel: 'Tactical Lawn-Ops Dad',
    pairDirectionBadge: 'Skater Chill <-> Tactical Lawn-Ops',
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

export type ProficiencyTier = 'A1' | 'A2' | 'B1' | 'B2' | 'C1_C2';

export interface ProficiencyTierMeta {
  id: ProficiencyTier;
  cefrLabel: string;
  title: string;
  subtitle: string;
  unitRange: readonly [number, number];
  badgeColor: string;
  surfaceTint: string;
  scaffoldingMode: 'guided' | 'bridge' | 'fluent';
}

export const PROFICIENCY_TIERS: readonly ProficiencyTier[] = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1_C2',
] as const;

export const PROFICIENCY_TIER_META: Record<ProficiencyTier, ProficiencyTierMeta> = {
  A1: {
    id: 'A1',
    cefrLabel: 'A1',
    title: 'Sprout',
    subtitle: 'Core greetings, cafe treats, nature, family & survival phrases',
    unitRange: [1, 4],
    badgeColor: '#10B981',
    surfaceTint: '#ECFDF5',
    scaffoldingMode: 'guided',
  },
  A2: {
    id: 'A2',
    cefrLabel: 'A2',
    title: 'Trailblazer',
    subtitle: 'Expeditions, hobbies, cozy home, cosmos & everyday conversations',
    unitRange: [5, 8],
    badgeColor: '#0EA5E9',
    surfaceTint: '#E0F2FE',
    scaffoldingMode: 'guided',
  },
  B1: {
    id: 'B1',
    cefrLabel: 'B1',
    title: 'Storyweaver',
    subtitle: 'Past adventures, future dreams, empathy & cause-and-effect connectors',
    unitRange: [9, 11],
    badgeColor: '#8B5CF6',
    surfaceTint: '#EDE9FE',
    scaffoldingMode: 'bridge',
  },
  B2: {
    id: 'B2',
    cefrLabel: 'B2',
    title: 'Wayfinder Diplomat',
    subtitle: 'Science curiosity, living folklore, register nuances & respectful persuasion',
    unitRange: [12, 14],
    badgeColor: '#F59E0B',
    surfaceTint: '#FEF3C7',
    scaffoldingMode: 'bridge',
  },
  C1_C2: {
    id: 'C1_C2',
    cefrLabel: 'C1+',
    title: 'Polyglot Laureate',
    subtitle: 'Native idioms, proverbs, multi-clause synthesis & Grand Symposium mastery',
    unitRange: [15, 16],
    badgeColor: '#EC4899',
    surfaceTint: '#FCE7F3',
    scaffoldingMode: 'fluent',
  },
};

export function resolveUnitProficiencyTier(unitOrder: number): ProficiencyTier {
  if (unitOrder <= 4) return 'A1';
  if (unitOrder <= 8) return 'A2';
  if (unitOrder <= 11) return 'B1';
  if (unitOrder <= 14) return 'B2';
  return 'C1_C2';
}

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
  // Unit 9 (B1): Past Adventures & Storytelling
  'hourglass_memory',
  'travel_journal',
  'campfire_story',
  'ancient_ruins',
  'vintage_postcard',
  // Unit 10 (B1): Future Dreams & Plans
  'architect_blueprint',
  'horizon_telescope',
  'graduation_cap',
  'sprouting_seedling',
  'calendar_milestone',
  // Unit 11 (B1): Wellness, Feelings & Empathy
  'warm_teacup',
  'helping_hands',
  'calm_lotus',
  'bandaid_care',
  'feelings_weather',
  // Unit 12 (B2): Science, Curiosity & Nature
  'science_microscope',
  'crystal_beaker',
  'magnifying_discovery',
  'solar_wind_planet',
  'coral_reef_ecosystem',
  // Unit 13 (B2): Festivals, Folklore & Register
  'festival_lanterns',
  'folklore_mask',
  'ceremonial_tea_set',
  'woven_tapestry',
  'royal_bow_greeting',
  // Unit 14 (B2): Perspectives & Persuasion
  'balance_scales',
  'debate_podium',
  'lightbulb_idea',
  'bridge_connection',
  'peace_olive_dove',
  // Unit 15 (C1–C2): Idiomatic Wit & Proverbs
  'idiom_scroll',
  'golden_key_proverb',
  'theater_comedy_masks',
  'clever_fox_lantern',
  'lightning_wit',
  // Unit 16 (C1–C2): Grand Polyglot Symposium
  'laureate_wreath',
  'grand_symposium_globe',
  'quill_inkwell',
  'symphony_conductor',
  'crystal_owl_crest',
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export type RegisterNuanceTag = 'polite' | 'casual' | 'idiom' | 'connector' | 'grammar';

export interface TapHintToken {
  surface: string;
  normalizedId: string;
  translation: string;
  phonetic: string;
  romanized?: string;
  articleNote?: string;
  accentNote?: string;
  registerNote?: string;
  grammarNote?: string;
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
  proficiencyTier?: ProficiencyTier;
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
  registerNote?: string;
  grammarNote?: string;
  illustrationKey: IllustrationKey;
  exampleForeign: string;
  exampleEnglish: string;
  examplePhonetic: string;
  exampleRomanized?: string;
  plainEnglish?: string;
  examplePlainEnglish?: string;
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
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  allowFreeRecall?: boolean;
  plainEnglish?: string;
  vocabIds: string[];
}

export interface ContextClozeExercise {
  type: 'context_cloze';
  id: string;
  sentenceBeforeBlank: string;
  sentenceAfterBlank: string;
  fullForeignSentence: string;
  englishTranslation: string;
  phonetic: string;
  romanized?: string;
  choices: string[];
  expectedBlank: string;
  acceptedBlanks: string[];
  nuanceNote: string;
  registerTag?: RegisterNuanceTag;
  tapHints: TapHintToken[];
  plainEnglish?: string;
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
  plainEnglish?: string;
  vocabIds: string[];
}

export interface PairMatchItem {
  id: string;
  foreign: string;
  english: string;
  phonetic: string;
  romanized?: string;
  plainEnglish?: string;
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
  plainEnglish?: string;
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
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  allowFreeRecall?: boolean;
  plainEnglish?: string;
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
  | ContextClozeExercise
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
  proficiencyTier?: ProficiencyTier;
  checkpointTargetTier?: Exclude<ProficiencyTier, 'A1'>;
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
  proficiencyTier?: ProficiencyTier;
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

export type ArcadeProficiencyTier = 'sprout' | 'voyager' | 'master';

export interface ArcadeLanternItem {
  id: string;
  language: LanguageCode;
  foreign: string;
  english: string;
  phonetic: string;
  romanized?: string;
  illustrationKey: IllustrationKey;
  proficiencyTier?: ProficiencyTier;
  exampleForeign?: string;
  exampleEnglish?: string;
  examplePhonetic?: string;
  exampleRomanized?: string;
  plainEnglish?: string;
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

export type CosmeticSlot = 'hat' | 'glasses' | 'cape' | 'aura' | 'prop' | 'pet' | 'theme';

export type CosmeticId =
  // Hats (9)
  | 'hat_explorer_beret'
  | 'hat_fiesta_sombrero'
  | 'hat_alpine_tyrolean'
  | 'hat_gondolier_boater'
  | 'hat_starlight_wizard'
  | 'hat_sakura_crown'
  | 'hat_desert_turban_star'
  | 'hat_astronomer_mitre'
  | 'hat_laureate_wreath'
  // Glasses (5)
  | 'glasses_brass_aviator'
  | 'glasses_starlight_frames'
  | 'glasses_scholar_monocle'
  | 'glasses_pixel_visor'
  | 'glasses_constellation_shades'
  // Capes (4)
  | 'cape_rainbow_wings'
  | 'cape_traveler_cloak'
  | 'cape_aurora_mantle'
  | 'cape_velvet_laureate'
  // Auras (5)
  | 'aura_golden_compass'
  | 'aura_fireflies'
  | 'aura_sakura_breeze'
  | 'aura_polyglot_glyphs'
  | 'aura_laureate_supernova'
  // Handheld Props (7)
  | 'prop_explorer_ukulele'
  | 'prop_starlight_telescope'
  | 'prop_golden_quill'
  | 'prop_festival_lantern'
  | 'prop_boulangerie_whisk'
  | 'prop_compass_astrolabe'
  | 'prop_laureate_scroll'
  // Mini Sidekick Pets (6)
  | 'pet_origami_crane'
  | 'pet_clockwork_owl'
  | 'pet_axolotl_sprite'
  | 'pet_desert_fennec'
  | 'pet_starlight_seahorse'
  | 'pet_phoenix_chick'
  // UI Themes (14)
  | 'theme_sunset_plaza'
  | 'theme_starlight_indigo'
  | 'theme_alpine_meadow'
  | 'theme_cosmic_galaxy'
  | 'theme_aurora_borealis'
  | 'theme_candy_sakura'
  | 'theme_ocean_lagoon'
  | 'theme_royal_velvet'
  | 'theme_kyoto_matcha'
  | 'theme_sahara_mirage'
  | 'theme_emerald_rainforest'
  | 'theme_neon_night_market'
  | 'theme_nordic_fjord'
  | 'theme_laureate_imperial';

export interface EquippedCosmetics {
  hat?: CosmeticId;
  glasses?: CosmeticId;
  cape?: CosmeticId;
  aura?: CosmeticId;
  prop?: CosmeticId;
  pet?: CosmeticId;
  theme?: CosmeticId;
}

export interface CosmeticItem {
  id: CosmeticId;
  slot: CosmeticSlot;
  name: string;
  description: string;
  costGems: number;
  accentColor: string;
  tierHint?: ProficiencyTier;
}

export type AvatarId =
  | 'pip_explorer'
  | 'mateo_chef'
  | 'colette_baker'
  | 'benni_tinker'
  | 'luca_captain'
  | 'star_compass'
  | 'origami_crane_crest'
  | 'clockwork_owl_crest'
  | 'fennec_voyager'
  | 'grand_laureate_crest';

export const STREAK_SHIELD_COST_GEMS = 45;
export const HEART_ELIXIR_COST_GEMS = 35;
export const HEART_CRYSTAL_COST_GEMS = 110;
export const MAX_HEART_CONTAINERS = 8;
export const XP_BOOSTER_COST_GEMS = 65;
export const XP_BOOSTER_CHARGES_PER_BUY = 3;
export const FREE_RECALL_BONUS_XP = 10;
export const FREE_RECALL_BONUS_GEMS = 3;

export const STARTER_AVATAR_IDS: readonly AvatarId[] = [
  'pip_explorer',
  'mateo_chef',
  'colette_baker',
  'benni_tinker',
  'luca_captain',
  'star_compass',
] as const;

export const UNLOCKABLE_AVATAR_COSTS: Record<AvatarId, number> = {
  pip_explorer: 0,
  mateo_chef: 0,
  colette_baker: 0,
  benni_tinker: 0,
  luca_captain: 0,
  star_compass: 0,
  origami_crane_crest: 60,
  clockwork_owl_crest: 90,
  fennec_voyager: 120,
  grand_laureate_crest: 220,
};

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
  | 'starlight_master'
  | 'globe_trotter_5'
  | 'grand_atlas_10'
  | 'storyweaver_b1'
  | 'diplomat_b2'
  | 'polyglot_laureate_c2'
  | 'free_recall_virtuoso'
  | 'nuance_detective'
  | 'fluent_listener'
  | 'wardrobe_stylist'
  | 'crystal_heart_guardian'
  | 'arcade_champion'
  | 'laureate_legend_xp';

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
  | 'starlight_legend'
  | 'emerald_diplomat'
  | 'amethyst_symposium'
  | 'grand_polyglot_laureate';

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
  unlockedTiers?: ProficiencyTier[];
}

export type LanguageProgressMap = Record<BaseLanguageCode, LanguageProgressState> &
  Partial<Record<AdultLanguageCode, LanguageProgressState>>;

export interface KidProfile {
  id: string;
  name: string;
  avatarId: AvatarId;
  bannerColor: string;
  activeLanguage: LanguageCode;
  lastBaseLanguage?: BaseLanguageCode;
  adultModeUnlocked?: boolean;
  adultModeActive?: boolean;
  gems: number;
  hearts: number;
  maxHearts: number;
  streakDays: number;
  lastPracticeISO: string | null;
  streakShields: number;
  heartElixirs?: number;
  xpBoosterCharges?: number;
  unlockedAvatars?: AvatarId[];
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
    freeRecallSolved?: number;
    fluentPlaysCount?: number;
    checkpointsPassed?: number;
    clozeSolved?: number;
  };
  languageProgress: LanguageProgressMap;
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
  | 'secret_fanfare'
  | 'tier_unlock'
  | 'booster_spark'
  | 'free_recall_ace'
  | 'laureate_fanfare'
  | 'equip_prop_pet'
  | 'adult_unlock';

export type SpeechSpeed = 'normal' | 'slow' | 'fluent';

export interface SpeakRequest {
  text: string;
  language: LanguageCode | 'en';
  slow?: boolean;
  speed?: SpeechSpeed;
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
  activeSpeed: SpeechSpeed | null;
  fallbackActive: boolean;
  voicesReady: boolean;
}
