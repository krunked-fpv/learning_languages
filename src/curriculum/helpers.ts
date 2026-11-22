import {
  ILLUSTRATION_KEYS,
  LANGUAGE_META,
  resolveUnitProficiencyTier,
} from '../types/contracts';
import type {
  AccentCallout,
  BossGauntletExercise,
  BossTurn,
  CompanionId,
  ContextClozeExercise,
  CourseUnit,
  DiscoveryCardExercise,
  GenderCategory,
  IllustrationKey,
  LanguageCode,
  LanguageCourse,
  LessonExercise,
  ListenDecodeExercise,
  MapNode,
  MiniStoryExercise,
  PairMatchItem,
  PairMatchRushExercise,
  ProficiencyTier,
  RegisterNuanceTag,
  StoryBubble,
  StoryDecision,
  TapHintToken,
  VocabCard,
  WordBankExercise,
} from '../types/contracts';

const VALID_ILLUSTRATIONS = new Set<string>(ILLUSTRATION_KEYS);

export interface GlossaryEntry {
  translation: string;
  phonetic: string;
  romanized?: string;
  articleNote?: string;
  accentNote?: string;
  registerNote?: string;
  grammarNote?: string;
  speakText?: string;
}

export type GlossaryMap = Record<string, GlossaryEntry>;

const EDGE_PUNCTUATION_RE =
  /^[¡!¿?.,;:()[\]«»"“”„。？！，、・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+|[¡!¿?.,;:()[\]«»"“”„。？！，、・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+$/g;
const INTERNAL_PUNCT_SPLIT_RE =
  /[¡!¿?.,;:()[\]«»"“”„。？！，、・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+/;
const CJK_CHAR_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640]/g;

export function stripEdgePunctuation(word: string): string {
  return word.replace(EDGE_PUNCTUATION_RE, '');
}

export function normalizeLookupKey(raw: string): string {
  return stripEdgePunctuation(raw)
    .trim()
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_RE, '')
    .replace(/[أإآٱ]/g, 'ا')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/đ/g, 'd')
    .replace(/ё/g, 'е')
    .replace(/ß/g, 'ss')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

function dedupeStrings(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

function lookupGlossaryEntry(
  surface: string,
  glossary?: GlossaryMap,
  overrides?: Record<string, GlossaryEntry>
): GlossaryEntry | undefined {
  if (!surface) return undefined;
  const lower = surface.toLowerCase();
  const normKey = normalizeLookupKey(surface);
  return (
    overrides?.[surface] ??
    overrides?.[lower] ??
    overrides?.[normKey] ??
    glossary?.[surface] ??
    glossary?.[lower] ??
    glossary?.[normKey]
  );
}

/**
 * Splits a sentence into clean word/character tokens, supporting Latin/Cyrillic/Arabic/Indic
 * whitespace + international punctuation as well as greedy longest-match CJK/Kana segmentation.
 */
export function segmentSentenceTokens(
  sentence: string,
  glossary?: GlossaryMap,
  overrides?: Record<string, GlossaryEntry>
): string[] {
  const rawParts = sentence.trim().split(/\s+/);
  const tokens: string[] = [];

  for (const raw of rawParts) {
    const cleaned = stripEdgePunctuation(raw).replace(/[’‘]/g, "'");
    if (!cleaned) continue;

    const subParts = cleaned.split(INTERNAL_PUNCT_SPLIT_RE).filter(Boolean);
    for (const part of subParts) {
      if (!CJK_CHAR_RE.test(part) || (!glossary && !overrides)) {
        tokens.push(part);
        continue;
      }

      if (lookupGlossaryEntry(part, glossary, overrides)) {
        tokens.push(part);
        continue;
      }

      let i = 0;
      while (i < part.length) {
        let matched = '';
        const maxLen = Math.min(12, part.length - i);
        for (let len = maxLen; len >= 1; len--) {
          const slice = part.slice(i, i + len);
          if (lookupGlossaryEntry(slice, glossary, overrides)) {
            matched = slice;
            break;
          }
        }
        if (matched) {
          tokens.push(matched);
          i += matched.length;
        } else if (/[A-Za-z0-9'-]/.test(part[i])) {
          const rest = part.slice(i);
          const asciiMatch = rest.match(/^[A-Za-z0-9'-]+/);
          const asciiTok = asciiMatch ? asciiMatch[0] : part[i];
          tokens.push(asciiTok);
          i += asciiTok.length;
        } else {
          tokens.push(part[i]);
          i += 1;
        }
      }
    }
  }

  return tokens;
}

export function buildTapHints(
  sentence: string,
  glossary: GlossaryMap,
  overrides?: Record<string, GlossaryEntry>
): TapHintToken[] {
  const surfaces = segmentSentenceTokens(sentence, glossary, overrides);
  const tokens: TapHintToken[] = [];

  for (const surface of surfaces) {
    const normKey = normalizeLookupKey(surface);
    const entry = lookupGlossaryEntry(surface, glossary, overrides);

    if (!entry) {
      throw new Error(
        `Missing tap-hint glossary entry for "${surface}" (key="${normKey}") in "${sentence}"`
      );
    }

    tokens.push({
      surface,
      normalizedId: normKey,
      translation: entry.translation,
      phonetic: entry.phonetic,
      ...(entry.romanized ? { romanized: entry.romanized } : {}),
      ...(entry.articleNote ? { articleNote: entry.articleNote } : {}),
      ...(entry.accentNote ? { accentNote: entry.accentNote } : {}),
      ...(entry.registerNote ? { registerNote: entry.registerNote } : {}),
      ...(entry.grammarNote ? { grammarNote: entry.grammarNote } : {}),
      speakText: entry.speakText ?? surface,
    });
  }

  return tokens;
}

function cjkSpacelessVariants(text: string): string[] {
  if (!CJK_CHAR_RE.test(text)) return [];
  const clean = stripEdgePunctuation(text).replace(/\s+/g, '');
  const noPunct = text.replace(INTERNAL_PUNCT_SPLIT_RE, '').replace(/\s+/g, '');
  return dedupeStrings([clean, noPunct]);
}

export interface CardSeed {
  id: string;
  proficiencyTier?: ProficiencyTier;
  foreignWithArticle: string;
  bareForeign: string;
  article?: string;
  gender: GenderCategory;
  english: string;
  acceptedEnglish?: string[];
  acceptedForeign?: string[];
  phonetic: string;
  romanized?: string;
  accentCallout?: AccentCallout;
  registerNote?: string;
  grammarNote?: string;
  illustrationKey: IllustrationKey;
  exampleForeign: string;
  exampleEnglish: string;
  examplePhonetic: string;
  exampleRomanized?: string;
}

export function makeCard(language: LanguageCode, unitId: string, seed: CardSeed): VocabCard {
  if (!VALID_ILLUSTRATIONS.has(seed.illustrationKey)) {
    throw new Error(`Invalid illustrationKey "${seed.illustrationKey}" on card "${seed.id}"`);
  }

  const englishBare = seed.english.replace(/^the\s+/i, '').trim();
  const acceptedEnglish = dedupeStrings([
    seed.english,
    ...(englishBare && englishBare !== seed.english ? [englishBare] : []),
    ...(seed.acceptedEnglish ?? []),
  ]);

  const cleanWithArt = stripEdgePunctuation(seed.foreignWithArticle);
  const cleanBare = stripEdgePunctuation(seed.bareForeign);
  const acceptedForeign = dedupeStrings([
    seed.foreignWithArticle,
    cleanWithArt,
    seed.bareForeign,
    cleanBare,
    ...(seed.romanized ? [seed.romanized] : []),
    ...(seed.acceptedForeign ?? []),
  ]);

  return {
    id: seed.id,
    language,
    unitId,
    ...(seed.proficiencyTier ? { proficiencyTier: seed.proficiencyTier } : {}),
    foreignWithArticle: seed.foreignWithArticle,
    bareForeign: seed.bareForeign,
    ...(seed.article ? { article: seed.article } : {}),
    gender: seed.gender,
    english: seed.english,
    acceptedEnglish,
    acceptedForeign,
    phonetic: seed.phonetic,
    ...(seed.romanized ? { romanized: seed.romanized } : {}),
    ...(seed.accentCallout ? { accentCallout: seed.accentCallout } : {}),
    ...(seed.registerNote ? { registerNote: seed.registerNote } : {}),
    ...(seed.grammarNote ? { grammarNote: seed.grammarNote } : {}),
    illustrationKey: seed.illustrationKey,
    exampleForeign: seed.exampleForeign,
    exampleEnglish: seed.exampleEnglish,
    examplePhonetic: seed.examplePhonetic,
    ...(seed.exampleRomanized ? { exampleRomanized: seed.exampleRomanized } : {}),
  };
}

export function buildGlossaryFromCards(
  cards: readonly VocabCard[],
  extra: GlossaryMap
): GlossaryMap {
  const map: GlossaryMap = {};

  for (const c of cards) {
    const bareWords = c.bareForeign.split(/\s+/);
    if (bareWords.length === 1) {
      const surface = stripEdgePunctuation(bareWords[0]).replace(/[’‘]/g, "'");
      const entry: GlossaryEntry = {
        translation: c.english.replace(/^the\s+/i, ''),
        phonetic: c.phonetic,
        ...(c.romanized ? { romanized: c.romanized } : {}),
        ...(c.article
          ? { articleNote: `Used with "${c.article}" (${c.gender})` }
          : {}),
        ...(c.accentCallout
          ? { accentNote: `${c.accentCallout.char}: ${c.accentCallout.tip}` }
          : {}),
        ...(c.registerNote ? { registerNote: c.registerNote } : {}),
        ...(c.grammarNote ? { grammarNote: c.grammarNote } : {}),
        speakText: c.foreignWithArticle.includes(' ')
          ? c.foreignWithArticle
          : surface,
      };
      const lower = surface.toLowerCase();
      const norm = normalizeLookupKey(surface);
      if (!map[lower]) map[lower] = entry;
      if (!map[norm]) map[norm] = entry;
    } else if (c.bareForeign.includes("'") && !c.bareForeign.includes(' ')) {
      const surface = stripEdgePunctuation(c.bareForeign).replace(/[’‘]/g, "'");
      const entry: GlossaryEntry = {
        translation: c.english,
        phonetic: c.phonetic,
        ...(c.romanized ? { romanized: c.romanized } : {}),
        ...(c.accentCallout
          ? { accentNote: `${c.accentCallout.char}: ${c.accentCallout.tip}` }
          : {}),
        speakText: surface,
      };
      map[surface.toLowerCase()] = entry;
      map[normalizeLookupKey(surface)] = entry;
    }

    if (c.foreignWithArticle.includes("'") && !c.foreignWithArticle.includes(' ')) {
      const elided = stripEdgePunctuation(c.foreignWithArticle).replace(/[’‘]/g, "'");
      const elidedEntry: GlossaryEntry = {
        translation: c.english,
        phonetic: c.phonetic,
        ...(c.romanized ? { romanized: c.romanized } : {}),
        ...(c.article
          ? { articleNote: `Elided article "${c.article}" (${c.gender}) before vowel` }
          : {}),
        ...(c.accentCallout
          ? { accentNote: `${c.accentCallout.char}: ${c.accentCallout.tip}` }
          : {}),
        speakText: elided,
      };
      map[elided.toLowerCase()] = elidedEntry;
      map[normalizeLookupKey(elided)] = elidedEntry;
    }
  }

  for (const [k, v] of Object.entries(extra)) {
    map[k] = v;
    const norm = normalizeLookupKey(k);
    if (!map[norm]) map[norm] = v;
  }

  return map;
}

export function discovery(
  id: string,
  vocabId: string,
  promptHint?: string
): DiscoveryCardExercise {
  return {
    type: 'discovery_card',
    id,
    vocabId,
    ...(promptHint ? { promptHint } : {}),
  };
}

function expandEnglishVariants(sentence: string, includeBareNoun = false): string[] {
  const variants = [sentence, stripEdgePunctuation(sentence)];
  const swapped = sentence
    .replace(/\bYou are welcome\b/g, "You're welcome")
    .replace(/\byou are welcome\b/g, "you're welcome")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bit is\b/g, "it's");
  if (swapped !== sentence) {
    variants.push(swapped, stripEdgePunctuation(swapped));
  }
  const expanded = sentence
    .replace(/\bYou're welcome\b/g, 'You are welcome')
    .replace(/\byou're welcome\b/g, 'you are welcome')
    .replace(/\bIt's\b/g, 'It is')
    .replace(/\bit's\b/g, 'it is');
  if (expanded !== sentence) {
    variants.push(expanded, stripEdgePunctuation(expanded));
  }
  if (includeBareNoun) {
    const clean = stripEdgePunctuation(sentence);
    const bareMatch = clean.match(/^(?:the|a|an)\s+([a-z][a-z -]*)$/i);
    if (bareMatch && !/\b(?:is|are|and|or|with|in|on|under|to)\b/i.test(bareMatch[1])) {
      variants.push(bareMatch[1].trim());
    }
  }
  return dedupeStrings(variants);
}

export function wordBankToEn(
  params: {
    id: string;
    promptText: string;
    promptPhonetic: string;
    promptRomanized?: string;
    promptSpeakText?: string;
    expectedSentence: string;
    acceptedSentences?: string[];
    targetTokens: string[];
    distractorTokens: string[];
    phoneticHint?: string;
    articleHint?: string;
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
    allowFreeRecall?: boolean;
    vocabIds: string[];
    hintOverrides?: Record<string, GlossaryEntry>;
  },
  glossary: GlossaryMap
): WordBankExercise {
  const joined = params.targetTokens.join(' ');
  const acceptedSentences = dedupeStrings([
    ...expandEnglishVariants(params.expectedSentence, true),
    joined,
    ...(params.acceptedSentences ?? []),
  ]);

  return {
    type: 'word_bank',
    id: params.id,
    direction: 'to_english',
    promptText: params.promptText,
    promptPhonetic: params.promptPhonetic,
    ...(params.promptRomanized ? { promptRomanized: params.promptRomanized } : {}),
    promptSpeakText: params.promptSpeakText ?? params.promptText,
    promptTokens: buildTapHints(params.promptText, glossary, params.hintOverrides),
    expectedSentence: params.expectedSentence,
    acceptedSentences,
    targetTokens: params.targetTokens,
    distractorTokens: params.distractorTokens,
    phoneticHint: params.phoneticHint ?? params.promptPhonetic,
    ...(params.articleHint ? { articleHint: params.articleHint } : {}),
    ...(params.nuanceNote ? { nuanceNote: params.nuanceNote } : {}),
    ...(params.registerTag ? { registerTag: params.registerTag } : {}),
    ...(params.allowFreeRecall !== undefined ? { allowFreeRecall: params.allowFreeRecall } : {}),
    vocabIds: params.vocabIds,
  };
}

export function wordBankToForeign(params: {
  id: string;
  promptText: string;
  expectedSentence: string;
  acceptedSentences?: string[];
  targetTokens: string[];
  distractorTokens: string[];
  phoneticHint: string;
  articleHint?: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  allowFreeRecall?: boolean;
  vocabIds: string[];
}): WordBankExercise {
  const joined = params.targetTokens.join(' ');
  const acceptedSentences = dedupeStrings([
    params.expectedSentence,
    joined,
    stripEdgePunctuation(params.expectedSentence),
    ...cjkSpacelessVariants(params.expectedSentence),
    ...cjkSpacelessVariants(joined),
    ...(params.acceptedSentences ?? []),
  ]);

  return {
    type: 'word_bank',
    id: params.id,
    direction: 'to_foreign',
    promptText: params.promptText,
    promptTokens: [],
    expectedSentence: params.expectedSentence,
    acceptedSentences,
    targetTokens: params.targetTokens,
    distractorTokens: params.distractorTokens,
    phoneticHint: params.phoneticHint,
    ...(params.articleHint ? { articleHint: params.articleHint } : {}),
    ...(params.nuanceNote ? { nuanceNote: params.nuanceNote } : {}),
    ...(params.registerTag ? { registerTag: params.registerTag } : {}),
    ...(params.allowFreeRecall !== undefined ? { allowFreeRecall: params.allowFreeRecall } : {}),
    vocabIds: params.vocabIds,
  };
}

export interface ContextClozeParams {
  id: string;
  sentenceBeforeBlank: string;
  sentenceAfterBlank: string;
  fullForeignSentence: string;
  englishTranslation: string;
  phonetic: string;
  romanized?: string;
  choices: string[];
  expectedBlank: string;
  acceptedBlanks?: string[];
  nuanceNote: string;
  registerTag?: RegisterNuanceTag;
  vocabIds: string[];
  hintOverrides?: Record<string, GlossaryEntry>;
}

export function contextCloze(
  params: ContextClozeParams,
  glossary: GlossaryMap
): ContextClozeExercise {
  const expectedBlank = params.expectedBlank.trim();
  if (!expectedBlank) {
    throw new Error(`ContextCloze "${params.id}": expectedBlank must be non-empty`);
  }
  if (!params.choices.includes(params.expectedBlank)) {
    throw new Error(
      `ContextCloze "${params.id}": choices must include expectedBlank "${params.expectedBlank}"`
    );
  }
  if (params.choices.length < 2) {
    throw new Error(`ContextCloze "${params.id}": needs at least 2 choices`);
  }
  if (!params.nuanceNote.trim()) {
    throw new Error(`ContextCloze "${params.id}": nuanceNote must be non-empty`);
  }

  const seenChoiceNorms = new Set<string>();
  for (const rawChoice of params.choices) {
    const trimmed = rawChoice.trim();
    const norm = normalizeLookupKey(trimmed);
    if (!trimmed || !norm) {
      throw new Error(`ContextCloze "${params.id}": empty choice`);
    }
    if (seenChoiceNorms.has(norm)) {
      throw new Error(
        `ContextCloze "${params.id}": duplicate or diacritic-colliding choice "${rawChoice}"`
      );
    }
    seenChoiceNorms.add(norm);
  }

  const wrongNorms = new Set(
    params.choices
      .filter((c) => c !== params.expectedBlank)
      .map((c) => normalizeLookupKey(c))
  );

  const acceptedBlanks = dedupeStrings([
    params.expectedBlank,
    stripEdgePunctuation(params.expectedBlank),
    ...(params.acceptedBlanks ?? []).filter((b) => !wrongNorms.has(normalizeLookupKey(b))),
  ]);

  return {
    type: 'context_cloze',
    id: params.id,
    sentenceBeforeBlank: params.sentenceBeforeBlank,
    sentenceAfterBlank: params.sentenceAfterBlank,
    fullForeignSentence: params.fullForeignSentence,
    englishTranslation: params.englishTranslation,
    phonetic: params.phonetic,
    ...(params.romanized ? { romanized: params.romanized } : {}),
    choices: params.choices,
    expectedBlank: params.expectedBlank,
    acceptedBlanks,
    nuanceNote: params.nuanceNote,
    ...(params.registerTag ? { registerTag: params.registerTag } : {}),
    tapHints: buildTapHints(params.fullForeignSentence, glossary, params.hintOverrides),
    vocabIds: params.vocabIds,
  };
}

export function listenMeaning(
  params: {
    id: string;
    audioText: string;
    phonetic: string;
    romanized?: string;
    voiceFallbackPhoneticPrompt: string;
    englishMeaning: string;
    choices: string[];
    acceptedAnswers?: string[];
    vocabIds: string[];
    hintOverrides?: Record<string, GlossaryEntry>;
  },
  glossary: GlossaryMap
): ListenDecodeExercise {
  if (!params.choices.includes(params.englishMeaning)) {
    throw new Error(
      `ListenMeaning "${params.id}": choices must contain "${params.englishMeaning}"`
    );
  }
  const wrongLower = new Set(
    params.choices.filter((c) => c !== params.englishMeaning).map((c) => stripEdgePunctuation(c).toLowerCase())
  );
  const safeExpanded = expandEnglishVariants(params.englishMeaning, true).filter(
    (v) => !wrongLower.has(stripEdgePunctuation(v).toLowerCase())
  );
  return {
    type: 'listen_decode',
    id: params.id,
    mode: 'select_meaning',
    audioText: params.audioText,
    phonetic: params.phonetic,
    ...(params.romanized ? { romanized: params.romanized } : {}),
    voiceFallbackPhoneticPrompt: params.voiceFallbackPhoneticPrompt,
    englishMeaning: params.englishMeaning,
    choices: params.choices,
    acceptedAnswers: dedupeStrings([
      params.englishMeaning,
      stripEdgePunctuation(params.englishMeaning),
      ...safeExpanded,
      ...(params.acceptedAnswers ?? []),
    ]),
    tapHints: buildTapHints(params.audioText, glossary, params.hintOverrides),
    vocabIds: params.vocabIds,
  };
}

export function listenAssemble(
  params: {
    id: string;
    audioText: string;
    phonetic: string;
    romanized?: string;
    voiceFallbackPhoneticPrompt: string;
    englishMeaning: string;
    targetTokens: string[];
    distractorTokens: string[];
    acceptedAnswers?: string[];
    vocabIds: string[];
    hintOverrides?: Record<string, GlossaryEntry>;
  },
  glossary: GlossaryMap
): ListenDecodeExercise {
  const joined = params.targetTokens.join(' ');
  return {
    type: 'listen_decode',
    id: params.id,
    mode: 'assemble_heard',
    audioText: params.audioText,
    phonetic: params.phonetic,
    ...(params.romanized ? { romanized: params.romanized } : {}),
    voiceFallbackPhoneticPrompt: params.voiceFallbackPhoneticPrompt,
    englishMeaning: params.englishMeaning,
    targetTokens: params.targetTokens,
    distractorTokens: params.distractorTokens,
    acceptedAnswers: dedupeStrings([
      params.audioText,
      joined,
      stripEdgePunctuation(params.audioText),
      ...cjkSpacelessVariants(params.audioText),
      ...cjkSpacelessVariants(joined),
      ...(params.romanized ? [params.romanized] : []),
      ...(params.acceptedAnswers ?? []),
    ]),
    tapHints: buildTapHints(params.audioText, glossary, params.hintOverrides),
    vocabIds: params.vocabIds,
  };
}

export function pairMatchFromCards(
  id: string,
  title: string,
  cards: readonly VocabCard[],
  timeBonusSeconds = 45
): PairMatchRushExercise {
  const pairs: PairMatchItem[] = cards.map((c, idx) => ({
    id: `${id}-p${idx + 1}`,
    foreign: c.foreignWithArticle,
    english: c.english,
    phonetic: c.phonetic,
    ...(c.romanized ? { romanized: c.romanized } : {}),
    vocabId: c.id,
  }));
  return {
    type: 'pair_match_rush',
    id,
    title,
    timeBonusSeconds,
    pairs,
  };
}

export function makeBubble(
  params: {
    id: string;
    speakerId: CompanionId;
    speakerName: string;
    side: 'left' | 'right';
    foreignText: string;
    englishText: string;
    phonetic: string;
    romanized?: string;
    hintOverrides?: Record<string, GlossaryEntry>;
  },
  glossary: GlossaryMap
): StoryBubble {
  return {
    id: params.id,
    speakerId: params.speakerId,
    speakerName: params.speakerName,
    side: params.side,
    foreignText: params.foreignText,
    englishText: params.englishText,
    phonetic: params.phonetic,
    ...(params.romanized ? { romanized: params.romanized } : {}),
    tapHints: buildTapHints(params.foreignText, glossary, params.hintOverrides),
  };
}

export function makeBossTurn(
  params: {
    id: string;
    companionSayForeign: string;
    companionSayEnglish: string;
    companionPhonetic: string;
    companionRomanized?: string;
    promptEnglish: string;
    mode: 'word_bank' | 'choice';
    choices?: string[];
    targetTokens?: string[];
    distractorTokens?: string[];
    expectedAnswer: string;
    acceptedAnswers?: string[];
    phoneticAnswer: string;
    romanizedAnswer?: string;
    victoryReplyForeign: string;
    victoryReplyEnglish: string;
    nuanceNote?: string;
    registerTag?: RegisterNuanceTag;
    allowFreeRecall?: boolean;
    hintOverrides?: Record<string, GlossaryEntry>;
  },
  glossary: GlossaryMap
): BossTurn {
  if (params.mode === 'choice' && (!params.choices || !params.choices.includes(params.expectedAnswer))) {
    throw new Error(
      `BossTurn "${params.id}": choice mode must include expectedAnswer "${params.expectedAnswer}"`
    );
  }
  const joined = params.targetTokens?.join(' ') ?? '';
  const wrongChoiceLower = new Set(
    (params.choices ?? [])
      .filter((c) => c !== params.expectedAnswer)
      .map((c) => stripEdgePunctuation(c).toLowerCase())
  );
  const bareNounChoices: string[] = [];
  if (params.mode === 'choice') {
    const cleanExp = stripEdgePunctuation(params.expectedAnswer).trim();
    const m = cleanExp.match(/^(?:el|la|los|las|le|l'|un|una|une|der|die|das|ein|eine|einen|il|lo|gli|o|a|os|as|um|uma)\s*([a-z\u00C0-\u024F-]+)$/i);
    if (m && m[1] && !wrongChoiceLower.has(m[1].toLowerCase())) {
      bareNounChoices.push(m[1]);
    }
  }
  const safeRomanized =
    params.romanizedAnswer && !wrongChoiceLower.has(stripEdgePunctuation(params.romanizedAnswer).toLowerCase())
      ? [params.romanizedAnswer]
      : [];
  return {
    id: params.id,
    companionSayForeign: params.companionSayForeign,
    companionSayEnglish: params.companionSayEnglish,
    companionPhonetic: params.companionPhonetic,
    ...(params.companionRomanized ? { companionRomanized: params.companionRomanized } : {}),
    tapHints: buildTapHints(params.companionSayForeign, glossary, params.hintOverrides),
    promptEnglish: params.promptEnglish,
    mode: params.mode,
    ...(params.choices ? { choices: params.choices } : {}),
    ...(params.targetTokens ? { targetTokens: params.targetTokens } : {}),
    ...(params.distractorTokens ? { distractorTokens: params.distractorTokens } : {}),
    expectedAnswer: params.expectedAnswer,
    acceptedAnswers: dedupeStrings([
      params.expectedAnswer,
      ...(joined ? [joined] : []),
      stripEdgePunctuation(params.expectedAnswer),
      ...cjkSpacelessVariants(params.expectedAnswer),
      ...(joined ? cjkSpacelessVariants(joined) : []),
      ...bareNounChoices,
      ...safeRomanized,
      ...(params.acceptedAnswers ?? []),
    ]),
    phoneticAnswer: params.phoneticAnswer,
    ...(params.romanizedAnswer ? { romanizedAnswer: params.romanizedAnswer } : {}),
    victoryReplyForeign: params.victoryReplyForeign,
    victoryReplyEnglish: params.victoryReplyEnglish,
    ...(params.nuanceNote ? { nuanceNote: params.nuanceNote } : {}),
    ...(params.registerTag ? { registerTag: params.registerTag } : {}),
    ...(params.allowFreeRecall !== undefined ? { allowFreeRecall: params.allowFreeRecall } : {}),
  };
}

export function lessonNode(params: {
  id: string;
  unitId: string;
  order: number;
  proficiencyTier?: ProficiencyTier;
  checkpointTargetTier?: Exclude<ProficiencyTier, 'A1'>;
  title: string;
  subtitle: string;
  xpReward: number;
  gemReward: number;
  exercises: LessonExercise[];
  rewardVocabIds: string[];
}): MapNode {
  return {
    ...params,
    nodeType: 'lesson',
  };
}

export function storyNode(params: {
  id: string;
  unitId: string;
  order: number;
  proficiencyTier?: ProficiencyTier;
  title: string;
  subtitle: string;
  xpReward: number;
  gemReward: number;
  story: Omit<MiniStoryExercise, 'type'>;
  rewardVocabIds: string[];
}): MapNode {
  return {
    id: params.id,
    unitId: params.unitId,
    order: params.order,
    nodeType: 'story',
    ...(params.proficiencyTier ? { proficiencyTier: params.proficiencyTier } : {}),
    title: params.title,
    subtitle: params.subtitle,
    xpReward: params.xpReward,
    gemReward: params.gemReward,
    exercises: [{ type: 'mini_story', ...params.story }],
    rewardVocabIds: params.rewardVocabIds,
  };
}

export function chestNode(params: {
  id: string;
  unitId: string;
  order: number;
  proficiencyTier?: ProficiencyTier;
  title: string;
  subtitle: string;
  xpReward: number;
  gemReward: number;
  rewardVocabIds: string[];
}): MapNode {
  return {
    id: params.id,
    unitId: params.unitId,
    order: params.order,
    nodeType: 'chest',
    ...(params.proficiencyTier ? { proficiencyTier: params.proficiencyTier } : {}),
    title: params.title,
    subtitle: params.subtitle,
    xpReward: params.xpReward,
    gemReward: params.gemReward,
    exercises: [],
    rewardVocabIds: params.rewardVocabIds,
  };
}

export function bossNode(params: {
  id: string;
  unitId: string;
  order: number;
  proficiencyTier?: ProficiencyTier;
  title: string;
  subtitle: string;
  xpReward: number;
  gemReward: number;
  boss: Omit<BossGauntletExercise, 'type'>;
  rewardVocabIds: string[];
}): MapNode {
  return {
    id: params.id,
    unitId: params.unitId,
    order: params.order,
    nodeType: 'boss',
    ...(params.proficiencyTier ? { proficiencyTier: params.proficiencyTier } : {}),
    title: params.title,
    subtitle: params.subtitle,
    xpReward: params.xpReward,
    gemReward: params.gemReward,
    exercises: [{ type: 'boss_gauntlet', ...params.boss }],
    rewardVocabIds: params.rewardVocabIds,
  };
}

export function makeStoryExercise(params: {
  id: string;
  title: string;
  settingSubtitle: string;
  bubbles: StoryBubble[];
  decisions: StoryDecision[];
  vocabIds: string[];
}): Omit<MiniStoryExercise, 'type'> {
  return params;
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

function pickForeignDistractorsFromCards(
  cards: readonly VocabCard[],
  targetTokens: readonly string[],
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
  for (let pass = 0; pass < 2 && out.length < count; pass++) {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[(i + seedOffset) % cards.length];
      const tokens = [
        ...segmentSentenceTokens(c.foreignWithArticle, glossary),
        ...segmentSentenceTokens(c.exampleForeign, glossary),
      ];
      for (const tok of tokens) {
        if (pass === 0 && !CJK_CHAR_RE.test(tok) && tok.length < 2) continue;
        const lower = tok.toLowerCase();
        const norm = normalizeLookupKey(tok);
        if (!norm || forbidden.has(lower) || forbidden.has(norm) || seen.has(norm)) continue;
        seen.add(norm);
        out.push(tok);
        if (out.length >= count) return out;
      }
    }
  }
  return out;
}

function pickEnglishDistractorsFromCards(
  cards: readonly VocabCard[],
  targetTokens: readonly string[],
  seedOffset: number,
  count = 3
): string[] {
  const forbidden = new Set(targetTokens.map((t) => t.toLowerCase()));
  forbidden.add('clue');
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < cards.length; i++) {
    const c = cards[(i + seedOffset) % cards.length];
    const tokens = [
      ...segmentSentenceTokens(c.english),
      ...segmentSentenceTokens(c.exampleEnglish),
    ];
    for (const tok of tokens) {
      if (tok.length < 2) continue;
      const lower = tok.toLowerCase();
      if (forbidden.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      out.push(tok);
      if (out.length >= count) return out;
    }
  }
  return out;
}

function deterministicRotateChoices(items: readonly string[], seed: string): string[] {
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

function pickDistinctEnglishChoices(
  cards: readonly VocabCard[],
  correct: string,
  useExample: boolean,
  seed: string
): string[] {
  const choices = [correct];
  const seen = new Set<string>([normalizeLookupKey(correct)]);
  for (const c of cards) {
    const cand = useExample ? c.exampleEnglish : c.english;
    const norm = normalizeLookupKey(cand);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    choices.push(cand);
    if (choices.length >= 4) break;
  }
  return deterministicRotateChoices(choices, seed);
}

export interface MasteryLessonMeta {
  title: string;
  subtitle: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
}

export interface MasteryStoryBubbleSeed {
  id?: string;
  speakerId: CompanionId;
  speakerName: string;
  side: 'left' | 'right';
  foreignText: string;
  englishText: string;
  phonetic: string;
  romanized?: string;
  hintOverrides?: Record<string, GlossaryEntry>;
  tapHints?: TapHintToken[];
}

export interface MasteryStorySpec {
  id?: string;
  title: string;
  settingSubtitle: string;
  bubbles: readonly MasteryStoryBubbleSeed[];
  decisions: StoryDecision[];
  vocabIds?: string[];
}

export interface MasteryBossTurnSeed {
  id?: string;
  companionSayForeign: string;
  companionSayEnglish: string;
  companionPhonetic: string;
  companionRomanized?: string;
  promptEnglish: string;
  mode: 'word_bank' | 'choice';
  choices?: string[];
  targetTokens?: string[];
  distractorTokens?: string[];
  expectedAnswer: string;
  acceptedAnswers?: string[];
  phoneticAnswer: string;
  romanizedAnswer?: string;
  victoryReplyForeign: string;
  victoryReplyEnglish: string;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  allowFreeRecall?: boolean;
  hintOverrides?: Record<string, GlossaryEntry>;
  tapHints?: TapHintToken[];
}

export interface MasteryBossSpec {
  id?: string;
  title: string;
  introLine: string;
  turns: readonly MasteryBossTurnSeed[];
  vocabIds?: string[];
}

export interface MasteryUnitSpec {
  language: LanguageCode;
  order: number;
  id?: string;
  proficiencyTier?: ProficiencyTier;
  title: string;
  culturalLandmark: string;
  subtitle: string;
  themeColor: string;
  cards: readonly VocabCard[];
  lessonMeta: readonly [
    MasteryLessonMeta,
    MasteryLessonMeta,
    MasteryLessonMeta,
    MasteryLessonMeta,
  ];
  clozes: readonly (Omit<ContextClozeParams, 'id'> & { id?: string })[];
  storyNodeTitle: string;
  storyNodeSubtitle: string;
  story: MasteryStorySpec;
  chestTitle: string;
  chestSubtitle: string;
  chestRewardVocabIds?: string[];
  bossNodeTitle: string;
  bossNodeSubtitle: string;
  boss: MasteryBossSpec;
  glossary: GlossaryMap;
}

export function compileMasteryUnit(spec: MasteryUnitSpec): CourseUnit {
  const { language, order, cards, glossary } = spec;
  const unitId = spec.id ?? `${language}-u${order}`;
  const tier = spec.proficiencyTier ?? resolveUnitProficiencyTier(order);
  const meta = LANGUAGE_META[language];
  const isSpaceless = !meta.usesSpaces;
  const enableFreeRecall = tier === 'B2' || tier === 'C1_C2';
  const rewards = MASTERY_REWARDS[tier];

  if (cards.length < 6) {
    throw new Error(`compileMasteryUnit("${unitId}"): needs at least 6 VocabCards`);
  }
  if (spec.clozes.length < 4) {
    throw new Error(`compileMasteryUnit("${unitId}"): needs at least 4 context clozes`);
  }

  const normalizedCards: VocabCard[] = cards.map((card) => ({
    ...card,
    proficiencyTier: card.proficiencyTier ?? tier,
  }));

  const seenCardEng = new Set<string>();
  const seenCardForeign = new Set<string>();
  const seenCardExamples = new Set<string>();
  for (const c of normalizedCards) {
    const fKey = c.foreignWithArticle.toLowerCase();
    const eKey = c.english.toLowerCase();
    const exKey = c.exampleForeign.toLowerCase();
    if (seenCardForeign.has(fKey)) {
      throw new Error(`compileMasteryUnit("${unitId}"): duplicate foreignWithArticle "${c.foreignWithArticle}"`);
    }
    if (seenCardEng.has(eKey)) {
      throw new Error(`compileMasteryUnit("${unitId}"): duplicate english "${c.english}"`);
    }
    if (seenCardExamples.has(exKey)) {
      throw new Error(`compileMasteryUnit("${unitId}"): duplicate exampleForeign "${c.exampleForeign}"`);
    }
    seenCardForeign.add(fKey);
    seenCardEng.add(eKey);
    seenCardExamples.add(exKey);
    if (language === 'en') {
      if (normalizeLookupKey(c.english) === normalizeLookupKey(c.bareForeign) ||
          normalizeLookupKey(c.english) === normalizeLookupKey(c.foreignWithArticle)) {
        throw new Error(`compileMasteryUnit("${unitId}"): English clue must differ on "${c.id}"`);
      }
      if (normalizeLookupKey(c.exampleEnglish) === normalizeLookupKey(c.exampleForeign)) {
        throw new Error(`compileMasteryUnit("${unitId}"): English example clue must differ on "${c.id}"`);
      }
    }
  }

  const lessonNodes: MapNode[] = [];
  const usedWbKeys = new Set<string>();
  const usedListenKeys = new Set<string>();

  for (let idx = 0; idx < 4; idx++) {
    const lMeta = spec.lessonMeta[idx];
    const nodeOrder = idx + 1;
    const nodeId = `${unitId}-n${nodeOrder}`;
    const cPrimary = normalizedCards[(idx * 2) % normalizedCards.length];
    const cSecondary = normalizedCards[(idx * 2 + 1) % normalizedCards.length];
    const extraDiscoveries =
      idx === 3 && normalizedCards.length > 8
        ? normalizedCards.slice(8).map((c, extraIdx) =>
            discovery(`${nodeId}-e${10 + extraIdx}`, c.id, c.registerNote ?? c.grammarNote)
          )
        : [];

    const clozeSpec = spec.clozes[idx];
    if (
      language === 'en' &&
      normalizeLookupKey(clozeSpec.englishTranslation) ===
        normalizeLookupKey(clozeSpec.fullForeignSentence)
    ) {
      throw new Error(
        `compileMasteryUnit("${unitId}"): English cloze clue must differ from fullForeignSentence`
      );
    }
    const clozeEx = contextCloze(
      {
        ...clozeSpec,
        id: clozeSpec.id ?? `${nodeId}-cloze`,
      },
      glossary
    );

    const useToEnglishWb = idx % 2 === 0;
    let wbEx: WordBankExercise;
    if (useToEnglishWb) {
      const targetTokens = segmentSentenceTokens(cPrimary.exampleEnglish);
      wbEx = wordBankToEn(
        {
          id: `${nodeId}-wb`,
          promptText: cPrimary.exampleForeign,
          promptPhonetic: cPrimary.examplePhonetic,
          ...(cPrimary.exampleRomanized ? { promptRomanized: cPrimary.exampleRomanized } : {}),
          expectedSentence: cPrimary.exampleEnglish,
          targetTokens,
          distractorTokens: pickEnglishDistractorsFromCards(
            normalizedCards,
            targetTokens,
            idx + 1
          ),
          ...(cPrimary.registerNote || cPrimary.grammarNote || lMeta.nuanceNote
            ? { nuanceNote: cPrimary.registerNote ?? cPrimary.grammarNote ?? lMeta.nuanceNote }
            : {}),
          ...(lMeta.registerTag ? { registerTag: lMeta.registerTag } : {}),
          ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
          vocabIds: [cPrimary.id],
        },
        glossary
      );
    } else {
      const targetTokens = segmentSentenceTokens(cPrimary.exampleForeign, glossary);
      if (isSpaceless && targetTokens.length < 2) {
        throw new Error(
          `compileMasteryUnit("${unitId}"): CJK wordBank "${cPrimary.exampleForeign}" segmented into < 2 tokens`
        );
      }
      wbEx = wordBankToForeign({
        id: `${nodeId}-wb`,
        promptText: cPrimary.exampleEnglish,
        expectedSentence: cPrimary.exampleForeign,
        ...(cPrimary.exampleRomanized ? { acceptedSentences: [cPrimary.exampleRomanized] } : {}),
        targetTokens,
        distractorTokens: pickForeignDistractorsFromCards(
          normalizedCards,
          targetTokens,
          glossary,
          idx + 2
        ),
        phoneticHint: cPrimary.examplePhonetic,
        ...(cPrimary.registerNote || cPrimary.grammarNote || lMeta.nuanceNote
          ? { nuanceNote: cPrimary.registerNote ?? cPrimary.grammarNote ?? lMeta.nuanceNote }
          : {}),
        ...(lMeta.registerTag ? { registerTag: lMeta.registerTag } : {}),
        ...(enableFreeRecall ? { allowFreeRecall: true } : {}),
        vocabIds: [cPrimary.id],
      });
    }

    const wbKey = `${wbEx.promptText.trim().toLowerCase()}||${wbEx.expectedSentence.trim().toLowerCase()}`;
    if (usedWbKeys.has(wbKey)) {
      throw new Error(`compileMasteryUnit("${unitId}"): duplicate WordBank key "${wbKey}"`);
    }
    usedWbKeys.add(wbKey);

    const useListenMeaning = idx % 2 === 0;
    let listenEx: ListenDecodeExercise;
    if (useListenMeaning) {
      const wordCount = segmentSentenceTokens(cSecondary.exampleForeign, glossary).length;
      const choices = pickDistinctEnglishChoices(
        normalizedCards,
        cSecondary.exampleEnglish,
        true,
        `${nodeId}-lm`
      );
      listenEx = listenMeaning(
        {
          id: `${nodeId}-ld`,
          audioText: cSecondary.exampleForeign,
          phonetic: cSecondary.examplePhonetic,
          ...(cSecondary.exampleRomanized ? { romanized: cSecondary.exampleRomanized } : {}),
          voiceFallbackPhoneticPrompt: `Syllables: ${cSecondary.examplePhonetic.replace(/\s+/g, ' • ')} (${wordCount} ${wordCount === 1 ? 'word' : 'words'})`,
          englishMeaning: cSecondary.exampleEnglish,
          choices,
          vocabIds: [cSecondary.id],
        },
        glossary
      );
    } else {
      const targetTokens = segmentSentenceTokens(cSecondary.exampleForeign, glossary);
      if (isSpaceless && targetTokens.length < 2) {
        throw new Error(
          `compileMasteryUnit("${unitId}"): CJK listenAssemble "${cSecondary.exampleForeign}" segmented into < 2 tokens`
        );
      }
      listenEx = listenAssemble(
        {
          id: `${nodeId}-ld`,
          audioText: cSecondary.exampleForeign,
          phonetic: cSecondary.examplePhonetic,
          ...(cSecondary.exampleRomanized ? { romanized: cSecondary.exampleRomanized } : {}),
          voiceFallbackPhoneticPrompt: `Syllables: ${cSecondary.examplePhonetic.replace(/\s+/g, ' • ')} (${targetTokens.length} ${targetTokens.length === 1 ? 'word' : 'words'})`,
          englishMeaning: cSecondary.exampleEnglish,
          targetTokens,
          distractorTokens: pickForeignDistractorsFromCards(
            normalizedCards,
            targetTokens,
            glossary,
            idx + 4
          ),
          vocabIds: [cSecondary.id],
        },
        glossary
      );
    }

    const listenKey = listenEx.audioText.trim().toLowerCase();
    if (usedListenKeys.has(listenKey)) {
      throw new Error(`compileMasteryUnit("${unitId}"): duplicate ListenDecode audio "${listenKey}"`);
    }
    usedListenKeys.add(listenKey);

    const pairCards: VocabCard[] = [];
    for (let step = 0; step < 5; step++) {
      pairCards.push(normalizedCards[(idx * 2 + step) % normalizedCards.length]);
    }
    const pairEx = pairMatchFromCards(
      `${nodeId}-pm`,
      `${spec.culturalLandmark} Match`,
      pairCards,
      45
    );

    const exercises: LessonExercise[] = [
      discovery(`${nodeId}-e1`, cPrimary.id, cPrimary.registerNote ?? cPrimary.grammarNote),
      discovery(`${nodeId}-e2`, cSecondary.id, cSecondary.registerNote ?? cSecondary.grammarNote),
      ...extraDiscoveries,
      clozeEx,
      wbEx,
      listenEx,
      pairEx,
    ];

    lessonNodes.push(
      lessonNode({
        id: nodeId,
        unitId,
        order: nodeOrder,
        proficiencyTier: tier,
        title: lMeta.title,
        subtitle: lMeta.subtitle,
        xpReward: rewards.lessonXp,
        gemReward: rewards.lessonGems,
        exercises,
        rewardVocabIds: [cPrimary.id, cSecondary.id],
      })
    );
  }

  const storyBubbles: StoryBubble[] = spec.story.bubbles.map((b, bIdx) => {
    const bubbleId = b.id ?? `${unitId}-st-b${bIdx + 1}`;
    if (b.tapHints && b.tapHints.length > 0) {
      return {
        id: bubbleId,
        speakerId: b.speakerId,
        speakerName: b.speakerName,
        side: b.side,
        foreignText: b.foreignText,
        englishText: b.englishText,
        phonetic: b.phonetic,
        ...(b.romanized ? { romanized: b.romanized } : {}),
        tapHints: b.tapHints,
      };
    }
    return makeBubble(
      {
        id: bubbleId,
        speakerId: b.speakerId,
        speakerName: b.speakerName,
        side: b.side,
        foreignText: b.foreignText,
        englishText: b.englishText,
        phonetic: b.phonetic,
        ...(b.romanized ? { romanized: b.romanized } : {}),
        ...(b.hintOverrides ? { hintOverrides: b.hintOverrides } : {}),
      },
      glossary
    );
  });

  const storyVocabIds = spec.story.vocabIds ?? normalizedCards.slice(0, 4).map((c) => c.id);
  const compiledStoryNode = storyNode({
    id: `${unitId}-n5`,
    unitId,
    order: 5,
    proficiencyTier: tier,
    title: spec.storyNodeTitle,
    subtitle: spec.storyNodeSubtitle,
    xpReward: rewards.storyXp,
    gemReward: rewards.storyGems,
    story: {
      id: spec.story.id ?? `${unitId}-story`,
      title: spec.story.title,
      settingSubtitle: spec.story.settingSubtitle,
      bubbles: storyBubbles,
      decisions: spec.story.decisions,
      vocabIds: storyVocabIds,
    },
    rewardVocabIds: storyVocabIds.slice(0, 3),
  });

  const compiledChestNode = chestNode({
    id: `${unitId}-n6`,
    unitId,
    order: 6,
    proficiencyTier: tier,
    title: spec.chestTitle,
    subtitle: spec.chestSubtitle,
    xpReward: rewards.chestXp,
    gemReward: rewards.chestGems,
    rewardVocabIds:
      spec.chestRewardVocabIds ?? normalizedCards.slice(0, 3).map((c) => c.id),
  });

  const bossTurns: BossTurn[] = spec.boss.turns.map((turn, tIdx) => {
    const turnId = turn.id ?? `${unitId}-b${tIdx + 1}`;
    const resolvedTokens =
      turn.mode === 'word_bank'
        ? turn.targetTokens ?? segmentSentenceTokens(turn.expectedAnswer, glossary)
        : turn.targetTokens;
    if (turn.mode === 'word_bank' && isSpaceless && (resolvedTokens?.length ?? 0) < 2) {
      throw new Error(
        `compileMasteryUnit("${unitId}"): CJK boss turn "${turn.expectedAnswer}" segmented into < 2 tokens`
      );
    }
    const resolvedDistractors =
      turn.mode === 'word_bank'
        ? turn.distractorTokens ??
          pickForeignDistractorsFromCards(
            normalizedCards,
            resolvedTokens ?? [],
            glossary,
            tIdx + 3
          )
        : turn.distractorTokens;

    return makeBossTurn(
      {
        id: turnId,
        companionSayForeign: turn.companionSayForeign,
        companionSayEnglish: turn.companionSayEnglish,
        companionPhonetic: turn.companionPhonetic,
        ...(turn.companionRomanized ? { companionRomanized: turn.companionRomanized } : {}),
        promptEnglish: turn.promptEnglish,
        mode: turn.mode,
        ...(turn.choices ? { choices: turn.choices } : {}),
        ...(resolvedTokens ? { targetTokens: resolvedTokens } : {}),
        ...(resolvedDistractors ? { distractorTokens: resolvedDistractors } : {}),
        expectedAnswer: turn.expectedAnswer,
        ...(turn.acceptedAnswers ? { acceptedAnswers: turn.acceptedAnswers } : {}),
        phoneticAnswer: turn.phoneticAnswer,
        ...(turn.romanizedAnswer ? { romanizedAnswer: turn.romanizedAnswer } : {}),
        victoryReplyForeign: turn.victoryReplyForeign,
        victoryReplyEnglish: turn.victoryReplyEnglish,
        ...(turn.nuanceNote ? { nuanceNote: turn.nuanceNote } : {}),
        ...(turn.registerTag ? { registerTag: turn.registerTag } : {}),
        ...(turn.mode === 'word_bank' && enableFreeRecall
          ? { allowFreeRecall: turn.allowFreeRecall ?? true }
          : turn.allowFreeRecall !== undefined
          ? { allowFreeRecall: turn.allowFreeRecall }
          : {}),
        ...(turn.hintOverrides ? { hintOverrides: turn.hintOverrides } : {}),
      },
      glossary
    );
  });

  const bossVocabIds = spec.boss.vocabIds ?? normalizedCards.map((c) => c.id);
  const compiledBossNode = bossNode({
    id: `${unitId}-n7`,
    unitId,
    order: 7,
    proficiencyTier: tier,
    title: spec.bossNodeTitle,
    subtitle: spec.bossNodeSubtitle,
    xpReward: rewards.bossXp,
    gemReward: rewards.bossGems,
    boss: {
      id: spec.boss.id ?? `${unitId}-boss`,
      companionId: meta.companionId,
      companionName: meta.companionName,
      title: spec.boss.title,
      introLine: spec.boss.introLine,
      turns: bossTurns,
      rewardChestGems: rewards.bossGems,
      vocabIds: bossVocabIds,
    },
    rewardVocabIds: bossVocabIds.slice(0, 3),
  });

  return {
    id: unitId,
    language,
    order,
    proficiencyTier: tier,
    title: spec.title,
    culturalLandmark: spec.culturalLandmark,
    subtitle: spec.subtitle,
    themeColor: spec.themeColor,
    vocabCards: normalizedCards,
    nodes: [...lessonNodes, compiledStoryNode, compiledChestNode, compiledBossNode],
  };
}

export function buildCourse(language: LanguageCode, units: CourseUnit[]): LanguageCourse {
  const vocabById: Record<string, VocabCard> = {};
  const normalizedUnits: CourseUnit[] = units.map((unit) => {
    const unitTier = unit.proficiencyTier ?? resolveUnitProficiencyTier(unit.order);
    const taggedCards: VocabCard[] = unit.vocabCards.map((card) => {
      const tagged = card.proficiencyTier ? card : { ...card, proficiencyTier: unitTier };
      if (vocabById[tagged.id]) {
        throw new Error(`Duplicate VocabCard id "${tagged.id}" in "${language}"`);
      }
      vocabById[tagged.id] = tagged;
      return tagged;
    });
    const taggedNodes: MapNode[] = unit.nodes.map((node) =>
      node.proficiencyTier ? node : { ...node, proficiencyTier: unitTier }
    );
    return {
      ...unit,
      proficiencyTier: unitTier,
      vocabCards: taggedCards,
      nodes: taggedNodes,
    };
  });

  return {
    language,
    meta: LANGUAGE_META[language],
    units: normalizedUnits,
    vocabById,
  };
}
