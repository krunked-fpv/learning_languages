import { motion, useReducedMotion } from 'framer-motion';
import type { CosmeticId } from '../../types/contracts';

type ThemeKey = CosmeticId | 'default';

const DARK_THEMES = new Set<ThemeKey>([
  'theme_cosmic_galaxy',
  'theme_aurora_borealis',
  'theme_starlight_indigo',
  'theme_royal_velvet',
  'theme_emerald_rainforest',
  'theme_neon_night_market',
  'theme_laureate_imperial',
]);

interface StarSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  tint: string;
}

function buildStars(theme: ThemeKey): StarSpec[] {
  const palette =
    theme === 'theme_cosmic_galaxy'
      ? ['#f8fafc', '#38bdf8', '#c084fc', '#fde047']
      : theme === 'theme_aurora_borealis'
        ? ['#ecfdf5', '#34d399', '#38bdf8', '#a78bfa']
        : theme === 'theme_royal_velvet'
          ? ['#fefce8', '#fbbf24', '#e879f9', '#fde68a']
          : theme === 'theme_starlight_indigo'
            ? ['#f8fafc', '#a5b4fc', '#fde047', '#93c5fd']
            : theme === 'theme_emerald_rainforest'
              ? ['#ecfdf5', '#34d399', '#fbbf24', '#6ee7b7']
              : theme === 'theme_neon_night_market'
                ? ['#f8fafc', '#ec4899', '#22d3ee', '#facc15']
                : theme === 'theme_laureate_imperial'
                  ? ['#fefce8', '#fbbf24', '#f43f5e', '#93c5fd']
                  : theme === 'theme_kyoto_matcha'
                    ? ['#ffffff', '#bef264', '#fde68a', '#86efac']
                    : theme === 'theme_sahara_mirage'
                      ? ['#ffffff', '#fde68a', '#fdba74', '#99f6e4']
                      : theme === 'theme_nordic_fjord'
                        ? ['#ffffff', '#bae6fd', '#e0f2fe', '#cbd5e1']
                        : ['#ffffff', '#fde68a', '#bae6fd', '#fbcfe8'];

  const count = DARK_THEMES.has(theme) ? 28 : 14;
  const out: StarSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      x: ((i * 37 + 11) % 96) + 2,
      y: ((i * 53 + 7) % 92) + 4,
      size: DARK_THEMES.has(theme) ? (i % 4 === 0 ? 4 : 2.5) : 5 + (i % 3) * 2.5,
      delay: (i % 7) * 0.5,
      duration: 3.6 + (i % 5) * 0.6,
      tint: palette[i % palette.length],
    });
  }
  return out;
}

export function AmbientBackdrop({ theme = 'default' }: { theme?: ThemeKey }) {
  const isDark = DARK_THEMES.has(theme);
  const reduceMotion = useReducedMotion();
  const stars = buildStars(theme);

  const nebulaGlowA =
    theme === 'theme_cosmic_galaxy'
      ? 'rgba(192, 132, 252, 0.24)'
      : theme === 'theme_aurora_borealis'
        ? 'rgba(52, 211, 153, 0.24)'
        : theme === 'theme_royal_velvet'
          ? 'rgba(251, 191, 36, 0.16)'
          : theme === 'theme_starlight_indigo'
            ? 'rgba(129, 140, 248, 0.22)'
            : theme === 'theme_emerald_rainforest'
              ? 'rgba(52, 211, 153, 0.22)'
              : theme === 'theme_neon_night_market'
                ? 'rgba(236, 72, 153, 0.22)'
                : theme === 'theme_laureate_imperial'
                  ? 'rgba(245, 158, 11, 0.2)'
                  : theme === 'theme_candy_sakura'
                    ? 'rgba(244, 114, 182, 0.18)'
                    : theme === 'theme_ocean_lagoon'
                      ? 'rgba(6, 182, 212, 0.18)'
                      : theme === 'theme_alpine_meadow'
                        ? 'rgba(52, 211, 153, 0.16)'
                        : theme === 'theme_kyoto_matcha'
                          ? 'rgba(101, 163, 13, 0.16)'
                          : theme === 'theme_sahara_mirage'
                            ? 'rgba(245, 158, 11, 0.18)'
                            : theme === 'theme_nordic_fjord'
                              ? 'rgba(14, 165, 233, 0.16)'
                              : 'rgba(251, 191, 36, 0.14)';

  const nebulaGlowB =
    theme === 'theme_cosmic_galaxy'
      ? 'rgba(56, 189, 248, 0.22)'
      : theme === 'theme_aurora_borealis'
        ? 'rgba(139, 92, 246, 0.22)'
        : theme === 'theme_royal_velvet'
          ? 'rgba(217, 70, 239, 0.2)'
          : theme === 'theme_starlight_indigo'
            ? 'rgba(250, 204, 21, 0.14)'
            : theme === 'theme_emerald_rainforest'
              ? 'rgba(251, 191, 36, 0.16)'
              : theme === 'theme_neon_night_market'
                ? 'rgba(34, 211, 238, 0.22)'
                : theme === 'theme_laureate_imperial'
                  ? 'rgba(244, 63, 94, 0.18)'
                  : theme === 'theme_kyoto_matcha'
                    ? 'rgba(217, 119, 6, 0.12)'
                    : theme === 'theme_sahara_mirage'
                      ? 'rgba(13, 148, 136, 0.14)'
                      : 'rgba(96, 165, 250, 0.14)';

  return (
    <div
      aria-hidden="true"
      data-backdrop-theme={theme}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Ambient Nebula / Sunlit Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-12%',
          left: '-8%',
          width: '48vw',
          height: '48vw',
          maxWidth: 520,
          maxHeight: 520,
          borderRadius: '999px',
          background: `radial-gradient(circle, ${nebulaGlowA} 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-14%',
          right: '-10%',
          width: '52vw',
          height: '52vw',
          maxWidth: 560,
          maxHeight: 560,
          borderRadius: '999px',
          background: `radial-gradient(circle, ${nebulaGlowB} 0%, transparent 70%)`,
          filter: 'blur(24px)',
        }}
      />

      {/* Twinkling Stars (Dark Themes) or Soft Sunlit Dust Motes (Light Themes) */}
      {stars.map((s) => (
        <motion.div
          key={`${theme}-${s.id}`}
          initial={{ opacity: isDark ? 0.35 : 0.28, scale: 0.92 }}
          animate={
            reduceMotion
              ? { opacity: isDark ? 0.45 : 0.3, scale: 1, y: 0 }
              : {
                  opacity: isDark ? [0.28, 0.85, 0.32] : [0.2, 0.5, 0.2],
                  scale: isDark ? [0.9, 1.15, 0.9] : [0.94, 1.08, 0.94],
                  y: isDark ? 0 : [0, -3.5, 0],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: s.duration,
                  delay: s.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: 999,
            background: s.tint,
            boxShadow: isDark
              ? `0 0 ${s.size * 2}px ${s.tint}`
              : `0 0 ${s.size * 1.6}px var(--lantern-glow, #ffd48a)`,
            willChange: reduceMotion ? undefined : 'transform, opacity',
          }}
        />
      ))}

      {/* Occasional Shooting Star on Dark Cosmic Themes */}
      {isDark && !reduceMotion ? (
        <motion.div
          initial={{ x: '-15vw', y: '10vh', opacity: 0 }}
          animate={{
            x: ['-15vw', '115vw'],
            y: ['10vh', '38vh'],
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            repeatDelay: 8.5,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 84,
            height: 2,
            borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, var(--lantern-glow, #ffd48a), #fff8e7)',
            transform: 'rotate(14deg)',
            willChange: 'transform, opacity',
          }}
        />
      ) : null}
    </div>
  );
}
