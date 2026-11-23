import type { CourseUnit, LanguageCourse, VocabCard } from '../../types/contracts';
import { buildCourse, buildGlossaryFromCards, makeCard, type GlossaryMap } from '../helpers';
import { ebonicsExtraGlossary } from './ebonicsGlossary';
import { buildEbonicsUnits1to8, ebonicsSeeds1to8 } from './ebonicsUnits1to8';
import { buildEbonicsUnits9to16, ebonicsSeeds9to16 } from './ebonicsUnits9to16';

const ebonicsPreviewCards: VocabCard[] = [...ebonicsSeeds1to8, ...ebonicsSeeds9to16].flatMap(
  (seed) =>
    seed.cards.map((c, idx) =>
      makeCard('ebonics', `ebonics-u${seed.order}`, {
        id: c.id ?? `eb-u${seed.order}-c${idx + 1}`,
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

export const ebonicsGlossary: GlossaryMap = buildGlossaryFromCards(
  ebonicsPreviewCards,
  ebonicsExtraGlossary
);

const ebonicsUnits: CourseUnit[] = [
  ...buildEbonicsUnits1to8(ebonicsGlossary),
  ...buildEbonicsUnits9to16(ebonicsGlossary),
];

export const ebonicsCourse: LanguageCourse = buildCourse('ebonics', ebonicsUnits);
