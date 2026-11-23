import { useEffect, useSyncExternalStore } from 'react';
import * as curriculum from '../../curriculum';
import {
  isAdultLanguage,
  type AdultLanguageCode,
  type LanguageCode,
} from '../../types/contracts';

interface LazyAdultCurriculumExports {
  ensureAdultCourseLoaded?: (lang: AdultLanguageCode) => Promise<unknown>;
  ensureAllAdultCoursesLoaded?: () => Promise<void>;
  isAdultTrackLoaded?: (lang: AdultLanguageCode) => boolean;
  subscribeAdultRegistry?: (listener: () => void) => () => void;
  getAdultRegistryVersion?: () => number;
}

const extCurriculum = curriculum as typeof curriculum & LazyAdultCurriculumExports;

let loadErrorSnapshot: Partial<Record<AdultLanguageCode, string>> = {};
const loadErrorListeners = new Set<() => void>();

function subscribeRegistry(listener: () => void): () => void {
  if (typeof extCurriculum.subscribeAdultRegistry === 'function') {
    return extCurriculum.subscribeAdultRegistry(listener);
  }
  return () => {};
}

function getRegistrySnapshot(): number {
  if (typeof extCurriculum.getAdultRegistryVersion === 'function') {
    return extCurriculum.getAdultRegistryVersion();
  }
  return 0;
}

function subscribeLoadErrors(listener: () => void): () => void {
  loadErrorListeners.add(listener);
  return () => {
    loadErrorListeners.delete(listener);
  };
}

function getLoadErrorSnapshot(): Partial<Record<AdultLanguageCode, string>> {
  return loadErrorSnapshot;
}

function setAdultLoadError(lang: AdultLanguageCode, message: string | null): void {
  const prev = loadErrorSnapshot[lang];
  if (!message) {
    if (prev === undefined) return;
    const next = { ...loadErrorSnapshot };
    delete next[lang];
    loadErrorSnapshot = next;
  } else {
    if (prev === message) return;
    loadErrorSnapshot = { ...loadErrorSnapshot, [lang]: message };
  }
  for (const listener of Array.from(loadErrorListeners)) {
    listener();
  }
}

/**
 * Subscribes reactively to lazy adult curriculum registry updates with safe fallback
 * when lazy registry helpers are absent.
 */
export function useAdultRegistryVersion(): number {
  return useSyncExternalStore(subscribeRegistry, getRegistrySnapshot, getRegistrySnapshot);
}

/**
 * Subscribes reactively to per-language offline/chunk load error state for Adult Mode tracks.
 */
export function useAdultLoadError(lang: LanguageCode): string | null {
  const snapshot = useSyncExternalStore(
    subscribeLoadErrors,
    getLoadErrorSnapshot,
    getLoadErrorSnapshot
  );
  if (!isAdultLanguage(lang)) return null;
  if (typeof extCurriculum.isAdultTrackLoaded === 'function' && extCurriculum.isAdultTrackLoaded(lang)) {
    return null;
  }
  return snapshot[lang] ?? null;
}

/**
 * Triggers on-demand loading for a specific adult track when available,
 * catching rejected dynamic imports and recording reactive error state.
 */
export function triggerAdultCourseLoad(lang: LanguageCode): void {
  if (!isAdultLanguage(lang) || typeof extCurriculum.ensureAdultCourseLoaded !== 'function') {
    return;
  }
  if (typeof extCurriculum.isAdultTrackLoaded === 'function' && extCurriculum.isAdultTrackLoaded(lang)) {
    setAdultLoadError(lang, null);
    return;
  }
  setAdultLoadError(lang, null);
  void extCurriculum
    .ensureAdultCourseLoaded(lang)
    .then((course) => {
      const loaded =
        typeof extCurriculum.isAdultTrackLoaded === 'function'
          ? extCurriculum.isAdultTrackLoaded(lang)
          : Boolean((course as { units?: unknown[] } | undefined)?.units?.length);
      if (loaded) {
        setAdultLoadError(lang, null);
      } else {
        setAdultLoadError(
          lang,
          'This track is not cached for offline use yet. Reconnect and try again.'
        );
      }
    })
    .catch((err: unknown) => {
      const detail =
        err instanceof Error && err.message
          ? err.message
          : 'Offline or unavailable — unable to load this track right now.';
      setAdultLoadError(lang, detail);
    });
}

/**
 * Retries loading a previously failed Adult Mode track on user request.
 */
export function retryAdultCourseLoad(lang: LanguageCode): void {
  if (!isAdultLanguage(lang)) return;
  setAdultLoadError(lang, null);
  triggerAdultCourseLoad(lang);
}

/**
 * Triggers background hydration for all adult tracks when Adult Mode is armed,
 * guarding against unhandled promise rejections when offline.
 */
export function triggerAllAdultCoursesLoad(): void {
  if (typeof extCurriculum.ensureAllAdultCoursesLoaded === 'function') {
    void extCurriculum.ensureAllAdultCoursesLoaded().catch(() => {
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
