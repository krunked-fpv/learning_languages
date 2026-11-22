import { resolveUnitProficiencyTier } from '../types/contracts';
import type {
  ArcadeLanternItem,
  ArcadeProficiencyTier,
  LanguageCourse,
  ProficiencyTier,
  VocabCard,
} from '../types/contracts';

const MIN_ARCADE_ITEMS = 16;

const ARCADE_PRIORITY_TIERS: Record<ArcadeProficiencyTier, readonly ProficiencyTier[]> = {
  sprout: ['A1', 'A2'],
  voyager: ['B1', 'B2'],
  master: ['C1_C2'],
};

const ARCADE_FALLBACK_TIERS: Record<ArcadeProficiencyTier, readonly ProficiencyTier[]> = {
  sprout: ['B1', 'B2', 'C1_C2'],
  voyager: ['A2', 'C1_C2', 'A1'],
  master: ['B2', 'B1', 'A2', 'A1'],
};

function toLanternItem(card: VocabCard, unitTierMap: Map<string, ProficiencyTier>): ArcadeLanternItem {
  const tier = card.proficiencyTier ?? unitTierMap.get(card.unitId) ?? 'A1';
  return {
    id: card.id,
    language: card.language,
    foreign: card.foreignWithArticle,
    english: card.english,
    phonetic: card.phonetic,
    ...(card.romanized ? { romanized: card.romanized } : {}),
    illustrationKey: card.illustrationKey,
    proficiencyTier: tier,
    exampleForeign: card.exampleForeign,
    exampleEnglish: card.exampleEnglish,
    examplePhonetic: card.examplePhonetic,
    ...(card.exampleRomanized ? { exampleRomanized: card.exampleRomanized } : {}),
  };
}

export function buildArcadeLexicon(
  course: LanguageCourse,
  unlockedVocabIds: readonly string[],
  currentUnitIndex: number,
  arcadeTier?: ArcadeProficiencyTier
): ArcadeLanternItem[] {
  const unitTierMap = new Map<string, ProficiencyTier>();
  for (const unit of course.units) {
    unitTierMap.set(unit.id, unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order));
  }

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

  if (arcadeTier) {
    const prioritySet = new Set<ProficiencyTier>(ARCADE_PRIORITY_TIERS[arcadeTier]);

    // 1. Unlocked vocab matching requested arcade proficiency tier first
    for (const vocabId of unlockedVocabIds) {
      const card = course.vocabById[vocabId];
      if (!card) continue;
      const tier = card.proficiencyTier ?? unitTierMap.get(card.unitId) ?? 'A1';
      if (prioritySet.has(tier)) {
        tryAdd(card);
      }
    }

    // 2. Units matching requested arcade proficiency tier (prioritizing current unit if in tier)
    const priorityUnits = course.units.filter((u) =>
      prioritySet.has(u.proficiencyTier ?? resolveUnitProficiencyTier(u.order))
    );
    const activeUnit = course.units[Math.max(0, Math.min(currentUnitIndex, course.units.length - 1))];
    if (activeUnit && priorityUnits.includes(activeUnit)) {
      for (const card of activeUnit.vocabCards) {
        tryAdd(card);
      }
    }
    for (const unit of priorityUnits) {
      if (unit === activeUnit) continue;
      for (const card of unit.vocabCards) {
        tryAdd(card);
      }
    }

    // 3. Fallback tiers if fewer than 16 items exist in the target tier
    if (chosen.length < MIN_ARCADE_ITEMS) {
      for (const vocabId of unlockedVocabIds) {
        tryAdd(course.vocabById[vocabId]);
        if (chosen.length >= MIN_ARCADE_ITEMS) break;
      }
    }
    for (const fallbackTier of ARCADE_FALLBACK_TIERS[arcadeTier]) {
      if (chosen.length >= MIN_ARCADE_ITEMS) break;
      const unitsInTier = course.units
        .filter((u) => (u.proficiencyTier ?? resolveUnitProficiencyTier(u.order)) === fallbackTier)
        .reverse();
      for (const unit of unitsInTier) {
        for (const card of unit.vocabCards) {
          tryAdd(card);
          if (chosen.length >= MIN_ARCADE_ITEMS) break;
        }
        if (chosen.length >= MIN_ARCADE_ITEMS) break;
      }
    }

    return chosen.map((card) => toLanternItem(card, unitTierMap));
  }

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

  return chosen.map((card) => toLanternItem(card, unitTierMap));
}
