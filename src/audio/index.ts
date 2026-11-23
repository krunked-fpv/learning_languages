export {
  getAudioPreferences,
  playHintMisplacedNudge,
  playHintStepChime,
  playPhoneticCadence,
  playSfx,
  setAudioPreferences,
  stopHintChimes,
  stopPhoneticCadence,
} from './synthEngine';
export type { AudioPreferences } from './synthEngine';
export {
  ADULT_MASHUP_PITCH_MAP,
  getSpeechRuntimeState,
  hasNativeVoice,
  rankVoiceForLanguage,
  resolveSpeechPitch,
  SPEECH_LOCALE_MAP,
  speakPhrase,
  stopSpeech,
  useSpeechRuntimeState,
} from './speechEngine';
