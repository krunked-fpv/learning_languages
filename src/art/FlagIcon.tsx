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
};

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
