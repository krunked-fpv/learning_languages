import { useId } from 'react';
import { isAdultLanguage, type IllustrationKey, type LanguageCode } from '../types/contracts';
import { resolveAdultSceneRenderer } from './vocab/adultOverrides';
import type { SceneRenderer } from './vocab/shared';
import { UNIT1_SCENES } from './vocab/unit1Greetings';
import { UNIT2_SCENES } from './vocab/unit2Treats';
import { UNIT3_SCENES } from './vocab/unit3Nature';
import { UNIT4_SCENES } from './vocab/unit4FamilyColors';
import { UNIT5_SCENES } from './vocab/unit5Expedition';
import { UNIT6_TO_8_SCENES } from './vocab/unit6to8Extras';
import { UNIT9_TO_12_SCENES } from './vocab/unit9to12Intermediate';
import { UNIT13_TO_16_SCENES } from './vocab/unit13to16Mastery';

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
  ...UNIT6_TO_8_SCENES,
  ...UNIT9_TO_12_SCENES,
  ...UNIT13_TO_16_SCENES,
};

const STICKER_BACKGROUNDS: Record<
  LanguageCode | 'default',
  { top: string; bottom: string; ring: string }
> = {
  es: { top: '#FFF7ED', bottom: '#FFEDD5', ring: '#FDBA74' },
  fr: { top: '#EFF6FF', bottom: '#E0E7FF', ring: '#93C5FD' },
  de: { top: '#FFFBEB', bottom: '#FEF3C7', ring: '#FCD34D' },
  it: { top: '#ECFDF5', bottom: '#D1FAE5', ring: '#6EE7B7' },
  pt: { top: '#F0FDFA', bottom: '#CCFBF1', ring: '#5EEAD4' },
  en: { top: '#EFF6FF', bottom: '#DBEAFE', ring: '#60A5FA' },
  zh: { top: '#FEF2F2', bottom: '#FFEDD5', ring: '#FCA5A5' },
  ja: { top: '#FDF2F8', bottom: '#FCE7F3', ring: '#F9A8D4' },
  hi: { top: '#FFF7ED', bottom: '#FEF3C7', ring: '#FDBA74' },
  bn: { top: '#ECFDF5', bottom: '#D1FAE5', ring: '#34D399' },
  ar: { top: '#ECFDF5', bottom: '#FEF9C3', ring: '#6EE7B7' },
  arz: { top: '#F0F9FF', bottom: '#FEF3C7', ring: '#7DD3FC' },
  ru: { top: '#EEF2FF', bottom: '#E0E7FF', ring: '#A5B4FC' },
  id: { top: '#ECFEFF', bottom: '#CFFAFE', ring: '#67E8F9' },
  vi: { top: '#FFF1F2', bottom: '#FFE4E6', ring: '#FDA4AF' },
  sw: { top: '#FFFBEB', bottom: '#E0F2FE', ring: '#FBBF24' },
  ebonics: { top: '#F5F3FF', bottom: '#FEF3C7', ring: '#8B5CF6' },
  suburban: { top: '#F0F9FF', bottom: '#FFEDD5', ring: '#0EA5E9' },
  corp_trades: { top: '#F0FDFA', bottom: '#FEF3C7', ring: '#0F766E' },
  midwest_northeast: { top: '#EFF6FF', bottom: '#FEE2E2', ring: '#B91C1C' },
  south_genz: { top: '#FEF3C7', bottom: '#FAE8FF', ring: '#C026D3' },
  cali_country: { top: '#ECFDF5', bottom: '#FFEDD5', ring: '#059669' },
  stoner_tactical: { top: '#F7FEE7', bottom: '#E0E7FF', ring: '#4D7C0F' },
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
  const baseScene = VOCAB_ILLUSTRATIONS[illustrationKey];
  const renderScene =
    language && isAdultLanguage(language)
      ? resolveAdultSceneRenderer(illustrationKey, language, baseScene)
      : baseScene;

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
