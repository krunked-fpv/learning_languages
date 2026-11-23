import type { AdultMashupLanguageCode } from '../../../types/contracts';
import { compileMashupCourse } from './wave1/mashupBuilder';
import { midwestNortheastCuratedGlossary } from './wave1/midwestNortheastGlossary';
import { midwestNortheastSeeds1to8 } from './wave1/midwestNortheastUnits1to8';
import { midwestNortheastSeeds9to16 } from './wave1/midwestNortheastUnits9to16';

export const languageCode: AdultMashupLanguageCode = 'midwest_northeast';

const compiled = compileMashupCourse(
  languageCode,
  [...midwestNortheastSeeds1to8, ...midwestNortheastSeeds9to16],
  midwestNortheastCuratedGlossary
);

export const midwestNortheastCourse = compiled.course;
export const midwestNortheastGlossary = compiled.glossary;
export const course = midwestNortheastCourse;
export const glossary = midwestNortheastGlossary;
