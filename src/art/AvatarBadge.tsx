import { useId } from 'react';
import type { ReactNode } from 'react';
import type { AvatarId } from '../types/contracts';

export interface AvatarBadgeProps {
  avatarId: AvatarId;
  size?: number;
  className?: string;
}

const AVATAR_META: Record<
  AvatarId,
  { label: string; bgStart: string; bgEnd: string; rimColor: string }
> = {
  pip_explorer: {
    label: 'Pip the Explorer avatar',
    bgStart: '#3B82F6',
    bgEnd: '#1E1B4B',
    rimColor: '#FBBF24',
  },
  mateo_chef: {
    label: 'Mateo the Chef avatar',
    bgStart: '#FB923C',
    bgEnd: '#9A3412',
    rimColor: '#FDE047',
  },
  colette_baker: {
    label: 'Colette the Baker avatar',
    bgStart: '#A78BFA',
    bgEnd: '#4C1D95',
    rimColor: '#FDA4AF',
  },
  benni_tinker: {
    label: 'Benni the Tinkerer avatar',
    bgStart: '#34D399',
    bgEnd: '#064E3B',
    rimColor: '#FCD34D',
  },
  luca_captain: {
    label: 'Luca the Captain avatar',
    bgStart: '#38BDF8',
    bgEnd: '#0C4A6E',
    rimColor: '#6EE7B7',
  },
  star_compass: {
    label: 'Starlight Compass avatar',
    bgStart: '#4F46E5',
    bgEnd: '#1E1B4B',
    rimColor: '#FDE047',
  },
};

const AVATAR_PORTRAITS: Record<AvatarId, (uid: string) => ReactNode> = {
  pip_explorer: (uid) => (
    <g>
      <defs>
        <radialGradient id={`pip-head-${uid}`} cx="42%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="65%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
      </defs>
      {/* Twinkle stars */}
      <circle cx="14" cy="17" r="1.3" fill="#FDE047" opacity="0.85" />
      <circle cx="51" cy="21" r="1.1" fill="#FDE047" opacity="0.75" />
      {/* Body shoulders & explorer collar */}
      <path d="M12 62C14 49 22 44 32 44C42 44 50 49 52 62Z" fill="#1E40AF" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M21 59C23 49 27 46 32 46C37 46 41 49 43 59Z" fill="#FDE68A" />
      {/* Brass compass medallion */}
      <circle cx="32" cy="54" r="4.8" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.2" />
      <circle cx="32" cy="54" r="2.8" fill="#FEF3C7" />
      <path d="M32 51.6L32.8 54L32 56.4L31.2 54Z" fill="#DC2626" />
      {/* Crown feather tuft */}
      <path
        d="M28 16C26 10 30 7 32 13C34 7 39 9 36 16Z"
        fill="#3B82F6"
        stroke="#0F172A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Plump round songbird head */}
      <circle cx="32" cy="31" r="17" fill={`url(#pip-head-${uid})`} stroke="#0F172A" strokeWidth="1.8" />
      {/* Explorer cap brim */}
      <path d="M17 23C21 15 43 15 47 23C40 20 24 20 17 23Z" fill="#D97706" stroke="#0F172A" strokeWidth="1.4" />
      <path d="M19 20C22 12 42 12 45 20Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.4" />
      {/* Rosy cheeks */}
      <ellipse cx="20.5" cy="35.5" rx="3.2" ry="2" fill="#FDA4AF" opacity="0.7" />
      <ellipse cx="43.5" cy="35.5" rx="3.2" ry="2" fill="#FDA4AF" opacity="0.7" />
      {/* Big bright eyes */}
      <circle cx="24.5" cy="30.5" r="4.1" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.3" />
      <circle cx="39.5" cy="30.5" r="4.1" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.3" />
      <circle cx="25.2" cy="30.8" r="2.4" fill="#0F172A" />
      <circle cx="38.8" cy="30.8" r="2.4" fill="#0F172A" />
      <circle cx="26.1" cy="29.6" r="1" fill="#FFFFFF" />
      <circle cx="39.7" cy="29.6" r="1" fill="#FFFFFF" />
      {/* Warm golden beak */}
      <path
        d="M28.2 34.2C30.4 33 33.6 33 35.8 34.2L32 40.5Z"
        fill="#FBBF24"
        stroke="#0F172A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M29.4 35.3H34.6" stroke="#B45309" strokeWidth="1" strokeLinecap="round" />
    </g>
  ),

  mateo_chef: (uid) => (
    <g>
      <defs>
        <radialGradient id={`mat-head-${uid}`} cx="45%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="70%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </radialGradient>
      </defs>
      {/* Shoulders + neckerchief */}
      <path d="M13 62C15 50 22 46 32 46C42 46 49 50 51 62Z" fill="#FB7185" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M21 48L32 56L43 48L38 45H26Z" fill="#FBBF24" stroke="#0F172A" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Signature Axolotl feathery gill frills */}
      <g stroke="#0F172A" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M16 28L8 23L12 31L7 33L13 36L9 41L17 38Z" fill="#F43F5E" />
        <path d="M48 28L56 23L52 31L57 33L51 36L55 41L47 38Z" fill="#F43F5E" />
      </g>
      {/* Axolotl head */}
      <ellipse cx="32" cy="34" rx="16.5" ry="14" fill={`url(#mat-head-${uid})`} stroke="#0F172A" strokeWidth="1.8" />
      {/* Mini Chef Toque */}
      <path
        d="M22 22C18 16 23 9 28 11C30 7 35 7 36 11C41 9 46 16 42 22Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="22" y="20" width="20" height="4.5" rx="1.5" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.3" />
      {/* Cheeks */}
      <ellipse cx="21" cy="37" rx="3" ry="1.8" fill="#E11D48" opacity="0.35" />
      <ellipse cx="43" cy="37" rx="3" ry="1.8" fill="#E11D48" opacity="0.35" />
      {/* Eyes */}
      <circle cx="24.5" cy="32.5" r="3" fill="#0F172A" />
      <circle cx="39.5" cy="32.5" r="3" fill="#0F172A" />
      <circle cx="25.5" cy="31.5" r="1.1" fill="#FFFFFF" />
      <circle cx="40.5" cy="31.5" r="1.1" fill="#FFFFFF" />
      {/* Friendly wide grin */}
      <path
        d="M25 37.5C27.5 41.2 36.5 41.2 39 37.5"
        stroke="#0F172A"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),

  colette_baker: (uid) => (
    <g>
      <defs>
        <radialGradient id={`col-head-${uid}`} cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="65%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </radialGradient>
      </defs>
      {/* Bakery apron shoulders */}
      <path d="M12 62C14 50 22 45 32 45C42 45 50 50 52 62Z" fill="#EA580C" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M22 48H42L45 62H19Z" fill="#FFFBEB" stroke="#0F172A" strokeWidth="1.3" />
      {/* Pointed Fox Ears */}
      <path d="M16 29L14 11L27 21Z" fill="#C2410C" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17.5 26L16.5 15.5L24.5 21.5Z" fill="#FEF3C7" />
      <path d="M48 29L50 11L37 21Z" fill="#C2410C" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M46.5 26L47.5 15.5L39.5 21.5Z" fill="#FEF3C7" />
      {/* Fox Head */}
      <path
        d="M15 34C15 24 22 19 32 19C42 19 49 24 49 34C49 42 40 47 32 47C24 47 15 42 15 34Z"
        fill={`url(#col-head-${uid})`}
        stroke="#0F172A"
        strokeWidth="1.8"
      />
      {/* Cream cheek ruffs */}
      <path d="M16 35C19 33 25 36 32 42C39 36 45 33 48 35C46 43 39 47 32 47C25 47 18 43 16 35Z" fill="#FFF7ED" />
      {/* Jaunty Parisian Crimson Beret */}
      <path
        d="M21 20C22 12 37 10 43 16C46 19 41 23 32 22C24 22 20 22 21 20Z"
        fill="#E11D48"
        stroke="#0F172A"
        strokeWidth="1.5"
      />
      <path d="M33 12L34.5 9.5" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="24.5" cy="31.5" rx="2.7" ry="3.2" fill="#0F172A" />
      <ellipse cx="39.5" cy="31.5" rx="2.7" ry="3.2" fill="#0F172A" />
      <circle cx="25.4" cy="30.3" r="1.05" fill="#FFFFFF" />
      <circle cx="40.4" cy="30.3" r="1.05" fill="#FFFFFF" />
      {/* Nose + sweet smile */}
      <path d="M29.6 36.2H34.4L32 39.2Z" fill="#1E293B" />
      <path d="M28.5 40.8C30 42.3 34 42.3 35.5 40.8" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>
  ),

  benni_tinker: (uid) => (
    <g>
      <defs>
        <radialGradient id={`ben-face-${uid}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#FEFCE8" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </radialGradient>
      </defs>
      {/* Tinkerer leather collar & brass gear */}
      <path d="M12 62C14 50 22 46 32 46C42 46 50 50 52 62Z" fill="#334155" stroke="#0F172A" strokeWidth="1.6" />
      <circle cx="32" cy="54" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.2" />
      <circle cx="32" cy="54" r="1.8" fill="#1E293B" />
      {/* Round Badger Ears */}
      <circle cx="18" cy="20" r="5.5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="18" cy="20" r="2.7" fill="#E2E8F0" />
      <circle cx="46" cy="20" r="5.5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="46" cy="20" r="2.7" fill="#E2E8F0" />
      {/* Head */}
      <ellipse cx="32" cy="33" rx="16.5" ry="14.5" fill={`url(#ben-face-${uid})`} stroke="#0F172A" strokeWidth="1.8" />
      {/* Signature Badger dark stripes */}
      <path d="M19.5 22.5C22.5 24 27 29 27.5 36.5C24 38 19.5 36 17.5 30.5Z" fill="#1E293B" />
      <path d="M44.5 22.5C41.5 24 37 29 36.5 36.5C40 38 44.5 36 46.5 30.5Z" fill="#1E293B" />
      {/* Brass Tinkerer Goggles perched on forehead */}
      <rect x="20" y="19" width="24" height="3.2" rx="1.5" fill="#78350F" />
      <circle cx="25.5" cy="21" r="4.5" fill="#38BDF8" stroke="#D97706" strokeWidth="2" />
      <circle cx="38.5" cy="21" r="4.5" fill="#38BDF8" stroke="#D97706" strokeWidth="2" />
      <path d="M23.8 19.3L26.5 22" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      <path d="M36.8 19.3L39.5 22" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      {/* Eyes */}
      <circle cx="24" cy="31.5" r="2.3" fill="#FFFFFF" />
      <circle cx="40" cy="31.5" r="2.3" fill="#FFFFFF" />
      <circle cx="24.2" cy="31.5" r="1.4" fill="#0F172A" />
      <circle cx="39.8" cy="31.5" r="1.4" fill="#0F172A" />
      {/* Snout & smile */}
      <ellipse cx="32" cy="36.5" rx="3.2" ry="2.2" fill="#0F172A" />
      <path d="M28.2 40.5C30 42.3 34 42.3 35.8 40.5" stroke="#0F172A" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>
  ),

  luca_captain: (uid) => (
    <g>
      <defs>
        <radialGradient id={`luc-head-${uid}`} cx="45%" cy="38%" r="68%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="68%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </radialGradient>
      </defs>
      {/* Striped Venetian Gondolier Scarf */}
      <path d="M12 62C14 50 22 46 32 46C42 46 50 50 52 62Z" fill="#0284C7" stroke="#0F172A" strokeWidth="1.6" />
      <path d="M18 52H46M16 57H48" stroke="#FFFFFF" strokeWidth="2.4" />
      {/* Round Otter Ears */}
      <circle cx="17.5" cy="24.5" r="4.5" fill="#92400E" stroke="#0F172A" strokeWidth="1.5" />
      <circle cx="46.5" cy="24.5" r="4.5" fill="#92400E" stroke="#0F172A" strokeWidth="1.5" />
      {/* Otter Head */}
      <ellipse cx="32" cy="33.5" rx="16" ry="14" fill={`url(#luc-head-${uid})`} stroke="#0F172A" strokeWidth="1.8" />
      {/* Gondolier Boater Cap */}
      <ellipse cx="32" cy="19.5" rx="18.5" ry="3.2" fill="#FEF3C7" stroke="#0F172A" strokeWidth="1.4" />
      <rect x="21.5" y="13" width="21" height="6.5" rx="2.5" fill="#FDE68A" stroke="#0F172A" strokeWidth="1.4" />
      <rect x="21.5" y="16.6" width="21" height="2.4" fill="#DC2626" />
      {/* Cream Muzzle */}
      <ellipse cx="32" cy="37.5" rx="9.5" ry="6.2" fill="#FEF3C7" />
      {/* Eyes */}
      <circle cx="24.5" cy="30.5" r="2.7" fill="#0F172A" />
      <circle cx="39.5" cy="30.5" r="2.7" fill="#0F172A" />
      <circle cx="25.3" cy="29.6" r="1" fill="#FFFFFF" />
      <circle cx="40.3" cy="29.6" r="1" fill="#FFFFFF" />
      {/* Nose & Whiskers */}
      <path d="M29.2 35.2C30.8 34 33.2 34 34.8 35.2L32 38Z" fill="#0F172A" />
      <path d="M28.5 40.3C30.5 42 33.5 42 35.5 40.3" stroke="#0F172A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M21 36.5L15 35.5M21 38.8L15 39.5M43 36.5L49 35.5M43 38.8L49 39.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" />
    </g>
  ),

  star_compass: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cmp-rim-${uid}`} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <radialGradient id={`cmp-face-${uid}`} cx="45%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>
      {/* Top Hanging Compass Ring */}
      <circle cx="32" cy="11.5" r="4.2" fill="none" stroke={`url(#cmp-rim-${uid})`} strokeWidth="2.8" />
      {/* Outer Brass Compass Case */}
      <circle cx="32" cy="34.5" r="20.5" fill={`url(#cmp-rim-${uid})`} stroke="#0F172A" strokeWidth="1.8" />
      <circle cx="32" cy="34.5" r="16.5" fill={`url(#cmp-face-${uid})`} stroke="#F59E0B" strokeWidth="1.2" />
      {/* Cardinal ticks */}
      <path d="M32 19.5V22.5M32 46.5V49.5M17 34.5H20M44 34.5H47" stroke="#FDE047" strokeWidth="1.6" strokeLinecap="round" />
      {/* 8-point Starlight Needle */}
      <path d="M32 21L35.2 31.3L45.5 34.5L35.2 37.7L32 48L28.8 37.7L18.5 34.5L28.8 31.3Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="0.9" />
      <path d="M32 21L35.2 31.3L32 34.5Z" fill="#EF4444" />
      <path d="M32 21L28.8 31.3L32 34.5Z" fill="#FCA5A5" />
      {/* Jewel Hub */}
      <circle cx="32" cy="34.5" r="3.4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.1" />
      {/* Sparkles */}
      <circle cx="14" cy="18" r="1.4" fill="#FDE047" />
      <circle cx="51" cy="20" r="1.2" fill="#FDE047" />
    </g>
  ),
};

export function AvatarBadge({ avatarId, size = 44, className = '' }: AvatarBadgeProps) {
  const uid = useId().replace(/:/g, '');
  const meta = AVATAR_META[avatarId];
  const bgId = `avatar-bg-${uid}`;
  const clipId = `avatar-clip-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={meta.label}
      data-avatar={avatarId}
    >
      <defs>
        <radialGradient id={bgId} cx="38%" cy="30%" r="74%">
          <stop offset="0%" stopColor={meta.bgStart} />
          <stop offset="100%" stopColor={meta.bgEnd} />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="27.5" />
        </clipPath>
      </defs>

      {/* Outer medallion ring */}
      <circle cx="32" cy="32" r="30.5" fill={meta.rimColor} stroke="#0F172A" strokeWidth="2" />
      <circle cx="32" cy="32" r="27.5" fill={`url(#${bgId})`} />

      <g clipPath={`url(#${clipId})`}>{AVATAR_PORTRAITS[avatarId](uid)}</g>

      {/* Crisp inner frame + glossy rim highlight */}
      <circle cx="32" cy="32" r="27.5" stroke="#0F172A" strokeWidth="1.5" />
      <path
        d="M12.5 21C16.5 11.5 26 7 36.5 8.2"
        stroke="#FFFFFF"
        strokeOpacity="0.48"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
