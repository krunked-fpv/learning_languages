import { useEffect, useMemo, useState } from 'react';
import { Volume2, Turtle, Sparkles, Check, ShieldCheck } from 'lucide-react';
import { gradeAnswer } from '../../core';
import { playSfx, speakPhrase } from '../../audio';
import { MascotStage } from '../characters/MascotStage';
import { LANGUAGE_META, type BossGauntletExercise, type CharacterPose, type LanguageCode } from '../../types/contracts';
import { TapHintText } from './TapHintText';
import { WordBankTray, buildWordBankPool, getAssembledText } from './WordBankTray';

export interface BossGauntletViewProps {
  exercise: BossGauntletExercise;
  language: LanguageCode;
  compact: boolean;
  initialTurnIndex?: number;
  onTurnIndexChange?: (turnIndex: number) => void;
  onTurtlePlay: () => void;
  onTurnResult: (params: { isCorrect: boolean; usedAccentCoaching?: boolean }) => void;
  onComplete: (bonusGems: number) => void;
}

export function BossGauntletView({
  exercise,
  language,
  compact,
  initialTurnIndex = 0,
  onTurnIndexChange,
  onTurtlePlay,
  onTurnResult,
  onComplete,
}: BossGauntletViewProps) {
  const [turnIndex, setTurnIndex] = useState(initialTurnIndex);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedTileUids, setSelectedTileUids] = useState<string[]>([]);
  const [turnOutcome, setTurnOutcome] = useState<{
    kind: 'ok' | 'nudge';
    message: string;
    subtext?: string;
  } | null>(null);
  const [bossCleared, setBossCleared] = useState(false);

  useEffect(() => {
    setTurnIndex(initialTurnIndex);
    setSelectedChoice(null);
    setSelectedTileUids([]);
    setTurnOutcome(null);
    setBossCleared(false);
  }, [exercise.id, initialTurnIndex]);

  const langDir = LANGUAGE_META[language].dir;
  const currentTurn = exercise.turns[turnIndex];

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
    return getAssembledText(pool, selectedTileUids);
  }, [currentTurn, selectedChoice, pool, selectedTileUids]);

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
          type="button"
          className="tactile-btn tactile-btn-hero tactile-btn-success"
          onClick={() => {
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

  const companionPose: CharacterPose =
    turnOutcome?.kind === 'ok'
      ? 'happy'
      : turnOutcome?.kind === 'nudge'
        ? 'sympathetic'
        : turnIndex === 0
          ? 'boss_intro'
          : 'listening';

  const handleCheckTurn = () => {
    if (!submittedValue) return;
    const res = gradeAnswer({
      submitted: submittedValue,
      expected: currentTurn.expectedAnswer,
      accepted: currentTurn.acceptedAnswers,
      language,
    });

    if (res.isCorrect) {
      playSfx('boss_hit');
      void speakPhrase({
        text: currentTurn.victoryReplyForeign,
        language,
        phonetic: currentTurn.phoneticAnswer,
      });
      onTurnResult({
        isCorrect: true,
        usedAccentCoaching: Boolean(res.accentCoaching),
      });
      setTurnOutcome({
        kind: 'ok',
        message: currentTurn.victoryReplyForeign,
        subtext: res.accentCoaching
          ? `${currentTurn.victoryReplyEnglish} • Accent tip: ${res.accentCoaching.friendlyTip}`
          : currentTurn.victoryReplyEnglish,
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
    playSfx('button_click');
    setSelectedChoice(null);
    setSelectedTileUids([]);
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
        padding: compact ? '10px 12px' : '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 12,
        width: '100%',
      }}
    >
      {/* Top Boss & Friendship Charge Meter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <MascotStage
          companionId={exercise.companionId}
          pose={companionPose}
          size={compact ? 76 : 104}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: compact ? '0.96rem' : '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {exercise.title}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.76rem',
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

          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
            Friendship Charge: {chargePct}%
          </div>
          <div
            style={{
              marginTop: 4,
              height: 11,
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
          padding: compact ? '8px 11px' : '12px 14px',
          borderRadius: 16,
          background: 'var(--card-soft-bg)',
          border: '2px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--lang-primary)' }}>
            {exercise.companionName} says:
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '4px 8px', fontSize: '0.76rem', borderRadius: 10 }}
              onClick={() => {
                void speakPhrase({
                  text: currentTurn.companionSayForeign,
                  language,
                  phonetic: currentTurn.companionPhonetic,
                });
              }}
            >
              <Volume2 size={14} />
              <span>1.0x</span>
            </button>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '4px 8px', fontSize: '0.76rem', borderRadius: 10 }}
              onClick={() => {
                onTurtlePlay();
                void speakPhrase({
                  text: currentTurn.companionSayForeign,
                  language,
                  phonetic: currentTurn.companionPhonetic,
                  slow: true,
                });
              }}
            >
              <Turtle size={14} />
              <span>0.65x</span>
            </button>
          </div>
        </div>

        <div
          dir={langDir}
          style={{
            fontSize: compact ? '0.98rem' : '1.1rem',
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
        {currentTurn.companionRomanized ? (
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--lang-primary)' }}>
            {currentTurn.companionRomanized}
          </div>
        ) : null}
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          {currentTurn.companionSayEnglish} • ({currentTurn.companionPhonetic})
        </div>
      </div>

      {/* Player Prompt */}
      <div style={{ fontSize: compact ? '0.88rem' : '0.96rem', fontWeight: 900, color: 'var(--text-main)' }}>
        Your reply: {currentTurn.promptEnglish}
      </div>

      {/* Turn Choice or Word Bank */}
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
            return (
              <button
                key={choice}
                type="button"
                disabled={turnOutcome?.kind === 'ok'}
                dir={langDir}
                className="tactile-btn"
                style={{
                  justifyContent: 'space-between',
                  padding: compact ? '8px 12px' : '11px 14px',
                  background: isSelected ? 'var(--tile-selected-bg)' : 'var(--tile-bg)',
                  borderColor: isSelected ? 'var(--lang-primary)' : 'var(--tile-border)',
                  color: isSelected ? 'var(--tile-selected-ink)' : 'var(--text-main)',
                  textAlign: langDir === 'rtl' ? 'right' : 'left',
                  lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                }}
                onClick={() => {
                  playSfx('tile_tap');
                  setSelectedChoice(choice);
                  setTurnOutcome(null);
                }}
              >
                <span dir={langDir}>{choice}</span>
                {isSelected ? <Check size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <WordBankTray
          seed={`${exercise.id}:${currentTurn.id}`}
          targetTokens={currentTurn.targetTokens ?? []}
          distractorTokens={currentTurn.distractorTokens ?? []}
          selectedTileUids={selectedTileUids}
          disabled={turnOutcome?.kind === 'ok'}
          compact={compact}
          dir={langDir}
          onChangeSelected={(next) => {
            setSelectedTileUids(next);
            setTurnOutcome(null);
          }}
        />
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
          </div>
        ) : (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {exercise.introLine}
          </span>
        )}

        {turnOutcome?.kind === 'ok' ? (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-success"
            onClick={handleNextTurn}
          >
            {turnIndex + 1 >= exercise.turns.length ? 'Finish Encounter!' : 'Next Turn'}
          </button>
        ) : (
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
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
