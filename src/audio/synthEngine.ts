import type { SoundEffectId, SpeechSpeed } from '../types/contracts';

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
  subGain?: number;
  twelfthGain?: number;
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

function getSafeCurrentTime(ctx: AudioContext): number {
  return typeof ctx.currentTime === 'number' && Number.isFinite(ctx.currentTime)
    ? ctx.currentTime
    : 0;
}

function scheduleWarmTone(
  ctx: AudioContext,
  dest: AudioNode,
  spec: ToneSpec,
  collector?: ScheduledNodeHandle[]
): void {
  try {
    const now = getSafeCurrentTime(ctx);
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

    if (spec.subGain && spec.subGain > 0) {
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      const subLevel = ctx.createGain();
      safeSetParam(subLevel.gain, 'setValueAtTime', spec.subGain, startTime);
      safeSetParam(subOsc.frequency, 'setValueAtTime', spec.freq * 0.5, startTime);
      if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
        safeSetParam(
          subOsc.frequency,
          'exponentialRampToValueAtTime',
          spec.endFreq * 0.5,
          stopTime
        );
      }
      subOsc.connect(subLevel);
      subLevel.connect(entryNode);
      subOsc.start(startTime);
      subOsc.stop(stopTime + 0.012);
      oscs.push(subOsc);
    }

    if (spec.twelfthGain && spec.twelfthGain > 0) {
      const twelfthOsc = ctx.createOscillator();
      twelfthOsc.type = 'sine';
      const twelfthLevel = ctx.createGain();
      safeSetParam(twelfthLevel.gain, 'setValueAtTime', spec.twelfthGain, startTime);
      safeSetParam(twelfthOsc.frequency, 'setValueAtTime', spec.freq * 3, startTime);
      if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
        safeSetParam(
          twelfthOsc.frequency,
          'exponentialRampToValueAtTime',
          spec.endFreq * 3,
          stopTime
        );
      }
      twelfthOsc.connect(twelfthLevel);
      twelfthLevel.connect(entryNode);
      twelfthOsc.start(startTime);
      twelfthOsc.stop(stopTime + 0.012);
      oscs.push(twelfthOsc);
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
const BUBBLE_PENTATONIC_SCALE = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51,
] as const;

function scheduleAiryWhooshNoise(ctx: AudioContext, dest: AudioNode): void {
  if (
    typeof ctx.createBuffer !== 'function' ||
    typeof ctx.createBufferSource !== 'function' ||
    typeof ctx.createBiquadFilter !== 'function'
  ) {
    return;
  }
  try {
    const sampleRate = typeof ctx.sampleRate === 'number' && ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
    const durationSec = 0.14;
    const frameCount = Math.max(256, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // Soft pink-weighted airy noise (zero harsh DC clicks)
    let smooth = 0;
    for (let i = 0; i < frameCount; i += 1) {
      const white = Math.random() * 2 - 1;
      smooth = smooth * 0.72 + white * 0.28;
      data[i] = smooth;
    }

    const now = getSafeCurrentTime(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    safeSetParam(bandpass.Q, 'setValueAtTime', 1.1, now);
    safeSetParam(bandpass.frequency, 'setValueAtTime', 380, now);
    safeSetParam(bandpass.frequency, 'exponentialRampToValueAtTime', 1750, now + 0.065);
    safeSetParam(bandpass.frequency, 'exponentialRampToValueAtTime', 640, now + durationSec);

    const env = ctx.createGain();
    safeSetParam(env.gain, 'setValueAtTime', 0.0001, now);
    safeSetParam(env.gain, 'linearRampToValueAtTime', 0.11, now + 0.032);
    safeSetParam(env.gain, 'exponentialRampToValueAtTime', 0.0001, now + durationSec);
    safeSetParam(env.gain, 'setValueAtTime', 0, now + durationSec + 0.004);

    source.connect(bandpass);
    bandpass.connect(env);
    env.connect(dest);
    source.start(now);
    source.stop(now + durationSec + 0.008);
    source.onended = () => {
      try {
        source.disconnect();
        bandpass.disconnect();
        env.disconnect();
      } catch {
        // Ignore already disconnected nodes.
      }
    };
  } catch {
    // Ignore optional noise buffer limitations on constrained environments.
  }
}

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
      {
        freq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.24,
        subGain: 0.14,
        decay: 0.19,
        gain: 0.23,
        filterCutoff: 2400,
      },
      {
        freq: 659.25,
        delay: 0.065,
        wave: 'triangle',
        harmonicGain: 0.26,
        twelfthGain: 0.08,
        decay: 0.22,
        gain: 0.25,
        filterCutoff: 2700,
      },
      {
        freq: 783.99,
        delay: 0.13,
        wave: 'sine',
        harmonicGain: 0.3,
        subGain: 0.12,
        twelfthGain: 0.1,
        decay: 0.36,
        gain: 0.28,
        filterCutoff: 3200,
      },
    ]);
  },

  combo_5x: (ctx, dest) => {
    scheduleSequence(ctx, dest, [
      {
        freq: 587.33,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.22,
        subGain: 0.14,
        decay: 0.18,
        gain: 0.23,
        filterCutoff: 2500,
      },
      {
        freq: 739.99,
        delay: 0.058,
        wave: 'triangle',
        harmonicGain: 0.24,
        twelfthGain: 0.09,
        decay: 0.2,
        gain: 0.24,
        filterCutoff: 2800,
      },
      {
        freq: 880.0,
        delay: 0.116,
        wave: 'sine',
        harmonicGain: 0.26,
        subGain: 0.12,
        decay: 0.26,
        gain: 0.26,
        filterCutoff: 3100,
      },
      {
        freq: 1174.66,
        delay: 0.174,
        wave: 'sine',
        harmonicGain: 0.28,
        subGain: 0.16,
        twelfthGain: 0.1,
        decay: 0.4,
        gain: 0.28,
        filterCutoff: 3400,
      },
    ]);
  },

  combo_fire: (ctx, dest) => {
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    scheduleSequence(ctx, dest, [
      {
        freq: 261.63,
        delay: 0.02,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.02,
        decay: 0.56,
        gain: 0.18,
        filterCutoff: 1400,
      },
      ...notes.map((freq, index) => ({
        freq,
        delay: index * 0.048,
        wave: (index < 3 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.26,
        subGain: index === notes.length - 1 ? 0.16 : 0.08,
        twelfthGain: index >= 3 ? 0.1 : 0,
        attack: 0.007,
        decay: index === notes.length - 1 ? 0.5 : 0.22,
        gain: 0.24,
        filterCutoff: 3400,
      })),
    ]);
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
      {
        freq: 261.63,
        endFreq: 392.0,
        delay: 0,
        wave: 'triangle',
        subGain: 0.14,
        attack: 0.015,
        decay: 0.15,
        gain: 0.2,
        filterCutoff: 1300,
      },
      {
        freq: 523.25,
        delay: 0.095,
        wave: 'triangle',
        harmonicGain: 0.24,
        subGain: 0.14,
        decay: 0.28,
        gain: 0.24,
      },
      {
        freq: 659.25,
        delay: 0.14,
        wave: 'sine',
        harmonicGain: 0.26,
        twelfthGain: 0.09,
        decay: 0.32,
        gain: 0.22,
      },
      {
        freq: 783.99,
        delay: 0.185,
        wave: 'sine',
        harmonicGain: 0.26,
        twelfthGain: 0.1,
        decay: 0.36,
        gain: 0.22,
      },
      {
        freq: 987.77,
        delay: 0.22,
        wave: 'sine',
        harmonicGain: 0.2,
        decay: 0.4,
        gain: 0.18,
      },
      {
        freq: 1174.66,
        delay: 0.255,
        wave: 'sine',
        harmonicGain: 0.28,
        subGain: 0.12,
        decay: 0.46,
        gain: 0.24,
      },
      { freq: 1567.98, delay: 0.3, wave: 'sine', harmonicGain: 0.18, decay: 0.5, gain: 0.18 },
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
      { freq: 392.0, delay: 0, wave: 'triangle', harmonicGain: 0.22, subGain: 0.14, decay: 0.15, gain: 0.22 },
      { freq: 523.25, delay: 0.105, wave: 'triangle', harmonicGain: 0.24, subGain: 0.12, decay: 0.15, gain: 0.24 },
      { freq: 659.25, delay: 0.21, wave: 'triangle', harmonicGain: 0.26, twelfthGain: 0.08, decay: 0.15, gain: 0.25 },
      { freq: 783.99, delay: 0.315, wave: 'sine', harmonicGain: 0.28, subGain: 0.12, decay: 0.19, gain: 0.27 },
      { freq: 659.25, delay: 0.43, wave: 'triangle', harmonicGain: 0.22, decay: 0.15, gain: 0.22 },
      { freq: 523.25, delay: 0.54, wave: 'triangle', subGain: 0.18, harmonicGain: 0.18, decay: 0.62, gain: 0.2 },
      { freq: 659.25, delay: 0.54, wave: 'sine', harmonicGain: 0.16, decay: 0.62, gain: 0.15 },
      { freq: 783.99, delay: 0.54, wave: 'sine', harmonicGain: 0.18, twelfthGain: 0.08, decay: 0.62, gain: 0.17 },
      {
        freq: 1046.5,
        delay: 0.54,
        wave: 'sine',
        harmonicGain: 0.3,
        twelfthGain: 0.1,
        decay: 0.68,
        gain: 0.28,
        filterCutoff: 3400,
      },
    ]);
  },

  star_pop: (ctx, dest, comboIndex) => {
    const tier = Math.max(0, Math.floor(comboIndex));
    if (tier === 0) {
      scheduleSequence(ctx, dest, [
        {
          freq: 523.25,
          delay: 0,
          wave: 'sine',
          harmonicGain: 0.28,
          twelfthGain: 0.1,
          attack: 0.004,
          decay: 0.22,
          gain: 0.25,
          filterCutoff: 3400,
        },
        {
          freq: 1046.5,
          delay: 0.018,
          wave: 'triangle',
          attack: 0.004,
          decay: 0.18,
          gain: 0.14,
          filterCutoff: 3600,
        },
      ]);
      return;
    }

    if (tier === 1) {
      scheduleSequence(ctx, dest, [
        {
          freq: 659.25,
          delay: 0,
          wave: 'sine',
          harmonicGain: 0.3,
          twelfthGain: 0.12,
          attack: 0.004,
          decay: 0.24,
          gain: 0.26,
          filterCutoff: 3600,
        },
        {
          freq: 1318.51,
          delay: 0.022,
          wave: 'triangle',
          attack: 0.004,
          decay: 0.2,
          gain: 0.15,
          filterCutoff: 3800,
        },
      ]);
      return;
    }

    const notes: ToneSpec[] = [
      {
        freq: 783.99,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.26,
        twelfthGain: 0.1,
        attack: 0.004,
        decay: 0.24,
        gain: 0.24,
        filterCutoff: 3600,
      },
      {
        freq: 1046.5,
        delay: 0.042,
        wave: 'sine',
        harmonicGain: 0.3,
        twelfthGain: 0.12,
        attack: 0.004,
        decay: 0.3,
        gain: 0.26,
        filterCutoff: 3800,
      },
      {
        freq: 1567.98,
        delay: 0.082,
        wave: 'sine',
        attack: 0.005,
        decay: 0.28,
        gain: 0.16,
        filterCutoff: 4000,
      },
    ];
    if (tier >= 3) {
      notes.push({
        freq: 1318.51,
        delay: 0.115,
        wave: 'sine',
        attack: 0.005,
        decay: 0.26,
        gain: 0.13,
        filterCutoff: 4000,
      });
    }
    scheduleSequence(ctx, dest, notes);
  },

  whoosh_transition: (ctx, dest) => {
    scheduleAiryWhooshNoise(ctx, dest);
    scheduleSequence(ctx, dest, [
      {
        freq: 261.63,
        endFreq: 587.33,
        delay: 0,
        wave: 'sine',
        harmonicGain: 0.12,
        attack: 0.024,
        decay: 0.115,
        gain: 0.14,
        filterCutoff: 1400,
        filterEndCutoff: 2400,
      },
      {
        freq: 392.0,
        endFreq: 880.0,
        delay: 0.018,
        wave: 'triangle',
        attack: 0.022,
        decay: 0.105,
        gain: 0.09,
        filterCutoff: 1200,
        filterEndCutoff: 2200,
      },
    ]);
  },

  bubble_pop: (ctx, dest, comboIndex) => {
    const idx = Math.max(0, Math.floor(comboIndex)) % BUBBLE_PENTATONIC_SCALE.length;
    const targetFreq = BUBBLE_PENTATONIC_SCALE[idx];
    const startFreq = targetFreq * 0.56;
    const endFreq = targetFreq * 1.16;

    scheduleSequence(ctx, dest, [
      {
        freq: startFreq,
        endFreq,
        delay: 0,
        wave: 'sine',
        harmonicGain: 0.18,
        attack: 0.004,
        decay: 0.072,
        gain: 0.24,
        filterCutoff: 2400,
        filterEndCutoff: 3400,
      },
      {
        freq: targetFreq * 2,
        endFreq: targetFreq * 2.25,
        delay: 0.018,
        wave: 'triangle',
        attack: 0.004,
        decay: 0.052,
        gain: 0.09,
        filterCutoff: 3200,
      },
    ]);
  },

  secret_fanfare: (ctx, dest) => {
    const harpNotes = [349.23, 440.0, 523.25, 659.25, 783.99, 880.0, 1046.5];
    scheduleSequence(ctx, dest, [
      ...harpNotes.map((freq, idx) => ({
        freq,
        delay: idx * 0.046,
        wave: (idx < 3 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.22,
        subGain: idx === 0 ? 0.12 : 0,
        attack: 0.006,
        decay: 0.24,
        gain: 0.2,
        filterCutoff: 3200,
      })),
      {
        freq: 698.46,
        delay: 0.34,
        wave: 'triangle',
        subGain: 0.16,
        harmonicGain: 0.22,
        attack: 0.01,
        decay: 0.4,
        gain: 0.22,
        filterCutoff: 2900,
      },
      {
        freq: 880.0,
        delay: 0.355,
        wave: 'sine',
        harmonicGain: 0.24,
        attack: 0.01,
        decay: 0.4,
        gain: 0.21,
        filterCutoff: 3200,
      },
      {
        freq: 1046.5,
        delay: 0.37,
        wave: 'sine',
        harmonicGain: 0.26,
        twelfthGain: 0.1,
        attack: 0.01,
        decay: 0.41,
        gain: 0.24,
        filterCutoff: 3600,
      },
      {
        freq: 1318.51,
        delay: 0.39,
        wave: 'sine',
        harmonicGain: 0.2,
        attack: 0.01,
        decay: 0.38,
        gain: 0.16,
        filterCutoff: 3800,
      },
    ]);
  },

  tier_unlock: (ctx, dest) => {
    // Bright ascending heroic fifth (G4 -> D5 -> G5) + radiant upper shimmer
    scheduleSequence(ctx, dest, [
      {
        freq: 392.0,
        delay: 0,
        wave: 'triangle',
        subGain: 0.16,
        harmonicGain: 0.22,
        attack: 0.008,
        decay: 0.22,
        gain: 0.24,
        filterCutoff: 2400,
      },
      {
        freq: 587.33,
        delay: 0.085,
        wave: 'triangle',
        harmonicGain: 0.26,
        twelfthGain: 0.08,
        attack: 0.007,
        decay: 0.28,
        gain: 0.26,
        filterCutoff: 3000,
      },
      {
        freq: 783.99,
        delay: 0.175,
        wave: 'sine',
        harmonicGain: 0.28,
        subGain: 0.14,
        twelfthGain: 0.1,
        attack: 0.007,
        decay: 0.44,
        gain: 0.27,
        filterCutoff: 3400,
      },
      {
        freq: 987.77,
        delay: 0.22,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.01,
        decay: 0.36,
        gain: 0.16,
        filterCutoff: 3800,
      },
      {
        freq: 1174.66,
        delay: 0.265,
        wave: 'sine',
        harmonicGain: 0.2,
        attack: 0.01,
        decay: 0.42,
        gain: 0.16,
        filterCutoff: 4000,
      },
      {
        freq: 1567.98,
        delay: 0.31,
        wave: 'sine',
        attack: 0.012,
        decay: 0.48,
        gain: 0.12,
        filterCutoff: 4200,
      },
    ]);
  },

  booster_spark: (ctx, dest) => {
    // Twinkling starlight arpeggio across bright maj9 bell harmonics
    const starNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    scheduleSequence(
      ctx,
      dest,
      starNotes.map((freq, idx) => ({
        freq,
        delay: idx * 0.038,
        wave: (idx < 2 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.24 + (idx >= 3 ? 0.04 : 0),
        twelfthGain: idx === starNotes.length - 1 ? 0.08 : 0,
        attack: 0.005,
        decay: idx === starNotes.length - 1 ? 0.38 : 0.18 + idx * 0.018,
        gain: idx === starNotes.length - 1 ? 0.17 : 0.2,
        filterCutoff: 2800 + idx * 240,
      }))
    );
  },

  free_recall_ace: (ctx, dest) => {
    // Crisp triumphant Dmaj9 flourish + warm chord bloom
    scheduleSequence(ctx, dest, [
      {
        freq: 587.33,
        delay: 0,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.22,
        attack: 0.004,
        decay: 0.15,
        gain: 0.24,
        filterCutoff: 2800,
      },
      {
        freq: 739.99,
        delay: 0.042,
        wave: 'triangle',
        harmonicGain: 0.24,
        attack: 0.004,
        decay: 0.16,
        gain: 0.23,
        filterCutoff: 3100,
      },
      {
        freq: 880.0,
        delay: 0.084,
        wave: 'sine',
        harmonicGain: 0.24,
        attack: 0.004,
        decay: 0.2,
        gain: 0.24,
        filterCutoff: 3400,
      },
      {
        freq: 1108.73,
        delay: 0.126,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.004,
        decay: 0.28,
        gain: 0.2,
        filterCutoff: 3700,
      },
      {
        freq: 587.33,
        delay: 0.168,
        wave: 'triangle',
        subGain: 0.12,
        attack: 0.006,
        decay: 0.38,
        gain: 0.14,
        filterCutoff: 2400,
      },
      {
        freq: 880.0,
        delay: 0.168,
        wave: 'sine',
        attack: 0.006,
        decay: 0.4,
        gain: 0.14,
        filterCutoff: 3000,
      },
      {
        freq: 1318.51,
        delay: 0.168,
        wave: 'sine',
        harmonicGain: 0.24,
        twelfthGain: 0.08,
        attack: 0.005,
        decay: 0.42,
        gain: 0.23,
        filterCutoff: 4000,
      },
    ]);
  },

  laureate_fanfare: (ctx, dest) => {
    // Grand multi-chord festival brass & marimba fanfare (I -> IV -> V -> I maj9)
    scheduleSequence(ctx, dest, [
      // Chord 1: C major herald
      {
        freq: 261.63,
        delay: 0,
        wave: 'triangle',
        subGain: 0.16,
        harmonicGain: 0.2,
        attack: 0.01,
        decay: 0.16,
        gain: 0.18,
        filterCutoff: 2000,
      },
      {
        freq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.24,
        attack: 0.007,
        decay: 0.16,
        gain: 0.21,
        filterCutoff: 2800,
      },
      {
        freq: 659.25,
        delay: 0.012,
        wave: 'sine',
        harmonicGain: 0.2,
        attack: 0.007,
        decay: 0.16,
        gain: 0.16,
        filterCutoff: 3000,
      },
      // Passing marimba pickup
      {
        freq: 587.33,
        delay: 0.12,
        wave: 'triangle',
        harmonicGain: 0.22,
        attack: 0.006,
        decay: 0.13,
        gain: 0.2,
        filterCutoff: 2800,
      },
      {
        freq: 659.25,
        delay: 0.205,
        wave: 'triangle',
        harmonicGain: 0.24,
        attack: 0.006,
        decay: 0.14,
        gain: 0.21,
        filterCutoff: 3000,
      },
      // Chord 2: F major subdominant lift
      {
        freq: 349.23,
        delay: 0.295,
        wave: 'triangle',
        subGain: 0.18,
        harmonicGain: 0.22,
        attack: 0.01,
        decay: 0.2,
        gain: 0.19,
        filterCutoff: 2200,
      },
      {
        freq: 440.0,
        delay: 0.295,
        wave: 'triangle',
        harmonicGain: 0.18,
        attack: 0.01,
        decay: 0.2,
        gain: 0.16,
        filterCutoff: 2600,
      },
      {
        freq: 880.0,
        delay: 0.305,
        wave: 'sine',
        harmonicGain: 0.26,
        attack: 0.007,
        decay: 0.22,
        gain: 0.21,
        filterCutoff: 3400,
      },
      // Chord 3: G major dominant tension
      {
        freq: 392.0,
        delay: 0.455,
        wave: 'triangle',
        subGain: 0.18,
        harmonicGain: 0.22,
        attack: 0.01,
        decay: 0.22,
        gain: 0.19,
        filterCutoff: 2300,
      },
      {
        freq: 493.88,
        delay: 0.455,
        wave: 'triangle',
        harmonicGain: 0.18,
        attack: 0.01,
        decay: 0.22,
        gain: 0.16,
        filterCutoff: 2700,
      },
      {
        freq: 783.99,
        delay: 0.465,
        wave: 'sine',
        harmonicGain: 0.26,
        twelfthGain: 0.08,
        attack: 0.007,
        decay: 0.24,
        gain: 0.22,
        filterCutoff: 3400,
      },
      // Chord 4: Grand festival C major + 9th resolution
      {
        freq: 261.63,
        delay: 0.625,
        wave: 'triangle',
        subGain: 0.18,
        harmonicGain: 0.22,
        twelfthGain: 0.08,
        attack: 0.012,
        decay: 0.85,
        gain: 0.2,
        filterCutoff: 2200,
        filterEndCutoff: 1100,
      },
      {
        freq: 392.0,
        delay: 0.625,
        wave: 'triangle',
        harmonicGain: 0.2,
        attack: 0.012,
        decay: 0.82,
        gain: 0.16,
        filterCutoff: 2600,
      },
      {
        freq: 523.25,
        delay: 0.625,
        wave: 'triangle',
        harmonicGain: 0.24,
        twelfthGain: 0.1,
        attack: 0.01,
        decay: 0.86,
        gain: 0.22,
        filterCutoff: 3200,
      },
      {
        freq: 659.25,
        delay: 0.635,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.01,
        decay: 0.84,
        gain: 0.17,
        filterCutoff: 3400,
      },
      {
        freq: 1046.5,
        delay: 0.655,
        wave: 'sine',
        harmonicGain: 0.28,
        twelfthGain: 0.1,
        attack: 0.008,
        decay: 0.78,
        gain: 0.22,
        filterCutoff: 3800,
      },
      {
        freq: 1174.66,
        delay: 0.725,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.008,
        decay: 0.68,
        gain: 0.15,
        filterCutoff: 3900,
      },
      {
        freq: 1318.51,
        delay: 0.79,
        wave: 'sine',
        harmonicGain: 0.24,
        attack: 0.008,
        decay: 0.74,
        gain: 0.17,
        filterCutoff: 4100,
      },
    ]);
  },

  equip_prop_pet: (ctx, dest) => {
    // Playful two-note wooden toy pop + bright little sparkle
    scheduleSequence(ctx, dest, [
      {
        freq: 330.0,
        endFreq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.004,
        decay: 0.075,
        gain: 0.24,
        filterCutoff: 1500,
        filterEndCutoff: 700,
      },
      {
        freq: 440.0,
        endFreq: 698.46,
        delay: 0.078,
        wave: 'triangle',
        harmonicGain: 0.2,
        attack: 0.004,
        decay: 0.09,
        gain: 0.25,
        filterCutoff: 1800,
        filterEndCutoff: 850,
      },
      {
        freq: 1046.5,
        delay: 0.155,
        wave: 'sine',
        harmonicGain: 0.25,
        attack: 0.005,
        decay: 0.2,
        gain: 0.18,
        filterCutoff: 3600,
      },
      {
        freq: 1567.98,
        delay: 0.205,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.005,
        decay: 0.28,
        gain: 0.16,
        filterCutoff: 4000,
      },
    ]);
  },

  adult_unlock: (ctx, dest) => {
    // Smooth velvet twilight Ebmaj9 chord shimmer for After-Hours Atlas unlock
    scheduleSequence(ctx, dest, [
      {
        freq: 311.13,
        delay: 0,
        wave: 'triangle',
        subGain: 0.16,
        harmonicGain: 0.14,
        attack: 0.025,
        decay: 0.56,
        gain: 0.2,
        filterCutoff: 1450,
        filterEndCutoff: 700,
      },
      {
        freq: 466.16,
        delay: 0.055,
        wave: 'triangle',
        harmonicGain: 0.18,
        attack: 0.022,
        decay: 0.54,
        gain: 0.19,
        filterCutoff: 1850,
        filterEndCutoff: 880,
      },
      {
        freq: 392.0,
        delay: 0.11,
        wave: 'sine',
        harmonicGain: 0.2,
        attack: 0.02,
        decay: 0.52,
        gain: 0.21,
        filterCutoff: 2150,
        filterEndCutoff: 960,
      },
      {
        freq: 587.33,
        delay: 0.165,
        wave: 'sine',
        harmonicGain: 0.22,
        attack: 0.018,
        decay: 0.58,
        gain: 0.22,
        filterCutoff: 2550,
        filterEndCutoff: 1120,
      },
      {
        freq: 698.46,
        delay: 0.22,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.06,
        attack: 0.018,
        decay: 0.64,
        gain: 0.21,
        filterCutoff: 2850,
        filterEndCutoff: 1240,
      },
      {
        freq: 783.99,
        delay: 0.28,
        wave: 'sine',
        harmonicGain: 0.18,
        attack: 0.016,
        decay: 0.66,
        gain: 0.16,
        filterCutoff: 3050,
        filterEndCutoff: 1320,
      },
      {
        freq: 932.33,
        delay: 0.34,
        wave: 'sine',
        harmonicGain: 0.16,
        attack: 0.02,
        decay: 0.7,
        gain: 0.13,
        filterCutoff: 3250,
        filterEndCutoff: 1420,
      },
    ]);
  },
};

const PHRASE_PUNCT_SPLIT_RE =
  /[¡!¿?.,;:"“”()[\]{}«»。？！，、・「」『』（）【】《》〈〉〔〕：；،؟؛।॥/|·•…]+/;
const CJK_KANA_MORA_RE =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF][\u3041\u3043\u3045\u3047\u3049\u3083\u3085\u3087\u308E\u30A1\u30A3\u30A5\u30A7\u30A9\u30E3\u30E5\u30E7\u30EE\u30FC\u3099\u309A\u309D\u309E\u30FD\u30FE]*|[^\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+/g;
const INVISIBLE_OR_TATWEEL_RE = /[\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

function splitCjkMorae(segment: string): string[] {
  const matches = segment.match(CJK_KANA_MORA_RE);
  return matches ? matches : [segment];
}

function parsePhoneticSyllables(phonetic: string): ParsedSyllable[] {
  if (typeof phonetic !== 'string') return [];
  const words = phonetic.trim().split(/\s+/).filter(Boolean);
  const syllables: ParsedSyllable[] = [];

  for (const rawWord of words) {
    const sanitized = rawWord.replace(INVISIBLE_OR_TATWEEL_RE, '');
    if (!sanitized) continue;

    const clauses = sanitized.split(PHRASE_PUNCT_SPLIT_RE).filter(Boolean);
    for (const rawClause of clauses) {
      const clause = rawClause.replace(/^['‘’]+|['‘’]+$/g, '');
      if (!clause) continue;

      let isWordStart = true;
      const parts = clause.split(/[-–—]+/).filter(Boolean);
      for (const part of parts) {
        for (const seg of splitCjkMorae(part)) {
          if (!/[\p{L}\p{N}]/u.test(seg)) continue;
          const letters = seg.replace(/[^\p{L}]/gu, '');
          const hasCaseContrast =
            letters.length > 0 && letters.toUpperCase() !== letters.toLowerCase();
          const stressed = hasCaseContrast && letters === letters.toUpperCase();
          syllables.push({
            text: seg,
            stressed,
            wordBreakBefore: isWordStart && syllables.length > 0,
          });
          isWordStart = false;
          if (syllables.length >= 24) {
            return syllables;
          }
        }
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
  const now = audioCtx ? getSafeCurrentTime(audioCtx) : 0;
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

interface CadenceTimingProfile {
  stepSec: number;
  wordPauseSec: number;
  attack: number;
  stressedDecay: number;
  unstressedDecay: number;
  stressedFilterCutoff: number;
  unstressedFilterCutoff: number;
}

const CADENCE_TIMING_PROFILES: Record<SpeechSpeed, CadenceTimingProfile> = {
  slow: {
    stepSec: 0.275,
    wordPauseSec: 0.14,
    attack: 0.008,
    stressedDecay: 0.26,
    unstressedDecay: 0.18,
    stressedFilterCutoff: 2400,
    unstressedFilterCutoff: 1300,
  },
  normal: {
    stepSec: 0.17,
    wordPauseSec: 0.085,
    attack: 0.008,
    stressedDecay: 0.18,
    unstressedDecay: 0.125,
    stressedFilterCutoff: 2400,
    unstressedFilterCutoff: 1300,
  },
  fluent: {
    stepSec: 0.125,
    wordPauseSec: 0.055,
    attack: 0.006,
    stressedDecay: 0.135,
    unstressedDecay: 0.095,
    stressedFilterCutoff: 2700,
    unstressedFilterCutoff: 1550,
  },
};

function resolveCadenceSpeed(speedOrSlow: boolean | SpeechSpeed): SpeechSpeed {
  if (speedOrSlow === true || speedOrSlow === 'slow') return 'slow';
  if (speedOrSlow === 'fluent') return 'fluent';
  return 'normal';
}

export function playPhoneticCadence(
  text: string,
  speedOrSlow: boolean | SpeechSpeed = false
): Promise<void> {
  stopPhoneticCadence();

  if (typeof text !== 'string' || !text.trim()) {
    return Promise.resolve();
  }

  if (preferences.muted || preferences.volume <= 0) {
    return Promise.resolve();
  }

  const syllables = parsePhoneticSyllables(text);
  if (syllables.length === 0) {
    return Promise.resolve();
  }

  const audio = ensureAudioContext();
  if (!audio) {
    return Promise.resolve();
  }

  const token = ++cadenceTokenCounter;
  const speed = resolveCadenceSpeed(speedOrSlow);
  const profile = CADENCE_TIMING_PROFILES[speed];
  const nodes: ScheduledNodeHandle[] = [];

  let offsetSec = 0;
  for (let i = 0; i < syllables.length; i += 1) {
    const syl = syllables[i];
    if (syl.wordBreakBefore) {
      offsetSec += profile.wordPauseSec;
    }
    if (offsetSec >= 3.95) {
      break;
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
        attack: profile.attack,
        decay: syl.stressed ? profile.stressedDecay : profile.unstressedDecay,
        gain: syl.stressed ? 0.28 : 0.18,
        filterCutoff: syl.stressed
          ? profile.stressedFilterCutoff
          : profile.unstressedFilterCutoff,
        filterEndCutoff: syl.stressed ? 900 : 550,
      },
      nodes
    );

    offsetSec += profile.stepSec;
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
