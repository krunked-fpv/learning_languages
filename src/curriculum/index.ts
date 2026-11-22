import { LANGUAGE_META } from '../types/contracts';
import type {
  ArcadeLanternItem,
  CourseUnit,
  LanguageCode,
  LanguageCourse,
  MapNode,
  VocabCard,
} from '../types/contracts';

function emptyCourse(language: LanguageCode): LanguageCourse {
  return {
    language,
    meta: LANGUAGE_META[language],
    units: [],
    vocabById: {},
  };
}

export const COURSES: Record<LanguageCode, LanguageCourse> = {
  es: emptyCourse('es'),
  fr: emptyCourse('fr'),
  de: emptyCourse('de'),
  it: emptyCourse('it'),
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
  _lang: LanguageCode,
  _unlockedVocabIds: readonly string[],
  _currentUnitIndex: number
): ArcadeLanternItem[] {
  return [];
}
