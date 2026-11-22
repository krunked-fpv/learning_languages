import type { LanguageCode } from '../types/contracts';

export function FlagIcon({
  language,
  size = 28,
  className = '',
}: {
  language: LanguageCode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={Math.round((size * 2) / 3)}
      viewBox="0 0 36 24"
      className={className}
      aria-label={`${language} flag`}
    >
      <rect width="36" height="24" rx="4" fill="#CBD5E1" />
    </svg>
  );
}
