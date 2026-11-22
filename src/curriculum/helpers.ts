import { ILLUSTRATION_KEYS, LANGUAGE_META } from '../types/contracts';
import type {
  AccentCallout,
  BossGauntletExercise,
  BossTurn,
  CompanionId,
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
  };
}

export function lessonNode(params: {
  id: string;
  unitId: string;
  order: number;
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

export function buildCourse(language: LanguageCode, units: CourseUnit[]): LanguageCourse {
  const vocabById: Record<string, VocabCard> = {};
  for (const unit of units) {
    for (const card of unit.vocabCards) {
      if (vocabById[card.id]) {
        throw new Error(`Duplicate VocabCard id "${card.id}" in "${language}"`);
      }
      vocabById[card.id] = card;
    }
  }

  return {
    language,
    meta: LANGUAGE_META[language],
    units,
    vocabById,
  };
}
