import {
  LANGUAGE_META,
  PROFICIENCY_TIER_META,
  resolveUnitProficiencyTier,
} from '../types/contracts';
import type {
  BossGauntletExercise,
  BossTurn,
  ContextClozeExercise,
  CourseUnit,
  LanguageCode,
  LanguageCourse,
  LessonExercise,
  ListenDecodeExercise,
  MapNode,
  MiniStoryExercise,
  PairMatchRushExercise,
  ProficiencyTier,
  StoryDecision,
  VocabCard,
  WordBankExercise,
} from '../types/contracts';
import { arabicCourse, arabicGlossary } from './ar';
import { egyptianArabicCourse, egyptianArabicGlossary } from './arz';
import { bengaliCourse, bengaliGlossary } from './bn';
import { germanCourse, germanGlossary } from './de';
import { englishCourse, englishGlossary } from './en';
import { spanishCourse, spanishGlossary } from './es';
import { frenchCourse, frenchGlossary } from './fr';
import {
  buildTapHints,
  normalizeLookupKey,
  pairMatchFromCards,
  segmentSentenceTokens,
  stripEdgePunctuation,
} from './helpers';
import type { GlossaryMap } from './helpers';
import { hindiCourse, hindiGlossary } from './hi';
import { indonesianCourse, indonesianGlossary } from './id';
import { italianCourse, italianGlossary } from './it';
import { japaneseCourse, japaneseGlossary } from './ja';
import { portugueseCourse, portugueseGlossary } from './pt';
import { russianCourse, russianGlossary } from './ru';
import { swahiliCourse, swahiliGlossary } from './sw';
import { vietnameseCourse, vietnameseGlossary } from './vi';
import { mandarinCourse, mandarinGlossary } from './zh';

const GLOSSARIES: Record<LanguageCode, GlossaryMap> = {
  es: spanishGlossary,
  fr: frenchGlossary,
  de: germanGlossary,
  it: italianGlossary,
  pt: portugueseGlossary,
  en: englishGlossary,
  zh: mandarinGlossary,
  ja: japaneseGlossary,
  hi: hindiGlossary,
  bn: bengaliGlossary,
  ar: arabicGlossary,
  arz: egyptianArabicGlossary,
  ru: russianGlossary,
  id: indonesianGlossary,
  vi: vietnameseGlossary,
  sw: swahiliGlossary,
};

const COURSES_MAP: Record<LanguageCode, LanguageCourse> = {
  es: spanishCourse,
  fr: frenchCourse,
  de: germanCourse,
  it: italianCourse,
  pt: portugueseCourse,
  en: englishCourse,
  zh: mandarinCourse,
  ja: japaneseCourse,
  hi: hindiCourse,
  bn: bengaliCourse,
  ar: arabicCourse,
  arz: egyptianArabicCourse,
  ru: russianCourse,
  id: indonesianCourse,
  vi: vietnameseCourse,
  sw: swahiliCourse,
};

interface LessonPoolEntry {
  kind: 'lesson';
  discoveries: LessonExercise[];
  challenges: LessonExercise[];
  totalSize: number;
}

interface BossPoolEntry {
  kind: 'boss';
  baseExercise: BossGauntletExercise;
  turnsPool: BossTurn[];
  authoredCount: number;
}

interface StoryPoolEntry {
  kind: 'story';
  baseExercise: MiniStoryExercise;
  bonusChallenges: LessonExercise[];
}

interface StaticPoolEntry {
  kind: 'static';
  exercises: LessonExercise[];
}

type NodePoolEntry = LessonPoolEntry | BossPoolEntry | StoryPoolEntry | StaticPoolEntry;

const poolCache = new Map<string, NodePoolEntry>();

function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
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

const CJK_CHAR_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

function tokenizeCleanWords(sentence: string, glossary?: GlossaryMap): string[] {
  return segmentSentenceTokens(sentence, glossary);
}

function normalizeSentenceKey(sentence: string, glossary?: GlossaryMap): string {
  return tokenizeCleanWords(sentence, glossary).join(' ').toLowerCase();
}

function cjkSpacelessVariants(text: string, glossary?: GlossaryMap): string[] {
  if (!CJK_CHAR_RE.test(text)) return [];
  const stripped = stripEdgePunctuation(text).replace(/\s+/g, '');
  const tokensJoined = tokenizeCleanWords(text, glossary).join('').replace(/\s+/g, '');
  return dedupeAccepted([stripped, tokensJoined]);
}

function dedupeAccepted(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

function pickForeignDistractors(
  unit: CourseUnit,
  targetTokens: readonly string[],
  seedOffset: number,
  glossary: GlossaryMap,
  count = 3
): string[] {
  const forbidden = new Set<string>();
  for (const t of targetTokens) {
    forbidden.add(t.toLowerCase());
    forbidden.add(normalizeLookupKey(t));
  }

  const candidates: string[] = [];
  const seenCand = new Set<string>();
  const cards = unit.vocabCards;
  for (let pass = 0; pass < 2 && candidates.length < count; pass++) {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[(i + seedOffset) % cards.length];
      const words = [
        ...tokenizeCleanWords(c.foreignWithArticle, glossary),
        ...tokenizeCleanWords(c.exampleForeign, glossary),
      ];
      for (const w of words) {
        if (pass === 0 && !CJK_CHAR_RE.test(w) && w.length < 2) continue;
        const lower = w.toLowerCase();
        const norm = normalizeLookupKey(w);
        if (forbidden.has(lower) || forbidden.has(norm) || seenCand.has(norm)) continue;
        seenCand.add(norm);
        candidates.push(w);
        if (candidates.length >= count) return candidates;
      }
    }
  }
  return candidates;
}

function pickEnglishDistractors(
  unit: CourseUnit,
  targetTokens: readonly string[],
  seedOffset: number,
  count = 3
): string[] {
  const forbidden = new Set(targetTokens.map((t) => t.toLowerCase()));
  const candidates: string[] = [];
  const seenCand = new Set<string>();
  const cards = unit.vocabCards;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[(i + seedOffset) % cards.length];
    const words = [
      ...tokenizeCleanWords(c.english),
      ...tokenizeCleanWords(c.exampleEnglish),
    ];
    for (const w of words) {
      if (w.length < 2) continue;
      const lower = w.toLowerCase();
      if (forbidden.has(lower) || seenCand.has(lower)) continue;
      seenCand.add(lower);
      candidates.push(w);
      if (candidates.length >= count) return candidates;
    }
  }
  return candidates;
}

function cardEnglishKeySet(card: VocabCard): Set<string> {
  const keys = new Set<string>();
  const add = (s: string) => {
    const clean = normalizeSentenceKey(s);
    if (!clean) return;
    keys.add(clean);
    const bare = clean.replace(/^(?:the|a|an)\s+/, '');
    if (bare) keys.add(bare);
  };
  add(card.english);
  for (const ae of card.acceptedEnglish) add(ae);
  return keys;
}

function cardForeignKeySet(card: VocabCard, glossary?: GlossaryMap): Set<string> {
  const keys = new Set<string>();
  for (const s of [card.foreignWithArticle, card.bareForeign, ...card.acceptedForeign]) {
    const clean = normalizeSentenceKey(s, glossary);
    if (clean) keys.add(clean);
  }
  return keys;
}

function pickEnglishChoices(
  unit: CourseUnit,
  targetCard: VocabCard,
  correct: string,
  useExamples: boolean,
  seed: string
): string[] {
  const choices = [correct];
  const wrongForbidden = new Set([
    normalizeSentenceKey(correct),
    normalizeSentenceKey(correct).replace(/^(?:the|a|an)\s+/, ''),
  ]);
  if (!useExamples) {
    for (const k of cardEnglishKeySet(targetCard)) wrongForbidden.add(k);
  }
  const seen = new Set([correct.toLowerCase()]);
  const shuffled = deterministicShuffle(unit.vocabCards, `${seed}-eng-choices`);
  for (const c of shuffled) {
    const candidate = useExamples ? c.exampleEnglish : c.english;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    const candKey = normalizeSentenceKey(candidate);
    const candBare = candKey.replace(/^(?:the|a|an)\s+/, '');
    if (wrongForbidden.has(candKey) || wrongForbidden.has(candBare)) continue;
    if (!useExamples) {
      let overlapsTarget = false;
      for (const ck of cardEnglishKeySet(c)) {
        if (wrongForbidden.has(ck)) {
          overlapsTarget = true;
          break;
        }
      }
      if (overlapsTarget) continue;
    }
    seen.add(key);
    choices.push(candidate);
    if (choices.length >= 4) break;
  }
  return deterministicShuffle(choices, seed);
}

function makeDynamicWordBankToEn(
  id: string,
  card: VocabCard,
  unit: CourseUnit,
  glossary: GlossaryMap,
  seedOffset: number
): WordBankExercise {
  const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
  const enableFreeRecall = unitTier === 'B2' || unitTier === 'C1_C2';
  const targetTokens = tokenizeCleanWords(card.exampleEnglish);
  const joined = targetTokens.join(' ');
  const distractorTokens = pickEnglishDistractors(unit, targetTokens, seedOffset);
  const nuance = card.registerNote ?? card.grammarNote;
  return {
    type: 'word_bank',
    id,
    direction: 'to_english',
    promptText: card.exampleForeign,
    promptPhonetic: card.examplePhonetic,
    ...(card.exampleRomanized ? { promptRomanized: card.exampleRomanized } : {}),
    promptSpeakText: card.exampleForeign,
    promptTokens: buildTapHints(card.exampleForeign, glossary),
    expectedSentence: card.exampleEnglish,
    acceptedSentences: dedupeAccepted([
      card.exampleEnglish,
      stripEdgePunctuation(card.exampleEnglish),
      joined,
      joined.replace(/\bYou're\b/gi, 'You are').replace(/\bIt's\b/gi, 'It is'),
    ]),
    targetTokens,
    distractorTokens,
    phoneticHint: card.examplePhonetic,
    ...(card.article ? { articleHint: `Spot "${card.article}" (${card.gender}) with "${card.bareForeign}".` } : {}),
    ...(nuance ? { nuanceNote: nuance } : {}),
    ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
    vocabIds: [card.id],
  };
}

function makeDynamicWordBankToForeign(
  id: string,
  card: VocabCard,
  unit: CourseUnit,
  glossary: GlossaryMap,
  seedOffset: number
): WordBankExercise {
  const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
  const enableFreeRecall = unitTier === 'B2' || unitTier === 'C1_C2';
  let targetTokens = tokenizeCleanWords(card.exampleForeign, glossary);
  if (!LANGUAGE_META[unit.language].usesSpaces && targetTokens.length < 2) {
    const chars = Array.from(stripEdgePunctuation(card.exampleForeign)).filter((ch) => ch.trim() !== '');
    if (chars.length >= 2) targetTokens = chars;
  }
  const joined = targetTokens.join(' ');
  const distractorTokens = pickForeignDistractors(unit, targetTokens, seedOffset, glossary);
  const nuance = card.registerNote ?? card.grammarNote;
  return {
    type: 'word_bank',
    id,
    direction: 'to_foreign',
    promptText: card.exampleEnglish,
    promptTokens: [],
    expectedSentence: card.exampleForeign,
    acceptedSentences: dedupeAccepted([
      card.exampleForeign,
      stripEdgePunctuation(card.exampleForeign),
      joined,
      ...cjkSpacelessVariants(card.exampleForeign, glossary),
      ...cjkSpacelessVariants(joined, glossary),
      ...(card.exampleRomanized ? [card.exampleRomanized] : []),
    ]),
    targetTokens,
    distractorTokens,
    phoneticHint: card.examplePhonetic,
    ...(card.article ? { articleHint: `Remember "${card.article}" (${card.gender}) for "${card.bareForeign}".` } : {}),
    ...(nuance ? { nuanceNote: nuance } : {}),
    ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
    vocabIds: [card.id],
  };
}

function makeDynamicListenMeaning(
  id: string,
  card: VocabCard,
  unit: CourseUnit,
  glossary: GlossaryMap,
  useExample: boolean
): ListenDecodeExercise {
  const audioText = useExample ? card.exampleForeign : card.foreignWithArticle;
  const phonetic = useExample ? card.examplePhonetic : card.phonetic;
  const romanized = useExample ? card.exampleRomanized : card.romanized;
  const englishMeaning = useExample ? card.exampleEnglish : card.english;
  const wordCount = tokenizeCleanWords(audioText, glossary).length;
  const generatedChoices = pickEnglishChoices(unit, card, englishMeaning, useExample, id);
  const wrongLower = new Set(
    generatedChoices
      .filter((c) => c !== englishMeaning)
      .map((c) => normalizeSentenceKey(c))
  );
  const expanded = useExample
    ? []
    : card.acceptedEnglish.filter((ae) => !wrongLower.has(normalizeSentenceKey(ae)));
  return {
    type: 'listen_decode',
    id,
    mode: 'select_meaning',
    audioText,
    phonetic,
    ...(romanized ? { romanized } : {}),
    voiceFallbackPhoneticPrompt: `Syllables: ${phonetic.replace(/\s+/g, ' • ')} (${wordCount} ${wordCount === 1 ? 'word' : 'words'})`,
    englishMeaning,
    choices: generatedChoices,
    acceptedAnswers: dedupeAccepted([
      englishMeaning,
      stripEdgePunctuation(englishMeaning),
      ...expanded,
    ]),
    tapHints: buildTapHints(audioText, glossary),
    vocabIds: [card.id],
  };
}

function makeDynamicListenAssemble(
  id: string,
  card: VocabCard,
  unit: CourseUnit,
  glossary: GlossaryMap,
  seedOffset: number
): ListenDecodeExercise {
  let targetTokens = tokenizeCleanWords(card.exampleForeign, glossary);
  if (!LANGUAGE_META[unit.language].usesSpaces && targetTokens.length < 2) {
    const chars = Array.from(stripEdgePunctuation(card.exampleForeign)).filter((ch) => ch.trim() !== '');
    if (chars.length >= 2) targetTokens = chars;
  }
  const joined = targetTokens.join(' ');
  const distractorTokens = pickForeignDistractors(unit, targetTokens, seedOffset, glossary);
  return {
    type: 'listen_decode',
    id,
    mode: 'assemble_heard',
    audioText: card.exampleForeign,
    phonetic: card.examplePhonetic,
    ...(card.exampleRomanized ? { romanized: card.exampleRomanized } : {}),
    voiceFallbackPhoneticPrompt: `Syllables: ${card.examplePhonetic.replace(/\s+/g, ' • ')} (${targetTokens.length} ${targetTokens.length === 1 ? 'word' : 'words'})`,
    englishMeaning: card.exampleEnglish,
    targetTokens,
    distractorTokens,
    acceptedAnswers: dedupeAccepted([
      card.exampleForeign,
      stripEdgePunctuation(card.exampleForeign),
      joined,
      ...cjkSpacelessVariants(card.exampleForeign, glossary),
      ...cjkSpacelessVariants(joined, glossary),
      ...(card.exampleRomanized ? [card.exampleRomanized] : []),
    ]),
    tapHints: buildTapHints(card.exampleForeign, glossary),
    vocabIds: [card.id],
  };
}

function makeDynamicContextClozeFromCard(
  id: string,
  card: VocabCard,
  unit: CourseUnit,
  glossary: GlossaryMap
): ContextClozeExercise | undefined {
  const bare = stripEdgePunctuation(card.bareForeign).trim();
  if (!bare || /\s/.test(bare)) return undefined;
  const tokens = tokenizeCleanWords(card.exampleForeign, glossary);
  if (tokens.length < 2) return undefined;
  const bareNorm = normalizeLookupKey(bare);
  const hasExactToken = tokens.some((t) => normalizeLookupKey(t) === bareNorm);
  if (!hasExactToken) return undefined;

  const idx = card.exampleForeign.indexOf(bare);
  if (idx < 0) return undefined;
  const before = card.exampleForeign.slice(0, idx);
  const after = card.exampleForeign.slice(idx + bare.length);
  if (!before.trim() && !after.trim()) return undefined;

  const choiceList = [bare];
  const seenNorm = new Set<string>([bareNorm]);
  for (const other of deterministicShuffle(unit.vocabCards, `${id}-cc-choices`)) {
    const otherBare = stripEdgePunctuation(other.bareForeign).trim();
    const otherNorm = normalizeLookupKey(otherBare);
    if (!otherBare || /\s/.test(otherBare) || !otherNorm || seenNorm.has(otherNorm)) continue;
    seenNorm.add(otherNorm);
    choiceList.push(otherBare);
    if (choiceList.length >= 4) break;
  }
  if (choiceList.length < 3) return undefined;

  return {
    type: 'context_cloze',
    id,
    sentenceBeforeBlank: before,
    sentenceAfterBlank: after,
    fullForeignSentence: card.exampleForeign,
    englishTranslation: card.exampleEnglish,
    phonetic: card.examplePhonetic,
    ...(card.exampleRomanized ? { romanized: card.exampleRomanized } : {}),
    choices: deterministicShuffle(choiceList, id),
    expectedBlank: bare,
    acceptedBlanks: [bare],
    nuanceNote:
      card.registerNote ??
      card.grammarNote ??
      `"${card.foreignWithArticle}" (${card.english}) fits this context naturally.`,
    registerTag: card.registerNote ? 'polite' : 'grammar',
    tapHints: buildTapHints(card.exampleForeign, glossary),
    vocabIds: [card.id],
  };
}

function findUnitAndNode(lang: LanguageCode, nodeId: string): { unit: CourseUnit; node: MapNode } | undefined {
  const course = COURSES_MAP[lang];
  for (const unit of course.units) {
    const node = unit.nodes.find((n) => n.id === nodeId);
    if (node) return { unit, node };
  }
  return undefined;
}

function buildLessonPool(lang: LanguageCode, unit: CourseUnit, node: MapNode): LessonPoolEntry {
  const glossary = GLOSSARIES[lang];
  const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
  const discoveries: LessonExercise[] = [];
  const challenges: LessonExercise[] = [];

  const usedForeignSentences = new Set<string>();
  const usedEnglishSentences = new Set<string>();
  const usedListenAudio = new Set<string>();
  const usedPairSignatures = new Set<string>();
  const usedClozeSentences = new Set<string>();

  for (const ex of node.exercises) {
    if (ex.type === 'discovery_card') {
      discoveries.push(ex);
      continue;
    }
    challenges.push(ex);
    if (ex.type === 'word_bank') {
      const f = ex.direction === 'to_english' ? ex.promptText : ex.expectedSentence;
      const e = ex.direction === 'to_english' ? ex.expectedSentence : ex.promptText;
      usedForeignSentences.add(normalizeSentenceKey(f, glossary));
      usedEnglishSentences.add(normalizeSentenceKey(e));
    } else if (ex.type === 'listen_decode') {
      usedListenAudio.add(normalizeSentenceKey(ex.audioText, glossary));
    } else if (ex.type === 'context_cloze') {
      usedClozeSentences.add(normalizeSentenceKey(ex.fullForeignSentence, glossary));
    } else if (ex.type === 'pair_match_rush') {
      const sig = ex.pairs
        .map((p) => p.vocabId ?? p.foreign)
        .sort()
        .join('|');
      usedPairSignatures.add(sig);
    }
  }

  const cards = unit.vocabCards;
  const lessonIndex = Math.max(0, node.order - 1);
  let poolSeq = 1;

  // 0. For B1-C1_C2 units, pull dynamic context_cloze items from sibling lessons or cards
  if (unitTier === 'B1' || unitTier === 'B2' || unitTier === 'C1_C2') {
    let clozeAdded = 0;
    for (const sibling of unit.nodes) {
      if (sibling.id === node.id || sibling.nodeType !== 'lesson') continue;
      for (const sex of sibling.exercises) {
        if (sex.type !== 'context_cloze') continue;
        const ck = normalizeSentenceKey(sex.fullForeignSentence, glossary);
        if (usedClozeSentences.has(ck)) continue;
        usedClozeSentences.add(ck);
        challenges.push({
          ...sex,
          id: `${node.id}-pool-cc-${poolSeq++}`,
        });
        clozeAdded++;
        if (clozeAdded >= 3) break;
      }
      if (clozeAdded >= 3) break;
    }
    for (let i = 0; i < cards.length && clozeAdded < 2; i++) {
      const card = cards[(lessonIndex * 2 + i) % cards.length];
      const ck = normalizeSentenceKey(card.exampleForeign, glossary);
      if (usedClozeSentences.has(ck)) continue;
      const dynCloze = makeDynamicContextClozeFromCard(
        `${node.id}-pool-cc-${poolSeq++}`,
        card,
        unit,
        glossary
      );
      if (!dynCloze) continue;
      usedClozeSentences.add(ck);
      challenges.push(dynCloze);
      clozeAdded++;
    }
  }

  // 1. Add up to 4 card-example WordBank (to_english) challenges
  let wbEnAdded = 0;
  for (let i = 0; i < cards.length && wbEnAdded < 4 && challenges.length < 12; i++) {
    const card = cards[(lessonIndex * 3 + i) % cards.length];
    const fk = normalizeSentenceKey(card.exampleForeign, glossary);
    const ek = normalizeSentenceKey(card.exampleEnglish);
    if (usedForeignSentences.has(fk) || usedEnglishSentences.has(ek)) continue;
    usedForeignSentences.add(fk);
    usedEnglishSentences.add(ek);
    challenges.push(
      makeDynamicWordBankToEn(
        `${node.id}-pool-wben-${poolSeq++}`,
        card,
        unit,
        glossary,
        i + lessonIndex + 1
      )
    );
    wbEnAdded++;
  }

  // 2. Add up to 3 card-example WordBank (to_foreign) challenges
  let wbForeignAdded = 0;
  for (let i = 0; i < cards.length && wbForeignAdded < 3; i++) {
    const card = cards[(lessonIndex * 3 + 4 + i) % cards.length];
    const fk = normalizeSentenceKey(card.exampleForeign, glossary);
    const ek = normalizeSentenceKey(card.exampleEnglish);
    if (usedForeignSentences.has(fk) || usedEnglishSentences.has(ek)) continue;
    usedForeignSentences.add(fk);
    usedEnglishSentences.add(ek);
    challenges.push(
      makeDynamicWordBankToForeign(
        `${node.id}-pool-wbfr-${poolSeq++}`,
        card,
        unit,
        glossary,
        i + lessonIndex + 3
      )
    );
    wbForeignAdded++;
  }

  // 3. Add up to 2 ListenDecode (select_meaning) challenges (example + vocab card)
  let lmAdded = 0;
  for (let i = 0; i < cards.length && lmAdded < 2; i++) {
    const card = cards[(lessonIndex * 3 + 7 + i) % cards.length];
    const useExample = lmAdded === 0;
    const text = useExample ? card.exampleForeign : card.foreignWithArticle;
    const ak = normalizeSentenceKey(text, glossary);
    if (usedListenAudio.has(ak)) continue;
    usedListenAudio.add(ak);
    challenges.push(
      makeDynamicListenMeaning(
        `${node.id}-pool-ldm-${poolSeq++}`,
        card,
        unit,
        glossary,
        useExample
      )
    );
    lmAdded++;
  }

  // 4. Add up to 3 ListenDecode (assemble_heard) challenges from unit card examples
  let laAdded = 0;
  for (let i = 0; i < cards.length && laAdded < 3; i++) {
    const card = cards[(lessonIndex * 3 + 9 + i) % cards.length];
    const ak = normalizeSentenceKey(card.exampleForeign, glossary);
    if (usedListenAudio.has(ak)) continue;
    usedListenAudio.add(ak);
    challenges.push(
      makeDynamicListenAssemble(
        `${node.id}-pool-lda-${poolSeq++}`,
        card,
        unit,
        glossary,
        i + lessonIndex + 5
      )
    );
    laAdded++;
  }

  // 5. Add 2 distinct 5-pair PairMatchRush sets (avoid overlapping acceptedEnglish within same round)
  let pmAdded = 0;
  const pairStride =
    cards.length % 3 !== 0 ? 3 : cards.length % 5 !== 0 ? 5 : 1;
  for (let shift = 0; shift < cards.length && pmAdded < 2; shift++) {
    const start = (lessonIndex * 2 + shift * 3) % cards.length;
    const picked: VocabCard[] = [];
    const usedIds = new Set<string>();
    const usedEngKeys = new Set<string>();
    for (let step = 0; step < cards.length && picked.length < 5; step++) {
      const candidate = cards[(start + step * pairStride) % cards.length];
      if (usedIds.has(candidate.id)) continue;
      const candKeys = cardEnglishKeySet(candidate);
      let overlaps = false;
      for (const ck of candKeys) {
        if (usedEngKeys.has(ck)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      usedIds.add(candidate.id);
      for (const ck of candKeys) usedEngKeys.add(ck);
      picked.push(candidate);
    }
    if (picked.length < 5) {
      for (let k = 0; k < cards.length && picked.length < 5; k++) {
        const candidate = cards[(start + k) % cards.length];
        if (!usedIds.has(candidate.id)) {
          usedIds.add(candidate.id);
          picked.push(candidate);
        }
      }
    }
    const sig = picked
      .map((c) => c.id)
      .sort()
      .join('|');
    if (usedPairSignatures.has(sig)) continue;
    usedPairSignatures.add(sig);
    const pm: PairMatchRushExercise = pairMatchFromCards(
      `${node.id}-pool-pm-${poolSeq++}`,
      `${unit.culturalLandmark} Speed Match`,
      picked,
      45
    );
    challenges.push(pm);
    pmAdded++;
  }

  // Fallback safety if any unit still needs extra challenges to guarantee >= 14 total
  for (let i = 0; i < cards.length && discoveries.length + challenges.length < 16; i++) {
    const card = cards[(lessonIndex + i) % cards.length];
    const ak = normalizeSentenceKey(card.foreignWithArticle, glossary);
    if (!usedListenAudio.has(ak)) {
      usedListenAudio.add(ak);
      challenges.push(
        makeDynamicListenMeaning(
          `${node.id}-pool-ldv-${poolSeq++}`,
          card,
          unit,
          glossary,
          false
        )
      );
    }
  }

  return {
    kind: 'lesson',
    discoveries,
    challenges,
    totalSize: discoveries.length + challenges.length,
  };
}

function buildBossPool(lang: LanguageCode, unit: CourseUnit, node: MapNode): BossPoolEntry {
  const glossary = GLOSSARIES[lang];
  const baseExercise = node.exercises.find(
    (ex): ex is BossGauntletExercise => ex.type === 'boss_gauntlet'
  );
  if (!baseExercise) {
    throw new Error(`Boss node "${node.id}" missing boss_gauntlet exercise`);
  }

  const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
  const enableFreeRecall = unitTier === 'B2' || unitTier === 'C1_C2';
  const turnsPool: BossTurn[] = [...baseExercise.turns];
  const usedSay = new Set(turnsPool.map((t) => normalizeSentenceKey(t.companionSayForeign, glossary)));
  const usedExpected = new Set(turnsPool.map((t) => normalizeSentenceKey(t.expectedAnswer, glossary)));
  const cards = unit.vocabCards;
  const langName = LANGUAGE_META[lang].name;

  let seq = 1;
  const stride = cards.length % 3 !== 0 ? 3 : cards.length % 5 !== 0 ? 5 : 1;
  for (let i = 0; i < cards.length && turnsPool.length < 8; i++) {
    const sayIdx = (i * stride + unit.order) % cards.length;
    const sayCard = cards[sayIdx];
    const sayKey = normalizeSentenceKey(sayCard.exampleForeign, glossary);
    if (usedSay.has(sayKey)) continue;

    const isChoiceTurn = seq % 2 === 1;
    let answerCard: VocabCard | undefined;
    let ansKey = '';
    for (let offset = 0; offset < cards.length; offset++) {
      const cand = cards[(sayIdx + 3 + offset) % cards.length];
      const candText = isChoiceTurn ? cand.foreignWithArticle : cand.exampleForeign;
      const candKey = normalizeSentenceKey(candText, glossary);
      if (!usedExpected.has(candKey)) {
        answerCard = cand;
        ansKey = candKey;
        break;
      }
    }
    if (!answerCard) continue;

    usedSay.add(sayKey);
    usedExpected.add(ansKey);

    if (isChoiceTurn) {
      const choiceList = [answerCard.foreignWithArticle];
      const seenChoices = new Set([answerCard.foreignWithArticle.toLowerCase()]);
      const forbiddenForeign = cardForeignKeySet(answerCard, glossary);
      const forbiddenEng = cardEnglishKeySet(answerCard);
      const shuffledChoicesPool = deterministicShuffle(cards, `${baseExercise.id}-pool-t${seq}-pool`);
      for (const c of shuffledChoicesPool) {
        if (seenChoices.has(c.foreignWithArticle.toLowerCase())) continue;
        let collides = false;
        for (const fk of cardForeignKeySet(c, glossary)) {
          if (forbiddenForeign.has(fk)) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          for (const ek of cardEnglishKeySet(c)) {
            if (forbiddenEng.has(ek)) {
              collides = true;
              break;
            }
          }
        }
        if (collides) continue;
        seenChoices.add(c.foreignWithArticle.toLowerCase());
        choiceList.push(c.foreignWithArticle);
        if (choiceList.length >= 3) break;
      }
      const wrongLower = new Set(
        choiceList
          .filter((c) => c !== answerCard.foreignWithArticle)
          .map((c) => normalizeSentenceKey(c, glossary))
      );
      const safeAcceptedForeign = answerCard.acceptedForeign.filter(
        (af) => !wrongLower.has(normalizeSentenceKey(af, glossary))
      );
      const shuffledChoices = deterministicShuffle(choiceList, `${baseExercise.id}-pool-t${seq}`);
      turnsPool.push({
        id: `${baseExercise.id}-pool-t${seq}`,
        companionSayForeign: sayCard.exampleForeign,
        companionSayEnglish: sayCard.exampleEnglish,
        companionPhonetic: sayCard.examplePhonetic,
        ...(sayCard.exampleRomanized ? { companionRomanized: sayCard.exampleRomanized } : {}),
        tapHints: buildTapHints(sayCard.exampleForeign, glossary),
        promptEnglish: `Pick the ${langName} phrase for "${answerCard.english}":`,
        mode: 'choice',
        choices: shuffledChoices,
        expectedAnswer: answerCard.foreignWithArticle,
        acceptedAnswers: dedupeAccepted([
          answerCard.foreignWithArticle,
          stripEdgePunctuation(answerCard.foreignWithArticle),
          ...cjkSpacelessVariants(answerCard.foreignWithArticle, glossary),
          ...safeAcceptedForeign,
        ]),
        phoneticAnswer: answerCard.phonetic,
        ...(answerCard.romanized ? { romanizedAnswer: answerCard.romanized } : {}),
        victoryReplyForeign: answerCard.exampleForeign,
        victoryReplyEnglish: answerCard.exampleEnglish,
      });
    } else {
      let targetTokens = tokenizeCleanWords(answerCard.exampleForeign, glossary);
      if (!LANGUAGE_META[lang].usesSpaces && targetTokens.length < 2) {
        const chars = Array.from(stripEdgePunctuation(answerCard.exampleForeign)).filter(
          (ch) => ch.trim() !== ''
        );
        if (chars.length >= 2) targetTokens = chars;
      }
      const joined = targetTokens.join(' ');
      const distractors = pickForeignDistractors(unit, targetTokens, i + unit.order + 2, glossary);
      turnsPool.push({
        id: `${baseExercise.id}-pool-t${seq}`,
        companionSayForeign: sayCard.exampleForeign,
        companionSayEnglish: sayCard.exampleEnglish,
        companionPhonetic: sayCard.examplePhonetic,
        ...(sayCard.exampleRomanized ? { companionRomanized: sayCard.exampleRomanized } : {}),
        tapHints: buildTapHints(sayCard.exampleForeign, glossary),
        promptEnglish: `Build in ${langName}: "${answerCard.exampleEnglish}"`,
        mode: 'word_bank',
        targetTokens,
        distractorTokens: distractors,
        expectedAnswer: answerCard.exampleForeign,
        acceptedAnswers: dedupeAccepted([
          answerCard.exampleForeign,
          stripEdgePunctuation(answerCard.exampleForeign),
          joined,
          ...cjkSpacelessVariants(answerCard.exampleForeign, glossary),
          ...cjkSpacelessVariants(joined, glossary),
          ...(answerCard.exampleRomanized ? [answerCard.exampleRomanized] : []),
        ]),
        phoneticAnswer: answerCard.examplePhonetic,
        ...(answerCard.exampleRomanized ? { romanizedAnswer: answerCard.exampleRomanized } : {}),
        victoryReplyForeign: answerCard.foreignWithArticle,
        victoryReplyEnglish: answerCard.english,
        ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
      });
    }
    seq++;
  }

  return {
    kind: 'boss',
    baseExercise,
    turnsPool,
    authoredCount: baseExercise.turns.length,
  };
}

function buildStoryPool(lang: LanguageCode, unit: CourseUnit, node: MapNode): StoryPoolEntry {
  const glossary = GLOSSARIES[lang];
  const baseExercise = node.exercises.find(
    (ex): ex is MiniStoryExercise => ex.type === 'mini_story'
  );
  if (!baseExercise) {
    throw new Error(`Story node "${node.id}" missing mini_story exercise`);
  }

  const bonusChallenges: LessonExercise[] = [];
  const storyCards = unit.vocabCards;

  // 4 distinct comprehension bonus challenges from the unit cards
  const c1 = storyCards[0];
  const c2 = storyCards[3 % storyCards.length];
  const c3 = storyCards[6 % storyCards.length];
  const c4 = storyCards[9 % storyCards.length];

  bonusChallenges.push(
    makeDynamicWordBankToEn(`${node.id}-pool-bonus-1`, c1, unit, glossary, 2),
    makeDynamicListenMeaning(`${node.id}-pool-bonus-2`, c2, unit, glossary, true),
    makeDynamicWordBankToForeign(`${node.id}-pool-bonus-3`, c3, unit, glossary, 5),
    makeDynamicListenAssemble(`${node.id}-pool-bonus-4`, c4, unit, glossary, 7)
  );

  return {
    kind: 'story',
    baseExercise,
    bonusChallenges,
  };
}

function getOrBuildPool(lang: LanguageCode, nodeId: string): NodePoolEntry | undefined {
  const cacheKey = `${lang}:${nodeId}`;
  const cached = poolCache.get(cacheKey);
  if (cached) return cached;

  const checkpointMatch = nodeId.match(/-checkpoint-(A2|B1|B2|C1_C2)$/);
  if (checkpointMatch) {
    const targetTier = checkpointMatch[1] as Exclude<ProficiencyTier, 'A1'>;
    const cpNode = buildTierCheckpointNode(lang, targetTier);
    const entry: NodePoolEntry = { kind: 'static', exercises: [...cpNode.exercises] };
    poolCache.set(cacheKey, entry);
    return entry;
  }

  const found = findUnitAndNode(lang, nodeId);
  if (!found) return undefined;

  const { unit, node } = found;
  let entry: NodePoolEntry;
  if (node.nodeType === 'lesson') {
    entry = buildLessonPool(lang, unit, node);
  } else if (node.nodeType === 'boss') {
    entry = buildBossPool(lang, unit, node);
  } else if (node.nodeType === 'story') {
    entry = buildStoryPool(lang, unit, node);
  } else {
    entry = { kind: 'static', exercises: [...node.exercises] };
  }

  poolCache.set(cacheKey, entry);
  return entry;
}

const SOURCE_TIER_FOR_CHECKPOINT: Record<Exclude<ProficiencyTier, 'A1'>, ProficiencyTier> = {
  A2: 'A1',
  B1: 'A2',
  B2: 'B1',
  C1_C2: 'B2',
};

/**
 * Builds a 5-exercise placement checkpoint node sampling cards and challenges
 * from the proficiency tier immediately below `targetTier`.
 */
export function buildTierCheckpointNode(
  lang: LanguageCode,
  targetTier: Exclude<ProficiencyTier, 'A1'>
): MapNode {
  const course = COURSES_MAP[lang];
  const glossary = GLOSSARIES[lang];
  const sourceTier = SOURCE_TIER_FOR_CHECKPOINT[targetTier];
  const tierMeta = PROFICIENCY_TIER_META[targetTier];
  const nodeId = `${lang}-checkpoint-${targetTier}`;

  const matchingSourceUnits = course.units.filter(
    (u) => (u.proficiencyTier ?? resolveUnitProficiencyTier(u.order)) === sourceTier
  );
  const sourceUnits =
    matchingSourceUnits.length > 0 ? matchingSourceUnits : course.units.slice(0, 4);

  const targetUnit =
    course.units.find(
      (u) => (u.proficiencyTier ?? resolveUnitProficiencyTier(u.order)) === targetTier
    ) ?? course.units[course.units.length - 1];

  // Sample across source units, prioritizing the upper units of the prerequisite tier
  const orderedUnits = [...sourceUnits].reverse();
  const unitCardEntries: { unit: CourseUnit; card: VocabCard }[] = [];
  const maxCardCount = Math.max(...orderedUnits.map((u) => u.vocabCards.length));
  for (let cIdx = 0; cIdx < maxCardCount; cIdx++) {
    for (const u of orderedUnits) {
      const card = u.vocabCards[cIdx];
      if (card) unitCardEntries.push({ unit: u, card });
    }
  }

  const pickDistinctEntry = (
    usedKeys: Set<string>,
    startIndex: number
  ): { unit: CourseUnit; card: VocabCard } => {
    for (let offset = 0; offset < unitCardEntries.length; offset++) {
      const entry = unitCardEntries[(startIndex + offset) % unitCardEntries.length];
      const key = normalizeSentenceKey(entry.card.exampleForeign, glossary);
      if (!usedKeys.has(key)) {
        usedKeys.add(key);
        return entry;
      }
    }
    return unitCardEntries[0];
  };

  // Pull an authored context_cloze from the prerequisite tier when available (B1/B2),
  // otherwise test listening assembly across the source tier.
  let authoredCloze: ContextClozeExercise | undefined;
  for (const u of orderedUnits) {
    for (const n of u.nodes) {
      const found = n.exercises.find(
        (ex): ex is ContextClozeExercise => ex.type === 'context_cloze'
      );
      if (found) {
        authoredCloze = found;
        break;
      }
    }
    if (authoredCloze) break;
  }

  const usedExampleKeys = new Set<string>();
  if (authoredCloze) {
    usedExampleKeys.add(normalizeSentenceKey(authoredCloze.fullForeignSentence, glossary));
  }
  const entry1 = pickDistinctEntry(usedExampleKeys, 0);
  const entry2 = pickDistinctEntry(usedExampleKeys, 3);
  const entry3 = pickDistinctEntry(usedExampleKeys, 6);
  const entry4 = pickDistinctEntry(usedExampleKeys, 9);

  const enableFreeRecall = targetTier === 'B2' || targetTier === 'C1_C2';
  const ex1: WordBankExercise = {
    ...makeDynamicWordBankToEn(
      `${nodeId}-e1`,
      entry1.card,
      entry1.unit,
      glossary,
      3
    ),
    ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
  };

  const ex2 = makeDynamicListenMeaning(
    `${nodeId}-e2`,
    entry2.card,
    entry2.unit,
    glossary,
    true
  );

  const ex3: LessonExercise = authoredCloze
    ? { ...authoredCloze, id: `${nodeId}-e3` }
    : makeDynamicListenAssemble(`${nodeId}-e3`, entry3.card, entry3.unit, glossary, 5);

  const ex4: WordBankExercise = {
    ...makeDynamicWordBankToForeign(
      `${nodeId}-e4`,
      entry4.card,
      entry4.unit,
      glossary,
      7
    ),
    ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
  };

  const pairCards: VocabCard[] = [];
  const usedPairEng = new Set<string>();
  const usedPairIds = new Set<string>();
  for (const { card } of unitCardEntries) {
    if (usedPairIds.has(card.id)) continue;
    const keys = cardEnglishKeySet(card);
    let overlaps = false;
    for (const k of keys) {
      if (usedPairEng.has(k)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;
    usedPairIds.add(card.id);
    for (const k of keys) usedPairEng.add(k);
    pairCards.push(card);
    if (pairCards.length >= 5) break;
  }

  const ex5 = pairMatchFromCards(
    `${nodeId}-e5`,
    `${tierMeta.cefrLabel} Checkpoint Match`,
    pairCards,
    45
  );

  return {
    id: nodeId,
    unitId: targetUnit.id,
    order: 0,
    nodeType: 'lesson',
    proficiencyTier: targetTier,
    checkpointTargetTier: targetTier,
    title: `${tierMeta.cefrLabel} ${tierMeta.title} Checkpoint`,
    subtitle: `Pass this 5-challenge placement trial to unlock ${tierMeta.cefrLabel} (${tierMeta.title})!`,
    xpReward: 75,
    gemReward: 40,
    exercises: [ex1, ex2, ex3, ex4, ex5],
    rewardVocabIds: pairCards.slice(0, 3).map((c) => c.id),
  };
}

function selectChallengesWithoutRepeats<T extends { id: string }>(
  pool: readonly T[],
  seenExerciseIds: readonly string[],
  count: number
): T[] {
  const seenSet = new Set(seenExerciseIds);
  const seenOrder = new Map<string, number>();
  seenExerciseIds.forEach((id, idx) => {
    if (!seenOrder.has(id)) seenOrder.set(id, idx);
  });

  const unseen = pool.filter((item) => !seenSet.has(item.id));
  if (unseen.length >= count) {
    return unseen.slice(0, count);
  }

  const seenSortedOldestFirst = pool
    .filter((item) => seenSet.has(item.id))
    .sort((a, b) => (seenOrder.get(a.id) ?? 0) - (seenOrder.get(b.id) ?? 0));

  return [...unseen, ...seenSortedOldestFirst].slice(0, count);
}

export function getCourseGlossary(lang: LanguageCode): GlossaryMap {
  return GLOSSARIES[lang];
}

export function getNodePoolSize(lang: LanguageCode, nodeId: string): number {
  const entry = getOrBuildPool(lang, nodeId);
  if (!entry) return 0;
  switch (entry.kind) {
    case 'lesson':
      return entry.totalSize;
    case 'boss':
      return entry.turnsPool.length;
    case 'story':
      return 1 + entry.bonusChallenges.length;
    case 'static':
      return entry.exercises.length;
  }
}

export function getPlayableNodeExercises(
  lang: LanguageCode,
  nodeId: string,
  seenExerciseIds: readonly string[] = [],
  isReplay = false
): LessonExercise[] {
  const entry = getOrBuildPool(lang, nodeId);
  if (!entry) return [];

  if (entry.kind === 'static') {
    return [...entry.exercises];
  }

  if (entry.kind === 'lesson') {
    const TARGET_EXERCISES = 7;
    if (isReplay) {
      return selectChallengesWithoutRepeats(
        entry.challenges,
        seenExerciseIds,
        Math.min(TARGET_EXERCISES, entry.challenges.length)
      );
    }

    const seenSet = new Set(seenExerciseIds);
    const unseenDiscoveries = entry.discoveries.filter((d) => !seenSet.has(d.id));
    const remainingSlots = Math.max(0, TARGET_EXERCISES - unseenDiscoveries.length);
    const pickedChallenges = selectChallengesWithoutRepeats(
      entry.challenges,
      seenExerciseIds,
      remainingSlots
    );
    return [...unseenDiscoveries, ...pickedChallenges];
  }

  if (entry.kind === 'boss') {
    const TURN_TARGET = Math.min(4, entry.turnsPool.length);
    const seenSet = new Set(seenExerciseIds);
    const seenTurnsInPool = entry.turnsPool.filter((t) => seenSet.has(t.id));

    let chosenTurns: BossTurn[];
    if (isReplay && seenTurnsInPool.length === 0 && entry.turnsPool.length > entry.authoredCount) {
      // Caller recorded boss exercise ID rather than turn IDs: serve the expanded replay turns
      chosenTurns = entry.turnsPool.slice(entry.authoredCount, entry.authoredCount + TURN_TARGET);
      if (chosenTurns.length < TURN_TARGET) {
        chosenTurns = [
          ...chosenTurns,
          ...entry.turnsPool.slice(0, TURN_TARGET - chosenTurns.length),
        ];
      }
    } else {
      chosenTurns = selectChallengesWithoutRepeats(entry.turnsPool, seenExerciseIds, TURN_TARGET);
    }

    return [
      {
        ...entry.baseExercise,
        turns: chosenTurns,
      },
    ];
  }

  // Story node: preserve bubble order, deterministically shuffle choice options per run,
  // and on replay append 1 unseen unit comprehension challenge
  const runSeed = `${entry.baseExercise.id}:${isReplay ? 'r' : 'p'}:${seenExerciseIds.length}`;
  const shuffledDecisions: StoryDecision[] = entry.baseExercise.decisions.map((dec, idx) => {
    let opts = deterministicShuffle(dec.options, `${runSeed}:d${idx}`);
    if (
      isReplay &&
      opts.length >= 2 &&
      opts.every((o, oIdx) => o.id === dec.options[oIdx]?.id)
    ) {
      // Ensure replay actually rotates order relative to default
      opts = [...opts.slice(1), opts[0]];
    }
    return {
      ...dec,
      options: opts,
    };
  });

  const storyOut: MiniStoryExercise = {
    ...entry.baseExercise,
    decisions: shuffledDecisions,
  };

  if (!isReplay) {
    return [storyOut];
  }

  const bonus = selectChallengesWithoutRepeats(entry.bonusChallenges, seenExerciseIds, 1);
  return [storyOut, ...bonus];
}
