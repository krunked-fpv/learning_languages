import type { CourseUnit, LanguageCourse, VocabCard } from '../../types/contracts';
import { buildCourse, buildGlossaryFromCards, makeCard, type GlossaryMap } from '../helpers';
import { suburbanExtraGlossary } from './suburbanGlossary';
import { buildSuburbanUnits1to8, suburbanSeeds1to8 } from './suburbanUnits1to8';
import { buildSuburbanUnits9to16, suburbanSeeds9to16 } from './suburbanUnits9to16';

const suburbanPreviewCards: VocabCard[] = [...suburbanSeeds1to8, ...suburbanSeeds9to16].flatMap(
  (seed) =>
    seed.cards.map((c, idx) =>
      makeCard('suburban', `suburban-u${seed.order}`, {
        id: c.id ?? `sb-u${seed.order}-c${idx + 1}`,
        foreignWithArticle: c.foreignWithArticle,
        bareForeign: c.bareForeign,
        ...(c.article ? { article: c.article } : {}),
        gender: c.gender ?? 'invariant',
        english: c.english,
        phonetic: c.phonetic,
        illustrationKey: c.illustrationKey,
        exampleForeign: c.exampleForeign,
        exampleEnglish: c.exampleEnglish,
        examplePhonetic: c.examplePhonetic,
      })
    )
);

export const suburbanGlossary: GlossaryMap = buildGlossaryFromCards(
  suburbanPreviewCards,
  suburbanExtraGlossary
);

const suburbanUnits: CourseUnit[] = [
  ...buildSuburbanUnits1to8(suburbanGlossary),
  ...buildSuburbanUnits9to16(suburbanGlossary),
];

export const suburbanCourse: LanguageCourse = buildCourse('suburban', suburbanUnits);
