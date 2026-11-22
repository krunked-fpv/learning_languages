import { useEffect, useState } from 'react';
import type { TapHintToken, VocabCard } from '../../types/contracts';

const NO_SPACE_AFTER_RE = /['’¡¿(«-]$/;
const NO_SPACE_BEFORE_RE = /^[.,!?;:)»]/;

/**
 * Joins word-bank tokens while preserving French/Italian elisions (e.g. `l'` + `eau` -> `l'eau`)
 * and natural opening/closing punctuation spacing.
 */
export function joinWordBankTokens(tokens: readonly string[]): string {
  let out = '';
  for (const raw of tokens) {
    const token = raw.trim();
    if (!token) continue;
    if (!out) {
      out = token;
      continue;
    }
    const prevEndsNoSpace = NO_SPACE_AFTER_RE.test(out);
    const nextStartsPunct = NO_SPACE_BEFORE_RE.test(token);
    out += prevEndsNoSpace || nextStartsPunct ? token : ` ${token}`;
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
      const lettersOnly = part.replace(/[^a-zA-Z]/g, '');
      const stressed = lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase();
      result.push({
        text: part,
        stressed,
        isWordEnd: idx === parts.length - 1,
      });
    });
  }
  return result;
}

/**
 * Builds interactive TapHintToken entries for a DiscoveryCard's example sentence
 * so kids can tap any word in the example to peek at pronunciation and translation.
 */
export function buildTapHintsFromExample(
  foreign: string,
  english: string,
  phonetic: string,
  vocabCard?: VocabCard
): TapHintToken[] {
  const words = foreign.trim().split(/\s+/).filter(Boolean);
  const targetClean = vocabCard?.bareForeign.toLowerCase().replace(/[¡!¿?.,;:"']/g, '') ?? '';

  return words.map((word, index) => {
    const clean = word.toLowerCase().replace(/[¡!¿?.,;:"']/g, '');
    const isTarget = Boolean(targetClean && clean === targetClean);
    return {
      surface: word,
      normalizedId: `${vocabCard?.id ?? 'ex'}-${index}`,
      translation: isTarget && vocabCard ? vocabCard.english : english,
      phonetic: isTarget && vocabCard ? vocabCard.phonetic : phonetic,
      articleNote:
        isTarget && vocabCard?.article
          ? `Uses article "${vocabCard.article}" (${vocabCard.gender})`
          : undefined,
      accentNote: isTarget && vocabCard?.accentCallout ? vocabCard.accentCallout.tip : undefined,
      speakText: word.replace(/[¡!¿?.,;:"]/g, ''),
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
  const margin = 12;
  const width = Math.min(popoverWidth, Math.max(180, vw - margin * 2));
  const idealLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
  const left = Math.max(margin, Math.min(vw - width - margin, idealLeft));

  const fitsBelow = anchorRect.bottom + 8 + popoverHeight <= vh - margin;
  const rawTop = fitsBelow ? anchorRect.bottom + 8 : anchorRect.top - popoverHeight - 8;
  const top = Math.max(margin, Math.min(vh - popoverHeight - margin, rawTop));

  return { top, left, width };
}
