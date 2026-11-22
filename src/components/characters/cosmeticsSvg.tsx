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
}

export const COMPANION_ANCHORS: Record<CompanionId, CompanionAnchors> = {
  pip: { hatY: 57, hatScale: 1, eyeY: 94, eyeSpread: 17, mouthY: 105, shoulderY: 132 },
  mateo: { hatY: 63, hatScale: 1.02, eyeY: 96, eyeSpread: 19, mouthY: 111, shoulderY: 134 },
  colette: { hatY: 62, hatScale: 0.94, eyeY: 97, eyeSpread: 17, mouthY: 112, shoulderY: 134 },
  benni: { hatY: 61, hatScale: 0.98, eyeY: 97, eyeSpread: 18, mouthY: 113, shoulderY: 134 },
  luca: { hatY: 61, hatScale: 0.98, eyeY: 96, eyeSpread: 17, mouthY: 113, shoulderY: 134 },
};

export const THEME_GLOW_PALETTE: Record<
  'default' | 'theme_sunset_plaza' | 'theme_starlight_indigo' | 'theme_alpine_meadow',
  { inner: string; outer: string; ring: string }
> = {
  default: { inner: '#DBEAFE', outer: '#EFF6FF', ring: '#93C5FD' },
  theme_sunset_plaza: { inner: '#FED7AA', outer: '#FFF7ED', ring: '#FB923C' },
  theme_starlight_indigo: { inner: '#C7D2FE', outer: '#EEF2FF', ring: '#818CF8' },
  theme_alpine_meadow: { inner: '#A7F3D0', outer: '#ECFDF5', ring: '#34D399' },
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

  return null;
}

export function CapeLayer({
  cape,
  shoulderY,
}: {
  cape?: CosmeticId;
  shoulderY: number;
}) {
  if (cape !== 'cape_rainbow_wings') return null;

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

export function GlassesLayer({
  glasses,
  eyeY,
  eyeSpread,
}: {
  glasses?: CosmeticId;
  eyeY: number;
  eyeSpread: number;
}) {
  if (glasses !== 'glasses_brass_aviator') return null;
  const lx = 110 - eyeSpread;
  const rx = 110 + eyeSpread;

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
          {/* Brass Compass Pin */}
          <circle cx="-13" cy="-7" r="5" fill="#FACC15" stroke={MASCOT_INK} strokeWidth="1.6" />
          <circle cx="-13" cy="-7" r="2" fill="#2563EB" />
        </g>
      )}

      {hat === 'hat_fiesta_sombrero' && (
        <g>
          {/* Wide festive brim */}
          <ellipse cx="0" cy="2" rx="48" ry="11" fill="#FBBF24" stroke={MASCOT_INK} strokeWidth="2.4" />
          <path
            d="M-43 3Q-22 10 0 10Q22 10 43 3"
            fill="none"
            stroke="#EA580C"
            strokeWidth="3.2"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          {/* Tall rounded crown */}
          <path
            d="M-21 0C-19 -24 19 -24 21 0Z"
            fill="#F59E0B"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
          />
          <rect x="-20" y="-7" width="40" height="6" rx="2" fill="#E11D48" stroke={MASCOT_INK} strokeWidth="1.6" />
          {/* Fiesta pom-poms */}
          <circle cx="-39" cy="6" r="3.5" fill="#10B981" stroke={MASCOT_INK} strokeWidth="1.3" />
          <circle cx="0" cy="11" r="3.5" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="1.3" />
          <circle cx="39" cy="6" r="3.5" fill="#38BDF8" stroke={MASCOT_INK} strokeWidth="1.3" />
        </g>
      )}

      {hat === 'hat_alpine_tyrolean' && (
        <g>
          {/* Jaunty Feather */}
          <path
            d="M17 -10C26 -28 38 -31 41 -22C34 -14 27 -8 19 -6Z"
            fill="#EF4444"
            stroke={MASCOT_INK}
            strokeWidth="1.8"
          />
          <path d="M21 -10C28 -18 33 -22 37 -22" stroke="#FEF08A" strokeWidth="1.8" strokeLinecap="round" />
          {/* Brim & Felt Crown */}
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
          {/* Crisp flat straw brim */}
          <ellipse cx="0" cy="2" rx="40" ry="8.5" fill="#FEF3C7" stroke={MASCOT_INK} strokeWidth="2.4" />
          {/* Flat crown */}
          <rect x="-24" y="-16" width="48" height="17" rx="4" fill="#FDE68A" stroke={MASCOT_INK} strokeWidth="2.4" />
          {/* Classic Venetian crimson & navy ribbon */}
          <rect x="-24" y="-7" width="48" height="6.5" fill="#DC2626" stroke={MASCOT_INK} strokeWidth="1.5" />
          <path d="M19 -5L33 1L25 6L17 -1Z" fill="#DC2626" stroke={MASCOT_INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}

      {hat === 'hat_starlight_wizard' && (
        <g>
          {/* Brim */}
          <ellipse cx="0" cy="3" rx="40" ry="9" fill="#312E81" stroke={MASCOT_INK} strokeWidth="2.4" />
          {/* Curved Wizard Cone */}
          <path
            d="M-24 2C-19 -18 -5 -36 17 -40C10 -24 17 -12 24 2Z"
            fill="#4338CA"
            stroke={MASCOT_INK}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Gold Band & Stars */}
          <path d="M-22 -2Q0 4 22 -2" fill="none" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M-2 -24L0 -18L6 -16L0 -14L-2 -8L-4 -14L-10 -16L-4 -18Z" fill="#FDE047" />
          <circle cx="8" cy="-27" r="2.5" fill="#FEF08A" />
        </g>
      )}
    </g>
  );
}

export function resolveThemePalette(cosmetics?: EquippedCosmetics) {
  const theme = cosmetics?.theme;
  if (
    theme === 'theme_sunset_plaza' ||
    theme === 'theme_starlight_indigo' ||
    theme === 'theme_alpine_meadow'
  ) {
    return THEME_GLOW_PALETTE[theme];
  }
  return THEME_GLOW_PALETTE.default;
}
