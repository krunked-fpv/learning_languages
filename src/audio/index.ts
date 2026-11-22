import { useState } from 'react';
import type {
  LanguageCode,
  SoundEffectId,
  SpeakOutcome,
  SpeakRequest,
  SpeechRuntimeState,
} from '../types/contracts';

export function playSfx(_id: SoundEffectId, _comboIndex?: number): void {}

export async function playPhoneticCadence(_phonetic: string, _slow = false): Promise<void> {}

export function setAudioPreferences(_settings: { volume: number; muted: boolean }): void {}

export async function speakPhrase(_req: SpeakRequest): Promise<SpeakOutcome> {
  return { usedNativeVoice: false, fallbackActive: true };
}

export function stopSpeech(): void {}

export function hasNativeVoice(_lang: LanguageCode | 'en'): boolean {
  return false;
}

export function getSpeechRuntimeState(): SpeechRuntimeState {
  return {
    isSpeaking: false,
    activeText: null,
    activeSpeed: null,
    fallbackActive: true,
    voicesReady: false,
  };
}

export function useSpeechRuntimeState(): SpeechRuntimeState {
  const [state] = useState<SpeechRuntimeState>(() => getSpeechRuntimeState());
  return state;
}
