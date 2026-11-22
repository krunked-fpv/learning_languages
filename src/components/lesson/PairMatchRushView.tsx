import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Sparkles, Volume2 } from 'lucide-react';
import { playSfx, speakPhrase } from '../../audio';
import type { LanguageCode, PairMatchRushExercise } from '../../types/contracts';
import { deterministicShuffle } from './lessonHelpers';

export interface PairMatchRushViewProps {
  exercise: PairMatchRushExercise;
  language: LanguageCode;
  compact: boolean;
  onComplete: (result: { bonusEarned: boolean; maxRushCombo: number }) => void;
}

export function PairMatchRushView({
  exercise,
  language,
  compact,
  onComplete,
}: PairMatchRushViewProps) {
  const totalMs = Math.max(10, exercise.timeBonusSeconds) * 1000;
  const [timeLeftMs, setTimeLeftMs] = useState(totalMs);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [mismatchPair, setMismatchPair] = useState<{ left: string; right: string } | null>(null);
  const [rushCombo, setRushCombo] = useState(0);
  const [maxRushCombo, setMaxRushCombo] = useState(0);

  useEffect(() => {
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

  const evaluatePair = (leftId: string | null, rightId: string | null) => {
    if (!leftId || !rightId) return;
    if (leftId === rightId) {
      const nextCombo = rushCombo + 1;
      setRushCombo(nextCombo);
      setMaxRushCombo((m) => Math.max(m, nextCombo));
      setMatchedIds((prev) => (prev.includes(leftId) ? prev : [...prev, leftId]));
      setSelectedLeftId(null);
      setSelectedRightId(null);

      if (nextCombo >= 4) playSfx('combo_5x', nextCombo);
      else if (nextCombo >= 2) playSfx('combo_3x', nextCombo);
      else playSfx('correct_chime');
    } else {
      setRushCombo(0);
      setMismatchPair({ left: leftId, right: rightId });
      playSfx('gentle_nudge');
      window.setTimeout(() => {
        setMismatchPair(null);
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, 420);
    }
  };

  const handleSelectLeft = (id: string) => {
    if (matchedSet.has(id) || mismatchPair) return;
    playSfx('tile_tap');
    const nextLeft = selectedLeftId === id ? null : id;
    setSelectedLeftId(nextLeft);
    if (nextLeft && selectedRightId) {
      evaluatePair(nextLeft, selectedRightId);
    }
  };

  const handleSelectRight = (id: string) => {
    if (matchedSet.has(id) || mismatchPair) return;
    playSfx('tile_tap');
    const nextRight = selectedRightId === id ? null : id;
    setSelectedRightId(nextRight);
    if (selectedLeftId && nextRight) {
      evaluatePair(selectedLeftId, nextRight);
    }
  };

  const pct = totalMs > 0 ? Math.round((timeLeftMs / totalMs) * 100) : 0;
  const secondsDisplay = Math.ceil(timeLeftMs / 1000);

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
          <div style={{ fontSize: compact ? '0.98rem' : '1.12rem', fontWeight: 900, color: '#1e1b4b' }}>
            {exercise.title}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
            Match each word with its English partner ({matchedIds.length}/{exercise.pairs.length})
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            background: timeLeftMs > 0 ? '#eff6ff' : '#fef3c7',
            border: `2px solid ${timeLeftMs > 0 ? '#60a5fa' : '#f59e0b'}`,
            color: timeLeftMs > 0 ? '#1d4ed8' : '#b45309',
            fontWeight: 900,
            fontSize: '0.84rem',
          }}
        >
          <Clock size={15} />
          <span>{timeLeftMs > 0 ? `${secondsDisplay}s Bonus` : 'Steady Mode'}</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div
        aria-label="Pair match bonus timer"
        style={{
          height: 10,
          borderRadius: 999,
          background: '#e2e8f0',
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

            return (
              <motion.div
                key={`L-${item.id}`}
                animate={isShaking ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}
              >
                <button
                  type="button"
                  disabled={isMatched}
                  onClick={() => handleSelectLeft(item.id)}
                  className="tactile-btn"
                  style={{
                    flex: 1,
                    padding: compact ? '8px 10px' : '10px 12px',
                    fontSize: compact ? '0.85rem' : '0.94rem',
                    justifyContent: 'space-between',
                    background: isMatched
                      ? '#dcfce7'
                      : isShaking
                        ? '#ffe4e6'
                        : isSelected
                          ? '#eef2ff'
                          : '#ffffff',
                    borderColor: isMatched
                      ? '#4ade80'
                      : isShaking
                        ? '#fb7185'
                        : isSelected
                          ? '#4f46e5'
                          : '#cbd5e1',
                    color: isMatched ? '#15803d' : '#1e1b4b',
                    opacity: isMatched ? 0.72 : 1,
                  }}
                >
                  <span style={{ textAlign: 'left' }}>{item.foreign}</span>
                  {isMatched ? <CheckCircle2 size={16} /> : null}
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

            return (
              <motion.button
                key={`R-${item.id}`}
                type="button"
                disabled={isMatched}
                animate={isShaking ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => handleSelectRight(item.id)}
                className="tactile-btn"
                style={{
                  padding: compact ? '8px 10px' : '10px 12px',
                  fontSize: compact ? '0.85rem' : '0.94rem',
                  justifyContent: 'space-between',
                  background: isMatched
                    ? '#dcfce7'
                    : isShaking
                      ? '#ffe4e6'
                      : isSelected
                        ? '#eef2ff'
                        : '#ffffff',
                  borderColor: isMatched
                    ? '#4ade80'
                    : isShaking
                      ? '#fb7185'
                      : isSelected
                        ? '#4f46e5'
                        : '#cbd5e1',
                  color: isMatched ? '#15803d' : '#1e1b4b',
                  opacity: isMatched ? 0.72 : 1,
                  textAlign: 'left',
                }}
              >
                <span>{item.english}</span>
                {isMatched ? <CheckCircle2 size={16} /> : null}
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
            background: '#ecfdf5',
            border: '2px solid #34d399',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46', fontWeight: 900 }}>
            <Sparkles size={18} />
            <span>
              All {exercise.pairs.length} pairs matched!
              {timeLeftMs > 0 ? ' Speed Bonus Unlocked!' : ''}
            </span>
          </div>
          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-success"
            onClick={() => onComplete({ bonusEarned: timeLeftMs > 0, maxRushCombo })}
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
