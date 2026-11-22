import type { IllustrationKey, LanguageCode } from '../types/contracts';

export function VocabIllustration({
  illustrationKey,
  size = 120,
  className = '',
}: {
  illustrationKey: IllustrationKey;
  language?: LanguageCode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      aria-label={illustrationKey}
    >
      <rect x="8" y="8" width="104" height="104" rx="24" fill="#EFF6FF" />
    </svg>
  );
}
