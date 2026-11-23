import type { AdultLanguageCode, LanguageCourse } from '../../types/contracts';
import type { GlossaryMap } from '../helpers';
import { ebonicsCourse, ebonicsGlossary } from './ebonicsCourse';
import { suburbanCourse, suburbanGlossary } from './suburbanCourse';

export { ebonicsCourse, ebonicsGlossary } from './ebonicsCourse';
export { suburbanCourse, suburbanGlossary } from './suburbanCourse';

export const ADULT_COURSES: Record<AdultLanguageCode, LanguageCourse> = {
  ebonics: ebonicsCourse,
  suburban: suburbanCourse,
};

export const ADULT_GLOSSARIES: Record<AdultLanguageCode, GlossaryMap> = {
  ebonics: ebonicsGlossary,
  suburban: suburbanGlossary,
};
