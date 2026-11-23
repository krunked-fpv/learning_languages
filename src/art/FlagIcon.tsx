import { useId } from 'react';
import type { LanguageCode } from '../types/contracts';

export interface FlagIconProps {
  language: LanguageCode;
  size?: number;
  className?: string;
}

const FLAG_LABELS: Record<LanguageCode, string> = {
  es: 'Spanish flag',
  fr: 'French flag',
  de: 'German flag',
  it: 'Italian flag',
  pt: 'Portuguese flag',
  en: 'English flag',
  zh: 'Mandarin Chinese flag',
  ja: 'Japanese flag',
  hi: 'Hindi flag',
  bn: 'Bengali flag',
  ar: 'Modern Standard Arabic flag',
  arz: 'Egyptian Arabic flag',
  ru: 'Russian flag',
  id: 'Indonesian flag',
  vi: 'Vietnamese flag',
  sw: 'Swahili flag',
  ebonics: 'AAVE / Ebonics emblem',
  suburban: 'Suburban Vernacular emblem',
};

function buildStarPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  rotationDeg = 0
): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const rad = (((i * 36 - 90 + rotationDeg) * Math.PI) / 180);
    const x = Math.round((cx + Math.cos(rad) * r) * 100) / 100;
    const y = Math.round((cy + Math.sin(rad) * r) * 100) / 100;
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}

export function FlagIcon({ language, size = 28, className = '' }: FlagIconProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `flag-clip-${uid}`;
  const glossId = `flag-gloss-${uid}`;
  const height = Math.round((size * 2) / 3);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={FLAG_LABELS[language]}
      data-flag={language}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="1" y="1" width="34" height="22" rx="4.5" />
        </clipPath>
        <linearGradient id={glossId} x1="18" y1="1" x2="18" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="72%" stopColor="#0F172A" stopOpacity="0" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`eb-bg-${uid}`} x1="1" y1="1" x2="35" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B0764" />
          <stop offset="55%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <linearGradient id={`sb-sky-${uid}`} x1="18" y1="1" x2="18" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {language === 'es' && (
          <>
            <rect x="1" y="1" width="34" height="5.5" fill="#DC2626" />
            <rect x="1" y="6.5" width="34" height="11" fill="#FACC15" />
            <rect x="1" y="17.5" width="34" height="5.5" fill="#DC2626" />
            {/* Spanish Royal Crest detail */}
            <g transform="translate(8.2, 7.6)">
              {/* Crown */}
              <path
                d="M1.4 2.2L2.1 0.8L3.4 1.6L4.4 0.5L5.4 1.6L6.7 0.8L7.4 2.2Z"
                fill="#B91C1C"
                stroke="#92400E"
                strokeWidth="0.35"
              />
              <rect x="1.5" y="2.1" width="5.8" height="0.7" rx="0.3" fill="#F59E0B" />
              {/* Pillars of Hercules */}
              <rect x="0.3" y="3.2" width="0.9" height="4.8" rx="0.25" fill="#E2E8F0" stroke="#475569" strokeWidth="0.25" />
              <rect x="0.1" y="2.8" width="1.3" height="0.5" rx="0.2" fill="#F59E0B" />
              <rect x="7.6" y="3.2" width="0.9" height="4.8" rx="0.25" fill="#E2E8F0" stroke="#475569" strokeWidth="0.25" />
              <rect x="7.4" y="2.8" width="1.3" height="0.5" rx="0.2" fill="#F59E0B" />
              {/* Quartered Shield */}
              <rect x="1.9" y="2.9" width="5" height="5.4" rx="1.6" fill="#FFFFFF" stroke="#78350F" strokeWidth="0.4" />
              <path d="M2.1 3.1H4.4V5.4H2.1Z" fill="#DC2626" />
              <path d="M4.4 3.1H6.7V5.4H4.4Z" fill="#F8FAFC" />
              <path d="M2.1 5.4H4.4V7.9C3.1 7.9 2.1 6.9 2.1 5.4Z" fill="#F59E0B" />
              <path d="M4.4 5.4H6.7C6.7 6.9 5.7 7.9 4.4 7.9Z" fill="#B91C1C" />
              <ellipse cx="4.4" cy="5.4" rx="0.85" ry="1.05" fill="#1D4ED8" stroke="#FDE047" strokeWidth="0.25" />
            </g>
          </>
        )}

        {language === 'fr' && (
          <>
            <rect x="1" y="1" width="11.4" height="22" fill="#1D4ED8" />
            <rect x="12.3" y="1" width="11.4" height="22" fill="#F8FAFC" />
            <rect x="23.6" y="1" width="11.4" height="22" fill="#E11D48" />
          </>
        )}

        {language === 'de' && (
          <>
            <rect x="1" y="1" width="34" height="7.4" fill="#111827" />
            <rect x="1" y="8.3" width="34" height="7.4" fill="#DC2626" />
            <rect x="1" y="15.6" width="34" height="7.4" fill="#FACC15" />
          </>
        )}

        {language === 'it' && (
          <>
            <rect x="1" y="1" width="11.4" height="22" fill="#16A34A" />
            <rect x="12.3" y="1" width="11.4" height="22" fill="#F8FAFC" />
            <rect x="23.6" y="1" width="11.4" height="22" fill="#DC2626" />
          </>
        )}

        {language === 'en' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#012169" />
            <path d="M1 1L35 23M35 1L1 23" stroke="#FFFFFF" strokeWidth="4.4" />
            <path d="M0.6 1.6L17.6 12.6" stroke="#C8102E" strokeWidth="1.45" />
            <path d="M18.4 11.4L35.4 22.4" stroke="#C8102E" strokeWidth="1.45" />
            <path d="M34.6 0.4L17.6 11.4" stroke="#C8102E" strokeWidth="1.45" />
            <path d="M18.4 12.6L1.4 23.6" stroke="#C8102E" strokeWidth="1.45" />
            <path d="M18 1V23M1 12H35" stroke="#FFFFFF" strokeWidth="6.2" />
            <path d="M18 1V23M1 12H35" stroke="#C8102E" strokeWidth="3.6" />
          </>
        )}

        {language === 'pt' && (
          <>
            <rect x="1" y="1" width="13.6" height="22" fill="#046A38" />
            <rect x="14.6" y="1" width="20.4" height="22" fill="#DA291C" />
            {/* Golden Armillary Sphere */}
            <circle cx="14.6" cy="12" r="4.8" stroke="#FACC15" strokeWidth="0.95" />
            <ellipse cx="14.6" cy="12" rx="4.5" ry="2.0" stroke="#FACC15" strokeWidth="0.65" />
            <line x1="14.6" y1="7.3" x2="14.6" y2="16.7" stroke="#FACC15" strokeWidth="0.65" />
            <line x1="10.8" y1="9.2" x2="18.4" y2="14.8" stroke="#FACC15" strokeWidth="0.65" />
            {/* Portuguese Shield */}
            <path
              d="M12.2 9.4H17V12.5C17 14 15.9 15 14.6 15.4C13.3 15 12.2 14 12.2 12.5Z"
              fill="#DA291C"
              stroke="#FACC15"
              strokeWidth="0.45"
            />
            <path
              d="M13.1 10.3H16.1V12.4C16.1 13.3 15.4 14 14.6 14.3C13.8 14 13.1 13.3 13.1 12.4Z"
              fill="#FFFFFF"
            />
            <circle cx="14.6" cy="12.1" r="0.38" fill="#1D4ED8" />
            <circle cx="13.8" cy="12.1" r="0.35" fill="#1D4ED8" />
            <circle cx="15.4" cy="12.1" r="0.35" fill="#1D4ED8" />
            <circle cx="14.6" cy="11.2" r="0.35" fill="#1D4ED8" />
            <circle cx="14.6" cy="13.0" r="0.35" fill="#1D4ED8" />
          </>
        )}

        {language === 'zh' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#DE2910" />
            <polygon points={buildStarPoints(6.6, 6.6, 2.9, 1.15)} fill="#FFDE00" />
            <polygon points={buildStarPoints(11.3, 3.6, 1.05, 0.42, 24)} fill="#FFDE00" />
            <polygon points={buildStarPoints(12.9, 5.7, 1.05, 0.42, 45)} fill="#FFDE00" />
            <polygon points={buildStarPoints(12.9, 8.6, 1.05, 0.42, 18)} fill="#FFDE00" />
            <polygon points={buildStarPoints(11.3, 10.8, 1.05, 0.42, 32)} fill="#FFDE00" />
          </>
        )}

        {language === 'ja' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#FFFFFF" />
            <circle cx="18" cy="12" r="6.2" fill="#BC002D" />
          </>
        )}

        {language === 'hi' && (
          <>
            <rect x="1" y="1" width="34" height="7.35" fill="#FF9933" />
            <rect x="1" y="8.35" width="34" height="7.3" fill="#FFFFFF" />
            <rect x="1" y="15.65" width="34" height="7.35" fill="#138808" />
            <circle cx="18" cy="12" r="3.05" stroke="#000080" strokeWidth="0.65" />
            <circle cx="18" cy="12" r="0.6" fill="#000080" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1="18"
                  y1="12"
                  x2={Math.round((18 + Math.cos(rad) * 2.9) * 100) / 100}
                  y2={Math.round((12 + Math.sin(rad) * 2.9) * 100) / 100}
                  stroke="#000080"
                  strokeWidth="0.34"
                />
              );
            })}
          </>
        )}

        {language === 'bn' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#006A4E" />
            <circle cx="16.2" cy="12" r="6.4" fill="#F42A41" />
          </>
        )}

        {language === 'ar' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#047857" />
            {/* Desert-gold hoist border & geometric inner frame */}
            <rect x="1" y="1" width="4.4" height="22" fill="#D97706" />
            <line x1="5.4" y1="1" x2="5.4" y2="23" stroke="#FDE047" strokeWidth="0.65" />
            <rect
              x="7.2"
              y="3"
              width="25.8"
              height="18"
              rx="2.4"
              stroke="#F59E0B"
              strokeOpacity="0.6"
              strokeWidth="0.65"
            />
            {/* Desert-gold Crescent & 8-Point Rub el Hizb Star */}
            <path
              d="M20.2 6.8A5.4 5.4 0 1 0 20.2 17.2A4.3 4.3 0 1 1 20.2 6.8Z"
              fill="#FDE047"
            />
            <rect
              x="20.4"
              y="9.8"
              width="4.4"
              height="4.4"
              fill="#FACC15"
              stroke="#92400E"
              strokeWidth="0.3"
            />
            <rect
              x="20.4"
              y="9.8"
              width="4.4"
              height="4.4"
              transform="rotate(45 22.6 12)"
              fill="#FACC15"
              stroke="#92400E"
              strokeWidth="0.3"
            />
            <circle cx="22.6" cy="12" r="1.05" fill="#047857" />
          </>
        )}

        {language === 'arz' && (
          <>
            <rect x="1" y="1" width="34" height="7.35" fill="#CE1126" />
            <rect x="1" y="8.35" width="34" height="7.3" fill="#FFFFFF" />
            <rect x="1" y="15.65" width="34" height="7.35" fill="#111827" />
            {/* Golden Eagle of Saladin centerpiece */}
            <path
              d="M18 10.6L14.1 9.1L15.1 12.2L16.8 13.1H19.2L20.9 12.2L21.9 9.1Z"
              fill="#D97706"
              stroke="#92400E"
              strokeWidth="0.3"
              strokeLinejoin="round"
            />
            <path d="M17.2 9.2C17.2 8.5 18.2 8.4 18.5 9.1L18.6 10.4H17.4Z" fill="#F59E0B" />
            <path d="M17.1 13.1L16.5 14.4H19.5L18.9 13.1Z" fill="#D97706" />
            <rect x="15.6" y="14.3" width="4.8" height="0.85" rx="0.4" fill="#B45309" />
            <rect
              x="17.2"
              y="10.4"
              width="1.6"
              height="2.4"
              rx="0.5"
              fill="#FEF08A"
              stroke="#92400E"
              strokeWidth="0.28"
            />
          </>
        )}

        {language === 'ru' && (
          <>
            <rect x="1" y="1" width="34" height="7.35" fill="#F8FAFC" />
            <rect x="1" y="8.35" width="34" height="7.3" fill="#0039A6" />
            <rect x="1" y="15.65" width="34" height="7.35" fill="#D52B1E" />
          </>
        )}

        {language === 'id' && (
          <>
            <rect x="1" y="1" width="34" height="11" fill="#CE1126" />
            <rect x="1" y="12" width="34" height="11" fill="#F8FAFC" />
            <line x1="1" y1="12" x2="35" y2="12" stroke="#E2E8F0" strokeWidth="0.7" />
          </>
        )}

        {language === 'vi' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill="#DA251D" />
            <polygon points={buildStarPoints(18, 12, 6.4, 2.48)} fill="#FFCD00" />
          </>
        )}

        {language === 'sw' && (
          <>
            <polygon points="1,1 35,1 1,23" fill="#16A34A" />
            <polygon points="35,1 35,23 1,23" fill="#0284C7" />
            <line x1="1" y1="23" x2="35" y2="1" stroke="#FACC15" strokeWidth="8.2" />
            <line x1="1" y1="23" x2="35" y2="1" stroke="#111827" strokeWidth="5.2" />
            {/* Subtle Golden Coastal Dhow & Compass Shield */}
            <circle cx="7.8" cy="6.8" r="3.6" fill="#064E3B" stroke="#FACC15" strokeWidth="0.7" />
            <path d="M5.8 8.1H9.8L9.1 9.0H6.5Z" fill="#FACC15" />
            <path d="M7.9 4.2L9.6 7.5H6.2Z" fill="#FEF08A" />
          </>
        )}

        {language === 'ebonics' && (
          <>
            <rect x="1" y="1" width="34" height="22" fill={`url(#eb-bg-${uid})`} />
            {/* Twilight gold horizon ribbon & starlight dots */}
            <path d="M1 18.2L35 15V23H1Z" fill="#7C3AED" opacity="0.65" />
            <line x1="1" y1="18.2" x2="35" y2="15" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.85" />
            <circle cx="5.2" cy="4.2" r="0.8" fill="#FDE047" />
            <circle cx="31.8" cy="4.6" r="0.9" fill="#FDE047" />
            <circle cx="15.2" cy="3.8" r="0.55" fill="#FEF08A" />
            {/* Gold-labeled Twilight Vinyl Record */}
            <circle cx="10.2" cy="12" r="7.1" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.65" />
            <circle cx="10.2" cy="12" r="5.3" stroke="#475569" strokeWidth="0.45" />
            <circle cx="10.2" cy="12" r="3.9" stroke="#475569" strokeWidth="0.4" />
            <circle cx="10.2" cy="12" r="2.4" fill="#FACC15" stroke="#92400E" strokeWidth="0.35" />
            <circle cx="10.2" cy="12" r="0.65" fill="#0F172A" />
            <path
              d="M6.3 8.1A5.4 5.4 0 0 1 11.7 6.8"
              stroke="#FFFFFF"
              strokeOpacity="0.38"
              strokeWidth="0.75"
              strokeLinecap="round"
            />
            {/* Gold-Trimmed Retro Boombox */}
            <path
              d="M19.8 6.8V4.8C19.8 4.2 20.2 3.8 20.8 3.8H27.2C27.8 3.8 28.2 4.2 28.2 4.8V6.8"
              stroke="#FACC15"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <rect
              x="16.4"
              y="6.8"
              width="15.2"
              height="10.6"
              rx="1.8"
              fill="#1E1B4B"
              stroke="#F59E0B"
              strokeWidth="0.85"
            />
            <rect x="17.3" y="7.6" width="13.4" height="1.7" rx="0.55" fill="#FDE047" />
            <circle cx="19.7" cy="13.4" r="2.55" fill="#0F172A" stroke="#FBBF24" strokeWidth="0.65" />
            <circle cx="19.7" cy="13.4" r="1" fill="#F59E0B" />
            <circle cx="28.3" cy="13.4" r="2.55" fill="#0F172A" stroke="#FBBF24" strokeWidth="0.65" />
            <circle cx="28.3" cy="13.4" r="1" fill="#F59E0B" />
            <rect x="22.8" y="11" width="2.4" height="3.8" rx="0.5" fill="#8B5CF6" stroke="#FDE047" strokeWidth="0.38" />
            <circle cx="24" cy="12.9" r="0.55" fill="#FEF08A" />
          </>
        )}

        {language === 'suburban' && (
          <>
            {/* Sky-blue patio sky & coral horizon sun */}
            <rect x="1" y="1" width="34" height="13.2" fill={`url(#sb-sky-${uid})`} />
            <circle cx="6.8" cy="5.8" r="2.6" fill="#FB923C" />
            <circle cx="6.8" cy="5.8" r="1.5" fill="#FDE047" />
            <ellipse cx="14.2" cy="5.2" rx="3.1" ry="1.3" fill="#FFFFFF" opacity="0.85" />
            <ellipse cx="16.2" cy="4.7" rx="2" ry="1.1" fill="#FFFFFF" opacity="0.85" />
            {/* Manicured alternating lawn-stripes */}
            <rect x="1" y="13.5" width="34" height="9.5" fill="#22C55E" />
            {[1, 9, 17, 25, 33].map((x) => (
              <polygon
                key={x}
                points={`${x},13.5 ${x + 4.2},13.5 ${x + 1.4},23 ${x - 2.8},23`}
                fill="#16A34A"
              />
            ))}
            <line x1="1" y1="13.5" x2="35" y2="13.5" stroke="#FB923C" strokeWidth="0.9" />
            {/* Crisp white picket fence along left lawn */}
            <rect x="1" y="11.2" width="15.5" height="1.1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.2" />
            {[2.2, 5.4, 8.6, 11.8, 15].map((px) => (
              <path
                key={px}
                d={`M${px} 14V9.4L${px + 0.9} 8.2L${px + 1.8} 9.4V14Z`}
                fill="#FFFFFF"
                stroke="#64748B"
                strokeWidth="0.28"
              />
            ))}
            {/* Coral Kettle Grill & curling smoke wisps */}
            <path
              d="M27.2 7.2C26.5 5.6 28 4.4 27.3 2.9M29.1 8.1C28.6 6.7 29.8 5.7 29.2 4.3"
              stroke="#FFFFFF"
              strokeOpacity="0.88"
              strokeWidth="0.85"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="22.4" y1="17.8" x2="21.4" y2="21.6" stroke="#E2E8F0" strokeWidth="0.95" strokeLinecap="round" />
            <line x1="26.6" y1="17.8" x2="27.6" y2="21.6" stroke="#E2E8F0" strokeWidth="0.95" strokeLinecap="round" />
            <line x1="24.5" y1="18.2" x2="24.5" y2="21.8" stroke="#CBD5E1" strokeWidth="0.85" strokeLinecap="round" />
            <circle cx="21.2" cy="21.5" r="1.05" fill="#1E293B" stroke="#E2E8F0" strokeWidth="0.3" />
            <path
              d="M19.8 14.1H29.2C29.2 17.2 27.1 18.8 24.5 18.8C21.9 18.8 19.8 17.2 19.8 14.1Z"
              fill="#EA580C"
              stroke="#0F172A"
              strokeWidth="0.55"
            />
            <path
              d="M19.6 13.8C19.6 10.5 21.8 8.9 24.5 8.9C27.2 8.9 29.4 10.5 29.4 13.8Z"
              fill="#F97316"
              stroke="#0F172A"
              strokeWidth="0.55"
            />
            <line x1="19.3" y1="13.9" x2="29.7" y2="13.9" stroke="#F8FAFC" strokeWidth="0.75" />
            <rect x="23.2" y="7.5" width="2.6" height="1.3" rx="0.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.38" />
          </>
        )}

        {/* Glossy toy-craft sheen + top bevel highlight */}
        <rect x="1" y="1" width="34" height="22" fill={`url(#${glossId})`} />
        <path
          d="M2.5 5.2C2.5 3.1 4.1 2 6.2 2H29.8C31.9 2 33.5 3.1 33.5 5.2"
          stroke="#FFFFFF"
          strokeOpacity="0.48"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </g>

      {/* Crisp dark tactile frame */}
      <rect
        x="1"
        y="1"
        width="34"
        height="22"
        rx="4.5"
        stroke="#0F172A"
        strokeWidth="1.6"
      />
    </svg>
  );
}
