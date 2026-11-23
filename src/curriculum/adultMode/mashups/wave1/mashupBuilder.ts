import {
  ILLUSTRATION_KEYS,
  LANGUAGE_META,
  resolveUnitProficiencyTier,
  type CompanionId,
  type ContextClozeExercise,
  type CourseUnit,
  type GenderCategory,
  type IllustrationKey,
  type LanguageCourse,
  type LessonExercise,
  type ListenDecodeExercise,
  type MapNode,
  type ProficiencyTier,
  type RegisterNuanceTag,
  type StoryBubble,
  type StoryDecision,
  type TapHintToken,
  type VocabCard,
  type WordBankExercise,
} from '../../../../types/contracts';
import {
  bossNode,
  buildCourse,
  buildGlossaryFromCards,
  chestNode,
  contextCloze,
  discovery,
  lessonNode,
  listenAssemble,
  listenMeaning,
  lookupGlossaryEntry,
  makeBossTurn,
  makeBubble,
  makeCard,
  normalizeLookupKey,
  pairMatchFromCards,
  segmentSentenceTokens,
  storyNode,
  stripEdgePunctuation,
  wordBankToEn,
  wordBankToForeign,
  type GlossaryEntry,
  type GlossaryMap,
} from '../../../helpers';
import { wave1EnglishFallbackGlossary } from './englishFallbackGlossary';

export type Wave1MashupLanguage = 'corp_trades' | 'midwest_northeast' | 'south_genz';

const WAVE1_PREFIX: Record<Wave1MashupLanguage, 'ct' | 'mn' | 'sg'> = {
  corp_trades: 'ct',
  midwest_northeast: 'mn',
  south_genz: 'sg',
};

const VALID_ILLUSTRATION_SET = new Set<string>(ILLUSTRATION_KEYS);
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const URL_RE = /https?:\/\//i;
const BANNED_ALCOHOL_RE =
  /\b(wine|beer|vino|cerveza|bier|vin|birra|alcohol|champagne|cocktail|vodka|whiskey|tequila|pub|tavern)\b/i;
const CLOZE_CLEAN_RE =
  /[\s¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥—–―…\-_\u0640]/g;

export interface MashupCardSeed {
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

export interface MashupClozeSeed {
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
}

export interface MashupLessonSeed {
  title: string;
  subtitle: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  wbEn?: {
    promptText: string;
    promptPhonetic: string;
    expectedSentence: string;
    acceptedSentences?: string[];
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
  };
  wbForeign?: {
    promptText: string;
    expectedSentence: string;
    acceptedSentences?: string[];
    phoneticHint: string;
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
  };
  listen?: {
    audioText: string;
    phonetic: string;
    englishMeaning: string;
    choices?: string[];
  };
  cloze: MashupClozeSeed;
}

export interface MashupStoryBubbleSeed {
  speakerId: CompanionId;
  speakerName: string;
  side: 'left' | 'right';
  foreignText: string;
  englishText: string;
  phonetic: string;
}

export interface MashupStorySeed {
  title: string;
  settingSubtitle: string;
  bubbles: readonly MashupStoryBubbleSeed[];
  decisions: StoryDecision[];
}

export interface MashupBossTurnSeed {
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

export interface MashupBossSeed {
  title: string;
  introLine: string;
  turns: readonly MashupBossTurnSeed[];
}

export interface MashupUnitSeed {
  language: Wave1MashupLanguage;
  order: number;
  title: string;
  culturalLandmark: string;
  subtitle: string;
  themeColor: string;
  cards: readonly MashupCardSeed[];
  lessons: readonly [MashupLessonSeed, MashupLessonSeed, MashupLessonSeed, MashupLessonSeed];
  storyNodeTitle: string;
  storyNodeSubtitle: string;
  story: MashupStorySeed;
  chestTitle: string;
  chestSubtitle: string;
  bossNodeTitle: string;
  bossNodeSubtitle: string;
  boss: MashupBossSeed;
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

function assertCleanText(text: string, context: string): void {
  if (UNICODE_FLAG_RE.test(text)) {
    throw new Error(`${context}: prohibited Unicode flag emoji in "${text}"`);
  }
  if (URL_RE.test(text)) {
    throw new Error(`${context}: prohibited external URL in "${text}"`);
  }
  if (BANNED_ALCOHOL_RE.test(text)) {
    throw new Error(`${context}: prohibited beverage/bar word in "${text}"`);
  }
}

function cleanClozeChars(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .toLowerCase()
    .replace(CLOZE_CLEAN_RE, '');
}

function verifyClozePartition(ex: ContextClozeExercise): void {
  if (/\s/.test(ex.expectedBlank)) {
    throw new Error(`${ex.id}: expectedBlank "${ex.expectedBlank}" must be a single whole word`);
  }
  if (/[.,!?;:"—–()]/.test(ex.expectedBlank)) {
    throw new Error(`${ex.id}: expectedBlank "${ex.expectedBlank}" cannot include punctuation`);
  }
  if (
    ex.sentenceBeforeBlank.length > 0 &&
    !/[\s"'“‘—–(]$/.test(ex.sentenceBeforeBlank)
  ) {
    throw new Error(
      `${ex.id}: sentenceBeforeBlank "${ex.sentenceBeforeBlank}" must end on a clean word boundary`
    );
  }
  if (
    ex.sentenceAfterBlank.length > 0 &&
    !/^[\s.,!?;:"”’—–)]/.test(ex.sentenceAfterBlank)
  ) {
    throw new Error(
      `${ex.id}: sentenceAfterBlank "${ex.sentenceAfterBlank}" must start on a clean word boundary`
    );
  }

  const beforeClean = cleanClozeChars(ex.sentenceBeforeBlank);
  const blankClean = cleanClozeChars(ex.expectedBlank);
  const afterClean = cleanClozeChars(ex.sentenceAfterBlank);
  const blankStart = beforeClean.length;
  const blankEnd = blankStart + blankClean.length;
  const fullClean = `${beforeClean}${blankClean}${afterClean}`;

  const beforeTokens: TapHintToken[] = [];
  const afterTokens: TapHintToken[] = [];
  const unmatchedTokens: TapHintToken[] = [];

  let cursor = 0;
  for (const hint of ex.tapHints) {
    const surfClean = cleanClozeChars(hint.surface);
    if (!surfClean) continue;
    const idx = fullClean.indexOf(surfClean, cursor);
    if (idx === -1) {
      if (!blankClean || (!blankClean.includes(surfClean) && !surfClean.includes(blankClean))) {
        unmatchedTokens.push(hint);
      }
      continue;
    }
    const start = idx;
    const end = start + surfClean.length;
    cursor = end;
    if (end <= blankStart) {
      beforeTokens.push(hint);
    } else if (start >= blankEnd) {
      afterTokens.push(hint);
    }
  }

  if (unmatchedTokens.length > 0) {
    throw new Error(
      `${ex.id}: unmatched cloze tapHint tokens: ${unmatchedTokens.map((t) => t.surface).join(', ')}`
    );
  }
  if (beforeTokens.map((t) => cleanClozeChars(t.surface)).join('') !== beforeClean) {
    throw new Error(`${ex.id}: beforeTokens mismatch for "${ex.sentenceBeforeBlank}"`);
  }
  if (afterTokens.map((t) => cleanClozeChars(t.surface)).join('') !== afterClean) {
    throw new Error(`${ex.id}: afterTokens mismatch for "${ex.sentenceAfterBlank}"`);
  }
}

function assertForeignTokensInGlossary(
  sentence: string,
  glossary: GlossaryMap,
  context: string
): void {
  const segmented = segmentSentenceTokens(sentence, glossary);
  const spaced = sentence
    .trim()
    .split(/\s+/)
    .map((w) => stripEdgePunctuation(w).replace(/[’‘]/g, "'"))
    .filter(Boolean);

  for (const tok of [...segmented, ...spaced]) {
    if (!tok) continue;
    const entry = lookupGlossaryEntry(tok, glossary);
    if (!entry) {
      throw new Error(`${context}: missing glossary entry for "${tok}" in "${sentence}"`);
    }
    if (!entry.translation.trim() || !entry.phonetic.trim() || !(entry.speakText ?? tok).trim()) {
      throw new Error(`${context}: incomplete glossary entry for "${tok}"`);
    }
  }
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

/**
 * Merges fallback English lexicon, single-word VocabCard glosses, and curated subculture slang
 * with curated slang taking highest precedence.
 */
export function compileMashupGlossary(
  cards: readonly VocabCard[],
  curatedGlossary: GlossaryMap
): GlossaryMap {
  const baseWithFallback: GlossaryMap = {};
  for (const [key, entry] of Object.entries(wave1EnglishFallbackGlossary)) {
    const normalized: GlossaryEntry = {
      ...entry,
      speakText: entry.speakText ?? key,
    };
    baseWithFallback[key] = normalized;
    const norm = normalizeLookupKey(key);
    if (norm && !baseWithFallback[norm]) {
      baseWithFallback[norm] = normalized;
    }
  }

  const fromCards = buildGlossaryFromCards(cards, {});
  const merged: GlossaryMap = { ...baseWithFallback };

  for (const [key, entry] of Object.entries(fromCards)) {
    const normalized: GlossaryEntry = {
      ...entry,
      speakText: entry.speakText ?? key,
    };
    merged[key] = normalized;
    const norm = normalizeLookupKey(key);
    if (norm) merged[norm] = normalized;
  }

  for (const [key, entry] of Object.entries(curatedGlossary)) {
    const normalized: GlossaryEntry = {
      ...entry,
      speakText: entry.speakText ?? key,
    };
    merged[key] = normalized;
    merged[key.toLowerCase()] = normalized;
    const norm = normalizeLookupKey(key);
    if (norm) merged[norm] = normalized;
  }

  return merged;
}

export function buildMashupUnit(
  seed: MashupUnitSeed,
  glossary: GlossaryMap,
  extraOverrides?: Record<string, GlossaryEntry>
): CourseUnit {
  const { language, order } = seed;
  const prefix = WAVE1_PREFIX[language];
  const unitId = `${language}-u${order}`;
  const nodePrefix = `${prefix}-u${order}`;
  const tier = resolveUnitProficiencyTier(order);
  const meta = LANGUAGE_META[language];
  const rewards = MASTERY_REWARDS[tier];
  const enableFreeRecall = tier === 'B2' || tier === 'C1_C2';
  const mergedGlossary: GlossaryMap = extraOverrides
    ? { ...glossary, ...extraOverrides }
    : glossary;

  if (seed.cards.length !== 10) {
    throw new Error(`${unitId}: expected 10 cards per unit, got ${seed.cards.length}`);
  }

  assertCleanText(`${seed.title} ${seed.culturalLandmark} ${seed.subtitle}`, unitId);

  const cards: VocabCard[] = seed.cards.map((c, idx) => {
    if (!VALID_ILLUSTRATION_SET.has(c.illustrationKey)) {
      throw new Error(`${unitId}: invalid illustrationKey "${c.illustrationKey}"`);
    }
    const cardId = c.id ?? `${nodePrefix}-c${idx + 1}`;
    const foreignWordCount = c.exampleForeign.trim().split(/\s+/).length;
    const englishWordCount = c.exampleEnglish.trim().split(/\s+/).length;
    if (foreignWordCount < 4 || foreignWordCount > 12) {
      throw new Error(
        `${cardId}: exampleForeign must be 4-12 words (got ${foreignWordCount}): "${c.exampleForeign}"`
      );
    }
    if (englishWordCount < 4 || englishWordCount > 12) {
      throw new Error(
        `${cardId}: exampleEnglish must be 4-12 words (got ${englishWordCount}): "${c.exampleEnglish}"`
      );
    }

    assertCleanText(
      `${c.foreignWithArticle} ${c.bareForeign} ${c.english} ${c.exampleForeign} ${c.exampleEnglish} ${c.registerNote ?? ''}`,
      cardId
    );
    assertForeignTokensInGlossary(c.foreignWithArticle, mergedGlossary, `${cardId}:foreignWithArticle`);
    assertForeignTokensInGlossary(c.exampleForeign, mergedGlossary, `${cardId}:exampleForeign`);

    return makeCard(language, unitId, {
      id: cardId,
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
    });
  });

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

    assertCleanText(`${lSeed.title} ${lSeed.subtitle} ${lSeed.nuanceNote ?? ''}`, nodeId);

    const discoveries = groupCards.map((c, dIdx) =>
      discovery(`${nodeId}-e${dIdx + 1}`, c.id, c.registerNote ?? c.grammarNote)
    );

    const exercises: LessonExercise[] = [...discoveries];

    const fullForeignSentence = `${lSeed.cloze.sentenceBeforeBlank}${lSeed.cloze.expectedBlank}${lSeed.cloze.sentenceAfterBlank}`;
    assertCleanText(
      `${fullForeignSentence} ${lSeed.cloze.englishTranslation} ${lSeed.cloze.nuanceNote}`,
      `${nodeId}-cloze`
    );
    assertForeignTokensInGlossary(fullForeignSentence, mergedGlossary, `${nodeId}-cloze`);
    if (lSeed.cloze.choices.length < 4) {
      throw new Error(`${nodeId}-cloze: expected >= 4 choices`);
    }

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
    verifyClozePartition(clozeEx);
    exercises.push(clozeEx);

    if (idx % 2 === 0 || lSeed.wbEn) {
      const promptText = lSeed.wbEn?.promptText ?? cPrimary.exampleForeign;
      const promptPhonetic = lSeed.wbEn?.promptPhonetic ?? cPrimary.examplePhonetic;
      const expectedSentence = lSeed.wbEn?.expectedSentence ?? cPrimary.exampleEnglish;
      assertForeignTokensInGlossary(promptText, mergedGlossary, `${nodeId}-wben`);
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
      assertForeignTokensInGlossary(expectedSentence, mergedGlossary, `${nodeId}-wbfr`);
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

    const audioText = lSeed.listen?.audioText ?? cSecondary.exampleForeign;
    const phonetic = lSeed.listen?.phonetic ?? cSecondary.examplePhonetic;
    const englishMeaning = lSeed.listen?.englishMeaning ?? cSecondary.exampleEnglish;
    assertForeignTokensInGlossary(audioText, mergedGlossary, `${nodeId}-ld`);

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

  if (seed.story.bubbles.length < 4) {
    throw new Error(`${unitId}: story must have >= 4 bubbles`);
  }
  if (seed.story.decisions.length < 1) {
    throw new Error(`${unitId}: story must have >= 1 decision`);
  }
  for (const dec of seed.story.decisions) {
    if (!dec.options.some((o) => o.isCorrect)) {
      throw new Error(`${unitId}: story decision at ${dec.afterBubbleIndex} missing isCorrect: true`);
    }
    if (dec.afterBubbleIndex < 0 || dec.afterBubbleIndex >= seed.story.bubbles.length) {
      throw new Error(`${unitId}: story decision afterBubbleIndex ${dec.afterBubbleIndex} out of bounds`);
    }
  }

  const storyBubbles: StoryBubble[] = seed.story.bubbles.map((b, bIdx) => {
    assertCleanText(`${b.foreignText} ${b.englishText}`, `${nodePrefix}-st-b${bIdx + 1}`);
    assertForeignTokensInGlossary(b.foreignText, mergedGlossary, `${nodePrefix}-st-b${bIdx + 1}`);
    return makeBubble(
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
    );
  });

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

  if (seed.boss.turns.length < 3) {
    throw new Error(`${unitId}: boss must have >= 3 turns`);
  }

  const bossTurns = seed.boss.turns.map((turn, tIdx) => {
    const turnId = `${nodePrefix}-b${tIdx + 1}`;
    assertCleanText(
      `${turn.companionSayForeign} ${turn.companionSayEnglish} ${turn.expectedAnswer} ${turn.victoryReplyForeign} ${turn.victoryReplyEnglish}`,
      turnId
    );
    assertForeignTokensInGlossary(turn.companionSayForeign, mergedGlossary, `${turnId}:say`);
    assertForeignTokensInGlossary(turn.victoryReplyForeign, mergedGlossary, `${turnId}:victory`);
    assertForeignTokensInGlossary(turn.expectedAnswer, mergedGlossary, `${turnId}:expectedAnswer`);
    if (turn.choices) {
      for (const ch of turn.choices) {
        assertForeignTokensInGlossary(ch, mergedGlossary, `${turnId}:choice`);
      }
    }

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

export function compileMashupCourse(
  language: Wave1MashupLanguage,
  seeds: readonly MashupUnitSeed[],
  curatedGlossary: GlossaryMap
): { course: LanguageCourse; glossary: GlossaryMap } {
  const prefix = WAVE1_PREFIX[language];
  if (seeds.length !== 16) {
    throw new Error(`${language}: expected 16 units, got ${seeds.length}`);
  }

  const previewCards: VocabCard[] = seeds.flatMap((seed) =>
    seed.cards.map((c, idx) =>
      makeCard(language, `${language}-u${seed.order}`, {
        id: c.id ?? `${prefix}-u${seed.order}-c${idx + 1}`,
        proficiencyTier: resolveUnitProficiencyTier(seed.order),
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
    )
  );

  const glossary = compileMashupGlossary(previewCards, curatedGlossary);
  const units = seeds.map((seed, idx) => {
    if (seed.order !== idx + 1) {
      throw new Error(`${language}: unit order mismatch at index ${idx} (got ${seed.order})`);
    }
    if (seed.language !== language) {
      throw new Error(`${language}: unit ${seed.order} has wrong language "${seed.language}"`);
    }
    return buildMashupUnit(seed, glossary);
  });

  const course = buildCourse(language, units);

  // Enforce global uniqueness across all 160 cards and 112 nodes
  const seenForeign = new Set<string>();
  const seenEnglish = new Set<string>();
  const seenExampleForeign = new Set<string>();
  const seenExampleEnglish = new Set<string>();
  const seenUnitIds = new Set<string>();
  const seenNodeIds = new Set<string>();
  const seenExIds = new Set<string>();
  const seenWbKeys = new Set<string>();
  const seenListenKeys = new Set<string>();

  for (const unit of course.units) {
    if (seenUnitIds.has(unit.id)) throw new Error(`${language}: duplicate unit id ${unit.id}`);
    seenUnitIds.add(unit.id);

    for (const card of unit.vocabCards) {
      const f = card.foreignWithArticle.trim().toLowerCase();
      const e = card.english.trim().toLowerCase();
      const ef = card.exampleForeign.trim().toLowerCase();
      const ee = card.exampleEnglish.trim().toLowerCase();
      if (seenForeign.has(f)) throw new Error(`${language}: duplicate card foreign "${card.foreignWithArticle}" (${card.id})`);
      if (seenEnglish.has(e)) throw new Error(`${language}: duplicate card english "${card.english}" (${card.id})`);
      if (seenExampleForeign.has(ef)) throw new Error(`${language}: duplicate exampleForeign "${card.exampleForeign}" (${card.id})`);
      if (seenExampleEnglish.has(ee)) throw new Error(`${language}: duplicate exampleEnglish "${card.exampleEnglish}" (${card.id})`);
      seenForeign.add(f);
      seenEnglish.add(e);
      seenExampleForeign.add(ef);
      seenExampleEnglish.add(ee);
    }

    for (const node of unit.nodes) {
      if (seenNodeIds.has(node.id)) throw new Error(`${language}: duplicate node id ${node.id}`);
      seenNodeIds.add(node.id);
      for (const ex of node.exercises) {
        if (seenExIds.has(ex.id)) throw new Error(`${language}: duplicate exercise id ${ex.id}`);
        seenExIds.add(ex.id);
        if (ex.type === 'word_bank') {
          const k = `${ex.promptText.trim().toLowerCase()}||${ex.expectedSentence.trim().toLowerCase()}`;
          if (seenWbKeys.has(k)) throw new Error(`${language}: duplicate WordBank pair "${k}" on ${ex.id}`);
          seenWbKeys.add(k);
        } else if (ex.type === 'listen_decode') {
          const k = ex.audioText.trim().toLowerCase();
          if (seenListenKeys.has(k)) throw new Error(`${language}: duplicate ListenDecode audio "${k}" on ${ex.id}`);
          seenListenKeys.add(k);
        }
      }
    }
  }

  return { course, glossary };
}
