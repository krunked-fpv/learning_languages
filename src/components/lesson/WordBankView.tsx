import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Grid, Keyboard, Sparkles, Turtle, Volume2, Zap } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { computeFreeRecallHintedBonus } from '../../core';
import {
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_META,
  type HintTier,
  type LanguageCode,
  type ProficiencyTier,
  type RegisterNuanceTag,
  type WordBankExercise,
} from '../../types/contracts';
import { FreeRecallHintBar } from './FreeRecallHintBar';
import { TapHintText } from './TapHintText';
import { SayItNormallyButton } from './SayItNormallyButton';
import { StarlightHintButton } from './StarlightHintButton';
import { VirtualScriptDrawer } from './VirtualScriptDrawer';
import { WordBankTray, buildWordBankPool, getAssembledText } from './WordBankTray';
import { REGISTER_TAG_META } from './lessonHelpers';
import { useHintEngine } from './useHintEngine';

export interface ExerciseDraftPayload {
  submitted: string;
  expected: string;
  accepted: readonly string[];
  expectedArticle?: string;
  speakOnResult?: string;
  phoneticHint?: string;
  isFreeRecall?: boolean;
  nuanceNote?: string;
  registerTag?: RegisterNuanceTag;
  hintTierUsed?: HintTier;
  hintsUsedCount?: number;
}

export interface WordBankViewProps {
  exercise: WordBankExercise;
  language: LanguageCode;
  compact: boolean;
  locked: boolean;
  proficiencyTier?: ProficiencyTier;
  scaffoldingMode?: 'guided' | 'bridge' | 'fluent';
  onTurtlePlay: () => void;
  onFluentPlay?: () => void;
  onDraftChange: (draft: ExerciseDraftPayload | null) => void;
  onSubmitShortcut?: () => void;
  onHintUsed?: (info: { exerciseId: string; tier: 1 | 2 | 3; hintsUsed: number }) => void;
}

export function WordBankView({
  exercise,
  language,
  compact,
  locked,
  proficiencyTier = 'A1',
  scaffoldingMode = 'guided',
  onTurtlePlay,
  onFluentPlay,
  onDraftChange,
  onSubmitShortcut,
  onHintUsed,
}: WordBankViewProps) {
  const [inputMode, setInputMode] = useState<'tiles' | 'type'>('tiles');
  const [selectedTileUids, setSelectedTileUids] = useState<string[]>([]);
  const [typedText, setTypedText] = useState('');
  const [peekPhonetics, setPeekPhonetics] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputMode('tiles');
    setSelectedTileUids([]);
    setTypedText('');
    setPeekPhonetics(false);
  }, [exercise.id]);

  const disableFreeRecall = language === 'en' && exercise.direction === 'to_english';
  const effectiveInputMode = disableFreeRecall ? 'tiles' : inputMode;

  const pool = useMemo(
    () => buildWordBankPool(exercise.id, exercise.targetTokens, exercise.distractorTokens),
    [exercise.id, exercise.targetTokens, exercise.distractorTokens]
  );

  const submittedValue = useMemo(() => {
    if (effectiveInputMode === 'type') return typedText.trim();
    return getAssembledText(pool, selectedTileUids);
  }, [effectiveInputMode, typedText, pool, selectedTileUids]);

  const hintAnswerLanguage: LanguageCode =
    exercise.direction === 'to_english' ? 'en' : language;

  const hint = useHintEngine({
    promptKey: `${exercise.id}::${effectiveInputMode}`,
    mode: effectiveInputMode === 'type' ? 'free_recall' : 'word_bank_tiles',
    canHint: !locked,
    tileConfig:
      effectiveInputMode === 'tiles'
        ? {
            pool,
            targetTokens: exercise.targetTokens,
            expectedSentence: exercise.expectedSentence,
            acceptedSentences: exercise.acceptedSentences,
            selectedTileUids,
            language: hintAnswerLanguage,
            seed: exercise.id,
          }
        : undefined,
    freeRecallConfig:
      effectiveInputMode === 'type'
        ? {
            typedText,
            expected: exercise.expectedSentence,
            accepted: exercise.acceptedSentences,
            targetTokens: exercise.targetTokens,
            language: hintAnswerLanguage,
          }
        : undefined,
    onHintTriggered: (info) => {
      onHintUsed?.({ exerciseId: exercise.id, tier: info.tier, hintsUsed: info.hintsUsed });
    },
  });

  const { cancelHint } = hint;

  useEffect(() => {
    if (locked) {
      cancelHint({ clearAssists: true });
    }
  }, [locked, cancelHint]);

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
        exercise.direction === 'to_foreign'
          ? exercise.expectedSentence
          : (exercise.promptSpeakText ?? exercise.promptText),
      phoneticHint: exercise.phoneticHint,
      isFreeRecall: effectiveInputMode === 'type',
      nuanceNote: exercise.nuanceNote,
      registerTag: exercise.registerTag,
      hintTierUsed: hint.hintTier,
      hintsUsedCount: hint.hintsUsed,
    });
  }, [
    submittedValue,
    exercise,
    effectiveInputMode,
    hint.hintTier,
    hint.hintsUsed,
    onDraftChange,
  ]);

  const langMeta = LANGUAGE_META[language];
  const promptDir = exercise.direction === 'to_english' ? langMeta.dir : 'ltr';
  const answerDir = exercise.direction === 'to_foreign' ? langMeta.dir : 'ltr';
  const hasManyAccents = langMeta.helperAccents.length > 14;
  const speakPromptText =
    exercise.promptSpeakText ?? (exercise.direction === 'to_english' ? exercise.promptText : undefined);

  const isGuided = scaffoldingMode === 'guided';
  const hasPromptSupport = Boolean(exercise.promptRomanized || exercise.promptPhonetic);
  const showPhoneticSupport = isGuided || peekPhonetics;
  const highlightFreeRecall =
    !disableFreeRecall &&
    (Boolean(exercise.allowFreeRecall) || proficiencyTier === 'B2' || proficiencyTier === 'C1_C2');
  const isNonLatinCourse = ['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru'].includes(language);
  const registerBadge = exercise.registerTag ? REGISTER_TAG_META[exercise.registerTag] : null;

  const freeRecallBonus = computeFreeRecallHintedBonus(hint.hintTier);

  const insertAccentChar = (ch: string) => {
    if (locked) return;
    cancelHint();
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
        padding: compact ? '10px 12px' : '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 13,
        width: '100%',
      }}
    >
      {/* Top Direction Header + Mode Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--tint-indigo-bg)',
              color: 'var(--tint-indigo-ink)',
              fontSize: '0.74rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              maxWidth: '100%',
              overflowWrap: 'break-word',
              textAlign: 'left',
            }}
          >
            {language === 'en'
              ? exercise.direction === 'to_english'
                ? 'Match the Meaning Clue'
                : 'Build the English Phrase'
              : exercise.direction === 'to_english'
                ? `Translate to ${langMeta.translationLanguageLabel ?? 'English'}`
                : `Translate to ${langMeta.dialectA ?? langMeta.name}`}
          </span>

          {registerBadge ? (
            <span
              style={{
                padding: '3px 9px',
                borderRadius: 999,
                background: registerBadge.bg,
                border: `1.5px solid ${registerBadge.border}`,
                color: registerBadge.ink,
                fontSize: '0.7rem',
                fontWeight: 900,
              }}
            >
              {registerBadge.label}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <StarlightHintButton
            size="sm"
            hintTier={hint.hintTier}
            hintsUsed={hint.hintsUsed}
            isAnimating={hint.isAnimating}
            canHint={hint.canHint}
            onTrigger={hint.triggerHint}
          />
          {!isGuided && hasPromptSupport ? (
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

          {!disableFreeRecall ? (
            <button
              type="button"
              className={`tactile-btn ${
                effectiveInputMode === 'tiles' && highlightFreeRecall ? 'tactile-btn-amber' : 'tactile-btn-soft'
              }`}
              style={{ padding: '5px 10px', fontSize: '0.76rem', borderRadius: 12 }}
              disabled={locked}
              onClick={() => {
                cancelHint({ clearAssists: true });
                playSfx('button_click');
                setInputMode((m) => (m === 'tiles' ? 'type' : 'tiles'));
              }}
            >
              {effectiveInputMode === 'tiles' ? (
                highlightFreeRecall ? (
                  <>
                    <Sparkles size={14} />
                    <span>
                      Keyboard Free-Recall (+{FREE_RECALL_BONUS_XP} XP / +{FREE_RECALL_BONUS_GEMS} Gems)
                    </span>
                    <span className="visually-hidden"> Type Instead</span>
                  </>
                ) : (
                  <>
                    <Keyboard size={15} />
                    <span>Type Instead</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      (Free-Recall +{FREE_RECALL_BONUS_XP} XP)
                    </span>
                  </>
                )
              ) : (
                <>
                  <Grid size={15} />
                  <span>Use Word Tiles</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Prompt Sentence Card */}
      <div
        style={{
          padding: compact ? '9px 11px' : '14px 16px',
          borderRadius: 18,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'break-word' }}>
          <div
            dir={promptDir}
            style={{
              fontSize: compact ? '1.05rem' : '1.3rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              lineHeight: promptDir === 'rtl' ? 1.5 : 1.3,
              overflowWrap: 'break-word',
            }}
          >
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
          {showPhoneticSupport && (exercise.promptRomanized || exercise.promptPhonetic) ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '2px 10px',
                marginTop: 3,
              }}
            >
              {exercise.promptRomanized ? (
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
                  {exercise.promptRomanized}
                </span>
              ) : null}
              {exercise.promptPhonetic ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {exercise.promptPhonetic}
                </span>
              ) : null}
            </div>
          ) : null}
          {exercise.direction === 'to_english' && exercise.promptTokens.length > 0 ? (
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
              Tap any dotted word to peek!
            </div>
          ) : null}
          <div style={{ marginTop: 6 }}>
            <SayItNormallyButton
              language={language}
              dialectAText={exercise.direction === 'to_english' ? exercise.promptText : undefined}
              dialectBText={exercise.direction === 'to_foreign' ? exercise.promptText : undefined}
              explicitPlain={exercise.plainEnglish}
              nuanceNote={exercise.nuanceNote}
              avoidTerms={locked ? undefined : exercise.targetTokens}
              resetKey={exercise.id}
              size="sm"
            />
          </div>
        </div>

        {speakPromptText ? (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-primary"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              aria-label="Listen at normal speed"
              onClick={() => {
                playSfx('button_click');
                void speakPhrase({
                  text: speakPromptText,
                  language: exercise.direction === 'to_english' ? language : 'en',
                  phonetic: exercise.promptPhonetic,
                  speed: 'normal',
                });
              }}
            >
              <Volume2 size={15} />
              <span>1.0x</span>
            </button>
            {exercise.direction === 'to_english' ? (
              <>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-amber"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  aria-label="Listen slowly"
                  onClick={() => {
                    onTurtlePlay();
                    void speakPhrase({
                      text: speakPromptText,
                      language,
                      phonetic: exercise.promptPhonetic,
                      slow: true,
                      speed: 'slow',
                    });
                  }}
                >
                  <Turtle size={15} />
                  <span>0.65x</span>
                </button>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-indigo"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  aria-label="Listen at fluent speed"
                  onClick={() => {
                    onFluentPlay?.();
                    void speakPhrase({
                      text: speakPromptText,
                      language,
                      phonetic: exercise.promptPhonetic,
                      speed: 'fluent',
                    });
                  }}
                >
                  <Zap size={14} />
                  <span>1.12x</span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Input Area: Word Bank OR Keyboard Free-Recall */}
      {effectiveInputMode === 'tiles' ? (
        <WordBankTray
          seed={exercise.id}
          targetTokens={exercise.targetTokens}
          distractorTokens={exercise.distractorTokens}
          selectedTileUids={selectedTileUids}
          disabled={locked}
          compact={compact}
          dir={answerDir}
          hintOverlay={hint}
          onTileInteract={() => cancelHint()}
          onChangeSelected={setSelectedTileUids}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              flexWrap: 'wrap',
              padding: '4px 10px',
              borderRadius: 12,
              background: 'var(--tint-amber-bg)',
              border: '1.5px solid var(--tint-amber-border)',
              color: 'var(--tint-amber-ink)',
              fontSize: '0.76rem',
              fontWeight: 900,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} /> Keyboard Free-Recall Active!
            </span>
            <span>
              +{freeRecallBonus.xp} XP · +{freeRecallBonus.gems} Gems
            </span>
          </div>

          {hint.freeRecallPlan && hint.hintTier > 0 ? (
            <FreeRecallHintBar
              plan={hint.freeRecallPlan}
              hintTier={hint.hintTier}
              ghostFaded={hint.ghostFaded}
              isAnimating={hint.isAnimating}
              answerDir={answerDir}
              compact={compact}
            />
          ) : null}

          <input
            ref={inputRef}
            type="text"
            dir={
              answerDir === 'rtl' && /[A-Za-z]/.test(typedText) && !/[\u0600-\u06FF]/.test(typedText)
                ? 'ltr'
                : answerDir
            }
            value={typedText}
            disabled={locked}
            onChange={(e) => {
              cancelHint();
              setTypedText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && submittedValue && !locked) {
                e.preventDefault();
                onSubmitShortcut?.();
              }
            }}
            placeholder={
              exercise.direction === 'to_foreign'
                ? language === 'en'
                  ? 'Type the English phrase...'
                  : langMeta.isAdultOnly
                    ? `Type in ${langMeta.dialectA ?? langMeta.name}...`
                    : isNonLatinCourse
                      ? `Type in ${langMeta.name} or romanized`
                      : `Type in ${langMeta.name} (accents optional, or tap keys below!)`
                : `Type in ${langMeta.translationLanguageLabel ?? 'English'}...`
            }
            aria-label="Type your translation"
            style={{
              width: '100%',
              padding: compact ? '10px 12px' : '13px 16px',
              borderRadius: 16,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderLeftWidth: 2,
              borderBottomWidth: 4,
              borderStyle: 'solid',
              borderColor: 'var(--lang-primary)',
              fontSize: '1rem',
              fontWeight: 800,
              lineHeight: answerDir === 'rtl' ? 1.5 : 1.25,
              color: 'var(--text-main)',
              background: 'var(--input-bg)',
              outline: 'none',
            }}
          />

          {exercise.direction === 'to_foreign' ? (
            <>
              <div
                aria-label="Accent character bar"
                dir={langMeta.dir}
                className="console-scroll-pane"
                style={{
                  maxHeight: compact ? 84 : 112,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: hasManyAccents ? 5 : 6,
                  justifyContent: 'center',
                  padding: '2px 2px',
                }}
              >
                {langMeta.helperAccents.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className="tactile-tile"
                    style={{
                      padding: hasManyAccents ? '4px 8px' : '5px 11px',
                      fontSize: hasManyAccents ? '0.88rem' : '0.95rem',
                      minWidth: hasManyAccents ? 30 : 36,
                      lineHeight: langMeta.dir === 'rtl' ? 1.5 : 1.25,
                    }}
                    disabled={locked}
                    onClick={() => insertAccentChar(ch)}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <VirtualScriptDrawer
                language={language}
                compact={compact}
                disabled={locked}
                onInsertChar={insertAccentChar}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
