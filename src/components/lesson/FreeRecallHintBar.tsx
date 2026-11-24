import type { FreeRecallHintPlan } from '../../core';
import type { FreeRecallToneCoaching, HintTier, TextDirection } from '../../types/contracts';

export interface FreeRecallHintBarProps {
  plan: FreeRecallHintPlan;
  hintTier: HintTier;
  ghostFaded: boolean;
  isAnimating: boolean;
  answerDir: TextDirection;
  compact?: boolean;
}

export function FreeRecallHintBar({
  plan,
  hintTier,
  ghostFaded,
  isAnimating,
  answerDir,
  compact = false,
}: FreeRecallHintBarProps) {
  if (hintTier === 0) return null;

  const extPlan = plan as FreeRecallHintPlan & {
    isRomanizedMode?: boolean;
    toneCoaching?: FreeRecallToneCoaching;
  };
  const isRomanizedMode = Boolean(extPlan.isRomanizedMode);
  const toneCoaching = extPlan.toneCoaching?.hasToneMismatch ? extPlan.toneCoaching : null;

  return (
    <div
      role="note"
      aria-label="Starlight phrase hint"
      data-testid="free-recall-hint-bar"
      data-hint-tier={hintTier}
      data-ghost-faded={ghostFaded ? 'true' : 'false'}
      className={`starlight-recall-bar ${isAnimating ? 'is-shimmering' : ''}`}
      style={{
        padding: compact ? '6px 9px' : '8px 12px',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          flexWrap: 'wrap',
          fontSize: '0.7rem',
          fontWeight: 900,
          letterSpacing: '0.02em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--starlight-ink)' }}>
            {hintTier === 1
              ? 'Starlight Whisper: Phrase Shape'
              : hintTier === 2
                ? 'Guided Cadence: Next Word Ghost'
                : 'Starlight Reveal: Next Step'}
          </span>
          {isRomanizedMode ? (
            <span
              data-testid="free-recall-romanized-chip"
              style={{
                padding: '1px 7px',
                borderRadius: 999,
                background: 'var(--tint-emerald-bg)',
                border: '1px solid var(--tint-emerald-border)',
                color: 'var(--tint-emerald-ink)',
                fontSize: '0.67rem',
                fontWeight: 900,
              }}
            >
              Romanized Syllable Guide
            </span>
          ) : null}
        </div>
        {plan.hasWrongSuffix ? (
          <span
            data-testid="free-recall-mismatch-note"
            style={{
              padding: '1px 7px',
              borderRadius: 999,
              background: 'var(--tint-amber-bg)',
              border: '1px solid var(--tint-amber-border)',
              color: 'var(--tint-amber-ink)',
            }}
          >
            Check word after prefix
          </span>
        ) : null}
      </div>

      {toneCoaching ? (
        <div
          data-testid="free-recall-tone-coaching"
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 5,
            alignSelf: 'flex-start',
            padding: compact ? '2px 8px' : '3px 10px',
            borderRadius: 999,
            background: 'var(--tint-indigo-bg)',
            border: '1px solid var(--tint-indigo-border)',
            color: 'var(--tint-indigo-ink)',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          <span>{toneCoaching.tip}</span>
          {toneCoaching.expectedWord && !toneCoaching.tip.includes(toneCoaching.expectedWord) ? (
            <strong>({toneCoaching.expectedWord})</strong>
          ) : null}
        </div>
      ) : null}

      <div
        dir={isRomanizedMode ? 'ltr' : answerDir}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: compact ? 4 : 6,
          alignItems: 'center',
        }}
      >
        {plan.slots.map((slot) => (
          <span
            key={`${slot.index}-${slot.state}`}
            data-slot-state={slot.state}
            className={`starlight-recall-slot is-${slot.state} ${
              slot.state === 'ghost' && ghostFaded ? 'is-faded' : ''
            }`}
          >
            {slot.display}
          </span>
        ))}
      </div>
    </div>
  );
}
