import { expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import {
  isAdultLanguage,
  type BossGauntletExercise,
  type ContextClozeExercise,
  type LanguageCode,
  type LessonExercise,
  type ListenDecodeExercise,
  type MiniStoryExercise,
  type PairMatchRushExercise,
  type WordBankExercise,
} from '../../src/types/contracts';

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function queryButtonByText(text: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (
      !btn.classList.contains('tap-hint-token-btn') &&
      !btn.classList.contains('tactile-tile') &&
      btn.textContent?.trim() === text
    ) {
      return btn;
    }
  }
  return undefined;
}

export function queryButtonByAriaLabel(label: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label') === label) {
      return btn;
    }
  }
  return undefined;
}

export function requireButtonByText(text: string): HTMLButtonElement {
  const btn = queryButtonByText(text);
  expect(btn, `Missing button "${text}"`).toBeDefined();
  return btn!;
}

export function requireButtonByAriaLabel(label: string): HTMLButtonElement {
  const btn = queryButtonByAriaLabel(label);
  expect(btn, `Missing button with aria-label "${label}"`).toBeDefined();
  return btn!;
}

export function clickTokensInTray(
  tokens: readonly string[],
  container: HTMLElement = document.body
): void {
  const bank = container.querySelector('[aria-label="Word bank tiles"]');
  expect(bank, 'Missing Word bank tiles container').not.toBeNull();
  const poolButtons = Array.from(bank!.querySelectorAll('button'));
  for (const tok of tokens) {
    const cleanTok = tok.trim();
    const match = poolButtons.find(
      (btn) => btn.textContent?.trim() === cleanTok && !btn.disabled
    );
    expect(match, `Missing unused word-bank tile "${cleanTok}"`).toBeDefined();
    fireEvent.click(match!);
  }
}

export function verifyTapToPeekInDom(context: string): boolean {
  const hintBtns = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button.tap-hint-token-btn')
  );
  if (hintBtns.length === 0) return false;

  fireEvent.click(hintBtns[0]);
  const dialogs = screen.queryAllByRole('dialog', { name: /Word hint for/i });
  expect(dialogs.length, `${context}: Tap-to-Peek popover failed to open`).toBeGreaterThan(0);
  expect(dialogs[0].textContent?.trim(), `${context}: Tap-to-Peek popover empty`).not.toBe('');

  const closeBtn = queryButtonByAriaLabel('Close word hint');
  if (closeBtn) {
    fireEvent.click(closeBtn);
  } else {
    fireEvent.keyDown(window, { key: 'Escape' });
  }
  expect(screen.queryByRole('dialog', { name: /Word hint for/i })).not.toBeInTheDocument();
  return true;
}

export function verifySayItNormallyInDom(
  language: LanguageCode,
  context: string,
  avoidTerms?: readonly string[]
): boolean {
  const btn = document.querySelector<HTMLButtonElement>('[data-testid="say-it-normally-btn"]');
  if (!isAdultLanguage(language)) {
    expect(btn, `${context}: Adult SayItNormallyButton leaked into base language ${language}`).toBeNull();
    return false;
  }
  if (!btn) return false;
  fireEvent.click(btn);
  const callout = document.querySelector('[data-testid="plain-english-callout"]');
  expect(callout, `${context}: Plain-English callout did not open`).not.toBeNull();
  const text = callout!.textContent?.trim() ?? '';
  expect(text, `${context}: Plain-English callout empty`).not.toBe('');
  if (avoidTerms && avoidTerms.length > 0) {
    const functionWords = new Set([
      'inside', 'outside', 'before', 'after', 'since', 'until', 'during', 'without',
      'through', 'across', 'around', 'between', 'against', 'under', 'above', 'behind',
      'among', 'within', 'toward', 'towards', 'every', 'other', 'another', 'there',
      'where', 'which', 'could', 'would', 'should', 'might', 'really', 'actually',
      'simply', 'completely', 'because', 'while', 'although', 'though', 'unless',
      'despite', 'going', 'these', 'those', 'their', 'about', 'always', 'never',
    ]);
    for (const term of avoidTerms) {
      const clean = term.trim().replace(/^[^\w]+|[^\w]+$/g, '');
      if (clean.length >= 5 && !functionWords.has(clean.toLowerCase())) {
        const wordRe = new RegExp(`\\b${escapeRegExp(clean)}\\b`, 'i');
        expect(text).not.toMatch(wordRe);
      }
    }
  }
  fireEvent.click(btn);
  expect(document.querySelector('[data-testid="plain-english-callout"]')).toBeNull();
  return true;
}

export interface PlayExerciseOptions {
  language: LanguageCode;
  verifyTapToPeek?: boolean;
  verifyAllListenSpeeds?: boolean;
  useFreeRecall?: boolean;
  useFreeRecallOnBoss?: boolean;
  verifySayItNormally?: boolean;
  onObservedType?: (type: LessonExercise['type']) => void;
  onObservedDirection?: (dir: WordBankExercise['direction']) => void;
  onObservedListenSpeed?: (speed: 'normal' | 'slow' | 'fluent') => void;
  onObservedFreeRecall?: () => void;
  onObservedTapToPeek?: () => void;
  onObservedSayItNormally?: () => void;
}

export function playExerciseInDom(
  ex: LessonExercise,
  options: PlayExerciseOptions
): void {
  const { language } = options;
  options.onObservedType?.(ex.type);

  if (ex.type === 'discovery_card') {
    if (options.verifyTapToPeek && verifyTapToPeekInDom(`${language}:${ex.id}`)) {
      options.onObservedTapToPeek?.();
    }
    if (options.verifySayItNormally && verifySayItNormallyInDom(language, `${language}:${ex.id}`)) {
      options.onObservedSayItNormally?.();
    }
    fireEvent.click(requireButtonByText('Speak & Collect'));
    return;
  }

  if (ex.type === 'word_bank') {
    const wb = ex as WordBankExercise;
    options.onObservedDirection?.(wb.direction);
    if (wb.direction === 'to_foreign') {
      expect(document.body.textContent ?? '').toContain(wb.promptText);
    } else if (wb.promptTokens.length > 0) {
      const hasTapToken = Array.from(document.querySelectorAll('button.tap-hint-token-btn')).some(
        (b) => b.textContent?.trim() === wb.promptTokens[0].surface
      );
      expect(hasTapToken, `Missing tap-hint token "${wb.promptTokens[0].surface}"`).toBe(true);
      if (options.verifyTapToPeek && verifyTapToPeekInDom(`${language}:${ex.id}`)) {
        options.onObservedTapToPeek?.();
      }
    }

    if (
      options.verifySayItNormally &&
      verifySayItNormallyInDom(language, `${language}:${ex.id}`, wb.targetTokens)
    ) {
      options.onObservedSayItNormally?.();
    }

    const canFreeRecall =
      Boolean(options.useFreeRecall) && !(language === 'en' && wb.direction === 'to_english');
    if (canFreeRecall) {
      const toggleBtn = screen.getByRole('button', {
        name: /Type Instead|Keyboard Free-Recall/i,
      });
      fireEvent.click(toggleBtn);
      const input = screen.getByLabelText('Type your translation');
      fireEvent.change(input, { target: { value: wb.expectedSentence } });
      options.onObservedFreeRecall?.();
    } else {
      clickTokensInTray(wb.targetTokens);
    }

    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    const wbContinue = queryButtonByText('Continue');
    expect(
      wbContinue,
      `Missing button "Continue" after word_bank "${language}:${wb.id}" — stage text: "${(document.body.textContent ?? '').slice(0, 220)}"`
    ).toBeDefined();
    fireEvent.click(wbContinue!);
    return;
  }

  if (ex.type === 'context_cloze') {
    const cloze = ex as ContextClozeExercise;
    if (options.verifyTapToPeek && verifyTapToPeekInDom(`${language}:${ex.id}`)) {
      options.onObservedTapToPeek?.();
    }
    const radioBtn = Array.from(document.querySelectorAll('button[role="radio"]')).find(
      (b) => b.textContent?.trim() === cloze.expectedBlank
    );
    expect(radioBtn, `Missing context_cloze choice "${cloze.expectedBlank}"`).toBeDefined();
    fireEvent.click(radioBtn!);
    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    expect(screen.getByRole('note', { name: 'Nuance and Register Spotlight' })).toHaveTextContent(
      cloze.nuanceNote
    );
    if (options.verifySayItNormally && verifySayItNormallyInDom(language, `${language}:${ex.id}`)) {
      options.onObservedSayItNormally?.();
    }
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'listen_decode') {
    const ld = ex as ListenDecodeExercise;
    fireEvent.click(requireButtonByAriaLabel('1.0x Normal speed audio'));
    options.onObservedListenSpeed?.('normal');
    fireEvent.click(requireButtonByAriaLabel('0.65x Slow Turtle audio'));
    options.onObservedListenSpeed?.('slow');
    if (options.verifyAllListenSpeeds) {
      fireEvent.click(requireButtonByAriaLabel('1.12x Fluent speed audio'));
      options.onObservedListenSpeed?.('fluent');
    }

    if (ld.mode === 'select_meaning') {
      const radioBtn = Array.from(document.querySelectorAll('button[role="radio"]')).find(
        (b) => b.textContent?.trim() === ld.englishMeaning
      );
      expect(radioBtn, `Missing meaning radio "${ld.englishMeaning}"`).toBeDefined();
      fireEvent.click(radioBtn!);
    } else {
      clickTokensInTray(ld.targetTokens ?? []);
    }

    if (options.verifySayItNormally && verifySayItNormallyInDom(language, `${language}:${ex.id}`)) {
      options.onObservedSayItNormally?.();
    }

    fireEvent.click(requireButtonByText('Check'));
    expect(document.body.textContent ?? '').not.toContain('Almost there!');
    const ldContinue = queryButtonByText('Continue');
    expect(
      ldContinue,
      `Missing button "Continue" after listen_decode "${language}:${ld.id}" — stage text: "${(document.body.textContent ?? '').slice(0, 220)}"`
    ).toBeDefined();
    fireEvent.click(ldContinue!);
    return;
  }

  if (ex.type === 'pair_match_rush') {
    const pm = ex as PairMatchRushExercise;
    for (const pair of pm.pairs) {
      const pairButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(`button[data-pair-id="${pair.id}"]`)
      ).filter((b) => !b.disabled);
      expect(pairButtons.length, `Missing pair buttons for "${pair.id}"`).toBe(2);
      fireEvent.click(pairButtons[0]);
      fireEvent.click(pairButtons[1]);
    }
    fireEvent.click(requireButtonByText('Continue'));
    return;
  }

  if (ex.type === 'mini_story') {
    const story = ex as MiniStoryExercise;
    let checkedTap = false;
    for (let guard = 0; guard < 35; guard++) {
      if (options.verifyTapToPeek && !checkedTap && verifyTapToPeekInDom(`${language}:${ex.id}`)) {
        options.onObservedTapToPeek?.();
        checkedTap = true;
      }
      const finishBtn = queryButtonByText('Finish Story!');
      if (finishBtn) {
        fireEvent.click(finishBtn);
        return;
      }
      const nextBtn = queryButtonByText('Next Line');
      if (nextBtn && !nextBtn.disabled) {
        fireEvent.click(nextBtn);
        continue;
      }
      const bodyText = document.body.textContent ?? '';
      const activeDecision = story.decisions.find((d) => bodyText.includes(d.questionEnglish));
      expect(
        activeDecision,
        `Story "${story.id}" stalled with no Next/Finish/Decision`
      ).toBeDefined();
      const correctOpt = activeDecision!.options.find((o) => o.isCorrect)!;
      const buttons = Array.from(document.querySelectorAll('button'));
      const optBtn =
        buttons.find(
          (b) =>
            !b.classList.contains('tap-hint-token-btn') &&
            b.querySelector('[dir="auto"]')?.textContent?.trim() === correctOpt.label
        ) ??
        buttons.find(
          (b) =>
            !b.classList.contains('tap-hint-token-btn') &&
            new RegExp(escapeRegExp(correctOpt.label)).test(b.textContent ?? '')
        );
      expect(optBtn, `Missing story choice button "${correctOpt.label}"`).toBeDefined();
      fireEvent.click(optBtn!);
    }
    throw new Error(`Story "${story.id}" did not complete within 35 steps`);
  }

  if (ex.type === 'boss_gauntlet') {
    const boss = ex as BossGauntletExercise;
    for (let t = 0; t < boss.turns.length; t++) {
      const turn = boss.turns[t];
      if (options.verifyTapToPeek && t === 0 && verifyTapToPeekInDom(`${language}:${ex.id}:t0`)) {
        options.onObservedTapToPeek?.();
      }
      if (
        options.verifySayItNormally &&
        t === 0 &&
        verifySayItNormallyInDom(language, `${language}:${ex.id}:t0`)
      ) {
        options.onObservedSayItNormally?.();
      }
      if (turn.mode === 'choice') {
        const choiceBtn = queryButtonByText(turn.expectedAnswer);
        expect(choiceBtn, `Missing boss choice button "${turn.expectedAnswer}"`).toBeDefined();
        fireEvent.click(choiceBtn!);
      } else if (options.useFreeRecallOnBoss && t === 0) {
        const toggleBtn = screen.getByRole('button', { name: /Keyboard Free-Recall/i });
        fireEvent.click(toggleBtn);
        const input = screen.getByLabelText('Type your translation');
        fireEvent.change(input, { target: { value: turn.expectedAnswer } });
        options.onObservedFreeRecall?.();
      } else {
        clickTokensInTray(turn.targetTokens ?? []);
      }
      fireEvent.click(requireButtonByText('Send Reply!'));
      expect(document.body.textContent ?? '').not.toMatch(/Give that reply one more try/i);
      const nextLabel = t + 1 >= boss.turns.length ? 'Finish Encounter!' : 'Next Turn';
      fireEvent.click(requireButtonByText(nextLabel));
    }
    fireEvent.click(requireButtonByText('Collect Boss Chest & Finish!'));
  }
}

export interface MockUtteranceRecord {
  text: string;
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null;
}

export function installMockSpeechSynthesis(options: {
  voices?: SpeechSynthesisVoice[];
  autoComplete?: 'end' | 'error' | 'hang';
} = {}) {
  const utterances: MockUtteranceRecord[] = [];
  const cancelSpy = vi.fn();
  const speakSpy = vi.fn((utt: MockUtteranceRecord) => {
    if (options.autoComplete === 'end') {
      utt.onend?.(new Event('end'));
    } else if (options.autoComplete === 'error') {
      utt.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
    }
  });

  class FakeUtterance implements MockUtteranceRecord {
    text: string;
    voice: SpeechSynthesisVoice | null = null;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;
    onend: ((ev: Event) => void) | null = null;
    onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null = null;
    constructor(text = '') {
      this.text = text;
      utterances.push(this);
    }
  }

  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: FakeUtterance,
  });

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    writable: true,
    value: {
      getVoices: () => options.voices ?? [],
      speak: speakSpy,
      cancel: cancelSpy,
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
    },
  });

  return { utterances, speakSpy, cancelSpy };
}
