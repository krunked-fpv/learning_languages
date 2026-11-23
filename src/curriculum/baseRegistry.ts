import {
  LANGUAGE_META,
  VISIBLE_BASE_LANGUAGES,
  type BaseCourseLoadState,
  type BaseLanguageCode,
  type LanguageCourse,
} from '../types/contracts';
import { BASE_COURSE_LOADERS, EAGER_BASE_COURSES } from './baseCoursesLoader';
import type { GlossaryMap } from './helpers';

const BASE_LANGUAGE_SET: ReadonlySet<string> = new Set<string>(VISIBLE_BASE_LANGUAGES);
const EMPTY_GLOSSARY: GlossaryMap = Object.freeze({});
const DEFAULT_UNLOADED_STATE: BaseCourseLoadState = Object.freeze({
  loaded: false,
  loading: false,
  error: null,
});
const DEFAULT_LOADED_STATE: BaseCourseLoadState = Object.freeze({
  loaded: true,
  loading: false,
  error: null,
});

function isBaseLanguage(code: string): code is BaseLanguageCode {
  return BASE_LANGUAGE_SET.has(code);
}

function createFallbackBaseCourse(lang: BaseLanguageCode): LanguageCourse {
  return {
    language: lang,
    meta: LANGUAGE_META[lang],
    units: [],
    vocabById: {},
  };
}

const FALLBACK_BASE_COURSES = Object.fromEntries(
  VISIBLE_BASE_LANGUAGES.map((lang) => [lang, createFallbackBaseCourse(lang)])
) as Record<BaseLanguageCode, LanguageCourse>;

const baseCourseRegistry: Partial<Record<BaseLanguageCode, LanguageCourse>> = {};
const baseGlossaryRegistry: Partial<Record<BaseLanguageCode, GlossaryMap>> = {};
const baseLoadStates: Partial<Record<BaseLanguageCode, BaseCourseLoadState>> = {};
const registryListeners = new Set<() => void>();
const inflightTrackLoads = new Map<BaseLanguageCode, Promise<LanguageCourse>>();
let inflightLoadAll: Promise<void> | null = null;
let registryVersion = 0;

function notifyBaseListeners(): void {
  registryVersion += 1;
  for (const listener of Array.from(registryListeners)) {
    listener();
  }
}

/**
 * Registers base language courses and glossaries synchronously and notifies subscribers.
 */
export function registerBaseCourses(
  courses: Partial<Record<BaseLanguageCode, LanguageCourse>>,
  glossaries?: Partial<Record<BaseLanguageCode, GlossaryMap>>
): void {
  let updated = false;
  for (const lang of VISIBLE_BASE_LANGUAGES) {
    const course = courses[lang];
    if (course && course !== FALLBACK_BASE_COURSES[lang]) {
      baseCourseRegistry[lang] = course;
      if (course.units.length > 0) {
        baseLoadStates[lang] = DEFAULT_LOADED_STATE;
      }
      updated = true;
    }
    const glossary = glossaries?.[lang];
    if (glossary) {
      baseGlossaryRegistry[lang] = glossary;
      updated = true;
    }
  }
  if (updated) {
    notifyBaseListeners();
  }
}

// Hydrate eager entries synchronously (`es` in prod build, all 16 languages in Vitest).
const initialCourses: Partial<Record<BaseLanguageCode, LanguageCourse>> = {};
const initialGlossaries: Partial<Record<BaseLanguageCode, GlossaryMap>> = {};
for (const lang of VISIBLE_BASE_LANGUAGES) {
  const payload = EAGER_BASE_COURSES[lang];
  if (payload) {
    initialCourses[lang] = payload.course;
    initialGlossaries[lang] = payload.glossary;
  }
}
registerBaseCourses(initialCourses, initialGlossaries);

/**
 * Returns true if the specified base language course has registered non-empty units.
 */
export function isBaseTrackLoaded(lang: BaseLanguageCode): boolean {
  if (!isBaseLanguage(lang)) return false;
  const course = baseCourseRegistry[lang];
  return Boolean(course && course.units.length > 0);
}

/**
 * Returns true once all 16 base language courses are loaded and registered.
 */
export function isBaseCurriculumLoaded(): boolean {
  return VISIBLE_BASE_LANGUAGES.every((lang) => isBaseTrackLoaded(lang));
}

/**
 * Monotonic version incremented whenever base courses or load states change.
 */
export function getBaseRegistryVersion(): number {
  return registryVersion;
}

/**
 * Subscribes a listener notified whenever base courses are registered or load state changes.
 */
export function subscribeBaseRegistry(listener: () => void): () => void {
  registryListeners.add(listener);
  return () => {
    registryListeners.delete(listener);
  };
}

/**
 * Returns the load state (`loaded`, `loading`, `error`) for a base language course.
 */
export function getBaseLoadState(lang: BaseLanguageCode): BaseCourseLoadState {
  if (!isBaseLanguage(lang)) {
    throw new Error(`Unknown base language code "${String(lang)}"`);
  }
  if (isBaseTrackLoaded(lang)) {
    return DEFAULT_LOADED_STATE;
  }
  return baseLoadStates[lang] ?? DEFAULT_UNLOADED_STATE;
}

/**
 * Returns the registered base LanguageCourse, or a referentially stable empty fallback
 * course if the track has not finished loading yet.
 */
export function getBaseCourse(lang: BaseLanguageCode): LanguageCourse {
  if (!isBaseLanguage(lang)) {
    throw new Error(`Unknown base language code "${String(lang)}"`);
  }
  return baseCourseRegistry[lang] ?? FALLBACK_BASE_COURSES[lang];
}

/**
 * Returns the registered base GlossaryMap, or an empty glossary if not yet loaded.
 */
export function getBaseGlossary(lang: BaseLanguageCode): GlossaryMap {
  if (!isBaseLanguage(lang)) {
    throw new Error(`Unknown base language code "${String(lang)}"`);
  }
  return baseGlossaryRegistry[lang] ?? EMPTY_GLOSSARY;
}

/**
 * Dynamically loads and registers a base language course on demand, deduplicating
 * concurrent requests for the same language.
 */
export function ensureBaseCourseLoaded(lang: BaseLanguageCode): Promise<LanguageCourse> {
  if (!isBaseLanguage(lang)) {
    return Promise.reject(new Error(`Unknown base language code "${String(lang)}"`));
  }
  if (isBaseTrackLoaded(lang)) {
    return Promise.resolve(baseCourseRegistry[lang]!);
  }

  const inflight = inflightTrackLoads.get(lang);
  if (inflight) {
    return inflight;
  }

  baseLoadStates[lang] = { loaded: false, loading: true, error: null };
  notifyBaseListeners();

  const loadPromise = (async (): Promise<LanguageCourse> => {
    try {
      const loader = BASE_COURSE_LOADERS[lang];
      const payload = await loader();
      if (payload?.course && !isBaseTrackLoaded(lang)) {
        registerBaseCourses(
          { [lang]: payload.course },
          payload.glossary ? { [lang]: payload.glossary } : undefined
        );
      }
      return getBaseCourse(lang);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : `Unable to load ${LANGUAGE_META[lang].name} course right now.`;
      baseLoadStates[lang] = { loaded: false, loading: false, error: message };
      notifyBaseListeners();
      throw err;
    } finally {
      inflightTrackLoads.delete(lang);
    }
  })();

  inflightTrackLoads.set(lang, loadPromise);
  return loadPromise;
}

/**
 * Ensures all 16 base language courses are loaded and registered.
 */
export function ensureAllBaseCoursesLoaded(): Promise<void> {
  const pendingLangs = VISIBLE_BASE_LANGUAGES.filter((lang) => !isBaseTrackLoaded(lang));
  if (pendingLangs.length === 0) return Promise.resolve();

  if (inflightLoadAll) {
    return inflightLoadAll;
  }

  inflightLoadAll = Promise.all(pendingLangs.map((lang) => ensureBaseCourseLoaded(lang)))
    .then(() => undefined)
    .finally(() => {
      inflightLoadAll = null;
    });

  return inflightLoadAll;
}
