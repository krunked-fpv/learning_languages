import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCompactViewport } from '../lesson/lessonHelpers';

export interface PopToastItem {
  id: string;
  label: string;
  tone: 'xp' | 'combo' | 'accent' | 'bonus';
}

const CONFETTI_COLORS = [
  '#FBBF24',
  '#F43F5E',
  '#2563EB',
  '#10B981',
  '#A855F7',
  '#FB923C',
] as const;

interface ParticleSpec {
  id: number;
  startX: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  size: number;
  delay: number;
  isStar: boolean;
}

function buildParticles(count: number): ParticleSpec[] {
  const out: ParticleSpec[] = [];
  for (let i = 0; i < count; i++) {
    const angle = ((i / count) * Math.PI * 1.4) - Math.PI * 0.7;
    const dist = 110 + (i % 5) * 44;
    out.push({
      id: i,
      startX: 15 + ((i * 19) % 70),
      dx: Math.sin(angle) * dist,
      dy: -Math.abs(Math.cos(angle) * 140) + 180 + (i % 4) * 35,
      rot: (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 90),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + (i % 4) * 2,
      delay: (i % 6) * 0.04,
      isStar: i % 3 === 0,
    });
  }
  return out;
}

const MEDIUM_PARTICLES = buildParticles(18);
const GRAND_PARTICLES = buildParticles(34);

export function ConfettiBurst({
  active,
  intensity = 'medium',
}: {
  active: boolean;
  intensity?: 'medium' | 'grand';
}) {
  if (!active) return null;
  const particles = intensity === 'grand' ? GRAND_PARTICLES : MEDIUM_PARTICLES;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 85,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            scale: 0.4,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            x: p.dx,
            y: p.dy,
            scale: [0.6, 1.15, 0.9],
            rotate: p.rot,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: intensity === 'grand' ? 1.35 : 0.95,
            delay: p.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.startX}%`,
            top: '28%',
            width: p.size,
            height: p.isStar ? p.size : p.size * 0.65,
            borderRadius: p.isStar ? 999 : 3,
            background: p.color,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

const TOAST_TONE_STYLE: Record<
  PopToastItem['tone'],
  { bg: string; border: string; text: string }
> = {
  xp: { bg: '#EEF2FF', border: '#4F46E5', text: '#312E81' },
  combo: { bg: '#FFF7ED', border: '#EA580C', text: '#9A3412' },
  accent: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
  bonus: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
};

export function FloatingPopToast({ items }: { items: readonly PopToastItem[] }) {
  const compact = useCompactViewport();
  const visibleItems = compact ? items.slice(-1) : items;

  return (
    <div
      aria-hidden="true"
      className={`floating-pop-toast-stack ${compact ? 'is-compact' : ''}`}
      style={{
        position: 'fixed',
        top: compact ? 10 : 66,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        pointerEvents: 'none',
        zIndex: 82,
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <AnimatePresence>
        {visibleItems.map((item) => {
          const palette = TOAST_TONE_STYLE[item.tone];
          return (
            <motion.div
              key={item.id}
              className="floating-pop-toast-pill"
              initial={{ opacity: 0, y: compact ? 6 : 14, scale: compact ? 0.92 : 0.78 }}
              animate={{ opacity: 1, y: compact ? 0 : -10, scale: compact ? 1 : 1.04 }}
              exit={{ opacity: 0, y: compact ? -10 : -28, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{
                padding: compact ? '3px 10px' : '6px 14px',
                borderRadius: 999,
                background: palette.bg,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: compact ? 3 : 4,
                borderStyle: 'solid',
                borderColor: palette.border,
                color: palette.text,
                fontWeight: 900,
                fontSize: compact ? '0.76rem' : '0.88rem',
                lineHeight: 1.2,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.14)',
                whiteSpace: 'nowrap',
                willChange: 'transform, opacity',
              }}
            >
              {item.label}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function CountUpTicker({
  target,
  durationMs = 520,
}: {
  target: number;
  durationMs?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return <>{value}</>;
}
