import {
  LANGUAGE_META,
  resolveUnitProficiencyTier,
  type AdultLanguageCode,
  type CompanionId,
  type ContextClozeExercise,
  type CourseUnit,
  type GenderCategory,
  type IllustrationKey,
  type LessonExercise,
  type ListenDecodeExercise,
  type MapNode,
  type ProficiencyTier,
  type RegisterNuanceTag,
  type StoryBubble,
  type StoryDecision,
  type VocabCard,
  type WordBankExercise,
} from '../../types/contracts';
import {
  bossNode,
  chestNode,
  contextCloze,
  discovery,
  lessonNode,
  listenAssemble,
  listenMeaning,
  makeBossTurn,
  makeBubble,
  makeCard,
  normalizeLookupKey,
  pairMatchFromCards,
  segmentSentenceTokens,
  storyNode,
  wordBankToEn,
  wordBankToForeign,
  type GlossaryEntry,
  type GlossaryMap,
} from '../helpers';

export interface AdultCardSeed {
  id?: string;
  foreignWithArticle: string;
  bareForeign: string;
  article?: string;
  gender?: GenderCategory;
  english: string;
  acceptedEnglish?: string[];
  acceptedForeign?: string[];
  phonetic: string;
  registerNote?: string;
  grammarNote?: string;
  illustrationKey: IllustrationKey;
  exampleForeign: string;
  exampleEnglish: string;
  examplePhonetic: string;
}

export interface AdultLessonSeed {
  title: string;
  subtitle: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  /** Optional explicit WordBank to_english override */
  wbEn?: {
    promptText: string;
    promptPhonetic: string;
    expectedSentence: string;
    acceptedSentences?: string[];
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
  };
  /** Optional explicit WordBank to_foreign override */
  wbForeign?: {
    promptText: string;
    expectedSentence: string;
    acceptedSentences?: string[];
    phoneticHint: string;
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
  };
  /** Optional explicit ListenDecode override */
  listen?: {
    audioText: string;
    phonetic: string;
    englishMeaning: string;
    choices?: string[];
  };
  /** Required for Units 5-16 (optional for Units 1-4) */
  cloze?: {
    sentenceBeforeBlank: string;
    expectedBlank: string;
    sentenceAfterBlank: string;
    englishTranslation: string;
    phonetic: string;
    choices: string[];
    acceptedBlanks?: string[];
    nuanceNote: string;
    registerTag: RegisterNuanceTag;
    vocabIds?: string[];
  };
}

export interface AdultStoryBubbleSeed {
  speakerId: CompanionId;
  speakerName: string;
  side: 'left' | 'right';
  foreignText: string;
  englishText: string;
  phonetic: string;
}

export interface AdultStorySeed {
  title: string;
  settingSubtitle: string;
  bubbles: readonly AdultStoryBubbleSeed[];
  decisions: StoryDecision[];
}

export interface AdultBossTurnSeed {
  companionSayForeign: string;
  companionSayEnglish: string;
  companionPhonetic: string;
  promptEnglish: string;
  mode: 'word_bank' | 'choice';
  choices?: string[];
  targetTokens?: string[];
  distractorTokens?: string[];
  expectedAnswer: string;
  acceptedAnswers?: string[];
  phoneticAnswer: string;
  victoryReplyForeign: string;
  victoryReplyEnglish: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  allowFreeRecall?: boolean;
}

export interface AdultBossSeed {
  title: string;
  introLine: string;
  turns: readonly AdultBossTurnSeed[];
}

export interface AdultUnitSeed {
  language: AdultLanguageCode;
  order: number;
  title: string;
  culturalLandmark: string;
  subtitle: string;
  themeColor: string;
  cards: readonly AdultCardSeed[];
  lessons: readonly [AdultLessonSeed, AdultLessonSeed, AdultLessonSeed, AdultLessonSeed];
  storyNodeTitle: string;
  storyNodeSubtitle: string;
  story: AdultStorySeed;
  chestTitle: string;
  chestSubtitle: string;
  bossNodeTitle: string;
  bossNodeSubtitle: string;
  boss: AdultBossSeed;
}

const MASTERY_REWARDS: Record<
  ProficiencyTier,
  {
    lessonXp: number;
    lessonGems: number;
    storyXp: number;
    storyGems: number;
    chestXp: number;
    chestGems: number;
    bossXp: number;
    bossGems: number;
  }
> = {
  A1: { lessonXp: 25, lessonGems: 12, storyXp: 30, storyGems: 15, chestXp: 30, chestGems: 35, bossXp: 60, bossGems: 40 },
  A2: { lessonXp: 30, lessonGems: 15, storyXp: 35, storyGems: 20, chestXp: 35, chestGems: 45, bossXp: 70, bossGems: 50 },
  B1: { lessonXp: 40, lessonGems: 20, storyXp: 45, storyGems: 25, chestXp: 40, chestGems: 40, bossXp: 75, bossGems: 40 },
  B2: { lessonXp: 50, lessonGems: 25, storyXp: 55, storyGems: 30, chestXp: 50, chestGems: 50, bossXp: 90, bossGems: 50 },
  C1_C2: { lessonXp: 65, lessonGems: 35, storyXp: 70, storyGems: 40, chestXp: 65, chestGems: 65, bossXp: 110, bossGems: 60 },
};

function shortPrefix(language: AdultLanguageCode): 'eb' | 'sb' {
  return language === 'ebonics' ? 'eb' : 'sb';
}

function deterministicRotate(items: readonly string[], seed: string): string[] {
  const arr = [...items];
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const j = Math.abs(hash) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function pickDistractors(
  cards: readonly VocabCard[],
  targetTokens: readonly string[],
  useForeign: boolean,
  glossary: GlossaryMap,
  seedOffset: number,
  count = 3
): string[] {
  const forbidden = new Set<string>();
  for (const t of targetTokens) {
    forbidden.add(t.toLowerCase());
    forbidden.add(normalizeLookupKey(t));
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[(i + seedOffset) % cards.length];
    const source = useForeign
      ? `${c.foreignWithArticle} ${c.exampleForeign}`
      : `${c.english} ${c.exampleEnglish}`;
    const tokens = segmentSentenceTokens(source, useForeign ? glossary : undefined);
    for (const tok of tokens) {
      if (tok.length < 2) continue;
      const lower = tok.toLowerCase();
      const norm = normalizeLookupKey(tok);
      if (!norm || forbidden.has(lower) || forbidden.has(norm) || seen.has(norm)) continue;
      seen.add(norm);
      out.push(tok);
      if (out.length >= count) return out;
    }
  }
  return out;
}

function pickDistinctEnglishChoices(
  cards: readonly VocabCard[],
  correct: string,
  seed: string
): string[] {
  const choices = [correct];
  const seen = new Set<string>([normalizeLookupKey(correct)]);
  for (const c of cards) {
    const cand = c.exampleEnglish;
    const norm = normalizeLookupKey(cand);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    choices.push(cand);
    if (choices.length >= 4) break;
  }
  return deterministicRotate(choices, seed);
}

export function buildAdultUnit(
  seed: AdultUnitSeed,
  glossary: GlossaryMap,
  extraOverrides?: Record<string, GlossaryEntry>
): CourseUnit {
  const { language, order } = seed;
  const prefix = shortPrefix(language);
  const unitId = `${language}-u${order}`;
  const nodePrefix = `${prefix}-u${order}`;
  const tier = resolveUnitProficiencyTier(order);
  const meta = LANGUAGE_META[language];
  const rewards = MASTERY_REWARDS[tier];
  const enableFreeRecall = tier === 'B2' || tier === 'C1_C2';
  const mergedGlossary: GlossaryMap = extraOverrides
    ? { ...glossary, ...extraOverrides }
    : glossary;

  if (seed.cards.length < 8) {
    throw new Error(`${unitId}: expected >= 8 cards, got ${seed.cards.length}`);
  }

  const cards: VocabCard[] = seed.cards.map((c, idx) =>
    makeCard(language, unitId, {
      id: c.id ?? `${nodePrefix}-c${idx + 1}`,
      proficiencyTier: tier,
      foreignWithArticle: c.foreignWithArticle,
      bareForeign: c.bareForeign,
      ...(c.article ? { article: c.article } : {}),
      gender: c.gender ?? 'invariant',
      english: c.english,
      ...(c.acceptedEnglish ? { acceptedEnglish: c.acceptedEnglish } : {}),
      ...(c.acceptedForeign ? { acceptedForeign: c.acceptedForeign } : {}),
      phonetic: c.phonetic,
      ...(c.registerNote ? { registerNote: c.registerNote } : {}),
      ...(c.grammarNote ? { grammarNote: c.grammarNote } : {}),
      illustrationKey: c.illustrationKey,
      exampleForeign: c.exampleForeign,
      exampleEnglish: c.exampleEnglish,
      examplePhonetic: c.examplePhonetic,
    })
  );

  // Distribute all cards across lessons n1..n4 cleanly
  const lessonCardGroups: VocabCard[][] = [[], [], [], []];
  cards.forEach((card, i) => {
    if (i < 8) {
      lessonCardGroups[Math.floor(i / 2)].push(card);
    } else {
      lessonCardGroups[i % 4].push(card);
    }
  });

  const lessonNodes: MapNode[] = [];
  for (let idx = 0; idx < 4; idx++) {
    const lSeed = seed.lessons[idx];
    const nodeOrder = idx + 1;
    const nodeId = `${nodePrefix}-n${nodeOrder}`;
    const groupCards = lessonCardGroups[idx];
    const cPrimary = groupCards[0];
    const cSecondary = groupCards[1];

    const discoveries = groupCards.map((c, dIdx) =>
      discovery(`${nodeId}-e${dIdx + 1}`, c.id, c.registerNote ?? c.grammarNote)
    );

    const exercises: LessonExercise[] = [...discoveries];

    if (lSeed.cloze) {
      const fullForeignSentence = `${lSeed.cloze.sentenceBeforeBlank}${lSeed.cloze.expectedBlank}${lSeed.cloze.sentenceAfterBlank}`;
      const clozeEx: ContextClozeExercise = contextCloze(
        {
          id: `${nodeId}-cloze`,
          sentenceBeforeBlank: lSeed.cloze.sentenceBeforeBlank,
          sentenceAfterBlank: lSeed.cloze.sentenceAfterBlank,
          fullForeignSentence,
          englishTranslation: lSeed.cloze.englishTranslation,
          phonetic: lSeed.cloze.phonetic,
          choices: lSeed.cloze.choices,
          expectedBlank: lSeed.cloze.expectedBlank,
          ...(lSeed.cloze.acceptedBlanks ? { acceptedBlanks: lSeed.cloze.acceptedBlanks } : {}),
          nuanceNote: lSeed.cloze.nuanceNote,
          registerTag: lSeed.cloze.registerTag,
          vocabIds: lSeed.cloze.vocabIds ?? [cPrimary.id, cSecondary.id],
        },
        mergedGlossary
      );
      exercises.push(clozeEx);
    }

    // WordBank: alternate to_english (idx 0, 2) and to_foreign (idx 1, 3), or allow both if explicit
    if (idx % 2 === 0 || lSeed.wbEn) {
      const promptText = lSeed.wbEn?.promptText ?? cPrimary.exampleForeign;
      const promptPhonetic = lSeed.wbEn?.promptPhonetic ?? cPrimary.examplePhonetic;
      const expectedSentence = lSeed.wbEn?.expectedSentence ?? cPrimary.exampleEnglish;
      const targetTokens = segmentSentenceTokens(expectedSentence);
      const wbEn: WordBankExercise = wordBankToEn(
        {
          id: `${nodeId}-wben`,
          promptText,
          promptPhonetic,
          expectedSentence,
          ...(lSeed.wbEn?.acceptedSentences
            ? { acceptedSentences: lSeed.wbEn.acceptedSentences }
            : {}),
          targetTokens,
          distractorTokens: pickDistractors(cards, targetTokens, false, mergedGlossary, idx + 1),
          ...(lSeed.wbEn?.nuanceNote ?? cPrimary.registerNote ?? lSeed.nuanceNote
            ? { nuanceNote: lSeed.wbEn?.nuanceNote ?? cPrimary.registerNote ?? lSeed.nuanceNote }
            : {}),
          ...(lSeed.wbEn?.registerTag ?? lSeed.registerTag
            ? { registerTag: lSeed.wbEn?.registerTag ?? lSeed.registerTag }
            : {}),
          ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
          vocabIds: [cPrimary.id],
        },
        mergedGlossary
      );
      exercises.push(wbEn);
    }

    if (idx % 2 === 1 || lSeed.wbForeign) {
      const promptText = lSeed.wbForeign?.promptText ?? cPrimary.exampleEnglish;
      const expectedSentence = lSeed.wbForeign?.expectedSentence ?? cPrimary.exampleForeign;
      const phoneticHint = lSeed.wbForeign?.phoneticHint ?? cPrimary.examplePhonetic;
      const targetTokens = segmentSentenceTokens(expectedSentence, mergedGlossary);
      const wbFr: WordBankExercise = wordBankToForeign({
        id: `${nodeId}-wbfr`,
        promptText,
        expectedSentence,
        ...(lSeed.wbForeign?.acceptedSentences
          ? { acceptedSentences: lSeed.wbForeign.acceptedSentences }
          : {}),
        targetTokens,
        distractorTokens: pickDistractors(cards, targetTokens, true, mergedGlossary, idx + 2),
        phoneticHint,
        ...(lSeed.wbForeign?.nuanceNote ?? cPrimary.grammarNote ?? lSeed.nuanceNote
          ? { nuanceNote: lSeed.wbForeign?.nuanceNote ?? cPrimary.grammarNote ?? lSeed.nuanceNote }
          : {}),
        ...(lSeed.wbForeign?.registerTag ?? lSeed.registerTag
          ? { registerTag: lSeed.wbForeign?.registerTag ?? lSeed.registerTag }
          : {}),
        ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
        vocabIds: [cPrimary.id],
      });
      exercises.push(wbFr);
    }

    // ListenDecode: alternate select_meaning (idx 0, 2) and assemble_heard (idx 1, 3)
    const audioText = lSeed.listen?.audioText ?? cSecondary.exampleForeign;
    const phonetic = lSeed.listen?.phonetic ?? cSecondary.examplePhonetic;
    const englishMeaning = lSeed.listen?.englishMeaning ?? cSecondary.exampleEnglish;
    let listenEx: ListenDecodeExercise;
    if (idx % 2 === 0) {
      const wordCount = segmentSentenceTokens(audioText, mergedGlossary).length;
      const choices =
        lSeed.listen?.choices ?? pickDistinctEnglishChoices(cards, englishMeaning, `${nodeId}-lm`);
      listenEx = listenMeaning(
        {
          id: `${nodeId}-ld`,
          audioText,
          phonetic,
          voiceFallbackPhoneticPrompt: `Syllables: ${phonetic.replace(/\s+/g, ' • ')} (${wordCount} ${wordCount === 1 ? 'word' : 'words'})`,
          englishMeaning,
          choices,
          vocabIds: [cSecondary.id],
        },
        mergedGlossary
      );
    } else {
      const targetTokens = segmentSentenceTokens(audioText, mergedGlossary);
      listenEx = listenAssemble(
        {
          id: `${nodeId}-ld`,
          audioText,
          phonetic,
          voiceFallbackPhoneticPrompt: `Syllables: ${phonetic.replace(/\s+/g, ' • ')} (${targetTokens.length} ${targetTokens.length === 1 ? 'word' : 'words'})`,
          englishMeaning,
          targetTokens,
          distractorTokens: pickDistractors(cards, targetTokens, true, mergedGlossary, idx + 4),
          vocabIds: [cSecondary.id],
        },
        mergedGlossary
      );
    }
    exercises.push(listenEx);

    const pairCards: VocabCard[] = [];
    for (let step = 0; step < 5; step++) {
      pairCards.push(cards[(idx * 2 + step) % cards.length]);
    }
    exercises.push(
      pairMatchFromCards(`${nodeId}-pm`, `${seed.culturalLandmark} Match`, pairCards, 45)
    );

    lessonNodes.push(
      lessonNode({
        id: nodeId,
        unitId,
        order: nodeOrder,
        proficiencyTier: tier,
        title: lSeed.title,
        subtitle: lSeed.subtitle,
        xpReward: rewards.lessonXp,
        gemReward: rewards.lessonGems,
        exercises,
        rewardVocabIds: groupCards.map((c) => c.id),
      })
    );
  }

  const storyBubbles: StoryBubble[] = seed.story.bubbles.map((b, bIdx) =>
    makeBubble(
      {
        id: `${nodePrefix}-st-b${bIdx + 1}`,
        speakerId: b.speakerId,
        speakerName: b.speakerName,
        side: b.side,
        foreignText: b.foreignText,
        englishText: b.englishText,
        phonetic: b.phonetic,
      },
      mergedGlossary
    )
  );

  const compiledStoryNode = storyNode({
    id: `${nodePrefix}-n5`,
    unitId,
    order: 5,
    proficiencyTier: tier,
    title: seed.storyNodeTitle,
    subtitle: seed.storyNodeSubtitle,
    xpReward: rewards.storyXp,
    gemReward: rewards.storyGems,
    story: {
      id: `${nodePrefix}-story`,
      title: seed.story.title,
      settingSubtitle: seed.story.settingSubtitle,
      bubbles: storyBubbles,
      decisions: seed.story.decisions,
      vocabIds: cards.slice(0, 6).map((c) => c.id),
    },
    rewardVocabIds: cards.slice(0, 3).map((c) => c.id),
  });

  const compiledChestNode = chestNode({
    id: `${nodePrefix}-n6`,
    unitId,
    order: 6,
    proficiencyTier: tier,
    title: seed.chestTitle,
    subtitle: seed.chestSubtitle,
    xpReward: rewards.chestXp,
    gemReward: rewards.chestGems,
    rewardVocabIds: cards.slice(7, 10).map((c) => c.id),
  });

  const bossTurns = seed.boss.turns.map((turn, tIdx) => {
    const turnId = `${nodePrefix}-b${tIdx + 1}`;
    const resolvedTokens =
      turn.mode === 'word_bank'
        ? turn.targetTokens ?? segmentSentenceTokens(turn.expectedAnswer, mergedGlossary)
        : turn.targetTokens;
    const resolvedDistractors =
      turn.mode === 'word_bank'
        ? turn.distractorTokens ??
          pickDistractors(cards, resolvedTokens ?? [], true, mergedGlossary, tIdx + 3)
        : turn.distractorTokens;

    return makeBossTurn(
      {
        id: turnId,
        companionSayForeign: turn.companionSayForeign,
        companionSayEnglish: turn.companionSayEnglish,
        companionPhonetic: turn.companionPhonetic,
        promptEnglish: turn.promptEnglish,
        mode: turn.mode,
        ...(turn.choices ? { choices: turn.choices } : {}),
        ...(resolvedTokens ? { targetTokens: resolvedTokens } : {}),
        ...(resolvedDistractors ? { distractorTokens: resolvedDistractors } : {}),
        expectedAnswer: turn.expectedAnswer,
        ...(turn.acceptedAnswers ? { acceptedAnswers: turn.acceptedAnswers } : {}),
        phoneticAnswer: turn.phoneticAnswer,
        victoryReplyForeign: turn.victoryReplyForeign,
        victoryReplyEnglish: turn.victoryReplyEnglish,
        ...(turn.nuanceNote ? { nuanceNote: turn.nuanceNote } : {}),
        ...(turn.registerTag ? { registerTag: turn.registerTag } : {}),
        ...(turn.mode === 'word_bank' && enableFreeRecall
          ? { allowFreeRecall: turn.allowFreeRecall ?? true }
          : turn.allowFreeRecall !== undefined
          ? { allowFreeRecall: turn.allowFreeRecall }
          : {}),
      },
      mergedGlossary
    );
  });

  const compiledBossNode = bossNode({
    id: `${nodePrefix}-n7`,
    unitId,
    order: 7,
    proficiencyTier: tier,
    title: seed.bossNodeTitle,
    subtitle: seed.bossNodeSubtitle,
    xpReward: rewards.bossXp,
    gemReward: rewards.bossGems,
    boss: {
      id: `${nodePrefix}-boss`,
      companionId: meta.companionId,
      companionName: meta.companionName,
      title: seed.boss.title,
      introLine: seed.boss.introLine,
      turns: bossTurns,
      rewardChestGems: rewards.bossGems,
      vocabIds: cards.map((c) => c.id),
    },
    rewardVocabIds: cards.slice(0, 3).map((c) => c.id),
  });

  return {
    id: unitId,
    language,
    order,
    proficiencyTier: tier,
    title: seed.title,
    culturalLandmark: seed.culturalLandmark,
    subtitle: seed.subtitle,
    themeColor: seed.themeColor,
    vocabCards: cards,
    nodes: [...lessonNodes, compiledStoryNode, compiledChestNode, compiledBossNode],
  };
}
