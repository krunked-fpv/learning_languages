import { useId } from 'react';
import type { IllustrationKey, LanguageCode } from '../types/contracts';
import type { SceneRenderer } from './vocab/shared';
import { UNIT1_SCENES } from './vocab/unit1Greetings';
import { UNIT2_SCENES } from './vocab/unit2Treats';
import { UNIT3_SCENES } from './vocab/unit3Nature';
import { UNIT4_SCENES } from './vocab/unit4FamilyColors';
import { UNIT5_SCENES } from './vocab/unit5Expedition';

export interface VocabIllustrationProps {
  illustrationKey: IllustrationKey;
  language?: LanguageCode;
  size?: number;
  className?: string;
}

export const VOCAB_ILLUSTRATIONS: Record<IllustrationKey, SceneRenderer> = {
  ...UNIT1_SCENES,
  ...UNIT2_SCENES,
  ...UNIT3_SCENES,
  ...UNIT4_SCENES,
  ...UNIT5_SCENES,
  acoustic_guitar: UNIT5_SCENES.party_confetti,
  soccer_ball: UNIT5_SCENES.bicycle_ride,
  paint_palette: UNIT5_SCENES.museum_lantern,
  storybook_open: UNIT5_SCENES.compass_map,
  cozy_bed: UNIT4_SCENES.cozy_home,
  explorer_boots: UNIT5_SCENES.backpack_ready,
  winter_coat: UNIT5_SCENES.rainy_umbrella,
  sunny_window: UNIT5_SCENES.sunny_weather,
  crescent_moon: UNIT1_SCENES.night_stars,
  ringed_planet: UNIT5_SCENES.starlight_trophy,
  starlight_rocket: UNIT5_SCENES.express_train,
  rainbow_arc: UNIT3_SCENES.blooming_flower,
};

const STICKER_BACKGROUNDS: Record<
  LanguageCode | 'default',
  { top: string; bottom: string; ring: string }
> = {
  es: { top: '#FFF7ED', bottom: '#FFEDD5', ring: '#FDBA74' },
  fr: { top: '#EFF6FF', bottom: '#E0E7FF', ring: '#93C5FD' },
  de: { top: '#FFFBEB', bottom: '#FEF3C7', ring: '#FCD34D' },
  it: { top: '#ECFDF5', bottom: '#D1FAE5', ring: '#6EE7B7' },
  default: { top: '#F0F9FF', bottom: '#E0F2FE', ring: '#BAE6FD' },
};

export function VocabIllustration({
  illustrationKey,
  language,
  size = 120,
  className = '',
}: VocabIllustrationProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `vocab-bg-${uid}`;
  const clipId = `vocab-clip-${uid}`;
  const palette = language ? STICKER_BACKGROUNDS[language] : STICKER_BACKGROUNDS.default;
  const renderScene = VOCAB_ILLUSTRATIONS[illustrationKey];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={illustrationKey.replace(/_/g, ' ')}
      data-illustration={illustrationKey}
      data-language={language ?? 'default'}
    >
      <defs>
        <linearGradient id={bgId} x1="60" y1="6" x2="60" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.top} />
          <stop offset="100%" stopColor={palette.bottom} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="6" y="6" width="108" height="108" rx="26" />
        </clipPath>
      </defs>

      {/* Tactile sticker drop shadow base */}
      <rect x="6" y="8" width="108" height="108" rx="26" fill="#0F172A" opacity="0.1" />

      {/* Glossy sticker tile */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="26"
        fill={`url(#${bgId})`}
        stroke="#FFFFFF"
        strokeWidth="3.5"
      />
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="24"
        stroke={palette.ring}
        strokeWidth="1.5"
        strokeOpacity="0.65"
      />

      {/* Scene Artwork */}
      <g clipPath={`url(#${clipId})`}>{renderScene(uid)}</g>

      {/* Subtle top-left glossy sticker sheen */}
      <path
        d="M17 24C17 17.5 22.5 13 30 13H48"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  );
}
