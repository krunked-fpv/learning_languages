import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Volume2, Turtle, Sparkles, Zap } from 'lucide-react';
import { VocabIllustration } from '../../art/VocabIllustration';
import { playSfx, speakPhrase, useSpeechRuntimeState } from '../../audio';
import {
  GENDER_BADGE_META,
  LANGUAGE_META,
  type DiscoveryCardExercise,
  type LanguageCode,
  type SpeechSpeed,
  type VocabCard,
} from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { SayItNormallyButton } from './SayItNormallyButton';
import { buildTapHintsFromExample } from './lessonHelpers';

export interface DiscoveryCardViewProps {
  exercise: DiscoveryCardExercise;
  language: LanguageCode;
  vocabCard?: VocabCard;
  compact: boolean;
  onTurtlePlay: () => void;
  onFluentPlay?: () => void;
}

export function DiscoveryCardView({
  exercise,
  language,
  vocabCard,
  compact,
  onTurtlePlay,
  onFluentPlay,
}: DiscoveryCardViewProps) {
  const speechState = useSpeechRuntimeState();
  const reduceMotion = useReducedMotion();
  const cornerGradId = `disc-gild-${useId().replace(/:/g, '-')}`;

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

  const handleSpeak = (speed: SpeechSpeed) => {
    playSfx('button_click');
    if (speed === 'slow') onTurtlePlay();
    if (speed === 'fluent') onFluentPlay?.();
    void speakPhrase({
      text: vocabCard.foreignWithArticle || vocabCard.bareForeign,
      language,
      phonetic: vocabCard.phonetic,
      slow: speed === 'slow',
      speed,
    });
  };

  return (
    <motion.div
      key={exercise.id}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 205, damping: 24, mass: 1.15 }}
      className="tactile-card cozy-discovery-card"
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
      {/* Gilded Botanical Atlas Corner Flourishes */}
      <svg
        aria-hidden="true"
        className="cozy-corner-ornament is-tl"
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
      >
        <defs>
          <linearGradient id={cornerGradId} x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--gild, #c99a3e)" />
            <stop offset="100%" stopColor="var(--ink-soft, #8a6b52)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <path d="M3 24V7a4 4 0 0 1 4-4h17" stroke={`url(#${cornerGradId})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="2.1" fill="var(--gild, #c99a3e)" opacity="0.7" />
      </svg>
      <svg
        aria-hidden="true"
        className="cozy-corner-ornament is-br"
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
      >
        <path d="M27 6v17a4 4 0 0 1-4 4H6" stroke={`url(#${cornerGradId})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="21.5" cy="21.5" r="2.1" fill="var(--gild, #c99a3e)" opacity="0.7" />
      </svg>
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
        className="cozy-specimen-mat"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', minWidth: 0, overflowWrap: 'break-word' }}>
        <div
          dir={langDir}
          style={{
            fontSize: compact ? '1.3rem' : '1.85rem',
            fontWeight: 900,
            color: 'var(--lang-primary)',
            lineHeight: langDir === 'rtl' ? 1.5 : 1.18,
            overflowWrap: 'break-word',
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

      {/* 1.0x + 0.65x Turtle + 1.12x Fluent Audio Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="tactile-btn tactile-btn-primary"
          style={{ padding: compact ? '6px 12px' : '9px 16px', fontSize: compact ? '0.82rem' : '0.94rem' }}
          onClick={() => handleSpeak('normal')}
          aria-label={`Speak ${vocabCard.bareForeign} at normal speed`}
        >
          <Volume2 size={17} />
          <span>{speechState.isSpeaking && speechState.activeSpeed === 'normal' ? 'Speaking...' : '1.0x Normal'}</span>
        </button>

        <button
          type="button"
          className="tactile-btn tactile-btn-amber"
          style={{ padding: compact ? '6px 12px' : '9px 16px', fontSize: compact ? '0.82rem' : '0.94rem' }}
          onClick={() => handleSpeak('slow')}
          aria-label={`Speak ${vocabCard.bareForeign} slowly`}
        >
          <Turtle size={17} />
          <span>{speechState.isSpeaking && speechState.activeSpeed === 'slow' ? 'Slow...' : '0.65x Turtle'}</span>
        </button>

        <button
          type="button"
          className="tactile-btn tactile-btn-indigo"
          style={{ padding: compact ? '6px 12px' : '9px 16px', fontSize: compact ? '0.82rem' : '0.94rem' }}
          onClick={() => handleSpeak('fluent')}
          aria-label={`Speak ${vocabCard.bareForeign} at fluent speed`}
        >
          <Zap size={16} />
          <span>{speechState.isSpeaking && speechState.activeSpeed === 'fluent' ? 'Fluent...' : '1.12x Fluent'}</span>
        </button>
      </div>

      {/* Optional Accent / Register / Grammar Callouts */}
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

      {vocabCard.registerNote || vocabCard.grammarNote ? (
        <div
          style={{
            padding: '5px 12px',
            borderRadius: 12,
            background: 'var(--tint-emerald-bg)',
            border: '2px solid var(--tint-emerald-border)',
            color: 'var(--tint-emerald-ink)',
            fontSize: '0.78rem',
            fontWeight: 800,
          }}
        >
          {[vocabCard.registerNote, vocabCard.grammarNote].filter(Boolean).join(' • ')}
        </div>
      ) : null}

      {/* Example Sentence with Tap-to-Peek */}
      <div
        className="cozy-example-strip"
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

      <SayItNormallyButton
        language={language}
        dialectAText={vocabCard.foreignWithArticle}
        dialectBText={vocabCard.english}
        explicitPlain={vocabCard.plainEnglish}
        registerNote={vocabCard.registerNote}
        secondaryDialectAText={vocabCard.exampleForeign}
        secondaryDialectBText={vocabCard.exampleEnglish}
        secondaryExplicitPlain={vocabCard.examplePlainEnglish}
        resetKey={exercise.id}
        size={compact ? 'sm' : 'md'}
      />

      {exercise.promptHint ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
          Tip: {exercise.promptHint}
        </div>
      ) : null}
    </motion.div>
  );
}
