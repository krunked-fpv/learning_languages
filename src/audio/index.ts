export {
  getAudioPreferences,
  playPhoneticCadence,
  playSfx,
  setAudioPreferences,
  stopPhoneticCadence,
} from './synthEngine';
export type { AudioPreferences } from './synthEngine';
export {
  getSpeechRuntimeState,
  hasNativeVoice,
  rankVoiceForLanguage,
  SPEECH_LOCALE_MAP,
  speakPhrase,
  stopSpeech,
  useSpeechRuntimeState,
} from './speechEngine';
