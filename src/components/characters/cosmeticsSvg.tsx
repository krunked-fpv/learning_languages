import { motion } from 'framer-motion';
import type { CompanionId, CosmeticId, EquippedCosmetics } from '../../types/contracts';

export const MASCOT_INK = '#0F172A';

export interface CompanionAnchors {
  hatY: number;
  hatScale: number;
  eyeY: number;
  eyeSpread: number;
  mouthY: number;
  shoulderY: number;
  propX: number;
  propY: number;
  propSide: 'left' | 'right';
  petX: number;
  petY: number;
}

export const COMPANION_ANCHORS: Record<CompanionId, CompanionAnchors> = {
  pip: {
    hatY: 57,
    hatScale: 1,
    eyeY: 94,
    eyeSpread: 17,
    mouthY: 105,
    shoulderY: 132,
    propX: 162,
    propY: 154,
    propSide: 'right',
    petX: 34,
    petY: 118,
  },
  mateo: {
    hatY: 63,
    hatScale: 1.02,
    eyeY: 96,
    eyeSpread: 19,
    mouthY: 111,
    shoulderY: 134,
    propX: 60,
    propY: 156,
    propSide: 'left',
    petX: 184,
    petY: 144,
  },
  colette: {
    hatY: 62,
    hatScale: 0.94,
    eyeY: 97,
    eyeSpread: 17,
    mouthY: 112,
    shoulderY: 134,
    propX: 154,
    propY: 154,
    propSide: 'right',
    petX: 34,
    petY: 118,
  },
  benni: {
    hatY: 61,
    hatScale: 0.98,
    eyeY: 97,
    eyeSpread: 18,
    mouthY: 113,
    shoulderY: 134,
    propX: 154,
    propY: 155,
    propSide: 'right',
    petX: 34,
    petY: 118,
  },
  luca: {
    hatY: 61,
    hatScale: 0.98,
    eyeY: 96,
    eyeSpread: 17,
    mouthY: 113,
    shoulderY: 134,
    propX: 154,
    propY: 155,
    propSide: 'right',
    petX: 34,
    petY: 118,
  },
};

export interface ThemeGlowPalette {
  inner: string;
  mid: string;
  outer: string;
  ring: string;
  nebula?: boolean;
}

export type ThemeCosmeticKey = 'default' | Extract<CosmeticId, `theme_${string}`>;

export const THEME_GLOW_PALETTE: Record<ThemeCosmeticKey, ThemeGlowPalette> = {
  default: { inner: '#DBEAFE', mid: '#EFF6FF', outer: '#EFF6FF', ring: '#93C5FD' },
  theme_sunset_plaza: { inner: '#FED7AA', mid: '#FFEDD5', outer: '#FFF7ED', ring: '#FB923C' },
  theme_starlight_indigo: { inner: '#C7D2FE', mid: '#818CF8', outer: '#EEF2FF', ring: '#818CF8' },
  theme_alpine_meadow: { inner: '#A7F3D0', mid: '#D1FAE5', outer: '#ECFDF5', ring: '#34D399' },
  theme_cosmic_galaxy: {
    inner: '#67E8F9',
    mid: '#A855F7',
    outer: '#1E1B4B',
    ring: '#C084FC',
    nebula: true,
  },
  theme_aurora_borealis: {
    inner: '#6EE7B7',
    mid: '#38BDF8',
    outer: '#312E81',
    ring: '#34D399',
    nebula: true,
  },
  theme_candy_sakura: { inner: '#FBCFE8', mid: '#F472B6', outer: '#FFF1F2', ring: '#F472B6' },
  theme_ocean_lagoon: { inner: '#67E8F9', mid: '#22D3EE', outer: '#ECFEFF', ring: '#06B6D4' },
  theme_royal_velvet: {
    inner: '#FDE047',
    mid: '#A855F7',
    outer: '#3B0764',
    ring: '#FBBF24',
    nebula: true,
  },
  theme_kyoto_matcha: { inner: '#D9F99D', mid: '#86EFAC', outer: '#F0FDF4', ring: '#16A34A' },
  theme_sahara_mirage: { inner: '#FDE68A', mid: '#FDBA74', outer: '#FFFBEB', ring: '#F59E0B' },
  theme_emerald_rainforest: {
    inner: '#6EE7B7',
    mid: '#10B981',
    outer: '#064E3B',
    ring: '#34D399',
    nebula: true,
  },
  theme_neon_night_market: {
    inner: '#F472B6',
    mid: '#8B5CF6',
    outer: '#0F172A',
    ring: '#22D3EE',
    nebula: true,
  },
  theme_nordic_fjord: { inner: '#BAE6FD', mid: '#38BDF8', outer: '#F0F9FF', ring: '#0284C7' },
  theme_laureate_imperial: {
    inner: '#FEF08A',
    mid: '#C084FC',
    outer: '#2E1065',
    ring: '#FACC15',
    nebula: true,
  },
};

export function AuraLayer({
  aura,
  uid,
}: {
  aura?: CosmeticId;
  uid: string;
}) {
  if (aura === 'aura_golden_compass') {
    return (
      <g data-cosmetic="aura_golden_compass">
        <defs>
          <radialGradient id={`aura-cmp-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#FDE047" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="116" r="95" fill={`url(#aura-cmp-${uid})`} />
        <motion.g
          style={{ originX: '110px', originY: '116px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="110"
            cy="116"
            r="84"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="10 7"
            opacity="0.72"
          />
          <circle
            cx="110"
            cy="116"
            r="75"
            fill="none"
            stroke="#FDE047"
            strokeWidth="1.4"
            opacity="0.55"
          />
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = 110 + Math.cos(rad) * 84;
            const y = 116 + Math.sin(rad) * 84;
            return (
              <path
                key={deg}
                d={`M${x} ${y - 7} L${x + 2.3} ${y - 2.3} L${x + 7} ${y} L${x + 2.3} ${y + 2.3} L${x} ${y + 7} L${x - 2.3} ${y + 2.3} L${x - 7} ${y} L${x - 2.3} ${y - 2.3} Z`}
                fill="#FDE047"
                stroke="#B45309"
                strokeWidth="1"
              />
            );
          })}
        </motion.g>
      </g>
    );
  }

  if (aura === 'aura_fireflies') {
    const fireflies = [
      { cx: 36, cy: 74, r: 4.5, dx: 7, dy: -10, dur: 3.1 },
      { cx: 184, cy: 66, r: 5, dx: -8, dy: -12, dur: 3.6 },
      { cx: 42, cy: 158, r: 4, dx: 9, dy: -8, dur: 2.9 },
      { cx: 178, cy: 150, r: 4.8, dx: -6, dy: -11, dur: 3.4 },
      { cx: 66, cy: 36, r: 3.8, dx: 6, dy: 7, dur: 2.7 },
      { cx: 158, cy: 40, r: 4.2, dx: -7, dy: 8, dur: 3.2 },
    ];
    return (
      <g data-cosmetic="aura_fireflies">
        {fireflies.map((f, idx) => (
          <motion.g
            key={idx}
            animate={{
              x: [0, f.dx, 0],
              y: [0, f.dy, 0],
              opacity: [0.45, 1, 0.45],
              scale: [0.88, 1.18, 0.88],
            }}
            transition={{
              duration: f.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: idx * 0.35,
            }}
            style={{ originX: `${f.cx}px`, originY: `${f.cy}px` }}
          >
            <circle cx={f.cx} cy={f.cy} r={f.r * 2.4} fill="#FEF08A" opacity="0.35" />
            <circle cx={f.cx} cy={f.cy} r={f.r} fill="#BEF264" stroke="#65A30D" strokeWidth="1.2" />
          </motion.g>
        ))}
      </g>
    );
  }

  if (aura === 'aura_sakura_breeze') {
    const blossoms = [
      { cx: 36, cy: 62, s: 1.05, dx: 10, dy: 12, dur: 3.4 },
      { cx: 184, cy: 56, s: 0.95, dx: -11, dy: 14, dur: 3.8 },
      { cx: 32, cy: 148, s: 0.9, dx: 12, dy: -10, dur: 3.2 },
      { cx: 182, cy: 152, s: 1.05, dx: -10, dy: -12, dur: 3.6 },
      { cx: 64, cy: 30, s: 0.85, dx: 9, dy: 8, dur: 3.0 },
      { cx: 156, cy: 32, s: 0.9, dx: -8, dy: 10, dur: 3.5 },
    ];
    return (
      <g data-cosmetic="aura_sakura_breeze">
        <defs>
          <radialGradient id={`aura-sak-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="50%" stopColor="#FBCFE8" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="116" r="94" fill={`url(#aura-sak-${uid})`} />
        {blossoms.map((b, idx) => (
          <motion.g
            key={idx}
            animate={{
              x: [0, b.dx, 0],
              y: [0, b.dy, 0],
              rotate: [0, 35, 0],
              opacity: [0.65, 1, 0.65],
            }}
            transition={{
              duration: b.dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: idx * 0.28,
            }}
            style={{ originX: `${b.cx}px`, originY: `${b.cy}px` }}
          >
            <g transform={`translate(${b.cx}, ${b.cy}) scale(${b.s})`}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-4.5"
                  rx="2.6"
                  ry="4"
                  transform={`rotate(${deg})`}
                  fill="#F9A8D4"
                  stroke="#DB2777"
                  strokeWidth="0.9"
                />
              ))}
              <circle cx="0" cy="0" r="2" fill="#FEF08A" />
            </g>
          </motion.g>
        ))}
      </g>
    );
  }

  if (aura === 'aura_polyglot_glyphs') {
    const glyphs = [
      { deg: 35, color: '#38BDF8', kind: 'diamond' as const },
      { deg: 145, color: '#FACC15', kind: 'star' as const },
      { deg: 215, color: '#A78BFA', kind: 'scroll' as const },
      { deg: 325, color: '#34D399', kind: 'wave' as const },
    ];
    return (
      <g data-cosmetic="aura_polyglot_glyphs">
        <defs>
          <radialGradient id={`aura-pg-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#818CF8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="116" r="95" fill={`url(#aura-pg-${uid})`} />
        <motion.g
          style={{ originX: '110px', originY: '116px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="110"
            cy="116"
            r="83"
            fill="none"
            stroke="#6366F1"
            strokeWidth="1.8"
            strokeDasharray="6 8"
            opacity="0.65"
          />
          {glyphs.map((g, idx) => {
            const rad = (g.deg * Math.PI) / 180;
            const x = 110 + Math.cos(rad) * 83;
            const y = 116 + Math.sin(rad) * 83;
            return (
              <g key={idx} transform={`translate(${x}, ${y})`}>
                <circle cx="0" cy="0" r="10.5" fill="#1E1B4B" stroke={g.color} strokeWidth="1.8" />
                {g.kind === 'diamond' && (
                  <polygon points="0,-5 5,0 0,5 -5,0" fill={g.color} />
                )}
                {g.kind === 'star' && (
                  <path d="M0 -6L1.7 -1.7L6 0L1.7 1.7L0 6L-1.7 1.7L-6 0L-1.7 -1.7Z" fill={g.color} />
                )}
                {g.kind === 'scroll' && (
                  <rect x="-4" y="-4" width="8" height="8" rx="2" fill="none" stroke={g.color} strokeWidth="1.8" />
                )}
                {g.kind === 'wave' && (
                  <path d="M-4.5 1Q-2 -4 0 0T4.5 -1" fill="none" stroke={g.color} strokeWidth="2" strokeLinecap="round" />
                )}
              </g>
            );
          })}
        </motion.g>
      </g>
    );
  }

  if (aura === 'aura_laureate_supernova') {
    return (
      <g data-cosmetic="aura_laureate_supernova">
        <defs>
          <radialGradient id={`aura-sn-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="42%" stopColor="#FEF08A" stopOpacity="0.4" />
            <stop offset="76%" stopColor="#C084FC" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3B0764" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="116" r="96" fill={`url(#aura-sn-${uid})`} />
        <motion.g
          style={{ originX: '110px', originY: '116px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="110"
            cy="116"
            r="86"
            fill="none"
            stroke="#FACC15"
            strokeWidth="2.2"
            strokeDasharray="12 6"
            opacity="0.82"
          />
          {[0, 60, 120, 180, 240, 300].map((deg, idx) => {
            const rad = (deg * Math.PI) / 180;
            const x = 110 + Math.cos(rad) * 86;
            const y = 116 + Math.sin(rad) * 86;
            return (
              <path
                key={deg}
                d={`M${x} ${y - 7.5} L${x + 2.4} ${y - 2.4} L${x + 7.5} ${y} L${x + 2.4} ${y + 2.4} L${x} ${y + 7.5} L${x - 2.4} ${y + 2.4} L${x - 7.5} ${y} L${x - 2.4} ${y - 2.4} Z`}
                fill={idx % 2 === 0 ? '#FEF08A' : '#38BDF8'}
                stroke={MASCOT_INK}
                strokeWidth="1"
              />
            );
          })}
        </motion.g>
        <motion.g
          style={{ originX: '110px', originY: '116px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="110"
            cy="116"
            r="73"
            fill="none"
            stroke="#E879F9"
            strokeWidth="1.6"
            strokeDasharray="4 9"
            opacity="0.72"
          />
        </motion.g>
      </g>
    );
  }

  return null;
}

export function CapeLayer({
  cape,
  shoulderY,
}: {
  cape?: CosmeticId;
  shoulderY: number;
}) {
  if (cape === 'cape_rainbow_wings') {
    return (
      <motion.g
        data-cosmetic="cape_rainbow_wings"
        animate={{ scaleX: [1, 1.045, 1], y: [0, -1.5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '110px', originY: `${shoulderY}px` }}
      >
        {/* Left Rainbow Wing Cape */}
        <path
          d={`M90 ${shoulderY}C62 ${shoulderY - 20} 34 ${shoulderY - 8} 29 ${shoulderY + 20}C46 ${shoulderY + 26} 66 ${shoulderY + 24} 84 ${shoulderY + 18}Z`}
          fill="#FB7185"
          stroke={MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d={`M88 ${shoulderY + 7}C63 ${shoulderY - 4} 42 ${shoulderY + 4} 38 ${shoulderY + 28}C54 ${shoulderY + 32} 70 ${shoulderY + 28} 85 ${shoulderY + 22}Z`}
          fill="#FACC15"
          stroke={MASCOT_INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={`M88 ${shoulderY + 15}C67 ${shoulderY + 10} 50 ${shoulderY + 18} 48 ${shoulderY + 36}C62 ${shoulderY + 38} 76 ${shoulderY + 34} 88 ${shoulderY + 28}Z`}
          fill="#38BDF8"
          stroke={MASCOT_INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Right Rainbow Wing Cape */}
        <path
          d={`M130 ${shoulderY}C158 ${shoulderY - 20} 186 ${shoulderY - 8} 191 ${shoulderY + 20}C174 ${shoulderY + 26} 154 ${shoulderY + 24} 136 ${shoulderY + 18}Z`}
          fill="#FB7185"
          stroke={MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d={`M132 ${shoulderY + 7}C157 ${shoulderY - 4} 178 ${shoulderY + 4} 182 ${shoulderY + 28}C166 ${shoulderY + 32} 150 ${shoulderY + 28} 135 ${shoulderY + 22}Z`}
          fill="#FACC15"
          stroke={MASCOT_INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={`M132 ${shoulderY + 15}C153 ${shoulderY + 10} 170 ${shoulderY + 18} 172 ${shoulderY + 36}C158 ${shoulderY + 38} 144 ${shoulderY + 34} 132 ${shoulderY + 28}Z`}
          fill="#38BDF8"
          stroke={MASCOT_INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Golden Collar Clasp */}
        <path
          d={`M84 ${shoulderY + 6}Q110 ${shoulderY + 22} 136 ${shoulderY + 6}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </motion.g>
    );
  }

  if (cape === 'cape_traveler_cloak') {
    return (
      <motion.g
        data-cosmetic="cape_traveler_cloak"
        animate={{ scaleX: [1, 1.03, 1], y: [0, 1.5, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '110px', originY: `${shoulderY}px` }}
      >
        {/* Warm Forest Traveler Cloak Drape */}
        <path
          d={`M82 ${shoulderY - 2}C62 ${shoulderY + 14} 48 ${shoulderY + 38} 54 ${shoulderY + 56}C74 ${shoulderY + 62} 146 ${shoulderY + 62} 166 ${shoulderY + 56}C172 ${shoulderY + 38} 158 ${shoulderY + 14} 138 ${shoulderY - 2}Z`}
          fill="#15803D"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        {/* Golden-Tan Adventure Trim */}
        <path
          d={`M55 ${shoulderY + 51}C78 ${shoulderY + 58} 142 ${shoulderY + 58} 165 ${shoulderY + 51}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Leather Mantle & Compass Clasp */}
        <path
          d={`M80 ${shoulderY + 4}Q110 ${shoulderY + 20} 140 ${shoulderY + 4}`}
          fill="none"
          stroke="#92400E"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="110" cy={shoulderY + 12} r="5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.5" />
      </motion.g>
    );
  }

  if (cape === 'cape_aurora_mantle') {
    return (
      <motion.g
        data-cosmetic="cape_aurora_mantle"
        animate={{ scaleX: [1, 1.05, 1], y: [0, -2, 0] }}
        transition={{ duration: 2.9, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '110px', originY: `${shoulderY}px` }}
      >
        {/* Outer Indigo-Violet Silk Wave */}
        <path
          d={`M84 ${shoulderY}C56 ${shoulderY + 8} 40 ${shoulderY + 30} 46 ${shoulderY + 54}C70 ${shoulderY + 62} 150 ${shoulderY + 62} 174 ${shoulderY + 54}C180 ${shoulderY + 30} 164 ${shoulderY + 8} 136 ${shoulderY}Z`}
          fill="#6366F1"
          fillOpacity="0.88"
          stroke={MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Inner Shimmering Polar Teal Ribbon */}
        <path
          d={`M86 ${shoulderY + 8}C66 ${shoulderY + 18} 58 ${shoulderY + 36} 62 ${shoulderY + 54}C82 ${shoulderY + 58} 138 ${shoulderY + 58} 158 ${shoulderY + 54}C162 ${shoulderY + 36} 154 ${shoulderY + 18} 134 ${shoulderY + 8}Z`}
          fill="#2DD4BF"
          fillOpacity="0.82"
        />
        {/* Starlight Frost Collar */}
        <path
          d={`M84 ${shoulderY + 4}Q110 ${shoulderY + 20} 136 ${shoulderY + 4}`}
          fill="none"
          stroke="#BAE6FD"
          strokeWidth="4.8"
          strokeLinecap="round"
        />
        <circle cx="63" cy={shoulderY + 38} r="2.2" fill="#FEF08A" />
        <circle cx="157" cy={shoulderY + 36} r="2.2" fill="#FEF08A" />
      </motion.g>
    );
  }

  if (cape === 'cape_velvet_laureate') {
    return (
      <motion.g
        data-cosmetic="cape_velvet_laureate"
        animate={{ scaleX: [1, 1.035, 1], y: [0, -1, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '110px', originY: `${shoulderY}px` }}
      >
        {/* Imperial Crimson-Plum Velvet Robe */}
        <path
          d={`M80 ${shoulderY - 2}C54 ${shoulderY + 12} 42 ${shoulderY + 38} 48 ${shoulderY + 58}C72 ${shoulderY + 65} 148 ${shoulderY + 65} 172 ${shoulderY + 58}C178 ${shoulderY + 38} 166 ${shoulderY + 12} 140 ${shoulderY - 2}Z`}
          fill="#9F1239"
          stroke={MASCOT_INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Golden Imperial Embroidery Hem */}
        <path
          d={`M51 ${shoulderY + 52}C78 ${shoulderY + 60} 142 ${shoulderY + 60} 169 ${shoulderY + 52}`}
          fill="none"
          stroke="#FACC15"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Plush Ermine Ivory Collar & Gold Chain */}
        <path
          d={`M78 ${shoulderY + 3}Q110 ${shoulderY + 21} 142 ${shoulderY + 3}`}
          fill="none"
          stroke="#FFFBEB"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M82 ${shoulderY + 5}Q110 ${shoulderY + 21} 138 ${shoulderY + 5}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </motion.g>
    );
  }

  return null;
}

export function GlassesLayer({
  glasses,
  eyeY,
  eyeSpread,
}: {
  glasses?: CosmeticId;
  eyeY: number;
  eyeSpread: number;
}) {
  if (!glasses) return null;
  const lx = 110 - eyeSpread;
  const rx = 110 + eyeSpread;

  if (glasses === 'glasses_brass_aviator') {
    return (
      <g data-cosmetic="glasses_brass_aviator">
        {/* Temple arms */}
        <line x1={lx - 13} y1={eyeY - 2} x2={lx - 24} y2={eyeY - 5} stroke="#B45309" strokeWidth="3.2" strokeLinecap="round" />
        <line x1={rx + 13} y1={eyeY - 2} x2={rx + 24} y2={eyeY - 5} stroke="#B45309" strokeWidth="3.2" strokeLinecap="round" />
        {/* Double aviator bridge */}
        <path d={`M${lx + 11} ${eyeY - 7} Q110 ${eyeY - 11} ${rx - 11} ${eyeY - 7}`} fill="none" stroke="#F59E0B" strokeWidth="3" />
        <path d={`M${lx + 12} ${eyeY - 1} Q110 ${eyeY - 3} ${rx - 12} ${eyeY - 1}`} fill="none" stroke="#B45309" strokeWidth="2.4" />
        {/* Left & Right Tinted Aviator Lenses */}
        {[lx, rx].map((cx) => (
          <g key={cx}>
            <ellipse
              cx={cx}
              cy={eyeY + 1}
              rx="13.5"
              ry="11.5"
              fill="#38BDF8"
              fillOpacity="0.28"
              stroke="#F59E0B"
              strokeWidth="3.2"
            />
            <ellipse cx={cx} cy={eyeY + 1} rx="13.5" ry="11.5" fill="none" stroke={MASCOT_INK} strokeWidth="1.2" />
            <path
              d={`M${cx - 7} ${eyeY - 5} L${cx + 3} ${eyeY + 5}`}
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.72"
            />
          </g>
        ))}
      </g>
    );
  }

  if (glasses === 'glasses_starlight_frames') {
    return (
      <g data-cosmetic="glasses_starlight_frames">
        <path d={`M${lx + 12} ${eyeY - 1} Q110 ${eyeY - 5} ${rx - 12} ${eyeY - 1}`} fill="none" stroke="#8B5CF6" strokeWidth="3" />
        {[lx, rx].map((cx, idx) => {
          const wingX = idx === 0 ? cx - 14 : cx + 14;
          const dir = idx === 0 ? -1 : 1;
          return (
            <g key={cx}>
              <circle
                cx={cx}
                cy={eyeY}
                r="12.5"
                fill="#A78BFA"
                fillOpacity="0.24"
                stroke="#7C3AED"
                strokeWidth="3"
              />
              <circle cx={cx} cy={eyeY} r="12.5" fill="none" stroke={MASCOT_INK} strokeWidth="1.1" />
              {/* Star Wing Tip */}
              <polygon
                points={`${wingX},${eyeY - 3} ${wingX + dir * 7},${eyeY - 9} ${wingX + dir * 3},${eyeY + 1}`}
                fill="#FACC15"
                stroke={MASCOT_INK}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path d={`M${cx - 6} ${eyeY - 6} L${cx + 2} ${eyeY + 2}`} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
            </g>
          );
        })}
      </g>
    );
  }

  if (glasses === 'glasses_scholar_monocle') {
    return (
      <g data-cosmetic="glasses_scholar_monocle">
        {/* Delicate Gold Chain Draping from Right Monocle */}
        <path
          d={`M${rx + 12} ${eyeY + 3} Q${rx + 19} ${eyeY + 22} ${rx + 9} ${eyeY + 36}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.2"
          strokeDasharray="2 2.5"
          strokeLinecap="round"
        />
        <circle
          cx={rx}
          cy={eyeY}
          r="13"
          fill="#FEF9C3"
          fillOpacity="0.24"
          stroke="#D97706"
          strokeWidth="3.4"
        />
        <circle cx={rx} cy={eyeY} r="13" fill="none" stroke={MASCOT_INK} strokeWidth="1.2" />
        <circle cx={rx + 12.5} cy={eyeY + 2} r="2.5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.2" />
        <path d={`M${rx - 6} ${eyeY - 6} L${rx + 4} ${eyeY + 4}`} stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      </g>
    );
  }

  if (glasses === 'glasses_pixel_visor') {
    const visorLeft = lx - 14;
    const visorWidth = rx - lx + 28;
    return (
      <g data-cosmetic="glasses_pixel_visor">
        <rect
          x={visorLeft}
          y={eyeY - 10}
          width={visorWidth}
          height="20"
          rx="6"
          fill="#06B6D4"
          fillOpacity="0.48"
          stroke="#22D3EE"
          strokeWidth="2.8"
        />
        <rect
          x={visorLeft}
          y={eyeY - 10}
          width={visorWidth}
          height="20"
          rx="6"
          fill="none"
          stroke={MASCOT_INK}
          strokeWidth="1.4"
        />
        {/* Neon Pixel Glint Bars */}
        <path
          d={`M${visorLeft + 8} ${eyeY - 6} L${visorLeft + 18} ${eyeY + 6} M${visorLeft + 21} ${eyeY - 6} L${visorLeft + 26} ${eyeY + 1}`}
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.82"
        />
        <rect x={visorLeft - 4} y={eyeY - 4} width="5" height="8" rx="1.5" fill="#EC4899" stroke={MASCOT_INK} strokeWidth="1.2" />
        <rect x={visorLeft + visorWidth - 1} y={eyeY - 4} width="5" height="8" rx="1.5" fill="#EC4899" stroke={MASCOT_INK} strokeWidth="1.2" />
      </g>
    );
  }

  if (glasses === 'glasses_constellation_shades') {
    return (
      <g data-cosmetic="glasses_constellation_shades">
        <line x1={lx - 13} y1={eyeY - 2} x2={lx - 23} y2={eyeY - 5} stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1={rx + 13} y1={eyeY - 2} x2={rx + 23} y2={eyeY - 5} stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${lx + 11} ${eyeY - 4} Q110 ${eyeY - 8} ${rx - 11} ${eyeY - 4}`} fill="none" stroke="#FACC15" strokeWidth="3.2" />
        {[lx, rx].map((cx) => (
          <g key={cx}>
            <rect
              x={cx - 13.5}
              y={eyeY - 10}
              width="27"
              height="20"
              rx="8"
              fill="#1E1B4B"
              fillOpacity="0.88"
              stroke="#F59E0B"
              strokeWidth="2.8"
            />
            <circle cx={cx - 5} cy={eyeY - 3} r="1.4" fill="#FEF08A" />
            <circle cx={cx + 5} cy={eyeY + 3} r="1.4" fill="#38BDF8" />
            <line x1={cx - 5} y1={eyeY - 3} x2={cx + 5} y2={eyeY + 3} stroke="#FDE047" strokeWidth="0.9" opacity="0.7" />
            <path d={`M${cx - 8} ${eyeY - 5} L${cx - 2} ${eyeY + 3}`} stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          </g>
        ))}
      </g>
    );
  }

  return null;
}

export function HatLayer({
  hat,
  hatY,
  hatScale,
}: {
  hat?: CosmeticId;
  hatY: number;
  hatScale: number;
}) {
  if (!hat) return null;

  return (
    <g transform={`translate(110, ${hatY}) scale(${hatScale})`} data-cosmetic={hat}>
      {hat === 'hat_explorer_beret' && (
        <g>
          <path
            d="M-30 2C-34 -18 4 -29 29 -12C39 -5 33 7 0 6C-21 6 -29 6 -30 2Z"
            fill="#E11D48"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
          />
          <path d="M-24 2C-10 -2 14 -2 28 1" stroke="#9F1239" strokeWidth="3" strokeLinecap="round" />
          <path d="M2 -20L6 -26" stroke={MASCOT_INK} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="-13" cy="-7" r="5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.6" />
          <circle cx="-13" cy="-7" r="2" fill="#2563EB" />
        </g>
      )}

      {hat === 'hat_fiesta_sombrero' && (
        <g>
          <ellipse cx="0" cy="2" rx="48" ry="11" fill="#FBBF24" stroke={MASCOT_INK} strokeWidth="2.4" />
          <path
            d="M-43 3Q-22 10 0 10Q22 10 43 3"
            fill="none"
            stroke="#EA580C"
            strokeWidth="3.2"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          <path
            d="M-21 0C-19 -24 19 -24 21 0Z"
            fill="#F59E0B"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
          />
          <rect x="-20" y="-7" width="40" height="6" rx="2" fill="#E11D48" stroke={MASCOT_INK} strokeWidth="1.6" />
          <circle cx="-39" cy="6" r="3.5" fill="#10B981" stroke={MASCOT_INK} strokeWidth="1.3" />
          <circle cx="0" cy="11" r="3.5" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="1.3" />
          <circle cx="39" cy="6" r="3.5" fill="#38BDF8" stroke={MASCOT_INK} strokeWidth="1.3" />
        </g>
      )}

      {hat === 'hat_alpine_tyrolean' && (
        <g>
          <path
            d="M17 -10C26 -28 38 -31 41 -22C34 -14 27 -8 19 -6Z"
            fill="#EF4444"
            stroke={MASCOT_INK}
            strokeWidth="1.8"
          />
          <path d="M21 -10C28 -18 33 -22 37 -22" stroke="#FEF08A" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="0" cy="2" rx="34" ry="8" fill="#166534" stroke={MASCOT_INK} strokeWidth="2.4" />
          <path
            d="M-22 1L-15 -22C-5 -25 5 -18 15 -22L22 1Z"
            fill="#15803D"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M-21 -4H21" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      )}

      {hat === 'hat_gondolier_boater' && (
        <g>
          <ellipse cx="0" cy="2" rx="40" ry="8.5" fill="#FEF3C7" stroke={MASCOT_INK} strokeWidth="2.4" />
          <rect x="-24" y="-16" width="48" height="17" rx="4" fill="#FDE68A" stroke={MASCOT_INK} strokeWidth="2.4" />
          <rect x="-24" y="-7" width="48" height="6.5" fill="#DC2626" stroke={MASCOT_INK} strokeWidth="1.5" />
          <path d="M19 -5L33 1L25 6L17 -1Z" fill="#DC2626" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}

      {hat === 'hat_starlight_wizard' && (
        <g>
          <ellipse cx="0" cy="3" rx="40" ry="9" fill="#312E81" stroke={MASCOT_INK} strokeWidth="2.4" />
          <path
            d="M-24 2C-19 -18 -5 -36 17 -40C10 -24 17 -12 24 2Z"
            fill="#4338CA"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M-22 -2Q0 4 22 -2" fill="none" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M-2 -24L0 -18L6 -16L0 -14L-2 -8L-4 -14L-10 -16L-4 -18Z" fill="#FDE047" />
          <circle cx="8" cy="-27" r="2.5" fill="#FEF08A" />
        </g>
      )}

      {hat === 'hat_sakura_crown' && (
        <g>
          {/* Woven Vine Circlet */}
          <path
            d="M-32 4C-24 -10 24 -10 32 4"
            fill="none"
            stroke="#15803D"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M-32 4C-24 -10 24 -10 32 4"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Three Layered 5-Petal Sakura Blossoms */}
          {[
            { x: -18, y: -4, s: 0.88 },
            { x: 0, y: -9, s: 1.08 },
            { x: 18, y: -4, s: 0.88 },
          ].map((fl, idx) => (
            <g key={idx} transform={`translate(${fl.x}, ${fl.y}) scale(${fl.s})`}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-5.5"
                  rx="3.4"
                  ry="5"
                  transform={`rotate(${deg})`}
                  fill="#F9A8D4"
                  stroke={MASCOT_INK}
                  strokeWidth="1.2"
                />
              ))}
              <circle cx="0" cy="0" r="2.8" fill="#FEF08A" stroke={MASCOT_INK} strokeWidth="0.9" />
            </g>
          ))}
        </g>
      )}

      {hat === 'hat_desert_turban_star' && (
        <g>
          {/* Layered Turquoise & Cream Silk Turban Folds */}
          <path
            d="M-30 2C-34 -18 -14 -27 0 -25C14 -27 34 -18 30 2Z"
            fill="#0284C7"
            stroke={MASCOT_INK}
            strokeWidth="2.3"
          />
          <path d="M-28 0C-12 -14 14 -18 29 -4" fill="none" stroke="#FEF3C7" strokeWidth="6" strokeLinecap="round" />
          <path d="M-29 -4C-12 -19 14 -14 28 0" fill="none" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
          {/* Golden Star Jewel Brooch */}
          <circle cx="0" cy="-14" r="6.5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.7" />
          <polygon points="0,-18 2,-14 0,-10 -2,-14" fill="#E11D48" />
        </g>
      )}

      {hat === 'hat_astronomer_mitre' && (
        <g>
          {/* Tilted Brass Astrolabe Orbit Ring */}
          <ellipse
            cx="0"
            cy="-16"
            rx="34"
            ry="7"
            transform="rotate(-14 0 -16)"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3.2"
          />
          {/* Deep Indigo Scholar Cap */}
          <path
            d="M-26 3L-17 -26C-6 -33 6 -33 17 -26L26 3Z"
            fill="#312E81"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M-25 1H25" stroke="#FACC15" strokeWidth="5" strokeLinecap="round" />
          {/* Celestial Star Finial */}
          <path d="M0 -39L2 -33L8 -31L2 -29L0 -23L-2 -29L-8 -31L-2 -33Z" fill="#FDE047" stroke={MASCOT_INK} strokeWidth="1.2" />
        </g>
      )}

      {hat === 'hat_laureate_wreath' && (
        <g>
          {/* Twin Golden Laurel Wreath Branches */}
          {[
            [-26, 0, -45],
            [-22, -9, -22],
            [-14, -16, 4],
            [26, 0, 45],
            [22, -9, 22],
            [14, -16, -4],
          ].map(([cx, cy, rot], idx) => (
            <ellipse
              key={idx}
              cx={cx}
              cy={cy}
              rx="8.5"
              ry="4.5"
              transform={`rotate(${rot} ${cx} ${cy})`}
              fill="#FACC15"
              stroke={MASCOT_INK}
              strokeWidth="1.7"
            />
          ))}
          {/* Imperial Apex Gem & Crimson Sash */}
          <polygon points="0,-24 7,-16 0,-8 -7,-16" fill="#38BDF8" stroke={MASCOT_INK} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="0" cy="-16" r="2.2" fill="#FFFFFF" />
        </g>
      )}
    </g>
  );
}

export function PropLayer({
  prop,
  propX,
  propY,
  propSide,
  uid,
}: {
  prop?: CosmeticId;
  propX: number;
  propY: number;
  propSide: 'left' | 'right';
  uid: string;
}) {
  if (!prop) return null;
  const dir = propSide === 'left' ? -1 : 1;

  return (
    <motion.g
      data-cosmetic={prop}
      transform={`translate(${propX}, ${propY})`}
      animate={{ rotate: [dir * -4, dir * 5, dir * -4] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originX: '0px', originY: '0px' }}
    >
      {prop === 'prop_explorer_ukulele' && (
        <g transform={`rotate(${dir * 18})`}>
          <rect x="-3.5" y="-34" width="7" height="24" rx="2.5" fill="#78350F" stroke={MASCOT_INK} strokeWidth="1.8" />
          <rect x="-5" y="-37" width="10" height="6" rx="2" fill="#451A03" stroke={MASCOT_INK} strokeWidth="1.5" />
          <ellipse cx="0" cy="-6" rx="11" ry="9" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="2" />
          <ellipse cx="0" cy="5" rx="13.5" ry="11" fill="#D97706" stroke={MASCOT_INK} strokeWidth="2" />
          <circle cx="0" cy="-4" r="4.5" fill="#451A03" stroke="#FEF08A" strokeWidth="1.4" />
          <rect x="-5.5" y="5" width="11" height="3.2" rx="1" fill="#451A03" />
        </g>
      )}

      {prop === 'prop_starlight_telescope' && (
        <g transform={`rotate(${dir * 32})`}>
          <rect x="-4.5" y="-12" width="9" height="26" rx="3" fill="#1E3A8A" stroke={MASCOT_INK} strokeWidth="2" />
          <rect x="-6" y="-26" width="12" height="16" rx="3" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="2" />
          <rect x="-7.5" y="-31" width="15" height="6" rx="2.5" fill="#38BDF8" stroke={MASCOT_INK} strokeWidth="1.8" />
          <circle cx="0" cy="-35" r="2.2" fill="#FDE047" />
        </g>
      )}

      {prop === 'prop_golden_quill' && (
        <g transform={`rotate(${dir * 22})`}>
          <path
            d="M0 8C-6 -6 -5 -26 4 -38C11 -26 10 -6 2 8Z"
            fill="#6366F1"
            stroke={MASCOT_INK}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M1 12L1 -34" stroke="#FDE047" strokeWidth="2.8" strokeLinecap="round" />
          <polygon points="-2,8 4,8 1,16" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      )}

      {prop === 'prop_festival_lantern' && (
        <g>
          <defs>
            <radialGradient id={`prop-lan-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Wooden Lantern Stick */}
          <path d={`M0 10L${dir * 16} -24`} stroke="#78350F" strokeWidth="3.2" strokeLinecap="round" />
          <g transform={`translate(${dir * 16}, -8)`}>
            <circle cx="0" cy="0" r="16" fill={`url(#prop-lan-${uid})`} />
            <line x1="0" y1="-16" x2="0" y2="-9" stroke="#FACC15" strokeWidth="1.8" />
            <ellipse cx="0" cy="0" rx="8.5" ry="11" fill="#E11D48" stroke={MASCOT_INK} strokeWidth="1.9" />
            <rect x="-4.5" y="-12" width="9" height="3" rx="1" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.1" />
            <rect x="-4.5" y="9" width="9" height="3" rx="1" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.1" />
            <line x1="0" y1="12" x2="0" y2="18" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      )}

      {prop === 'prop_boulangerie_whisk' && (
        <g transform={`rotate(${dir * 18})`}>
          <rect x="-3" y="-6" width="6" height="19" rx="3" fill="#D97706" stroke={MASCOT_INK} strokeWidth="1.8" />
          <ellipse cx="0" cy="-19" rx="8.5" ry="13" fill="none" stroke="#94A3B8" strokeWidth="2.4" />
          <ellipse cx="0" cy="-19" rx="4.5" ry="13" fill="none" stroke="#CBD5E1" strokeWidth="2" />
          <circle cx="7" cy="-31" r="2.2" fill="#FACC15" />
        </g>
      )}

      {prop === 'prop_compass_astrolabe' && (
        <g>
          <circle cx="0" cy="-8" r="14" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="2.1" />
          <circle cx="0" cy="-8" r="10" fill="#1E1B4B" stroke="#FDE047" strokeWidth="1.3" />
          <path d="M0 -16L2.4 -8L0 0L-2.4 -8Z" fill="#EF4444" />
          <path d="M-8 -8L0 -10.4L8 -8L0 -5.6Z" fill="#38BDF8" />
          <circle cx="0" cy="-8" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {prop === 'prop_laureate_scroll' && (
        <g transform={`rotate(${dir * 20})`}>
          <rect x="-7" y="-24" width="14" height="34" rx="5" fill="#FEF3C7" stroke={MASCOT_INK} strokeWidth="2" />
          <ellipse cx="0" cy="-22" rx="6" ry="2.5" fill="#FDE68A" stroke={MASCOT_INK} strokeWidth="1.4" />
          <rect x="-8" y="-10" width="16" height="6" rx="2" fill="#E11D48" stroke={MASCOT_INK} strokeWidth="1.6" />
          <circle cx="0" cy="-7" r="3.5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.2" />
        </g>
      )}
    </motion.g>
  );
}

export function PetLayer({
  pet,
  petX,
  petY,
  uid,
}: {
  pet?: CosmeticId;
  petX: number;
  petY: number;
  uid: string;
}) {
  if (!pet) return null;

  return (
    <motion.g
      data-cosmetic={pet}
      animate={{ y: [0, -5.5, 0], rotate: [-2.5, 2.5, -2.5] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originX: `${petX}px`, originY: `${petY}px` }}
    >
      <g transform={`translate(${petX}, ${petY})`}>
        {pet === 'pet_origami_crane' && (
          <g>
            <polygon points="-2,2 10,-14 7,4" fill="#F9A8D4" stroke={MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round" />
            <polygon points="-6,6 -16,-7 -10,8" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round" />
            <polygon points="7,6 15,-5 19,-2 13,1 9,9" fill="#FFFBEB" stroke={MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round" />
            <polygon points="-10,7 0,-1 9,8 0,14" fill="#FFF1F2" stroke={MASCOT_INK} strokeWidth="1.7" strokeLinejoin="round" />
            <polygon points="-13,-10 3,0 -7,8" fill="#F472B6" stroke={MASCOT_INK} strokeWidth="1.7" strokeLinejoin="round" />
          </g>
        )}

        {pet === 'pet_clockwork_owl' && (
          <g>
            <defs>
              <radialGradient id={`pet-owl-${uid}`} cx="45%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#D97706" />
              </radialGradient>
            </defs>
            {/* Tiny Bronze Wings */}
            <ellipse cx="-14" cy="4" rx="5" ry="9" transform="rotate(14 -14 4)" fill="#B45309" stroke={MASCOT_INK} strokeWidth="1.6" />
            <ellipse cx="14" cy="4" rx="5" ry="9" transform="rotate(-14 14 4)" fill="#B45309" stroke={MASCOT_INK} strokeWidth="1.6" />
            {/* Ear Tufts */}
            <polygon points="-9,-10 -14,-18 -4,-12" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points="9,-10 14,-18 4,-12" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Round Body */}
            <ellipse cx="0" cy="2" rx="13" ry="14" fill={`url(#pet-owl-${uid})`} stroke={MASCOT_INK} strokeWidth="1.9" />
            {/* Glowing Cyan Goggle Eyes */}
            <circle cx="-5.5" cy="-2" r="4.8" fill="#0F172A" stroke="#FEF08A" strokeWidth="1.3" />
            <circle cx="5.5" cy="-2" r="4.8" fill="#0F172A" stroke="#FEF08A" strokeWidth="1.3" />
            <circle cx="-5.5" cy="-2" r="2.6" fill="#38BDF8" />
            <circle cx="5.5" cy="-2" r="2.6" fill="#38BDF8" />
            <polygon points="-2.5,3 2.5,3 0,7.5" fill="#FEF08A" stroke={MASCOT_INK} strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        )}

        {pet === 'pet_axolotl_sprite' && (
          <g>
            {/* Pastel Mint Gill Frills */}
            <path d="M-12 -3L-19 -8L-14 0L-20 3L-12 6Z" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M12 -3L19 -8L14 0L20 3L12 6Z" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="1.4" strokeLinejoin="round" />
            {/* Cute Sprite Body */}
            <ellipse cx="0" cy="8" rx="10" ry="8" fill="#6EE7B7" stroke={MASCOT_INK} strokeWidth="1.8" />
            <ellipse cx="0" cy="-1" rx="12" ry="10" fill="#A7F3D0" stroke={MASCOT_INK} strokeWidth="1.9" />
            <circle cx="-5" cy="-2" r="2" fill={MASCOT_INK} />
            <circle cx="5" cy="-2" r="2" fill={MASCOT_INK} />
            <circle cx="-4.3" cy="-2.7" r="0.8" fill="#FFFFFF" />
            <circle cx="5.7" cy="-2.7" r="0.8" fill="#FFFFFF" />
            <path d="M-3.5 2.5Q0 5.5 3.5 2.5" fill="none" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="13" cy="-14" r="2.5" fill="#BAE6FD" stroke="#FFFFFF" strokeWidth="1" />
          </g>
        )}

        {pet === 'pet_desert_fennec' && (
          <g>
            {/* Huge Fennec Ears */}
            <polygon points="-7,-4 -16,-20 -1,-10" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round" />
            <polygon points="-7,-5 -13,-16 -3,-10" fill="#FFFBEB" />
            <polygon points="7,-4 16,-20 1,-10" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="1.6" strokeLinejoin="round" />
            <polygon points="7,-5 13,-16 3,-10" fill="#FFFBEB" />
            {/* Fluffy Tail & Body */}
            <ellipse cx="11" cy="10" rx="7" ry="4" transform="rotate(-24 11 10)" fill="#FDE68A" stroke={MASCOT_INK} strokeWidth="1.5" />
            <ellipse cx="0" cy="9" rx="9" ry="7" fill="#FCD34D" stroke={MASCOT_INK} strokeWidth="1.8" />
            <ellipse cx="0" cy="-1" rx="11" ry="9" fill="#FEF3C7" stroke={MASCOT_INK} strokeWidth="1.9" />
            <circle cx="-4.5" cy="-2" r="1.9" fill={MASCOT_INK} />
            <circle cx="4.5" cy="-2" r="1.9" fill={MASCOT_INK} />
            <polygon points="-2,2 2,2 0,4.5" fill={MASCOT_INK} />
          </g>
        )}

        {pet === 'pet_starlight_seahorse' && (
          <g>
            {/* Shimmering Dorsal Fin */}
            <path d="M-7 -4L-14 -1L-11 6L-5 5Z" fill="#FDE047" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Curled Seahorse Silhouette */}
            <path
              d="M0 -13C6 -13 10 -8 8 -3L14 -1L8 2C6 6 8 10 5 14C2 17 -5 16 -5 11C-5 8 -1 8 0 11C-4 10 -5 4 -4 -2C-5 -7 -4 -13 0 -13Z"
              fill="#38BDF8"
              stroke={MASCOT_INK}
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <circle cx="3" cy="-7" r="1.8" fill={MASCOT_INK} />
            <circle cx="3.6" cy="-7.6" r="0.7" fill="#FFFFFF" />
            <circle cx="-8" cy="-13" r="2.2" fill="#FDE047" />
          </g>
        )}

        {pet === 'pet_phoenix_chick' && (
          <g>
            {/* Sunny Flame Crest & Tail */}
            <path d="M-2 -12C-5 -20 2 -21 3 -14C7 -20 11 -16 6 -10Z" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M-10 8L-18 3L-13 13Z" fill="#F97316" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Plump Flame-Gold Body */}
            <circle cx="0" cy="2" r="12" fill="#FB923C" stroke={MASCOT_INK} strokeWidth="1.9" />
            <ellipse cx="2" cy="5" rx="7" ry="6" fill="#FEF08A" />
            <circle cx="-2" cy="0" r="2" fill={MASCOT_INK} />
            <circle cx="6" cy="0" r="2" fill={MASCOT_INK} />
            <polygon points="1,2 6,4 1,6" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="-12" cy="-11" r="2" fill="#FDE047" />
          </g>
        )}
      </g>
    </motion.g>
  );
}

export function resolveThemePalette(cosmetics?: EquippedCosmetics): ThemeGlowPalette {
  const theme = cosmetics?.theme;
  if (theme && theme in THEME_GLOW_PALETTE) {
    return THEME_GLOW_PALETTE[theme as ThemeCosmeticKey];
  }
  return THEME_GLOW_PALETTE.default;
}
