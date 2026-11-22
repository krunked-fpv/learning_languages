import type { AvatarId } from '../types/contracts';

export function AvatarBadge({
  avatarId,
  size = 44,
  className = '',
}: {
  avatarId: AvatarId;
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label={avatarId}>
      <circle cx="32" cy="32" r="30" fill="#2563EB" />
    </svg>
  );
}
