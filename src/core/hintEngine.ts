import {
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_META,
  type FreeRecallToneCoaching,
  type HintTier,
  type LanguageCode,
} from '../types/contracts';
import {
  convertNumericPinyin,
  gradeAnswer,
  hasNumericPinyinSyllable,
  normalizeAnswer,
} from './grader';

export interface HintPoolTile {
  uid: string;
  label: string;
}

export interface TileSequenceHintInput {
  pool: readonly HintPoolTile[];
  targetTokens: readonly string[];
  expectedSentence?: string;
  acceptedSentences?: readonly string[];
  selectedTileUids: readonly string[];
  language: LanguageCode;
  seed: string;
  tier: 1 | 2 | 3;
}

export interface TileSequenceHintPlan {
  targetTokens: string[];
  validPrefixLength: number;
  misplacedTrayUids: string[];
  remainingTokens: string[];
  remainingBankUids: string[];
  dimmedBankUids: string[];
  spotlightUid: string | null;
  spotlightZone: 'bank' | 'tray' | null;
  alreadyComplete: boolean;
}

export type FreeRecallSlotState = 'matched' | 'revealed' | 'ghost' | 'masked';

export interface FreeRecallHintSlot {
  index: number;
  word: string;
  display: string;
  state: FreeRecallSlotState;
}

export interface FreeRecallHintInput {
  typedText: string;
  expected: string;
  accepted?: readonly string[];
  targetTokens?: readonly string[];
  language: LanguageCode;
  tier: 1 | 2 | 3;
  revealWordCount?: number;
}

export interface FreeRecallHintPlan {
  targetWords: string[];
  validWordPrefixCount: number;
  hasWrongSuffix: boolean;
  slots: FreeRecallHintSlot[];
  nextWord: string | null;
  alreadyComplete: boolean;
  isRomanizedMode?: boolean;
  toneCoaching?: FreeRecallToneCoaching;
}

export interface ChoiceHintInput {
  choices: readonly string[];
  expected: string;
  accepted?: readonly string[];
  language: LanguageCode;
  seed: string;
  tier: 1 | 2 | 3;
  selectedChoice?: string | null;
}

export interface ChoiceHintPlan {
  dimmedChoices: string[];
  spotlightChoice: string | null;
}

export interface PairMatchHintInput {
  leftIds: readonly string[];
  matchedIds: readonly string[];
  selectedLeftId?: string | null;
  selectedRightId?: string | null;
  tier: 1 | 2 | 3;
}

export interface PairMatchHintPlan {
  targetPairId: string | null;
  dimmedPairIds: string[];
  sustainSpotlight: boolean;
}

export interface FreeRecallBonusTierInfo {
  xp: number;
  gems: number;
  tag: string;
}

const EDGE_PUNCT_STRIP_RE =
  /^[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·\s]+|[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·\s]+$/g;
const LEADING_PUNCT_RE =
  /^[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+/;
const TRAILING_PUNCT_RE =
  /[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+$/;
const GRAPHEME_CLUSTER_RE = /\P{M}\p{M}*|./gu;

const NO_SPACE_AFTER_HINT_RE =
  /(?:[¡¿(«「『（」』），、。？！・-]$|(?:^|[\s¡¿(«“„\-])(?:c|d|j|l|m|n|s|t|v|qu|jusqu|lorsqu|puisqu|quelqu|presqu|aujourd|un|dell|all|dall|nell|sull|coll|pell|quest|quell|anch|ch|gl|bell|buon|sant|grand|pover|mezz|qualcos|nient|com|dov|cos|quant|tant|tutt|altr|molt|poc|senz|sott)['’]$)/i;
const NO_SPACE_BEFORE_HINT_RE = /^[.,!?;:)»。？！，、・「」『』（）؟،؛।॥]/;
const CJK_FULLWIDTH_HINT_RE =
  /[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF。？！，、；：・「」『』（）【】《》〈〉]/;
const NON_LATIN_SCRIPT_RE =
  /[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u0900-\u097F\u0980-\u09FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0400-\u04FF]/;
const LATIN_LETTER_RE = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
const TONE_COACHING_LATIN_LANGUAGES = new Set<LanguageCode>([
  'vi',
  'es',
  'fr',
  'de',
  'it',
  'pt',
]);

function isRomanizedText(text: string): boolean {
  return LATIN_LETTER_RE.test(text) && !NON_LATIN_SCRIPT_RE.test(text);
}

function stripOuterPunct(word: string): string {
  return word.trim().replace(EDGE_PUNCT_STRIP_RE, '');
}

function hasToneOrDiacritic(text: string): boolean {
  const nfd = text.normalize('NFD');
  return /[\u0300-\u036f]/.test(nfd) || /[đĐß\u02BE\u02BF]/.test(text);
}

function cleanExactWordForm(raw: string, collapseSpaces = false): string {
  const cleaned = stripOuterPunct(raw)
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC\u201B\u2032]/g, "'")
    .toLowerCase()
    .replace(/['\-]/g, '');
  return collapseSpaces ? cleaned.replace(/\s+/g, '') : cleaned;
}

function buildFreeRecallToneTip(
  language: LanguageCode,
  expectedWord: string,
  typedWord: string
): string {
  if (!hasToneOrDiacritic(expectedWord)) {
    return `Watch the tone marks: "${expectedWord}" uses plain letters (you typed "${typedWord}").`;
  }
  switch (language) {
    case 'zh':
      return `Tone tip: "${expectedWord}" uses Pinyin tone marks (you typed "${typedWord}") — keep going!`;
    case 'ja':
      return `Vowel tip: "${expectedWord}" uses a long-vowel macron (you typed "${typedWord}").`;
    case 'vi':
      return `Tone tip: "${expectedWord}" has a Vietnamese tone mark (you typed "${typedWord}").`;
    case 'hi':
    case 'bn':
    case 'ar':
    case 'arz':
      return `Romanization tip: "${expectedWord}" includes vowel/letter marks (you typed "${typedWord}").`;
    default:
      return `Accent tip: "${expectedWord}" includes an accent mark (you typed "${typedWord}").`;
  }
}

const PARTIAL_NUMERIC_PINYIN_TOKEN_RE = /(?:[A-Za-z\u00C0-\u024F\u1E00-\u1EFF0-9]|(?<=[uU]):)+/g;
const PARTIAL_NUMERIC_PINYIN_TAIL_RE = /^(.+[0-5])([A-Za-z]+)$/;
const PINYIN_COMPACT_STRIP_RE = /[\s'’‘\-¡!¿?.,;:"“”„«»()[\]—–―…]+/g;
const PINYIN_SEPARATOR_CHAR_RE = /[\s'’‘\-¡!¿?.,;:"“”„«»()[\]—–―…]/;
const PINYIN_TONE_VOWEL_CHAR_RE = /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

function convertNumericPinyinWithPartialTail(raw: string): string {
  const converted = convertNumericPinyin(raw);
  return converted.replace(PARTIAL_NUMERIC_PINYIN_TOKEN_RE, (token) => {
    if (!/[0-5]/.test(token)) return token;
    const partialSplit = PARTIAL_NUMERIC_PINYIN_TAIL_RE.exec(token);
    if (partialSplit && hasNumericPinyinSyllable(partialSplit[1])) {
      return `${convertNumericPinyin(partialSplit[1])}${partialSplit[2]}`;
    }
    return token;
  });
}

function stripPinyinPunctAndSpaces(text: string): string {
  return text.replace(PINYIN_COMPACT_STRIP_RE, '');
}

/**
 * Normalizes a romanized (Pinyin / Romaji) word for prefix comparison by stripping
 * NFD combining tone/macron marks and internal apostrophes or hyphens.
 */
function cleanCompareRomanizedWord(raw: string, language?: LanguageCode): string {
  const preNormalized =
    language === 'zh'
      ? convertNumericPinyinWithPartialTail(raw)
          .replace(/u:/gi, 'ü')
          .replace(/([nl])v/gi, '$1ü')
      : raw;
  const norm = normalizeAnswer(preNormalized, { stripAccents: true });
  const base = norm || preNormalized.trim().toLowerCase();
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .replace(/['’‘\-]/g, '')
    .replace(EDGE_PUNCT_STRIP_RE, '');
}

function joinTokensForHint(tokens: readonly string[]): string {
  let out = '';
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    if (!out) {
      out = token;
      continue;
    }
    const prevLast = out.slice(-1);
    const nextFirst = token[0];
    const prevEndsNoSpace = NO_SPACE_AFTER_HINT_RE.test(out);
    const nextStartsPunct = NO_SPACE_BEFORE_HINT_RE.test(token);
    const adjacentCjk =
      CJK_FULLWIDTH_HINT_RE.test(prevLast) && CJK_FULLWIDTH_HINT_RE.test(nextFirst);
    out += prevEndsNoSpace || nextStartsPunct || adjacentCjk ? token : ` ${token}`;
  }
  return out;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicSortBySeed<T>(items: readonly T[], seed: string, keyOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ha = hashSeed(`${seed}::${keyOf(a)}`);
    const hb = hashSeed(`${seed}::${keyOf(b)}`);
    if (ha !== hb) return ha - hb;
    return keyOf(a).localeCompare(keyOf(b));
  });
}

function normalizeToken(raw: string): string {
  const unified = raw
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC\u201B\u2032]/g, "'")
    .toLowerCase()
    .trim();
  const stripped = unified.replace(EDGE_PUNCT_STRIP_RE, '');
  return stripped || unified;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  return na.length > 0 && na === nb;
}

function cleanCompareWord(raw: string, language: LanguageCode): string {
  const norm = normalizeAnswer(raw, { stripAccents: true });
  if (norm) return norm;
  if (!LANGUAGE_META[language].usesSpaces) {
    return raw.trim().replace(EDGE_PUNCT_STRIP_RE, '').toLowerCase();
  }
  return raw.trim().toLowerCase();
}

function claimPoolUidsForTokens(
  tokens: readonly string[],
  availableTiles: readonly HintPoolTile[]
): string[] | null {
  const used = new Set<string>();
  const claimed: string[] = [];

  for (const tok of tokens) {
    let found = availableTiles.find((t) => !used.has(t.uid) && t.label === tok);
    if (!found) {
      found = availableTiles.find((t) => !used.has(t.uid) && tokensMatch(t.label, tok));
    }
    if (!found) return null;
    used.add(found.uid);
    claimed.push(found.uid);
  }

  return claimed;
}

function matchSentenceToPoolTokens(
  sentence: string,
  pool: readonly HintPoolTile[],
  language: LanguageCode
): string[] | null {
  const trimmed = sentence.trim();
  if (!trimmed) return null;

  const wsTokens = trimmed.split(/\s+/).filter(Boolean);
  if (wsTokens.length > 0) {
    const matchedWs = claimPoolUidsForTokens(wsTokens, pool);
    if (matchedWs) {
      const byUid = new Map(pool.map((p) => [p.uid, p.label]));
      return matchedWs.map((uid) => byUid.get(uid) ?? '').filter(Boolean);
    }
  }

  // Fallback for spaceless scripts (CJK) or punctuation-merged accepted phrasing
  const compactTarget = normalizeToken(trimmed).replace(/\s+/g, '');
  if (!compactTarget) return null;

  const normalizedPool = pool
    .map((tile) => ({
      uid: tile.uid,
      label: tile.label,
      clean: normalizeToken(tile.label).replace(/\s+/g, ''),
    }))
    .filter((t) => t.clean.length > 0);

  const used = new Set<string>();
  const chosenLabels: string[] = [];

  const dfs = (offset: number): boolean => {
    if (offset >= compactTarget.length) return true;
    const candidates = normalizedPool
      .filter((t) => !used.has(t.uid) && compactTarget.startsWith(t.clean, offset))
      .sort((a, b) => b.clean.length - a.clean.length);

    for (const cand of candidates) {
      used.add(cand.uid);
      chosenLabels.push(cand.label);
      if (dfs(offset + cand.clean.length)) return true;
      chosenLabels.pop();
      used.delete(cand.uid);
    }
    return false;
  };

  if (dfs(0) && chosenLabels.length > 0) {
    // Double-check against language grader so partial subsets cannot pass as full alternates
    const joined = joinTokensForHint(chosenLabels);
    const check = gradeAnswer({
      submitted: joined,
      expected: trimmed,
      accepted: [trimmed],
      language,
    });
    if (check.isCorrect || normalizeToken(joined).replace(/\s+/g, '') === compactTarget) {
      return chosenLabels;
    }
  }

  return null;
}

export function resolveTileSequenceHint(input: TileSequenceHintInput): TileSequenceHintPlan {
  const {
    pool,
    targetTokens,
    expectedSentence,
    acceptedSentences = [],
    selectedTileUids,
    language,
    seed,
    tier,
  } = input;

  const byUid = new Map(pool.map((tile) => [tile.uid, tile]));
  const canonicalTokens = [...targetTokens];
  const candidateSequences: string[][] = [canonicalTokens];
  const seenSignatures = new Set<string>([canonicalTokens.map(normalizeToken).join('|')]);

  const canonicalJoined = expectedSentence?.trim() || joinTokensForHint(canonicalTokens);
  for (const accepted of acceptedSentences) {
    const matched = matchSentenceToPoolTokens(accepted, pool, language);
    if (!matched || matched.length === 0) continue;
    const sig = matched.map(normalizeToken).join('|');
    if (seenSignatures.has(sig)) continue;
    const gradeCheck = gradeAnswer({
      submitted: joinTokensForHint(matched),
      expected: canonicalJoined,
      accepted: acceptedSentences,
      language,
    });
    if (gradeCheck.isCorrect) {
      seenSignatures.add(sig);
      candidateSequences.push(matched);
    }
  }

  const placedTiles = selectedTileUids
    .map((uid) => byUid.get(uid))
    .filter((tile): tile is HintPoolTile => Boolean(tile));

  let bestCandidate = canonicalTokens;
  let bestPrefixLen = -1;

  for (const cand of candidateSequences) {
    let rawPrefixLen = 0;
    const limit = Math.min(placedTiles.length, cand.length);
    while (rawPrefixLen < limit && tokensMatch(placedTiles[rawPrefixLen].label, cand[rawPrefixLen])) {
      rawPrefixLen += 1;
    }

    // Ensure the suffix from rawPrefixLen onward is still achievable from remaining pool tiles
    let validPrefixLen = rawPrefixLen;
    while (validPrefixLen > 0) {
      const prefixUidSet = new Set(placedTiles.slice(0, validPrefixLen).map((t) => t.uid));
      const nonPrefixPool = pool.filter((t) => !prefixUidSet.has(t.uid));
      if (claimPoolUidsForTokens(cand.slice(validPrefixLen), nonPrefixPool) !== null) {
        break;
      }
      validPrefixLen -= 1;
    }

    if (validPrefixLen > bestPrefixLen) {
      bestPrefixLen = validPrefixLen;
      bestCandidate = cand;
    }
  }

  const validPrefixLength = Math.max(0, bestPrefixLen);
  const misplacedTrayUids = placedTiles.slice(validPrefixLength).map((t) => t.uid);
  const remainingTokens = bestCandidate.slice(validPrefixLength);

  const selectedSet = new Set(placedTiles.map((t) => t.uid));
  const availableBankPool = pool.filter((t) => !selectedSet.has(t.uid));

  // Claim available bank tiles for each remaining required token in exact order
  const claimedBankSet = new Set<string>();
  const remainingBankUids: string[] = [];
  const unmatchedNeededNorms = new Set<string>();

  for (const tok of remainingTokens) {
    let match = availableBankPool.find((t) => !claimedBankSet.has(t.uid) && t.label === tok);
    if (!match) {
      match = availableBankPool.find(
        (t) => !claimedBankSet.has(t.uid) && tokensMatch(t.label, tok)
      );
    }
    if (match) {
      claimedBankSet.add(match.uid);
      remainingBankUids.push(match.uid);
    } else {
      unmatchedNeededNorms.add(normalizeToken(tok));
    }
  }

  const distractorPoolUids = availableBankPool
    .filter((t) => !claimedBankSet.has(t.uid) && !unmatchedNeededNorms.has(normalizeToken(t.label)))
    .map((t) => t.uid);

  const dimmedCount =
    tier >= 2 && distractorPoolUids.length > 0
      ? distractorPoolUids.length >= 3
        ? 2
        : 1
      : 0;
  const dimmedBankUids =
    dimmedCount > 0
      ? deterministicSortBySeed(distractorPoolUids, `${seed}:dim`, (uid) => uid).slice(
          0,
          dimmedCount
        )
      : [];

  const spotlightUid =
    tier >= 3 ? (remainingBankUids[0] ?? misplacedTrayUids[0] ?? null) : null;
  const spotlightZone = spotlightUid
    ? remainingBankUids[0]
      ? 'bank'
      : 'tray'
    : null;

  const alreadyComplete =
    misplacedTrayUids.length === 0 &&
    remainingTokens.length === 0 &&
    placedTiles.length > 0;

  return {
    targetTokens: bestCandidate,
    validPrefixLength,
    misplacedTrayUids,
    remainingTokens,
    remainingBankUids,
    dimmedBankUids,
    spotlightUid,
    spotlightZone,
    alreadyComplete,
  };
}

function splitGraphemes(text: string): string[] {
  return text.match(GRAPHEME_CLUSTER_RE) ?? Array.from(text);
}

function maskHintWord(word: string, showOpeningChar: boolean): string {
  const leadMatch = word.match(LEADING_PUNCT_RE);
  const leading = leadMatch ? leadMatch[0] : '';
  const afterLead = word.slice(leading.length);
  const trailMatch = afterLead.match(TRAILING_PUNCT_RE);
  const trailing = trailMatch ? trailMatch[0] : '';
  const body = afterLead.slice(0, afterLead.length - trailing.length);

  if (!body) return word;
  const graphemes = splitGraphemes(body);
  if (graphemes.length === 1) {
    return `${leading}${showOpeningChar && word.length > 1 ? graphemes[0] : '_'}${trailing}`;
  }
  const visibleUnderscores = Math.min(6, Math.max(1, graphemes.length - 1));
  if (showOpeningChar) {
    return `${leading}${graphemes[0]}${'_'.repeat(visibleUnderscores)}${trailing}`;
  }
  return `${leading}${'_'.repeat(Math.min(7, graphemes.length))}${trailing}`;
}

function tokenizeSentenceForFreeRecall(
  sentence: string,
  language: LanguageCode,
  targetTokens?: readonly string[]
): string[] {
  const trimmed = sentence.trim();
  if (!trimmed) return [];
  if (!LANGUAGE_META[language].usesSpaces) {
    if (isRomanizedText(trimmed)) {
      return trimmed.split(/\s+/).filter(Boolean);
    }
    if (targetTokens && targetTokens.length > 0) {
      const joinedClean = targetTokens.join('').replace(/\s+/g, '');
      const rawClean = trimmed.replace(EDGE_PUNCT_STRIP_RE, '').replace(/\s+/g, '');
      if (joinedClean === rawClean || normalizeToken(joinedClean) === normalizeToken(rawClean)) {
        return [...targetTokens];
      }
    }
    const ws = trimmed.split(/\s+/).filter(Boolean);
    if (ws.length > 1) return ws;
    return splitGraphemes(trimmed).filter((ch) => ch.trim().length > 0);
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

/**
 * Slices a spaced or unspaced Mandarin Pinyin input string into per-word chunks
 * aligned with `words.slice(0, completedCount)` plus an optional active partial tail.
 */
function sliceZhPinyinInputForWords(
  trimmedInput: string,
  words: readonly string[],
  completedCount: number,
  includePartial: boolean
): { chunks: string[]; partialChunk?: string } {
  const src = trimmedInput.normalize('NFC');
  let cursor = 0;
  const chunks: string[] = [];

  const skipSeparators = () => {
    while (cursor < src.length && PINYIN_SEPARATOR_CHAR_RE.test(src[cursor])) {
      cursor += 1;
    }
  };

  for (let i = 0; i < completedCount && i < words.length; i += 1) {
    skipSeparators();
    const targetLen = stripPinyinPunctAndSpaces(cleanCompareRomanizedWord(words[i], 'zh')).length;
    if (targetLen === 0) {
      chunks.push('');
      continue;
    }
    const chunkStart = cursor;
    let chunkEnd = cursor;
    let collectedBase = 0;

    while (cursor < src.length && collectedBase < targetLen) {
      if ((src[cursor] === 'u' || src[cursor] === 'U') && src[cursor + 1] === ':') {
        collectedBase += 1;
        cursor += 2;
        chunkEnd = cursor;
        continue;
      }
      const ch = src[cursor];
      if (/[0-5]/.test(ch)) {
        cursor += 1;
        chunkEnd = cursor;
      } else if (PINYIN_SEPARATOR_CHAR_RE.test(ch)) {
        cursor += 1;
      } else {
        collectedBase += 1;
        cursor += 1;
        chunkEnd = cursor;
      }
    }

    while (cursor < src.length && /[0-5]/.test(src[cursor])) {
      cursor += 1;
      chunkEnd = cursor;
    }
    chunks.push(src.slice(chunkStart, chunkEnd).trim());
  }

  if (!includePartial) {
    return { chunks };
  }
  skipSeparators();
  const partial = src.slice(cursor).trim();
  return partial ? { chunks, partialChunk: partial } : { chunks };
}

function isIncompleteTrailingZhSyllable(
  partialRaw: string,
  comparablePartial: string,
  alignedSlice: string
): boolean {
  if (/[0-5]$/.test(partialRaw)) return false;
  const alignedChars = Array.from(cleanExactWordForm(alignedSlice, true));
  const compChars = Array.from(cleanExactWordForm(comparablePartial, true));
  if (alignedChars.length === 0 || alignedChars.length !== compChars.length) return false;

  let lastVowelIdx = -1;
  for (let i = 0; i < alignedChars.length; i += 1) {
    if (PINYIN_TONE_VOWEL_CHAR_RE.test(alignedChars[i])) {
      lastVowelIdx = i;
    }
  }
  if (lastVowelIdx < 0) return false;

  for (let i = 0; i < alignedChars.length; i += 1) {
    if (alignedChars[i] !== compChars[i] && i < lastVowelIdx) {
      return false;
    }
  }
  return true;
}

function resolveFreeRecallToneCoaching(params: {
  language: LanguageCode;
  typedText: string;
  typedWords: readonly string[];
  bestWords: readonly string[];
  completedPrefixCount: number;
  hasActivePartial: boolean;
  hasWrongSuffix: boolean;
  isRomanizedMode: boolean;
  compareWord: (w: string) => string;
}): FreeRecallToneCoaching | undefined {
  const {
    language,
    typedText,
    typedWords,
    bestWords,
    completedPrefixCount,
    hasActivePartial,
    hasWrongSuffix,
    isRomanizedMode,
    compareWord,
  } = params;

  if (hasWrongSuffix || typedWords.length === 0) return undefined;
  if (!isRomanizedMode && !TONE_COACHING_LATIN_LANGUAGES.has(language)) return undefined;

  const isZhRomanized = language === 'zh' && isRomanizedMode;
  const trimmedInput = typedText.trim();
  const convertedWithPartial = isZhRomanized
    ? convertNumericPinyinWithPartialTail(trimmedInput)
    : trimmedInput;
  const hasNumericPinyin =
    isZhRomanized &&
    (hasNumericPinyinSyllable(trimmedInput) || convertedWithPartial !== trimmedInput);
  const convertedNumericPinyin = hasNumericPinyin ? convertedWithPartial : undefined;

  const slicedZh = isZhRomanized
    ? sliceZhPinyinInputForWords(trimmedInput, bestWords, completedPrefixCount, hasActivePartial)
    : null;

  let mismatchedPair: { expectedWord: string; typedWord: string } | null = null;
  let lastNumericPair: { expectedWord: string; typedWord: string } | null = null;

  for (let i = 0; i < completedPrefixCount; i += 1) {
    const rawTypedWord = slicedZh ? slicedZh.chunks[i] : typedWords[i];
    if (!rawTypedWord) continue;
    const typedDisplay = stripOuterPunct(rawTypedWord) || rawTypedWord.trim();
    const expectedDisplay = stripOuterPunct(bestWords[i]) || bestWords[i].trim();
    const convertedChunk = isZhRomanized
      ? convertNumericPinyinWithPartialTail(typedDisplay)
      : typedDisplay;
    const chunkHasNumeric =
      hasNumericPinyin && (hasNumericPinyinSyllable(typedDisplay) || convertedChunk !== typedDisplay);
    const comparableTyped = chunkHasNumeric ? convertedChunk : typedDisplay;
    if (chunkHasNumeric) {
      lastNumericPair = { expectedWord: expectedDisplay, typedWord: typedDisplay };
    }
    if (
      (hasToneOrDiacritic(expectedDisplay) || hasToneOrDiacritic(comparableTyped)) &&
      cleanExactWordForm(comparableTyped, isZhRomanized) !==
        cleanExactWordForm(expectedDisplay, isZhRomanized)
    ) {
      mismatchedPair = { expectedWord: expectedDisplay, typedWord: typedDisplay };
    }
  }

  const rawPartialTyped = slicedZh ? slicedZh.partialChunk : typedWords[completedPrefixCount];
  if (hasActivePartial && completedPrefixCount < bestWords.length && rawPartialTyped) {
    const typedDisplay = stripOuterPunct(rawPartialTyped) || rawPartialTyped.trim();
    const expectedDisplay =
      stripOuterPunct(bestWords[completedPrefixCount]) || bestWords[completedPrefixCount].trim();
    const convertedChunk = isZhRomanized
      ? convertNumericPinyinWithPartialTail(typedDisplay)
      : typedDisplay;
    const chunkHasNumeric =
      hasNumericPinyin && (hasNumericPinyinSyllable(typedDisplay) || convertedChunk !== typedDisplay);
    const comparableTyped = chunkHasNumeric ? convertedChunk : typedDisplay;
    if (chunkHasNumeric) {
      lastNumericPair = { expectedWord: expectedDisplay, typedWord: typedDisplay };
    }
    const targetChars = splitGraphemes(expectedDisplay).filter((g) => !/['’‘\-]/.test(g));
    const typedStrippedLen = stripPinyinPunctAndSpaces(
      compareWord(typedDisplay).replace(/['’‘\-]/g, '')
    ).length;
    if (typedStrippedLen > 0) {
      let alignedSlice = '';
      for (const g of targetChars) {
        if (
          stripPinyinPunctAndSpaces(compareWord(alignedSlice).replace(/['’‘\-]/g, '')).length >=
          typedStrippedLen
        ) {
          break;
        }
        alignedSlice += g;
      }
      if (
        alignedSlice &&
        (hasToneOrDiacritic(alignedSlice) || hasToneOrDiacritic(comparableTyped)) &&
        cleanExactWordForm(comparableTyped, isZhRomanized) !==
          cleanExactWordForm(alignedSlice, isZhRomanized)
      ) {
        const deferPartialTip =
          isZhRomanized &&
          hasNumericPinyin &&
          isIncompleteTrailingZhSyllable(typedDisplay, comparableTyped, alignedSlice);
        if (!deferPartialTip) {
          mismatchedPair = { expectedWord: expectedDisplay, typedWord: typedDisplay };
        }
      }
    }
  }

  if (mismatchedPair) {
    const convertedWord = isZhRomanized
      ? convertNumericPinyinWithPartialTail(mismatchedPair.typedWord)
      : mismatchedPair.typedWord;
    const tip =
      convertedWord !== mismatchedPair.typedWord
        ? `Tone tip: "${mismatchedPair.expectedWord}" uses Pinyin tone marks (your "${mismatchedPair.typedWord}" -> "${convertedWord}") — keep going!`
        : buildFreeRecallToneTip(
            language,
            mismatchedPair.expectedWord,
            mismatchedPair.typedWord
          );
    return {
      hasToneMismatch: true,
      expectedWord: mismatchedPair.expectedWord,
      typedWord: mismatchedPair.typedWord,
      ...(convertedNumericPinyin ? { convertedNumericPinyin } : {}),
      tip,
    };
  }

  if (hasNumericPinyin && convertedNumericPinyin) {
    const matchedPair = lastNumericPair ?? {
      expectedWord: stripOuterPunct(bestWords[0] ?? '') || (bestWords[0] ?? ''),
      typedWord: stripOuterPunct(typedWords[0] ?? '') || trimmedInput,
    };
    return {
      hasToneMismatch: false,
      expectedWord: matchedPair.expectedWord,
      typedWord: matchedPair.typedWord,
      convertedNumericPinyin,
      tip: `Tone numbers converted: "${convertedNumericPinyin}"!`,
    };
  }

  return undefined;
}

interface CandidateWordEntry {
  words: string[];
  isSplitVariant: boolean;
  hasDiacritics: boolean;
}

/**
 * Expands a Latin/romanized candidate into space-delimited word forms, plus a
 * syllable-split variant when apostrophes or hyphens appear (e.g. "Wǎn'ān").
 */
function buildRomanizedCandidateWordLists(candidate: string): CandidateWordEntry[] {
  const baseWords = candidate
    .trim()
    .split(/\s+/)
    .filter((w) => cleanCompareRomanizedWord(w).length > 0);
  const hasDiacritics = hasToneOrDiacritic(candidate);
  const variants: CandidateWordEntry[] =
    baseWords.length > 0 ? [{ words: baseWords, isSplitVariant: false, hasDiacritics }] : [];
  if (/['’‘\-]/.test(candidate)) {
    const splitWords = candidate
      .trim()
      .replace(/['’‘\-]+/g, ' ')
      .split(/\s+/)
      .filter((w) => cleanCompareRomanizedWord(w).length > 0);
    if (splitWords.length > baseWords.length) {
      variants.push({ words: splitWords, isSplitVariant: true, hasDiacritics });
    }
  }
  return variants;
}

export function resolveFreeRecallHint(input: FreeRecallHintInput): FreeRecallHintPlan {
  const {
    typedText,
    expected,
    accepted = [],
    targetTokens,
    language,
    tier,
    revealWordCount = tier >= 3 ? 1 : 0,
  } = input;

  const rawCandidates = [expected, ...accepted].filter((s) => s.trim().length > 0);
  const uniqueCandidates: string[] = [];
  const seenCand = new Set<string>();
  for (const cand of rawCandidates) {
    const key = cand.trim().toLowerCase();
    if (!seenCand.has(key)) {
      seenCand.add(key);
      uniqueCandidates.push(cand.trim());
    }
  }
  if (uniqueCandidates.length === 0) {
    uniqueCandidates.push('');
  }

  const langMeta = LANGUAGE_META[language];
  const usesSpaces = langMeta.usesSpaces;
  const isNonLatinCourse = langMeta.scriptType !== 'latin';
  const trimmedTyped = typedText.trim();
  const endsWithSpace = /\s$/.test(typedText);
  const isRomanizedTyped =
    isNonLatinCourse && trimmedTyped.length > 0 && isRomanizedText(trimmedTyped);

  const typedWords = trimmedTyped
    ? usesSpaces || isRomanizedTyped
      ? trimmedTyped.split(/\s+/).filter(Boolean)
      : splitGraphemes(trimmedTyped).filter((c) => c.trim().length > 0)
    : [];

  const romanizedCandidates = isRomanizedTyped
    ? uniqueCandidates.filter(isRomanizedText)
    : [];
  const isRomanizedMode = isRomanizedTyped && romanizedCandidates.length > 0;
  const candidatesToEvaluate = isRomanizedMode ? romanizedCandidates : uniqueCandidates;

  const candidateWordLists: CandidateWordEntry[] = [];
  if (isRomanizedMode) {
    for (const cand of candidatesToEvaluate) {
      candidateWordLists.push(...buildRomanizedCandidateWordLists(cand));
    }
  } else {
    for (const cand of candidatesToEvaluate) {
      candidateWordLists.push({
        words: tokenizeSentenceForFreeRecall(
          cand,
          language,
          cand === expected.trim() ? targetTokens : undefined
        ),
        isSplitVariant: false,
        hasDiacritics: hasToneOrDiacritic(cand),
      });
    }
  }

  const compareWord = isRomanizedMode
    ? (w: string) => cleanCompareRomanizedWord(w, language)
    : (w: string) => cleanCompareWord(w, language);

  let bestWords = candidateWordLists[0]?.words ?? [];
  let bestPrefixCount = -1;
  let bestHasWrongSuffix = false;
  let bestHasActivePartial = false;
  let bestHasDiacritics = false;
  let bestExactPrefixMatches = -1;
  let bestIsSplitVariant = false;
  let bestStrippedSig = '';

  for (const entry of candidateWordLists) {
    const candWords = entry.words;
    let prefix = 0;
    const maxLen = Math.min(typedWords.length, candWords.length);
    while (prefix < maxLen) {
      const tw = compareWord(typedWords[prefix]);
      const cw = compareWord(candWords[prefix]);
      if (tw.length > 0 && tw === cw) {
        prefix += 1;
      } else {
        break;
      }
    }

    let wrongSuffix = false;
    let hasActivePartial = false;
    if (typedWords.length > prefix) {
      if (prefix >= candWords.length) {
        wrongSuffix = true;
      } else if (typedWords.length > prefix + 1 || endsWithSpace) {
        wrongSuffix = true;
      } else {
        // Active final partial word: tolerate a valid prefix of the next expected word
        const activeTyped = compareWord(typedWords[prefix]);
        const nextExpected = compareWord(candWords[prefix]);
        if (!activeTyped || !nextExpected.startsWith(activeTyped)) {
          wrongSuffix = true;
        } else {
          hasActivePartial = true;
        }
      }
    }

    let usedCompactZhAlignment = false;
    if (language === 'zh' && isRomanizedMode && wrongSuffix && !entry.isSplitVariant) {
      const remainingTypedCompact = typedWords
        .slice(prefix)
        .map((w) => stripPinyinPunctAndSpaces(compareWord(w)))
        .join('');
      if (remainingTypedCompact.length > 0) {
        let streamPrefix = prefix;
        let offset = 0;
        let streamHasPartial = false;
        let streamWrong = false;

        for (let wi = prefix; wi < candWords.length && offset < remainingTypedCompact.length; wi += 1) {
          const cw = stripPinyinPunctAndSpaces(compareWord(candWords[wi]));
          if (!cw) {
            streamPrefix = wi + 1;
            continue;
          }
          const rem = remainingTypedCompact.slice(offset);
          if (rem.startsWith(cw)) {
            offset += cw.length;
            streamPrefix = wi + 1;
          } else if (cw.startsWith(rem)) {
            streamHasPartial = true;
            offset = remainingTypedCompact.length;
            break;
          } else {
            streamWrong = true;
            break;
          }
        }

        if (!streamWrong && offset < remainingTypedCompact.length) {
          streamWrong = true;
        }

        if (!streamWrong) {
          prefix = streamPrefix;
          wrongSuffix = false;
          hasActivePartial = streamHasPartial;
          usedCompactZhAlignment = true;
        } else if (streamPrefix > prefix) {
          prefix = streamPrefix;
          wrongSuffix = true;
          hasActivePartial = false;
          usedCompactZhAlignment = true;
        }
      }
    }

    let exactPrefixMatches = 0;
    const zhChunks =
      usedCompactZhAlignment && prefix > 0
        ? sliceZhPinyinInputForWords(trimmedTyped, candWords, prefix, false).chunks
        : null;
    for (let i = 0; i < prefix; i += 1) {
      const rawTypedWord = zhChunks ? zhChunks[i] : typedWords[i];
      if (!rawTypedWord) continue;
      const typedForExact =
        language === 'zh' && isRomanizedMode
          ? convertNumericPinyinWithPartialTail(rawTypedWord)
          : rawTypedWord;
      if (
        cleanExactWordForm(typedForExact, language === 'zh' && isRomanizedMode) ===
        cleanExactWordForm(candWords[i], language === 'zh' && isRomanizedMode)
      ) {
        exactPrefixMatches += 1;
      }
    }
    const strippedSig = candWords.map((w) => compareWord(w)).join(' ');

    const score = prefix * 2 + (wrongSuffix ? 0 : 1);
    const bestScore = bestPrefixCount * 2 + (bestHasWrongSuffix ? 0 : 1);
    let shouldReplace = bestPrefixCount < 0 || score > bestScore;
    if (!shouldReplace && score === bestScore) {
      const sameStrippedDomain = isRomanizedMode || strippedSig === bestStrippedSig;
      if (sameStrippedDomain && entry.hasDiacritics !== bestHasDiacritics) {
        shouldReplace = entry.hasDiacritics;
      } else if (exactPrefixMatches !== bestExactPrefixMatches) {
        shouldReplace = exactPrefixMatches > bestExactPrefixMatches;
      } else if (entry.isSplitVariant !== bestIsSplitVariant) {
        shouldReplace = !entry.isSplitVariant;
      }
    }

    if (shouldReplace) {
      bestPrefixCount = prefix;
      bestHasWrongSuffix = wrongSuffix;
      bestHasActivePartial = hasActivePartial;
      bestWords = candWords;
      bestHasDiacritics = entry.hasDiacritics;
      bestExactPrefixMatches = exactPrefixMatches;
      bestIsSplitVariant = entry.isSplitVariant;
      bestStrippedSig = strippedSig;
    }
  }

  const completedPrefixCount = Math.max(0, bestPrefixCount);
  // Count a valid active romanized opening prefix (e.g. "Ma" -> "Mǎtè'ào", "Oya" -> "oyasumi")
  // as progress without prematurely marking its uncompleted slot as matched or complete.
  const validWordPrefixCount =
    isRomanizedMode && completedPrefixCount === 0 && bestHasActivePartial
      ? 1
      : completedPrefixCount;
  const remainingCount = Math.max(0, bestWords.length - completedPrefixCount);
  const resolvedReveals = tier >= 3 ? Math.max(1, revealWordCount) : 0;

  const slots: FreeRecallHintSlot[] = bestWords.map((word, index) => {
    if (index < completedPrefixCount) {
      return { index, word, display: word, state: 'matched' };
    }
    const remIdx = index - completedPrefixCount;
    if (tier >= 3 && remIdx < resolvedReveals) {
      return { index, word, display: word, state: 'revealed' };
    }
    if (tier === 2 && remIdx === 0) {
      return { index, word, display: word, state: 'ghost' };
    }
    const showOpening =
      tier >= 2
        ? true
        : remIdx < 2 && (splitGraphemes(word.replace(EDGE_PUNCT_STRIP_RE, '')).length >= 2 || remainingCount === 1);
    return {
      index,
      word,
      display: maskHintWord(word, showOpening),
      state: 'masked',
    };
  });

  const toneCoaching = resolveFreeRecallToneCoaching({
    language,
    typedText,
    typedWords,
    bestWords,
    completedPrefixCount,
    hasActivePartial: bestHasActivePartial,
    hasWrongSuffix: bestHasWrongSuffix,
    isRomanizedMode,
    compareWord,
  });

  const nextWord =
    completedPrefixCount < bestWords.length ? bestWords[completedPrefixCount] : null;
  const alreadyComplete =
    completedPrefixCount === bestWords.length && !bestHasWrongSuffix && bestWords.length > 0;

  return {
    targetWords: bestWords,
    validWordPrefixCount,
    hasWrongSuffix: bestHasWrongSuffix,
    slots,
    nextWord,
    alreadyComplete,
    isRomanizedMode,
    ...(toneCoaching ? { toneCoaching } : {}),
  };
}

export function resolveChoiceHint(input: ChoiceHintInput): ChoiceHintPlan {
  const { choices, expected, accepted = [], language, seed, tier, selectedChoice } = input;
  const validAnswers = accepted.length > 0 ? accepted : [expected];

  const correctChoices: string[] = [];
  const wrongChoices: string[] = [];

  for (const choice of choices) {
    const isExact = choice === expected || validAnswers.includes(choice);
    const graded =
      isExact ||
      gradeAnswer({
        submitted: choice,
        expected,
        accepted: validAnswers,
        language,
      }).isCorrect;
    if (graded) {
      correctChoices.push(choice);
    } else {
      wrongChoices.push(choice);
    }
  }

  const sortedWrong = deterministicSortBySeed(wrongChoices, `${seed}:choice`, (c) => c);
  if (selectedChoice && sortedWrong.includes(selectedChoice)) {
    const idx = sortedWrong.indexOf(selectedChoice);
    sortedWrong.splice(idx, 1);
    sortedWrong.unshift(selectedChoice);
  }

  const maxDimCount = Math.max(0, choices.length - Math.max(1, correctChoices.length));
  const dimTarget = tier === 1 ? 1 : tier === 2 ? 2 : maxDimCount;
  const dimmedChoices = sortedWrong.slice(0, Math.min(dimTarget, maxDimCount));

  return {
    dimmedChoices,
    spotlightChoice: tier >= 3 ? (correctChoices[0] ?? expected ?? null) : null,
  };
}

export function resolvePairMatchHint(input: PairMatchHintInput): PairMatchHintPlan {
  const { leftIds, matchedIds, selectedLeftId, selectedRightId, tier } = input;
  const matchedSet = new Set(matchedIds);
  const unmatched = leftIds.filter((id) => !matchedSet.has(id));

  if (unmatched.length === 0) {
    return {
      targetPairId: null,
      dimmedPairIds: [],
      sustainSpotlight: false,
    };
  }

  const targetPairId =
    (selectedLeftId && !matchedSet.has(selectedLeftId) ? selectedLeftId : null) ??
    (selectedRightId && !matchedSet.has(selectedRightId) ? selectedRightId : null) ??
    unmatched[0];

  const dimmedPairIds =
    tier >= 2 && unmatched.length > 2
      ? unmatched.filter((id) => id !== targetPairId).slice(-1)
      : [];

  return {
    targetPairId,
    dimmedPairIds,
    sustainSpotlight: tier >= 3,
  };
}

export function computeFreeRecallHintedBonus(maxHintTier: HintTier): FreeRecallBonusTierInfo {
  switch (maxHintTier) {
    case 0:
      return {
        xp: FREE_RECALL_BONUS_XP,
        gems: FREE_RECALL_BONUS_GEMS,
        tag: 'Free-Recall Ace!',
      };
    case 1:
      return {
        xp: 8,
        gems: 2,
        tag: 'Guided Free-Recall!',
      };
    case 2:
      return {
        xp: 5,
        gems: 2,
        tag: 'Guided Free-Recall!',
      };
    case 3:
    default:
      return {
        xp: 3,
        gems: 1,
        tag: 'Assisted Recall!',
      };
  }
}
