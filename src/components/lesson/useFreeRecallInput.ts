import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { playSfx } from '../../audio';
import * as core from '../../core';
import { LANGUAGE_META, type LanguageCode, type TextDirection } from '../../types/contracts';

const PINYIN_TONE_TABLE: Readonly<Record<string, readonly [string, string, string, string, string]>> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  A: ['Ā', 'Á', 'Ǎ', 'À', 'A'],
  E: ['Ē', 'É', 'Ě', 'È', 'E'],
  I: ['Ī', 'Í', 'Ǐ', 'Ì', 'I'],
  O: ['Ō', 'Ó', 'Ǒ', 'Ò', 'O'],
  U: ['Ū', 'Ú', 'Ǔ', 'Ù', 'U'],
  Ü: ['Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü'],
};

const NUMERIC_PINYIN_SYLLABLE_RE =
  /(?:(?:[nlNL](?:u:|U:|[vV])(?:[eE])?)|(?:(?:zh|ch|sh|ZH|CH|SH|Zh|Ch|Sh|[bpmfdtnlgkhjqxrzcsywBPMFDTNLGKHJQXRZCSYW])?[aeiouüAEIOUÜ]+))(?:ng|NG|Ng|nG|[nrNR])?[0-5](?![0-9])/g;

function readOptionalCoreFn<T>(key: string): T | undefined {
  try {
    if (!(key in core)) return undefined;
    const candidate = (core as Record<string, unknown>)[key];
    return typeof candidate === 'function' ? (candidate as T) : undefined;
  } catch {
    return undefined;
  }
}

function applyToneToPinyinSyllable(syllableRaw: string, toneDigit: string): string {
  const rawDigit = Number(toneDigit);
  const toneIdx = rawDigit === 0 ? 4 : rawDigit - 1;
  const normalized = syllableRaw
    .replace(/u:/g, 'ü')
    .replace(/U:/g, 'Ü')
    .replace(/v/g, 'ü')
    .replace(/V/g, 'Ü');
  if (toneIdx < 0 || toneIdx > 4) return normalized;

  const lower = normalized.toLowerCase();
  let targetIndex = lower.indexOf('a');
  if (targetIndex === -1) targetIndex = lower.indexOf('e');
  if (targetIndex === -1) {
    const ouIdx = lower.indexOf('ou');
    if (ouIdx !== -1) targetIndex = ouIdx;
  }
  if (targetIndex === -1) {
    for (let i = normalized.length - 1; i >= 0; i--) {
      if (PINYIN_TONE_TABLE[normalized[i]]) {
        targetIndex = i;
        break;
      }
    }
  }
  if (targetIndex === -1) return normalized;
  const ch = normalized[targetIndex];
  const toned = PINYIN_TONE_TABLE[ch]?.[toneIdx] ?? ch;
  return `${normalized.slice(0, targetIndex)}${toned}${normalized.slice(targetIndex + 1)}`;
}

function fallbackHasNumericPinyinSyllable(text: string): boolean {
  if (!text) return false;
  NUMERIC_PINYIN_SYLLABLE_RE.lastIndex = 0;
  return NUMERIC_PINYIN_SYLLABLE_RE.test(text);
}

function fallbackConvertNumericPinyin(text: string): string {
  if (!text) return '';
  NUMERIC_PINYIN_SYLLABLE_RE.lastIndex = 0;
  return text.replace(NUMERIC_PINYIN_SYLLABLE_RE, (match) =>
    applyToneToPinyinSyllable(match.slice(0, -1), match.slice(-1))
  );
}

/** Checks whether text contains numeric Pinyin tone syllables using core when available. */
export function hasNumericPinyinSyllableSafe(text: string): boolean {
  const coreFn = readOptionalCoreFn<(input: string) => boolean>('hasNumericPinyinSyllable');
  return coreFn ? coreFn(text) : fallbackHasNumericPinyinSyllable(text);
}

/** Converts numeric Pinyin tone syllables (e.g. ni3 hao3 -> nǐ hǎo) using core when available. */
export function convertNumericPinyinSafe(text: string): string {
  const coreFn = readOptionalCoreFn<(input: string) => string>('convertNumericPinyin');
  return coreFn ? coreFn(text) : fallbackConvertNumericPinyin(text);
}

const PARTIAL_NUMERIC_PINYIN_TOKEN_RE =
  /(?:[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u0300-\u036F0-9]|(?<=[uU]):)+/g;
const PARTIAL_NUMERIC_PINYIN_TAIL_RE = /^(.+[0-5])([A-Za-z]+)$/;

function convertNumericPinyinWithPartialTailSafe(text: string): string {
  const converted = convertNumericPinyinSafe(text);
  return converted.replace(PARTIAL_NUMERIC_PINYIN_TOKEN_RE, (token) => {
    if (!/[0-5]/.test(token)) return token;
    const partialSplit = PARTIAL_NUMERIC_PINYIN_TAIL_RE.exec(token);
    if (partialSplit && hasNumericPinyinSyllableSafe(partialSplit[1])) {
      return `${convertNumericPinyinSafe(partialSplit[1])}${partialSplit[2]}`;
    }
    return token;
  });
}

/** Returns live tone-marked Pinyin preview text for zh to_foreign Free-Recall when numeric tones are typed. */
export function getPinyinTonePreview(
  language: LanguageCode,
  direction: 'to_foreign' | 'to_english',
  typedText: string
): string | null {
  if (language !== 'zh' || direction !== 'to_foreign') return null;
  const trimmed = typedText.trim();
  if (!trimmed || !/[0-5]/.test(trimmed)) return null;
  const converted = convertNumericPinyinWithPartialTailSafe(trimmed).trim();
  if (!converted) return null;
  if (converted === trimmed && !hasNumericPinyinSyllableSafe(trimmed)) {
    return null;
  }
  return converted;
}

const NON_LATIN_COURSES = new Set<LanguageCode>(['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru']);

const COMPACT_SOURCE_LANGUAGE_NAMES: Partial<Record<LanguageCode, string>> = {
  zh: 'Chinese',
  ar: 'Arabic',
  arz: 'Egyptian',
  ebonics: 'AAVE',
  suburban: 'Suburban',
  corp_trades: 'Corporate',
  midwest_northeast: 'Midwest',
  south_genz: 'Southern',
  cali_country: 'Cali',
  stoner_tactical: 'Skater',
};

const COMPACT_TARGET_LANGUAGE_NAMES: Partial<Record<LanguageCode, string>> = {
  ebonics: 'Suburban',
  suburban: 'AAVE',
  corp_trades: 'Trades',
  midwest_northeast: 'Northeast',
  south_genz: 'Gen-Z',
  cali_country: 'Country',
  stoner_tactical: 'Tactical',
};

/**
 * Resolves the HTML dir attribute for a Free-Recall input, preserving RTL default
 * on empty RTL inputs while flipping to LTR when romanized Latin letters are typed.
 */
export function resolveFreeRecallInputDirection(
  answerDir: TextDirection,
  typedText: string
): TextDirection {
  if (
    answerDir === 'rtl' &&
    /[A-Za-z]/.test(typedText) &&
    !/[\u0600-\u06FF]/.test(typedText)
  ) {
    return 'ltr';
  }
  return answerDir;
}

/**
 * Keeps English placeholder copy left-aligned when empty, then aligns right
 * as soon as RTL input text is entered.
 */
export function resolveFreeRecallTextAlign(
  answerDir: TextDirection,
  typedText: string
): 'left' | 'right' {
  if (typedText.length === 0) return 'left';
  return resolveFreeRecallInputDirection(answerDir, typedText) === 'rtl' ? 'right' : 'left';
}

/**
 * Formats Free-Recall placeholder copy cleanly across desktop and narrow 375px viewports.
 */
export function buildFreeRecallPlaceholder(params: {
  language: LanguageCode;
  direction: 'to_foreign' | 'to_english';
  compact: boolean;
  variant: 'word_bank' | 'boss';
  bossBonusXp?: number;
}): string {
  const { language, direction, compact, variant, bossBonusXp = 0 } = params;
  const langMeta = LANGUAGE_META[language];
  const compactSource = COMPACT_SOURCE_LANGUAGE_NAMES[language] ?? langMeta.name;
  const compactTarget =
    COMPACT_TARGET_LANGUAGE_NAMES[language] ?? langMeta.translationLanguageLabel ?? 'English';

  if (variant === 'boss') {
    if (compact) {
      return `Reply in ${compactSource} (+${bossBonusXp} XP)...`;
    }
    return `Type your reply in ${langMeta.dialectA ?? langMeta.name} (+${bossBonusXp} XP bonus)...`;
  }

  if (direction === 'to_english') {
    if (compact) {
      return `Type in ${langMeta.isAdultOnly ? compactTarget : 'English'}...`;
    }
    return `Type in ${langMeta.translationLanguageLabel ?? 'English'}...`;
  }

  if (language === 'en') {
    return 'Type the English phrase...';
  }

  if (langMeta.isAdultOnly) {
    return compact
      ? `Type in ${compactSource}...`
      : `Type in ${langMeta.dialectA ?? langMeta.name}...`;
  }

  if (NON_LATIN_COURSES.has(language)) {
    return compact
      ? `Type in ${compactSource} or romanized`
      : `Type in ${langMeta.name} or romanized`;
  }

  return compact
    ? `Type in ${compactSource}...`
    : `Type in ${langMeta.name} (accents optional, or tap keys below!)`;
}

function focusInputWithSelection(
  el: HTMLInputElement | null,
  start: number,
  end: number
): void {
  if (!el) return;
  try {
    el.focus();
    el.setSelectionRange(start, end);
  } catch {
    // Ignore selection range errors on detached or non-selectable inputs
  }
}

/**
 * Shared synchronous ref-backed state for Free-Recall inputs so rapid consecutive
 * VirtualScriptDrawer or accent-bar clicks never lose characters before React commits.
 */
export function useFreeRecallInput() {
  const [typedText, setTypedText] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const typedTextRef = useRef('');
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const pendingInsertCaretRef = useRef<{ start: number; end: number } | null>(null);

  const resetFreeRecallInput = useCallback(() => {
    typedTextRef.current = '';
    selectionRef.current = { start: 0, end: 0 };
    pendingInsertCaretRef.current = null;
    setTypedText('');
    setDrawerOpen(false);
  }, []);

  const syncSelection = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    pendingInsertCaretRef.current = null;
    const fallback = typedTextRef.current.length;
    selectionRef.current = {
      start: el.selectionStart ?? fallback,
      end: el.selectionEnd ?? fallback,
    };
  }, []);

  const handleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    typedTextRef.current = nextVal;
    pendingInsertCaretRef.current = null;
    selectionRef.current = {
      start: e.target.selectionStart ?? nextVal.length,
      end: e.target.selectionEnd ?? nextVal.length,
    };
    setTypedText(nextVal);
  }, []);

  const insertCharAtCaret = useCallback((ch: string) => {
    playSfx('tile_tap');
    const el = inputRef.current;
    const base = typedTextRef.current;
    const pending = pendingInsertCaretRef.current;
    const rawStart = pending
      ? pending.start
      : (el?.selectionStart ?? selectionRef.current.start ?? base.length);
    const rawEnd = pending
      ? pending.end
      : (el?.selectionEnd ?? selectionRef.current.end ?? base.length);
    const start = Math.max(0, Math.min(base.length, rawStart));
    const end = Math.max(start, Math.min(base.length, rawEnd));
    const next = base.slice(0, start) + ch + base.slice(end);
    const nextCaret = start + ch.length;

    typedTextRef.current = next;
    selectionRef.current = { start: nextCaret, end: nextCaret };
    pendingInsertCaretRef.current = { start: nextCaret, end: nextCaret };
    setTypedText(next);
  }, []);

  const applyConvertedText = useCallback((nextText: string) => {
    playSfx('tile_tap');
    const nextCaret = nextText.length;
    const isSame = typedTextRef.current === nextText;
    typedTextRef.current = nextText;
    selectionRef.current = { start: nextCaret, end: nextCaret };
    if (isSame) {
      pendingInsertCaretRef.current = null;
      focusInputWithSelection(inputRef.current, nextCaret, nextCaret);
      return;
    }
    pendingInsertCaretRef.current = { start: nextCaret, end: nextCaret };
    setTypedText(nextText);
  }, []);

  useLayoutEffect(() => {
    const pending = pendingInsertCaretRef.current;
    if (!pending) return;
    pendingInsertCaretRef.current = null;
    focusInputWithSelection(inputRef.current, pending.start, pending.end);
  }, [typedText]);

  return {
    typedText,
    drawerOpen,
    setDrawerOpen,
    inputRef,
    resetFreeRecallInput,
    syncSelection,
    handleTextChange,
    insertCharAtCaret,
    applyConvertedText,
  };
}
