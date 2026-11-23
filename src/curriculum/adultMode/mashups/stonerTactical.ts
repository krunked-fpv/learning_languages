import type { AdultLanguageCode, LanguageCourse } from '../../../types/contracts';
import type { GlossaryMap } from '../../helpers';
import { WAVE2_ENGLISH_FALLBACK_GLOSSARY } from './wave2/englishFallbackGlossary';
import { buildWave2Course, buildWave2TrackGlossary } from './wave2/mashupBuilder';
import { stonerTacticalExtraGlossary } from './wave2/stonerTacticalGlossary';
import { stonerTacticalSeeds1to8 } from './wave2/stonerTacticalUnits1to8';
import { stonerTacticalSeeds9to16 } from './wave2/stonerTacticalUnits9to16';

export const languageCode: AdultLanguageCode = 'stoner_tactical';

const allStonerTacticalSeeds = [...stonerTacticalSeeds1to8, ...stonerTacticalSeeds9to16];

export const stonerTacticalGlossary: GlossaryMap = buildWave2TrackGlossary(
  'stoner_tactical',
  allStonerTacticalSeeds,
  WAVE2_ENGLISH_FALLBACK_GLOSSARY,
  stonerTacticalExtraGlossary
);

export const stonerTacticalCourse: LanguageCourse = buildWave2Course(
  'stoner_tactical',
  allStonerTacticalSeeds,
  stonerTacticalGlossary
);

export const course: LanguageCourse = stonerTacticalCourse;
export const glossary: GlossaryMap = stonerTacticalGlossary;
