import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Grid, Volume2, Turtle } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type WordBankExercise } from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { WordBankTray, buildWordBankPool, getAssembledText } from './WordBankTray';

export interface ExerciseDraftPayload {
  submitted: string;
  expected: string;
  accepted: readonly string[];
  expectedArticle?: string;
  speakOnResult?: string;
  phoneticHint?: string;
}

export interface WordBankViewProps {
  exercise: WordBankExercise;
  language: LanguageCode;
  compact: boolean;
  locked: boolean;
  onTurtlePlay: () => void;
  onDraftChange: (draft: ExerciseDraftPayload | null) => void;
  onSubmitShortcut?: () => void;
}

export function WordBankView({
  exercise,
  language,
  compact,
  locked,
  onTurtlePlay,
  onDraftChange,
  onSubmitShortcut,
}: WordBankViewProps) {
  const [inputMode, setInputMode] = useState<'tiles' | 'type'>('tiles');
  const [selectedTileUids, setSelectedTileUids] = useState<string[]>([]);
  const [typedText, setTypedText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputMode('tiles');
    setSelectedTileUids([]);
    setTypedText('');
  }, [exercise.id]);

  const pool = useMemo(
    () => buildWordBankPool(exercise.id, exercise.targetTokens, exercise.distractorTokens),
    [exercise.id, exercise.targetTokens, exercise.distractorTokens]
  );

  const submittedValue = useMemo(() => {
    if (inputMode === 'type') return typedText.trim();
    return getAssembledText(pool, selectedTileUids);
  }, [inputMode, typedText, pool, selectedTileUids]);

  useEffect(() => {
    if (!submittedValue) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      submitted: submittedValue,
      expected: exercise.expectedSentence,
      accepted: exercise.acceptedSentences,
      expectedArticle: exercise.articleHint,
      speakOnResult:
        exercise.direction === 'to_foreign' ? exercise.expectedSentence : exercise.promptSpeakText,
      phoneticHint: exercise.phoneticHint,
    });
  }, [submittedValue, exercise, onDraftChange]);

  const langMeta = LANGUAGE_META[language];
  const speakPromptText = exercise.promptSpeakText ?? (exercise.direction === 'to_english' ? exercise.promptText : undefined);

  const insertAccentChar = (ch: string) => {
    if (locked) return;
    playSfx('tile_tap');
    const el = inputRef.current;
    if (!el) {
      setTypedText((prev) => prev + ch);
      return;
    }
    const start = el.selectionStart ?? typedText.length;
    const end = el.selectionEnd ?? typedText.length;
    const next = typedText.slice(0, start) + ch + typedText.slice(end);
    setTypedText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
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
      {/* Top Direction Header + Mode Toggle */}
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
          {exercise.direction === 'to_english'
            ? 'Translate to English'
            : `Translate to ${langMeta.name}`}
        </span>

        <button
          type="button"
          className="tactile-btn tactile-btn-soft"
          style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: 12 }}
          disabled={locked}
          onClick={() => {
            playSfx('button_click');
            setInputMode((m) => (m === 'tiles' ? 'type' : 'tiles'));
          }}
        >
          {inputMode === 'tiles' ? (
            <>
              <Keyboard size={15} />
              <span>Type Instead</span>
            </>
          ) : (
            <>
              <Grid size={15} />
              <span>Use Word Tiles</span>
            </>
          )}
        </button>
      </div>

      {/* Prompt Sentence Card */}
      <div
        style={{
          padding: compact ? '10px 12px' : '14px 16px',
          borderRadius: 18,
          background: '#f8fafc',
          border: '2px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontSize: compact ? '1.12rem' : '1.35rem', fontWeight: 900, color: '#1e1b4b' }}>
            {exercise.direction === 'to_english' && exercise.promptTokens.length > 0 ? (
              <TapHintText
                tokens={exercise.promptTokens}
                fallbackText={exercise.promptText}
                language={language}
              />
            ) : (
              exercise.promptText
            )}
          </div>
          {exercise.promptPhonetic ? (
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginTop: 2 }}>
              {exercise.promptPhonetic}
            </div>
          ) : null}
          {exercise.direction === 'to_english' && exercise.promptTokens.length > 0 ? (
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginTop: 3 }}>
              Tap any dotted word to peek!
            </div>
          ) : null}
        </div>

        {speakPromptText ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-primary"
              style={{ padding: '7px 11px', fontSize: '0.82rem' }}
              aria-label="Listen at normal speed"
              onClick={() => {
                playSfx('button_click');
                void speakPhrase({
                  text: speakPromptText,
                  language: exercise.direction === 'to_english' ? language : 'en',
                  phonetic: exercise.promptPhonetic,
                });
              }}
            >
              <Volume2 size={16} />
              <span>1.0x</span>
            </button>
            {exercise.direction === 'to_english' ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-amber"
                style={{ padding: '7px 11px', fontSize: '0.82rem' }}
                aria-label="Listen slowly"
                onClick={() => {
                  onTurtlePlay();
                  void speakPhrase({
                    text: speakPromptText,
                    language,
                    phonetic: exercise.promptPhonetic,
                    slow: true,
                  });
                }}
              >
                <Turtle size={16} />
                <span>0.65x</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Input Area: Word Bank OR Type Instead */}
      {inputMode === 'tiles' ? (
        <WordBankTray
          seed={exercise.id}
          targetTokens={exercise.targetTokens}
          distractorTokens={exercise.distractorTokens}
          selectedTileUids={selectedTileUids}
          disabled={locked}
          compact={compact}
          onChangeSelected={setSelectedTileUids}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            disabled={locked}
            onChange={(e) => setTypedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && submittedValue && !locked) {
                e.preventDefault();
                onSubmitShortcut?.();
              }
            }}
            placeholder={
              exercise.direction === 'to_foreign'
                ? `Type in ${langMeta.name} (accents optional, or tap keys below!)`
                : 'Type in English...'
            }
            aria-label="Type your translation"
            style={{
              width: '100%',
              padding: compact ? '10px 12px' : '13px 16px',
              borderRadius: 16,
              border: '2px solid var(--lang-primary)',
              borderBottomWidth: 4,
              fontSize: '1rem',
              fontWeight: 800,
              color: '#1e1b4b',
              background: '#ffffff',
              outline: 'none',
            }}
          />

          {exercise.direction === 'to_foreign' ? (
            <div
              aria-label="Accent character bar"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}
            >
              {langMeta.helperAccents.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className="tactile-tile"
                  style={{ padding: '5px 11px', fontSize: '0.95rem', minWidth: 36 }}
                  disabled={locked}
                  onClick={() => insertAccentChar(ch)}
                >
                  {ch}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
