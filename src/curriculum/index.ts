import type {
  ArcadeLanternItem,
  CourseUnit,
  LanguageCode,
  LanguageCourse,
  MapNode,
  VocabCard,
} from '../types/contracts';
import { buildArcadeLexicon } from './arcadeLexicon';
import { germanCourse } from './de';
import { spanishCourse } from './es';
import { frenchCourse } from './fr';
import { italianCourse } from './it';

export const COURSES: Record<LanguageCode, LanguageCourse> = {
  es: spanishCourse,
  fr: frenchCourse,
  de: germanCourse,
  it: italianCourse,
};

export function getCourse(lang: LanguageCode): LanguageCourse {
  return COURSES[lang];
}

export function getUnitById(lang: LanguageCode, unitId: string): CourseUnit | undefined {
  return COURSES[lang].units.find((u) => u.id === unitId);
}

export function getNodeById(lang: LanguageCode, nodeId: string): MapNode | undefined {
  for (const unit of COURSES[lang].units) {
    const found = unit.nodes.find((n) => n.id === nodeId);
    if (found) return found;
  }
  return undefined;
}

export function getVocabCard(lang: LanguageCode, vocabId: string): VocabCard | undefined {
  return COURSES[lang].vocabById[vocabId];
}

export function getArcadeLexicon(
  lang: LanguageCode,
  unlockedVocabIds: readonly string[],
  currentUnitIndex: number
): ArcadeLanternItem[] {
  return buildArcadeLexicon(COURSES[lang], unlockedVocabIds, currentUnitIndex);
}
