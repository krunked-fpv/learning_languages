import type {
  ArcadeLanternItem,
  LanguageCourse,
  VocabCard,
} from '../types/contracts';

const MIN_ARCADE_ITEMS = 16;

function toLanternItem(card: VocabCard): ArcadeLanternItem {
  return {
    id: card.id,
    language: card.language,
    foreign: card.foreignWithArticle,
    english: card.english,
    phonetic: card.phonetic,
    illustrationKey: card.illustrationKey,
  };
}

export function buildArcadeLexicon(
  course: LanguageCourse,
  unlockedVocabIds: readonly string[],
  currentUnitIndex: number
): ArcadeLanternItem[] {
  const chosen: VocabCard[] = [];
  const seenIds = new Set<string>();
  const seenForeign = new Set<string>();
  const seenEnglish = new Set<string>();

  const tryAdd = (card: VocabCard | undefined): void => {
    if (!card) return;
    const fKey = card.foreignWithArticle.toLowerCase();
    const eKey = card.english.toLowerCase();
    if (seenIds.has(card.id) || seenForeign.has(fKey) || seenEnglish.has(eKey)) {
      return;
    }
    seenIds.add(card.id);
    seenForeign.add(fKey);
    seenEnglish.add(eKey);
    chosen.push(card);
  };

  for (const vocabId of unlockedVocabIds) {
    tryAdd(course.vocabById[vocabId]);
  }

  const maxUnit = Math.max(0, Math.min(currentUnitIndex, course.units.length - 1));

  // Include current unit first, then earlier units for reinforcement
  if (course.units[maxUnit]) {
    for (const card of course.units[maxUnit].vocabCards) {
      tryAdd(card);
    }
  }
  for (let u = maxUnit - 1; u >= 0; u--) {
    for (const card of course.units[u].vocabCards) {
      tryAdd(card);
    }
  }

  // Ensure brand-new learners still have a rich 16+ lantern deck
  for (let u = maxUnit + 1; u < course.units.length && chosen.length < MIN_ARCADE_ITEMS; u++) {
    for (const card of course.units[u].vocabCards) {
      tryAdd(card);
      if (chosen.length >= MIN_ARCADE_ITEMS) break;
    }
  }

  return chosen.map(toLanternItem);
}
