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
import { arabicCourse } from './ar';
import { buildArcadeLexicon } from './arcadeLexicon';
import { egyptianArabicCourse } from './arz';
import { bengaliCourse } from './bn';
import { germanCourse } from './de';
import { englishCourse } from './en';
import { spanishCourse } from './es';
import { frenchCourse } from './fr';
import { hindiCourse } from './hi';
import { indonesianCourse } from './id';
import { italianCourse } from './it';
import { japaneseCourse } from './ja';
import { portugueseCourse } from './pt';
import { russianCourse } from './ru';
import { swahiliCourse } from './sw';
import { vietnameseCourse } from './vi';
import { mandarinCourse } from './zh';

export const COURSES: Record<BaseLanguageCode, LanguageCourse> = {
  es: spanishCourse,
  fr: frenchCourse,
  de: germanCourse,
  it: italianCourse,
  pt: portugueseCourse,
  en: englishCourse,
  zh: mandarinCourse,
  ja: japaneseCourse,
  hi: hindiCourse,
  bn: bengaliCourse,
  ar: arabicCourse,
  arz: egyptianArabicCourse,
  ru: russianCourse,
  id: indonesianCourse,
  vi: vietnameseCourse,
  sw: swahiliCourse,
};

/**
 * Returns the language codes visible in UI pickers for the current Adult Mode state.
 */
export function getVisibleLanguageCodes(adultModeActive: boolean): readonly LanguageCode[] {
  return adultModeActive ? ALL_LANGUAGE_LIST : VISIBLE_BASE_LANGUAGES;
}

export function getCourse(lang: LanguageCode): LanguageCourse {
  return isAdultLanguage(lang) ? getAdultCourse(lang) : COURSES[lang];
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
  getAdultCourse,
  getAdultGlossary,
  isAdultCurriculumLoaded,
  registerAdultCourses,
} from './adultRegistry';

export {
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
