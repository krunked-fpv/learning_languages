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
  /** Subtle inharmonic acoustic bar partial (e.g., 2.76x marimba/kalimba/celesta bar) */
  barPartialRatio?: number;
  barPartialGain?: number;
  /** Gentle detuned glass-celesta / wind-chime shimmer companion in cents (e.g., 3.5..5) */
  shimmerCents?: number;
  shimmerGain?: number;
  filterCutoff?: number;
  filterEndCutoff?: number;
  filterQ?: number;
}

type NoiseTexture = 'wood' | 'paper' | 'felt';

interface NoiseBufferBank {
  wood: AudioBuffer;
  paper: AudioBuffer;
  felt: AudioBuffer;
}

interface NoiseSpec {
  texture?: NoiseTexture;
  delay?: number;
  duration: number;
  attack: number;
  gain: number;
  type: 'lowpass' | 'bandpass';
  freq: number;
  endFreq?: number;
  q?: number;
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
let activeHintNodes: ScheduledNodeHandle[] = [];
let preferences: AudioPreferences = readInitialPreferences();
const noiseBankCache = new WeakMap<AudioContext, NoiseBufferBank>();
const NOISE_BANK_DURATION_SEC = 0.36;

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

function connectMasterChain(ctx: AudioContext, gain: GainNode): void {
  // Heirloom lamp-light master stage: gentle 6.8kHz warm roll-off + headroom limiter.
  // Falls back cleanly to direct destination on minimal/jsdom AudioContext mocks.
  let tail: AudioNode = gain;
  try {
    if (typeof ctx.createBiquadFilter === 'function') {
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      safeSetParam(warm.frequency, 'setValueAtTime', 6800, 0);
      safeSetParam(warm.Q, 'setValueAtTime', 0.55, 0);
      tail.connect(warm);
      tail = warm;
    }
    if (typeof ctx.createDynamicsCompressor === 'function') {
      const limiter = ctx.createDynamicsCompressor();
      safeSetParam(limiter.threshold, 'setValueAtTime', -12, 0);
      safeSetParam(limiter.knee, 'setValueAtTime', 22, 0);
      safeSetParam(limiter.ratio, 'setValueAtTime', 10, 0);
      safeSetParam(limiter.attack, 'setValueAtTime', 0.005, 0);
      safeSetParam(limiter.release, 'setValueAtTime', 0.2, 0);
      tail.connect(limiter);
      tail = limiter;
    }
    tail.connect(ctx.destination);
    return;
  } catch {
    try {
      gain.disconnect();
    } catch {
      // Ignore disconnect errors on mock nodes.
    }
  }
  gain.connect(ctx.destination);
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
      connectMasterChain(audioCtx, masterGain);
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
      connectMasterChain(audioCtx, masterGain);
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
    // Bible §7: soft attacks >= 5ms so no note ever clicks harshly.
    const attack = Math.max(0.005, spec.attack ?? 0.008);
    const decay = Math.max(0.03, spec.decay ?? 0.16);
    const peakGain = Math.max(0.005, Math.min(0.5, spec.gain ?? 0.24));
    const stopTime = startTime + attack + decay;

    const env = ctx.createGain();
    safeSetParam(env.gain, 'setValueAtTime', 0.0001, startTime);
    safeSetParam(env.gain, 'linearRampToValueAtTime', peakGain, startTime + attack);
    safeSetParam(env.gain, 'exponentialRampToValueAtTime', 0.0001, stopTime);
    safeSetParam(env.gain, 'setValueAtTime', 0, stopTime + 0.004);

    let entryNode: AudioNode = env;
    let filterNode: BiquadFilterNode | null = null;

    if (typeof ctx.createBiquadFilter === 'function') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (filter.Q) {
        safeSetParam(filter.Q, 'setValueAtTime', spec.filterQ ?? 0.85, startTime);
      }
      const cutoffStart = Math.min(4600, spec.filterCutoff ?? 2200);
      const cutoffEnd = Math.min(cutoffStart, spec.filterEndCutoff ?? Math.max(380, cutoffStart * 0.55));
      safeSetParam(filter.frequency, 'setValueAtTime', cutoffStart, startTime);
      safeSetParam(
        filter.frequency,
        'exponentialRampToValueAtTime',
        Math.max(120, cutoffEnd),
        stopTime
      );
      filter.connect(env);
      entryNode = filter;
      filterNode = filter;
    }

    env.connect(dest);

    const oscs: OscillatorNode[] = [];
    const extraGains: GainNode[] = [];

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
      extraGains.push(overtoneGain);
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
      extraGains.push(subLevel);
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
      extraGains.push(twelfthLevel);
    }

    // Fast-decaying acoustic bar partial (e.g. 2.76x wood marimba/kalimba or celesta bar)
    if (spec.barPartialRatio && spec.barPartialGain && spec.barPartialGain > 0) {
      const barOsc = ctx.createOscillator();
      barOsc.type = 'sine';
      const barEnv = ctx.createGain();
      const barStop = startTime + attack + Math.max(0.025, decay * 0.34);
      safeSetParam(barEnv.gain, 'setValueAtTime', 0.0001, startTime);
      safeSetParam(barEnv.gain, 'linearRampToValueAtTime', spec.barPartialGain, startTime + attack);
      safeSetParam(barEnv.gain, 'exponentialRampToValueAtTime', 0.0001, barStop);
      safeSetParam(barEnv.gain, 'setValueAtTime', 0, barStop + 0.003);
      safeSetParam(barOsc.frequency, 'setValueAtTime', spec.freq * spec.barPartialRatio, startTime);
      barOsc.connect(barEnv);
      barEnv.connect(entryNode);
      barOsc.start(startTime);
      barOsc.stop(barStop + 0.01);
      oscs.push(barOsc);
      extraGains.push(barEnv);
    }

    // Gentle detuned companion voice for organic glass-celesta / wind-chime shimmer (±cents warmth)
    if (spec.shimmerCents && spec.shimmerCents !== 0) {
      const detuneRatio = Math.pow(2, spec.shimmerCents / 1200);
      const shimOsc = ctx.createOscillator();
      shimOsc.type = 'sine';
      const shimGain = ctx.createGain();
      safeSetParam(shimGain.gain, 'setValueAtTime', spec.shimmerGain ?? 0.3, startTime);
      safeSetParam(shimOsc.frequency, 'setValueAtTime', spec.freq * detuneRatio, startTime);
      if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
        safeSetParam(
          shimOsc.frequency,
          'exponentialRampToValueAtTime',
          spec.endFreq * detuneRatio,
          stopTime
        );
      }
      shimOsc.connect(shimGain);
      shimGain.connect(entryNode);
      shimOsc.start(startTime);
      shimOsc.stop(stopTime + 0.012);
      oscs.push(shimOsc);
      extraGains.push(shimGain);
    }

    if (collector) {
      collector.push({ oscs, env });
    }

    mainOsc.onended = () => {
      try {
        for (const osc of oscs) {
          osc.disconnect();
        }
        for (const g of extraGains) {
          g.disconnect();
        }
        filterNode?.disconnect();
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

function buildSmoothedNoiseBuffer(
  ctx: AudioContext,
  sampleRate: number,
  frameCount: number,
  smoothing: number,
  seedInit: number
): AudioBuffer {
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic Mulberry32 PRNG so noise textures are consistent, finite, and zero-DC.
  let state = seedInit >>> 0;
  let smooth = 0;
  for (let i = 0; i < frameCount; i += 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const white = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
    smooth = smooth * smoothing + white * (1 - smoothing);
    data[i] = smooth;
  }
  return buffer;
}

function getNoiseBufferBank(ctx: AudioContext): NoiseBufferBank | null {
  if (typeof ctx.createBuffer !== 'function') return null;
  const cached = noiseBankCache.get(ctx);
  if (cached) return cached;
  try {
    const sampleRate =
      typeof ctx.sampleRate === 'number' && ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
    const frameCount = Math.max(512, Math.floor(sampleRate * NOISE_BANK_DURATION_SEC));
    const bank: NoiseBufferBank = {
      wood: buildSmoothedNoiseBuffer(ctx, sampleRate, frameCount, 0.68, 0x574f4f44),
      paper: buildSmoothedNoiseBuffer(ctx, sampleRate, frameCount, 0.56, 0x50415052),
      felt: buildSmoothedNoiseBuffer(ctx, sampleRate, frameCount, 0.84, 0x46454c54),
    };
    noiseBankCache.set(ctx, bank);
    return bank;
  } catch {
    return null;
  }
}

let noiseOffsetCounter = 0;

/**
 * Schedules a soft, filtered organic noise burst (wood tap grain, thick-paper rustle, felt settle)
 * using per-AudioContext cached buffers so rapid arcade/tile taps never allocate AudioBuffers.
 */
function scheduleNoiseBurst(ctx: AudioContext, dest: AudioNode, spec: NoiseSpec): void {
  if (
    typeof ctx.createBufferSource !== 'function' ||
    typeof ctx.createBiquadFilter !== 'function'
  ) {
    return;
  }
  const bank = getNoiseBufferBank(ctx);
  if (!bank) return;
  try {
    const buffer = bank[spec.texture ?? 'wood'];
    const duration = Math.max(0.016, Math.min(NOISE_BANK_DURATION_SEC - 0.02, spec.duration));
    const start = getSafeCurrentTime(ctx) + Math.max(0, spec.delay ?? 0);
    const attack = Math.max(0.005, Math.min(duration * 0.6, spec.attack));
    const end = start + duration;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = spec.type;
    safeSetParam(filter.Q, 'setValueAtTime', spec.q ?? 0.85, start);
    safeSetParam(filter.frequency, 'setValueAtTime', spec.freq, start);
    if (typeof spec.endFreq === 'number' && spec.endFreq > 0) {
      safeSetParam(filter.frequency, 'exponentialRampToValueAtTime', Math.max(80, spec.endFreq), end);
    }

    const env = ctx.createGain();
    const peak = Math.min(0.4, Math.max(0.004, spec.gain));
    safeSetParam(env.gain, 'setValueAtTime', 0.0001, start);
    safeSetParam(env.gain, 'linearRampToValueAtTime', peak, start + attack);
    safeSetParam(env.gain, 'exponentialRampToValueAtTime', 0.0001, end);
    safeSetParam(env.gain, 'setValueAtTime', 0, end + 0.004);

    source.connect(filter);
    filter.connect(env);
    env.connect(dest);

    // Rotate subtle offset inside cached buffer so rapid taps feel organically varied.
    const maxOffset = Math.max(0, NOISE_BANK_DURATION_SEC - duration - 0.015);
    const offset = maxOffset > 0.01 ? ((noiseOffsetCounter++ * 0.043) % maxOffset) : 0;
    source.start(start, offset, duration + 0.008);
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        env.disconnect();
      } catch {
        // Ignore already disconnected nodes.
      }
    };
  } catch {
    // Ignore optional noise buffer limitations on constrained environments.
  }
}

function scheduleAiryWhooshNoise(ctx: AudioContext, dest: AudioNode): void {
  // Soft thick-parchment page brush + gentle linen settle using cached buffers.
  scheduleNoiseBurst(ctx, dest, {
    texture: 'paper',
    delay: 0,
    duration: 0.16,
    attack: 0.032,
    gain: 0.19,
    type: 'bandpass',
    freq: 480,
    endFreq: 1720,
    q: 0.85,
  });
  scheduleNoiseBurst(ctx, dest, {
    texture: 'felt',
    delay: 0.055,
    duration: 0.13,
    attack: 0.024,
    gain: 0.125,
    type: 'lowpass',
    freq: 1220,
    endFreq: 400,
    q: 0.65,
  });
}

const SFX_RECIPES: Record<
  SoundEffectId,
  (ctx: AudioContext, dest: AudioNode, comboIndex: number) => void
> = {
  tile_tap: (ctx, dest, comboIndex) => {
    // Carved walnut wood-tile tap: tuned pentatonic wood bar + hollow knock + felt-pad grain
    const idx = Math.max(0, Math.floor(comboIndex)) % TAP_SCALE.length;
    const freq = TAP_SCALE[idx];
    scheduleWarmTone(ctx, dest, {
      freq,
      wave: 'triangle',
      harmonicGain: 0.16,
      barPartialRatio: 2.76,
      barPartialGain: 0.15,
      attack: 0.006,
      decay: 0.105,
      gain: 0.28,
      filterCutoff: 2050,
      filterEndCutoff: 760,
    });
    scheduleWarmTone(ctx, dest, {
      freq: 196,
      endFreq: 138,
      wave: 'sine',
      attack: 0.006,
      decay: 0.075,
      gain: 0.24,
      filterCutoff: 720,
      filterEndCutoff: 300,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.032,
      attack: 0.005,
      gain: 0.115,
      type: 'lowpass',
      freq: 1750,
      endFreq: 560,
    });
  },

  tile_remove: (ctx, dest) => {
    // Plush felt settle: soft downward wood cushion + velvety felt brush
    scheduleWarmTone(ctx, dest, {
      freq: 420,
      endFreq: 295,
      wave: 'sine',
      harmonicGain: 0.08,
      attack: 0.007,
      decay: 0.11,
      gain: 0.25,
      filterCutoff: 1180,
      filterEndCutoff: 480,
    });
    scheduleWarmTone(ctx, dest, {
      freq: 170,
      endFreq: 120,
      wave: 'sine',
      attack: 0.008,
      decay: 0.085,
      gain: 0.18,
      filterCutoff: 560,
      filterEndCutoff: 260,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      duration: 0.08,
      attack: 0.012,
      gain: 0.11,
      type: 'lowpass',
      freq: 920,
      endFreq: 340,
    });
  },

  button_click: (ctx, dest) => {
    // Tactile walnut & brass sketchbook-clasp click (weighted, intimate, >= 5ms attack)
    scheduleSequence(ctx, dest, [
      {
        freq: 245,
        endFreq: 162,
        wave: 'sine',
        attack: 0.005,
        decay: 0.062,
        gain: 0.29,
        filterCutoff: 840,
        filterEndCutoff: 320,
      },
      {
        freq: 920,
        endFreq: 720,
        delay: 0.004,
        wave: 'triangle',
        barPartialRatio: 2.72,
        barPartialGain: 0.1,
        attack: 0.005,
        decay: 0.044,
        gain: 0.14,
        filterCutoff: 1650,
        filterEndCutoff: 660,
      },
    ]);
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.028,
      attack: 0.005,
      gain: 0.12,
      type: 'bandpass',
      freq: 1480,
      endFreq: 600,
      q: 0.85,
    });
  },

  flip_card: (ctx, dest) => {
    // Thick deckle-edge paper rustle + warm folio settle
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      duration: 0.12,
      attack: 0.022,
      gain: 0.16,
      type: 'bandpass',
      freq: 1350,
      endFreq: 2450,
      q: 0.72,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.048,
      duration: 0.098,
      attack: 0.016,
      gain: 0.115,
      type: 'bandpass',
      freq: 2550,
      endFreq: 1250,
      q: 0.72,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 392.0,
        delay: 0.006,
        wave: 'sine',
        attack: 0.012,
        decay: 0.1,
        gain: 0.18,
        filterCutoff: 1320,
        filterEndCutoff: 600,
      },
      {
        freq: 587.33,
        delay: 0.048,
        wave: 'triangle',
        harmonicGain: 0.12,
        attack: 0.012,
        decay: 0.145,
        gain: 0.21,
        filterCutoff: 1900,
        filterEndCutoff: 840,
      },
    ]);
  },

  correct_chime: (ctx, dest, comboIndex) => {
    // Warm glass celesta bloom with ±4 cent detuned shimmer + gentle felt-hammer kiss
    const semitoneLift = Math.min(4, Math.max(0, Math.floor(comboIndex)));
    const factor = Math.pow(2, semitoneLift / 12);
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.022,
      attack: 0.005,
      gain: 0.036,
      type: 'lowpass',
      freq: 1350,
      endFreq: 480,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 523.25 * factor,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.18,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        shimmerCents: 3.5,
        shimmerGain: 0.24,
        attack: 0.008,
        decay: 0.2,
        gain: 0.19,
        filterCutoff: 2200,
        filterEndCutoff: 950,
      },
      {
        freq: 659.25 * factor,
        delay: 0.068,
        wave: 'sine',
        harmonicGain: 0.22,
        shimmerCents: -4,
        shimmerGain: 0.28,
        attack: 0.009,
        decay: 0.3,
        gain: 0.21,
        filterCutoff: 2650,
        filterEndCutoff: 1150,
      },
      {
        freq: 783.99 * factor,
        delay: 0.095,
        wave: 'sine',
        harmonicGain: 0.16,
        shimmerCents: 4.5,
        shimmerGain: 0.3,
        attack: 0.012,
        decay: 0.36,
        gain: 0.14,
        filterCutoff: 2550,
        filterEndCutoff: 1100,
      },
    ]);
  },

  combo_3x: (ctx, dest) => {
    // Warm kalimba thumb-pluck blossoming into a glass celesta triad
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.022,
      attack: 0.005,
      gain: 0.042,
      type: 'lowpass',
      freq: 1500,
      endFreq: 520,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.2,
        subGain: 0.12,
        barPartialRatio: 2.76,
        barPartialGain: 0.14,
        attack: 0.007,
        decay: 0.2,
        gain: 0.19,
        filterCutoff: 2300,
        filterEndCutoff: 920,
      },
      {
        freq: 659.25,
        delay: 0.068,
        wave: 'triangle',
        harmonicGain: 0.22,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        shimmerCents: 3.5,
        shimmerGain: 0.24,
        attack: 0.007,
        decay: 0.24,
        gain: 0.2,
        filterCutoff: 2600,
        filterEndCutoff: 1050,
      },
      {
        freq: 783.99,
        delay: 0.136,
        wave: 'sine',
        harmonicGain: 0.24,
        subGain: 0.1,
        twelfthGain: 0.08,
        shimmerCents: 4.2,
        shimmerGain: 0.3,
        attack: 0.009,
        decay: 0.4,
        gain: 0.22,
        filterCutoff: 2950,
        filterEndCutoff: 1200,
      },
    ]);
  },

  combo_5x: (ctx, dest) => {
    // Ascending warm kalimba cascade + glass celesta shimmer crown
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.024,
      attack: 0.005,
      gain: 0.045,
      type: 'lowpass',
      freq: 1550,
      endFreq: 560,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 587.33,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.2,
        subGain: 0.12,
        barPartialRatio: 2.76,
        barPartialGain: 0.14,
        attack: 0.007,
        decay: 0.19,
        gain: 0.19,
        filterCutoff: 2400,
        filterEndCutoff: 960,
      },
      {
        freq: 739.99,
        delay: 0.06,
        wave: 'triangle',
        harmonicGain: 0.22,
        barPartialRatio: 2.76,
        barPartialGain: 0.11,
        attack: 0.007,
        decay: 0.22,
        gain: 0.19,
        filterCutoff: 2650,
        filterEndCutoff: 1100,
      },
      {
        freq: 880.0,
        delay: 0.12,
        wave: 'sine',
        harmonicGain: 0.22,
        subGain: 0.1,
        shimmerCents: -3.8,
        shimmerGain: 0.26,
        attack: 0.008,
        decay: 0.28,
        gain: 0.2,
        filterCutoff: 2900,
        filterEndCutoff: 1250,
      },
      {
        freq: 1174.66,
        delay: 0.18,
        wave: 'sine',
        harmonicGain: 0.24,
        subGain: 0.12,
        twelfthGain: 0.08,
        shimmerCents: 4.5,
        shimmerGain: 0.3,
        attack: 0.009,
        decay: 0.44,
        gain: 0.21,
        filterCutoff: 3200,
        filterEndCutoff: 1350,
      },
    ]);
  },

  combo_fire: (ctx, dest) => {
    // Hearth-warm felt pad + kalimba arpeggio + soft wind-chime shimmer tail
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.015,
      duration: 0.14,
      attack: 0.03,
      gain: 0.055,
      type: 'bandpass',
      freq: 950,
      endFreq: 2100,
      q: 0.8,
    });
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    scheduleSequence(ctx, dest, [
      {
        freq: 261.63,
        delay: 0.018,
        wave: 'triangle',
        harmonicGain: 0.14,
        attack: 0.024,
        decay: 0.56,
        gain: 0.15,
        filterCutoff: 1300,
        filterEndCutoff: 620,
      },
      ...notes.map((freq, index) => ({
        freq,
        delay: index * 0.05,
        wave: (index < 3 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.22,
        subGain: index === notes.length - 1 ? 0.12 : 0.06,
        twelfthGain: index >= 3 ? 0.08 : 0,
        barPartialRatio: index < 3 ? 2.76 : undefined,
        barPartialGain: index < 3 ? 0.11 : undefined,
        shimmerCents: index >= 3 ? (index % 2 === 0 ? 4.2 : -4.2) : 0,
        shimmerGain: 0.28,
        attack: 0.007,
        decay: index === notes.length - 1 ? 0.52 : 0.23,
        gain: 0.18,
        filterCutoff: 3150,
        filterEndCutoff: 1350,
      })),
    ]);
  },

  gentle_nudge: (ctx, dest) => {
    // Felt-mallet soft warm woodblock double-tap (reassuring "try again", never harsh)
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      delay: 0,
      duration: 0.045,
      attack: 0.01,
      gain: 0.042,
      type: 'lowpass',
      freq: 520,
      endFreq: 240,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      delay: 0.115,
      duration: 0.05,
      attack: 0.01,
      gain: 0.036,
      type: 'lowpass',
      freq: 460,
      endFreq: 210,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 293.66,
        delay: 0,
        wave: 'sine',
        attack: 0.015,
        decay: 0.135,
        gain: 0.19,
        filterCutoff: 560,
        filterEndCutoff: 320,
      },
      {
        freq: 261.63,
        delay: 0.115,
        wave: 'sine',
        attack: 0.016,
        decay: 0.165,
        gain: 0.17,
        filterCutoff: 500,
        filterEndCutoff: 280,
      },
    ]);
  },

  accent_sparkle: (ctx, dest) => {
    // Delicate glass wind-chime shimmer glints with ±4.5 cent beating warmth
    const bells = [783.99, 987.77, 1174.66, 1567.98];
    scheduleSequence(
      ctx,
      dest,
      bells.map((freq, idx) => ({
        freq,
        delay: idx * 0.05,
        wave: 'sine',
        harmonicGain: 0.22,
        shimmerCents: idx % 2 === 0 ? 4.5 : -4.2,
        shimmerGain: 0.3,
        attack: 0.007,
        decay: idx === bells.length - 1 ? 0.42 : 0.24,
        gain: 0.17,
        filterCutoff: 3250,
        filterEndCutoff: 1400,
      }))
    );
  },

  heart_win: (ctx, dest) => {
    // Warm felt-harp & celesta lift
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      duration: 0.07,
      attack: 0.014,
      gain: 0.04,
      type: 'lowpass',
      freq: 760,
      endFreq: 320,
    });
    scheduleSequence(ctx, dest, [
      { freq: 349.23, delay: 0, wave: 'sine', attack: 0.012, decay: 0.13, gain: 0.19, filterCutoff: 1100 },
      { freq: 440.0, delay: 0.085, wave: 'triangle', harmonicGain: 0.15, attack: 0.01, decay: 0.17, gain: 0.19 },
      { freq: 523.25, delay: 0.16, wave: 'sine', harmonicGain: 0.18, shimmerCents: 3.5, shimmerGain: 0.24, attack: 0.01, decay: 0.26, gain: 0.2 },
      { freq: 698.46, delay: 0.235, wave: 'sine', harmonicGain: 0.22, shimmerCents: -4, shimmerGain: 0.28, attack: 0.01, decay: 0.38, gain: 0.21 },
    ]);
  },

  chest_open: (ctx, dest) => {
    // Heirloom wooden latch release + parchment unfold + shimmering glass-celesta bloom
    scheduleWarmTone(ctx, dest, {
      freq: 185,
      endFreq: 126,
      delay: 0,
      wave: 'sine',
      attack: 0.006,
      decay: 0.075,
      gain: 0.19,
      filterCutoff: 640,
      filterEndCutoff: 260,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      delay: 0,
      duration: 0.034,
      attack: 0.005,
      gain: 0.078,
      type: 'bandpass',
      freq: 1320,
      endFreq: 520,
      q: 0.9,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.042,
      duration: 0.12,
      attack: 0.022,
      gain: 0.068,
      type: 'bandpass',
      freq: 980,
      endFreq: 1950,
      q: 0.8,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 261.63,
        endFreq: 392.0,
        delay: 0.022,
        wave: 'triangle',
        subGain: 0.12,
        attack: 0.016,
        decay: 0.16,
        gain: 0.16,
        filterCutoff: 1250,
        filterEndCutoff: 620,
      },
      {
        freq: 523.25,
        delay: 0.105,
        wave: 'triangle',
        harmonicGain: 0.2,
        subGain: 0.1,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.008,
        decay: 0.3,
        gain: 0.18,
        filterCutoff: 2450,
      },
      {
        freq: 659.25,
        delay: 0.15,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.07,
        shimmerCents: 3.8,
        shimmerGain: 0.26,
        attack: 0.008,
        decay: 0.34,
        gain: 0.17,
        filterCutoff: 2750,
      },
      {
        freq: 783.99,
        delay: 0.195,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.08,
        shimmerCents: -4.2,
        shimmerGain: 0.28,
        attack: 0.009,
        decay: 0.38,
        gain: 0.17,
        filterCutoff: 2950,
      },
      {
        freq: 987.77,
        delay: 0.235,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: 4.5,
        shimmerGain: 0.28,
        attack: 0.01,
        decay: 0.42,
        gain: 0.14,
        filterCutoff: 3150,
      },
      {
        freq: 1174.66,
        delay: 0.275,
        wave: 'sine',
        harmonicGain: 0.22,
        subGain: 0.08,
        shimmerCents: -4.4,
        shimmerGain: 0.3,
        attack: 0.01,
        decay: 0.48,
        gain: 0.17,
        filterCutoff: 3300,
      },
      {
        freq: 1567.98,
        delay: 0.32,
        wave: 'sine',
        harmonicGain: 0.14,
        shimmerCents: 4.8,
        shimmerGain: 0.3,
        attack: 0.012,
        decay: 0.54,
        gain: 0.13,
        filterCutoff: 3450,
      },
    ]);
  },

  boss_hit: (ctx, dest) => {
    // Plush felt-mallet taiko thud + warm wooden marimba resolve
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      duration: 0.095,
      attack: 0.008,
      gain: 0.105,
      type: 'lowpass',
      freq: 680,
      endFreq: 220,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 196.0,
        endFreq: 76.0,
        delay: 0,
        wave: 'sine',
        attack: 0.006,
        decay: 0.145,
        gain: 0.27,
        filterCutoff: 500,
        filterEndCutoff: 170,
      },
      { freq: 440.0, delay: 0.028, wave: 'triangle', harmonicGain: 0.18, barPartialRatio: 2.76, barPartialGain: 0.1, attack: 0.006, decay: 0.16, gain: 0.18 },
      { freq: 554.37, delay: 0.068, wave: 'triangle', harmonicGain: 0.2, attack: 0.006, decay: 0.18, gain: 0.18 },
      { freq: 659.25, delay: 0.108, wave: 'sine', harmonicGain: 0.22, shimmerCents: 3.5, shimmerGain: 0.24, attack: 0.008, decay: 0.28, gain: 0.19 },
    ]);
  },

  unit_fanfare: (ctx, dest) => {
    // Heirloom music-box marimba fanfare blooming into ±4.5 cent glass-celesta & wind-chime tails
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.51,
      duration: 0.16,
      attack: 0.032,
      gain: 0.055,
      type: 'bandpass',
      freq: 920,
      endFreq: 2150,
      q: 0.85,
    });
    scheduleSequence(ctx, dest, [
      { freq: 392.0, delay: 0, wave: 'triangle', harmonicGain: 0.2, subGain: 0.12, barPartialRatio: 2.76, barPartialGain: 0.12, attack: 0.007, decay: 0.16, gain: 0.19, filterCutoff: 2200 },
      { freq: 523.25, delay: 0.105, wave: 'triangle', harmonicGain: 0.22, subGain: 0.1, barPartialRatio: 2.76, barPartialGain: 0.11, attack: 0.007, decay: 0.16, gain: 0.2, filterCutoff: 2450 },
      { freq: 659.25, delay: 0.21, wave: 'triangle', harmonicGain: 0.22, twelfthGain: 0.07, barPartialRatio: 2.76, barPartialGain: 0.1, attack: 0.007, decay: 0.17, gain: 0.2, filterCutoff: 2700 },
      { freq: 783.99, delay: 0.315, wave: 'sine', harmonicGain: 0.22, subGain: 0.1, shimmerCents: 3.5, shimmerGain: 0.24, attack: 0.008, decay: 0.21, gain: 0.21, filterCutoff: 2950 },
      { freq: 659.25, delay: 0.43, wave: 'triangle', harmonicGain: 0.18, attack: 0.008, decay: 0.16, gain: 0.18, filterCutoff: 2450 },
      { freq: 523.25, delay: 0.54, wave: 'triangle', subGain: 0.14, harmonicGain: 0.14, attack: 0.012, decay: 0.66, gain: 0.15, filterCutoff: 2100, filterEndCutoff: 950 },
      { freq: 659.25, delay: 0.545, wave: 'sine', harmonicGain: 0.14, shimmerCents: -3.8, shimmerGain: 0.26, attack: 0.012, decay: 0.66, gain: 0.13, filterCutoff: 2600 },
      { freq: 783.99, delay: 0.552, wave: 'sine', harmonicGain: 0.16, twelfthGain: 0.07, shimmerCents: 4.2, shimmerGain: 0.28, attack: 0.012, decay: 0.68, gain: 0.14, filterCutoff: 2900 },
      {
        freq: 1046.5,
        delay: 0.56,
        wave: 'sine',
        harmonicGain: 0.24,
        twelfthGain: 0.08,
        shimmerCents: -4.5,
        shimmerGain: 0.3,
        attack: 0.012,
        decay: 0.74,
        gain: 0.19,
        filterCutoff: 3250,
        filterEndCutoff: 1400,
      },
      {
        freq: 1318.51,
        delay: 0.635,
        wave: 'sine',
        shimmerCents: 4.8,
        shimmerGain: 0.32,
        attack: 0.014,
        decay: 0.62,
        gain: 0.1,
        filterCutoff: 3450,
      },
      {
        freq: 1567.98,
        delay: 0.705,
        wave: 'sine',
        shimmerCents: -4.6,
        shimmerGain: 0.3,
        attack: 0.016,
        decay: 0.64,
        gain: 0.085,
        filterCutoff: 3550,
      },
    ]);
  },

  star_pop: (ctx, dest, comboIndex) => {
    // Warm kalimba pluck scaled by star tier (attacks >= 5ms + wooden tine contact)
    const tier = Math.max(0, Math.floor(comboIndex));
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.022,
      attack: 0.005,
      gain: 0.045,
      type: 'lowpass',
      freq: 1600,
      endFreq: 560,
    });
    if (tier === 0) {
      scheduleSequence(ctx, dest, [
        {
          freq: 523.25,
          delay: 0,
          wave: 'sine',
          harmonicGain: 0.24,
          barPartialRatio: 2.76,
          barPartialGain: 0.12,
          attack: 0.006,
          decay: 0.23,
          gain: 0.21,
          filterCutoff: 2900,
        },
        {
          freq: 1046.5,
          delay: 0.02,
          wave: 'triangle',
          shimmerCents: 3.5,
          shimmerGain: 0.24,
          attack: 0.006,
          decay: 0.19,
          gain: 0.11,
          filterCutoff: 3100,
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
          harmonicGain: 0.26,
          barPartialRatio: 2.76,
          barPartialGain: 0.12,
          shimmerCents: 3.5,
          shimmerGain: 0.24,
          attack: 0.006,
          decay: 0.25,
          gain: 0.21,
          filterCutoff: 3100,
        },
        {
          freq: 1318.51,
          delay: 0.024,
          wave: 'triangle',
          shimmerCents: -4,
          shimmerGain: 0.26,
          attack: 0.006,
          decay: 0.22,
          gain: 0.12,
          filterCutoff: 3300,
        },
      ]);
      return;
    }

    const notes: ToneSpec[] = [
      {
        freq: 783.99,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.22,
        barPartialRatio: 2.76,
        barPartialGain: 0.12,
        attack: 0.006,
        decay: 0.24,
        gain: 0.19,
        filterCutoff: 3100,
      },
      {
        freq: 1046.5,
        delay: 0.044,
        wave: 'sine',
        harmonicGain: 0.24,
        twelfthGain: 0.09,
        shimmerCents: 4,
        shimmerGain: 0.28,
        attack: 0.006,
        decay: 0.32,
        gain: 0.2,
        filterCutoff: 3350,
      },
      {
        freq: 1567.98,
        delay: 0.086,
        wave: 'sine',
        shimmerCents: -4.2,
        shimmerGain: 0.28,
        attack: 0.007,
        decay: 0.3,
        gain: 0.13,
        filterCutoff: 3500,
      },
    ];
    if (tier >= 3) {
      notes.push({
        freq: 1318.51,
        delay: 0.118,
        wave: 'sine',
        shimmerCents: 4.5,
        shimmerGain: 0.28,
        attack: 0.007,
        decay: 0.28,
        gain: 0.11,
        filterCutoff: 3500,
      });
    }
    scheduleSequence(ctx, dest, notes);
  },

  whoosh_transition: (ctx, dest) => {
    // Soft thick-page air brush + gentle whispered tonal lift (zero synth sweep harshness)
    scheduleAiryWhooshNoise(ctx, dest);
    scheduleSequence(ctx, dest, [
      {
        freq: 261.63,
        endFreq: 523.25,
        delay: 0.006,
        wave: 'sine',
        harmonicGain: 0.1,
        attack: 0.028,
        decay: 0.13,
        gain: 0.16,
        filterCutoff: 1220,
        filterEndCutoff: 780,
      },
      {
        freq: 392.0,
        endFreq: 659.25,
        delay: 0.024,
        wave: 'triangle',
        attack: 0.026,
        decay: 0.115,
        gain: 0.11,
        filterCutoff: 1120,
        filterEndCutoff: 700,
      },
    ]);
  },

  bubble_pop: (ctx, dest, comboIndex) => {
    // Plush liquid-drop & warm kalimba pentatonic plink (attacks >= 5ms)
    const idx = Math.max(0, Math.floor(comboIndex)) % BUBBLE_PENTATONIC_SCALE.length;
    const targetFreq = BUBBLE_PENTATONIC_SCALE[idx];
    const startFreq = targetFreq * 0.58;
    const endFreq = targetFreq * 1.14;

    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      duration: 0.024,
      attack: 0.005,
      gain: 0.07,
      type: 'bandpass',
      freq: 1240,
      endFreq: 540,
      q: 1.0,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: startFreq,
        endFreq,
        delay: 0,
        wave: 'sine',
        harmonicGain: 0.18,
        attack: 0.005,
        decay: 0.088,
        gain: 0.3,
        filterCutoff: 2400,
        filterEndCutoff: 1500,
      },
      {
        freq: targetFreq * 2,
        endFreq: targetFreq * 2.2,
        delay: 0.018,
        wave: 'triangle',
        attack: 0.005,
        decay: 0.062,
        gain: 0.12,
        filterCutoff: 2900,
        filterEndCutoff: 1550,
      },
    ]);
  },

  secret_fanfare: (ctx, dest) => {
    // Velvet harp glissando + glass wind-chime discovery chord
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.31,
      duration: 0.14,
      attack: 0.028,
      gain: 0.048,
      type: 'bandpass',
      freq: 1100,
      endFreq: 2200,
      q: 0.8,
    });
    const harpNotes = [349.23, 440.0, 523.25, 659.25, 783.99, 880.0, 1046.5];
    scheduleSequence(ctx, dest, [
      ...harpNotes.map((freq, idx) => ({
        freq,
        delay: idx * 0.048,
        wave: (idx < 3 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.18,
        subGain: idx === 0 ? 0.1 : 0,
        barPartialRatio: idx < 3 ? 2.76 : undefined,
        barPartialGain: idx < 3 ? 0.09 : undefined,
        attack: 0.007,
        decay: 0.24,
        gain: 0.16,
        filterCutoff: 2950,
      })),
      {
        freq: 698.46,
        delay: 0.345,
        wave: 'triangle',
        subGain: 0.12,
        harmonicGain: 0.18,
        attack: 0.012,
        decay: 0.42,
        gain: 0.16,
        filterCutoff: 2600,
      },
      {
        freq: 880.0,
        delay: 0.36,
        wave: 'sine',
        harmonicGain: 0.2,
        shimmerCents: 3.8,
        shimmerGain: 0.26,
        attack: 0.012,
        decay: 0.44,
        gain: 0.15,
        filterCutoff: 2900,
      },
      {
        freq: 1046.5,
        delay: 0.378,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.08,
        shimmerCents: -4.2,
        shimmerGain: 0.28,
        attack: 0.012,
        decay: 0.46,
        gain: 0.17,
        filterCutoff: 3250,
      },
      {
        freq: 1318.51,
        delay: 0.4,
        wave: 'sine',
        harmonicGain: 0.16,
        shimmerCents: 4.5,
        shimmerGain: 0.3,
        attack: 0.014,
        decay: 0.44,
        gain: 0.12,
        filterCutoff: 3400,
      },
    ]);
  },

  tier_unlock: (ctx, dest) => {
    // Lantern-lit ascending fifth (G4 -> D5 -> G5) + wooden resonance + wind-chime shimmer
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.028,
      attack: 0.006,
      gain: 0.05,
      type: 'lowpass',
      freq: 1300,
      endFreq: 480,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 392.0,
        delay: 0,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.18,
        barPartialRatio: 2.76,
        barPartialGain: 0.11,
        attack: 0.008,
        decay: 0.22,
        gain: 0.2,
        filterCutoff: 2250,
      },
      {
        freq: 587.33,
        delay: 0.088,
        wave: 'triangle',
        harmonicGain: 0.22,
        twelfthGain: 0.07,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.008,
        decay: 0.28,
        gain: 0.21,
        filterCutoff: 2750,
      },
      {
        freq: 783.99,
        delay: 0.18,
        wave: 'sine',
        harmonicGain: 0.22,
        subGain: 0.1,
        twelfthGain: 0.08,
        shimmerCents: 4,
        shimmerGain: 0.28,
        attack: 0.009,
        decay: 0.46,
        gain: 0.2,
        filterCutoff: 3100,
      },
      {
        freq: 987.77,
        delay: 0.228,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: -4.2,
        shimmerGain: 0.28,
        attack: 0.011,
        decay: 0.4,
        gain: 0.13,
        filterCutoff: 3350,
      },
      {
        freq: 1174.66,
        delay: 0.275,
        wave: 'sine',
        harmonicGain: 0.16,
        shimmerCents: 4.5,
        shimmerGain: 0.3,
        attack: 0.012,
        decay: 0.46,
        gain: 0.13,
        filterCutoff: 3500,
      },
      {
        freq: 1567.98,
        delay: 0.325,
        wave: 'sine',
        shimmerCents: -4.5,
        shimmerGain: 0.3,
        attack: 0.014,
        decay: 0.52,
        gain: 0.1,
        filterCutoff: 3650,
      },
    ]);
  },

  booster_spark: (ctx, dest) => {
    // Twinkling lantern-light kalimba & glass-celesta maj9 arpeggio
    const starNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    scheduleSequence(
      ctx,
      dest,
      starNotes.map((freq, idx) => ({
        freq,
        delay: idx * 0.04,
        wave: (idx < 2 ? 'triangle' : 'sine') as WarmWaveform,
        harmonicGain: 0.2 + (idx >= 3 ? 0.04 : 0),
        twelfthGain: idx === starNotes.length - 1 ? 0.07 : 0,
        barPartialRatio: idx < 2 ? 2.76 : undefined,
        barPartialGain: idx < 2 ? 0.1 : undefined,
        shimmerCents: idx >= 2 ? (idx % 2 === 0 ? 4 : -4) : 0,
        shimmerGain: 0.26,
        attack: 0.006,
        decay: idx === starNotes.length - 1 ? 0.42 : 0.19 + idx * 0.018,
        gain: idx === starNotes.length - 1 ? 0.14 : 0.16,
        filterCutoff: 2550 + idx * 190,
      }))
    );
  },

  free_recall_ace: (ctx, dest) => {
    // Crisp wooden kalimba Dmaj9 flourish + warm glass-celesta bloom (attacks >= 5ms)
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.024,
      attack: 0.005,
      gain: 0.046,
      type: 'lowpass',
      freq: 1550,
      endFreq: 540,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 587.33,
        delay: 0,
        wave: 'triangle',
        subGain: 0.12,
        harmonicGain: 0.18,
        barPartialRatio: 2.76,
        barPartialGain: 0.12,
        attack: 0.006,
        decay: 0.16,
        gain: 0.2,
        filterCutoff: 2600,
      },
      {
        freq: 739.99,
        delay: 0.045,
        wave: 'triangle',
        harmonicGain: 0.2,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.006,
        decay: 0.17,
        gain: 0.19,
        filterCutoff: 2850,
      },
      {
        freq: 880.0,
        delay: 0.09,
        wave: 'sine',
        harmonicGain: 0.2,
        shimmerCents: 3.5,
        shimmerGain: 0.24,
        attack: 0.006,
        decay: 0.21,
        gain: 0.19,
        filterCutoff: 3100,
      },
      {
        freq: 1108.73,
        delay: 0.135,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: -4,
        shimmerGain: 0.26,
        attack: 0.006,
        decay: 0.3,
        gain: 0.16,
        filterCutoff: 3300,
      },
      {
        freq: 587.33,
        delay: 0.175,
        wave: 'triangle',
        subGain: 0.1,
        attack: 0.008,
        decay: 0.4,
        gain: 0.12,
        filterCutoff: 2250,
      },
      {
        freq: 880.0,
        delay: 0.175,
        wave: 'sine',
        shimmerCents: 3.8,
        shimmerGain: 0.25,
        attack: 0.008,
        decay: 0.42,
        gain: 0.12,
        filterCutoff: 2800,
      },
      {
        freq: 1318.51,
        delay: 0.178,
        wave: 'sine',
        harmonicGain: 0.2,
        twelfthGain: 0.07,
        shimmerCents: -4.4,
        shimmerGain: 0.3,
        attack: 0.008,
        decay: 0.46,
        gain: 0.18,
        filterCutoff: 3500,
      },
    ]);
  },

  laureate_fanfare: (ctx, dest) => {
    // Grand storybook music-box, warm wood marimba & wind-chime festival (I -> IV -> V -> I maj9)
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      delay: 0,
      duration: 0.07,
      attack: 0.012,
      gain: 0.05,
      type: 'lowpass',
      freq: 760,
      endFreq: 280,
    });
    scheduleNoiseBurst(ctx, dest, {
      texture: 'paper',
      delay: 0.61,
      duration: 0.18,
      attack: 0.036,
      gain: 0.055,
      type: 'bandpass',
      freq: 980,
      endFreq: 2200,
      q: 0.8,
    });
    scheduleSequence(ctx, dest, [
      // Chord 1: C major herald
      {
        freq: 261.63,
        delay: 0,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.18,
        attack: 0.01,
        decay: 0.17,
        gain: 0.15,
        filterCutoff: 1900,
      },
      {
        freq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.2,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.008,
        decay: 0.17,
        gain: 0.17,
        filterCutoff: 2600,
      },
      {
        freq: 659.25,
        delay: 0.014,
        wave: 'sine',
        harmonicGain: 0.18,
        attack: 0.008,
        decay: 0.17,
        gain: 0.13,
        filterCutoff: 2800,
      },
      // Passing marimba pickup
      {
        freq: 587.33,
        delay: 0.12,
        wave: 'triangle',
        harmonicGain: 0.18,
        barPartialRatio: 2.76,
        barPartialGain: 0.11,
        attack: 0.007,
        decay: 0.14,
        gain: 0.17,
        filterCutoff: 2600,
      },
      {
        freq: 659.25,
        delay: 0.205,
        wave: 'triangle',
        harmonicGain: 0.2,
        barPartialRatio: 2.76,
        barPartialGain: 0.11,
        attack: 0.007,
        decay: 0.15,
        gain: 0.18,
        filterCutoff: 2800,
      },
      // Chord 2: F major subdominant lift
      {
        freq: 349.23,
        delay: 0.295,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.18,
        attack: 0.01,
        decay: 0.21,
        gain: 0.15,
        filterCutoff: 2100,
      },
      {
        freq: 440.0,
        delay: 0.295,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.01,
        decay: 0.21,
        gain: 0.13,
        filterCutoff: 2450,
      },
      {
        freq: 880.0,
        delay: 0.305,
        wave: 'sine',
        harmonicGain: 0.22,
        shimmerCents: 3.5,
        shimmerGain: 0.24,
        attack: 0.008,
        decay: 0.24,
        gain: 0.17,
        filterCutoff: 3100,
      },
      // Chord 3: G major dominant tension
      {
        freq: 392.0,
        delay: 0.455,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.18,
        attack: 0.01,
        decay: 0.23,
        gain: 0.15,
        filterCutoff: 2200,
      },
      {
        freq: 493.88,
        delay: 0.455,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.01,
        decay: 0.23,
        gain: 0.13,
        filterCutoff: 2550,
      },
      {
        freq: 783.99,
        delay: 0.465,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.07,
        shimmerCents: -3.8,
        shimmerGain: 0.26,
        attack: 0.008,
        decay: 0.26,
        gain: 0.18,
        filterCutoff: 3150,
      },
      // Chord 4: Grand festival C major + 9th wind-chime resolution
      {
        freq: 261.63,
        delay: 0.625,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.16,
        twelfthGain: 0.06,
        attack: 0.014,
        decay: 0.88,
        gain: 0.14,
        filterCutoff: 2050,
        filterEndCutoff: 980,
      },
      {
        freq: 392.0,
        delay: 0.625,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.014,
        decay: 0.84,
        gain: 0.12,
        filterCutoff: 2400,
      },
      {
        freq: 523.25,
        delay: 0.625,
        wave: 'triangle',
        harmonicGain: 0.18,
        twelfthGain: 0.07,
        attack: 0.012,
        decay: 0.88,
        gain: 0.15,
        filterCutoff: 2850,
      },
      {
        freq: 659.25,
        delay: 0.635,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: 4,
        shimmerGain: 0.26,
        attack: 0.012,
        decay: 0.86,
        gain: 0.12,
        filterCutoff: 3050,
      },
      {
        freq: 1046.5,
        delay: 0.655,
        wave: 'sine',
        harmonicGain: 0.22,
        twelfthGain: 0.07,
        shimmerCents: -4.4,
        shimmerGain: 0.28,
        attack: 0.01,
        decay: 0.82,
        gain: 0.15,
        filterCutoff: 3400,
      },
      {
        freq: 1174.66,
        delay: 0.725,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: 4.5,
        shimmerGain: 0.3,
        attack: 0.01,
        decay: 0.72,
        gain: 0.11,
        filterCutoff: 3500,
      },
      {
        freq: 1318.51,
        delay: 0.795,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: -4.6,
        shimmerGain: 0.3,
        attack: 0.012,
        decay: 0.78,
        gain: 0.12,
        filterCutoff: 3650,
      },
    ]);
  },

  equip_prop_pet: (ctx, dest) => {
    // Painted wooden toy pop + delicate celesta glint (attacks >= 5ms)
    scheduleNoiseBurst(ctx, dest, {
      texture: 'wood',
      duration: 0.025,
      attack: 0.005,
      gain: 0.06,
      type: 'lowpass',
      freq: 1500,
      endFreq: 560,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 330.0,
        endFreq: 523.25,
        delay: 0,
        wave: 'triangle',
        harmonicGain: 0.14,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.006,
        decay: 0.08,
        gain: 0.2,
        filterCutoff: 1480,
        filterEndCutoff: 680,
      },
      {
        freq: 440.0,
        endFreq: 698.46,
        delay: 0.08,
        wave: 'triangle',
        harmonicGain: 0.18,
        barPartialRatio: 2.76,
        barPartialGain: 0.1,
        attack: 0.006,
        decay: 0.095,
        gain: 0.2,
        filterCutoff: 1750,
        filterEndCutoff: 820,
      },
      {
        freq: 1046.5,
        delay: 0.16,
        wave: 'sine',
        harmonicGain: 0.2,
        shimmerCents: 3.8,
        shimmerGain: 0.26,
        attack: 0.007,
        decay: 0.22,
        gain: 0.14,
        filterCutoff: 3250,
      },
      {
        freq: 1567.98,
        delay: 0.21,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: -4,
        shimmerGain: 0.28,
        attack: 0.007,
        decay: 0.3,
        gain: 0.12,
        filterCutoff: 3500,
      },
    ]);
  },

  adult_unlock: (ctx, dest) => {
    // Velvet twilight Ebmaj9 lamp-lit chord + plush felt breath for After-Hours Atlas unlock
    scheduleNoiseBurst(ctx, dest, {
      texture: 'felt',
      delay: 0.01,
      duration: 0.17,
      attack: 0.036,
      gain: 0.05,
      type: 'lowpass',
      freq: 760,
      endFreq: 320,
    });
    scheduleSequence(ctx, dest, [
      {
        freq: 311.13,
        delay: 0,
        wave: 'triangle',
        subGain: 0.14,
        harmonicGain: 0.12,
        attack: 0.025,
        decay: 0.58,
        gain: 0.16,
        filterCutoff: 1400,
        filterEndCutoff: 680,
      },
      {
        freq: 466.16,
        delay: 0.055,
        wave: 'triangle',
        harmonicGain: 0.16,
        attack: 0.022,
        decay: 0.56,
        gain: 0.15,
        filterCutoff: 1750,
        filterEndCutoff: 840,
      },
      {
        freq: 392.0,
        delay: 0.11,
        wave: 'sine',
        harmonicGain: 0.18,
        attack: 0.02,
        decay: 0.54,
        gain: 0.16,
        filterCutoff: 2050,
        filterEndCutoff: 920,
      },
      {
        freq: 587.33,
        delay: 0.165,
        wave: 'sine',
        harmonicGain: 0.18,
        shimmerCents: 3.8,
        shimmerGain: 0.26,
        attack: 0.018,
        decay: 0.6,
        gain: 0.16,
        filterCutoff: 2450,
        filterEndCutoff: 1080,
      },
      {
        freq: 698.46,
        delay: 0.22,
        wave: 'sine',
        harmonicGain: 0.18,
        twelfthGain: 0.05,
        shimmerCents: -4,
        shimmerGain: 0.28,
        attack: 0.018,
        decay: 0.66,
        gain: 0.16,
        filterCutoff: 2750,
        filterEndCutoff: 1200,
      },
      {
        freq: 783.99,
        delay: 0.28,
        wave: 'sine',
        harmonicGain: 0.16,
        shimmerCents: 4.2,
        shimmerGain: 0.28,
        attack: 0.016,
        decay: 0.68,
        gain: 0.13,
        filterCutoff: 2950,
        filterEndCutoff: 1280,
      },
      {
        freq: 932.33,
        delay: 0.34,
        wave: 'sine',
        harmonicGain: 0.14,
        shimmerCents: -4.4,
        shimmerGain: 0.3,
        attack: 0.02,
        decay: 0.72,
        gain: 0.11,
        filterCutoff: 3150,
        filterEndCutoff: 1380,
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
    stopHintChimes();
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

// Celestial D-major Lydian/pentatonic shimmer pitches for Starlight Sequence hint chimes
const STARLIGHT_HINT_SCALE = [
  587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98,
] as const;

export function stopHintChimes(): void {
  if (activeHintNodes.length === 0) return;
  const current = activeHintNodes;
  activeHintNodes = [];
  const now = audioCtx ? getSafeCurrentTime(audioCtx) : 0;
  for (const node of current) {
    try {
      safeSetParam(node.env.gain, 'setValueAtTime', 0.0001, now);
      for (const osc of node.oscs) {
        try {
          osc.stop(now + 0.008);
        } catch {
          // Ignore oscillators already stopped.
        }
      }
    } catch {
      // Ignore cleanup errors.
    }
  }
}

export function playHintStepChime(
  stepIndex: number,
  totalSteps: number,
  tier: 1 | 2 | 3 = 1,
  skipIfBusy = false
): void {
  if (preferences.muted || preferences.volume <= 0) return;
  if (skipIfBusy || activeCadence !== null) return;
  const audio = ensureAudioContext();
  if (!audio) return;

  const safeIdx = Math.max(0, Math.floor(stepIndex));
  const scaleIdx = safeIdx % STARLIGHT_HINT_SCALE.length;
  const octaveBoost = safeIdx >= STARLIGHT_HINT_SCALE.length ? 1.12246 : 1;
  const freq = STARLIGHT_HINT_SCALE[scaleIdx] * octaveBoost;
  const isFinal = totalSteps > 0 && safeIdx + 1 >= totalSteps;

  if (activeHintNodes.length > 24) {
    activeHintNodes = activeHintNodes.slice(-12);
  }

  scheduleWarmTone(
    audio.ctx,
    audio.master,
    {
      freq,
      delay: 0,
      wave: 'sine',
      harmonicGain: 0.14,
      attack: 0.01,
      decay: isFinal ? 0.28 : 0.18,
      gain: tier === 1 ? 0.095 : 0.115,
      filterCutoff: 2400,
      filterEndCutoff: 1100,
    },
    activeHintNodes
  );
}

export function playHintMisplacedNudge(skipIfBusy = false): void {
  if (preferences.muted || preferences.volume <= 0) return;
  if (skipIfBusy || activeCadence !== null) return;
  const audio = ensureAudioContext();
  if (!audio) return;

  const specs: readonly ToneSpec[] = [
    {
      freq: 392.0,
      delay: 0,
      wave: 'sine',
      attack: 0.01,
      decay: 0.14,
      gain: 0.085,
      filterCutoff: 1100,
      filterEndCutoff: 580,
    },
    {
      freq: 440.0,
      delay: 0.09,
      wave: 'sine',
      attack: 0.01,
      decay: 0.14,
      gain: 0.085,
      filterCutoff: 1100,
      filterEndCutoff: 580,
    },
  ];
  for (const spec of specs) {
    scheduleWarmTone(audio.ctx, audio.master, spec, activeHintNodes);
  }
}
