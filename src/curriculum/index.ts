import {
  ALL_LANGUAGE_LIST,
  VISIBLE_BASE_LANGUAGES,
  isAdultLanguage,
  type ArcadeLanternItem,
  type ArcadeProficiencyTier,
  type BaseLanguageCode,
  type CourseUnit,
  type LanguageCode,
  type LanguageCourse,
  type MapNode,
  type VocabCard,
} from '../types/contracts';
import { getAdultCourse } from './adultRegistry';
import { buildArcadeLexicon } from './arcadeLexicon';
import { getBaseCourse } from './baseRegistry';

const BASE_LANGUAGE_SET: ReadonlySet<string> = new Set<string>(VISIBLE_BASE_LANGUAGES);

function isBaseLanguageKey(prop: string | symbol): prop is BaseLanguageCode {
  return typeof prop === 'string' && BASE_LANGUAGE_SET.has(prop);
}

/**
 * Lazy-backed Proxy delegating property reads to `getBaseCourse(lang)` so Vite
 * production builds split non-Spanish base courses into separate chunks while
 * preserving synchronous `Record<BaseLanguageCode, LanguageCourse>` ergonomics.
 */
export const COURSES: Record<BaseLanguageCode, LanguageCourse> = new Proxy(
  {} as Record<BaseLanguageCode, LanguageCourse>,
  {
    get(target, prop) {
      if (isBaseLanguageKey(prop)) {
        return getBaseCourse(prop);
      }
      return Reflect.get(target, prop);
    },
    has(target, prop) {
      if (isBaseLanguageKey(prop)) {
        return true;
      }
      return Reflect.has(target, prop);
    },
    ownKeys() {
      return [...VISIBLE_BASE_LANGUAGES];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (isBaseLanguageKey(prop)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: getBaseCourse(prop),
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  }
);

/**
 * Returns the language codes visible in UI pickers for the current Adult Mode state.
 */
export function getVisibleLanguageCodes(adultModeActive: boolean): readonly LanguageCode[] {
  return adultModeActive ? ALL_LANGUAGE_LIST : VISIBLE_BASE_LANGUAGES;
}

export function getCourse(lang: LanguageCode): LanguageCourse {
  return isAdultLanguage(lang) ? getAdultCourse(lang) : getBaseCourse(lang);
}

export function getUnitById(lang: LanguageCode, unitId: string): CourseUnit | undefined {
  return getCourse(lang).units.find((u) => u.id === unitId);
}

export function getNodeById(lang: LanguageCode, nodeId: string): MapNode | undefined {
  for (const unit of getCourse(lang).units) {
    const found = unit.nodes.find((n) => n.id === nodeId);
    if (found) return found;
  }
  return undefined;
}

export function getVocabCard(lang: LanguageCode, vocabId: string): VocabCard | undefined {
  return getCourse(lang).vocabById[vocabId];
}

export function getArcadeLexicon(
  lang: LanguageCode,
  unlockedVocabIds: readonly string[],
  currentUnitIndex: number,
  arcadeTier?: ArcadeProficiencyTier
): ArcadeLanternItem[] {
  return buildArcadeLexicon(getCourse(lang), unlockedVocabIds, currentUnitIndex, arcadeTier);
}

export {
  ensureAdultCourseLoaded,
  ensureAllAdultCoursesLoaded,
  getAdultCourse,
  getAdultGlossary,
  getAdultRegistryVersion,
  isAdultCurriculumLoaded,
  isAdultTrackLoaded,
  registerAdultCourses,
  subscribeAdultRegistry,
} from './adultRegistry';

export {
  ensureAllBaseCoursesLoaded,
  ensureBaseCourseLoaded,
  getBaseCourse,
  getBaseGlossary,
  getBaseLoadState,
  getBaseRegistryVersion,
  isBaseCurriculumLoaded,
  isBaseTrackLoaded,
  registerBaseCourses,
  subscribeBaseRegistry,
} from './baseRegistry';

export {
  buildSrsReviewQuestNode,
  buildTierCheckpointNode,
  getCourseGlossary,
  getNodePoolSize,
  getPlayableNodeExercises,
} from './levelPool';

export {
  lookupGlossaryEntry,
  normalizeLookupKey,
  stripEdgePunctuation,
  type GlossaryEntry,
  type GlossaryMap,
} from './helpers';
