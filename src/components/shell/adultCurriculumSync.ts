import { useEffect, useSyncExternalStore } from 'react';
import * as curriculum from '../../curriculum';
import {
  ADULT_EASTER_EGG_LANGUAGES,
  VISIBLE_BASE_LANGUAGES,
  isAdultLanguage,
  type AdultLanguageCode,
  type BaseCourseLoadState,
  type BaseLanguageCode,
  type LanguageCode,
} from '../../types/contracts';

interface LazyAdultCurriculumExports {
  ensureAdultCourseLoaded?: (lang: AdultLanguageCode) => Promise<unknown>;
  ensureAllAdultCoursesLoaded?: () => Promise<void>;
  isAdultTrackLoaded?: (lang: AdultLanguageCode) => boolean;
  subscribeAdultRegistry?: (listener: () => void) => () => void;
  getAdultRegistryVersion?: () => number;
}

interface LazyBaseCurriculumExports {
  ensureBaseCourseLoaded?: (lang: BaseLanguageCode) => Promise<unknown>;
  ensureAllBaseCoursesLoaded?: () => Promise<void>;
  isBaseTrackLoaded?: (lang: BaseLanguageCode) => boolean;
  subscribeBaseRegistry?: (listener: () => void) => () => void;
  getBaseRegistryVersion?: () => number;
  getBaseLoadState?: (lang: BaseLanguageCode) => BaseCourseLoadState;
}

export interface OfflinePackPrefetchOptions {
  includeAdult?: boolean;
}

export interface OfflinePackPrefetchResult {
  loadedCount: number;
  totalCount: number;
  errors: string[];
}

const extCurriculum = curriculum as typeof curriculum &
  LazyAdultCurriculumExports &
  LazyBaseCurriculumExports;

function getOptionalExport<K extends keyof (LazyAdultCurriculumExports & LazyBaseCurriculumExports)>(
  key: K
): (LazyAdultCurriculumExports & LazyBaseCurriculumExports)[K] | undefined {
  try {
    if (!(key in extCurriculum)) return undefined;
    return extCurriculum[key];
  } catch {
    return undefined;
  }
}

const BASE_LANGUAGE_SET = new Set<string>(VISIBLE_BASE_LANGUAGES);

function isBaseLanguageCode(lang: string): lang is BaseLanguageCode {
  return BASE_LANGUAGE_SET.has(lang);
}

function createLoadErrorStore<K extends string>() {
  let snapshot: Partial<Record<K, string>> = {};
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (): Partial<Record<K, string>> => snapshot,
    set: (lang: K, message: string | null): void => {
      const prev = snapshot[lang];
      if (!message) {
        if (prev === undefined) return;
        const next = { ...snapshot };
        delete next[lang];
        snapshot = next;
      } else {
        if (prev === message) return;
        snapshot = { ...snapshot, [lang]: message };
      }
      for (const listener of Array.from(listeners)) {
        listener();
      }
    },
  };
}

const adultErrorStore = createLoadErrorStore<AdultLanguageCode>();
const baseErrorStore = createLoadErrorStore<BaseLanguageCode>();

function subscribeRegistry(listener: () => void): () => void {
  const fn = getOptionalExport('subscribeAdultRegistry');
  if (typeof fn === 'function') {
    return fn(listener);
  }
  return () => {};
}

function getRegistrySnapshot(): number {
  const fn = getOptionalExport('getAdultRegistryVersion');
  if (typeof fn === 'function') {
    return fn();
  }
  return 0;
}

function subscribeBaseRegistryFn(listener: () => void): () => void {
  const fn = getOptionalExport('subscribeBaseRegistry');
  if (typeof fn === 'function') {
    return fn(listener);
  }
  return () => {};
}

function getBaseRegistrySnapshot(): number {
  const fn = getOptionalExport('getBaseRegistryVersion');
  if (typeof fn === 'function') {
    return fn();
  }
  return 0;
}

function isBaseTrackLoadedSafe(lang: BaseLanguageCode): boolean {
  const fn = getOptionalExport('isBaseTrackLoaded');
  if (typeof fn === 'function') {
    return fn(lang);
  }
  try {
    return (curriculum.getCourse(lang)?.units?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function isAdultTrackLoadedSafe(lang: AdultLanguageCode): boolean {
  const fn = getOptionalExport('isAdultTrackLoaded');
  if (typeof fn === 'function') {
    return fn(lang);
  }
  try {
    return (curriculum.getCourse(lang)?.units?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function runTrackLoad<K extends string>(options: {
  lang: K;
  isLoaded: (lang: K) => boolean;
  ensureLoaded: ((lang: K) => Promise<unknown>) | undefined;
  errorStore: ReturnType<typeof createLoadErrorStore<K>>;
  missingOfflineMsg: string;
  unavailableMsg: string;
}): void {
  const { lang, isLoaded, ensureLoaded, errorStore, missingOfflineMsg, unavailableMsg } = options;
  if (typeof ensureLoaded !== 'function') {
    return;
  }
  if (isLoaded(lang)) {
    errorStore.set(lang, null);
    return;
  }
  errorStore.set(lang, null);
  void ensureLoaded(lang)
    .then((course) => {
      const loaded =
        isLoaded(lang) || Boolean((course as { units?: unknown[] } | undefined)?.units?.length);
      if (loaded) {
        errorStore.set(lang, null);
      } else {
        errorStore.set(lang, missingOfflineMsg);
      }
    })
    .catch((err: unknown) => {
      const detail = err instanceof Error && err.message ? err.message : unavailableMsg;
      errorStore.set(lang, detail);
    });
}

/**
 * Subscribes reactively to lazy adult curriculum registry updates with safe fallback
 * when lazy registry helpers are absent.
 */
export function useAdultRegistryVersion(): number {
  return useSyncExternalStore(subscribeRegistry, getRegistrySnapshot, getRegistrySnapshot);
}

/**
 * Subscribes reactively to lazy base curriculum registry updates with safe fallback
 * when lazy registry helpers are absent.
 */
export function useBaseRegistryVersion(): number {
  return useSyncExternalStore(
    subscribeBaseRegistryFn,
    getBaseRegistrySnapshot,
    getBaseRegistrySnapshot
  );
}

/**
 * Subscribes reactively to per-language offline/chunk load error state for Adult Mode tracks.
 */
export function useAdultLoadError(lang: LanguageCode): string | null {
  const snapshot = useSyncExternalStore(
    adultErrorStore.subscribe,
    adultErrorStore.getSnapshot,
    adultErrorStore.getSnapshot
  );
  if (!isAdultLanguage(lang)) return null;
  const isLoadedFn = getOptionalExport('isAdultTrackLoaded');
  if (typeof isLoadedFn === 'function' && isLoadedFn(lang)) {
    return null;
  }
  return snapshot[lang] ?? null;
}

/**
 * Subscribes reactively to per-language offline/chunk load error state for Base courses.
 */
export function useBaseLoadError(lang: LanguageCode): string | null {
  const snapshot = useSyncExternalStore(
    baseErrorStore.subscribe,
    baseErrorStore.getSnapshot,
    baseErrorStore.getSnapshot
  );
  useBaseRegistryVersion();
  if (!isBaseLanguageCode(lang)) return null;
  const isLoadedFn = getOptionalExport('isBaseTrackLoaded');
  if (typeof isLoadedFn === 'function' && isLoadedFn(lang)) {
    return null;
  }
  const getLoadStateFn = getOptionalExport('getBaseLoadState');
  const registryError = typeof getLoadStateFn === 'function' ? getLoadStateFn(lang)?.error : null;
  return snapshot[lang] ?? registryError ?? null;
}

/**
 * Triggers on-demand loading for a specific adult track when available,
 * catching rejected dynamic imports and recording reactive error state.
 */
export function triggerAdultCourseLoad(lang: LanguageCode): void {
  if (!isAdultLanguage(lang)) return;
  const isLoadedFn = getOptionalExport('isAdultTrackLoaded');
  runTrackLoad({
    lang,
    isLoaded: (code) => typeof isLoadedFn === 'function' && isLoadedFn(code),
    ensureLoaded: getOptionalExport('ensureAdultCourseLoaded'),
    errorStore: adultErrorStore,
    missingOfflineMsg: 'This track is not cached for offline use yet. Reconnect and try again.',
    unavailableMsg: 'Offline or unavailable — unable to load this track right now.',
  });
}

/**
 * Triggers on-demand loading for a specific base course when available,
 * catching rejected dynamic imports and recording reactive error state.
 */
export function triggerBaseCourseLoad(lang: LanguageCode): void {
  if (!isBaseLanguageCode(lang)) return;
  const isLoadedFn = getOptionalExport('isBaseTrackLoaded');
  runTrackLoad({
    lang,
    isLoaded: (code) => typeof isLoadedFn === 'function' && isLoadedFn(code),
    ensureLoaded: getOptionalExport('ensureBaseCourseLoaded'),
    errorStore: baseErrorStore,
    missingOfflineMsg: 'This language is not cached for offline use yet. Reconnect and try again.',
    unavailableMsg: 'Offline or unavailable — unable to load this language right now.',
  });
}

/**
 * Retries loading a previously failed Adult Mode track on user request.
 */
export function retryAdultCourseLoad(lang: LanguageCode): void {
  if (!isAdultLanguage(lang)) return;
  adultErrorStore.set(lang, null);
  triggerAdultCourseLoad(lang);
}

/**
 * Retries loading a previously failed Base language course on user request.
 */
export function retryBaseCourseLoad(lang: LanguageCode): void {
  if (!isBaseLanguageCode(lang)) return;
  baseErrorStore.set(lang, null);
  triggerBaseCourseLoad(lang);
}

/**
 * Triggers background hydration for all adult tracks when Adult Mode is armed,
 * guarding against unhandled promise rejections when offline.
 */
export function triggerAllAdultCoursesLoad(): void {
  const fn = getOptionalExport('ensureAllAdultCoursesLoaded');
  if (typeof fn === 'function') {
    void fn().catch(() => {
      // Individual active track failures are surfaced by triggerAdultCourseLoad + useAdultLoadError.
    });
  }
}

/**
 * Reactively subscribes to the adult curriculum registry and triggers lazy chunk loading
 * whenever Adult Mode is active or an adult track is selected.
 */
export function useEnsureAdultCurriculum(
  adultModeActive: boolean,
  selectedLanguage: LanguageCode
): number {
  const version = useAdultRegistryVersion();

  useEffect(() => {
    if (isAdultLanguage(selectedLanguage)) {
      triggerAdultCourseLoad(selectedLanguage);
    }
    if (adultModeActive) {
      triggerAllAdultCoursesLoad();
    }
  }, [adultModeActive, selectedLanguage]);

  return version;
}

/**
 * Reactively subscribes to the base curriculum registry and triggers lazy chunk loading
 * whenever a base language course is selected.
 */
export function useEnsureBaseCurriculum(selectedLanguage: LanguageCode): number {
  const version = useBaseRegistryVersion();

  useEffect(() => {
    if (isBaseLanguageCode(selectedLanguage)) {
      triggerBaseCourseLoad(selectedLanguage);
    }
  }, [selectedLanguage]);

  return version;
}

/**
 * Returns the current count of loaded/cached languages for UI progress display.
 */
export function getCachedOfflinePackCounts(includeAdult = false): {
  loadedCount: number;
  totalCount: number;
} {
  let loadedCount = VISIBLE_BASE_LANGUAGES.filter((lang) => isBaseTrackLoadedSafe(lang)).length;
  let totalCount = VISIBLE_BASE_LANGUAGES.length;

  if (includeAdult) {
    loadedCount += ADULT_EASTER_EGG_LANGUAGES.filter((lang) => isAdultTrackLoadedSafe(lang)).length;
    totalCount += ADULT_EASTER_EGG_LANGUAGES.length;
  }

  return { loadedCount, totalCount };
}

/**
 * Prefetches all base languages (and optionally After-Hours tracks) for offline use,
 * returning final cached counts and any chunk errors encountered.
 */
export async function prefetchAllOfflinePacks(
  options: OfflinePackPrefetchOptions = {}
): Promise<OfflinePackPrefetchResult> {
  const includeAdult = Boolean(options.includeAdult);
  const errors: string[] = [];

  const ensureAllBaseFn = getOptionalExport('ensureAllBaseCoursesLoaded');
  const ensureBaseFn = getOptionalExport('ensureBaseCourseLoaded');

  if (typeof ensureAllBaseFn === 'function') {
    try {
      await ensureAllBaseFn();
    } catch (err) {
      errors.push(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to download all base languages for offline use.'
      );
    }
  } else if (typeof ensureBaseFn === 'function') {
    const settled = await Promise.allSettled(
      VISIBLE_BASE_LANGUAGES.map((lang) => ensureBaseFn(lang))
    );
    for (const item of settled) {
      if (item.status === 'rejected') {
        errors.push(
          item.reason instanceof Error && item.reason.message
            ? item.reason.message
            : 'Unable to download a base language pack.'
        );
      }
    }
  }

  if (includeAdult) {
    const ensureAllAdultFn = getOptionalExport('ensureAllAdultCoursesLoaded');
    const ensureAdultFn = getOptionalExport('ensureAdultCourseLoaded');
    if (typeof ensureAllAdultFn === 'function') {
      try {
        await ensureAllAdultFn();
      } catch (err) {
        errors.push(
          err instanceof Error && err.message
            ? err.message
            : 'Unable to download all After-Hours tracks for offline use.'
        );
      }
    } else if (typeof ensureAdultFn === 'function') {
      const settled = await Promise.allSettled(
        ADULT_EASTER_EGG_LANGUAGES.map((lang) => ensureAdultFn(lang))
      );
      for (const item of settled) {
        if (item.status === 'rejected') {
          errors.push(
            item.reason instanceof Error && item.reason.message
              ? item.reason.message
              : 'Unable to download an After-Hours track.'
          );
        }
      }
    }
  }

  const { loadedCount, totalCount } = getCachedOfflinePackCounts(includeAdult);
  if (loadedCount < totalCount && errors.length === 0) {
    errors.push('Some language packs are not cached yet. Reconnect and retry.');
  }

  return {
    loadedCount,
    totalCount,
    errors: Array.from(new Set(errors)),
  };
}
