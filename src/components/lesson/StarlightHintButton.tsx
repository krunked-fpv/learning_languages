import type { HintTier } from '../../types/contracts';

export interface StarlightHintButtonProps {
  hintTier: HintTier;
  hintsUsed?: number;
  isAnimating: boolean;
  canHint: boolean;
  onTrigger: () => void;
  size?: 'xs' | 'sm' | 'md';
  label?: string;
  shortcutTitle?: string;
}

export function StarlightHintButton({
  hintTier,
  isAnimating,
  canHint,
  onTrigger,
  size = 'sm',
  label = 'Hint',
  shortcutTitle = 'Starlight Hint (H / Alt+H)',
}: StarlightHintButtonProps) {
  const iconSize = size === 'xs' ? 12 : size === 'sm' ? 14 : 16;

  return (
    <button
      type="button"
      data-testid="starlight-hint-btn"
      data-hint-tier={hintTier}
      data-hint-animating={isAnimating ? 'true' : 'false'}
      aria-busy={isAnimating}
      aria-label={
        hintTier > 0
          ? `${label} (Tier ${hintTier} of 3)`
          : label
      }
      title={shortcutTitle}
      disabled={!canHint}
      onClick={onTrigger}
      className={`tactile-btn starlight-hint-btn is-size-${size} ${
        isAnimating ? 'is-playing' : ''
      } ${hintTier > 0 ? 'has-tier' : ''}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M12 2.5L14.3 9.7L21.5 12L14.3 14.3L12 21.5L9.7 14.3L2.5 12L9.7 9.7L12 2.5Z"
          fill="currentColor"
          opacity="0.92"
        />
        <circle cx="19" cy="5" r="1.5" fill="#fde047" />
        <circle cx="5.5" cy="18.5" r="1.2" fill="#67e8f9" />
      </svg>
      <span>{label}</span>
      <span className="starlight-tier-pips" aria-hidden="true">
        {[1, 2, 3].map((pip) => {
          const lit = pip <= hintTier;
          return (
            <span
              key={pip}
              data-pip-active={lit ? 'true' : 'false'}
              className={`starlight-tier-pip ${lit ? 'is-lit' : ''}`}
            />
          );
        })}
      </span>
    </button>
  );
}
