import type { BaseLanguageCode, LanguageCourse } from '../types/contracts';
import { arabicCourse, arabicGlossary } from './ar';
import { egyptianArabicCourse, egyptianArabicGlossary } from './arz';
import { bengaliCourse, bengaliGlossary } from './bn';
import { germanCourse, germanGlossary } from './de';
import { englishCourse, englishGlossary } from './en';
import { spanishCourse, spanishGlossary } from './es';
import { frenchCourse, frenchGlossary } from './fr';
import type { GlossaryMap } from './helpers';
import { hindiCourse, hindiGlossary } from './hi';
import { indonesianCourse, indonesianGlossary } from './id';
import { italianCourse, italianGlossary } from './it';
import { japaneseCourse, japaneseGlossary } from './ja';
import { portugueseCourse, portugueseGlossary } from './pt';
import { russianCourse, russianGlossary } from './ru';
import { swahiliCourse, swahiliGlossary } from './sw';
import { vietnameseCourse, vietnameseGlossary } from './vi';
import { mandarinCourse, mandarinGlossary } from './zh';

export interface LoadedBaseCoursePayload {
  course: LanguageCourse;
  glossary: GlossaryMap;
}

export type BaseCourseLoader = () => Promise<LoadedBaseCoursePayload>;

/**
 * In Vitest runs, vite.config.ts aliases `./baseCoursesLoader` here so all 16 base
 * courses and glossaries hydrate synchronously without breaking existing test suites.
 */
export const EAGER_BASE_COURSES: Partial<Record<BaseLanguageCode, LoadedBaseCoursePayload>> = {
  es: { course: spanishCourse, glossary: spanishGlossary },
  fr: { course: frenchCourse, glossary: frenchGlossary },
  de: { course: germanCourse, glossary: germanGlossary },
  it: { course: italianCourse, glossary: italianGlossary },
  pt: { course: portugueseCourse, glossary: portugueseGlossary },
  en: { course: englishCourse, glossary: englishGlossary },
  zh: { course: mandarinCourse, glossary: mandarinGlossary },
  ja: { course: japaneseCourse, glossary: japaneseGlossary },
  hi: { course: hindiCourse, glossary: hindiGlossary },
  bn: { course: bengaliCourse, glossary: bengaliGlossary },
  ar: { course: arabicCourse, glossary: arabicGlossary },
  arz: { course: egyptianArabicCourse, glossary: egyptianArabicGlossary },
  ru: { course: russianCourse, glossary: russianGlossary },
  id: { course: indonesianCourse, glossary: indonesianGlossary },
  vi: { course: vietnameseCourse, glossary: vietnameseGlossary },
  sw: { course: swahiliCourse, glossary: swahiliGlossary },
};

export const BASE_COURSE_LOADERS: Record<BaseLanguageCode, BaseCourseLoader> = {
  es: async () => EAGER_BASE_COURSES.es!,
  fr: async () => EAGER_BASE_COURSES.fr!,
  de: async () => EAGER_BASE_COURSES.de!,
  it: async () => EAGER_BASE_COURSES.it!,
  pt: async () => EAGER_BASE_COURSES.pt!,
  en: async () => EAGER_BASE_COURSES.en!,
  zh: async () => EAGER_BASE_COURSES.zh!,
  ja: async () => EAGER_BASE_COURSES.ja!,
  hi: async () => EAGER_BASE_COURSES.hi!,
  bn: async () => EAGER_BASE_COURSES.bn!,
  ar: async () => EAGER_BASE_COURSES.ar!,
  arz: async () => EAGER_BASE_COURSES.arz!,
  ru: async () => EAGER_BASE_COURSES.ru!,
  id: async () => EAGER_BASE_COURSES.id!,
  vi: async () => EAGER_BASE_COURSES.vi!,
  sw: async () => EAGER_BASE_COURSES.sw!,
};
