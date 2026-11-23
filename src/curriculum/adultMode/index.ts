/// <reference types="vite/client" />

import {
  ADULT_MASHUP_LANGUAGES,
  isAdultMashupLanguage,
  type AdultLanguageCode,
  type AdultMashupLanguageCode,
  type LanguageCourse,
} from '../../types/contracts';
import type { GlossaryMap } from '../helpers';
import { ebonicsCourse, ebonicsGlossary } from './ebonicsCourse';
import { suburbanCourse, suburbanGlossary } from './suburbanCourse';

export { ebonicsCourse, ebonicsGlossary } from './ebonicsCourse';
export { suburbanCourse, suburbanGlossary } from './suburbanCourse';

export const ADULT_COURSES: Partial<Record<AdultLanguageCode, LanguageCourse>> = {
  ebonics: ebonicsCourse,
  suburban: suburbanCourse,
};

export const ADULT_GLOSSARIES: Partial<Record<AdultLanguageCode, GlossaryMap>> = {
  ebonics: ebonicsGlossary,
  suburban: suburbanGlossary,
};

export interface AdultMashupModuleExports {
  course?: LanguageCourse;
  glossary?: GlossaryMap;
  languageCode?: AdultMashupLanguageCode;
  corpTradesCourse?: LanguageCourse;
  corpTradesGlossary?: GlossaryMap;
  midwestNortheastCourse?: LanguageCourse;
  midwestNortheastGlossary?: GlossaryMap;
  southGenzCourse?: LanguageCourse;
  southGenzGlossary?: GlossaryMap;
  caliCountryCourse?: LanguageCourse;
  caliCountryGlossary?: GlossaryMap;
  stonerTacticalCourse?: LanguageCourse;
  stonerTacticalGlossary?: GlossaryMap;
}

export interface LoadedAdultMashupModule {
  language: AdultLanguageCode;
  course: LanguageCourse;
  glossary: GlossaryMap;
}

export type AdultMashupLoader = () => Promise<LoadedAdultMashupModule | undefined>;

interface MashupLoaderSpec {
  path: string;
  pickCourse: (mod: AdultMashupModuleExports) => LanguageCourse | undefined;
  pickGlossary: (mod: AdultMashupModuleExports) => GlossaryMap | undefined;
}

const MASHUP_LOADER_SPECS: Record<AdultMashupLanguageCode, MashupLoaderSpec> = {
  corp_trades: {
    path: './mashups/corpTrades.ts',
    pickCourse: (mod) => mod.corpTradesCourse ?? mod.course,
    pickGlossary: (mod) => mod.corpTradesGlossary ?? mod.glossary,
  },
  midwest_northeast: {
    path: './mashups/midwestNortheast.ts',
    pickCourse: (mod) => mod.midwestNortheastCourse ?? mod.course,
    pickGlossary: (mod) => mod.midwestNortheastGlossary ?? mod.glossary,
  },
  south_genz: {
    path: './mashups/southGenz.ts',
    pickCourse: (mod) => mod.southGenzCourse ?? mod.course,
    pickGlossary: (mod) => mod.southGenzGlossary ?? mod.glossary,
  },
  cali_country: {
    path: './mashups/caliCountry.ts',
    pickCourse: (mod) => mod.caliCountryCourse ?? mod.course,
    pickGlossary: (mod) => mod.caliCountryGlossary ?? mod.glossary,
  },
  stoner_tactical: {
    path: './mashups/stonerTactical.ts',
    pickCourse: (mod) => mod.stonerTacticalCourse ?? mod.course,
    pickGlossary: (mod) => mod.stonerTacticalGlossary ?? mod.glossary,
  },
};

// Keep mashup chunks strictly non-eager so Vite emits separate lazy-loaded bundles.
const mashupGlobModules = import.meta.glob<AdultMashupModuleExports>('./mashups/*.ts');

function resolveGlobLoader(
  targetPath: string
): (() => Promise<AdultMashupModuleExports>) | undefined {
  if (mashupGlobModules[targetPath]) {
    return mashupGlobModules[targetPath];
  }
  for (const [key, loader] of Object.entries(mashupGlobModules)) {
    if (key.replace(/\\/g, '/') === targetPath) {
      return loader;
    }
  }
  return undefined;
}

function buildMashupLoader(lang: AdultMashupLanguageCode): AdultMashupLoader {
  const spec = MASHUP_LOADER_SPECS[lang];
  return async () => {
    const globLoader = resolveGlobLoader(spec.path);
    if (!globLoader) {
      return undefined;
    }
    const mod = await globLoader();
    if (!mod || typeof mod !== 'object') {
      return undefined;
    }
    const course = spec.pickCourse(mod);
    if (!course) {
      return undefined;
    }
    const glossary = spec.pickGlossary(mod) ?? {};
    return {
      language: lang,
      course,
      glossary,
    };
  };
}

export const ADULT_MASHUP_LOADERS = Object.fromEntries(
  ADULT_MASHUP_LANGUAGES.map((lang) => [lang, buildMashupLoader(lang)])
) as Record<AdultMashupLanguageCode, AdultMashupLoader>;

/**
 * Dynamically loads an Adult Mode course/glossary payload on demand.
 * Classic tracks resolve from the already-loaded adult-atlas chunk; mashups lazy-load via glob.
 */
export async function loadAdultMashupModule(
  lang: AdultLanguageCode
): Promise<LoadedAdultMashupModule | undefined> {
  if (lang === 'ebonics') {
    return { language: 'ebonics', course: ebonicsCourse, glossary: ebonicsGlossary };
  }
  if (lang === 'suburban') {
    return { language: 'suburban', course: suburbanCourse, glossary: suburbanGlossary };
  }
  if (isAdultMashupLanguage(lang)) {
    return ADULT_MASHUP_LOADERS[lang]();
  }
  return undefined;
}
