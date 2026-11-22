import type { MapNodeType } from '../../types/contracts';

const INK = '#0F172A';

export function MapNodeIcon({
  nodeType,
  state,
}: {
  nodeType: MapNodeType;
  state: 'completed' | 'active' | 'locked';
}) {
  const muted = state === 'locked';

  if (nodeType === 'chest') {
    const bodyFill = muted ? '#94A3B8' : state === 'completed' ? '#FBBF24' : '#D97706';
    const lidFill = muted ? '#CBD5E1' : '#FDE047';
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="6" y="15" width="24" height="15" rx="3.5" fill={bodyFill} stroke={INK} strokeWidth="2" />
        <path d="M6 16C6 10.5 11 8 18 8C25 8 30 10.5 30 16Z" fill={lidFill} stroke={INK} strokeWidth="2" />
        <rect x="15" y="14" width="6" height="8" rx="2" fill="#FEF9C3" stroke={INK} strokeWidth="1.6" />
        <circle cx="18" cy="18" r="1.2" fill={INK} />
      </svg>
    );
  }

  if (nodeType === 'story') {
    const pageFill = muted ? '#E2E8F0' : '#FFFBEB';
    const coverFill = muted ? '#94A3B8' : '#8B5CF6';
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M5 9C10 8 15 9.5 18 12.5C21 9.5 26 8 31 9V26.5C26 25.5 21 27 18 29.5C15 27 10 25.5 5 26.5Z"
          fill={coverFill}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 11.5C11.5 11 15.2 12.2 17.6 14.5V26.8C15.2 24.8 11.5 23.8 7.5 24.3Z"
          fill={pageFill}
        />
        <path
          d="M28.5 11.5C24.5 11 20.8 12.2 18.4 14.5V26.8C20.8 24.8 24.5 23.8 28.5 24.3Z"
          fill={pageFill}
        />
      </svg>
    );
  }

  if (nodeType === 'boss') {
    const crownFill = muted ? '#94A3B8' : '#FACC15';
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M6 25L4 12L12.5 17.5L18 8L23.5 17.5L32 12L30 25Z"
          fill={crownFill}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="6" y="25" width="24" height="5" rx="2" fill={muted ? '#CBD5E1' : '#F59E0B'} stroke={INK} strokeWidth="2" />
        <circle cx="18" cy="18.5" r="2.2" fill={muted ? '#64748B' : '#EF4444'} />
      </svg>
    );
  }

  // Default 'lesson': Compass Star or Checkmark when completed
  if (state === 'completed') {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M8.5 18.5L15 25L27.5 11.5"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path
        d="M18 6L21.5 13.8L30 14.8L23.6 20.5L25.4 29L18 24.6L10.6 29L12.4 20.5L6 14.8L14.5 13.8Z"
        fill={muted ? '#CBD5E1' : '#FEF08A'}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GoldStar({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2L12.4 6.9L17.8 7.7L13.9 11.5L14.8 16.9L10 14.3L5.2 16.9L6.1 11.5L2.2 7.7L7.6 6.9Z"
        fill={filled ? '#FACC15' : '#CBD5E1'}
        stroke={filled ? '#92400E' : '#64748B'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PadlockBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6.5 9V6.8C6.5 4.8 8 3.5 10 3.5C12 3.5 13.5 4.8 13.5 6.8V9" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="4.5" y="9" width="11" height="8" rx="2.5" fill="#94A3B8" stroke="#334155" strokeWidth="1.6" />
    </svg>
  );
}
