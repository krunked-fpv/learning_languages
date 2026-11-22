import type { SoundEffectId } from '../types/contracts';

export interface AudioPreferences {
  volume: number;
  muted: boolean;
}

const AUDIO_PREFS_STORAGE_KEY = 'wanderling.audio.v1';
const VAULT_STORAGE_KEY = 'wanderling.vault.v1';
const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  volume: 0.85,
  muted: false,
};

type WarmWaveform = 'sine' | 'triangle';

interface ToneSpec {
  freq: number;
  endFreq?: number;
  delay?: number;
  attack?: number;
  decay?: number;
  gain?: number;
  wave?: WarmWaveform;
  harmonicGain?: number;
  filterCutoff?: number;
  filterEndCutoff?: number;
}

interface ScheduledNodeHandle {
  oscs: OscillatorNode[];
  env: GainNode;
}

interface ActiveCadenceHandle {
  token: number;
  timerId: ReturnType<typeof setTimeout> | null;
  resolve: () => void;
  nodes: ScheduledNodeHandle[];
}

interface ParsedSyllable {
  text: string;
  stressed: boolean;
  wordBreakBefore: boolean;
}

type AudioContextCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;
let audioCtxCtorUsed: AudioContextCtor | null = null;
let masterGain: GainNode | null = null;
let unlockListenersAttached = false;
let cadenceTokenCounter = 0;
let activeCadence: ActiveCadenceHandle | null = null;
let preferences: AudioPreferences = readInitialPreferences();

attachUnlockListeners();

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AUDIO_PREFERENCES.volume;
  return Math.min(1, Math.max(0, value));
}

function readInitialPreferences(): AudioPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }
  try {
    const rawAudio = window.localStorage?.getItem(AUDIO_PREFS_STORAGE_KEY);
    if (rawAudio) {
      const parsed = JSON.parse(rawAudio) as Partial<AudioPreferences>;
      if (typeof parsed.volume === 'number' || typeof parsed.muted === 'boolean') {
        return {
          volume: clampVolume(parsed.volume ?? DEFAULT_AUDIO_PREFERENCES.volume),
          muted: Boolean(parsed.muted ?? DEFAULT_AUDIO_PREFERENCES.muted),
        };
      }
    }
    const rawVault = window.localStorage?.getItem(VAULT_STORAGE_KEY);
    if (rawVault) {
      const parsedVault = JSON.parse(rawVault) as {
        audioSettings?: Partial<AudioPreferences>;
      };
      if (parsedVault?.audioSettings) {
        return {
          volume: clampVolume(
            parsedVault.audioSettings.volume ?? DEFAULT_AUDIO_PREFERENCES.volume
          ),
          muted: Boolean(
            parsedVault.audioSettings.muted ?? DEFAULT_AUDIO_PREFERENCES.muted
          ),
        };
      }
    }
  } catch {
    // Ignore storage access or malformed JSON errors in restricted environments.
  }
  return { ...DEFAULT_AUDIO_PREFERENCES };
}

function persistPreferences(next: AudioPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(AUDIO_PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable in private browsing or SSR contexts.
  }
}

function getAudioContextConstructor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const ctor = win.AudioContext ?? win.webkitAudioContext;
  return typeof ctor === 'function' ? ctor : null;
}

function syncMasterGain(): void {
  if (!audioCtx || !masterGain) return;
  const target = preferences.muted ? 0 : preferences.volume;
  try {
    if (typeof masterGain.gain.setTargetAtTime === 'function') {
      masterGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.015);
    } else if (typeof masterGain.gain.setValueAtTime === 'function') {
      masterGain.gain.setValueAtTime(target, audioCtx.currentTime);
    } else {
      masterGain.gain.value = target;
    }
  } catch {
    try {
      masterGain.gain.value = target;
    } catch {
      // Ignore read-only mock gains.
    }
  }
}

function resumeAudioContextSafely(ctx: AudioContext): void {
  if (ctx.state !== 'suspended' || typeof ctx.resume !== 'function') return;
  try {
    const maybePromise = ctx.resume();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then(() => {
          if (ctx.state === 'running') {
            detachUnlockListeners();
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore autoplay-policy errors before an interactive gesture.
  }
}

function handleUserInteractionUnlock(): void {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  resumeAudioContextSafely(ctx.ctx);
  if (ctx.ctx.state === 'running') {
    detachUnlockListeners();
  }
}

function attachUnlockListeners(): void {
  if (unlockListenersAttached || typeof window === 'undefined') return;
  if (typeof window.addEventListener !== 'function') return;
  try {
    window.addEventListener('pointerdown', handleUserInteractionUnlock, {
      capture: true,
      passive: true,
    });
    window.addEventListener('keydown', handleUserInteractionUnlock, {
      capture: true,
      passive: true,
    });
    unlockListenersAttached = true;
  } catch {
    // Ignore environments with non-standard event targets.
  }
}

function detachUnlockListeners(): void {
  if (!unlockListenersAttached || typeof window === 'undefined') return;
  if (typeof window.removeEventListener !== 'function') return;
  try {
    window.removeEventListener('pointerdown', handleUserInteractionUnlock, true);
    window.removeEventListener('keydown', handleUserInteractionUnlock, true);
  } catch {
    // Ignore listener cleanup errors.
  }
  unlockListenersAttached = false;
}

function ensureAudioContext(): { ctx: AudioContext; master: GainNode } | null {
  attachUnlockListeners();
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return null;

  if (audioCtx && (audioCtx.state === 'closed' || audioCtxCtorUsed !== Ctor)) {
    audioCtx = null;
    audioCtxCtorUsed = null;
    masterGain = null;
  }

  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
      audioCtxCtorUsed = Ctor;
      masterGain = audioCtx.createGain();
      const target = preferences.muted ? 0 : preferences.volume;
      masterGain.gain.value = target;
      masterGain.connect(audioCtx.destination);
    } catch {
      audioCtx = null;
      audioCtxCtorUsed = null;
      masterGain = null;
      return null;
    }
  }

  if (!masterGain) {
    try {
      masterGain = audioCtx.createGain();
      masterGain.gain.value = preferences.muted ? 0 : preferences.volume;
      masterGain.connect(audioCtx.destination);
    } catch {
      return null;
    }
  }

  resumeAudioContextSafely(audioCtx);
  return { ctx: audioCtx, master: masterGain };
}

function safeSetParam(
  param: AudioParam | undefined,
  method: 'setValueAtTime' | 'linearRampToValueAtTime' | 'exponentialRampToValueAtTime',
  value: number,
  time: number
): void {
  if (!param) return;
  try {
    const fn = param[method];
    if (typeof fn === 'function') {
      fn.call(param, value, time);
    } else if (method === 'setValueAtTime') {
      param.value = value;
    }
  } catch {
    // Ignore mock or out-of-range AudioParam timing edge cases.
  }
}

function scheduleWarmTone(
  ctx: AudioContext,
  dest: AudioNode,
  spec: ToneSpec,
  collector?: ScheduledNodeHandle[]
): void {
  try {
    const now = typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    const startTime = now + Math.max(0, spec.delay ?? 0);
    const attack = Math.max(0.004, spec.attack ?? 0.008);
    const decay = Math.max(0.03, spec.decay ?? 0.16);
    const peakGain = Math.max(0.005, Math.min(0.6, spec.gain ?? 0.25));
    const stopTime = startTime + attack + decay;

    const env = ctx.createGain();
    safeSetParam(env.gain, 'setValueAtTime', 0.0001, startTime);
    safeSetParam(env.gain, 'linearRampToValueAtTime', peakGain, startTime + attack);
    safeSetParam(env.gain, 'exponentialRampToValueAtTime', 0.0001, stopTime);
    safeSetParam(env.gain, 'setValueAtTime', 0, stopTime + 0.004);

    let entryNode: AudioNode = env;

    if (typeof ctx.createBiquadFilter === 'function') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (filter.Q) {
        safeSetParam(filter.Q, 'setValueAtTime', 1.4, startTime);
      }
      const cutoffStart = spec.filterCutoff ?? 2200;
      const cutoffEnd = spec.filterEndCutoff ?? Math.max(400, cutoffStart * 0.55);
      safeSetParam(filter.frequency, 'setValueAtTime', cutoffStart, startTime);
      safeSetParam(
        filter.frequency,
        'exponentialRampToValueAtTime',
        Math.max(120, cutoffEnd),
        stopTime
      );
      filter.connect(env);
      entryNode = filter;
    }

    env.connect(dest);

    const oscs: OscillatorNode[] = [];
    const mainOsc = ctx.createOscillator();
    mainOsc.type = spec.wave ?? 'triangle';
    safeSetParam(mainOsc.frequency, 'setValueAtTime', spec.freq, startTime);
    if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
      safeSetParam(mainOsc.frequency, 'exponentialRampToValueAtTime', spec.endFreq, stopTime);
    }
    mainOsc.connect(entryNode);
    mainOsc.start(startTime);
    mainOsc.stop(stopTime + 0.012);
    oscs.push(mainOsc);

    if (spec.harmonicGain && spec.harmonicGain > 0) {
      const overtoneOsc = ctx.createOscillator();
      overtoneOsc.type = 'sine';
      const overtoneGain = ctx.createGain();
      safeSetParam(overtoneGain.gain, 'setValueAtTime', spec.harmonicGain, startTime);
      safeSetParam(overtoneOsc.frequency, 'setValueAtTime', spec.freq * 2, startTime);
      if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
        safeSetParam(
          overtoneOsc.frequency,
          'exponentialRampToValueAtTime',
          spec.endFreq * 2,
          stopTime
        );
      }
      overtoneOsc.connect(overtoneGain);
      overtoneGain.connect(entryNode);
      overtoneOsc.start(startTime);
      overtoneOsc.stop(stopTime + 0.012);
      oscs.push(overtoneOsc);
    }

    if (collector) {
      collector.push({ oscs, env });
    }

    mainOsc.onended = () => {
      try {
        mainOsc.disconnect();
        env.disconnect();
      } catch {
        // Ignore already disconnected nodes.
      }
    };
  } catch {
    // Never propagate Web Audio scheduling failures.
  }
}

function scheduleSequence(ctx: AudioContext, dest: AudioNode, notes: readonly ToneSpec[]): void {
  for (const note of notes) {
    scheduleWarmTone(ctx, dest, note);
  }
}

const TAP_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5] as const;

const SFX_RECIPES: Record<
  SoundEffectId,
  (ctx: AudioContext, dest: AudioNode, comboIndex: number) => void
> = {
  tile_tap: (ctx, dest, comboIndex) => {
    const idx = Math.max(0, Math.floor(comboIndex)) % TAP_SCALE.length;
    const freq = TAP_SCALE[idx];
    scheduleWarmTone(ctx, dest, {
      freq,
      wave: 'triangle',
      harmonicGain: 0.22,
      attack: 0.005,
      decay: 0.095,
      gain: 0.24,
      filterCutoff: 2100,
      filterEndCutoff: 780,
    });
  },

  tile_remove: (ctx, dest) => {
    scheduleWarmTone(ctx, dest, {
      freq: 440,
      endFreq: 311.13,
      wave: 'sine',
      harmonicGain: 0.1,
      attack: 0.006,
      decay: 0.1,
      gain: 0.2,
      filterCutoff: 1200,
      filterEndCutoff: 500,
    });
  },

  button_click: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      {
        freq: 660,
        endFreq: 523.25,
        wave: 'sine',
        attack: 0.004,
        decay: 0.055,
        gain: 0.18,
        filterCutoff: 1800,
      },
      {
        freq: 1046.5,
        wave: 'triangle',
        attack: 0.004,
        decay: 0.032,
        gain: 0.08,
        filterCutoff: 1500,
      },
    ]);
  },

  flip_card: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      {
        freq: 392.0,
        delay: 0,
        wave: 'sine',
        attack: 0.01,
        decay: 0.09,
        gain: 0.16,
        filterCutoff: 1400,
      },
      {
        freq: 587.33,
        delay: 0.045,
        wave: 'triangle',
        harmonicGain: 0.15,
        attack: 0.01,
        decay: 0.14,
        gain: 0.2,
        filterCutoff: 2200,
      },
    ]);
  },

  correct_chime: (ctx, dest, comboIndex) => {
    const semitoneLift = Math.min(4, Math.max(0, Math.floor(comboIndex)));
    const factor = Math.pow(2, semitoneLift / 12);
    scheduleSequence(ctx, dest, [
      {
        freq: 523.25 * factor,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.2,
        attack: 0.008,
        decay: 0.18,
        gain: 0.24,
        filterCutoff: 2300,
      },
      {
        freq: 659.25 * factor,
        delay: 0.065,
        wave: 'sine',
        harmonicGain: 0.24,
        attack: 0.008,
        decay: 0.28,
        gain: 0.26,
        filterCutoff: 2800,
      },
      {
        freq: 783.99 * factor,
        delay: 0.08,
        wave: 'sine',
        attack: 0.012,
        decay: 0.3,
        gain: 0.15,
        filterCutoff: 2600,
      },
    ]);
  },

  combo_3x: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      { freq: 523.25, delay: 0, wave: 'triangle', harmonicGain: 0.18, decay: 0.16, gain: 0.22 },
      { freq: 659.25, delay: 0.065, wave: 'triangle', harmonicGain: 0.2, decay: 0.18, gain: 0.24 },
      { freq: 783.99, delay: 0.13, wave: 'sine', harmonicGain: 0.28, decay: 0.32, gain: 0.28 },
    ]);
  },

  combo_5x: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      { freq: 587.33, delay: 0, wave: 'triangle', harmonicGain: 0.2, decay: 0.16, gain: 0.22 },
      { freq: 739.99, delay: 0.058, wave: 'triangle', harmonicGain: 0.22, decay: 0.18, gain: 0.24 },
      { freq: 880.0, delay: 0.116, wave: 'sine', harmonicGain: 0.24, decay: 0.22, gain: 0.26 },
      { freq: 1174.66, delay: 0.174, wave: 'sine', harmonicGain: 0.26, decay: 0.36, gain: 0.28 },
    ]);
  },

  combo_fire: (ctx, dest) => {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    scheduleSequence(
      ctx,
      dest,
      notes.map((freq, index) => ({
        freq,
        delay: index * 0.05,
        wave: index < 3 ? 'triangle' : 'sine',
        harmonicGain: 0.24,
        attack: 0.007,
        decay: index === notes.length - 1 ? 0.46 : 0.2,
        gain: 0.24,
        filterCutoff: 3200,
      }))
    );
  },

  gentle_nudge: (ctx, dest) => {
    // Felt-mallet soft warm woodblock double-tap (friendly "try again", never harsh)
    scheduleSequence(ctx, dest, [
      {
        freq: 293.66,
        delay: 0,
        wave: 'sine',
        attack: 0.015,
        decay: 0.13,
        gain: 0.2,
        filterCutoff: 560,
        filterEndCutoff: 340,
      },
      {
        freq: 261.63,
        delay: 0.115,
        wave: 'sine',
        attack: 0.016,
        decay: 0.16,
        gain: 0.18,
        filterCutoff: 500,
        filterEndCutoff: 300,
      },
    ]);
  },

  accent_sparkle: (ctx, dest) => {
    const bells = [783.99, 987.77, 1174.66, 1567.98];
    scheduleSequence(
      ctx,
      dest,
      bells.map((freq, idx) => ({
        freq,
        delay: idx * 0.048,
        wave: 'sine',
        harmonicGain: 0.28,
        attack: 0.006,
        decay: idx === bells.length - 1 ? 0.38 : 0.22,
        gain: 0.21,
        filterCutoff: 3600,
      }))
    );
  },

  heart_win: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      { freq: 349.23, delay: 0, wave: 'sine', attack: 0.012, decay: 0.12, gain: 0.22, filterCutoff: 1100 },
      { freq: 440.0, delay: 0.085, wave: 'triangle', harmonicGain: 0.16, attack: 0.01, decay: 0.16, gain: 0.23 },
      { freq: 523.25, delay: 0.16, wave: 'sine', harmonicGain: 0.2, decay: 0.24, gain: 0.25 },
      { freq: 698.46, delay: 0.235, wave: 'sine', harmonicGain: 0.25, decay: 0.36, gain: 0.27 },
    ]);
  },

  chest_open: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      { freq: 261.63, endFreq: 392.0, delay: 0, wave: 'triangle', attack: 0.015, decay: 0.15, gain: 0.2, filterCutoff: 1200 },
      { freq: 523.25, delay: 0.1, wave: 'triangle', harmonicGain: 0.22, decay: 0.26, gain: 0.24 },
      { freq: 659.25, delay: 0.145, wave: 'sine', harmonicGain: 0.24, decay: 0.28, gain: 0.22 },
      { freq: 783.99, delay: 0.19, wave: 'sine', harmonicGain: 0.24, decay: 0.32, gain: 0.22 },
      { freq: 1174.66, delay: 0.235, wave: 'sine', harmonicGain: 0.26, decay: 0.42, gain: 0.24 },
      { freq: 1567.98, delay: 0.285, wave: 'sine', decay: 0.46, gain: 0.18 },
    ]);
  },

  boss_hit: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      {
        freq: 196.0,
        endFreq: 78.0,
        delay: 0,
        wave: 'sine',
        attack: 0.005,
        decay: 0.14,
        gain: 0.32,
        filterCutoff: 520,
        filterEndCutoff: 180,
      },
      { freq: 440.0, delay: 0.025, wave: 'triangle', harmonicGain: 0.2, decay: 0.16, gain: 0.22 },
      { freq: 554.37, delay: 0.065, wave: 'triangle', harmonicGain: 0.22, decay: 0.18, gain: 0.22 },
      { freq: 659.25, delay: 0.105, wave: 'sine', harmonicGain: 0.26, decay: 0.28, gain: 0.24 },
    ]);
  },

  unit_fanfare: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      { freq: 392.0, delay: 0, wave: 'triangle', harmonicGain: 0.2, decay: 0.14, gain: 0.22 },
      { freq: 523.25, delay: 0.105, wave: 'triangle', harmonicGain: 0.22, decay: 0.14, gain: 0.24 },
      { freq: 659.25, delay: 0.21, wave: 'triangle', harmonicGain: 0.24, decay: 0.14, gain: 0.25 },
      { freq: 783.99, delay: 0.315, wave: 'sine', harmonicGain: 0.26, decay: 0.18, gain: 0.27 },
      { freq: 659.25, delay: 0.43, wave: 'triangle', harmonicGain: 0.2, decay: 0.14, gain: 0.22 },
      { freq: 523.25, delay: 0.54, wave: 'triangle', decay: 0.58, gain: 0.18 },
      { freq: 783.99, delay: 0.54, wave: 'sine', decay: 0.58, gain: 0.16 },
      { freq: 1046.5, delay: 0.54, wave: 'sine', harmonicGain: 0.28, decay: 0.64, gain: 0.28 },
    ]);
  },

  star_pop: (ctx, dest, comboIndex) => {
    SFX_RECIPES.accent_sparkle(ctx, dest, comboIndex);
  },

  whoosh_transition: (ctx, dest, comboIndex) => {
    SFX_RECIPES.flip_card(ctx, dest, comboIndex);
  },

  bubble_pop: (ctx, dest, comboIndex) => {
    SFX_RECIPES.tile_tap(ctx, dest, comboIndex);
  },

  secret_fanfare: (ctx, dest, comboIndex) => {
    SFX_RECIPES.unit_fanfare(ctx, dest, comboIndex);
  },
};

function parsePhoneticSyllables(phonetic: string): ParsedSyllable[] {
  const words = phonetic
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const syllables: ParsedSyllable[] = [];

  for (let w = 0; w < words.length; w += 1) {
    const cleanedWord = words[w].replace(/^[¡!¿?.,;:"()[\]«»]+|[¡!¿?.,;:"()[\]«»]+$/g, '');
    if (!cleanedWord) continue;
    const parts = cleanedWord.split(/[-–—]+/).filter(Boolean);
    for (let p = 0; p < parts.length; p += 1) {
      const part = parts[p];
      const letters = part.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
      const hasCaseContrast = letters.length > 0 && letters.toUpperCase() !== letters.toLowerCase();
      const stressed = hasCaseContrast && letters === letters.toUpperCase();
      syllables.push({
        text: part,
        stressed,
        wordBreakBefore: w > 0 && p === 0 && syllables.length > 0,
      });
      if (syllables.length >= 24) {
        return syllables;
      }
    }
  }

  return syllables;
}

export function getAudioPreferences(): AudioPreferences {
  return { ...preferences };
}

export function setAudioPreferences(settings: { volume: number; muted: boolean }): void {
  preferences = {
    volume: clampVolume(settings.volume),
    muted: Boolean(settings.muted),
  };
  persistPreferences(preferences);
  syncMasterGain();
  if (preferences.muted) {
    stopPhoneticCadence();
  }
}

export function playSfx(id: SoundEffectId, comboIndex = 0): void {
  if (preferences.muted || preferences.volume <= 0) return;
  const audio = ensureAudioContext();
  if (!audio) return;
  const recipe = SFX_RECIPES[id];
  if (!recipe) return;
  try {
    recipe(audio.ctx, audio.master, comboIndex);
  } catch {
    // Never let audio glitches interrupt gameplay.
  }
}

export function stopPhoneticCadence(): void {
  if (!activeCadence) return;
  const current = activeCadence;
  activeCadence = null;
  if (current.timerId !== null) {
    clearTimeout(current.timerId);
  }
  const now = audioCtx && typeof audioCtx.currentTime === 'number' ? audioCtx.currentTime : 0;
  for (const node of current.nodes) {
    try {
      safeSetParam(node.env.gain, 'setValueAtTime', 0.0001, now);
      for (const osc of node.oscs) {
        try {
          osc.stop(now + 0.01);
        } catch {
          // Ignore oscillators already stopped.
        }
      }
    } catch {
      // Ignore cleanup errors.
    }
  }
  current.resolve();
}

const UNSTRESSED_MARIMBA_NOTES = [392.0, 440.0, 493.88, 523.25] as const;
const STRESSED_MARIMBA_NOTES = [587.33, 659.25, 783.99, 880.0] as const;

export function playPhoneticCadence(phonetic: string, slow = false): Promise<void> {
  stopPhoneticCadence();

  if (preferences.muted || preferences.volume <= 0) {
    return Promise.resolve();
  }

  const syllables = parsePhoneticSyllables(phonetic);
  if (syllables.length === 0) {
    return Promise.resolve();
  }

  const audio = ensureAudioContext();
  if (!audio) {
    return Promise.resolve();
  }

  const token = ++cadenceTokenCounter;
  const stepSec = slow ? 0.275 : 0.17;
  const wordPauseSec = slow ? 0.14 : 0.085;
  const nodes: ScheduledNodeHandle[] = [];

  let offsetSec = 0;
  for (let i = 0; i < syllables.length; i += 1) {
    const syl = syllables[i];
    if (syl.wordBreakBefore) {
      offsetSec += wordPauseSec;
    }
    const baseFreq = syl.stressed
      ? STRESSED_MARIMBA_NOTES[i % STRESSED_MARIMBA_NOTES.length]
      : UNSTRESSED_MARIMBA_NOTES[i % UNSTRESSED_MARIMBA_NOTES.length];

    scheduleWarmTone(
      audio.ctx,
      audio.master,
      {
        freq: baseFreq,
        delay: offsetSec,
        wave: syl.stressed ? 'triangle' : 'sine',
        harmonicGain: syl.stressed ? 0.24 : 0.08,
        attack: 0.008,
        decay: slow ? (syl.stressed ? 0.26 : 0.18) : syl.stressed ? 0.18 : 0.125,
        gain: syl.stressed ? 0.28 : 0.18,
        filterCutoff: syl.stressed ? 2400 : 1300,
        filterEndCutoff: syl.stressed ? 900 : 550,
      },
      nodes
    );

    offsetSec += stepSec;
  }

  const totalMs = Math.min(4200, Math.round((offsetSec + 0.08) * 1000));

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (activeCadence && activeCadence.token === token) {
        activeCadence = null;
      }
      resolve();
    };

    const timerId = setTimeout(finish, totalMs);
    activeCadence = {
      token,
      timerId,
      resolve: finish,
      nodes,
    };
  });
}
