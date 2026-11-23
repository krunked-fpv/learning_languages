/// <reference types="vite/client" />

import {
  ADULT_EASTER_EGG_LANGUAGES,
  LANGUAGE_META,
  isAdultLanguage,
  isAdultMashupLanguage,
  type AdultLanguageCode,
  type AdultMashupLanguageCode,
  type LanguageCourse,
} from '../types/contracts';
import type { GlossaryMap } from './helpers';

interface LoadedAdultMashupModule {
  language?: AdultLanguageCode;
  course: LanguageCourse;
  glossary: GlossaryMap;
}

type AdultMashupLoader = () => Promise<LoadedAdultMashupModule | undefined>;

interface AdultModeModuleExports {
  ADULT_COURSES?: Partial<Record<AdultLanguageCode, LanguageCourse>>;
  ADULT_GLOSSARIES?: Partial<Record<AdultLanguageCode, GlossaryMap>>;
  ADULT_MASHUP_LOADERS?: Partial<Record<AdultMashupLanguageCode, AdultMashupLoader>>;
  loadAdultMashupModule?: (lang: AdultLanguageCode) => Promise<LoadedAdultMashupModule | undefined>;
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

const FALLBACK_ADULT_COURSES = Object.fromEntries(
  ADULT_EASTER_EGG_LANGUAGES.map((lang) => [lang, createFallbackAdultCourse(lang)])
) as Record<AdultLanguageCode, LanguageCourse>;

const adultCourseRegistry: Partial<Record<AdultLanguageCode, LanguageCourse>> = {};
const adultGlossaryRegistry: Partial<Record<AdultLanguageCode, GlossaryMap>> = {};
const registryListeners = new Set<() => void>();
const inflightTrackLoads = new Map<AdultLanguageCode, Promise<LanguageCourse>>();
let inflightLoadAll: Promise<void> | null = null;
let registryVersion = 0;

let mashupLoaders: Partial<Record<AdultMashupLanguageCode, AdultMashupLoader>> = {};
let mashupModuleLoader:
  | ((lang: AdultLanguageCode) => Promise<LoadedAdultMashupModule | undefined>)
  | undefined;

/**
 * Registers Adult Mode courses and glossaries synchronously and notifies listeners.
 * Supports test injection alongside auto-loaded adultMode/index.ts modules.
 */
export function registerAdultCourses(
  courses: Partial<Record<AdultLanguageCode, LanguageCourse>>,
  glossaries?: Partial<Record<AdultLanguageCode, GlossaryMap>>
): void {
  let updated = false;
  for (const lang of ADULT_EASTER_EGG_LANGUAGES) {
    const course = courses[lang];
    if (course && course !== FALLBACK_ADULT_COURSES[lang]) {
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
    for (const listener of Array.from(registryListeners)) {
      listener();
    }
  }
}

// Auto-load src/curriculum/adultMode/index.ts synchronously when present in the tree,
// while keeping all Vol. 2 mashups strictly non-eager via adultMode/index.ts glob loaders.
const adultModeModules = import.meta.glob<AdultModeModuleExports>('./adultMode/index.ts', {
  eager: true,
});

for (const mod of Object.values(adultModeModules)) {
  if (!mod || typeof mod !== 'object') continue;
  if (mod.ADULT_MASHUP_LOADERS) {
    mashupLoaders = { ...mashupLoaders, ...mod.ADULT_MASHUP_LOADERS };
  }
  if (typeof mod.loadAdultMashupModule === 'function') {
    mashupModuleLoader = mod.loadAdultMashupModule;
  }
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
 * Returns true if the specified Adult Mode track has a loaded non-empty course.
 */
export function isAdultTrackLoaded(lang: AdultLanguageCode): boolean {
  if (!isAdultLanguage(lang)) return false;
  const course = adultCourseRegistry[lang];
  return Boolean(course && course.units.length > 0);
}

/**
 * Returns true once all Adult Mode courses are registered.
 */
export function isAdultCurriculumLoaded(): boolean {
  return ADULT_EASTER_EGG_LANGUAGES.every((lang) => isAdultTrackLoaded(lang));
}

/**
 * Monotonic version incremented whenever adult courses or glossaries are registered.
 */
export function getAdultRegistryVersion(): number {
  return registryVersion;
}

/**
 * Subscribes a listener notified whenever Adult Mode courses/glossaries are registered.
 */
export function subscribeAdultRegistry(listener: () => void): () => void {
  registryListeners.add(listener);
  return () => {
    registryListeners.delete(listener);
  };
}

/**
 * Returns the registered Adult Mode LanguageCourse, or a referentially stable empty
 * fallback course if the track has not yet been registered/loaded.
 */
export function getAdultCourse(lang: AdultLanguageCode): LanguageCourse {
  if (!isAdultLanguage(lang)) {
    throw new Error(`Unknown adult language code "${String(lang)}"`);
  }
  return adultCourseRegistry[lang] ?? FALLBACK_ADULT_COURSES[lang];
}

/**
 * Returns the registered Adult Mode GlossaryMap, or an empty glossary if
 * the track has not yet been registered/loaded.
 */
export function getAdultGlossary(lang: AdultLanguageCode): GlossaryMap {
  if (!isAdultLanguage(lang)) {
    throw new Error(`Unknown adult language code "${String(lang)}"`);
  }
  return adultGlossaryRegistry[lang] ?? EMPTY_GLOSSARY;
}

async function resolveAdultTrackPayload(
  lang: AdultLanguageCode
): Promise<LoadedAdultMashupModule | undefined> {
  if (mashupModuleLoader) {
    return mashupModuleLoader(lang);
  }
  if (isAdultMashupLanguage(lang)) {
    const loader = mashupLoaders[lang];
    return loader ? loader() : undefined;
  }
  return undefined;
}

/**
 * Ensures the requested Adult Mode track is loaded and registered on demand.
 */
export async function ensureAdultCourseLoaded(lang: AdultLanguageCode): Promise<LanguageCourse> {
  if (!isAdultLanguage(lang)) {
    throw new Error(`Unknown adult language code "${String(lang)}"`);
  }
  if (isAdultTrackLoaded(lang)) {
    return adultCourseRegistry[lang]!;
  }

  const inflight = inflightTrackLoads.get(lang);
  if (inflight) {
    return inflight;
  }

  const loadPromise = (async (): Promise<LanguageCourse> => {
    try {
      const payload = await resolveAdultTrackPayload(lang);
      if (payload?.course && !isAdultTrackLoaded(lang)) {
        registerAdultCourses(
          { [lang]: payload.course },
          payload.glossary ? { [lang]: payload.glossary } : undefined
        );
      }
      return getAdultCourse(lang);
    } finally {
      inflightTrackLoads.delete(lang);
    }
  })();

  inflightTrackLoads.set(lang, loadPromise);
  return loadPromise;
}

/**
 * Ensures all 7 Adult Mode tracks are loaded and registered.
 */
export async function ensureAllAdultCoursesLoaded(): Promise<void> {
  const pendingLangs = ADULT_EASTER_EGG_LANGUAGES.filter((lang) => !isAdultTrackLoaded(lang));
  if (pendingLangs.length === 0) return;

  if (inflightLoadAll) {
    return inflightLoadAll;
  }

  inflightLoadAll = Promise.all(pendingLangs.map((lang) => ensureAdultCourseLoaded(lang)))
    .then(() => undefined)
    .finally(() => {
      inflightLoadAll = null;
    });

  return inflightLoadAll;
}

// Auto-populate all Adult Mode tracks during Vitest runs; dead-code eliminated in Vite prod builds.
if (import.meta.env.MODE === 'test') {
  void ensureAllAdultCoursesLoaded();
}
