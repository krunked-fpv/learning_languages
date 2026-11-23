import { useSyncExternalStore } from 'react';
import {
  isAdultMashupLanguage,
  type AdultMashupLanguageCode,
  type LanguageCode,
  type SpeakOutcome,
  type SpeakRequest,
  type SpeechRuntimeState,
  type SpeechSpeed,
} from '../types/contracts';
import {
  getAudioPreferences,
  playPhoneticCadence,
  stopPhoneticCadence,
} from './synthEngine';

export const SPEECH_LOCALE_MAP: Record<LanguageCode | 'en', readonly string[]> = {
  es: ['es-MX', 'es-ES', 'es'],
  fr: ['fr-FR', 'fr-CA', 'fr'],
  de: ['de-DE', 'de-AT', 'de'],
  it: ['it-IT', 'it'],
  pt: ['pt-BR', 'pt-PT', 'pt'],
  en: ['en-US', 'en-GB', 'en'],
  zh: ['zh-CN', 'cmn-Hans-CN', 'zh-SG', 'zh-TW', 'zh'],
  ja: ['ja-JP', 'ja'],
  hi: ['hi-IN', 'hi'],
  bn: ['bn-BD', 'bn-IN', 'bn'],
  ar: ['ar-SA', 'ar-001', 'ar-AE', 'ar'],
  arz: ['ar-EG', 'ar'],
  ru: ['ru-RU', 'ru'],
  id: ['id-ID', 'in-ID', 'id'],
  vi: ['vi-VN', 'vi'],
  sw: ['sw-KE', 'sw-TZ', 'sw'],
  ebonics: ['en-US', 'en'],
  suburban: ['en-US', 'en'],
  corp_trades: ['en-US', 'en'],
  midwest_northeast: ['en-US', 'en'],
  south_genz: ['en-US', 'en'],
  cali_country: ['en-US', 'en'],
  stoner_tactical: ['en-US', 'en'],
};

const DEFAULT_SPEECH_PITCH = 1.0;
const MIN_SAFE_SPEECH_PITCH = 0.94;
const MAX_SAFE_SPEECH_PITCH = 1.06;

export const ADULT_MASHUP_PITCH_MAP: Readonly<Record<AdultMashupLanguageCode, number>> = {
  corp_trades: 0.97,
  midwest_northeast: 1.04,
  south_genz: 1.06,
  cali_country: 1.02,
  stoner_tactical: 0.94,
};

/**
 * Resolves a safe Web Speech API utterance pitch (`0.94`–`1.06`).
 * Base languages and classic Vol. 1 tracks remain at `1.0`, while Vol. 2
 * subculture mashups get subtle tonal personality without risking TTS stalls.
 */
export function resolveSpeechPitch(lang: LanguageCode | 'en'): number {
  const configured = isAdultMashupLanguage(lang)
    ? ADULT_MASHUP_PITCH_MAP[lang]
    : DEFAULT_SPEECH_PITCH;
  if (!Number.isFinite(configured)) {
    return DEFAULT_SPEECH_PITCH;
  }
  return Math.min(MAX_SAFE_SPEECH_PITCH, Math.max(MIN_SAFE_SPEECH_PITCH, configured));
}

const WATCHDOG_TIMEOUT_MS = 4500;
const SLOW_SPEECH_RATE = 0.65;
const NORMAL_SPEECH_RATE = 0.95;
const FLUENT_SPEECH_RATE = 1.12;

const SPEECH_RATE_MAP: Record<SpeechSpeed, number> = {
  slow: SLOW_SPEECH_RATE,
  normal: NORMAL_SPEECH_RATE,
  fluent: FLUENT_SPEECH_RATE,
};

function resolveSpeechSpeed(req: SpeakRequest): SpeechSpeed {
  const candidate = req.speed ?? (req.slow ? 'slow' : 'normal');
  if (candidate === 'slow' || candidate === 'normal' || candidate === 'fluent') {
    return candidate;
  }
  return req.slow ? 'slow' : 'normal';
}

const SERVER_SPEECH_STATE: SpeechRuntimeState = {
  isSpeaking: false,
  activeText: null,
  activeSpeed: null,
  fallbackActive: true,
  voicesReady: false,
  watchdogTriggered: false,
  watchdogRescueCount: 0,
};

const observedSynths = new WeakSet<object>();
const stateListeners = new Set<() => void>();

let activeToken = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
let activeAbortResolver: (() => void) | null = null;

function getSpeechSynthesisSafe(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  try {
    const synth = (window as unknown as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
    if (!synth || typeof synth.getVoices !== 'function') return null;
    return synth;
  } catch {
    return null;
  }
}

function getUtteranceConstructorSafe(): typeof SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined') return null;
  try {
    const winCtor = (
      window as unknown as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }
    ).SpeechSynthesisUtterance;
    if (typeof winCtor === 'function') return winCtor;
    if (typeof SpeechSynthesisUtterance === 'function') return SpeechSynthesisUtterance;
    return null;
  } catch {
    return null;
  }
}

function safeGetVoices(synth: SpeechSynthesis | null): SpeechSynthesisVoice[] {
  if (!synth) return [];
  try {
    const voices = synth.getVoices();
    return Array.isArray(voices) ? voices : [];
  } catch {
    return [];
  }
}

function safeCancelSynth(synth: SpeechSynthesis | null): void {
  if (!synth || typeof synth.cancel !== 'function') return;
  try {
    synth.cancel();
  } catch {
    // Ignore browser speech cancellation failures.
  }
}

let runtimeState: SpeechRuntimeState = (() => {
  const synth = getSpeechSynthesisSafe();
  const voicesReady = safeGetVoices(synth).length > 0;
  return {
    isSpeaking: false,
    activeText: null,
    activeSpeed: null,
    fallbackActive: !voicesReady,
    voicesReady,
    watchdogTriggered: false,
    watchdogRescueCount: 0,
  };
})();

function areStatesEqual(a: SpeechRuntimeState, b: SpeechRuntimeState): boolean {
  return (
    a.isSpeaking === b.isSpeaking &&
    a.activeText === b.activeText &&
    a.activeSpeed === b.activeSpeed &&
    a.fallbackActive === b.fallbackActive &&
    a.voicesReady === b.voicesReady &&
    a.watchdogTriggered === b.watchdogTriggered &&
    a.watchdogRescueCount === b.watchdogRescueCount
  );
}

function commitRuntimeState(nextPartial: Partial<SpeechRuntimeState>, emit: boolean): void {
  const next: SpeechRuntimeState = {
    ...runtimeState,
    ...nextPartial,
  };
  if (areStatesEqual(runtimeState, next)) return;
  runtimeState = next;
  if (emit) {
    stateListeners.forEach((listener) => listener());
  }
}

function refreshVoicesState(emit: boolean): boolean {
  const synth = getSpeechSynthesisSafe();
  if (synth) {
    attachVoicesListener(synth);
  }
  const voicesReady = safeGetVoices(synth).length > 0;
  if (voicesReady !== runtimeState.voicesReady) {
    commitRuntimeState(
      {
        voicesReady,
        fallbackActive: runtimeState.isSpeaking ? runtimeState.fallbackActive : !voicesReady,
      },
      emit
    );
  }
  return voicesReady;
}

function attachVoicesListener(synth: SpeechSynthesis): void {
  if (observedSynths.has(synth)) return;
  observedSynths.add(synth);

  const handleVoicesChanged = () => {
    refreshVoicesState(true);
  };

  try {
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', handleVoicesChanged);
    }
  } catch {
    // Ignore if EventTarget methods are restricted.
  }

  try {
    const existing = synth.onvoiceschanged;
    const chainedHandler = function (this: SpeechSynthesis, event: Event) {
      handleVoicesChanged();
      if (typeof existing === 'function' && existing !== chainedHandler) {
        existing.call(this, event);
      }
    };
    synth.onvoiceschanged = chainedHandler;
  } catch {
    // Ignore read-only onvoiceschanged properties.
  }
}

function normalizeLocaleTag(locale: string): string {
  return locale.trim().toLowerCase().replace(/_/g, '-');
}

export function rankVoiceForLanguage(
  voice: SpeechSynthesisVoice,
  lang: LanguageCode | 'en'
): number {
  const rawLang = typeof voice?.lang === 'string' ? voice.lang : '';
  const norm = normalizeLocaleTag(rawLang);
  if (!norm) return -1;

  const base = normalizeLocaleTag(lang);
  const preferredLocales = SPEECH_LOCALE_MAP[lang] ?? [lang];
  const preferredTags = preferredLocales.map(normalizeLocaleTag).filter(Boolean);

  const primarySubtags: string[] = [];
  for (const tag of preferredTags) {
    const primary = tag.split('-')[0];
    if (primary && !primarySubtags.includes(primary)) {
      primarySubtags.push(primary);
    }
  }

  let localeTierScore = -1;

  const exactTier = preferredTags.findIndex((tag) => tag === norm);
  if (exactTier !== -1) {
    localeTierScore = Math.max(600, 2000 - exactTier * 150);
  } else {
    const regionPrefixTier = preferredTags.findIndex(
      (tag) => tag.includes('-') && norm.startsWith(`${tag}-`)
    );
    if (regionPrefixTier !== -1) {
      localeTierScore = Math.max(360, 500 - regionPrefixTier * 20);
    } else if (norm === base || norm.startsWith(`${base}-`)) {
      localeTierScore = 340;
    } else {
      const subtagIdx = primarySubtags.findIndex(
        (sub) => norm === sub || norm.startsWith(`${sub}-`)
      );
      if (subtagIdx !== -1) {
        localeTierScore = Math.max(180, 300 - subtagIdx * 20);
      }
    }
  }

  if (localeTierScore < 0) {
    return -1;
  }

  let score = 100 + localeTierScore;

  if (voice.localService) {
    score += 60;
  }

  const voiceName = typeof voice.name === 'string' ? voice.name : '';
  if (/(natural|enhanced|neural|premium|google|wavenet|siri)/i.test(voiceName)) {
    score += 40;
  }

  if (voice.default) {
    score += 10;
  }

  return score;
}

function selectBestVoice(
  lang: LanguageCode | 'en',
  voices: readonly SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const voice of voices) {
    const score = rankVoiceForLanguage(voice, lang);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

function clearActiveTimersAndRefs(): void {
  if (activeWatchdogTimer !== null) {
    clearTimeout(activeWatchdogTimer);
    activeWatchdogTimer = null;
  }
  if (activeUtterance) {
    try {
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
    } catch {
      // Ignore read-only mock utterance handlers.
    }
    activeUtterance = null;
  }
}

function cancelActiveSpeechInternal(emitState: boolean, forceSynthCancel = false): void {
  const synth = getSpeechSynthesisSafe();
  const shouldCancelSynth = Boolean(
    forceSynthCancel ||
      runtimeState.isSpeaking ||
      activeAbortResolver !== null ||
      synth?.speaking ||
      synth?.pending
  );

  activeToken += 1;
  clearActiveTimersAndRefs();

  const abortResolver = activeAbortResolver;
  activeAbortResolver = null;
  if (abortResolver) {
    abortResolver();
  }

  stopPhoneticCadence();
  if (shouldCancelSynth) {
    safeCancelSynth(synth);
  }

  if (runtimeState.isSpeaking || runtimeState.activeText !== null) {
    commitRuntimeState(
      {
        isSpeaking: false,
        activeText: null,
        activeSpeed: null,
      },
      emitState
    );
  }
}

export function hasNativeVoice(lang: LanguageCode | 'en'): boolean {
  const synth = getSpeechSynthesisSafe();
  if (!synth) return false;
  attachVoicesListener(synth);
  const voices = safeGetVoices(synth);
  refreshVoicesState(false);
  return selectBestVoice(lang, voices) !== null;
}

export function stopSpeech(): void {
  cancelActiveSpeechInternal(true, true);
}

export function getSpeechRuntimeState(): SpeechRuntimeState {
  refreshVoicesState(false);
  return runtimeState;
}

function subscribeSpeechRuntimeState(listener: () => void): () => void {
  const synth = getSpeechSynthesisSafe();
  if (synth) {
    attachVoicesListener(synth);
  }
  refreshVoicesState(false);
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

export function useSpeechRuntimeState(): SpeechRuntimeState {
  return useSyncExternalStore(
    subscribeSpeechRuntimeState,
    getSpeechRuntimeState,
    () => SERVER_SPEECH_STATE
  );
}

async function runFallbackCadence(
  token: number,
  req: SpeakRequest,
  voicesReady: boolean
): Promise<SpeakOutcome> {
  if (token !== activeToken) {
    return { usedNativeVoice: false, fallbackActive: true };
  }

  const resolvedSpeed = resolveSpeechSpeed(req);
  commitRuntimeState(
    {
      isSpeaking: true,
      activeText: req.text,
      activeSpeed: resolvedSpeed,
      fallbackActive: true,
      voicesReady,
      watchdogTriggered: false,
    },
    true
  );

  try {
    const cadenceSource = req.phonetic?.trim() ? req.phonetic : req.text;
    await playPhoneticCadence(cadenceSource, resolvedSpeed);
  } catch {
    // Never propagate audio cadence failures.
  }

  if (token === activeToken) {
    activeAbortResolver = null;
    commitRuntimeState(
      {
        isSpeaking: false,
        activeText: null,
        activeSpeed: null,
        fallbackActive: true,
        voicesReady: safeGetVoices(getSpeechSynthesisSafe()).length > 0,
      },
      true
    );
  }

  return { usedNativeVoice: false, fallbackActive: true };
}

export async function speakPhrase(req: SpeakRequest): Promise<SpeakOutcome> {
  cancelActiveSpeechInternal(false);
  const token = activeToken;

  const synth = getSpeechSynthesisSafe();
  if (synth) {
    attachVoicesListener(synth);
  }

  const voices = safeGetVoices(synth);
  const voicesReady = voices.length > 0;
  const matchedVoice = selectBestVoice(req.language, voices);
  const UtteranceCtor = getUtteranceConstructorSafe();
  const audioPrefs = getAudioPreferences();

  const canUseNative = Boolean(
    synth &&
      UtteranceCtor &&
      matchedVoice &&
      typeof synth.speak === 'function'
  );

  if (audioPrefs.muted || audioPrefs.volume <= 0) {
    commitRuntimeState(
      {
        isSpeaking: false,
        activeText: null,
        activeSpeed: null,
        fallbackActive: !canUseNative,
        voicesReady,
        watchdogTriggered: false,
      },
      true
    );
    return {
      usedNativeVoice: false,
      fallbackActive: !canUseNative,
      localeUsed: matchedVoice?.lang,
    };
  }

  if (!req.text.trim() && !req.phonetic?.trim()) {
    commitRuntimeState(
      {
        isSpeaking: false,
        activeText: null,
        activeSpeed: null,
        fallbackActive: !canUseNative,
        voicesReady,
        watchdogTriggered: false,
      },
      true
    );
    return {
      usedNativeVoice: false,
      fallbackActive: !canUseNative,
    };
  }

  if (!canUseNative || !synth || !UtteranceCtor || !matchedVoice) {
    return runFallbackCadence(token, req, voicesReady);
  }

  const resolvedSpeed = resolveSpeechSpeed(req);
  const localeUsed = matchedVoice.lang || SPEECH_LOCALE_MAP[req.language]?.[0] || 'en-US';

  commitRuntimeState(
    {
      isSpeaking: true,
      activeText: req.text,
      activeSpeed: resolvedSpeed,
      fallbackActive: false,
      voicesReady: true,
      watchdogTriggered: false,
    },
    true
  );

  return new Promise<SpeakOutcome>((resolve) => {
    let settled = false;
    let rescuedByWatchdog = false;

    const settle = (outcome: SpeakOutcome, shouldEmit: boolean) => {
      if (settled) return;
      settled = true;
      if (token === activeToken) {
        clearActiveTimersAndRefs();
        activeAbortResolver = null;
        const watchdogTriggered = Boolean(outcome.watchdogTriggered);
        const nextRescueCount = watchdogTriggered
          ? (runtimeState.watchdogRescueCount ?? 0) + 1
          : (runtimeState.watchdogRescueCount ?? 0);
        commitRuntimeState(
          {
            isSpeaking: false,
            activeText: null,
            activeSpeed: null,
            fallbackActive: outcome.fallbackActive,
            voicesReady: safeGetVoices(getSpeechSynthesisSafe()).length > 0,
            watchdogTriggered,
            watchdogRescueCount: nextRescueCount,
          },
          shouldEmit
        );
      }
      resolve(outcome);
    };

    activeAbortResolver = () => {
      settle({ usedNativeVoice: true, fallbackActive: false, localeUsed }, false);
    };

    try {
      const utterance = new UtteranceCtor(req.text);
      utterance.voice = matchedVoice;
      utterance.lang = localeUsed;
      utterance.rate = SPEECH_RATE_MAP[resolvedSpeed];
      utterance.pitch = resolveSpeechPitch(req.language);
      utterance.volume = audioPrefs.volume;

      activeUtterance = utterance;

      utterance.onend = () => {
        if (token !== activeToken || settled || rescuedByWatchdog) return;
        settle({ usedNativeVoice: true, fallbackActive: false, localeUsed }, true);
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (token !== activeToken || settled || rescuedByWatchdog) return;
        const errCode = event?.error;
        if (errCode === 'canceled' || errCode === 'interrupted') {
          settle({ usedNativeVoice: true, fallbackActive: false, localeUsed }, true);
          return;
        }
        clearActiveTimersAndRefs();
        activeAbortResolver = null;
        runFallbackCadence(token, req, voicesReady).then((fallbackOutcome) => {
          settle(fallbackOutcome, true);
        });
      };

      activeWatchdogTimer = setTimeout(() => {
        if (token !== activeToken || settled || rescuedByWatchdog) return;
        rescuedByWatchdog = true;
        clearActiveTimersAndRefs();
        activeAbortResolver = null;
        safeCancelSynth(synth);
        const cadenceSource = req.phonetic?.trim() ? req.phonetic : req.text;
        try {
          void playPhoneticCadence(cadenceSource, resolvedSpeed).catch(() => {});
        } catch {
          // Never propagate audio cadence failures.
        }
        settle(
          {
            usedNativeVoice: false,
            fallbackActive: true,
            localeUsed,
            watchdogTriggered: true,
          },
          true
        );
      }, WATCHDOG_TIMEOUT_MS);

      synth.speak(utterance);
      if (synth.paused && typeof synth.resume === 'function') {
        synth.resume();
      }
    } catch {
      clearActiveTimersAndRefs();
      activeAbortResolver = null;
      runFallbackCadence(token, req, voicesReady).then((fallbackOutcome) => {
        settle(fallbackOutcome, true);
      });
    }
  });
}
