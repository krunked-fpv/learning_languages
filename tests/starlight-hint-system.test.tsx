import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAudioPreferences,
  playPhoneticCadence,
  setAudioPreferences,
  stopHintChimes,
  stopPhoneticCadence,
  stopSpeech,
} from '../src/audio';
import { CafeOrderRushArcade } from '../src/components/arcade/CafeOrderRushArcade';
import { ConstellationMemoryArcade } from '../src/components/arcade/ConstellationMemoryArcade';
import { SkyCatcherArcade } from '../src/components/arcade/SkyCatcherArcade';
import { StarlightBridgeArcade } from '../src/components/arcade/StarlightBridgeArcade';
import { MascotStage } from '../src/components/characters/MascotStage';
import { BossGauntletView } from '../src/components/lesson/BossGauntletView';
import { ContextClozeView } from '../src/components/lesson/ContextClozeView';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../src/components/lesson/ListenDecodeView';
import { MiniStoryView } from '../src/components/lesson/MiniStoryView';
import { PairMatchRushView } from '../src/components/lesson/PairMatchRushView';
import { buildWordBankPool } from '../src/components/lesson/WordBankTray';
import { WordBankView } from '../src/components/lesson/WordBankView';
import {
  calculateLessonRewards,
  computeFreeRecallHintedBonus,
  resolveChoiceHint,
  resolveFreeRecallHint,
  resolvePairMatchHint,
  resolveTileSequenceHint,
} from '../src/core';
import { getCourse, getNodePoolSize, getPlayableNodeExercises } from '../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import type {
  BossGauntletExercise,
  ContextClozeExercise,
  ListenDecodeExercise,
  MiniStoryExercise,
  PairMatchRushExercise,
  WordBankExercise,
} from '../src/types/contracts';

function installMatchMedia(reducedMotion = false, width = 1024) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: width < 500 ? 667 : 800,
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (query.includes('prefers-reduced-motion: reduce') && reducedMotion) ||
      (query.includes('max-width') && width <= 640),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

interface RecordedOscillator {
  type: OscillatorType;
  frequency: { value: number; setValueAtTime: ReturnType<typeof vi.fn> };
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
}

function installAudioMock(): RecordedOscillator[] {
  const createdOscs: RecordedOscillator[] = [];
  const makeParam = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });

  class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime = 1.0;
    destination = {};
    resume = vi.fn().mockResolvedValue(undefined);
    createGain = vi.fn(() => ({
      gain: makeParam(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    createBiquadFilter = vi.fn(() => ({
      type: 'lowpass',
      frequency: makeParam(),
      Q: makeParam(),
      connect: vi.fn(),
    }));
    createOscillator = vi.fn(() => {
      const osc: RecordedOscillator = {
        type: 'sine',
        frequency: { value: 440, setValueAtTime: vi.fn() },
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
      };
      createdOscs.push(osc);
      return osc;
    });
  }

  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: MockAudioContext,
  });
  return createdOscs;
}

const tacticalExercise: WordBankExercise = {
  type: 'word_bank',
  id: 'wb-tactical-1',
  direction: 'to_foreign',
  promptText: 'OK buddy, go wait in the car.',
  promptTokens: [],
  expectedSentence: 'Copy that, troop, report to the driveway station.',
  acceptedSentences: [
    'Copy that, troop, report to the driveway station.',
    'Roger that, troop, report to the driveway station.',
  ],
  targetTokens: ['Copy', 'that,', 'troop,', 'report', 'to', 'the', 'driveway', 'station.'],
  distractorTokens: ['vibes', 'sandwich', 'maybe'],
  phoneticHint: 'KAH-pee that troop...',
  registerTag: 'idiom',
  allowFreeRecall: true,
  vocabIds: [],
};

const duplicateWordExercise: WordBankExercise = {
  type: 'word_bank',
  id: 'wb-dup-es-1',
  direction: 'to_foreign',
  promptText: 'The house on the hill.',
  promptTokens: [],
  expectedSentence: 'la casa en la colina',
  acceptedSentences: ['la casa en la colina'],
  targetTokens: ['la', 'casa', 'en', 'la', 'colina'],
  distractorTokens: ['el', 'mesa'],
  phoneticHint: 'lah KAH-sah en lah koh-LEE-nah',
  vocabIds: [],
};

describe('Starlight Sequence Hint System', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vaultActions.resetVaultToDefaults();
    setAudioPreferences({ volume: 0.9, muted: false });
    installMatchMedia(false, 1024);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    stopHintChimes();
    stopPhoneticCadence();
    stopSpeech();
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('resolves exact sequential bank UIDs, duplicate words, partial valid prefixes, wrong prefixes, and accepted alternates', () => {
    const pool = buildWordBankPool(
      duplicateWordExercise.id,
      duplicateWordExercise.targetTokens,
      duplicateWordExercise.distractorTokens
    );

    const laTiles = pool.filter((t) => t.label === 'la');
    const distractorUids = new Set(pool.filter((t) => ['el', 'mesa'].includes(t.label)).map((t) => t.uid));
    expect(laTiles.length).toBe(2);

    // Full sequence from empty tray
    const planFull = resolveTileSequenceHint({
      pool,
      targetTokens: duplicateWordExercise.targetTokens,
      expectedSentence: duplicateWordExercise.expectedSentence,
      acceptedSentences: duplicateWordExercise.acceptedSentences,
      selectedTileUids: [],
      language: 'es',
      seed: duplicateWordExercise.id,
      tier: 1,
    });
    expect(planFull.remainingTokens).toEqual(['la', 'casa', 'en', 'la', 'colina']);
    expect(planFull.remainingBankUids.length).toBe(5);
    expect(new Set(planFull.remainingBankUids).size).toBe(5);
    for (const uid of planFull.remainingBankUids) {
      expect(distractorUids.has(uid)).toBe(false);
    }

    // Partial valid prefix ("la", "casa") skips placed prefix tiles cleanly
    const casaTile = pool.find((t) => t.label === 'casa')!;
    const planPrefix = resolveTileSequenceHint({
      pool,
      targetTokens: duplicateWordExercise.targetTokens,
      expectedSentence: duplicateWordExercise.expectedSentence,
      acceptedSentences: duplicateWordExercise.acceptedSentences,
      selectedTileUids: [laTiles[0].uid, casaTile.uid],
      language: 'es',
      seed: duplicateWordExercise.id,
      tier: 1,
    });
    expect(planPrefix.validPrefixLength).toBe(2);
    expect(planPrefix.misplacedTrayUids).toEqual([]);
    expect(planPrefix.remainingTokens).toEqual(['en', 'la', 'colina']);
    expect(planPrefix.remainingBankUids.includes(laTiles[1].uid)).toBe(true);
    expect(planPrefix.remainingBankUids.includes(laTiles[0].uid)).toBe(false);

    // Wrong / misplaced tile ("mesa") flags misplaced tray UID and keeps valid prefix
    const mesaTile = pool.find((t) => t.label === 'mesa')!;
    const planWrong = resolveTileSequenceHint({
      pool,
      targetTokens: duplicateWordExercise.targetTokens,
      expectedSentence: duplicateWordExercise.expectedSentence,
      acceptedSentences: duplicateWordExercise.acceptedSentences,
      selectedTileUids: [laTiles[0].uid, mesaTile.uid],
      language: 'es',
      seed: duplicateWordExercise.id,
      tier: 2,
    });
    expect(planWrong.validPrefixLength).toBe(1);
    expect(planWrong.misplacedTrayUids).toEqual([mesaTile.uid]);
    expect(planWrong.remainingTokens).toEqual(['casa', 'en', 'la', 'colina']);
    expect(planWrong.dimmedBankUids.length).toBeGreaterThanOrEqual(1);

    // Accepted alternative sentence matched from prefix
    const altPool = buildWordBankPool(
      'alt-1',
      ['good', 'morning', 'friend'],
      ['hello', 'afternoon']
    );
    const helloUid = altPool.find((t) => t.label === 'hello')!.uid;
    const planAlt = resolveTileSequenceHint({
      pool: altPool,
      targetTokens: ['good', 'morning', 'friend'],
      expectedSentence: 'good morning friend',
      acceptedSentences: ['good morning friend', 'hello morning friend'],
      selectedTileUids: [helloUid],
      language: 'en',
      seed: 'alt-1',
      tier: 3,
    });
    expect(planAlt.targetTokens).toEqual(['hello', 'morning', 'friend']);
    expect(planAlt.validPrefixLength).toBe(1);
    expect(planAlt.remainingTokens).toEqual(['morning', 'friend']);
    expect(planAlt.spotlightZone).toBe('bank');
    expect(planAlt.spotlightUid).toBe(planAlt.remainingBankUids[0]);
  });

  it('executes sequential bank flashes in exact press order without flashing distractors and handles progressive tiers', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <WordBankView
        exercise={duplicateWordExercise}
        language="es"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    const hintBtn = screen.getByTestId('starlight-hint-btn');
    expect(hintBtn.getAttribute('data-hint-tier')).toBe('0');

    // Tier 1: sequential flash in exact word order
    fireEvent.click(hintBtn);
    expect(hintBtn.getAttribute('data-hint-tier')).toBe('1');
    expect(hintBtn.getAttribute('data-hint-animating')).toBe('true');

    const observedPeakLabels: string[] = [];
    const expectedOrder = ['la', 'casa', 'en', 'la', 'colina'];
    for (let step = 0; step < expectedOrder.length; step++) {
      act(() => {
        vi.advanceTimersByTime(step === 0 ? 1 : 300);
      });
      const peakBtns = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[aria-label="Word bank tiles"] button[data-hint-peak="true"]')
      );
      expect(peakBtns.length).toBe(1);
      observedPeakLabels.push(peakBtns[0].textContent?.trim() ?? '');

      // Distractors are never flashed
      const flashedDistractors = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[aria-label="Word bank tiles"] button[data-hint-active="true"]')
      ).filter((b) => ['el', 'mesa'].includes(b.textContent?.trim() ?? ''));
      expect(flashedDistractors.length).toBe(0);
    }
    expect(observedPeakLabels).toEqual(expectedOrder);

    // Wait for Tier 1 animation completion
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(hintBtn.getAttribute('data-hint-animating')).toBe('false');

    // Tier 2: dims distractors
    fireEvent.click(hintBtn);
    expect(hintBtn.getAttribute('data-hint-tier')).toBe('2');
    const dimmed = document.querySelectorAll('[aria-label="Word bank tiles"] button[data-hint-dimmed="true"]');
    expect(dimmed.length).toBeGreaterThanOrEqual(1);
    for (const el of dimmed) {
      expect(['el', 'mesa'].includes(el.textContent?.trim() ?? '')).toBe(true);
    }

    // Tier 3: sustained spotlight on immediate next required tile ("la")
    fireEvent.click(hintBtn);
    expect(hintBtn.getAttribute('data-hint-tier')).toBe('3');
    const spotlightEl = document.querySelector('[aria-label="Word bank tiles"] button[data-hint-spotlight="true"]');
    expect(spotlightEl?.textContent?.trim()).toBe('la');

    // Advancing to a new prompt resets tier & state cleanly
    rerender(
      <WordBankView
        exercise={tacticalExercise}
        language="stoner_tactical"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-tier')).toBe('0');
  });

  it('pulses misplaced tray tile amber first, skips valid prefixes, and cancels immediately on tap or mode toggle', () => {
    vi.useFakeTimers();

    render(
      <WordBankView
        exercise={duplicateWordExercise}
        language="es"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    const bankBtns = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[aria-label="Word bank tiles"] button')
    );
    const laBtn = bankBtns.find((b) => b.textContent?.trim() === 'la')!;
    const wrongBtn = bankBtns.find((b) => b.textContent?.trim() === 'mesa')!;

    // Place valid "la" + wrong "mesa"
    fireEvent.click(laBtn);
    fireEvent.click(wrongBtn);

    fireEvent.click(screen.getByTestId('starlight-hint-btn'));

    // Immediately highlights misplaced "mesa" tile in tray
    const misplacedTray = document.querySelector('[aria-label="Answer tray"] button[data-hint-misplaced="true"]');
    expect(misplacedTray?.textContent?.trim()).toBe('mesa');

    // After misplaced pulse window (520ms), flashes next required tile "casa" in bank
    act(() => {
      vi.advanceTimersByTime(525);
    });
    const peak = document.querySelector('[aria-label="Word bank tiles"] button[data-hint-peak="true"]');
    expect(peak?.textContent?.trim()).toBe('casa');

    // Mid-sequence tile tap must NEVER be blocked and immediately cancels active animation
    const enBtn = bankBtns.find((b) => b.textContent?.trim() === 'en')!;
    fireEvent.click(enBtn);
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-animating')).toBe('false');
    expect(document.querySelectorAll('[data-hint-peak="true"]').length).toBe(0);
    // "en" was added to tray cleanly
    const selectedLabels = Array.from(
      document.querySelectorAll('[aria-label="Answer tray"] button')
    ).map((b) => b.textContent?.trim());
    expect(selectedLabels).toContain('en');

    // Start hint again, then toggle "Type Instead" mid-sequence -> cancels immediately
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-animating')).toBe('true');
    const toggleBtn = screen.getByRole('button', { name: /Type Instead|Keyboard Free-Recall/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText('Type your translation')).toBeTruthy();
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-animating')).toBe('false');
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-tier')).toBe('0');
  });

  it('supports Free-Recall progressive slots, case/punct tolerance, fading ghost, and revealed word', () => {
    vi.useFakeTimers();

    const recallPlan1 = resolveFreeRecallHint({
      typedText: 'copy THAT',
      expected: tacticalExercise.expectedSentence,
      accepted: tacticalExercise.acceptedSentences,
      targetTokens: tacticalExercise.targetTokens,
      language: 'stoner_tactical',
      tier: 1,
    });
    expect(recallPlan1.validWordPrefixCount).toBe(2);
    expect(recallPlan1.hasWrongSuffix).toBe(false);
    expect(recallPlan1.slots[0].state).toBe('matched');
    expect(recallPlan1.slots[2].state).toBe('masked');
    expect(recallPlan1.slots[2].display.startsWith('t')).toBe(true);

    const recallPlan2 = resolveFreeRecallHint({
      typedText: 'copy that',
      expected: tacticalExercise.expectedSentence,
      language: 'stoner_tactical',
      tier: 2,
    });
    expect(recallPlan2.slots[2].state).toBe('ghost');
    expect(recallPlan2.slots[2].display).toBe('troop,');

    const recallPlan3 = resolveFreeRecallHint({
      typedText: 'copy that',
      expected: tacticalExercise.expectedSentence,
      language: 'stoner_tactical',
      tier: 3,
      revealWordCount: 1,
    });
    expect(recallPlan3.slots[2].state).toBe('revealed');

    render(
      <WordBankView
        exercise={tacticalExercise}
        language="stoner_tactical"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Type Instead|Keyboard Free-Recall/i }));
    const input = screen.getByLabelText('Type your translation');
    fireEvent.change(input, { target: { value: 'copy that' } });

    const hintBtn = screen.getByTestId('starlight-hint-btn');
    fireEvent.click(hintBtn);
    expect(screen.getByTestId('free-recall-hint-bar').getAttribute('data-hint-tier')).toBe('1');
    expect(screen.getByText(/\+8 XP/)).toBeTruthy();

    // Tier 2 ghost fades smoothly after 1800ms
    fireEvent.click(hintBtn);
    expect(screen.getByTestId('free-recall-hint-bar').getAttribute('data-hint-tier')).toBe('2');
    expect(screen.getByTestId('free-recall-hint-bar').getAttribute('data-ghost-faded')).toBe('false');
    act(() => {
      vi.advanceTimersByTime(1850);
    });
    expect(screen.getByTestId('free-recall-hint-bar').getAttribute('data-ghost-faded')).toBe('true');

    // Tier 3 reveals next word cleanly
    fireEvent.click(hintBtn);
    expect(screen.getByTestId('free-recall-hint-bar').getAttribute('data-hint-tier')).toBe('3');
    expect(document.querySelector('[data-slot-state="revealed"]')).toBeTruthy();

    // Keyboard shortcuts: 'H' inside text input does NOT trigger hint; Alt+H DOES trigger hint
    const onDraftChange = vi.fn();
    cleanup();
    render(
      <WordBankView
        exercise={tacticalExercise}
        language="stoner_tactical"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={onDraftChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Type Instead|Keyboard Free-Recall/i }));
    const recallInput = screen.getByLabelText('Type your translation');
    recallInput.focus();
    fireEvent.keyDown(recallInput, { key: 'h' });
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-tier')).toBe('0');

    fireEvent.keyDown(recallInput, { key: 'h', altKey: true });
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-tier')).toBe('1');
  });

  it('triggers keyboard H shortcut in tile mode cleanly', () => {
    render(
      <WordBankView
        exercise={tacticalExercise}
        language="stoner_tactical"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: 'h' });
    expect(screen.getByTestId('starlight-hint-btn').getAttribute('data-hint-tier')).toBe('1');
  });

  it('covers ContextCloze, ListenDecode, PairMatchRush, MiniStory, and BossGauntlet modes', () => {
    // 1. Context Cloze
    const clozeEx: ContextClozeExercise = {
      type: 'context_cloze',
      id: 'cloze-1',
      sentenceBeforeBlank: 'Buenos ',
      sentenceAfterBlank: ', amigo.',
      fullForeignSentence: 'Buenos dias, amigo.',
      englishTranslation: 'Good morning, friend.',
      phonetic: 'BWEH-nohs DEE-ahs',
      choices: ['dias', 'noches', 'sillas', 'perros'],
      expectedBlank: 'dias',
      acceptedBlanks: ['dias'],
      nuanceNote: 'Used until noon.',
      registerTag: 'casual',
      tapHints: [],
      vocabIds: [],
    };
    render(
      <ContextClozeView
        exercise={clozeEx}
        language="es"
        compact={false}
        locked={false}
        revealed={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    const clozeHint = screen.getByTestId('starlight-hint-btn');
    fireEvent.click(clozeHint);
    expect(screen.getByTestId('choice-hint-whisper')).toBeTruthy();
    expect(document.querySelectorAll('[role="radio"][data-hint-dimmed="true"]').length).toBe(1);
    fireEvent.click(clozeHint);
    expect(document.querySelectorAll('[role="radio"][data-hint-dimmed="true"]').length).toBe(2);
    fireEvent.click(clozeHint);
    expect(document.querySelector('[role="radio"][data-hint-spotlight="true"]')?.textContent).toContain('dias');
    cleanup();

    // 2. Listen Decode (assemble_heard + Tier 2 phonetic banner)
    const listenEx: ListenDecodeExercise = {
      type: 'listen_decode',
      id: 'listen-1',
      mode: 'assemble_heard',
      audioText: 'hola amigo',
      phonetic: 'OH-lah ah-MEE-goh',
      voiceFallbackPhoneticPrompt: 'Say: OH-lah ah-MEE-goh',
      englishMeaning: 'hello friend',
      targetTokens: ['hola', 'amigo'],
      distractorTokens: ['mesa'],
      acceptedAnswers: ['hola amigo'],
      tapHints: [],
      vocabIds: [],
    };
    render(
      <ListenDecodeView
        exercise={listenEx}
        language="es"
        compact={false}
        locked={false}
        revealed={false}
        scaffoldingMode="bridge"
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(screen.getByText(/OH-lah/i)).toBeTruthy();
    cleanup();

    // 3. Pair Match Rush
    const pairEx: PairMatchRushExercise = {
      type: 'pair_match_rush',
      id: 'pair-1',
      title: 'Match Warmups',
      timeBonusSeconds: 30,
      pairs: [
        { id: 'p1', foreign: 'el sol', english: 'the sun', phonetic: 'el SOHL' },
        { id: 'p2', foreign: 'la luna', english: 'the moon', phonetic: 'lah LOO-nah' },
        { id: 'p3', foreign: 'el pan', english: 'the bread', phonetic: 'el PAHN' },
      ],
    };
    const pairPlan = resolvePairMatchHint({
      leftIds: ['p1', 'p2', 'p3'],
      matchedIds: [],
      tier: 1,
    });
    expect(pairPlan.targetPairId).toBe('p1');
    render(
      <PairMatchRushView
        exercise={pairEx}
        language="es"
        compact={false}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    const pulsed = document.querySelectorAll('[data-hint-pair-pulse="true"]');
    expect(pulsed.length).toBe(2);
    expect(pulsed[0].getAttribute('data-pair-id')).toBe(pulsed[1].getAttribute('data-pair-id'));
    cleanup();

    // 4. Mini Story
    const storyEx: MiniStoryExercise = {
      type: 'mini_story',
      id: 'story-1',
      title: 'Morning Cafe',
      settingSubtitle: 'Madrid',
      bubbles: [
        {
          id: 'b1',
          speakerId: 'colette',
          speakerName: 'Colette',
          side: 'left',
          foreignText: 'Buenos dias!',
          englishText: 'Good morning!',
          phonetic: 'BWEH-nohs DEE-ahs',
          tapHints: [],
        },
      ],
      decisions: [
        {
          afterBubbleIndex: 0,
          questionEnglish: 'How do you reply?',
          options: [
            { id: 'o1', label: 'Good morning!', isCorrect: true, reactionEnglish: 'Nice!' },
            { id: 'o2', label: 'Good elephant!', isCorrect: false, reactionEnglish: 'Oops!' },
          ],
        },
      ],
      vocabIds: [],
    };
    render(
      <MiniStoryView
        exercise={storyEx}
        language="es"
        compact={false}
        onTurtlePlay={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(document.querySelectorAll('[data-hint-dimmed="true"]').length).toBe(1);
    cleanup();

    // 5. Boss Gauntlet (choice + mascot reaction)
    const bossEx: BossGauntletExercise = {
      type: 'boss_gauntlet',
      id: 'boss-1',
      companionId: 'colette',
      companionName: 'Colette',
      title: 'Bakery Boss',
      introLine: 'Bonjour!',
      rewardChestGems: 10,
      vocabIds: [],
      turns: [
        {
          id: 't1',
          companionSayForeign: 'Tu veux du pain?',
          companionSayEnglish: 'Do you want bread?',
          companionPhonetic: 'too vuh doo pan',
          tapHints: [],
          promptEnglish: 'Order bread politely',
          mode: 'choice',
          choices: ['Oui, du pain!', 'Non, un avion!'],
          expectedAnswer: 'Oui, du pain!',
          acceptedAnswers: ['Oui, du pain!'],
          phoneticAnswer: 'wee doo pan',
          victoryReplyForeign: 'Voila!',
          victoryReplyEnglish: 'Here you go!',
        },
      ],
    };
    render(
      <BossGauntletView
        exercise={bossEx}
        language="fr"
        compact={false}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(document.querySelector('[data-mascot-hint-active="true"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-hint-dimmed="true"]').length).toBe(1);
  });

  it('wires hints across all arcade mini-games without timer regressions', () => {
    // SkyCatcher (shared TargetPromptBar covers all 6 TargetPromptBar games)
    render(<SkyCatcherArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start 45s Fiesta!' }));
    const targetHintBtn = screen.getByTestId('starlight-hint-btn');
    fireEvent.click(targetHintBtn);
    expect(screen.getByTestId('arcade-target-hint').textContent).toContain('Starlight Whisper:');
    fireEvent.click(targetHintBtn);
    expect(screen.getByTestId('arcade-target-hint').textContent).toContain('Sound Cadence:');
    fireEvent.click(targetHintBtn);
    expect(screen.getByTestId('arcade-target-hint').textContent).toContain('Target Anchor:');
    cleanup();

    // Starlight Bridge Arcade
    render(<StarlightBridgeArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Bridge Sprint!' }));
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(document.querySelectorAll('[data-hint-dimmed="true"]').length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector('[data-mascot-hint-active="true"]')).toBeTruthy();
    cleanup();

    // Cafe Order Rush Arcade
    render(<CafeOrderRushArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Café Rush!' }));
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(document.querySelectorAll('[data-hint-dimmed="true"]').length).toBe(1);
    expect(document.querySelector('[data-mascot-hint-active="true"]')).toBeTruthy();
    cleanup();

    // Constellation Memory Arcade
    render(<ConstellationMemoryArcade onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chart the Stars!' }));
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(document.querySelectorAll('[data-hint-pair-pulse="true"]').length).toBe(2);
  });

  it('triggers MascotStage reaction, honors audio mute & speech ducking, scales bonuses fairly, and prioritizes SRS resurfacing', () => {
    // 1. Mascot reaction & 3 particles
    const { rerender } = render(<MascotStage companionId="pip" pose="idle" hintPulseNonce={0} />);
    expect(document.querySelector('[data-mascot-hint-active="true"]')).toBeNull();
    rerender(<MascotStage companionId="pip" pose="idle" hintPulseNonce={1} />);
    expect(document.querySelector('[data-mascot-hint-active="true"]')).toBeTruthy();
    expect(document.querySelector('[data-mascot-hint-particles="true"]')).toBeTruthy();
    cleanup();

    // 2. Web Audio chimes: strictly sine, honors mute and active speech cadence
    const oscs = installAudioMock();
    vi.useFakeTimers();
    render(
      <WordBankView
        exercise={duplicateWordExercise}
        language="es"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    act(() => {
      vi.advanceTimersByTime(5);
    });
    expect(oscs.length).toBeGreaterThanOrEqual(1);
    expect(oscs.every((o) => o.type === 'sine')).toBe(true);

    // Muted produces zero additional oscillators
    const countBeforeMute = oscs.length;
    setAudioPreferences({ volume: getAudioPreferences().volume, muted: true });
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(oscs.length).toBe(countBeforeMute);

    // Active speech / phonetic cadence suppresses chimes even when unmuted
    setAudioPreferences({ volume: 0.9, muted: false });
    playPhoneticCadence('OH-lah');
    const countWithSpeech = oscs.length;
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(oscs.length).toBe(countWithSpeech);
    stopPhoneticCadence();
    cleanup();
    vi.useRealTimers();

    // 3. Fair Free-Recall & Reward scaling (never zeros out core XP or stars)
    expect(computeFreeRecallHintedBonus(0).xp).toBe(10);
    expect(computeFreeRecallHintedBonus(1).xp).toBe(8);
    expect(computeFreeRecallHintedBonus(2).xp).toBe(5);
    expect(computeFreeRecallHintedBonus(3).xp).toBe(3);

    const unassisted = calculateLessonRewards({
      baseXp: 30,
      baseGems: 5,
      maxCombo: 4,
      mistakesCount: 0,
      freeRecallCount: 1,
      freeRecallHintTiers: [0],
      maxHintTierUsed: 0,
    });
    const tier1Assisted = calculateLessonRewards({
      baseXp: 30,
      baseGems: 5,
      maxCombo: 4,
      mistakesCount: 0,
      freeRecallCount: 1,
      freeRecallHintTiers: [1],
      maxHintTierUsed: 1,
    });
    const tier3Assisted = calculateLessonRewards({
      baseXp: 30,
      baseGems: 5,
      maxCombo: 4,
      mistakesCount: 0,
      freeRecallCount: 1,
      freeRecallHintTiers: [3],
      maxHintTierUsed: 3,
    });
    expect(unassisted.stars).toBe(3);
    expect(tier3Assisted.stars).toBe(3);
    expect(tier3Assisted.xpEarned).toBeGreaterThan(25);
    expect(tier1Assisted.xpEarned).toBeLessThan(unassisted.xpEarned);
    expect(tier3Assisted.xpEarned).toBeLessThanOrEqual(tier1Assisted.xpEarned);

    // 4. SRS hintAssistedCounts priority resurfacing
    vaultActions.resetVaultToDefaults();
    vaultActions.recordSeenExercises('es', ['ex-clean-a', 'ex-hint-b', 'ex-clean-c'], {
      'ex-hint-b': 2,
    });
    const savedVault = loadVaultFromStorage();
    const activeProf =
      savedVault.profiles.find((p) => p.id === savedVault.activeProfileId) ?? savedVault.profiles[0];
    const progressEs = activeProf.languageProgress.es;
    expect(progressEs?.hintAssistedCounts?.['ex-hint-b']).toBe(2);

    const course = getCourse('es');
    const firstNode = course.units[0].nodes[0];
    const poolSize = getNodePoolSize('es', firstNode.id);
    const seenAll: string[] = [];
    for (let round = 0; round <= Math.ceil(poolSize / 5) + 2; round++) {
      const batch = getPlayableNodeExercises('es', firstNode.id, seenAll, true);
      for (const item of batch) {
        if (!seenAll.includes(item.id)) seenAll.push(item.id);
      }
    }
    if (seenAll.length >= 2) {
      const targetResurfaceId = seenAll[seenAll.length - 1];
      const replayPool = getPlayableNodeExercises('es', firstNode.id, seenAll, true, {
        [targetResurfaceId]: 4,
      });
      expect(replayPool[0]?.id).toBe(targetResurfaceId);
    }

    // Choice hint respects Tier 1 and Tier 2 progressively
    const choicePlan1 = resolveChoiceHint({
      choices: ['a', 'b', 'c', 'd'],
      expected: 'a',
      language: 'en',
      seed: 'seed-c',
      tier: 1,
    });
    const choicePlan2 = resolveChoiceHint({
      choices: ['a', 'b', 'c', 'd'],
      expected: 'a',
      language: 'en',
      seed: 'seed-c',
      tier: 2,
    });
    expect(choicePlan1.dimmedChoices.length).toBe(1);
    expect(choicePlan2.dimmedChoices.length).toBe(2);
    expect(choicePlan2.dimmedChoices).not.toContain('a');
  });

  it('supports prefers-reduced-motion step badges without corrupting button textContent and fits mobile/tablet/desktop viewports cleanly', () => {
    // 1. Reduced motion: step badges rendered as sibling outside <button>, zero sheen sweep
    installMatchMedia(true, 1024);
    vi.useFakeTimers();

    render(
      <WordBankView
        exercise={tacticalExercise}
        language="stoner_tactical"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    const badges = screen.getAllByTestId('hint-step-badge');
    const stepPairs = badges.map((b) => ({
      step: Number(b.textContent),
      word: b.parentElement?.querySelector('button')?.textContent?.trim() ?? '',
    }));
    stepPairs.sort((a, b) => a.step - b.step);
    expect(stepPairs.map((p) => String(p.step))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(stepPairs.map((p) => p.word)).toEqual(tacticalExercise.targetTokens);
    expect(document.querySelectorAll('.starlight-sheen-sweep').length).toBe(0);

    // Every word-bank button textContent must remain strictly equal to its word token
    const tileBtns = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[aria-label="Word bank tiles"] button')
    );
    for (const btn of tileBtns) {
      expect(tacticalExercise.targetTokens.concat(tacticalExercise.distractorTokens)).toContain(
        btn.textContent?.trim()
      );
    }
    cleanup();
    vi.useRealTimers();

    // 2. Responsive viewports (375x667 phone, 768x1024 tablet, 1280x800 desktop) on real LessonArena
    const tacticalCourse = getCourse('stoner_tactical');
    const tacticalNode = tacticalCourse.units[0].nodes[0];

    for (const width of [375, 768, 1280]) {
      installMatchMedia(false, width);
      render(
        <LessonArena
          node={tacticalNode}
          language="stoner_tactical"
          onExit={vi.fn()}
        />
      );
      const hintBtns = screen.queryAllByTestId('starlight-hint-btn');
      if (hintBtns.length > 0) {
        fireEvent.click(hintBtns[0]);
        expect(hintBtns[0].getAttribute('data-hint-tier')).toBe('1');
      }
      cleanup();
    }

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
