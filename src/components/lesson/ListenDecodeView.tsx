import { useEffect, useMemo, useState } from 'react';
import { Volume2, Turtle, Sparkles, Check } from 'lucide-react';
import { hasNativeVoice, playSfx, speakPhrase, useSpeechRuntimeState } from '../../audio';
import type { LanguageCode, ListenDecodeExercise } from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { splitPhoneticSyllables } from './lessonHelpers';
import { WordBankTray, buildWordBankPool, getAssembledText } from './WordBankTray';
import type { ExerciseDraftPayload } from './WordBankView';

export interface ListenDecodeViewProps {
  exercise: ListenDecodeExercise;
  language: LanguageCode;
  compact: boolean;
  locked: boolean;
  revealed: boolean;
  onTurtlePlay: () => void;
  onDraftChange: (draft: ExerciseDraftPayload | null) => void;
}

export function ListenDecodeView({
  exercise,
  language,
  compact,
  locked,
  revealed,
  onTurtlePlay,
  onDraftChange,
}: ListenDecodeViewProps) {
  const speechState = useSpeechRuntimeState();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedTileUids, setSelectedTileUids] = useState<string[]>([]);
  const [manualPhoneticOpen, setManualPhoneticOpen] = useState(false);

  useEffect(() => {
    setSelectedChoice(null);
    setSelectedTileUids([]);
    setManualPhoneticOpen(false);
  }, [exercise.id]);

  const pool = useMemo(
    () =>
      exercise.mode === 'assemble_heard'
        ? buildWordBankPool(
            exercise.id,
            exercise.targetTokens ?? [],
            exercise.distractorTokens ?? []
          )
        : [],
    [exercise.id, exercise.mode, exercise.targetTokens, exercise.distractorTokens]
  );

  const submittedValue = useMemo(() => {
    if (exercise.mode === 'select_meaning') return selectedChoice ?? '';
    return getAssembledText(pool, selectedTileUids);
  }, [exercise.mode, selectedChoice, pool, selectedTileUids]);

  useEffect(() => {
    if (!submittedValue) {
      onDraftChange(null);
      return;
    }
    const expected =
      exercise.mode === 'select_meaning' ? exercise.englishMeaning : exercise.audioText;
    onDraftChange({
      submitted: submittedValue,
      expected,
      accepted: exercise.acceptedAnswers,
      speakOnResult: exercise.audioText,
      phoneticHint: exercise.phonetic,
    });
  }, [submittedValue, exercise, onDraftChange]);

  const showPhoneticBanner =
    !hasNativeVoice(language) || speechState.fallbackActive || manualPhoneticOpen;
  const syllables = useMemo(() => splitPhoneticSyllables(exercise.phonetic), [exercise.phonetic]);

  const triggerSpeak = (slow: boolean) => {
    playSfx('button_click');
    if (slow) onTurtlePlay();
    void speakPhrase({
      text: exercise.audioText,
      language,
      phonetic: exercise.phonetic,
      slow,
    });
  };

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '12px 14px' : '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 14,
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--lang-tint)',
            color: 'var(--lang-bevel)',
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
          }}
        >
          {exercise.mode === 'select_meaning'
            ? 'Listen & Pick the Meaning'
            : 'Listen & Build What You Heard'}
        </span>

        {hasNativeVoice(language) && !speechState.fallbackActive ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-soft"
            style={{ padding: '4px 10px', fontSize: '0.76rem', borderRadius: 12 }}
            onClick={() => setManualPhoneticOpen((v) => !v)}
          >
            {manualPhoneticOpen ? 'Hide Phonetic Clue' : 'Show Phonetic Clue'}
          </button>
        ) : null}
      </div>

      {/* Oversized 1.0x Normal + 0.65x Slow Speaker Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: compact ? 8 : 12,
        }}
      >
        <button
          type="button"
          className="tactile-btn tactile-btn-hero tactile-btn-primary"
          style={{ minHeight: compact ? 52 : 64 }}
          onClick={() => triggerSpeak(false)}
          aria-label="1.0x Normal speed audio"
        >
          <Volume2 size={compact ? 22 : 26} />
          <span>1.0x Normal</span>
        </button>

        <button
          type="button"
          className="tactile-btn tactile-btn-hero tactile-btn-amber"
          style={{ minHeight: compact ? 52 : 64 }}
          onClick={() => triggerSpeak(true)}
          aria-label="0.65x Slow Turtle audio"
        >
          <Turtle size={compact ? 22 : 26} />
          <span>0.65x Slow</span>
        </button>
      </div>

      {/* Automatic Phonetic Clue Banner whenever native voice is unavailable or fallback is active */}
      {showPhoneticBanner ? (
        <div
          role="note"
          aria-label="Phonetic clue"
          style={{
            padding: compact ? '8px 12px' : '11px 14px',
            borderRadius: 16,
            background: '#fffbeb',
            border: '2px solid #fbbf24',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 900, fontSize: '0.82rem' }}>
            <Sparkles size={15} />
            <span>Phonetic Sound Clue</span>
          </div>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#78350f' }}>
            {exercise.voiceFallbackPhoneticPrompt}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
            {syllables.map((syl, idx) => (
              <span
                key={`${syl.text}-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: syl.stressed ? '#fde68a' : '#fef3c7',
                    border: syl.stressed ? '2px solid #d97706' : '1px solid #fcd34d',
                    color: '#451a03',
                    fontSize: '0.84rem',
                    fontWeight: syl.stressed ? 900 : 700,
                  }}
                >
                  {syl.text}
                </span>
                {idx < syllables.length - 1 ? (
                  <span aria-hidden="true" style={{ color: '#d97706', fontWeight: 900 }}>
                    {syl.isWordEnd ? ' ' : '•'}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Answer Mode UI */}
      {exercise.mode === 'select_meaning' ? (
        <div
          role="radiogroup"
          aria-label="Meaning choices"
          style={{
            display: 'grid',
            gridTemplateColumns: (exercise.choices?.length ?? 0) > 2 ? 'repeat(auto-fit, minmax(180px, 1fr))' : '1fr',
            gap: compact ? 8 : 10,
          }}
        >
          {(exercise.choices ?? []).map((choice) => {
            const isSelected = selectedChoice === choice;
            return (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={locked}
                className="tactile-btn"
                style={{
                  justifyContent: 'space-between',
                  padding: compact ? '10px 14px' : '13px 16px',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  borderColor: isSelected ? '#4f46e5' : '#cbd5e1',
                  color: isSelected ? '#312e81' : '#1e1b4b',
                  textAlign: 'left',
                }}
                onClick={() => {
                  playSfx('tile_tap');
                  setSelectedChoice(choice);
                }}
              >
                <span>{choice}</span>
                {isSelected ? <Check size={17} /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <WordBankTray
          seed={exercise.id}
          targetTokens={exercise.targetTokens ?? []}
          distractorTokens={exercise.distractorTokens ?? []}
          selectedTileUids={selectedTileUids}
          disabled={locked}
          compact={compact}
          onChangeSelected={setSelectedTileUids}
        />
      )}

      {/* Reveal TapHints after answering */}
      {revealed ? (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 14,
            background: '#f8fafc',
            border: '2px solid #cbd5e1',
            fontSize: '0.9rem',
            fontWeight: 800,
          }}
        >
          Phrase:{' '}
          <TapHintText
            tokens={exercise.tapHints}
            fallbackText={exercise.audioText}
            language={language}
          />
        </div>
      ) : null}
    </div>
  );
}
