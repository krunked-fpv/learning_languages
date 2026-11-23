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

/**
 * Subscribes reactively to lazy adult curriculum registry updates with safe fallback
 * when lazy registry helpers are absent.
 */
export function useAdultRegistryVersion(): number {
  return useSyncExternalStore(subscribeRegistry, getRegistrySnapshot, getRegistrySnapshot);
}

/**
 * Triggers on-demand loading for a specific adult track when available.
 */
export function triggerAdultCourseLoad(lang: LanguageCode): void {
  if (isAdultLanguage(lang) && typeof extCurriculum.ensureAdultCourseLoaded === 'function') {
    void extCurriculum.ensureAdultCourseLoaded(lang);
  }
}

/**
 * Triggers background hydration for all adult tracks when Adult Mode is armed.
 */
export function triggerAllAdultCoursesLoad(): void {
  if (typeof extCurriculum.ensureAllAdultCoursesLoaded === 'function') {
    void extCurriculum.ensureAllAdultCoursesLoaded();
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
