import type { AdultMashupLanguageCode } from '../../../types/contracts';
import { corpTradesCuratedGlossary } from './wave1/corpTradesGlossary';
import { corpTradesSeeds1to8 } from './wave1/corpTradesUnits1to8';
import { corpTradesSeeds9to16 } from './wave1/corpTradesUnits9to16';
import { compileMashupCourse } from './wave1/mashupBuilder';

export const languageCode: AdultMashupLanguageCode = 'corp_trades';

const compiled = compileMashupCourse(
  languageCode,
  [...corpTradesSeeds1to8, ...corpTradesSeeds9to16],
  corpTradesCuratedGlossary
);

export const corpTradesCourse = compiled.course;
export const corpTradesGlossary = compiled.glossary;
export const course = corpTradesCourse;
export const glossary = corpTradesGlossary;
