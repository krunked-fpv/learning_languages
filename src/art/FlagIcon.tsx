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
  corp_trades: 'Corporate LinkedIn and Blue-Collar Trades split emblem',
  midwest_northeast: 'Midwest Nice and Northeast Direct split emblem',
  south_genz: 'Deep South and Gen-Z split emblem',
  cali_country: 'California Wellness and Appalachian Country split emblem',
  stoner_tactical: 'Skater Chill and Tactical Lawn-Ops split emblem',
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
        <linearGradient id={`ct-corp-${uid}`} x1="1" y1="1" x2="19" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`sg-neon-${uid}`} x1="18" y1="1" x2="35" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B0764" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`cc-holler-${uid}`} x1="20" y1="1" x2="35" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="48%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#451A03" />
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

        {language === 'corp_trades' && (
          <>
            {/* Left Half: Teal/Navy Corporate LinkedIn + Lanyard/Spreadsheet */}
            <polygon points="1,1 20.8,1 15.2,23 1,23" fill={`url(#ct-corp-${uid})`} />
            <path
              d="M1.5 5.2H18M1.5 8.8H17M1.5 12.4H16M7.2 1.5V12.8M12.6 1.5V12.8"
              stroke="#5EEAD4"
              strokeOpacity="0.22"
              strokeWidth="0.45"
            />
            {/* Crisp LinkedIn-style 'in' badge */}
            <rect
              x="3.1"
              y="3.3"
              width="8.4"
              height="8.1"
              rx="1.7"
              fill="#0284C7"
              stroke="#FFFFFF"
              strokeWidth="0.5"
            />
            <circle cx="5.2" cy="5.4" r="0.68" fill="#FFFFFF" />
            <rect x="4.65" y="6.6" width="1.1" height="3.2" rx="0.3" fill="#FFFFFF" />
            <path
              d="M6.8 9.8V6.6H7.8V7.15C8.1 6.7 8.65 6.5 9.25 6.65C9.85 6.8 10.1 7.3 10.1 8.1V9.8H9V8.25C9 7.8 8.8 7.55 8.4 7.55C8 7.55 7.8 7.85 7.8 8.35V9.8Z"
              fill="#FFFFFF"
            />
            {/* Lanyard strap & spreadsheet ID badge */}
            <path
              d="M5.7 11.7L8.1 13.7L10.5 11.7"
              stroke="#38BDF8"
              strokeWidth="0.95"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <rect x="3.4" y="13.5" width="9.4" height="7.4" rx="1.2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.5" />
            <rect x="4.6" y="14.7" width="7" height="1" rx="0.4" fill="#0F766E" />
            <rect x="4.8" y="18.2" width="1.4" height="1.6" rx="0.3" fill="#38BDF8" />
            <rect x="6.9" y="17.2" width="1.4" height="2.6" rx="0.3" fill="#0F766E" />
            <rect x="9" y="16.2" width="1.4" height="3.6" rx="0.3" fill="#10B981" />

            {/* Right Half: Amber Caution Stripes, Wrench & Yellow Hard Hat */}
            <polygon points="20.8,1 35,1 35,23 15.2,23" fill="#1E293B" />
            <polygon points="16.6,17.4 35,17.4 35,23 15.2,23" fill="#F59E0B" />
            {[17.6, 22, 26.4, 30.8].map((sx) => (
              <polygon
                key={sx}
                points={`${sx},17.4 ${sx + 2.2},17.4 ${sx + 0.8},23 ${sx - 1.4},23`}
                fill="#111827"
              />
            ))}
            {/* Yellow Hard Hat */}
            <path
              d="M21.4 9.5C21.4 5.5 24.1 3.6 27.3 3.6C30.5 3.6 33.2 5.5 33.2 9.5Z"
              fill="#FACC15"
              stroke="#0F172A"
              strokeWidth="0.55"
            />
            <rect
              x="26.5"
              y="3.3"
              width="1.6"
              height="4.4"
              rx="0.7"
              fill="#FEF08A"
              stroke="#0F172A"
              strokeWidth="0.35"
            />
            <rect
              x="20.3"
              y="9.3"
              width="13.8"
              height="1.6"
              rx="0.8"
              fill="#EAB308"
              stroke="#0F172A"
              strokeWidth="0.48"
            />
            {/* Chrome Wrench */}
            <g transform="translate(26.5, 14.3) rotate(-22)">
              <rect x="-5.4" y="-1.1" width="9" height="2.2" rx="0.9" fill="#E2E8F0" stroke="#0F172A" strokeWidth="0.45" />
              <path
                d="M2.6 -2.4A2.6 2.6 0 1 1 2.6 2.4L4.2 1.1H2.3V-1.1H4.2Z"
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="0.45"
                strokeLinejoin="round"
              />
            </g>
            {/* Diagonal Split Seam */}
            <line x1="20.8" y1="1" x2="15.2" y2="23" stroke="#FFFFFF" strokeWidth="1.05" />
          </>
        )}

        {language === 'midwest_northeast' && (
          <>
            {/* Left Half: Midwest Pastel Casserole Dish, Pine & Snow Shovel */}
            <polygon points="1,1 19.6,1 16.4,23 1,23" fill="#DBEAFE" />
            <path d="M1 13.5Q9.2 11.2 17.6 13.8L16.4 23H1Z" fill="#F8FAFC" />
            {/* Snow-dusted Pine Tree */}
            <rect x="5" y="10.4" width="1.6" height="2.8" fill="#78350F" />
            <polygon points="5.8,3.2 2.4,8.2 9.2,8.2" fill="#059669" stroke="#0F172A" strokeWidth="0.35" strokeLinejoin="round" />
            <polygon points="5.8,5.6 1.8,11.2 9.8,11.2" fill="#10B981" stroke="#0F172A" strokeWidth="0.35" strokeLinejoin="round" />
            <polygon points="5.8,3.2 4.3,5.4 7.3,5.4" fill="#FFFFFF" />
            {/* Leaning Snow Shovel */}
            <line x1="12.2" y1="4.4" x2="13.8" y2="10.2" stroke="#EF4444" strokeWidth="0.9" strokeLinecap="round" />
            <rect x="12.4" y="9.8" width="3.2" height="2.4" rx="0.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="0.35" />
            {/* Pastel Casserole Dish with Golden Tater-Tot Cheese Crust */}
            <path d="M6.4 13C6.1 12 6.8 11.4 6.5 10.6M9.6 12.8C9.3 11.8 10 11.2 9.7 10.4" stroke="#93C5FD" strokeWidth="0.65" strokeLinecap="round" fill="none" />
            <ellipse cx="8.5" cy="14.9" rx="5.1" ry="1.6" fill="#FDE047" stroke="#D97706" strokeWidth="0.4" />
            <circle cx="6.2" cy="14.6" r="0.65" fill="#F59E0B" />
            <circle cx="8.5" cy="14.4" r="0.7" fill="#F59E0B" />
            <circle cx="10.8" cy="14.6" r="0.65" fill="#F59E0B" />
            <rect x="2.3" y="15.2" width="1.4" height="1.1" rx="0.4" fill="#F43F5E" />
            <rect x="13.3" y="15.2" width="1.4" height="1.1" rx="0.4" fill="#F43F5E" />
            <path d="M3.2 15H13.8L12.8 20.2C12.6 20.9 12 21.3 11.2 21.3H5.8C5 21.3 4.4 20.9 4.2 20.2Z" fill="#FB7185" stroke="#0F172A" strokeWidth="0.5" />

            {/* Right Half: Bright Red/Yellow NYC Taxi, Bodega Cup & Subway Token */}
            <polygon points="19.6,1 35,1 35,23 16.4,23" fill="#B91C1C" />
            <rect x="18" y="1" width="17" height="5" fill="#991B1B" opacity="0.55" />
            {/* Classic NYC Blue & Gold Bodega Coffee Cup */}
            <path d="M20.2 5.4H26L25.2 12.2H21Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.45" strokeLinejoin="round" />
            <rect x="20.6" y="7" width="5" height="3.1" fill="#1D4ED8" />
            <line x1="20.6" y1="6.8" x2="25.6" y2="6.8" stroke="#FACC15" strokeWidth="0.55" />
            <rect x="19.8" y="4.3" width="6.6" height="1.2" rx="0.5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.38" />
            <path d="M22.8 3.6C22.5 2.7 23.4 2.1 23 1.4" stroke="#FDE047" strokeWidth="0.55" strokeLinecap="round" fill="none" />
            {/* Golden Subway Token */}
            <circle cx="30.6" cy="7.5" r="3.2" fill="#FACC15" stroke="#92400E" strokeWidth="0.5" />
            <circle cx="30.6" cy="7.5" r="2.1" fill="#F59E0B" />
            <path d="M29.6 6.4L30.6 7.6L31.6 6.4M30.6 7.6V9" stroke="#78350F" strokeWidth="0.65" strokeLinecap="round" fill="none" />
            {/* Bright Yellow NYC Taxi */}
            <rect x="23.5" y="12.9" width="3.8" height="1.4" rx="0.4" fill="#FEF08A" stroke="#0F172A" strokeWidth="0.35" />
            <path d="M20.2 16.2L22 14H29.4L31.2 16.2H33.5V19.6H18.4V16.2Z" fill="#FACC15" stroke="#0F172A" strokeWidth="0.5" strokeLinejoin="round" />
            <polygon points="22.3,14.5 25.3,14.5 25.3,16.1 21,16.1" fill="#BAE6FD" />
            <polygon points="26,14.5 29.1,14.5 30.3,16.1 26,16.1" fill="#BAE6FD" />
            <rect x="19.6" y="17.2" width="12.6" height="1.1" fill="#111827" />
            {[20.6, 23.2, 25.8, 28.4, 31].map((cx) => (
              <rect key={cx} x={cx} y="17.2" width="1.3" height="1.1" fill="#FFFFFF" />
            ))}
            <circle cx="21.6" cy="20" r="1.7" fill="#0F172A" stroke="#E2E8F0" strokeWidth="0.45" />
            <circle cx="29.8" cy="20" r="1.7" fill="#0F172A" stroke="#E2E8F0" strokeWidth="0.45" />
            {/* Diagonal Split Seam */}
            <line x1="19.6" y1="1" x2="16.4" y2="23" stroke="#FFFFFF" strokeWidth="1.05" />
          </>
        )}

        {language === 'south_genz' && (
          <>
            {/* Left Half: Golden Sweet-Tea Mason Jar + White Porch Column */}
            <polygon points="1,1 19.2,1 16.8,23 1,23" fill="#FEF3C7" />
            <rect x="1" y="18.6" width="17" height="4.4" fill="#D97706" opacity="0.55" />
            {/* White Fluted Porch Column */}
            <rect x="2.1" y="1.4" width="4.4" height="1.6" rx="0.4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.35" />
            <rect x="2.7" y="3" width="3.2" height="16.2" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.35" />
            <line x1="3.7" y1="3.5" x2="3.7" y2="18.8" stroke="#CBD5E1" strokeWidth="0.45" />
            <line x1="4.9" y1="3.5" x2="4.9" y2="18.8" stroke="#CBD5E1" strokeWidth="0.45" />
            <rect x="2" y="19.2" width="4.6" height="2" rx="0.4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.35" />
            {/* Golden Sweet-Tea Mason Jar */}
            <line x1="12.2" y1="7.8" x2="14.6" y2="2.8" stroke="#E11D48" strokeWidth="1.15" strokeLinecap="round" />
            <line x1="12.2" y1="7.8" x2="14.6" y2="2.8" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="1 1.1" strokeLinecap="round" />
            <circle cx="8.6" cy="8.1" r="1.9" fill="#FACC15" stroke="#92400E" strokeWidth="0.38" />
            <rect x="7.4" y="8.4" width="8.2" height="11.2" rx="2.1" fill="#D97706" stroke="#0F172A" strokeWidth="0.52" />
            <rect x="8.2" y="6.8" width="6.6" height="1.8" rx="0.6" fill="#CBD5E1" stroke="#0F172A" strokeWidth="0.4" />
            <rect x="8.6" y="10.8" width="2.5" height="2.5" rx="0.5" transform="rotate(-10 9.8 12)" fill="#FEF08A" opacity="0.82" />
            <rect x="11.8" y="12.4" width="2.4" height="2.4" rx="0.5" transform="rotate(14 13 13.6)" fill="#FEF08A" opacity="0.82" />

            {/* Right Half: Neon-Magenta For-You Lightning & Ring-Light / Skull / Flame */}
            <polygon points="19.2,1 35,1 35,23 16.8,23" fill={`url(#sg-neon-${uid})`} />
            {/* Glowing Ring Light */}
            <circle cx="27.2" cy="8.6" r="5.6" stroke="#EC4899" strokeWidth="2.4" strokeOpacity="0.38" />
            <circle cx="27.2" cy="8.6" r="4.8" stroke="#F0ABFC" strokeWidth="1.2" />
            <circle cx="27.2" cy="8.6" r="4.8" stroke="#FFFFFF" strokeWidth="0.45" />
            {/* Neon For-You Lightning Bolt */}
            <polygon points="27.8,3.6 24.4,9.2 27,9.2 25.6,13.6 30.2,7.6 27.6,7.6" fill="#22D3EE" transform="translate(0.5, 0.4)" />
            <polygon points="27.8,3.6 24.4,9.2 27,9.2 25.6,13.6 30.2,7.6 27.6,7.6" fill="#E879F9" stroke="#FFFFFF" strokeWidth="0.35" strokeLinejoin="round" />
            {/* Laughing Skull & Neon Flame */}
            <g transform="translate(21.8, 17.8)">
              <circle cx="0" cy="-0.4" r="2.7" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.4" />
              <rect x="-1.5" y="1.4" width="3" height="1.6" rx="0.5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.35" />
              <circle cx="-1" cy="-0.3" r="0.65" fill="#0F172A" />
              <circle cx="1" cy="-0.3" r="0.65" fill="#0F172A" />
            </g>
            <g transform="translate(30.4, 18.2)">
              <path d="M0 -4.2C2 -2.2 3 -0.4 2.8 1.4C2.6 2.8 1.5 3.6 0 3.6C-1.5 3.6 -2.6 2.7 -2.6 1.2C-2.6 -0.2 -1.6 -1.4 -0.9 -2.3C-0.5 -1.4 0.1 -1.1 0 -4.2Z" fill="#F43F5E" stroke="#FDE047" strokeWidth="0.35" />
              <path d="M0 -1.2C1 -0.1 1.3 1.1 1.1 2C0.9 2.7 0.5 3 0 3C-0.6 3 -1.1 2.5 -1.1 1.7C-1.1 0.8 -0.5 0 0 -1.2Z" fill="#FEF08A" />
            </g>
            {/* Diagonal Split Seam */}
            <line x1="19.2" y1="1" x2="16.8" y2="23" stroke="#FFFFFF" strokeWidth="1.05" />
          </>
        )}

        {language === 'cali_country' && (
          <>
            {/* Left Half: Emerald Matcha Smoothie & Surfboard Sun */}
            <polygon points="1,1 20,1 16,23 1,23" fill="#ECFDF5" />
            <path d="M1 16.8Q8 15 17 17.2L16 23H1Z" fill="#FEF3C7" />
            {/* California Sun */}
            <circle cx="5.2" cy="5.4" r="2.8" fill="#FACC15" />
            <circle cx="5.2" cy="5.4" r="1.6" fill="#F59E0B" />
            {/* Angled Surfboard */}
            <g transform="translate(5.5, 14.5) rotate(-18)">
              <ellipse cx="0" cy="0" rx="2.4" ry="6.2" fill="#38BDF8" stroke="#0F172A" strokeWidth="0.45" />
              <line x1="0" y1="-5.5" x2="0" y2="5.5" stroke="#F472B6" strokeWidth="0.95" />
            </g>
            {/* Emerald Adaptogen Matcha Smoothie */}
            <line x1="12.6" y1="9" x2="14.2" y2="4.4" stroke="#D97706" strokeWidth="0.95" strokeLinecap="round" />
            <path d="M9 10.6H15.6L14.8 19.8H9.8Z" fill="#10B981" stroke="#0F172A" strokeWidth="0.5" strokeLinejoin="round" />
            <path d="M8.6 10.6C8.6 8.2 16 8.2 16 10.6Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.45" />
            <path d="M10.4 13.5C11.4 12.1 13.2 12.1 14 13.5C13 14.4 11.4 14.4 10.4 13.5Z" fill="#6EE7B7" />

            {/* Right Half: Warm Cedar Holler Cabin, Tailgate & Wrench/Duct-Tape */}
            <polygon points="20,1 35,1 35,23 16,23" fill={`url(#cc-holler-${uid})`} />
            <path d="M18 14L23.5 8.5L29 12.5L35 7.5V23H16Z" fill="#15803D" opacity="0.55" />
            {/* Cedar Holler Cabin */}
            <rect x="29.4" y="3.2" width="1.5" height="3" fill="#78350F" />
            <rect x="22.4" y="6.8" width="9.4" height="5.8" rx="0.5" fill="#92400E" stroke="#0F172A" strokeWidth="0.45" />
            <polygon points="21.4,7 27.1,3.2 32.8,7" fill="#78350F" stroke="#0F172A" strokeWidth="0.45" strokeLinejoin="round" />
            <rect x="24.2" y="8.4" width="2.4" height="2.4" rx="0.3" fill="#FDE047" stroke="#0F172A" strokeWidth="0.32" />
            <rect x="28" y="8.6" width="2.1" height="4" rx="0.3" fill="#451A03" />
            {/* Pickup Tailgate & Duct Tape + Wrench */}
            <rect x="19" y="14.4" width="13.6" height="6.2" rx="1" fill="#EA580C" stroke="#0F172A" strokeWidth="0.5" />
            <rect x="22.8" y="15.3" width="3.6" height="1" rx="0.3" fill="#E2E8F0" />
            <g transform="translate(22.2, 18.8) rotate(-14)">
              <rect x="-2.4" y="-0.7" width="4.4" height="1.4" rx="0.5" fill="#E2E8F0" stroke="#0F172A" strokeWidth="0.35" />
              <circle cx="2" cy="0" r="1.2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.35" />
            </g>
            {/* Duct Tape Roll */}
            <circle cx="29.8" cy="18.2" r="2.9" fill="#E2E8F0" stroke="#0F172A" strokeWidth="0.45" />
            <circle cx="29.8" cy="18.2" r="1.2" fill="#475569" stroke="#0F172A" strokeWidth="0.35" />
            {/* Diagonal Split Seam */}
            <line x1="20" y1="1" x2="16" y2="23" stroke="#FFFFFF" strokeWidth="1.05" />
          </>
        )}

        {language === 'stoner_tactical' && (
          <>
            {/* Left Half: Lime-Green Half-Pipe Skateboard + Chill Cloud Spiral */}
            <polygon points="1,1 19.6,1 16.4,23 1,23" fill="#ECFCCB" />
            {/* Chill Cloud with Spiral */}
            <path
              d="M3.2 8.2C3.2 6.6 4.5 5.4 6.1 5.6C6.9 4 9.3 3.8 10.4 5.2C11.9 5.1 13.2 6.2 13.2 7.7C13.2 9.1 12.1 10.1 10.6 10.1H5.2C4 10.1 3.2 9.3 3.2 8.2Z"
              fill="#FFFFFF"
              stroke="#4D7C0F"
              strokeWidth="0.48"
            />
            <path
              d="M8.3 7.7C8.3 7.1 8.9 6.8 9.3 7.2C9.8 7.7 9.4 8.6 8.5 8.7C7.4 8.8 6.7 7.8 7 6.8C7.4 5.7 8.9 5.4 9.9 6.1"
              stroke="#65A30D"
              strokeWidth="0.6"
              strokeLinecap="round"
              fill="none"
            />
            {/* Half-Pipe Ramp & Lime-Green Skateboard */}
            <path d="M1 12.6C3.5 19.2 8.5 21 16.4 20.8V23H1Z" fill="#14B8A6" stroke="#0F172A" strokeWidth="0.45" />
            <path d="M1 12.6C3.5 19.2 8.5 21 16.4 20.8" fill="none" stroke="#FDE68A" strokeWidth="0.9" />
            <g transform="translate(9.4, 15.6) rotate(-18)">
              <rect x="-5.4" y="-1.1" width="10.8" height="2" rx="1" fill="#84CC16" stroke="#0F172A" strokeWidth="0.45" />
              <circle cx="-3.1" cy="1.5" r="0.95" fill="#EC4899" stroke="#0F172A" strokeWidth="0.32" />
              <circle cx="3.1" cy="1.5" r="0.95" fill="#EC4899" stroke="#0F172A" strokeWidth="0.32" />
            </g>

            {/* Right Half: Indigo Tactical Rangefinder Reticle, Mower Stripes & Clipboard */}
            <polygon points="19.6,1 35,1 35,23 16.4,23" fill="#1E1B4B" />
            {/* Crisp Mower Stripes */}
            <polygon points="17.5,16.2 35,16.2 35,23 16.4,23" fill="#22C55E" />
            {[18.2, 23, 27.8, 32.6].map((mx) => (
              <polygon
                key={mx}
                points={`${mx},16.2 ${mx + 2.4},16.2 ${mx + 0.6},23 ${mx - 1.8},23`}
                fill="#15803D"
              />
            ))}
            {/* Tactical Rangefinder Reticle */}
            <circle cx="28.4" cy="7.4" r="4.1" stroke="#38BDF8" strokeWidth="0.65" />
            <circle cx="28.4" cy="7.4" r="2.2" stroke="#818CF8" strokeWidth="0.45" strokeDasharray="1.2 1.1" />
            <line x1="28.4" y1="2.4" x2="28.4" y2="5.1" stroke="#38BDF8" strokeWidth="0.55" />
            <line x1="28.4" y1="9.7" x2="28.4" y2="12.4" stroke="#38BDF8" strokeWidth="0.55" />
            <line x1="23.4" y1="7.4" x2="26.1" y2="7.4" stroke="#38BDF8" strokeWidth="0.55" />
            <line x1="30.7" y1="7.4" x2="33.4" y2="7.4" stroke="#38BDF8" strokeWidth="0.55" />
            <circle cx="28.4" cy="7.4" r="0.8" fill="#FACC15" />
            {/* Tactical Clipboard */}
            <rect x="19.1" y="10.4" width="7.4" height="9.6" rx="1" fill="#D97706" stroke="#0F172A" strokeWidth="0.45" />
            <rect x="20.1" y="11.8" width="5.4" height="7.2" rx="0.4" fill="#FFFFFF" />
            <rect x="21.3" y="9.8" width="3" height="1.4" rx="0.4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="0.35" />
            <path d="M21 13.7H24.6M21 15.5H24.6M21 17.3H23.8" stroke="#22C55E" strokeWidth="0.7" strokeLinecap="round" />
            {/* Diagonal Split Seam */}
            <line x1="19.6" y1="1" x2="16.4" y2="23" stroke="#FFFFFF" strokeWidth="1.05" />
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
