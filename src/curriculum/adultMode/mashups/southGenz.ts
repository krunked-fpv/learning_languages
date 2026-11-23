import type { AdultMashupLanguageCode } from '../../../types/contracts';
import { compileMashupCourse } from './wave1/mashupBuilder';
import { southGenzCuratedGlossary } from './wave1/southGenzGlossary';
import { southGenzSeeds1to8 } from './wave1/southGenzUnits1to8';
import { southGenzSeeds9to16 } from './wave1/southGenzUnits9to16';

export const languageCode: AdultMashupLanguageCode = 'south_genz';

const compiled = compileMashupCourse(
  languageCode,
  [...southGenzSeeds1to8, ...southGenzSeeds9to16],
  southGenzCuratedGlossary,
);

export const southGenzCourse = compiled.course;
export const southGenzGlossary = compiled.glossary;

export const course = southGenzCourse;
export const glossary = southGenzGlossary;
