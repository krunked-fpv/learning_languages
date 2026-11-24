import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPEECH_LOCALE_MAP,
  getSpeechRuntimeState,
  hasNativeVoice,
  playPhoneticCadence,
  playSfx,
  rankVoiceForLanguage,
  setAudioPreferences,
  speakPhrase,
  stopSpeech,
} from '../src/audio';
import { LessonArena } from '../src/components/lesson/LessonArena';
import { ListenDecodeView } from '../src/components/lesson/ListenDecodeView';
import { getCourse } from '../src/curriculum';
import { vaultActions } from '../src/store/useVaultStore';
import { LANGUAGE_LIST, type BaseLanguageCode, type ListenDecodeExercise, type MapNode, type SoundEffectId } from '../src/types/contracts';

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

  it('recovers via 4500ms watchdog with non-blocking marimba cadence rescue when a native utterance hangs (neither onend nor onerror fires)', async () => {
    vi.useFakeTimers();
    const { createdMock, oscTypes } = createMockAudioContext();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: createdMock,
    });
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
    const rescueBefore = getSpeechRuntimeState().watchdogRescueCount ?? 0;

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

    // Advance past 4500ms watchdog timeout: triggers non-blocking marimba rescue & SpeechOutcome v2
    await vi.advanceTimersByTimeAsync(4600);
    const outcome = await speakPromise;
    expect(resolved).toBe(true);
    expect(outcome).toEqual({
      usedNativeVoice: false,
      fallbackActive: true,
      localeUsed: 'es-MX',
      watchdogTriggered: true,
    });
    expect(cancelSpy).toHaveBeenCalled();
    expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    expect(getSpeechRuntimeState().fallbackActive).toBe(true);
    expect(getSpeechRuntimeState().watchdogTriggered).toBe(true);
    expect(getSpeechRuntimeState().watchdogRescueCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(getSpeechRuntimeState().watchdogRescueCount).toBe(rescueBefore + 1);
    expect(oscTypes.length).toBeGreaterThan(0);
    for (const wave of oscTypes) {
      expect(['sine', 'triangle']).toContain(wave);
    }
    stopSpeech();
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

  it('synthesizes all 23 SoundEffectIds using strictly warm sine/triangle waves (no harsh square/sawtooth)', async () => {
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
      'star_pop',
      'whoosh_transition',
      'bubble_pop',
      'secret_fanfare',
      'tier_unlock',
      'booster_spark',
      'free_recall_ace',
      'laureate_fanfare',
      'equip_prop_pet',
    ];
    expect(allSfx).toHaveLength(23);

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

  it('supports 1.12x fluent speech rate, runtimeState.activeSpeed tracking, and crisp marimba cadence across slow/normal/fluent', async () => {
    const { createdMock, oscTypes } = createMockAudioContext();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: createdMock,
    });

    // 1. Native speech rate check: slow = 0.65, normal = 0.95, fluent = 1.12
    const { FakeUtterance, created } = createFakeUtteranceCtor();
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

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
        speak: (utt: MockUtterance) => {
          // Verify activeSpeed while utterance is in flight
          const inFlightSpeed = getSpeechRuntimeState().activeSpeed;
          queueMicrotask(() => {
            expect(['slow', 'normal', 'fluent']).toContain(inFlightSpeed);
            utt.onend?.(new Event('end'));
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

    const slowOut = await speakPhrase({ text: 'Buenos días', language: 'es', speed: 'slow' });
    const normOut = await speakPhrase({ text: 'Buenos días', language: 'es', speed: 'normal' });
    const fluentOut = await speakPhrase({ text: 'Buenos días', language: 'es', speed: 'fluent' });

    expect(slowOut.usedNativeVoice).toBe(true);
    expect(normOut.usedNativeVoice).toBe(true);
    expect(fluentOut.usedNativeVoice).toBe(true);
    expect(created[0].rate).toBe(0.65);
    expect(created[1].rate).toBe(0.95);
    expect(created[2].rate).toBe(1.12);
    expect(getSpeechRuntimeState().activeSpeed).toBeNull();

    // 2. Fallback marimba cadence timing: fluent finishes faster than normal and slow
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

    vi.useFakeTimers();
    let fluentDone = false;
    const fluentCadence = playPhoneticCadence('ah-MEE-goh sah-LOOD', 'fluent').then(() => {
      fluentDone = true;
    });
    await vi.advanceTimersByTimeAsync(800);
    await fluentCadence;
    expect(fluentDone).toBe(true);

    let normalDone = false;
    const normalCadence = playPhoneticCadence('ah-MEE-goh sah-LOOD', 'normal').then(() => {
      normalDone = true;
    });
    await vi.advanceTimersByTimeAsync(800);
    expect(normalDone).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    await normalCadence;
    expect(normalDone).toBe(true);

    let slowDone = false;
    const slowCadence = playPhoneticCadence('ah-MEE-goh sah-LOOD', 'slow').then(() => {
      slowDone = true;
    });
    await vi.advanceTimersByTimeAsync(1100);
    expect(slowDone).toBe(false);
    await vi.advanceTimersByTimeAsync(600);
    await slowCadence;
    expect(slowDone).toBe(true);

    const speakFluentFallback = speakPhrase({
      text: 'Aunque el camino sea largo, seguimos adelante.',
      language: 'es',
      phonetic: 'OWN-keh el kah-MEE-noh SEH-ah LAR-goh',
      speed: 'fluent',
    });
    expect(getSpeechRuntimeState().isSpeaking).toBe(true);
    expect(getSpeechRuntimeState().activeSpeed).toBe('fluent');
    await vi.advanceTimersByTimeAsync(2000);
    const fbOutcome = await speakFluentFallback;
    expect(fbOutcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
    expect(getSpeechRuntimeState().activeSpeed).toBeNull();
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

    // 1. Standalone ListenDecodeView (select_meaning): 1.0x, 0.65x, 1.12x, visible phonetic fallback, draft completion
    const onTurtle1 = vi.fn();
    const onFluent1 = vi.fn();
    const onDraft1 = vi.fn();
    const { unmount } = render(
      createElement(ListenDecodeView, {
        exercise: selectEx,
        language: 'es',
        compact: false,
        locked: false,
        revealed: false,
        onTurtlePlay: onTurtle1,
        onFluentPlay: onFluent1,
        onDraftChange: onDraft1,
      })
    );

    const banner1 = screen.getByRole('note', { name: 'Phonetic clue' });
    expect(banner1).toHaveTextContent(selectEx.voiceFallbackPhoneticPrompt);

    fireEvent.click(screen.getByRole('button', { name: '1.0x Normal speed audio' }));
    fireEvent.click(screen.getByRole('button', { name: '0.65x Slow Turtle audio' }));
    fireEvent.click(screen.getByRole('button', { name: '1.12x Fluent speed audio' }));
    expect(onTurtle1).toHaveBeenCalledTimes(1);
    expect(onFluent1).toHaveBeenCalledTimes(1);

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

  it('maps all 16 languages in SPEECH_LOCALE_MAP, matches arz->ar-EG, id->in-ID, zh->cmn-Hans-CN/zh-CN, and degrades all 16 languages seamlessly to marimba cadence when voices are empty', async () => {
    // 1. SPEECH_LOCALE_MAP completeness across all 16 languages + 'en'
    for (const lang of LANGUAGE_LIST) {
      expect(SPEECH_LOCALE_MAP[lang], `Missing SPEECH_LOCALE_MAP entry for ${lang}`).toBeDefined();
      expect(SPEECH_LOCALE_MAP[lang].length).toBeGreaterThan(0);
    }
    expect(SPEECH_LOCALE_MAP.arz).toContain('ar-EG');
    expect(SPEECH_LOCALE_MAP.id).toContain('in-ID');
    expect(SPEECH_LOCALE_MAP.zh).toEqual(expect.arrayContaining(['zh-CN', 'cmn-Hans-CN']));

    // 2. Empty voices degrade cleanly to marimba cadence across ALL 16 languages (including CJK, Arabic, Indic, Cyrillic)
    const { createdMock, oscTypes } = createMockAudioContext();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: createdMock,
    });

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

    const samplePhonetics: Record<BaseLanguageCode, { text: string; phonetic: string }> = {
      es: { text: '¡Hola!', phonetic: 'OH-lah' },
      fr: { text: 'Bonjour', phonetic: 'bon-ZHOOR' },
      de: { text: 'Hallo', phonetic: 'HAH-loh' },
      it: { text: 'Ciao', phonetic: 'CHOW' },
      pt: { text: 'Olá!', phonetic: 'oh-LAH' },
      en: { text: 'Hello!', phonetic: 'heh-LOH' },
      zh: { text: '你好！', phonetic: 'NEE how' },
      ja: { text: 'こんにちは', phonetic: 'kohn-nee-chee-wah' },
      hi: { text: 'नमस्ते', phonetic: 'nah-mahs-TEH' },
      bn: { text: 'নমস্কার', phonetic: 'noh-mohsh-KAR' },
      ar: { text: 'مرحباً', phonetic: 'mar-HA-ban' },
      arz: { text: 'إزيك', phonetic: 'ez-ZAY-yak' },
      ru: { text: 'Привет!', phonetic: 'pree-VYEHT' },
      id: { text: 'Halo!', phonetic: 'HAH-loh' },
      vi: { text: 'Xin chào!', phonetic: 'seen CHOW' },
      sw: { text: 'Jambo!', phonetic: 'JAHM-boh' },
    };

    vi.useFakeTimers();
    for (const lang of LANGUAGE_LIST) {
      expect(hasNativeVoice(lang)).toBe(false);
      const p = speakPhrase({
        text: samplePhonetics[lang].text,
        language: lang,
        phonetic: samplePhonetics[lang].phonetic,
      });
      await vi.advanceTimersByTimeAsync(2000);
      const outcome = await p;
      expect(outcome).toEqual({ usedNativeVoice: false, fallbackActive: true });
      expect(getSpeechRuntimeState().fallbackActive).toBe(true);
      expect(getSpeechRuntimeState().isSpeaking).toBe(false);
    }
    expect(speakSpy).not.toHaveBeenCalled();
    expect(oscTypes.length).toBeGreaterThan(0);
    for (const wave of oscTypes) {
      expect(['sine', 'triangle']).toContain(wave);
    }
    vi.useRealTimers();

    // 3. Native voice matching & tier ranking for arz (ar-EG), ar (ar-SA), id (in-ID), zh (cmn-Hans-CN / zh-CN), and all 16 languages
    const { FakeUtterance, created } = createFakeUtteranceCtor();
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });

    const makeVoice = (lang: string, name = `Voice ${lang}`): SpeechSynthesisVoice =>
      ({
        name,
        lang,
        localService: true,
        default: false,
        voiceURI: lang,
      }) as SpeechSynthesisVoice;

    const arSaVoice = makeVoice('ar-SA', 'Arabic Saudi');
    const arEgVoice = makeVoice('ar-EG', 'Arabic Egypt');
    const inIdVoice = makeVoice('in-ID', 'Legacy Indonesian');
    const idIdVoice = makeVoice('id-ID', 'Indonesian');
    const cmnVoice = makeVoice('cmn-Hans-CN', 'Mandarin cmn');
    const zhCnVoice = makeVoice('zh-CN', 'Mandarin zh-CN');

    expect(rankVoiceForLanguage(arEgVoice, 'arz')).toBeGreaterThan(rankVoiceForLanguage(arSaVoice, 'arz'));
    expect(rankVoiceForLanguage(arSaVoice, 'ar')).toBeGreaterThan(rankVoiceForLanguage(arEgVoice, 'ar'));
    expect(rankVoiceForLanguage(inIdVoice, 'id')).toBeGreaterThan(0);
    expect(rankVoiceForLanguage(idIdVoice, 'id')).toBeGreaterThan(rankVoiceForLanguage(inIdVoice, 'id'));
    expect(rankVoiceForLanguage(cmnVoice, 'zh')).toBeGreaterThan(0);
    expect(rankVoiceForLanguage(zhCnVoice, 'zh')).toBeGreaterThan(rankVoiceForLanguage(cmnVoice, 'zh'));

    const allNativeVoices: SpeechSynthesisVoice[] = [
      makeVoice('es-MX'),
      makeVoice('fr-FR'),
      makeVoice('de-DE'),
      makeVoice('it-IT'),
      makeVoice('pt-BR'),
      makeVoice('en-US'),
      cmnVoice,
      makeVoice('ja-JP'),
      makeVoice('hi-IN'),
      makeVoice('bn-BD'),
      arSaVoice,
      arEgVoice,
      makeVoice('ru-RU'),
      inIdVoice,
      makeVoice('vi-VN'),
      makeVoice('sw-KE'),
    ];

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices: () => allNativeVoices,
        speak: (utt: MockUtterance) => {
          queueMicrotask(() => {
            utt.onend?.(new Event('end'));
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

    for (const lang of LANGUAGE_LIST) {
      expect(hasNativeVoice(lang), `Expected native voice match for ${lang}`).toBe(true);
    }

    const arzOutcome = await speakPhrase({ text: 'إزيك', language: 'arz', phonetic: 'ez-ZAY-yak' });
    expect(arzOutcome).toEqual({ usedNativeVoice: true, fallbackActive: false, localeUsed: 'ar-EG' });

    const arOutcome = await speakPhrase({ text: 'مرحباً', language: 'ar', phonetic: 'mar-HA-ban' });
    expect(arOutcome).toEqual({ usedNativeVoice: true, fallbackActive: false, localeUsed: 'ar-SA' });

    const idOutcome = await speakPhrase({ text: 'Halo!', language: 'id', phonetic: 'HAH-loh' });
    expect(idOutcome).toEqual({ usedNativeVoice: true, fallbackActive: false, localeUsed: 'in-ID' });

    const zhOutcome = await speakPhrase({ text: '你好', language: 'zh', phonetic: 'NEE how' });
    expect(zhOutcome).toEqual({ usedNativeVoice: true, fallbackActive: false, localeUsed: 'cmn-Hans-CN' });
    expect(created.length).toBeGreaterThanOrEqual(4);
  });
});
