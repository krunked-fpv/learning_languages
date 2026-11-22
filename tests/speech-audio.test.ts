import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSpeechRuntimeState,
  hasNativeVoice,
  playPhoneticCadence,
  playSfx,
  setAudioPreferences,
  speakPhrase,
  stopSpeech,
} from '../src/audio';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../src/components/lesson/ListenDecodeView';
import { getCourse } from '../src/curriculum';
import { vaultActions } from '../src/store/useVaultStore';
import type { ListenDecodeExercise, MapNode, SoundEffectId } from '../src/types/contracts';

interface MockUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechSynthesisErrorEvent) => void) | null;
}

function createFakeUtteranceCtor() {
  const created: MockUtterance[] = [];
  class FakeUtterance implements MockUtterance {
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
      created.push(this);
    }
  }
  return { FakeUtterance, created };
}

function createMockAudioContext() {
  const oscTypes: string[] = [];
  const createdMock = class MockAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    destination = {} as AudioDestinationNode;
    resume = vi.fn().mockResolvedValue(undefined);
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setTargetAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        Q: { value: 1, setValueAtTime: vi.fn() },
        frequency: {
          value: 1000,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    createOscillator() {
      const osc = {
        _type: 'sine' as OscillatorType,
        get type(): OscillatorType {
          return this._type;
        },
        set type(v: OscillatorType) {
          this._type = v;
          oscTypes.push(v);
        },
        frequency: {
          value: 440,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      return osc;
    }
  };
  return { createdMock, oscTypes };
}

describe('Challenge 3-speech: Zero-Stall Speech Fallback, Watchdog & ListenDecodeView Integration', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const originalAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    setAudioPreferences({ volume: 0.85, muted: false });
    stopSpeech();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: originalSpeechSynthesis,
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: originalUtterance,
    });
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext,
    });
  });

  it('degrades cleanly to phonetic cadence when speechSynthesis returns empty voices', async () => {
    const speakSpy = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [],
        speak: speakSpy,
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    expect(hasNativeVoice('es')).toBe(false);
    expect(hasNativeVoice('fr')).toBe(false);
    expect(hasNativeVoice('de')).toBe(false);
    expect(hasNativeVoice('it')).toBe(false);

    const normalOutcome = await speakPhrase({
      text: '¡Buenos días!',
      language: 'es',
      phonetic: 'BWEH-nohs DEE-ahs',
      slow: false,
    });
    expect(normalOutcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(speakSpy).not.toHaveBeenCalled();

    const slowOutcome = await speakPhrase({
      text: 'Bonjour',
      language: 'fr',
      phonetic: 'bon-ZHOOR',
      slow: true,
    });
    expect(slowOutcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    expect(getSpeechRuntimeState().fallbackActive).toBe(true);
  });

  it('recovers via 4500ms watchdog when a native utterance hangs (neither onend nor onerror fires)', async () => {
    vi.useFakeTimers();
    const { FakeUtterance, created } = createFakeUtteranceCtor();
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

    const cancelSpy = vi.fn();
    const speakSpy = vi.fn(); // intentionally never invokes onend or onerror!
    const esVoice = {
      name: 'Google español',
      lang: 'es-MX',
      localService: true,
      default: true,
      voiceURI: 'es-mx',
    } as SpeechSynthesisVoice;

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [esVoice],
        speak: speakSpy,
        cancel: cancelSpy,
        speaking: true,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    expect(hasNativeVoice('es')).toBe(true);

    let resolved = false;
    const speakPromise = speakPhrase({
      text: '¡Hola, amigo!',
      language: 'es',
      phonetic: 'OH-lah, ah-MEE-goh',
      slow: true,
    }).then((outcome) => {
      resolved = true;
      return outcome;
    });

    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(created[0].rate).toBe(0.65);
    expect(getSpeechRuntimeState().isSpeaking).toBe(true);
    expect(resolved).toBe(false);

    // Advance past 4500ms watchdog timeout
    await vi.advanceTimersByTimeAsync(4600);
    const outcome = await speakPromise;
    expect(resolved).toBe(true);
    expect(outcome.usedNativeVoice).toBe(true);
    expect(cancelSpy).toHaveBeenCalled();
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
  });

  it('falls back to phonetic cadence when utterance.onerror fires', async () => {
    const { FakeUtterance } = createFakeUtteranceCtor();
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

    const frVoice = {
      name: 'French Voice',
      lang: 'fr-FR',
      localService: true,
      default: false,
      voiceURI: 'fr-fr',
    } as SpeechSynthesisVoice;

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [frVoice],
        speak: (utt: MockUtterance) => {
          queueMicrotask(() => {
            utt.onerror?.({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent);
          });
        },
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    const outcome = await speakPhrase({
      text: 'Bonjour',
      language: 'fr',
      phonetic: 'bon-ZHOOR',
    });
    expect(outcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
  });

  it('synthesizes all 14 SoundEffectIds using strictly warm sine/triangle waves (no harsh square/sawtooth)', async () => {
    const { createdMock, oscTypes } = createMockAudioContext();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: createdMock,
    });

    const allSfx: SoundEffectId[] = [
      'tile_tap',
      'tile_remove',
      'correct_chime',
      'combo_3x',
      'combo_5x',
      'combo_fire',
      'gentle_nudge',
      'accent_sparkle',
      'heart_win',
      'chest_open',
      'boss_hit',
      'unit_fanfare',
      'button_click',
      'flip_card',
    ];

    for (let i = 0; i < allSfx.length; i++) {
      expect(() => playSfx(allSfx[i], i)).not.toThrow();
    }

    vi.useFakeTimers();
    const cadencePromise = playPhoneticCadence('bon-ZHOOR ah-MEE', false);
    await vi.advanceTimersByTimeAsync(1500);
    await cadencePromise;

    expect(oscTypes.length).toBeGreaterThan(0);
    for (const wave of oscTypes) {
      expect(['sine', 'triangle']).toContain(wave);
    }
  });

  it('renders ListenDecodeView (both select_meaning and assemble_heard) with empty voices, clicks 1.0x & 0.65x, shows phonetic fallback, and completes answers cleanly', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
      },
    });

    const esCourse = getCourse('es');
    const allListenExercises = esCourse.units
      .flatMap((u) => u.nodes)
      .flatMap((n) => n.exercises)
      .filter((ex): ex is ListenDecodeExercise => ex.type === 'listen_decode');

    const selectEx = allListenExercises.find((e) => e.mode === 'select_meaning')!;
    const assembleEx = allListenExercises.find((e) => e.mode === 'assemble_heard')!;
    expect(selectEx).toBeDefined();
    expect(assembleEx).toBeDefined();

    // 1. Standalone ListenDecodeView (select_meaning): 1.0x, 0.65x, visible phonetic fallback, draft completion
    const onTurtle1 = vi.fn();
    const onDraft1 = vi.fn();
    const { unmount } = render(
      createElement(ListenDecodeView, {
        exercise: selectEx,
        language: 'es',
        compact: false,
        locked: false,
        revealed: false,
        onTurtlePlay: onTurtle1,
        onDraftChange: onDraft1,
      })
    );

    const banner1 = screen.getByRole('note', { name: 'Phonetic clue' });
    expect(banner1).toHaveTextContent(selectEx.voiceFallbackPhoneticPrompt);

    fireEvent.click(screen.getByRole('button', { name: '1.0x Normal speed audio' }));
    fireEvent.click(screen.getByRole('button', { name: '0.65x Slow Turtle audio' }));
    expect(onTurtle1).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('radio', { name: selectEx.englishMeaning }));
    expect(onDraft1).toHaveBeenLastCalledWith(
      expect.objectContaining({
        submitted: selectEx.englishMeaning,
        expected: selectEx.englishMeaning,
      })
    );
    unmount();

    // 2. Full LessonArena integration with BOTH select_meaning and assemble_heard exercises
    const testNode: MapNode = {
      id: 'test-listen-node',
      unitId: 'es-u1',
      order: 1,
      nodeType: 'lesson',
      title: 'Listen Endurance Check',
      subtitle: 'Zero-voice fallback verification',
      xpReward: 20,
      gemReward: 5,
      exercises: [selectEx, assembleEx],
      rewardVocabIds: [],
    };

    const onExit = vi.fn();
    render(
      createElement(LessonArena, {
        node: testNode,
        language: 'es',
        onExit,
      })
    );

    // Exercise 1: select_meaning
    expect(screen.getByRole('note', { name: 'Phonetic clue' })).toHaveTextContent(
      selectEx.voiceFallbackPhoneticPrompt
    );
    fireEvent.click(screen.getByRole('button', { name: '1.0x Normal speed audio' }));
    fireEvent.click(screen.getByRole('button', { name: '0.65x Slow Turtle audio' }));
    fireEvent.click(screen.getByRole('radio', { name: selectEx.englishMeaning }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Exercise 2: assemble_heard
    expect(screen.getByRole('note', { name: 'Phonetic clue' })).toHaveTextContent(
      assembleEx.voiceFallbackPhoneticPrompt
    );
    fireEvent.click(screen.getByRole('button', { name: '1.0x Normal speed audio' }));
    fireEvent.click(screen.getByRole('button', { name: '0.65x Slow Turtle audio' }));

    const bank = screen.getByLabelText('Word bank tiles');
    const availableTiles = Array.from(bank.querySelectorAll('button'));
    for (const targetTok of assembleEx.targetTokens ?? []) {
      const btn = availableTiles.find(
        (b) => b.textContent?.trim() === targetTok && !(b as HTMLButtonElement).disabled
      );
      expect(btn, `Missing tile "${targetTok}" in assemble_heard`).toBeDefined();
      fireEvent.click(btn!);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Victory screen reached cleanly without stalling
    expect(screen.getByText(`${testNode.title} Complete!`)).toBeInTheDocument();
  });
});
