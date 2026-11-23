import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Sparkles, Turtle, Volume2, Zap } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import {
  LANGUAGE_META,
  type ContextClozeExercise,
  type LanguageCode,
  type SpeechSpeed,
  type TapHintToken,
} from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { SayItNormallyButton } from './SayItNormallyButton';
import {
  NO_SPACE_AFTER_RE,
  REGISTER_TAG_META,
  cleanClozeCompareChars,
  splitTapHintsAroundBlank,
} from './lessonHelpers';
import type { ExerciseDraftPayload } from './WordBankView';

export interface ContextClozeViewProps {
  exercise: ContextClozeExercise;
  language: LanguageCode;
  compact: boolean;
  locked: boolean;
  revealed: boolean;
  scaffoldingMode?: 'guided' | 'bridge' | 'fluent';
  onTurtlePlay: () => void;
  onFluentPlay?: () => void;
  onDraftChange: (draft: ExerciseDraftPayload | null) => void;
}

function tokensCoverText(tokens: readonly TapHintToken[], rawText: string): boolean {
  const cleanRaw = cleanClozeCompareChars(rawText);
  if (!cleanRaw) return tokens.length === 0;
  if (tokens.length === 0) return false;
  const cleanTokens = cleanClozeCompareChars(tokens.map((t) => t.surface).join(''));
  return cleanTokens === cleanRaw;
}

/**
 * Detects an unspaced single-letter Arabic clitic (e.g. "و") at the end of sentenceBeforeBlank
 * whose surface token overlaps expectedBlank ("والوئام") and therefore cannot be a clickable hint.
 */
function extractAttachedCliticSuffix(
  beforeTokens: readonly TapHintToken[],
  sentenceBeforeBlank: string
): string | null {
  if (!sentenceBeforeBlank || /\s$/.test(sentenceBeforeBlank)) return null;
  const cleanRaw = cleanClozeCompareChars(sentenceBeforeBlank);
  const cleanTokens = cleanClozeCompareChars(beforeTokens.map((t) => t.surface).join(''));
  if (!cleanTokens || !cleanRaw.startsWith(cleanTokens)) return null;
  const remainder = cleanRaw.slice(cleanTokens.length);
  if (remainder.length >= 1 && remainder.length <= 2) {
    const trimmed = sentenceBeforeBlank.trimEnd();
    return trimmed.slice(-remainder.length);
  }
  return null;
}

export function ContextClozeView({
  exercise,
  language,
  compact,
  locked,
  revealed,
  scaffoldingMode = 'guided',
  onTurtlePlay,
  onFluentPlay,
  onDraftChange,
}: ContextClozeViewProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [peekPhonetics, setPeekPhonetics] = useState(false);

  useEffect(() => {
    setSelectedChoice(null);
    setPeekPhonetics(false);
  }, [exercise.id]);

  const audioSentence = useMemo(
    () =>
      exercise.fullForeignSentence?.trim() ||
      `${exercise.sentenceBeforeBlank}${exercise.expectedBlank}${exercise.sentenceAfterBlank}`,
    [exercise]
  );

  useEffect(() => {
    if (!selectedChoice) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      submitted: selectedChoice,
      expected: exercise.expectedBlank,
      accepted: exercise.acceptedBlanks.length > 0 ? exercise.acceptedBlanks : [exercise.expectedBlank],
      speakOnResult: audioSentence,
      phoneticHint: exercise.phonetic,
      nuanceNote: exercise.nuanceNote,
      registerTag: exercise.registerTag,
    });
  }, [selectedChoice, exercise, audioSentence, onDraftChange]);

  const langDir = LANGUAGE_META[language].dir;
  const isGuided = scaffoldingMode === 'guided';
  const showPhonetics = isGuided || peekPhonetics;
  const registerMeta = exercise.registerTag ? REGISTER_TAG_META[exercise.registerTag] : null;

  const { beforeTokens, afterTokens, unmatchedTokens } = useMemo(
    () =>
      splitTapHintsAroundBlank(
        exercise.sentenceBeforeBlank,
        exercise.sentenceAfterBlank,
        exercise.expectedBlank,
        exercise.tapHints
      ),
    [exercise]
  );

  const usesSpaces = LANGUAGE_META[language].usesSpaces;
  const attachedClitic = useMemo(
    () => extractAttachedCliticSuffix(beforeTokens, exercise.sentenceBeforeBlank),
    [beforeTokens, exercise.sentenceBeforeBlank]
  );
  const inlineBeforeHints =
    tokensCoverText(beforeTokens, exercise.sentenceBeforeBlank) || Boolean(attachedClitic);
  const inlineAfterHints = tokensCoverText(afterTokens, exercise.sentenceAfterBlank);
  const fallbackPeekTokens = useMemo(() => {
    if (inlineBeforeHints && inlineAfterHints) return [];
    const expectedNorm = cleanClozeCompareChars(exercise.expectedBlank);
    const collected = [
      ...(!inlineBeforeHints ? beforeTokens : []),
      ...(!inlineAfterHints ? afterTokens : []),
      ...unmatchedTokens,
    ];
    if (collected.length > 0) return collected;
    return exercise.tapHints.filter((t) => {
      const c = cleanClozeCompareChars(t.surface);
      return c !== expectedNorm && (!expectedNorm || !c.includes(expectedNorm));
    });
  }, [inlineBeforeHints, inlineAfterHints, beforeTokens, afterTokens, unmatchedTokens, exercise]);

  const triggerSpeak = (speed: SpeechSpeed) => {
    playSfx('button_click');
    if (speed === 'slow') onTurtlePlay();
    if (speed === 'fluent') onFluentPlay?.();
    void speakPhrase({
      text: audioSentence,
      language,
      phonetic: exercise.phonetic,
      slow: speed === 'slow',
      speed,
    });
  };

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '10px 12px' : '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 13,
        width: '100%',
      }}
    >
      {/* Header Chips + Peek Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--tint-indigo-bg)',
              color: 'var(--tint-indigo-ink)',
              fontSize: '0.74rem',
              fontWeight: 900,
              textTransform: 'uppercase',
            }}
          >
            Context Cloze
          </span>
          {registerMeta ? (
            <span
              style={{
                padding: '3px 9px',
                borderRadius: 999,
                background: registerMeta.bg,
                border: `1.5px solid ${registerMeta.border}`,
                color: registerMeta.ink,
                fontSize: '0.7rem',
                fontWeight: 900,
              }}
            >
              {registerMeta.label}
            </span>
          ) : null}
        </div>

        {!isGuided && (exercise.phonetic || exercise.romanized) ? (
          <button
            type="button"
            className={`tactile-btn ${peekPhonetics ? 'tactile-btn-amber' : 'tactile-btn-soft'}`}
            style={{ padding: '4px 9px', fontSize: '0.74rem', borderRadius: 12 }}
            onClick={() => {
              playSfx('tile_tap');
              setPeekPhonetics((v) => !v);
            }}
          >
            {peekPhonetics ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{peekPhonetics ? 'Hide Phonetic / Romanized' : 'Peek Phonetic / Romanized'}</span>
          </button>
        ) : null}
      </div>

      {/* Sentence Prompt with Interactive Blank & Tap-Hints */}
      <div
        style={{
          padding: compact ? '10px 12px' : '14px 16px',
          borderRadius: 18,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          dir={langDir}
          style={{
            fontSize: compact ? '1.02rem' : '1.26rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            lineHeight: langDir === 'rtl' ? 1.7 : 1.48,
            unicodeBidi: 'isolate',
            overflowWrap: 'break-word',
          }}
        >
          {inlineBeforeHints ? (
            <>
              <TapHintText
                tokens={beforeTokens}
                fallbackText={exercise.sentenceBeforeBlank}
                language={language}
              />
              {attachedClitic ? ` ${attachedClitic}` : ''}
              {usesSpaces &&
              !attachedClitic &&
              beforeTokens.length > 0 &&
              exercise.sentenceBeforeBlank.length > 0 &&
              !NO_SPACE_AFTER_RE.test(exercise.sentenceBeforeBlank.trimEnd())
                ? ' '
                : ''}
            </>
          ) : (
            <span>
              {exercise.sentenceBeforeBlank}
              {usesSpaces &&
              exercise.sentenceBeforeBlank &&
              !/\s$/.test(exercise.sentenceBeforeBlank) &&
              !NO_SPACE_AFTER_RE.test(exercise.sentenceBeforeBlank)
                ? ' '
                : ''}
            </span>
          )}

          <span
            aria-label={selectedChoice ? `Blank filled with ${selectedChoice}` : 'Empty blank'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: compact ? 76 : 96,
              maxWidth: '100%',
              padding: '2px 12px',
              marginInline: attachedClitic ? 1 : usesSpaces ? 3 : 2,
              borderRadius: 12,
              border: `2px ${selectedChoice ? 'solid' : 'dashed'} var(--lang-primary)`,
              background: selectedChoice ? 'var(--tile-selected-bg)' : 'var(--tile-bg)',
              color: selectedChoice ? 'var(--tile-selected-ink)' : 'var(--text-muted)',
              fontWeight: 900,
              boxShadow: selectedChoice ? '0 0 0 3px var(--lang-tint)' : 'none',
              verticalAlign: 'baseline',
              overflowWrap: 'anywhere',
              whiteSpace: 'normal',
            }}
          >
            {selectedChoice ?? '______'}
          </span>

          {inlineAfterHints ? (
            <>
              {usesSpaces &&
              afterTokens.length > 0 &&
              (/^\s/.test(exercise.sentenceAfterBlank) ||
                !/^[.,!?;:)"'»’”؟،؛।॥\-]/.test(exercise.sentenceAfterBlank))
                ? ' '
                : ''}
              <TapHintText
                tokens={afterTokens}
                fallbackText={exercise.sentenceAfterBlank}
                language={language}
              />
            </>
          ) : (
            <span>
              {usesSpaces &&
              exercise.sentenceAfterBlank &&
              !/^[\s.,!?;:)"'»’”؟،؛।॥\-]/.test(exercise.sentenceAfterBlank)
                ? ' '
                : ''}
              {exercise.sentenceAfterBlank}
            </span>
          )}
        </div>

        {fallbackPeekTokens.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              Peek words:
            </span>
            <TapHintText tokens={fallbackPeekTokens} language={language} />
          </div>
        ) : null}

        <div style={{ fontSize: compact ? '0.84rem' : '0.94rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          {exercise.englishTranslation}
        </div>

        {showPhonetics && (exercise.romanized || exercise.phonetic) ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
            {exercise.romanized ? (
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
                {exercise.romanized}
              </span>
            ) : null}
            {exercise.phonetic ? (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {exercise.phonetic}
              </span>
            ) : null}
          </div>
        ) : null}

        <SayItNormallyButton
          language={language}
          dialectAText={exercise.fullForeignSentence}
          dialectBText={exercise.englishTranslation}
          explicitPlain={exercise.plainEnglish}
          nuanceNote={exercise.nuanceNote}
          avoidTerms={revealed ? undefined : [exercise.expectedBlank]}
          resetKey={exercise.id}
          size="sm"
        />
      </div>

      {/* 1.0x / 0.65x / 1.12x Audio Controls */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="tactile-btn tactile-btn-primary"
          style={{ flex: '1 1 92px', padding: compact ? '6px 8px' : '8px 12px', fontSize: compact ? '0.78rem' : '0.86rem' }}
          aria-label="1.0x Normal speed audio"
          onClick={() => triggerSpeak('normal')}
        >
          <Volume2 size={15} />
          <span>1.0x Normal</span>
        </button>
        <button
          type="button"
          className="tactile-btn tactile-btn-amber"
          style={{ flex: '1 1 92px', padding: compact ? '6px 8px' : '8px 12px', fontSize: compact ? '0.78rem' : '0.86rem' }}
          aria-label="0.65x Slow Turtle audio"
          onClick={() => triggerSpeak('slow')}
        >
          <Turtle size={15} />
          <span>0.65x Slow</span>
        </button>
        <button
          type="button"
          className="tactile-btn tactile-btn-indigo"
          style={{ flex: '1 1 92px', padding: compact ? '6px 8px' : '8px 12px', fontSize: compact ? '0.78rem' : '0.86rem' }}
          aria-label="1.12x Fluent speed audio"
          onClick={() => triggerSpeak('fluent')}
        >
          <Zap size={15} />
          <span>1.12x Fluent</span>
        </button>
      </div>

      {/* 3-4 Choice Tiles */}
      <div
        role="radiogroup"
        aria-label="Fill in the blank choices"
        style={{
          display: 'grid',
          gridTemplateColumns:
            compact && exercise.choices.some((c) => c.length > 18)
              ? '1fr'
              : exercise.choices.length >= 4
                ? 'repeat(2, minmax(0, 1fr))'
                : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: compact ? 7 : 10,
        }}
      >
        {exercise.choices.map((choice) => {
          const isSelected = selectedChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={locked}
              dir={langDir}
              className="tactile-btn"
              style={{
                minWidth: 0,
                justifyContent: 'space-between',
                padding: compact ? '9px 11px' : '12px 15px',
                fontSize: compact ? '0.9rem' : '1rem',
                lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                background: isSelected ? 'var(--tile-selected-bg)' : 'var(--tile-bg)',
                borderColor: isSelected ? 'var(--lang-primary)' : 'var(--tile-border)',
                color: isSelected ? 'var(--tile-selected-ink)' : 'var(--text-main)',
                textAlign: langDir === 'rtl' ? 'right' : 'left',
              }}
              onClick={() => {
                playSfx('tile_tap');
                setSelectedChoice(choice);
              }}
            >
              <span dir={langDir} style={{ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                {choice}
              </span>
              {isSelected ? <Check size={16} style={{ flexShrink: 0 }} /> : null}
            </button>
          );
        })}
      </div>

      {/* Glowing Nuance / Register Spotlight Callout on Check */}
      {revealed && exercise.nuanceNote ? (
        <div
          role="note"
          aria-label="Nuance and Register Spotlight"
          style={{
            padding: compact ? '8px 11px' : '11px 14px',
            borderRadius: 16,
            background: 'var(--tint-amber-bg)',
            border: '2px solid var(--tint-amber-border)',
            boxShadow: '0 0 18px rgba(251, 191, 36, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              color: 'var(--tint-amber-ink)',
              fontWeight: 900,
              fontSize: '0.82rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={15} /> Nuance / Register Spotlight
            </span>
            {registerMeta ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: registerMeta.bg,
                  border: `1px solid ${registerMeta.border}`,
                  color: registerMeta.ink,
                  fontSize: '0.7rem',
                }}
              >
                {registerMeta.label}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {exercise.nuanceNote}
          </div>
        </div>
      ) : null}
    </div>
  );
}
