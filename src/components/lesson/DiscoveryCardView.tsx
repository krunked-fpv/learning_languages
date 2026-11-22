import { Volume2, Turtle, Sparkles } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase, useSpeechRuntimeState } from '../../audio';
import { GENDER_BADGE_META, LANGUAGE_META, type DiscoveryCardExercise, type LanguageCode, type VocabCard } from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { buildTapHintsFromExample } from './lessonHelpers';

export interface DiscoveryCardViewProps {
  exercise: DiscoveryCardExercise;
  language: LanguageCode;
  vocabCard?: VocabCard;
  compact: boolean;
  onTurtlePlay: () => void;
}

export function DiscoveryCardView({
  exercise,
  language,
  vocabCard,
  compact,
  onTurtlePlay,
}: DiscoveryCardViewProps) {
  const speechState = useSpeechRuntimeState();

  if (!vocabCard) {
    return (
      <div className="tactile-card" style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700 }}>
          Discovery sticker <strong>{exercise.vocabId}</strong> is ready to collect!
        </p>
      </div>
    );
  }

  const langDir = LANGUAGE_META[language].dir;
  const genderMeta = GENDER_BADGE_META[vocabCard.gender];
  const exampleTokens = buildTapHintsFromExample(
    vocabCard.exampleForeign,
    vocabCard.exampleEnglish,
    vocabCard.examplePhonetic,
    vocabCard
  );

  const handleSpeak = (slow: boolean) => {
    playSfx('button_click');
    if (slow) onTurtlePlay();
    void speakPhrase({
      text: vocabCard.bareForeign,
      language,
      phonetic: vocabCard.phonetic,
      slow,
    });
  };

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '14px 14px' : '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 8 : 12,
        textAlign: 'center',
        width: '100%',
      }}
    >
      {/* Header Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--tint-indigo-bg)',
            color: 'var(--tint-indigo-ink)',
            fontSize: '0.75rem',
            fontWeight: 900,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          <Sparkles size={13} /> New Sticker Word
        </span>
        <span
          className="gender-pill"
          style={{
            backgroundColor: genderMeta.bgColor,
            color: genderMeta.textColor,
            borderColor: genderMeta.borderColor,
          }}
        >
          {genderMeta.label}
        </span>
      </div>

      {/* Main Illustration */}
      <div
        style={{
          padding: compact ? 6 : 10,
          borderRadius: 24,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
        }}
      >
        <VocabIllustration
          illustrationKey={vocabCard.illustrationKey}
          language={language}
          size={compact ? 80 : 114}
        />
      </div>

      {/* Foreign Word + English + Romanized + Phonetics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          dir={langDir}
          style={{
            fontSize: compact ? '1.4rem' : '1.85rem',
            fontWeight: 900,
            color: 'var(--lang-primary)',
            lineHeight: langDir === 'rtl' ? 1.5 : 1.18,
          }}
        >
          {vocabCard.foreignWithArticle}
        </div>
        <div style={{ fontSize: compact ? '0.96rem' : '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {vocabCard.english}
        </div>
        {vocabCard.romanized ? (
          <div style={{ fontSize: compact ? '0.84rem' : '0.94rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            {vocabCard.romanized}
          </div>
        ) : null}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '2px auto 0',
            padding: '3px 12px',
            borderRadius: 999,
            background: 'var(--tint-indigo-bg)',
            color: 'var(--tint-indigo-ink)',
            fontSize: compact ? '0.82rem' : '0.9rem',
            fontWeight: 800,
          }}
        >
          Say: {vocabCard.phonetic}
        </div>
      </div>

      {/* 1.0x + 0.65x Turtle Audio Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="tactile-btn tactile-btn-primary"
          style={{ padding: compact ? '7px 14px' : '9px 18px', fontSize: compact ? '0.86rem' : '0.95rem' }}
          onClick={() => handleSpeak(false)}
          aria-label={`Speak ${vocabCard.bareForeign} at normal speed`}
        >
          <Volume2 size={18} />
          <span>{speechState.isSpeaking && speechState.activeSpeed === 'normal' ? 'Speaking...' : '1.0x Normal'}</span>
        </button>

        <button
          type="button"
          className="tactile-btn tactile-btn-amber"
          style={{ padding: compact ? '7px 14px' : '9px 18px', fontSize: compact ? '0.86rem' : '0.95rem' }}
          onClick={() => handleSpeak(true)}
          aria-label={`Speak ${vocabCard.bareForeign} slowly`}
        >
          <Turtle size={18} />
          <span>{speechState.isSpeaking && speechState.activeSpeed === 'slow' ? 'Slow...' : '0.65x Turtle'}</span>
        </button>
      </div>

      {/* Optional Accent Callout */}
      {vocabCard.accentCallout ? (
        <div
          style={{
            padding: '5px 12px',
            borderRadius: 12,
            background: 'var(--tint-amber-bg)',
            border: '2px solid var(--tint-amber-border)',
            color: 'var(--tint-amber-ink)',
            fontSize: '0.8rem',
            fontWeight: 800,
          }}
        >
          Accent Spotlight ({vocabCard.accentCallout.char}): {vocabCard.accentCallout.tip}
        </div>
      ) : null}

      {/* Example Sentence with Tap-to-Peek */}
      <div
        style={{
          width: '100%',
          padding: compact ? '8px 10px' : '10px 14px',
          borderRadius: 16,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            dir={langDir}
            style={{
              fontSize: compact ? '0.92rem' : '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              lineHeight: langDir === 'rtl' ? 1.5 : 1.35,
            }}
          >
            <TapHintText
              tokens={exampleTokens}
              fallbackText={vocabCard.exampleForeign}
              language={language}
            />
          </span>
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: '4px 8px', borderRadius: 10 }}
            aria-label="Hear example sentence"
            onClick={() => {
              playSfx('button_click');
              void speakPhrase({
                text: vocabCard.exampleForeign,
                language,
                phonetic: vocabCard.examplePhonetic,
              });
            }}
          >
            <Volume2 size={14} />
          </button>
        </div>
        {vocabCard.exampleRomanized ? (
          <div style={{ fontSize: compact ? '0.76rem' : '0.82rem', color: 'var(--lang-primary)', fontWeight: 700 }}>
            {vocabCard.exampleRomanized}
          </div>
        ) : null}
        <div style={{ fontSize: compact ? '0.78rem' : '0.86rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          {vocabCard.exampleEnglish}
        </div>
      </div>

      {exercise.promptHint ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          Tip: {exercise.promptHint}
        </div>
      ) : null}
    </div>
  );
}
