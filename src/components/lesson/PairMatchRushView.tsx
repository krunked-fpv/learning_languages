import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Sparkles, Volume2 } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import { LANGUAGE_META, type LanguageCode, type PairMatchRushExercise } from '../../types/contracts';
import { SayItNormallyButton } from './SayItNormallyButton';
import { StarlightHintButton } from './StarlightHintButton';
import { deterministicShuffle } from './lessonHelpers';
import { useHintEngine } from './useHintEngine';

export interface PairMatchRushViewProps {
  exercise: PairMatchRushExercise;
  language: LanguageCode;
  compact: boolean;
  onComplete: (result: { bonusEarned: boolean; maxRushCombo: number }) => void;
  onHintUsed?: (info: { exerciseId: string; tier: 1 | 2 | 3; hintsUsed: number }) => void;
}

export function PairMatchRushView({
  exercise,
  language,
  compact,
  onComplete,
  onHintUsed,
}: PairMatchRushViewProps) {
  const totalMs = Math.max(10, exercise.timeBonusSeconds) * 1000;
  const [timeLeftMs, setTimeLeftMs] = useState(totalMs);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [mismatchPair, setMismatchPair] = useState<{ left: string; right: string } | null>(null);
  const [rushCombo, setRushCombo] = useState(0);
  const [maxRushCombo, setMaxRushCombo] = useState(0);
  const mismatchTimerRef = useRef<number | null>(null);
  const mismatchLockRef = useRef(false);
  const completeLockRef = useRef(false);

  useEffect(() => {
    return () => {
      if (mismatchTimerRef.current !== null) {
        window.clearTimeout(mismatchTimerRef.current);
        mismatchTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mismatchTimerRef.current !== null) {
      window.clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = null;
    }
    mismatchLockRef.current = false;
    completeLockRef.current = false;
    setTimeLeftMs(Math.max(10, exercise.timeBonusSeconds) * 1000);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMatchedIds([]);
    setMismatchPair(null);
    setRushCombo(0);
    setMaxRushCombo(0);
  }, [exercise.id, exercise.timeBonusSeconds]);

  const allMatched = matchedIds.length >= exercise.pairs.length && exercise.pairs.length > 0;

  useEffect(() => {
    if (allMatched || timeLeftMs <= 0) return;
    const timer = window.setInterval(() => {
      setTimeLeftMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => window.clearInterval(timer);
  }, [allMatched, timeLeftMs]);

  const leftItems = useMemo(
    () => deterministicShuffle(exercise.pairs, `${exercise.id}:left`),
    [exercise.id, exercise.pairs]
  );
  const rightItems = useMemo(
    () => deterministicShuffle(exercise.pairs, `${exercise.id}:right`),
    [exercise.id, exercise.pairs]
  );

  const matchedSet = useMemo(() => new Set(matchedIds), [matchedIds]);

  const hint = useHintEngine({
    promptKey: exercise.id,
    mode: 'pair_match',
    canHint: !allMatched,
    pairConfig: {
      leftIds: exercise.pairs.map((p) => p.id),
      matchedIds,
      selectedLeftId,
      selectedRightId,
    },
    onHintTriggered: (info) => {
      onHintUsed?.({ exerciseId: exercise.id, tier: info.tier, hintsUsed: info.hintsUsed });
    },
  });

  const { cancelHint } = hint;

  useEffect(() => {
    if (allMatched) {
      cancelHint({ clearAssists: true });
    }
  }, [allMatched, cancelHint]);

  const evaluatePair = (leftId: string | null, rightId: string | null) => {
    if (!leftId || !rightId) return;
    if (leftId === rightId) {
      const nextCombo = rushCombo + 1;
      setRushCombo(nextCombo);
      setMaxRushCombo((m) => Math.max(m, nextCombo));
      setMatchedIds((prev) => (prev.includes(leftId) ? prev : [...prev, leftId]));
      setSelectedLeftId(null);
      setSelectedRightId(null);
      cancelHint({ clearAssists: true });

      if (nextCombo >= 4) playSfx('combo_5x', nextCombo);
      else if (nextCombo >= 2) playSfx('combo_3x', nextCombo);
      else playSfx('correct_chime');
    } else {
      mismatchLockRef.current = true;
      setRushCombo(0);
      setMismatchPair({ left: leftId, right: rightId });
      playSfx('gentle_nudge');
      if (mismatchTimerRef.current !== null) {
        window.clearTimeout(mismatchTimerRef.current);
      }
      mismatchTimerRef.current = window.setTimeout(() => {
        mismatchTimerRef.current = null;
        mismatchLockRef.current = false;
        setMismatchPair(null);
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, 420);
    }
  };

  const handleSelectLeft = (id: string) => {
    if (matchedSet.has(id) || mismatchPair || mismatchLockRef.current) return;
    cancelHint();
    playSfx('tile_tap');
    const nextLeft = selectedLeftId === id ? null : id;
    setSelectedLeftId(nextLeft);
    if (nextLeft && selectedRightId) {
      evaluatePair(nextLeft, selectedRightId);
    }
  };

  const handleSelectRight = (id: string) => {
    if (matchedSet.has(id) || mismatchPair || mismatchLockRef.current) return;
    cancelHint();
    playSfx('tile_tap');
    const nextRight = selectedRightId === id ? null : id;
    setSelectedRightId(nextRight);
    if (selectedLeftId && nextRight) {
      evaluatePair(selectedLeftId, nextRight);
    }
  };

  const pct = totalMs > 0 ? Math.round((timeLeftMs / totalMs) * 100) : 0;
  const secondsDisplay = Math.ceil(timeLeftMs / 1000);
  const langMeta = LANGUAGE_META[language];
  const langDir = langMeta.dir;

  const selectedPair =
    exercise.pairs.find((p) => p.id === selectedLeftId) ??
    exercise.pairs.find((p) => p.id === selectedRightId);
  const recentMatchedPair =
    matchedIds.length > 0
      ? exercise.pairs.find((p) => p.id === matchedIds[matchedIds.length - 1])
      : undefined;
  const decoderPair = selectedPair ?? recentMatchedPair ?? exercise.pairs[0];
  const decoderIsMatched = Boolean(decoderPair && matchedSet.has(decoderPair.id));
  const decoderSideOnlyRight = Boolean(selectedRightId && !selectedLeftId && !decoderIsMatched);

  return (
    <div
      className="tactile-card"
      style={{
        padding: compact ? '12px 12px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 12,
        width: '100%',
      }}
    >
      {/* Header + Countdown Bonus Meter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: compact ? '0.98rem' : '1.12rem', fontWeight: 900, color: 'var(--text-main)' }}>
            {exercise.title}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {language === 'en'
              ? `Match each phrase with its meaning clue (${matchedIds.length}/${exercise.pairs.length})`
              : langMeta.translationLanguageLabel
                ? `Match each phrase with its ${langMeta.translationLanguageLabel} partner (${matchedIds.length}/${exercise.pairs.length})`
                : `Match each word with its English partner (${matchedIds.length}/${exercise.pairs.length})`}
          </div>
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 999,
              background: timeLeftMs > 0 ? 'var(--tint-indigo-bg)' : 'var(--tint-amber-bg)',
              border: `2px solid ${timeLeftMs > 0 ? 'var(--tint-indigo-border)' : 'var(--tint-amber-border)'}`,
              color: timeLeftMs > 0 ? 'var(--tint-indigo-ink)' : 'var(--tint-amber-ink)',
              fontWeight: 900,
              fontSize: '0.84rem',
            }}
          >
            <Clock size={15} />
            <span>{timeLeftMs > 0 ? `${secondsDisplay}s Bonus` : 'Steady Mode'}</span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div
        aria-label="Pair match bonus timer"
        style={{
          height: 10,
          borderRadius: 999,
          background: 'rgba(148, 163, 184, 0.28)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 35 ? '#10b981' : '#f59e0b',
            transition: 'width 100ms linear',
          }}
        />
      </div>

      {decoderPair ? (
        <SayItNormallyButton
          language={language}
          dialectAText={decoderSideOnlyRight ? undefined : decoderPair.foreign}
          dialectBText={
            decoderIsMatched || decoderSideOnlyRight ? decoderPair.english : undefined
          }
          explicitPlain={decoderIsMatched ? decoderPair.plainEnglish : undefined}
          avoidTerms={
            decoderIsMatched
              ? undefined
              : decoderSideOnlyRight
                ? [decoderPair.foreign]
                : [decoderPair.english]
          }
          resetKey={`${exercise.id}:${decoderPair.id}:${selectedLeftId ?? ''}:${selectedRightId ?? ''}:${matchedIds.length}`}
          size="sm"
        />
      ) : null}

      {/* 2-Column Bilingual Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: compact ? 8 : 12,
        }}
      >
        {/* Left Column: Foreign */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
          {leftItems.map((item) => {
            const isMatched = matchedSet.has(item.id);
            const isSelected = selectedLeftId === item.id;
            const isShaking = mismatchPair?.left === item.id;
            const isPairPulsing =
              !isMatched &&
              (hint.activeFlashUids.has(item.id) ||
                (hint.spotlightZone === 'pair' && hint.spotlightUid === item.id));
            const isDimmed = !isMatched && hint.dimmedUids.has(item.id);

            return (
              <motion.div
                key={`L-${item.id}`}
                animate={isShaking ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                  <button
                    type="button"
                    disabled={isMatched}
                    dir={langDir}
                    data-pair-id={item.id}
                    data-hint-pair-pulse={isPairPulsing ? 'true' : undefined}
                    data-hint-dimmed={isDimmed ? 'true' : undefined}
                    onClick={() => handleSelectLeft(item.id)}
                    className={`tactile-btn starlight-choice-tile ${
                      isPairPulsing ? 'is-starlight-pair-pulse' : ''
                    } ${isDimmed ? 'is-starlight-dimmed' : ''}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: compact ? '8px 10px' : '10px 12px',
                      fontSize: compact ? '0.85rem' : '0.94rem',
                      lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                      justifyContent: 'space-between',
                      background: isMatched
                        ? 'var(--tint-emerald-bg)'
                        : isShaking
                          ? 'var(--tint-rose-bg)'
                          : isSelected
                            ? 'var(--tile-selected-bg)'
                            : 'var(--tile-bg)',
                      borderColor: isMatched
                        ? 'var(--tint-emerald-border)'
                        : isShaking
                          ? 'var(--tint-rose-border)'
                          : isSelected
                            ? 'var(--lang-primary)'
                            : 'var(--tile-border)',
                      color: isMatched
                        ? 'var(--tint-emerald-ink)'
                        : isSelected
                          ? 'var(--tile-selected-ink)'
                          : 'var(--text-main)',
                      opacity: isMatched ? 0.72 : isDimmed ? 0.38 : 1,
                    }}
                  >
                    <span
                      dir={langDir}
                      style={{
                        textAlign: langDir === 'rtl' ? 'right' : 'left',
                        lineHeight: langDir === 'rtl' ? 1.5 : 1.25,
                        overflowWrap: 'anywhere',
                        minWidth: 0,
                        whiteSpace: 'normal',
                      }}
                    >
                      {item.foreign}
                    </span>
                    {isMatched ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : null}
                  </button>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '0 8px', borderRadius: 14 }}
                    aria-label={`Hear ${item.foreign}`}
                    onClick={() => {
                      void speakPhrase({ text: item.foreign, language, phonetic: item.phonetic });
                    }}
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
                {item.romanized ? (
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      paddingInline: 6,
                      lineHeight: 1.15,
                    }}
                  >
                    {item.romanized}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Right Column: English */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
          {rightItems.map((item) => {
            const isMatched = matchedSet.has(item.id);
            const isSelected = selectedRightId === item.id;
            const isShaking = mismatchPair?.right === item.id;
            const isPairPulsing =
              !isMatched &&
              (hint.activeFlashUids.has(item.id) ||
                (hint.spotlightZone === 'pair' && hint.spotlightUid === item.id));
            const isDimmed = !isMatched && hint.dimmedUids.has(item.id);

            return (
              <motion.button
                key={`R-${item.id}`}
                type="button"
                disabled={isMatched}
                animate={isShaking ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                data-pair-id={item.id}
                data-hint-pair-pulse={isPairPulsing ? 'true' : undefined}
                data-hint-dimmed={isDimmed ? 'true' : undefined}
                onClick={() => handleSelectRight(item.id)}
                className={`tactile-btn starlight-choice-tile ${
                  isPairPulsing ? 'is-starlight-pair-pulse' : ''
                } ${isDimmed ? 'is-starlight-dimmed' : ''}`}
                style={{
                  minWidth: 0,
                  padding: compact ? '8px 10px' : '10px 12px',
                  fontSize: compact ? '0.85rem' : '0.94rem',
                  justifyContent: 'space-between',
                  overflowWrap: 'break-word',
                  background: isMatched
                    ? 'var(--tint-emerald-bg)'
                    : isShaking
                      ? 'var(--tint-rose-bg)'
                      : isSelected
                        ? 'var(--tile-selected-bg)'
                        : 'var(--tile-bg)',
                  borderColor: isMatched
                    ? 'var(--tint-emerald-border)'
                    : isShaking
                      ? 'var(--tint-rose-border)'
                      : isSelected
                        ? 'var(--lang-primary)'
                        : 'var(--tile-border)',
                  color: isMatched
                    ? 'var(--tint-emerald-ink)'
                    : isSelected
                      ? 'var(--tile-selected-ink)'
                      : 'var(--text-main)',
                  opacity: isMatched ? 0.72 : isDimmed ? 0.38 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{item.english}</span>
                {isMatched ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : null}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Completion Callout */}
      {allMatched ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 16,
            background: 'var(--tint-emerald-bg)',
            border: '2px solid var(--tint-emerald-border)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tint-emerald-ink)', fontWeight: 900 }}>
            <Sparkles size={18} />
            <span>
              All {exercise.pairs.length} pairs matched!
              {timeLeftMs > 0 ? ' Speed Bonus Unlocked!' : ''}
            </span>
          </div>
          <button
            key="pair-match-continue-btn"
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-success"
            onClick={() => {
              if (completeLockRef.current) return;
              completeLockRef.current = true;
              onComplete({ bonusEarned: timeLeftMs > 0, maxRushCombo });
            }}
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
