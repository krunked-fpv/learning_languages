import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LanguageCode } from '../../types/contracts';

type Ambient = 'petals' | 'snow' | 'fireflies' | 'motes';

function ambientFor(language: LanguageCode): Ambient {
  switch (language) {
    case 'ja':
    case 'zh':
    case 'vi':
      return 'petals';
    case 'ru':
    case 'de':
    case 'en':
      return 'snow';
    case 'es':
    case 'pt':
    case 'it':
    case 'hi':
    case 'bn':
    case 'id':
    case 'sw':
      return 'fireflies';
    default:
      return 'motes';
  }
}

const COUNT = 14;
// Deterministic pseudo-random so SSR/tests are stable.
const seeds = Array.from({ length: COUNT }, (_, i) => {
  const a = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const b = Math.sin(i * 78.233 + 1.7) * 24634.6345;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 100, d: 5 + ((i * 7) % 6), s: 0.6 + ((i * 3) % 5) / 5 };
});

/**
 * Shared storybook atmosphere over every regional diorama: warm upper-left key
 * glow, cool lower-right fill, horizon mist, static paper grain and calm ambient
 * life. Pointer-transparent; only transform/opacity animate; reduced-motion = still.
 */
export function AtmosphereLayer({ language }: { language: LanguageCode }) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const kind = ambientFor(language);
  const grain = `atm-grain-${uid}`;
  const glow = `atm-glow-${uid}`;

  return (
    <div
      aria-hidden="true"
      data-atmosphere={kind}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', containerType: 'size' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse 60% 55% at 12% 6%, color-mix(in oklab, var(--key-light, #ffe2a8) 55%, transparent), transparent 70%)',
            'radial-gradient(ellipse 70% 50% at 92% 100%, color-mix(in oklab, var(--ambient-fill, #8a7ad8) 26%, transparent), transparent 70%)',
            'linear-gradient(to top, color-mix(in oklab, var(--paper-base, #fff4dc) 55%, transparent), transparent 38%)',
          ].join(','),
          mixBlendMode: 'soft-light',
        }}
      />
      {/* static paper grain: rendered once, never animated */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 'var(--paper-grain-opacity, 0.22)' as unknown as number, mixBlendMode: 'multiply' }}>
        <defs>
          <filter id={grain} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.29  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0.55 0" />
          </filter>
          <radialGradient id={glow} cx="0.1" cy="0.05" r="0.9">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#4a3426" stopOpacity="0.28" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${grain})`} />
        <rect width="100%" height="100%" fill={`url(#${glow})`} />
      </svg>

      {seeds.map((p, i) => {
        const size = (kind === 'snow' ? 4 : kind === 'petals' ? 8 : 5) * p.s;
        const fall = kind === 'snow' || kind === 'petals';
        const color =
          kind === 'petals'
            ? 'color-mix(in oklab, #ffb3c7 85%, var(--paper-base, #fff))'
            : kind === 'snow'
              ? 'rgba(255,255,255,0.9)'
              : kind === 'fireflies'
                ? 'var(--lantern-glow, #ffd36b)'
                : 'rgba(255,240,205,0.75)';
        return (
          <motion.span
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: fall ? '-4%' : `${p.y}%`,
              width: size,
              height: kind === 'petals' ? size * 0.65 : size,
              borderRadius: kind === 'petals' ? '70% 30% 70% 30%' : '50%',
              background: color,
              boxShadow: kind === 'fireflies' ? `0 0 ${size * 2.4}px ${size * 0.6}px var(--lantern-glow, #ffd36b)` : undefined,
              opacity: reduce ? 0.45 : 0,
              willChange: reduce ? undefined : 'transform, opacity',
            }}
            animate={
              reduce
                ? undefined
                : fall
                  ? { y: ['0cqh', '110cqh'], x: [0, i % 2 ? 26 : -26, 0], rotate: kind === 'petals' ? [0, 140] : 0, opacity: [0, 0.85, 0.85, 0] }
                  : { y: [0, -10, 0], x: [0, i % 2 ? 8 : -8, 0], opacity: [0, 0.9, 0] }
            }
            transition={{ duration: p.d + (fall ? 6 : 0), repeat: Infinity, delay: (i * 0.9) % 6, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}
