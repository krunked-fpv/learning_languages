import { useId } from 'react';
import type { MapNodeType } from '../../types/contracts';

const INK = '#4a3426';

export function MapNodeIcon({
  nodeType,
  state,
}: {
  nodeType: MapNodeType;
  state: 'completed' | 'active' | 'locked';
}) {
  const uid = useId().replace(/:/g, '');
  const muted = state === 'locked';

  if (nodeType === 'chest') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`chest-lid-${uid}`} x1="8" y1="8" x2="28" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? '#E2D8C8' : '#FFF1B8'} />
            <stop offset="55%" stopColor={muted ? '#C7BAA6' : '#F4C553'} />
            <stop offset="100%" stopColor={muted ? '#A89A84' : '#C98A28'} />
          </linearGradient>
          <linearGradient id={`chest-body-${uid}`} x1="7" y1="16" x2="29" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? '#BFB29E' : '#C97B35'} />
            <stop offset="100%" stopColor={muted ? '#8C7E6B' : '#7C421C'} />
          </linearGradient>
        </defs>
        {/* Warm down-right cast shadow */}
        <ellipse cx="19" cy="31.2" rx="11.5" ry="2.4" fill="#4a3426" opacity="0.24" />
        {/* Wooden chest body with brass straps */}
        <rect
          x="6"
          y="15.5"
          width="24"
          height="14.5"
          rx="3.5"
          fill={`url(#chest-body-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
        />
        <path
          d="M11 16V30M25 16V30"
          stroke={muted ? '#DDD2C2' : '#E9B949'}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Domed lid */}
        <path
          d="M6 16.5C6 10.6 11 7.8 18 7.8C25 7.8 30 10.6 30 16.5Z"
          fill={`url(#chest-lid-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* Upper-left specular gleam on lid */}
        <path
          d="M9.5 13.5C11 10.7 14 9.6 17.8 9.6"
          stroke="#FFFDF7"
          strokeOpacity={muted ? '0.45' : '0.78'}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Gilded lockplate */}
        <rect
          x="14.8"
          y="14"
          width="6.4"
          height="8.2"
          rx="2.1"
          fill={muted ? '#E7DED0' : '#FEF3C7'}
          stroke={INK}
          strokeWidth="1.5"
        />
        <circle cx="18" cy="17.6" r="1.25" fill={INK} />
        <path d="M18 18.6V20.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (nodeType === 'story') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`book-cov-${uid}`} x1="5" y1="8" x2="31" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? '#BDB3A3' : '#9B72CF'} />
            <stop offset="100%" stopColor={muted ? '#8C8170' : '#5B3A91'} />
          </linearGradient>
          <linearGradient id={`book-pg-${uid}`} x1="7" y1="11" x2="29" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? '#ECE4D6' : '#FFFDF5'} />
            <stop offset="100%" stopColor={muted ? '#D5CBB9' : '#F4E5C3'} />
          </linearGradient>
        </defs>
        <ellipse cx="19" cy="30.8" rx="12" ry="2.2" fill="#4a3426" opacity="0.22" />
        {/* Leather cover */}
        <path
          d="M5 9.2C10 8 15 9.6 18 12.6C21 9.6 26 8 31 9.2V26.6C26 25.6 21 27 18 29.6C15 27 10 25.6 5 26.6Z"
          fill={`url(#book-cov-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* Left & right parchment pages */}
        <path
          d="M7.5 11.4C11.4 10.8 15.2 12 17.5 14.3V26.6C15.1 24.6 11.5 23.7 7.5 24.2Z"
          fill={`url(#book-pg-${uid})`}
          stroke={INK}
          strokeWidth="0.9"
          strokeOpacity="0.45"
        />
        <path
          d="M28.5 11.4C24.6 10.8 20.8 12 18.5 14.3V26.6C20.9 24.6 24.5 23.7 28.5 24.2Z"
          fill={`url(#book-pg-${uid})`}
          stroke={INK}
          strokeWidth="0.9"
          strokeOpacity="0.45"
        />
        {/* Illustrated ink lines on pages */}
        <path
          d="M10 15.5H15M10 18.5H14.5M21 15.5H26M21.5 18.5H26"
          stroke={muted ? '#9B8F7E' : '#8B6D57'}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Silk bookmark ribbon */}
        {!muted && (
          <path
            d="M22.2 12.6V23.2L23.8 21.5L25.4 23.2V12.2Z"
            fill="#E05A47"
            stroke={INK}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        )}
      </svg>
    );
  }

  if (nodeType === 'boss') {
    return (
      <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`crown-g-${uid}`} x1="6" y1="8" x2="30" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={muted ? '#DFD6C7' : '#FFF2AE'} />
            <stop offset="50%" stopColor={muted ? '#BEB3A1' : '#F4BD3D'} />
            <stop offset="100%" stopColor={muted ? '#968A78' : '#C27A1C'} />
          </linearGradient>
        </defs>
        <ellipse cx="19" cy="31.5" rx="11.5" ry="2.2" fill="#4a3426" opacity="0.24" />
        <path
          d="M6 25L4.5 12.2L12.5 17.5L18 7.8L23.5 17.5L31.5 12.2L30 25Z"
          fill={`url(#crown-g-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* Tip pearls */}
        <circle cx="4.5" cy="11.5" r="1.7" fill={muted ? '#E6DEC9' : '#FFF7D6'} stroke={INK} strokeWidth="1.2" />
        <circle cx="18" cy="7.2" r="2" fill={muted ? '#E6DEC9' : '#FFF7D6'} stroke={INK} strokeWidth="1.2" />
        <circle cx="31.5" cy="11.5" r="1.7" fill={muted ? '#E6DEC9' : '#FFF7D6'} stroke={INK} strokeWidth="1.2" />
        {/* Embossed band */}
        <rect
          x="6"
          y="24.8"
          width="24"
          height="5"
          rx="2.2"
          fill={muted ? '#B8AC99' : '#D98B24'}
          stroke={INK}
          strokeWidth="1.9"
        />
        {/* Faceted ruby center cabochon */}
        <circle
          cx="18"
          cy="18.8"
          r="2.8"
          fill={muted ? '#8C7F6D' : '#D93848'}
          stroke={INK}
          strokeWidth="1.2"
        />
        <circle cx="17.1" cy="17.9" r="0.9" fill="#FFFDF7" opacity="0.85" />
      </svg>
    );
  }

  // Completed lesson: hand-inked calligraphic check with gilded warmth
  if (state === 'completed') {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path
          d="M9.5 19.5L15.6 25.6L28 12.2"
          stroke="#4a3426"
          strokeOpacity="0.28"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 18.5L14.8 24.8L27.2 11.4"
          stroke="#FFFDF5"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default 'lesson': Compass Rose Star medallion
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`star-g-${uid}`} x1="8" y1="6" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={muted ? '#E4DCCE' : '#FFF8C9'} />
          <stop offset="55%" stopColor={muted ? '#C9BFA9' : '#F8CA4D'} />
          <stop offset="100%" stopColor={muted ? '#A39783' : '#D68E23'} />
        </linearGradient>
      </defs>
      <path
        d="M18 5.8L21.5 13.7L30 14.8L23.6 20.6L25.4 29.2L18 24.7L10.6 29.2L12.4 20.6L6 14.8L14.5 13.7Z"
        fill={`url(#star-g-${uid})`}
        stroke={INK}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      {/* Upper-left sunlit facet */}
      <path
        d="M18 7.6L15.3 14.2L8.4 15.2L18 18.2Z"
        fill="#FFFDF5"
        opacity={muted ? '0.28' : '0.52'}
      />
    </svg>
  );
}

export function GoldStar({ filled, size = 16 }: { filled: boolean; size?: number }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`gs-${uid}`} x1="4" y1="2" x2="16" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={filled ? '#FFF5B8' : '#E8DFCF'} />
          <stop offset="55%" stopColor={filled ? '#F5BD38' : '#CFC3AE'} />
          <stop offset="100%" stopColor={filled ? '#C97F16' : '#A99C86'} />
        </linearGradient>
      </defs>
      <path
        d="M10 2L12.4 6.9L17.8 7.7L13.9 11.5L14.8 16.9L10 14.3L5.2 16.9L6.1 11.5L2.2 7.7L7.6 6.9Z"
        fill={`url(#gs-${uid})`}
        stroke={filled ? '#7A4712' : '#857766'}
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      {filled && <circle cx="8.6" cy="7.2" r="1.1" fill="#FFFDF7" opacity="0.85" />}
    </svg>
  );
}

export function PadlockBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.5 9V6.8C6.5 4.8 8 3.5 10 3.5C12 3.5 13.5 4.8 13.5 6.8V9"
        stroke="#6E5A49"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <rect x="4.5" y="9" width="11" height="8" rx="2.5" fill="#C9B79C" stroke="#4a3426" strokeWidth="1.5" />
      <circle cx="10" cy="12.6" r="1.15" fill="#4a3426" />
    </svg>
  );
}

/** Faceted starlight gem emblem for the Spaced-Repetition Memory Quest CTA. */
export function StarlightGemIcon({ size = 16 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`gem-${uid}`} x1="6" y1="3" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.2L19.2 8.4L16.4 20.6H7.6L4.8 8.4L12 2.2Z"
        fill={`url(#gem-${uid})`}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 2.2L15.4 8.6L12 20.6L8.6 8.6L12 2.2Z" fill="#E0F2FE" opacity="0.72" />
      <path d="M4.8 8.4H19.2" stroke={INK} strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.65" />
      <path
        d="M19.5 2.5L20.2 4.3L22 5L20.2 5.7L19.5 7.5L18.8 5.7L17 5L18.8 4.3L19.5 2.5Z"
        fill="#FEF08A"
      />
    </svg>
  );
}
