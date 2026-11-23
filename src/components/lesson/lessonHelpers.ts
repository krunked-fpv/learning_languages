import { useEffect, useState } from 'react';
import {
  getCourseGlossary,
  lookupGlossaryEntry,
  stripEdgePunctuation,
  type GlossaryMap,
} from '../../curriculum';
import {
  LANGUAGE_META,
  resolveUnitProficiencyTier,
  type CourseUnit,
  type MapNode,
  type ProficiencyTier,
  type RegisterNuanceTag,
  type TapHintToken,
  type VocabCard,
} from '../../types/contracts';

export const NO_SPACE_AFTER_RE = /['’¡¿(«「『（」』），、。？！・-]$/;
export const NO_SPACE_BEFORE_RE = /^[.,!?;:)»。？！，、・「」『』（）؟،؛।॥]/;
const EDGE_PUNCT_STRIP_RE =
  /[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·]/g;
const CJK_OR_FULLWIDTH_RE =
  /[\u3005\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF。？！，、；：・「」『』（）【】《》〈〉]/;
const TRAILING_PUNCT_RE =
  /^[¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥…—–～·]+/;

export function joinWordBankTokens(tokens: readonly string[]): string {
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
    const prevEndsNoSpace = NO_SPACE_AFTER_RE.test(out);
    const nextStartsPunct = NO_SPACE_BEFORE_RE.test(token);
    const adjacentCjk =
      CJK_OR_FULLWIDTH_RE.test(prevLast) && CJK_OR_FULLWIDTH_RE.test(nextFirst);
    out += prevEndsNoSpace || nextStartsPunct || adjacentCjk ? token : ` ${token}`;
  }
  return out;
}

/**
 * Deterministic Fisher-Yates shuffle seeded by exercise ID so word-bank tiles
 * remain stable across re-renders.
 */
export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
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

export interface PhoneticSyllable {
  text: string;
  stressed: boolean;
  isWordEnd: boolean;
}

/**
 * Splits a hyphenated phonetic guide (e.g. "bon-ZHOOR" or "GOO-ten MOR-gen")
 * into visual syllable chips while highlighting stressed ALL-CAPS syllables.
 */
export function splitPhoneticSyllables(phonetic: string): PhoneticSyllable[] {
  const words = phonetic.trim().split(/\s+/).filter(Boolean);
  const result: PhoneticSyllable[] = [];
  for (const word of words) {
    const parts = word.split('-').filter(Boolean);
    parts.forEach((part, idx) => {
      const lettersOnly = part.replace(/[^\p{L}]/gu, '');
      const stressed =
        lettersOnly.length >= 2 &&
        lettersOnly === lettersOnly.toUpperCase() &&
        lettersOnly !== lettersOnly.toLowerCase();
      result.push({
        text: part,
        stressed,
        isWordEnd: idx === parts.length - 1,
      });
    });
  }
  return result;
}

function segmentExampleWords(
  foreign: string,
  usesSpaces: boolean,
  glossary?: GlossaryMap,
  targetClean?: string
): string[] {
  const trimmed = foreign.trim();
  if (!trimmed) return [];

  if (usesSpaces && !CJK_OR_FULLWIDTH_RE.test(trimmed)) {
    return trimmed.split(/\s+/).filter(Boolean);
  }

  const tokens: string[] = [];
  let i = 0;
  let pendingLeading = '';

  while (i < trimmed.length) {
    if (/\s/.test(trimmed[i])) {
      i += 1;
      continue;
    }

    const leadingMatch = trimmed.slice(i).match(/^[¡¿("'’‘“”„«‹「『（【《〈]+/);
    if (leadingMatch) {
      pendingLeading += leadingMatch[0];
      i += leadingMatch[0].length;
      continue;
    }

    let word = '';
    const asciiMatch = trimmed.slice(i).match(/^[A-Za-z0-9'-]+/);
    if (asciiMatch) {
      word = asciiMatch[0];
      i += word.length;
    } else if (
      targetClean &&
      trimmed.slice(i, i + targetClean.length).toLowerCase() === targetClean
    ) {
      word = trimmed.slice(i, i + targetClean.length);
      i += targetClean.length;
    } else {
      let matched = '';
      const maxLen = Math.min(12, trimmed.length - i);
      for (let len = maxLen; len >= 2; len -= 1) {
        const slice = trimmed.slice(i, i + len);
        if (TRAILING_PUNCT_RE.test(slice) || /\s/.test(slice)) continue;
        if (lookupGlossaryEntry(slice, glossary)) {
          matched = slice;
          break;
        }
      }
      word = matched || trimmed[i];
      i += word.length;
    }

    const trailingMatch = trimmed.slice(i).match(TRAILING_PUNCT_RE);
    let trailing = '';
    if (trailingMatch) {
      trailing = trailingMatch[0];
      i += trailing.length;
    }

    tokens.push(`${pendingLeading}${word}${trailing}`);
    pendingLeading = '';
  }

  if (pendingLeading && tokens.length > 0) {
    tokens[tokens.length - 1] += pendingLeading;
  } else if (pendingLeading) {
    tokens.push(pendingLeading);
  }

  return tokens;
}

/**
 * Builds interactive TapHintToken entries for a DiscoveryCard's example sentence
 * so kids can tap any word in the example to peek at word-level pronunciation and translation.
 */
export function buildTapHintsFromExample(
  foreign: string,
  english: string,
  phonetic: string,
  vocabCard?: VocabCard
): TapHintToken[] {
  const glossary = vocabCard ? getCourseGlossary(vocabCard.language) : undefined;
  const usesSpaces = vocabCard ? LANGUAGE_META[vocabCard.language].usesSpaces : !CJK_OR_FULLWIDTH_RE.test(foreign);
  const targetClean =
    (vocabCard ? stripEdgePunctuation(vocabCard.bareForeign) : '').toLowerCase().replace(EDGE_PUNCT_STRIP_RE, '') ??
    '';

  const words = segmentExampleWords(foreign, usesSpaces, glossary, targetClean);

  return words.map((word, index) => {
    const clean = stripEdgePunctuation(word).toLowerCase().replace(EDGE_PUNCT_STRIP_RE, '');
    const isTarget = Boolean(targetClean && clean === targetClean);
    const gloss = clean ? lookupGlossaryEntry(clean, glossary) : undefined;

    const translation = isTarget && vocabCard
      ? vocabCard.english
      : gloss?.translation ?? english;
    const wordPhonetic = isTarget && vocabCard
      ? vocabCard.phonetic
      : gloss?.phonetic ?? phonetic;
    const romanized = isTarget
      ? vocabCard?.romanized ?? gloss?.romanized
      : gloss?.romanized ?? (words.length === 1 ? vocabCard?.exampleRomanized : undefined);

    return {
      surface: word,
      normalizedId: `${vocabCard?.id ?? 'ex'}-${index}`,
      translation,
      phonetic: wordPhonetic,
      ...(romanized ? { romanized } : {}),
      articleNote:
        isTarget && vocabCard?.article
          ? `Uses article "${vocabCard.article}" (${vocabCard.gender})`
          : gloss?.articleNote,
      accentNote:
        isTarget && vocabCard?.accentCallout ? vocabCard.accentCallout.tip : gloss?.accentNote,
      ...(gloss?.registerNote ? { registerNote: gloss.registerNote } : {}),
      ...(gloss?.grammarNote ? { grammarNote: gloss.grammarNote } : {}),
      speakText: gloss?.speakText ?? (stripEdgePunctuation(word).replace(EDGE_PUNCT_STRIP_RE, '') || word),
    };
  });
}

/**
 * Tracks narrow/short viewports (<= 640px width or <= 700px height) so
 * LessonArena keeps all interactive controls strictly inside 100dvh.
 */
export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 640 || window.innerHeight <= 700;
  });

  useEffect(() => {
    const onResize = () => {
      setCompact(window.innerWidth <= 640 || window.innerHeight <= 700);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return compact;
}

/**
 * Computes viewport-clamped fixed coordinates for any popover anchored to a button rect.
 */
export function clampPopoverPosition(
  anchorRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
): { top: number; left: number; width: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const margin = vw <= 640 ? 8 : 10;
  const width = Math.min(popoverWidth, Math.max(180, vw - margin * 2));
  const idealLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
  const left = Math.max(margin, Math.min(vw - width - margin, idealLeft));

  const fitsBelow = anchorRect.bottom + 8 + popoverHeight <= vh - margin;
  const rawTop = fitsBelow ? anchorRect.bottom + 8 : anchorRect.top - popoverHeight - 8;
  const top = Math.max(margin, Math.min(vh - popoverHeight - margin, rawTop));

  return { top, left, width };
}

export const REGISTER_TAG_META: Record<
  RegisterNuanceTag,
  { label: string; bg: string; border: string; ink: string }
> = {
  polite: {
    label: 'Polite / Formal Register',
    bg: 'var(--tint-indigo-bg)',
    border: 'var(--tint-indigo-border)',
    ink: 'var(--tint-indigo-ink)',
  },
  casual: {
    label: 'Casual / Everyday Register',
    bg: 'var(--tint-emerald-bg)',
    border: 'var(--tint-emerald-border)',
    ink: 'var(--tint-emerald-ink)',
  },
  idiom: {
    label: 'Native Idiom & Proverb',
    bg: 'var(--tint-amber-bg)',
    border: 'var(--tint-amber-border)',
    ink: 'var(--tint-amber-ink)',
  },
  connector: {
    label: 'Discourse Connector',
    bg: 'var(--tint-indigo-bg)',
    border: 'var(--tint-indigo-border)',
    ink: 'var(--tint-indigo-ink)',
  },
  grammar: {
    label: 'Grammar Nuance',
    bg: 'var(--tint-rose-bg)',
    border: 'var(--tint-rose-border)',
    ink: 'var(--tint-rose-ink)',
  },
};

export function resolveUnitOrderFromId(unitId: string): number {
  const match = /-u(\d+)(?:-|$)/i.exec(unitId);
  return match ? Number(match[1]) : 1;
}

export function resolveNodeProficiencyTier(
  node: Pick<MapNode, 'proficiencyTier' | 'unitId' | 'checkpointTargetTier'>,
  unit?: Pick<CourseUnit, 'proficiencyTier' | 'order'>
): ProficiencyTier {
  if (node.proficiencyTier) return node.proficiencyTier;
  if (unit?.proficiencyTier) return unit.proficiencyTier;
  if (unit?.order) return resolveUnitProficiencyTier(unit.order);
  if (node.checkpointTargetTier) return node.checkpointTargetTier;
  return resolveUnitProficiencyTier(resolveUnitOrderFromId(node.unitId));
}

const CLOZE_COMPARE_STRIP_RE =
  /[\s¡!¿?.,;:"'’‘“”„«»‹›()[\]。？！，、；：・「」『』（）【】《》〈〉؟،؛।॥—–―…\-_\u0640]/g;

export function cleanClozeCompareChars(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .toLowerCase()
    .replace(CLOZE_COMPARE_STRIP_RE, '');
}

/**
 * Partitions ContextCloze tapHints into tokens matching sentenceBeforeBlank vs sentenceAfterBlank
 * by walking cumulative character spans of before+blank+after so multi-word blanks and attached
 * clitics (e.g. Arabic "والوئام") never leak into afterTokens or unmatchedTokens.
 */
export function splitTapHintsAroundBlank(
  sentenceBeforeBlank: string,
  sentenceAfterBlank: string,
  expectedBlank: string,
  tapHints: readonly TapHintToken[]
): {
  beforeTokens: TapHintToken[];
  afterTokens: TapHintToken[];
  unmatchedTokens: TapHintToken[];
} {
  if (tapHints.length === 0) {
    return { beforeTokens: [], afterTokens: [], unmatchedTokens: [] };
  }

  const beforeClean = cleanClozeCompareChars(sentenceBeforeBlank);
  const blankClean = cleanClozeCompareChars(expectedBlank);
  const afterClean = cleanClozeCompareChars(sentenceAfterBlank);

  const blankStart = beforeClean.length;
  const blankEnd = blankStart + blankClean.length;
  const fullClean = `${beforeClean}${blankClean}${afterClean}`;

  const beforeTokens: TapHintToken[] = [];
  const afterTokens: TapHintToken[] = [];
  const unmatchedTokens: TapHintToken[] = [];

  let cursor = 0;

  for (const hint of tapHints) {
    const surfClean = cleanClozeCompareChars(hint.surface);
    if (!surfClean) continue;

    let idx = fullClean.indexOf(surfClean, cursor);
    if (idx === -1 && blankClean && surfClean.includes(blankClean)) {
      continue;
    }
    if (idx === -1) {
      if (
        !blankClean ||
        (!blankClean.includes(surfClean) && !surfClean.includes(blankClean))
      ) {
        unmatchedTokens.push(hint);
      }
      continue;
    }

    // If the token falls strictly before blankStart, check whether jumping across blankStart
    // was actually meant for afterBlank when cursor is already at blankStart.
    const start = idx;
    const end = start + surfClean.length;
    cursor = end;

    if (end <= blankStart) {
      beforeTokens.push(hint);
    } else if (start >= blankEnd) {
      afterTokens.push(hint);
    }
    // Otherwise [start, end) overlaps [blankStart, blankEnd): skip cleanly (blank or fused clitic)
  }

  return { beforeTokens, afterTokens, unmatchedTokens };
}
