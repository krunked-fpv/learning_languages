/// <reference types="vite/client" />

import {
  ADULT_EASTER_EGG_LANGUAGES,
  LANGUAGE_META,
  isAdultLanguage,
  type AdultLanguageCode,
  type LanguageCourse,
} from '../types/contracts';
import type { GlossaryMap } from './helpers';

interface AdultModeModuleExports {
  ADULT_COURSES?: Partial<Record<AdultLanguageCode, LanguageCourse>>;
  ADULT_GLOSSARIES?: Partial<Record<AdultLanguageCode, GlossaryMap>>;
  ebonicsCourse?: LanguageCourse;
  suburbanCourse?: LanguageCourse;
  ebonicsGlossary?: GlossaryMap;
  suburbanGlossary?: GlossaryMap;
}

const EMPTY_GLOSSARY: GlossaryMap = Object.freeze({});

function createFallbackAdultCourse(lang: AdultLanguageCode): LanguageCourse {
  return {
    language: lang,
    meta: LANGUAGE_META[lang],
    units: [],
    vocabById: {},
  };
}

const FALLBACK_ADULT_COURSES: Record<AdultLanguageCode, LanguageCourse> = {
  ebonics: createFallbackAdultCourse('ebonics'),
  suburban: createFallbackAdultCourse('suburban'),
};

const adultCourseRegistry: Partial<Record<AdultLanguageCode, LanguageCourse>> = {};
const adultGlossaryRegistry: Partial<Record<AdultLanguageCode, GlossaryMap>> = {};
let registryVersion = 0;

/**
 * Registers Adult Mode courses and glossaries synchronously.
 * Supports test injection alongside auto-loaded adultMode/index.ts modules.
 */
export function registerAdultCourses(
  courses: Partial<Record<AdultLanguageCode, LanguageCourse>>,
  glossaries?: Partial<Record<AdultLanguageCode, GlossaryMap>>
): void {
  let updated = false;
  for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
    const course = courses[lang];
    if (course) {
      adultCourseRegistry[lang] = course;
      updated = true;
    }
    const glossary = glossaries?.[lang];
    if (glossary) {
      adultGlossaryRegistry[lang] = glossary;
      updated = true;
    }
  }
  if (updated) {
    registryVersion += 1;
  }
}

// Auto-load src/curriculum/adultMode/index.ts synchronously when present in the tree,
// while compiling cleanly in isolated worktrees before adultMode/** is merged.
const adultModeModules = import.meta.glob<AdultModeModuleExports>('./adultMode/index.ts', {
  eager: true,
});

for (const mod of Object.values(adultModeModules)) {
  if (!mod || typeof mod !== 'object') continue;
  const courses: Partial<Record<AdultLanguageCode, LanguageCourse>> = {
    ...(mod.ebonicsCourse ? { ebonics: mod.ebonicsCourse } : {}),
    ...(mod.suburbanCourse ? { suburban: mod.suburbanCourse } : {}),
    ...(mod.ADULT_COURSES ?? {}),
  };
  const glossaries: Partial<Record<AdultLanguageCode, GlossaryMap>> = {
    ...(mod.ebonicsGlossary ? { ebonics: mod.ebonicsGlossary } : {}),
    ...(mod.suburbanGlossary ? { suburban: mod.suburbanGlossary } : {}),
    ...(mod.ADULT_GLOSSARIES ?? {}),
  };
  registerAdultCourses(courses, glossaries);
}

/**
 * Returns true once both Adult Mode courses are registered.
 */
export function isAdultCurriculumLoaded(): boolean {
  return ADULT_EASTER_EGG_LANGUAGES.every((lang) => Boolean(adultCourseRegistry[lang]));
}

/**
 * Monotonic version incremented whenever adult courses or glossaries are registered.
 */
export function getAdultRegistryVersion(): number {
  return registryVersion;
}

/**
 * Returns the registered Adult Mode LanguageCourse, or a referentially stable empty
 * fallback course if adultMode/index.ts is not yet present.
 */
export function getAdultCourse(lang: AdultLanguageCode): LanguageCourse {
  if (!isAdultLanguage(lang)) {
    throw new Error(`Unknown adult language code "${String(lang)}"`);
  }
  return adultCourseRegistry[lang] ?? FALLBACK_ADULT_COURSES[lang];
}

/**
 * Returns the registered Adult Mode GlossaryMap, or an empty glossary if
 * adultMode/index.ts is not yet present.
 */
export function getAdultGlossary(lang: AdultLanguageCode): GlossaryMap {
  if (!isAdultLanguage(lang)) {
    throw new Error(`Unknown adult language code "${String(lang)}"`);
  }
  return adultGlossaryRegistry[lang] ?? EMPTY_GLOSSARY;
}
