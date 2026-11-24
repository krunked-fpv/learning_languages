import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { playSfx } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type TextDirection } from '../../types/contracts';

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

  useLayoutEffect(() => {
    const pending = pendingInsertCaretRef.current;
    if (!pending) return;
    pendingInsertCaretRef.current = null;
    const el = inputRef.current;
    if (!el) return;
    try {
      el.focus();
      el.setSelectionRange(pending.start, pending.end);
    } catch {
      // Ignore selection range errors on detached or non-selectable inputs
    }
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
  };
}
