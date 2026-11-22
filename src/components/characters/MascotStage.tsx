import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterPose, CompanionId, EquippedCosmetics } from '../../types/contracts';
import { BodyAndArmsLayer, HeadAndExpressionLayer, TailAndBackLayer } from './companionsSvg';
import {
  AuraLayer,
  COMPANION_ANCHORS,
  CapeLayer,
  GlassesLayer,
  HatLayer,
  MASCOT_INK,
  PetLayer,
  PropLayer,
  resolveThemePalette,
} from './cosmeticsSvg';

export interface MascotStageProps {
  companionId: CompanionId;
  pose: CharacterPose;
  equippedCosmetics?: EquippedCosmetics;
  pointerTarget?: { x: number; y: number } | null;
  comboCount?: number;
  size?: number;
  badgeText?: string;
  className?: string;
}

const COMPANION_LABELS: Record<CompanionId, string> = {
  pip: 'Pip the Polyglot Starling',
  mateo: 'Mateo the Axolotl Chef & Guitarist',
  colette: 'Colette the Boulangerie Fox',
  benni: 'Benni the Clockwork Badger',
  luca: 'Luca the Venetian Sea-Otter',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getBodyPoseMotion(pose: CharacterPose) {
  switch (pose) {
    case 'happy':
      return {
        y: [0, -10, 0, -6, 0],
        rotate: [0, -3.2, 3.2, -1.8, 0],
        scaleX: [1.02, 0.975, 1.015, 0.99, 1.02],
        scaleY: [0.975, 1.045, 0.985, 1.025, 0.975],
        transition: { duration: 0.92, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'streak_fire':
      return {
        y: [0, -12, -2, -10, 0],
        rotate: [-2.4, 3.2, -3.2, 2.4, -2.4],
        scaleX: [1.025, 0.97, 1.02, 0.975, 1.025],
        scaleY: [0.99, 1.06, 0.995, 1.05, 0.99],
        transition: { duration: 0.68, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'victory_dance':
      return {
        y: [0, -11, 0, -11, 0],
        rotate: [-6, 6, -6, 6, -6],
        scaleX: [1.025, 0.97, 1.025, 0.97, 1.025],
        scaleY: [0.97, 1.055, 0.97, 1.055, 0.97],
        transition: { duration: 0.88, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'boss_intro':
      return {
        y: [0, -5, 0],
        scaleX: [0.97, 1.03, 1.0],
        scaleY: [0.97, 1.045, 1.01],
        rotate: [0, -2, 1, 0],
        transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'sympathetic':
      return {
        y: [0, 2.8, 0],
        rotate: [-2.2, 0.4, -2.2],
        scaleX: [1.005, 0.995, 1.005],
        scaleY: [0.99, 1.005, 0.99],
        transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'listening':
      return {
        y: [0, -2.4, 0],
        rotate: [2.6, 5, 2.6],
        scaleX: [1, 0.994, 1],
        scaleY: [1, 1.018, 1],
        transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'thinking':
      return {
        y: [0, -2.8, 0],
        rotate: [-3.2, -1.1, -3.2],
        scaleX: [1, 0.994, 1],
        scaleY: [1, 1.016, 1],
        transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'idle':
    default:
      return {
        y: [0, -3.4, 0],
        rotate: [-0.8, 0.8, -0.8],
        scaleX: [1, 0.992, 1],
        scaleY: [1, 1.022, 1],
        transition: { duration: 3.1, repeat: Infinity, ease: 'easeInOut' as const },
      };
  }
}

export function MascotStage({
  companionId,
  pose,
  equippedCosmetics,
  pointerTarget,
  comboCount = 0,
  size = 180,
  badgeText,
  className = '',
}: MascotStageProps) {
  const uid = useId().replace(/:/g, '');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [localPointer, setLocalPointer] = useState<{ x: number; y: number } | null>(null);

  // Natural organic blinking timer with occasional playful double-blink
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cycle = 0;

    const clearPendingBlinks = () => {
      while (timers.length > 0) {
        const t = timers.pop();
        if (t !== undefined) clearTimeout(t);
      }
    };

    const interval = setInterval(() => {
      cycle += 1;
      clearPendingBlinks();
      setIsBlinking(true);
      timers.push(
        setTimeout(() => {
          setIsBlinking(false);
          if (cycle % 3 === 0) {
            timers.push(
              setTimeout(() => {
                setIsBlinking(true);
                timers.push(setTimeout(() => setIsBlinking(false), 115));
              }, 160)
            );
          }
        }, 135)
      );
    }, 3400);

    return () => {
      clearInterval(interval);
      clearPendingBlinks();
    };
  }, []);

  // Compute smooth normalized look vector (-1..1) from pointerTarget or container pointer
  const effectivePointer = pointerTarget !== undefined ? pointerTarget : localPointer;

  const normalizedLook = useMemo(() => {
    if (!effectivePointer) {
      if (pose === 'thinking') return { x: 0.65, y: -0.65 };
      if (pose === 'listening') return { x: -0.25, y: -0.15 };
      return { x: 0, y: 0 };
    }

    const { x, y } = effectivePointer;
    // Detect normalized [-1..1] vectors vs viewport pixel coordinates
    const isNormalized =
      Math.abs(x) <= 1.05 &&
      Math.abs(y) <= 1.05 &&
      (x < 0 || y < 0 || !Number.isInteger(x) || !Number.isInteger(y) || (x === 0 && y === 0));

    if (isNormalized) {
      return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    }

    const rect = stageRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const normX = clamp((x - cx) / Math.max(rect.width, 180), -1, 1);
      const normY = clamp((y - cy) / Math.max(rect.height, 180), -1, 1);
      return { x: normX, y: normY };
    }

    const vw = typeof window !== 'undefined' ? window.innerWidth || 800 : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight || 600 : 600;
    return {
      x: clamp((x - vw / 2) / (vw / 2), -1, 1),
      y: clamp((y - vh / 2) / (vh / 2), -1, 1),
    };
  }, [effectivePointer, pose]);

  const pupilOffset = {
    x: normalizedLook.x * 3.8,
    y: normalizedLook.y * 3.1,
  };

  const headTiltDeg =
    normalizedLook.x * 4.5 +
    (pose === 'listening' ? 6 : pose === 'thinking' ? -5 : pose === 'sympathetic' ? -4 : 0);

  const anchor = COMPANION_ANCHORS[companionId];
  const palette = resolveThemePalette(equippedCosmetics);
  const showSparkleBurst = comboCount >= 3 || pose === 'streak_fire' || pose === 'victory_dance';
  const bodyMotion = getBodyPoseMotion(pose);
  const hasCustomGlasses = Boolean(equippedCosmetics?.glasses);

  const equippedList = [
    equippedCosmetics?.hat,
    equippedCosmetics?.glasses,
    equippedCosmetics?.cape,
    equippedCosmetics?.aura,
    equippedCosmetics?.prop,
    equippedCosmetics?.pet,
    equippedCosmetics?.theme,
  ]
    .filter(Boolean)
    .join(',');

  return (
    <div
      ref={stageRef}
      className={className}
      data-companion={companionId}
      data-pose={pose}
      data-combo={comboCount}
      data-equipped-cosmetics={equippedList || undefined}
      onPointerMove={
        pointerTarget === undefined
          ? (e) => setLocalPointer({ x: e.clientX, y: e.clientY })
          : undefined
      }
      onPointerLeave={pointerTarget === undefined ? () => setLocalPointer(null) : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        userSelect: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${COMPANION_LABELS[companionId]} (${pose})`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={`stage-halo-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.inner} stopOpacity={palette.nebula ? '0.92' : '0.9'} />
            <stop offset="52%" stopColor={palette.mid} stopOpacity={palette.nebula ? '0.58' : '0.6'} />
            <stop offset="80%" stopColor={palette.outer} stopOpacity={palette.nebula ? '0.32' : '0.38'} />
            <stop offset="100%" stopColor={palette.outer} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft themed stage backdrop aura */}
        <circle cx="110" cy="116" r="88" fill={`url(#stage-halo-${uid})`} />

        {/* Subtle orbiting nebula sparkles for Cosmic Galaxy / Aurora / Royal Velvet palettes */}
        {palette.nebula && (
          <motion.g
            data-theme-halo={equippedCosmetics?.theme}
            style={{ originX: '110px', originY: '116px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="110"
              cy="116"
              r="82"
              fill="none"
              stroke={palette.ring}
              strokeWidth="1.4"
              strokeDasharray="5 11"
              opacity="0.52"
            />
            {[
              { x: 46, y: 58, r: 3.4, c: palette.inner },
              { x: 176, y: 64, r: 2.8, c: '#FEF08A' },
              { x: 168, y: 170, r: 3.2, c: palette.ring },
              { x: 52, y: 172, r: 2.6, c: palette.inner },
            ].map((orb, idx) => (
              <circle key={idx} cx={orb.x} cy={orb.y} r={orb.r} fill={orb.c} opacity="0.88" />
            ))}
          </motion.g>
        )}

        {/* Ground contact shadow synchronized with jump & idle breath */}
        <motion.g
          style={{ originX: '110px', originY: '196px' }}
          animate={
            pose === 'happy'
              ? { scaleX: [1, 0.78, 0.98, 0.84, 1], opacity: [0.16, 0.08, 0.15, 0.1, 0.16] }
              : pose === 'streak_fire' || pose === 'victory_dance'
                ? { scaleX: [1, 0.76, 1, 0.76, 1], opacity: [0.17, 0.07, 0.17, 0.07, 0.17] }
                : { scaleX: [1, 0.94, 1], opacity: [0.14, 0.11, 0.14] }
          }
          transition={{ duration: bodyMotion.transition.duration, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="110" cy="196" rx="48" ry="9" fill="#0F172A" />
        </motion.g>

        {/* Streak Fire Backdrop Glow */}
        {pose === 'streak_fire' && (
          <motion.g
            animate={{ scale: [0.96, 1.07, 0.96], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '110px', originY: '130px' }}
          >
            <path
              d="M110 26C136 52 174 74 174 128C174 167 146 190 110 190C74 190 46 167 46 128C46 74 84 52 110 26Z"
              fill="#FDBA74"
              opacity="0.42"
            />
            <path
              d="M110 42C129 66 159 86 159 130C159 162 138 182 110 182C82 182 61 162 61 130C61 86 91 66 110 42Z"
              fill="#FACC15"
              opacity="0.35"
            />
          </motion.g>
        )}

        {/* Layer 1: Equipped Aura */}
        <AuraLayer aura={equippedCosmetics?.aura} uid={uid} />

        {/* Animated Full Character Rig with Squash & Stretch */}
        <motion.g
          animate={{
            y: bodyMotion.y,
            rotate: bodyMotion.rotate,
            scaleX: bodyMotion.scaleX,
            scaleY: bodyMotion.scaleY,
          }}
          transition={bodyMotion.transition}
          style={{ originX: '110px', originY: '185px' }}
        >
          {/* Layer 2: Cape + Tail */}
          <CapeLayer cape={equippedCosmetics?.cape} shoulderY={anchor.shoulderY} />
          <TailAndBackLayer companionId={companionId} pose={pose} uid={uid} />

          {/* Layer 3: Torso + Expressive Arms/Wings + Handheld Prop */}
          <BodyAndArmsLayer companionId={companionId} pose={pose} uid={uid} />
          <PropLayer
            prop={equippedCosmetics?.prop}
            propX={anchor.propX}
            propY={anchor.propY}
            propSide={anchor.propSide}
            uid={uid}
          />

          {/* Layer 4 & 5: Head Group (micro-springs toward pointerTarget + joyful pose nod) + Face Cosmetics */}
          <motion.g
            animate={{
              rotate: headTiltDeg,
              x: normalizedLook.x * 2.6,
              y:
                normalizedLook.y * 1.9 +
                (pose === 'happy' || pose === 'victory_dance'
                  ? -1.5
                  : pose === 'sympathetic'
                    ? 1.5
                    : 0),
              scale: pose === 'happy' || pose === 'victory_dance' ? 1.025 : 1,
            }}
            transition={{ type: 'spring', stiffness: 235, damping: 15, mass: 0.85 }}
            style={{ originX: '110px', originY: '124px' }}
          >
            <HeadAndExpressionLayer
              companionId={companionId}
              pose={pose}
              uid={uid}
              look={pupilOffset}
              isBlinking={isBlinking}
              hasCustomGlasses={hasCustomGlasses}
            />
            <GlassesLayer
              glasses={equippedCosmetics?.glasses}
              eyeY={anchor.eyeY}
              eyeSpread={anchor.eyeSpread}
            />
            <HatLayer
              hat={equippedCosmetics?.hat}
              hatY={anchor.hatY}
              hatScale={anchor.hatScale}
            />
          </motion.g>
        </motion.g>

        {/* Layer 5b: Animated Mini Sidekick Pet */}
        <PetLayer
          pet={equippedCosmetics?.pet}
          petX={anchor.petX}
          petY={anchor.petY}
          uid={uid}
        />

        {/* Pose-Specific Storytelling Props */}
        {pose === 'thinking' && (
          <motion.g
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <circle cx="163" cy="68" r="3.5" fill="#FFFFFF" stroke={MASCOT_INK} strokeWidth="1.6" />
            <circle cx="174" cy="56" r="5" fill="#FFFFFF" stroke={MASCOT_INK} strokeWidth="1.6" />
            <ellipse cx="188" cy="40" rx="14" ry="10" fill="#FFFFFF" stroke={MASCOT_INK} strokeWidth="1.8" />
            <circle cx="182" cy="40" r="1.7" fill="#64748B" />
            <circle cx="188" cy="40" r="1.7" fill="#64748B" />
            <circle cx="194" cy="40" r="1.7" fill="#64748B" />
          </motion.g>
        )}

        {pose === 'listening' && (
          <motion.g
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '170px', originY: '84px' }}
          >
            <path d="M167 74C174 80 174 91 167 97" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M175 68C184 77 184 94 175 103" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </motion.g>
        )}

        {pose === 'sympathetic' && (
          <motion.g
            animate={{ y: [0, -6, 0], scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '172px', originY: '58px' }}
          >
            <path
              d="M172 68C172 68 160 60 160 53C160 49 163 46 167 46C169.5 46 171 47.4 172 49.5C173 47.4 174.5 46 177 46C181 46 184 49 184 53C184 60 172 68 172 68Z"
              fill="#FB7185"
              stroke={MASCOT_INK}
              strokeWidth="1.8"
            />
          </motion.g>
        )}

        {pose === 'victory_dance' && (
          <motion.g
            animate={{ y: [0, -7, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '176px', originY: '52px' }}
          >
            <path d="M172 58V40L186 36V54" stroke="#8B5CF6" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="169" cy="59" r="4" fill="#8B5CF6" stroke={MASCOT_INK} strokeWidth="1.4" />
            <circle cx="183" cy="55" r="4" fill="#8B5CF6" stroke={MASCOT_INK} strokeWidth="1.4" />
          </motion.g>
        )}

        {/* Layer 6: Celebratory Star / Sparkle Burst when comboCount >= 3 or streak_fire / victory_dance */}
        {showSparkleBurst && (
          <g data-sparkle-burst="true">
            {(pose === 'streak_fire' || pose === 'victory_dance') && (
              <motion.g
                data-celebration-rays="true"
                style={{ originX: '110px', originY: '112px' }}
                animate={{
                  rotate: [0, 14, 0, -14, 0],
                  scale: [0.95, 1.07, 0.98, 1.05, 0.95],
                  opacity: [0.48, 0.92, 0.65, 0.9, 0.48],
                }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 110 + Math.cos(rad) * 76;
                  const y1 = 112 + Math.sin(rad) * 76;
                  const x2 = 110 + Math.cos(rad) * 96;
                  const y2 = 112 + Math.sin(rad) * 96;
                  return (
                    <line
                      key={deg}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={pose === 'streak_fire' ? '#F97316' : '#FACC15'}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  );
                })}
              </motion.g>
            )}
            {[
              { x: 34, y: 52, r: 8, color: '#FACC15', delay: 0 },
              { x: 186, y: 48, r: 9, color: '#FDE047', delay: 0.18 },
              { x: 42, y: 146, r: 6.5, color: '#38BDF8', delay: 0.35 },
              { x: 182, y: 138, r: 7.5, color: '#FB7185', delay: 0.12 },
              { x: 110, y: 20, r: 8.5, color: '#FACC15', delay: 0.25 },
              ...((pose === 'streak_fire' || pose === 'victory_dance' || comboCount >= 5)
                ? [
                    { x: 24, y: 98, r: 7.5, color: '#FDE047', delay: 0.08 },
                    { x: 196, y: 94, r: 8, color: '#FACC15', delay: 0.28 },
                    { x: 64, y: 28, r: 6.5, color: '#4ADE80', delay: 0.22 },
                    { x: 158, y: 28, r: 7, color: '#FB923C', delay: 0.4 },
                    { x: 60, y: 176, r: 6, color: '#FDE047', delay: 0.15 },
                    { x: 162, y: 174, r: 6.5, color: '#38BDF8', delay: 0.32 },
                  ]
                : []),
            ].map((s, idx) => (
              <motion.path
                key={idx}
                d={`M${s.x} ${s.y - s.r} L${s.x + s.r * 0.33} ${s.y - s.r * 0.33} L${s.x + s.r} ${s.y} L${s.x + s.r * 0.33} ${s.y + s.r * 0.33} L${s.x} ${s.y + s.r} L${s.x - s.r * 0.33} ${s.y + s.r * 0.33} L${s.x - s.r} ${s.y} L${s.x - s.r * 0.33} ${s.y - s.r * 0.33} Z`}
                fill={s.color}
                stroke={MASCOT_INK}
                strokeWidth="1.3"
                animate={{
                  scale: [0.68, 1.24, 0.88, 1.18, 0.68],
                  rotate: [0, 22, 8, -16, 0],
                  opacity: [0.55, 1, 0.75, 0.95, 0.55],
                }}
                transition={{
                  duration: 1.3 + (idx % 3) * 0.22,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: s.delay,
                }}
                style={{ originX: `${s.x}px`, originY: `${s.y}px` }}
              />
            ))}
          </g>
        )}
      </svg>

      {badgeText ? (
        <span
          style={{
            marginTop: 4,
            padding: '3px 12px',
            borderRadius: 999,
            backgroundColor: '#FEF3C7',
            borderStyle: 'solid',
            borderWidth: '2px 2px 3px 2px',
            borderColor: '#F59E0B',
            color: '#92400E',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.02em',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
          }}
        >
          {badgeText}
        </span>
      ) : null}
    </div>
  );
}
