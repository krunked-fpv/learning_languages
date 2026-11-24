import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Grid,
  Keyboard,
  ShieldCheck,
  Sparkles,
  Turtle,
  Volume2,
  Zap,
} from 'lucide-react';
import { gradeAnswer, computeFreeRecallHintedBonus } from '../../core';
import { playSfx, speakPhrase } from '../../audio';
import { MascotStage } from '../characters/MascotStage';
import {
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  LANGUAGE_META,
  type BossGauntletExercise,
  type CharacterPose,
  type HintPresentationMode,
  type HintTier,
  type LanguageCode,
  type ProficiencyTier,
} from '../../types/contracts';
import { FreeRecallHintBar } from './FreeRecallHintBar';
import { FreeRecallScriptStrip } from './FreeRecallScriptStrip';
import { TapHintText } from './TapHintText';
import { SayItNormallyButton } from './SayItNormallyButton';
import { StarlightHintButton } from './StarlightHintButton';
import { WordBankTray, buildWordBankPool, getAssembledText } from './WordBankTray';
import { REGISTER_TAG_META } from './lessonHelpers';
import {
  buildFreeRecallPlaceholder,
  resolveFreeRecallInputDirection,
  resolveFreeRecallTextAlign,
  useFreeRecallInput,
} from './useFreeRecallInput';
import { useHintEngine } from './useHintEngine';

export interface BossGauntletViewProps {
  exercise: BossGauntletExercise;
  language: LanguageCode;
  compact: boolean;
  proficiencyTier?: ProficiencyTier;
  scaffoldingMode?: 'guided' | 'bridge' | 'fluent';
  initialTurnIndex?: number;
  onTurnIndexChange?: (turnIndex: number) => void;
  onTurtlePlay: () => void;
  onFluentPlay?: () => void;
  onTurnResult: (params: {
    isCorrect: boolean;
    usedAccentCoaching?: boolean;
    usedFreeRecall?: boolean;
    hintTierUsed?: HintTier;
    hintsUsedCount?: number;
  }) => void;
  onComplete: (bonusGems: number) => void;
  onHintUsed?: (info: { exerciseId: string; tier: 1 | 2 | 3; hintsUsed: number }) => void;
}

export function BossGauntletView({
  exercise,
  language,
  compact,
  proficiencyTier = 'A1',
  scaffoldingMode = 'guided',
  initialTurnIndex = 0,
  onTurnIndexChange,
  onTurtlePlay,
  onFluentPlay,
  onTurnResult,
  onComplete,
  onHintUsed,
}: BossGauntletViewProps) {
  const [turnIndex, setTurnIndex] = useState(initialTurnIndex);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedTileUids, setSelectedTileUids] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'tiles' | 'type'>('tiles');
  const [peekPhonetics, setPeekPhonetics] = useState(false);
  const [turnOutcome, setTurnOutcome] = useState<{
    kind: 'ok' | 'nudge';
    message: string;
    subtext?: string;
    nuanceNote?: string;
  } | null>(null);
  const [bossCleared, setBossCleared] = useState(false);
  const [bossHintNonce, setBossHintNonce] = useState(0);
  const {
    typedText,
    drawerOpen,
    setDrawerOpen,
    inputRef,
    resetFreeRecallInput,
    syncSelection,
    handleTextChange,
    insertCharAtCaret,
    applyConvertedText,
  } = useFreeRecallInput();
  const checkTurnLockRef = useRef(false);
  const nextTurnLockRef = useRef(false);
  const completeLockRef = useRef(false);

  useEffect(() => {
    setTurnIndex(initialTurnIndex);
    setSelectedChoice(null);
    setSelectedTileUids([]);
    setInputMode('tiles');
    resetFreeRecallInput();
    setPeekPhonetics(false);
    setTurnOutcome(null);
    setBossCleared(false);
    setBossHintNonce(0);
    checkTurnLockRef.current = false;
    nextTurnLockRef.current = false;
    completeLockRef.current = false;
  }, [exercise.id, initialTurnIndex, language, resetFreeRecallInput]);

  useEffect(() => {
    nextTurnLockRef.current = false;
    if (turnOutcome?.kind !== 'ok') {
      checkTurnLockRef.current = false;
    }
  }, [turnIndex, bossCleared, turnOutcome]);

  const langMeta = LANGUAGE_META[language];
  const langDir = langMeta.dir;
  const currentTurn = exercise.turns[turnIndex];
  const isGuided = scaffoldingMode === 'guided';
  const showPhonetics = isGuided || peekPhonetics;

  const pool = useMemo(
    () =>
      currentTurn && currentTurn.mode === 'word_bank'
        ? buildWordBankPool(
            `${exercise.id}:${currentTurn.id}`,
            currentTurn.targetTokens ?? [],
            currentTurn.distractorTokens ?? []
          )
        : [],
    [exercise.id, currentTurn]
  );

  const submittedValue = useMemo(() => {
    if (!currentTurn) return '';
    if (currentTurn.mode === 'choice') return selectedChoice ?? '';
    if (inputMode === 'type') return typedText.trim();
    return getAssembledText(pool, selectedTileUids);
  }, [currentTurn, selectedChoice, inputMode, typedText, pool, selectedTileUids]);

  const bossPromptKey = currentTurn
    ? `${exercise.id}::${currentTurn.id}::${currentTurn.mode === 'word_bank' ? inputMode : 'choice'}`
    : `${exercise.id}::done`;
  const bossHintMode: HintPresentationMode =
    !currentTurn || bossCleared
      ? 'none'
      : currentTurn.mode === 'choice'
        ? 'multiple_choice'
        : inputMode === 'type'
          ? 'free_recall'
          : 'word_bank_tiles';

  const hint = useHintEngine({
    promptKey: bossPromptKey,
    mode: bossHintMode,
    canHint: Boolean(currentTurn) && !bossCleared && turnOutcome?.kind !== 'ok',
    tileConfig:
      currentTurn?.mode === 'word_bank' && inputMode === 'tiles'
        ? {
            pool,
            targetTokens: currentTurn.targetTokens ?? [],
            expectedSentence: currentTurn.expectedAnswer,
            acceptedSentences: currentTurn.acceptedAnswers,
            selectedTileUids,
            language,
            seed: `${exercise.id}:${currentTurn.id}`,
          }
        : undefined,
    freeRecallConfig:
      currentTurn?.mode === 'word_bank' && inputMode === 'type'
        ? {
            typedText,
            expected: currentTurn.expectedAnswer,
            accepted: currentTurn.acceptedAnswers,
            targetTokens: currentTurn.targetTokens,
            language,
          }
        : undefined,
    choiceConfig:
      currentTurn?.mode === 'choice'
        ? {
            choices: currentTurn.choices ?? [],
            expected: currentTurn.expectedAnswer,
            accepted: currentTurn.acceptedAnswers,
            language,
            seed: `${exercise.id}:${currentTurn.id}`,
            selectedChoice,
          }
        : undefined,
    onHintTriggered: (info) => {
      setBossHintNonce((n) => n + 1);
      onHintUsed?.({ exerciseId: exercise.id, tier: info.tier, hintsUsed: info.hintsUsed });
    },
  });

  const { cancelHint } = hint;

  useEffect(() => {
    if (bossCleared || turnOutcome?.kind === 'ok') {
      cancelHint({ clearAssists: true });
    }
  }, [bossCleared, turnOutcome?.kind, cancelHint]);

  if (bossCleared || !currentTurn) {
    return (
      <div
        className="tactile-card"
        style={{
          padding: compact ? 16 : 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <MascotStage
          companionId={exercise.companionId}
          pose="victory_dance"
          size={compact ? 110 : 148}
          badgeText="Friendship Maxed!"
        />
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--tint-emerald-ink)' }}>
          {exercise.companionName} Cheered You On!
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: 'var(--tint-amber-bg)',
            border: '2px solid var(--tint-amber-border)',
            color: 'var(--tint-amber-ink)',
            fontWeight: 900,
          }}
        >
          Boss Chest Bonus: +{exercise.rewardChestGems} Gems!
        </div>
        <button
          key="boss-collect-chest-btn"
          type="button"
          className="tactile-btn tactile-btn-hero tactile-btn-success"
          onClick={() => {
            if (completeLockRef.current) return;
            completeLockRef.current = true;
            playSfx('chest_open');
            onComplete(exercise.rewardChestGems);
          }}
        >
          Collect Boss Chest & Finish!
        </button>
      </div>
    );
  }

  const totalTurns = Math.max(1, exercise.turns.length);
  const completedTurns = turnIndex + (turnOutcome?.kind === 'ok' ? 1 : 0);
  const chargePct = Math.round((completedTurns / totalTurns) * 100);
  const highlightFreeRecall =
    currentTurn.mode === 'word_bank' &&
    (Boolean(currentTurn.allowFreeRecall) || proficiencyTier === 'B2' || proficiencyTier === 'C1_C2');
  const registerMeta = currentTurn.registerTag ? REGISTER_TAG_META[currentTurn.registerTag] : null;

  const companionPose: CharacterPose =
    turnOutcome?.kind === 'ok'
      ? 'happy'
      : turnOutcome?.kind === 'nudge'
        ? 'sympathetic'
        : turnIndex === 0
          ? 'boss_intro'
          : 'listening';

  const bossFreeRecallBonus = computeFreeRecallHintedBonus(hint.hintTier);
  const inputDir = resolveFreeRecallInputDirection(langDir, typedText);
  const inputTextAlign = resolveFreeRecallTextAlign(langDir, typedText);

  const insertAccentChar = (ch: string) => {
    if (turnOutcome?.kind === 'ok') return;
    cancelHint();
    insertCharAtCaret(ch);
    setTurnOutcome(null);
  };

  const applyPinyinPreview = (convertedText: string) => {
    if (turnOutcome?.kind === 'ok') return;
    cancelHint();
    applyConvertedText(convertedText);
    setTurnOutcome(null);
  };

  const handleCheckTurn = () => {
    if (!submittedValue || turnOutcome?.kind === 'ok' || checkTurnLockRef.current || nextTurnLockRef.current) {
      return;
    }
    checkTurnLockRef.current = true;
    cancelHint({ clearAssists: true });
    const res = gradeAnswer({
      submitted: submittedValue,
      expected: currentTurn.expectedAnswer,
      accepted: currentTurn.acceptedAnswers,
      language,
    });

    const isFreeRecall = currentTurn.mode === 'word_bank' && inputMode === 'type';

    if (res.isCorrect) {
      if (isFreeRecall) {
        playSfx('free_recall_ace');
      } else {
        playSfx('boss_hit');
      }
      void speakPhrase({
        text: currentTurn.victoryReplyForeign,
        language,
        phonetic: currentTurn.phoneticAnswer,
      });
      onTurnResult({
        isCorrect: true,
        usedAccentCoaching: Boolean(res.accentCoaching),
        usedFreeRecall: isFreeRecall,
        hintTierUsed: hint.hintTier,
        hintsUsedCount: hint.hintsUsed,
      });
      setTurnOutcome({
        kind: 'ok',
        message: currentTurn.victoryReplyForeign,
        subtext: res.accentCoaching
          ? `${currentTurn.victoryReplyEnglish} • Accent tip: ${res.accentCoaching.friendlyTip}`
          : currentTurn.victoryReplyEnglish,
        nuanceNote: currentTurn.nuanceNote,
      });
    } else {
      playSfx('gentle_nudge');
      onTurnResult({ isCorrect: false });
      setTurnOutcome({
        kind: 'nudge',
        message: 'Almost! Give that reply one more try!',
        subtext: currentTurn.romanizedAnswer
          ? `Clue: ${currentTurn.romanizedAnswer} (${currentTurn.phoneticAnswer})`
          : `Clue: ${currentTurn.phoneticAnswer}`,
      });
    }
  };

  const handleNextTurn = () => {
    if (nextTurnLockRef.current) return;
    nextTurnLockRef.current = true;
    cancelHint({ clearAssists: true });
    playSfx('button_click');
    setSelectedChoice(null);
    setSelectedTileUids([]);
    setInputMode('tiles');
    resetFreeRecallInput();
    setTurnOutcome(null);
    if (turnIndex + 1 >= exercise.turns.length) {
      playSfx('chest_open');
      setBossCleared(true);
    } else {
      const nextIdx = turnIndex + 1;
      setTurnIndex(nextIdx);
      onTurnIndexChange?.(nextIdx);
    }
  };

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '6px 9px' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 4 : 11,
        width: '100%',
      }}
    >
      {/* Top Boss & Friendship Charge Meter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12 }}>
        <MascotStage
          companionId={exercise.companionId}
          pose={companionPose}
          size={compact ? 48 : 102}
          hintPulseNonce={bossHintNonce}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: compact ? '0.94rem' : '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {exercise.title}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.74rem',
                fontWeight: 900,
                color: 'var(--tint-emerald-ink)',
                background: 'var(--tint-emerald-bg)',
                padding: '3px 9px',
                borderRadius: 999,
              }}
            >
              <ShieldCheck size={14} /> Turn {turnIndex + 1}/{totalTurns}
            </span>
          </div>

          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
            Friendship Charge: {chargePct}%
          </div>
          <div
            style={{
              marginTop: 4,
              height: 10,
              borderRadius: 999,
              background: 'rgba(148, 163, 184, 0.28)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${chargePct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #fbbf24)',
                transition: 'width 260ms ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Companion Prompt Speech Bubble */}
      <div
        style={{
          padding: compact ? '5px 8px' : '12px 14px',
          borderRadius: compact ? 13 : 16,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 2 : 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--lang-primary)' }}>
              {exercise.companionName} says:
            </span>
            {registerMeta ? (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: registerMeta.bg,
                  border: `1px solid ${registerMeta.border}`,
                  color: registerMeta.ink,
                  fontSize: '0.68rem',
                  fontWeight: 900,
                }}
              >
                {registerMeta.label}
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {!isGuided ? (
              <button
                type="button"
                className={`tactile-btn ${peekPhonetics ? 'tactile-btn-amber' : 'tactile-btn-soft'}`}
                style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: 10 }}
                onClick={() => {
                  playSfx('tile_tap');
                  setPeekPhonetics((v) => !v);
                }}
              >
                {peekPhonetics ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{peekPhonetics ? 'Hide Phonetic / Romanized' : 'Peek Phonetic / Romanized'}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: 10 }}
              aria-label={`Hear ${exercise.companionName} at normal speed`}
              onClick={() => {
                void speakPhrase({
                  text: currentTurn.companionSayForeign,
                  language,
                  phonetic: currentTurn.companionPhonetic,
                  speed: 'normal',
                });
              }}
            >
              <Volume2 size={14} />
              <span>1.0x</span>
            </button>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: 10 }}
              aria-label={`Hear ${exercise.companionName} slowly`}
              onClick={() => {
                onTurtlePlay();
                void speakPhrase({
                  text: currentTurn.companionSayForeign,
                  language,
                  phonetic: currentTurn.companionPhonetic,
                  slow: true,
                  speed: 'slow',
                });
              }}
            >
              <Turtle size={14} />
              <span>0.65x</span>
            </button>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: 10 }}
              aria-label={`Hear ${exercise.companionName} fluently`}
              onClick={() => {
                onFluentPlay?.();
                void speakPhrase({
                  text: currentTurn.companionSayForeign,
                  language,
                  phonetic: currentTurn.companionPhonetic,
                  speed: 'fluent',
                });
              }}
            >
              <Zap size={13} />
              <span>1.12x</span>
            </button>
          </div>
        </div>

        <div
          dir={langDir}
          style={{
            fontSize: compact ? '0.96rem' : '1.1rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            lineHeight: langDir === 'rtl' ? 1.5 : 1.35,
          }}
        >
          <TapHintText
            tokens={currentTurn.tapHints}
            fallbackText={currentTurn.companionSayForeign}
            language={language}
          />
        </div>
        {showPhonetics && currentTurn.companionRomanized ? (
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
            {currentTurn.companionRomanized}
          </div>
        ) : null}
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          {currentTurn.companionSayEnglish}
          {showPhonetics && currentTurn.companionPhonetic
            ? ` • (${currentTurn.companionPhonetic})`
            : ''}
        </div>
        <SayItNormallyButton
          language={language}
          dialectAText={currentTurn.companionSayForeign}
          dialectBText={currentTurn.companionSayEnglish}
          explicitPlain={currentTurn.plainEnglish}
          nuanceNote={currentTurn.nuanceNote}
          resetKey={`${exercise.id}:${currentTurn.id}`}
          size="sm"
        />
      </div>

      {/* Player Prompt + Optional Free-Recall Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: compact ? '0.86rem' : '0.95rem', fontWeight: 900, color: 'var(--text-main)' }}>
          Your reply: {currentTurn.promptEnglish}
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
          {currentTurn.mode === 'word_bank' ? (
            <button
              type="button"
              disabled={turnOutcome?.kind === 'ok'}
              className={`tactile-btn ${
                inputMode === 'tiles' && highlightFreeRecall ? 'tactile-btn-amber' : 'tactile-btn-soft'
              }`}
              style={{ padding: '4px 9px', fontSize: '0.74rem', borderRadius: 11 }}
              onClick={() => {
                cancelHint({ clearAssists: true });
                playSfx('button_click');
                setDrawerOpen(false);
                setInputMode((m) => (m === 'tiles' ? 'type' : 'tiles'));
                setTurnOutcome(null);
              }}
            >
              {inputMode === 'tiles' ? (
                <>
                  {highlightFreeRecall ? <Sparkles size={13} /> : <Keyboard size={13} />}
                  <span>
                    Keyboard Free-Recall (+{FREE_RECALL_BONUS_XP} XP / +{FREE_RECALL_BONUS_GEMS} Gems)
                  </span>
                </>
              ) : (
                <>
                  <Grid size={13} />
                  <span>Use Word Tiles</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Turn Choice, Word Bank, or Keyboard Free-Recall */}
      {currentTurn.mode === 'choice' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: compact ? 6 : 8,
          }}
        >
          {(currentTurn.choices ?? []).map((choice) => {
            const isSelected = selectedChoice === choice;
            const isDimmed = hint.dimmedUids.has(choice);
            const isSpotlight = hint.spotlightZone === 'choice' && hint.spotlightUid === choice;
            return (
              <button
                key={choice}
                type="button"
                disabled={turnOutcome?.kind === 'ok'}
                dir={langDir}
                data-hint-dimmed={isDimmed ? 'true' : undefined}
                data-hint-spotlight={isSpotlight ? 'true' : undefined}
                className={`tactile-btn starlight-choice-tile ${
                  isDimmed ? 'is-starlight-dimmed' : ''
                } ${isSpotlight ? 'is-starlight-spotlight' : ''}`}
                style={{
                  minWidth: 0,
                  justifyContent: 'space-between',
                  padding: compact ? '8px 12px' : '11px 14px',
                  background: isSelected ? 'var(--tile-selected-bg)' : 'var(--tile-bg)',
                  borderColor: isSelected ? 'var(--lang-primary)' : 'var(--tile-border)',
                  color: isSelected ? 'var(--tile-selected-ink)' : 'var(--text-main)',
                  textAlign: langDir === 'rtl' ? 'right' : 'left',
                  lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                }}
                onClick={() => {
                  cancelHint();
                  playSfx('tile_tap');
                  setSelectedChoice(choice);
                  setTurnOutcome(null);
                }}
              >
                <span dir={langDir} style={{ minWidth: 0, overflowWrap: 'break-word', whiteSpace: 'normal' }}>{choice}</span>
                {isSelected ? <Check size={16} style={{ flexShrink: 0 }} /> : null}
              </button>
            );
          })}
        </div>
      ) : inputMode === 'tiles' ? (
        <WordBankTray
          seed={`${exercise.id}:${currentTurn.id}`}
          targetTokens={currentTurn.targetTokens ?? []}
          distractorTokens={currentTurn.distractorTokens ?? []}
          selectedTileUids={selectedTileUids}
          disabled={turnOutcome?.kind === 'ok'}
          compact={compact || (currentTurn.targetTokens?.length ?? 0) >= 9}
          dir={langDir}
          hintOverlay={hint}
          onTileInteract={() => cancelHint()}
          onChangeSelected={(next) => {
            setSelectedTileUids(next);
            setTurnOutcome(null);
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 7 }}>
          {hint.freeRecallPlan && hint.hintTier > 0 ? (
            <FreeRecallHintBar
              plan={hint.freeRecallPlan}
              hintTier={hint.hintTier}
              ghostFaded={hint.ghostFaded}
              isAnimating={hint.isAnimating}
              answerDir={langDir}
              compact={compact}
            />
          ) : null}
          <input
            ref={inputRef}
            type="text"
            className="free-recall-input"
            dir={inputDir}
            value={typedText}
            disabled={turnOutcome?.kind === 'ok'}
            onChange={(e) => {
              cancelHint();
              handleTextChange(e);
              setTurnOutcome(null);
            }}
            onSelect={syncSelection}
            onKeyUp={syncSelection}
            onClick={syncSelection}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && submittedValue && turnOutcome?.kind !== 'ok') {
                e.preventDefault();
                handleCheckTurn();
              }
            }}
            placeholder={buildFreeRecallPlaceholder({
              language,
              direction: 'to_foreign',
              compact,
              variant: 'boss',
              bossBonusXp: bossFreeRecallBonus.xp,
            })}
            aria-label="Type your boss reply"
            style={{
              width: '100%',
              padding: compact ? '7px 10px' : '12px 14px',
              borderRadius: 14,
              border: '2px solid var(--lang-primary)',
              borderBottomWidth: 4,
              fontSize: compact ? '0.94rem' : '0.96rem',
              fontWeight: 800,
              lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
              textAlign: inputTextAlign,
              color: 'var(--text-main)',
              background: 'var(--input-bg)',
              outline: 'none',
            }}
          />
          <FreeRecallScriptStrip
            language={language}
            direction="to_foreign"
            typedText={typedText}
            compact={compact}
            disabled={turnOutcome?.kind === 'ok'}
            drawerOpen={drawerOpen}
            drawerKey={`${exercise.id}:${currentTurn.id}`}
            onOpenChange={setDrawerOpen}
            onInsertChar={insertAccentChar}
            onApplyPinyinPreview={applyPinyinPreview}
          />
        </div>
      )}

      {/* Turn Feedback & Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          paddingTop: 2,
        }}
      >
        {turnOutcome ? (
          <div
            style={{
              flex: '1 1 200px',
              padding: '7px 12px',
              borderRadius: 14,
              background: turnOutcome.kind === 'ok' ? 'var(--tint-emerald-bg)' : 'var(--tint-rose-bg)',
              border: `2px solid ${turnOutcome.kind === 'ok' ? 'var(--tint-emerald-border)' : 'var(--tint-rose-border)'}`,
              color: turnOutcome.kind === 'ok' ? 'var(--tint-emerald-ink)' : 'var(--tint-rose-ink)',
              fontSize: '0.84rem',
              fontWeight: 800,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={15} />
              <span dir={turnOutcome.kind === 'ok' ? langDir : 'ltr'} style={{ unicodeBidi: 'isolate' }}>
                {turnOutcome.message}
              </span>
            </div>
            {turnOutcome.subtext ? (
              <div style={{ fontSize: '0.76rem', opacity: 0.9 }}>{turnOutcome.subtext}</div>
            ) : null}
            {turnOutcome.nuanceNote ? (
              <div style={{ fontSize: '0.74rem', marginTop: 2, color: 'var(--tint-amber-ink)' }}>
                Nuance: {turnOutcome.nuanceNote}
              </div>
            ) : null}
          </div>
        ) : (
          <span
            className="hud-hide-xs"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}
          >
            {exercise.introLine}
          </span>
        )}

        {turnOutcome?.kind === 'ok' ? (
          <button
            key="boss-next-turn-btn"
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-success"
            style={{ marginLeft: compact ? 'auto' : undefined }}
            onClick={handleNextTurn}
          >
            {turnIndex + 1 >= exercise.turns.length ? 'Finish Encounter!' : 'Next Turn'}
          </button>
        ) : (
          <button
            key="boss-send-reply-btn"
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
            style={{ marginLeft: compact ? 'auto' : undefined }}
            disabled={!submittedValue}
            onClick={handleCheckTurn}
          >
            Send Reply!
          </button>
        )}
      </div>
    </div>
  );
}
