import type { BaseLanguageCode, LanguageCourse } from '../types/contracts';
import { spanishCourse, spanishGlossary } from './es';
import type { GlossaryMap } from './helpers';

export interface LoadedBaseCoursePayload {
  course: LanguageCourse;
  glossary: GlossaryMap;
}

export type BaseCourseLoader = () => Promise<LoadedBaseCoursePayload>;

/**
 * Only Spanish (`es`) is eagerly imported in production so Frame 0 stays lean while
 * the remaining 15 base languages (`fr`..`sw`) split into on-demand Vite chunks.
 */
export const EAGER_BASE_COURSES: Partial<Record<BaseLanguageCode, LoadedBaseCoursePayload>> = {
  es: { course: spanishCourse, glossary: spanishGlossary },
};

export const BASE_COURSE_LOADERS: Record<BaseLanguageCode, BaseCourseLoader> = {
  es: async () => ({ course: spanishCourse, glossary: spanishGlossary }),
  fr: () => import('./fr').then((m) => ({ course: m.frenchCourse, glossary: m.frenchGlossary })),
  de: () => import('./de').then((m) => ({ course: m.germanCourse, glossary: m.germanGlossary })),
  it: () => import('./it').then((m) => ({ course: m.italianCourse, glossary: m.italianGlossary })),
  pt: () => import('./pt').then((m) => ({ course: m.portugueseCourse, glossary: m.portugueseGlossary })),
  en: () => import('./en').then((m) => ({ course: m.englishCourse, glossary: m.englishGlossary })),
  zh: () => import('./zh').then((m) => ({ course: m.mandarinCourse, glossary: m.mandarinGlossary })),
  ja: () => import('./ja').then((m) => ({ course: m.japaneseCourse, glossary: m.japaneseGlossary })),
  hi: () => import('./hi').then((m) => ({ course: m.hindiCourse, glossary: m.hindiGlossary })),
  bn: () => import('./bn').then((m) => ({ course: m.bengaliCourse, glossary: m.bengaliGlossary })),
  ar: () => import('./ar').then((m) => ({ course: m.arabicCourse, glossary: m.arabicGlossary })),
  arz: () =>
    import('./arz').then((m) => ({
      course: m.egyptianArabicCourse,
      glossary: m.egyptianArabicGlossary,
    })),
  ru: () => import('./ru').then((m) => ({ course: m.russianCourse, glossary: m.russianGlossary })),
  id: () => import('./id').then((m) => ({ course: m.indonesianCourse, glossary: m.indonesianGlossary })),
  vi: () => import('./vi').then((m) => ({ course: m.vietnameseCourse, glossary: m.vietnameseGlossary })),
  sw: () => import('./sw').then((m) => ({ course: m.swahiliCourse, glossary: m.swahiliGlossary })),
};
