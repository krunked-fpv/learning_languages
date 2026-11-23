import type { AdultLanguageCode, LanguageCourse } from '../../../types/contracts';
import type { GlossaryMap } from '../../helpers';
import { caliCountryExtraGlossary } from './wave2/caliCountryGlossary';
import { caliCountrySeeds1to8 } from './wave2/caliCountryUnits1to8';
import { caliCountrySeeds9to16 } from './wave2/caliCountryUnits9to16';
import { WAVE2_ENGLISH_FALLBACK_GLOSSARY } from './wave2/englishFallbackGlossary';
import { buildWave2Course, buildWave2TrackGlossary } from './wave2/mashupBuilder';

export const languageCode: AdultLanguageCode = 'cali_country';

const allCaliCountrySeeds = [...caliCountrySeeds1to8, ...caliCountrySeeds9to16];

export const caliCountryGlossary: GlossaryMap = buildWave2TrackGlossary(
  'cali_country',
  allCaliCountrySeeds,
  WAVE2_ENGLISH_FALLBACK_GLOSSARY,
  caliCountryExtraGlossary
);

export const caliCountryCourse: LanguageCourse = buildWave2Course(
  'cali_country',
  allCaliCountrySeeds,
  caliCountryGlossary
);

export const course: LanguageCourse = caliCountryCourse;
export const glossary: GlossaryMap = caliCountryGlossary;
