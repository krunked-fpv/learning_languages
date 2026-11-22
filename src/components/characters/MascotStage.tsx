import type { CharacterPose, CompanionId, EquippedCosmetics } from '../../types/contracts';

export function MascotStage({
  companionId,
  pose,
  size = 180,
  badgeText,
  className = '',
}: {
  companionId: CompanionId;
  pose: CharacterPose;
  equippedCosmetics?: EquippedCosmetics;
  pointerTarget?: { x: number; y: number } | null;
  comboCount?: number;
  size?: number;
  badgeText?: string;
  className?: string;
}) {
  return (
    <div className={className} data-companion={companionId} data-pose={pose}>
      <svg width={size} height={size} viewBox="0 0 200 200" aria-label={companionId}>
        <circle cx="100" cy="100" r="80" fill="#2563EB" />
      </svg>
      {badgeText ? <span>{badgeText}</span> : null}
    </div>
  );
}
