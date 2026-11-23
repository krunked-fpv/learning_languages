import type { ReactNode } from 'react';
import { useId } from 'react';
import {
  isAdultLanguage,
  resolveUnitProficiencyTier,
  type AdultLanguageCode,
  type LanguageCode,
  type ProficiencyTier,
} from '../../types/contracts';

const INK = '#1E293B';

const LANGUAGE_ACCENTS: Record<LanguageCode, { roof: string; glow: string; hill: string }> = {
  es: { roof: '#EA580C', glow: '#FBBF24', hill: '#FED7AA' },
  fr: { roof: '#4F46E5', glow: '#C4B5FD', hill: '#DDD6FE' },
  de: { roof: '#D97706', glow: '#6EE7B7', hill: '#BBF7D0' },
  it: { roof: '#059669', glow: '#67E8F9', hill: '#BAE6FD' },
  pt: { roof: '#0D9488', glow: '#FDE047', hill: '#CCFBF1' },
  en: { roof: '#1D4ED8', glow: '#FBBF24', hill: '#DBEAFE' },
  zh: { roof: '#DC2626', glow: '#FDE047', hill: '#FEE2E2' },
  ja: { roof: '#DB2777', glow: '#F9A8D4', hill: '#FCE7F3' },
  hi: { roof: '#EA580C', glow: '#FDBA74', hill: '#FEF3C7' },
  bn: { roof: '#047857', glow: '#6EE7B7', hill: '#D1FAE5' },
  ar: { roof: '#059669', glow: '#F59E0B', hill: '#D1FAE5' },
  arz: { roof: '#0284C7', glow: '#FDE047', hill: '#E0F2FE' },
  ru: { roof: '#4F46E5', glow: '#FDA4AF', hill: '#E0E7FF' },
  id: { roof: '#0891B2', glow: '#FB923C', hill: '#CFFAFE' },
  vi: { roof: '#E11D48', glow: '#34D399', hill: '#FFE4E6' },
  sw: { roof: '#D97706', glow: '#38BDF8', hill: '#FEF3C7' },
  ebonics: { roof: '#7C3AED', glow: '#FBBF24', hill: '#EDE9FE' },
  suburban: { roof: '#0284C7', glow: '#FB923C', hill: '#E0F2FE' },
  corp_trades: { roof: '#0F766E', glow: '#5EEAD4', hill: '#CCFBF1' },
  midwest_northeast: { roof: '#B91C1C', glow: '#93C5FD', hill: '#DBEAFE' },
  south_genz: { roof: '#C026D3', glow: '#FDE047', hill: '#FAE8FF' },
  cali_country: { roof: '#059669', glow: '#6EE7B7', hill: '#FFEDD5' },
  stoner_tactical: { roof: '#4D7C0F', glow: '#BEF264', hill: '#E0E7FF' },
};

const SCENERY_SVG_STYLE = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  opacity: 0.9,
} as const;

function DioramaSvg({
  unitOrder,
  skyId,
  skyTop,
  skyMid,
  skyBottom,
  children,
}: {
  unitOrder: number;
  skyId: string;
  skyTop: string;
  skyMid?: string;
  skyBottom: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-unit-scenery={unitOrder}
      style={SCENERY_SVG_STYLE}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          {skyMid ? <stop offset="56%" stopColor={skyMid} /> : null}
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill={`url(#${skyId})`} />
      {children}
    </svg>
  );
}

function Unit6To8Overlay({
  language,
  unitOrder,
  uid,
}: {
  language: LanguageCode;
  unitOrder: number;
  uid: string;
}) {
  const tint = LANGUAGE_ACCENTS[language];

  if (unitOrder === 6) {
    // Unit 6: Music, Art & Playtime Festival
    return (
      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-unit-scenery="6"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.92,
        }}
      >
        <defs>
          <linearGradient id={`u6-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor={tint.hill} />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#u6-sky-${uid})`} />

        {/* Soft rolling festival hills */}
        <path d="M0 310Q160 250 320 295T600 285V420H0Z" fill="#86EFAC" opacity="0.52" />
        <path d="M0 352Q220 310 420 350T600 340V420H0Z" fill="#4ADE80" opacity="0.45" />

        {/* Festive Triangle Bunting */}
        <path d="M0 24Q150 56 300 26T600 26" fill="none" stroke={INK} strokeWidth="2" opacity="0.5" />
        {[40, 90, 140, 190, 410, 460, 510, 560].map((x, idx) => {
          const cols = ['#FB7185', '#FACC15', '#38BDF8', '#A78BFA'];
          return (
            <polygon
              key={x}
              points={`${x - 14},30 ${x + 14},30 ${x},54`}
              fill={cols[idx % cols.length]}
              stroke={INK}
              strokeWidth="1.2"
              opacity="0.82"
            />
          );
        })}

        {/* Left Outdoor Acoustic Music Gazebo */}
        <g transform="translate(22, 238)" opacity="0.9">
          <path d="M0 38L52 4L104 38Z" fill={tint.roof} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="12" y="38" width="80" height="86" rx="4" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
          <path d="M36 124V72C36 58 68 58 68 72V124Z" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
          {/* Floating Musical Notes */}
          <path d="M116 32V6L134 2V26" stroke="#7C3AED" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <circle cx="112" cy="34" r="4.5" fill="#7C3AED" />
          <circle cx="130" cy="28" r="4.5" fill="#7C3AED" />
        </g>

        {/* Right Painter's Easel & Color Pennants */}
        <g transform="translate(476, 250)" opacity="0.9">
          <path d="M38 14L14 116M38 14L62 116M38 14V112" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          <rect x="14" y="22" width="48" height="38" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
          <circle cx="29" cy="38" r="7" fill="#FACC15" />
          <path d="M20 53Q38 36 56 52" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (unitOrder === 7) {
    // Unit 7: Cozy Home & Lantern Village
    return (
      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-unit-scenery="7"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.92,
        }}
      >
        <defs>
          <linearGradient id={`u7-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="55%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#u7-sky-${uid})`} />

        {/* Dusk Rolling Village Hills */}
        <path d="M0 300Q150 250 300 296T600 290V420H0Z" fill="#A5B4FC" opacity="0.45" />
        <path d="M0 344Q200 310 400 346T600 338V420H0Z" fill="#6EE7B7" opacity="0.45" />

        {/* Hanging Cozy Village Lanterns */}
        <path d="M0 28Q300 60 600 28" fill="none" stroke="#78350F" strokeWidth="2" opacity="0.55" />
        {[72, 162, 438, 528].map((x) => (
          <g key={x} transform={`translate(${x}, 36)`}>
            <circle cx="0" cy="18" r="18" fill="#FDE047" opacity="0.34" />
            <rect x="-8" y="6" width="16" height="22" rx="6" fill="#FBBF24" stroke={INK} strokeWidth="1.6" />
            <rect x="-5" y="3" width="10" height="4" rx="1.5" fill="#78350F" />
          </g>
        ))}

        {/* Left & Right Cozy Cottages with Glowing Amber Windows */}
        <g transform="translate(18, 250)" opacity="0.92">
          <rect x="6" y="38" width="82" height="68" rx="4" fill="#FFFBEB" stroke={INK} strokeWidth="2" />
          <path d="M0 40L47 4L94 40Z" fill={tint.roof} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="20" y="54" width="16" height="16" rx="3" fill="#FDE047" stroke={INK} strokeWidth="1.6" />
          <rect x="58" y="54" width="16" height="16" rx="3" fill="#FDE047" stroke={INK} strokeWidth="1.6" />
          <path d="M40 106V76C40 70 54 70 54 76V106Z" fill="#92400E" stroke={INK} strokeWidth="1.6" />
        </g>

        <g transform="translate(490, 260)" opacity="0.92">
          <rect x="8" y="34" width="76" height="62" rx="4" fill="#FFF7ED" stroke={INK} strokeWidth="2" />
          <path d="M2 36L46 2L90 36Z" fill="#E11D48" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="22" y="50" width="16" height="16" rx="3" fill="#FDE047" stroke={INK} strokeWidth="1.6" />
          <rect x="54" y="50" width="16" height="16" rx="3" fill="#FDE047" stroke={INK} strokeWidth="1.6" />
        </g>
      </svg>
    );
  }

  // Unit 8: Starlight Cosmos Observatory
  return (
    <svg
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-unit-scenery="8"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.95,
      }}
    >
      <defs>
        <linearGradient id={`u8-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="58%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill={`url(#u8-sky-${uid})`} />

      {/* Aurora Rainbow Arc */}
      <path d="M50 320A250 180 0 0 1 550 320" fill="none" stroke="#34D399" strokeWidth="16" opacity="0.22" />
      <path d="M85 330A215 150 0 0 1 515 330" fill="none" stroke="#38BDF8" strokeWidth="12" opacity="0.24" />

      {/* Twinkling Starfield */}
      {[
        [45, 55, 2.2],
        [120, 32, 1.8],
        [205, 70, 2.5],
        [365, 42, 2],
        [450, 76, 2.4],
        [540, 44, 2.2],
        [82, 140, 1.8],
        [512, 155, 2],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#FEF08A" opacity="0.88" />
      ))}

      {/* Crescent Moon & Ringed Planet */}
      <path
        d="M84 44C68 46 58 60 60 76C62 91 76 101 91 98C78 96 71 84 71 71C71 58 77 48 84 44Z"
        fill="#FDE047"
      />
      <g transform="translate(500, 72)">
        <ellipse cx="0" cy="0" rx="34" ry="9" transform="rotate(-18)" fill="none" stroke="#67E8F9" strokeWidth="4.5" opacity="0.8" />
        <circle cx="0" cy="0" r="18" fill="#FB7185" />
      </g>

      {/* Starlight Hilltop Observatory Dome */}
      <path d="M0 320Q180 265 360 315T600 305V420H0Z" fill="#3730A3" opacity="0.82" />
      <g transform="translate(22, 240)">
        <rect x="8" y="48" width="72" height="58" rx="4" fill="#E2E8F0" stroke={INK} strokeWidth="2" />
        <path d="M4 48C4 16 84 16 84 48Z" fill="#F59E0B" stroke={INK} strokeWidth="2" />
        {/* Brass Telescope */}
        <rect x="52" y="16" width="38" height="10" rx="4" transform="rotate(-24 52 16)" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
      </g>
    </svg>
  );
}

function TierAtmosphereAccents({ tier }: { tier: ProficiencyTier }) {
  if (tier === 'A1' || tier === 'A2') return null;

  if (tier === 'B1') {
    // Storyweaver twilight firefly dust & soft constellation arcs
    return (
      <g data-tier-atmosphere="B1">
        <path
          d="M52 54Q190 22 315 58T556 42"
          fill="none"
          stroke="#C4B5FD"
          strokeWidth="1.6"
          strokeDasharray="4 7"
          opacity="0.55"
        />
        {[
          [78, 72, 3.2],
          [194, 44, 2.5],
          [312, 62, 3],
          [438, 40, 2.6],
          [526, 78, 3.2],
        ].map(([cx, cy, r], idx) => (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={r * 2.5} fill="#FEF08A" opacity="0.22" />
            <circle cx={cx} cy={cy} r={r} fill="#FDE047" opacity="0.72" />
          </g>
        ))}
      </g>
    );
  }

  if (tier === 'B2') {
    // Wayfinder Diplomat brass compass rose shimmer & floating golden stars
    return (
      <g data-tier-atmosphere="B2">
        <circle cx="528" cy="64" r="28" fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeDasharray="5 5" opacity="0.38" />
        <circle cx="528" cy="64" r="18" fill="none" stroke="#FDE047" strokeWidth="1.2" opacity="0.42" />
        <path d="M528 42L531 61L550 64L531 67L528 86L525 67L506 64L525 61Z" fill="#FDE047" opacity="0.35" />
        {[
          [66, 54, 2.8],
          [176, 38, 2.2],
          [322, 46, 2.6],
          [442, 34, 2.4],
        ].map(([cx, cy, r], idx) => (
          <circle key={idx} cx={cx} cy={cy} r={r} fill="#FBBF24" opacity="0.6" />
        ))}
      </g>
    );
  }

  // C1_C2 Polyglot Laureate aurora ribbons & imperial starlight laurels
  return (
    <g data-tier-atmosphere="C1_C2">
      <path d="M24 88Q165 24 315 74T576 48" fill="none" stroke="#34D399" strokeWidth="10" opacity="0.2" strokeLinecap="round" />
      <path d="M40 108Q195 44 345 92T566 66" fill="none" stroke="#F472B6" strokeWidth="8" opacity="0.2" strokeLinecap="round" />
      {[
        [68, 42, 3.2],
        [152, 68, 2.4],
        [258, 34, 3],
        [362, 56, 2.6],
        [456, 32, 3.2],
        [540, 62, 2.8],
      ].map(([cx, cy, r], idx) => (
        <path
          key={idx}
          d={`M${cx} ${cy - r * 2} L${cx + r * 0.65} ${cy - r * 0.65} L${cx + r * 2} ${cy} L${cx + r * 0.65} ${cy + r * 0.65} L${cx} ${cy + r * 2} L${cx - r * 0.65} ${cy + r * 0.65} L${cx - r * 2} ${cy} L${cx - r * 0.65} ${cy - r * 0.65} Z`}
          fill="#FEF08A"
          opacity="0.78"
        />
      ))}
    </g>
  );
}

function Unit9To16Overlay({
  language,
  unitOrder,
  tier,
  uid,
}: {
  language: LanguageCode;
  unitOrder: number;
  tier: ProficiencyTier;
  uid: string;
}) {
  const tint = LANGUAGE_ACCENTS[language];

  if (tier === 'B1') {
    const isDreamHorizon = unitOrder === 10;
    const isWellnessLake = unitOrder === 11;
    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`u9-11-sky-${uid}`}
        skyTop={isDreamHorizon ? '#E0F2FE' : isWellnessLake ? '#CCFBF1' : '#EDE9FE'}
        skyMid={tint.hill}
        skyBottom="#FEF3C7"
      >
        <TierAtmosphereAccents tier={tier} />
        <path d="M0 302Q155 246 315 294T600 282V420H0Z" fill="#A78BFA" opacity="0.34" />
        <path d="M0 342Q195 304 395 344T600 332V420H0Z" fill={isWellnessLake ? '#2DD4BF' : '#34D399'} opacity="0.46" />
        {/* Storybook Arch / Ruins / Horizon Spire Landmark */}
        <g transform="translate(20, 232)" opacity="0.9">
          <rect x="6" y="42" width="76" height="80" rx="6" fill="#FFFBEB" stroke={INK} strokeWidth="1.9" />
          <path d="M0 44L44 10L88 44Z" fill={tint.roof} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M28 122V76C28 60 60 60 60 76V122Z" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
        </g>
        {isWellnessLake ? (
          <g transform="translate(474, 342)" opacity="0.9">
            <ellipse cx="42" cy="14" rx="28" ry="8" fill="#16A34A" stroke={INK} strokeWidth="1.6" />
            <path d="M42 10C30 4 24 -8 30 -16C36 -11 40 -2 42 10Z" fill="#F472B6" stroke={INK} strokeWidth="1.4" />
            <path d="M42 10C54 4 60 -8 54 -16C48 -11 44 -2 42 10Z" fill="#F472B6" stroke={INK} strokeWidth="1.4" />
            <path d="M42 -18C48 -8 48 4 42 11C36 4 36 -8 42 -18Z" fill="#FCE7F3" stroke={INK} strokeWidth="1.5" />
          </g>
        ) : (
          <g transform="translate(486, 238)" opacity="0.9">
            <rect x="14" y="46" width="58" height="72" rx="4" fill="#E2E8F0" stroke={INK} strokeWidth="1.8" />
            <path d="M10 46C10 18 76 18 76 46Z" fill={tint.glow} stroke={INK} strokeWidth="1.8" />
            <rect x="44" y="18" width="32" height="9" rx="4" transform="rotate(-24 44 18)" fill="#F59E0B" stroke={INK} strokeWidth="1.5" />
          </g>
        )}
      </DioramaSvg>
    );
  }

  if (tier === 'B2') {
    const isFestival = unitOrder === 13;
    const isBridge = unitOrder === 14;
    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`u12-14-sky-${uid}`}
        skyTop={isFestival ? '#FFF1F2' : '#E0F2FE'}
        skyMid="#FEF3C7"
        skyBottom={tint.hill}
      >
        <TierAtmosphereAccents tier={tier} />
        <path d="M0 308Q170 258 340 304T600 294V420H0Z" fill="#6EE7B7" opacity="0.42" />
        <path d="M0 340Q150 324 300 342T600 332V420H0Z" fill="#38BDF8" opacity="0.46" />
        {isFestival && (
          <>
            <path d="M0 26Q150 58 300 24T600 28" fill="none" stroke="#92400E" strokeWidth="2" opacity="0.55" />
            {[64, 152, 448, 536].map((x, idx) => (
              <g key={x} transform={`translate(${x}, 36)`}>
                <circle cx="0" cy="18" r="18" fill="#FDE047" opacity="0.28" />
                <ellipse cx="0" cy="18" rx="10" ry="13" fill={idx % 2 === 0 ? tint.roof : '#F59E0B'} stroke={INK} strokeWidth="1.6" />
              </g>
            ))}
          </>
        )}
        {isBridge && (
          <path d="M120 348Q300 242 480 348" fill="none" stroke={tint.roof} strokeWidth="9" opacity="0.72" />
        )}
        <g transform="translate(22, 240)" opacity="0.9">
          <rect x="8" y="34" width="76" height="84" rx="5" fill="#FFFBEB" stroke={INK} strokeWidth="1.9" />
          <path d="M4 36L46 4L88 36Z" fill={tint.roof} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
          <circle cx="46" cy="70" r="14" fill={tint.glow} stroke={INK} strokeWidth="1.6" />
        </g>
      </DioramaSvg>
    );
  }

  // C1_C2 Polyglot Laureate: Grand Symposium Rotunda & Golden Aurora Peaks
  return (
    <DioramaSvg
      unitOrder={unitOrder}
      skyId={`u15-16-sky-${uid}`}
      skyTop="#1E1B4B"
      skyMid="#4C1D95"
      skyBottom="#701A75"
    >
      <TierAtmosphereAccents tier={tier} />
      <path d="M0 318Q155 268 310 312T600 296V420H0Z" fill="#312E81" opacity="0.82" />
      <path d="M0 352Q210 326 420 354T600 344V420H0Z" fill="#4338CA" opacity="0.72" />
      {/* Grand Laureate Symposium Rotunda Left */}
      <g transform="translate(20, 224)" opacity="0.94">
        <path d="M8 52C8 14 94 14 94 52Z" fill="#F59E0B" stroke={INK} strokeWidth="2" />
        <rect x="14" y="52" width="74" height="72" rx="4" fill="#FEF3C7" stroke={INK} strokeWidth="2" />
        {[26, 44, 62, 76].map((x) => (
          <rect key={x} x={x} y="58" width="7" height="60" rx="2" fill="#FFFBEB" stroke={INK} strokeWidth="1.3" />
        ))}
        <circle cx="51" cy="14" r="6" fill="#FDE047" stroke={INK} strokeWidth="1.5" />
      </g>
      {/* Golden Laureate Torch Tower Right */}
      <g transform="translate(502, 232)" opacity="0.92">
        <rect x="20" y="42" width="44" height="84" rx="4" fill="#E0E7FF" stroke={INK} strokeWidth="1.9" />
        <path d="M14 42L42 10L70 42Z" fill={tint.roof} stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="42" cy="70" r="11" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      </g>
    </DioramaSvg>
  );
}

function AdultCulturalDiorama({
  language,
  unitOrder,
  tier,
  uid,
}: {
  language: AdultLanguageCode;
  unitOrder: number;
  tier: ProficiencyTier;
  uid: string;
}) {
  const flip = unitOrder % 2 === 0;

  if (language === 'ebonics') {
    // The Block & Cookout Ave: brownstone stoop, string lights, cookout grill smoke, boombox (Units 1-16)
    const skyColors =
      tier === 'C1_C2'
        ? { top: '#1E1B4B', mid: '#4C1D95', bottom: '#7C3AED' }
        : tier === 'B2'
          ? { top: '#312E81', mid: '#5B21B6', bottom: '#C4B5FD' }
          : tier === 'B1'
            ? { top: '#4C1D95', mid: '#7C3AED', bottom: '#FDE68A' }
            : tier === 'A2'
              ? { top: '#C4B5FD', mid: '#EDE9FE', bottom: '#FDE68A' }
              : { top: '#DDD6FE', mid: '#F5F3FF', bottom: '#FEF3C7' };

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`eb-sky-${uid}`}
        skyTop={skyColors.top}
        skyMid={skyColors.mid}
        skyBottom={skyColors.bottom}
      >
        <TierAtmosphereAccents tier={tier} />

        {/* Distant neighborhood brownstone skyline silhouettes */}
        <path
          d="M0 296V228H54V242H98V212H156V238H212V222H276V246H334V218H394V240H448V214H512V234H556V220H600V296Z"
          fill="#4C1D95"
          opacity="0.22"
        />

        {/* Sidewalk & Cookout Ave Pavement */}
        <path d="M0 294H600V420H0Z" fill="#64748B" opacity="0.48" />
        <path d="M0 326H600V420H0Z" fill="#334155" opacity="0.46" />
        <line x1="0" y1="326" x2="600" y2="326" stroke="#CBD5E1" strokeWidth="2.5" opacity="0.72" />

        {/* Overhead Draped Block-Party String Lights (placed inside widescreen & mobile safe-zone) */}
        <path d="M0 86Q150 124 300 88Q450 124 600 86" fill="none" stroke={INK} strokeWidth="2.2" opacity="0.72" />
        {[
          [54, 97.3],
          [150, 105.5],
          [246, 98.6],
          [354, 98.6],
          [450, 105.5],
          [546, 97.3],
        ].map(([x, y], idx) => (
          <g key={x} transform={`translate(${x}, ${y})`}>
            <rect x="-2.2" y="-1" width="4.4" height="4.2" rx="1" fill={INK} />
            <circle cx="0" cy="8" r="14" fill="#FDE047" opacity="0.34" />
            <circle
              cx="0"
              cy="8"
              r="5.5"
              fill={idx % 2 === 0 ? '#FEF08A' : '#F59E0B'}
              stroke={INK}
              strokeWidth="1.4"
            />
          </g>
        ))}

        {/* Brownstone Rowhouse with Stoop Steps & Iron Railings */}
        <g transform={flip ? 'translate(438, 152)' : 'translate(14, 152)'} opacity="0.94">
          {/* Facade & Cornice */}
          <rect x="6" y="18" width="136" height="142" rx="4" fill="#9A3412" stroke={INK} strokeWidth="2" />
          <rect x="0" y="10" width="148" height="14" rx="3" fill="#78350F" stroke={INK} strokeWidth="2" />
          {/* Warm glowing apartment windows */}
          <rect x="20" y="36" width="24" height="30" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
          <rect x="62" y="36" width="24" height="30" rx="3" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
          <rect x="104" y="36" width="24" height="30" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
          <rect x="20" y="84" width="24" height="32" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
          <rect x="104" y="84" width="24" height="32" rx="3" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
          {/* Arched Front Door */}
          <path d="M58 122V92C58 80 90 80 90 92V122Z" fill="#4C1D95" stroke={INK} strokeWidth="2" />
          {/* Carved Stone Stoop Steps */}
          <rect x="44" y="122" width="60" height="10" rx="2" fill="#E2E8F0" stroke={INK} strokeWidth="1.7" />
          <rect x="38" y="132" width="72" height="10" rx="2" fill="#CBD5E1" stroke={INK} strokeWidth="1.7" />
          <rect x="32" y="142" width="84" height="10" rx="2" fill="#94A3B8" stroke={INK} strokeWidth="1.7" />
          <rect x="26" y="152" width="96" height="10" rx="2" fill="#64748B" stroke={INK} strokeWidth="1.7" />
          {/* Wrought-iron railings */}
          <path d="M44 122L26 152M104 122L122 152" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        </g>

        {/* Retro Gold & Purple Boombox + Musical Notes */}
        <g transform={flip ? 'translate(372, 272)' : 'translate(168, 272)'} opacity="0.95">
          <path d="M16 14V5C16 3 18 2 20 2H42C44 2 46 3 46 5V14" fill="none" stroke="#FACC15" strokeWidth="3.2" />
          <rect x="4" y="12" width="54" height="34" rx="6" fill="#1E1B4B" stroke="#F59E0B" strokeWidth="2" />
          <rect x="9" y="16" width="44" height="5.5" rx="2" fill="#FDE047" />
          <circle cx="16" cy="32" r="8.5" fill="#0F172A" stroke="#FBBF24" strokeWidth="2" />
          <circle cx="16" cy="32" r="3" fill="#F59E0B" />
          <circle cx="46" cy="32" r="8.5" fill="#0F172A" stroke="#FBBF24" strokeWidth="2" />
          <circle cx="46" cy="32" r="3" fill="#F59E0B" />
          <rect x="26" y="25" width="10" height="13" rx="2" fill="#7C3AED" stroke="#FEF08A" strokeWidth="1.2" />
          {/* Floating notes */}
          <path d="M58 -6V-20L69 -23V-9" stroke="#FACC15" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="56" cy="-5" r="2.8" fill="#FACC15" />
          <circle cx="67" cy="-8" r="2.8" fill="#FACC15" />
        </g>

        {/* Cookout Barrel Grill & Rising Smoke Curls */}
        <g transform={flip ? 'translate(26, 224)' : 'translate(472, 224)'} opacity="0.95">
          {/* Aromatic rising smoke curls */}
          <path d="M32 30C26 18 38 10 31 -4" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" opacity="0.78" />
          <path d="M50 26C44 14 56 6 49 -8" fill="none" stroke="#EDE9FE" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
          <path d="M68 32C62 20 74 12 67 -2" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.64" />
          {/* Grill tripod legs & wheel */}
          <line x1="22" y1="68" x2="14" y2="96" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="78" y1="68" x2="86" y2="96" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="14" cy="95" r="5" fill="#0F172A" stroke="#FACC15" strokeWidth="1.4" />
          {/* Barrel drum & open lid */}
          <path d="M12 44C14 26 86 26 88 44Z" fill="#334155" stroke={INK} strokeWidth="2" />
          <rect x="10" y="44" width="80" height="30" rx="11" fill="#1E293B" stroke={INK} strokeWidth="2" />
          <line x1="14" y1="50" x2="86" y2="50" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="34" cy="43" r="4.5" fill="#EA580C" stroke={INK} strokeWidth="1.2" />
          <circle cx="50" cy="42" r="5" fill="#EF4444" stroke={INK} strokeWidth="1.2" />
          <circle cx="66" cy="43" r="4.5" fill="#F59E0B" stroke={INK} strokeWidth="1.2" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'suburban') {
    // Suburban (suburban — The Cul-de-Sac & Craft Patio: striped lawn, pergola, kettle grill, string lights, white-picket fence)
    const skyColors =
      tier === 'C1_C2'
        ? { top: '#1E1B4B', mid: '#075985', bottom: '#38BDF8' }
        : tier === 'B2'
          ? { top: '#0284C7', mid: '#FDBA74', bottom: '#E0F2FE' }
          : tier === 'B1'
            ? { top: '#7DD3FC', mid: '#FED7AA', bottom: '#D1FAE5' }
            : tier === 'A2'
              ? { top: '#BAE6FD', mid: '#FEF3C7', bottom: '#BBF7D0' }
              : { top: '#E0F2FE', mid: '#BAE6FD', bottom: '#DCFCE7' };

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`sb-sky-${uid}`}
        skyTop={skyColors.top}
        skyMid={skyColors.mid}
        skyBottom={skyColors.bottom}
      >
        <TierAtmosphereAccents tier={tier} />

        {/* Warm Sun & Fluffy Clouds (placed inside widescreen & mobile safe-zone) */}
        <circle cx={flip ? 102 : 498} cy="136" r="24" fill="#FDE047" opacity={tier === 'C1_C2' ? 0.3 : 0.78} />
        <g fill="#FFFFFF" opacity={tier === 'C1_C2' ? 0.25 : 0.8}>
          <ellipse cx="220" cy="128" rx="34" ry="13" />
          <ellipse cx="242" cy="122" rx="22" ry="11" />
          <ellipse cx="388" cy="132" rx="30" ry="12" />
        </g>

        {/* Rolling Manicured Striped Lawn */}
        <path d="M0 272Q160 256 320 272T600 268V420H0Z" fill="#4ADE80" opacity="0.88" />
        {[0, 96, 192, 288, 384, 480, 576].map((sx) => (
          <polygon
            key={sx}
            points={`${sx},266 ${sx + 48},266 ${sx + 16},420 ${sx - 32},420`}
            fill="#22C55E"
            opacity="0.52"
          />
        ))}

        {/* White-Picket Fence across Lawn Horizon */}
        <rect x="0" y="254" width="600" height="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
        <rect x="0" y="272" width="600" height="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
        {Array.from({ length: 24 }, (_, idx) => idx * 26 + 4).map((px) => (
          <path
            key={px}
            d={`M${px} 288V244L${px + 7} 235L${px + 14} 244V288Z`}
            fill="#FFFFFF"
            stroke="#64748B"
            strokeWidth="1.2"
          />
        ))}

        {/* Overhead Edison Patio String Lights */}
        <path d="M0 86Q150 124 300 88Q450 124 600 86" fill="none" stroke="#78350F" strokeWidth="2.1" opacity="0.7" />
        {[
          [54, 97.3],
          [150, 105.5],
          [246, 98.6],
          [354, 98.6],
          [450, 105.5],
          [546, 97.3],
        ].map(([x, y]) => (
          <g key={x} transform={`translate(${x}, ${y})`}>
            <rect x="-2" y="-1" width="4" height="4" rx="1" fill="#78350F" />
            <circle cx="0" cy="7.5" r="13" fill="#FDE047" opacity="0.34" />
            <circle cx="0" cy="7.5" r="5" fill="#FEF08A" stroke={INK} strokeWidth="1.4" />
          </g>
        ))}

        {/* Craft Timber Pergola & Cozy Patio */}
        <g transform={flip ? 'translate(436, 158)' : 'translate(16, 158)'} opacity="0.94">
          {/* Stone Patio Deck */}
          <rect x="4" y="138" width="144" height="22" rx="5" fill="#E2E8F0" stroke={INK} strokeWidth="1.8" />
          {/* Timber Columns & Slatted Pergola Roof */}
          <rect x="18" y="34" width="12" height="106" fill="#92400E" stroke={INK} strokeWidth="1.8" />
          <rect x="122" y="34" width="12" height="106" fill="#92400E" stroke={INK} strokeWidth="1.8" />
          <rect x="2" y="22" width="148" height="14" rx="4" fill="#B45309" stroke={INK} strokeWidth="2" />
          {[26, 48, 70, 92, 114].map((rx) => (
            <rect key={rx} x={rx} y="14" width="10" height="10" rx="2" fill="#D97706" stroke={INK} strokeWidth="1.4" />
          ))}
          {/* Pergola String Lights */}
          <path d="M24 38Q76 56 128 38" fill="none" stroke={INK} strokeWidth="1.6" />
          {[46, 76, 106].map((lx) => (
            <circle key={lx} cx={lx} cy={47} r="4.5" fill="#FDE047" stroke={INK} strokeWidth="1.2" />
          ))}
          {/* Adirondack Patio Chair */}
          <path d="M46 96L54 128H92L100 96" fill="#0284C7" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="42" y="120" width="62" height="10" rx="3" fill="#38BDF8" stroke={INK} strokeWidth="1.6" />
          <line x1="50" y1="130" x2="48" y2="142" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="96" y1="130" x2="98" y2="142" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Coral-Red Kettle Grill & Curling Charcoal Smoke */}
        <g transform={flip ? 'translate(34, 218)' : 'translate(474, 218)'} opacity="0.95">
          <path d="M52 24C46 14 58 6 51 -4" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.82" />
          <path d="M66 28C60 18 72 10 65 0" fill="none" stroke="#E0F2FE" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
          <line x1="34" y1="74" x2="24" y2="104" stroke="#64748B" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="62" y1="74" x2="72" y2="104" stroke="#64748B" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="48" y1="76" x2="48" y2="104" stroke="#94A3B8" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="102" r="5" fill="#1E293B" stroke="#E2E8F0" strokeWidth="1.4" />
          <path d="M22 56H74C74 71 62 79 48 79C34 79 22 71 22 56Z" fill="#EA580C" stroke={INK} strokeWidth="2" />
          <path d="M20 54C20 39 32 32 48 32C64 32 76 39 76 54Z" fill="#F97316" stroke={INK} strokeWidth="2" />
          <line x1="18" y1="55" x2="78" y2="55" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="41" y="25" width="14" height="7" rx="2.5" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'corp_trades') {
    // The Synergy Cubicle & Drywall Frontier: LinkedIn glass cubicle left <-> caution drywall jobsite right
    const sky = {
      A1: { top: '#ECFEFF', mid: '#E0F2FE', bottom: '#FEF3C7' },
      A2: { top: '#CCFBF1', mid: '#F0FDFA', bottom: '#FDE68A' },
      B1: { top: '#99F6E4', mid: '#FDE68A', bottom: '#FDBA74' },
      B2: { top: '#0F766E', mid: '#1E3A8A', bottom: '#F59E0B' },
      C1_C2: { top: '#0F172A', mid: '#115E59', bottom: '#78350F' },
    }[tier];

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`ct-sky-${uid}`}
        skyTop={sky.top}
        skyMid={sky.mid}
        skyBottom={sky.bottom}
      >
        <TierAtmosphereAccents tier={tier} />
        <g data-adult-diorama="corp_trades">
          {/* Left Skyscraper Glass Silhouettes vs Right Steel Crane Boom */}
          <path
            d="M0 288V158H54V186H98V134H152V208H206V170H264V288Z"
            fill="#0F766E"
            opacity="0.24"
          />
          <g stroke="#B45309" strokeWidth="3.5" opacity="0.45">
            <line x1="538" y1="92" x2="538" y2="290" />
            <line x1="368" y1="108" x2="574" y2="92" />
            <line x1="418" y1="104" x2="418" y2="152" strokeWidth="2.2" />
            <path d="M412 152C412 162 424 162 424 152" fill="none" strokeWidth="2.5" />
          </g>

          {/* Split Floor: Cool Office Carpet Left | Amber Jobsite Plywood Right */}
          <path d="M0 290H300V420H0Z" fill="#0F766E" opacity="0.22" />
          <path d="M300 290H600V420H300Z" fill="#D97706" opacity="0.28" />
          <path d="M0 330H300V420H0Z" fill="#334155" opacity="0.26" />
          <path d="M300 330H600V420H300Z" fill="#78350F" opacity="0.26" />

          {/* Center Hazard-Stripe Seam & Synergy-to-Drywall Bridge */}
          <rect x="292" y="290" width="16" height="130" fill="#F59E0B" opacity="0.72" />
          {[300, 326, 352, 378, 404].map((hy) => (
            <polygon
              key={hy}
              points={`292,${hy} 308,${hy + 12} 308,${hy + 22} 292,${hy + 10}`}
              fill="#1E293B"
              opacity="0.65"
            />
          ))}

          {/* Overhead Dual Lighting: Sleek Office Pendant Left & Amber Cage Drop-Lights Right */}
          <path d="M18 92Q146 118 286 92" fill="none" stroke="#0F766E" strokeWidth="2" opacity="0.65" />
          {[68, 152, 236].map((lx) => (
            <g key={lx} transform={`translate(${lx}, 103)`}>
              <rect x="-12" y="0" width="24" height="7" rx="3" fill="#0F766E" stroke={INK} strokeWidth="1.3" />
              <circle cx="0" cy="11" r="10" fill="#5EEAD4" opacity="0.34" />
            </g>
          ))}
          <path d="M314 92Q452 118 582 92" fill="none" stroke="#78350F" strokeWidth="2" opacity="0.65" />
          {[364, 448, 532].map((lx) => (
            <g key={lx} transform={`translate(${lx}, 103)`}>
              <circle cx="0" cy="8" r="13" fill="#FDE047" opacity="0.36" />
              <circle cx="0" cy="8" r="5.5" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
            </g>
          ))}

          {/* Left World: The Synergy Cubicle Desk, Dual Monitors & "in" Plaque */}
          <g transform={flip ? 'translate(34, 184)' : 'translate(16, 184)'} opacity="0.95">
            <rect x="6" y="18" width="146" height="96" rx="6" fill="#E0F2FE" stroke={INK} strokeWidth="2" />
            <rect x="14" y="26" width="38" height="24" rx="4" fill="#0284C7" stroke={INK} strokeWidth="1.6" />
            <circle cx="25" cy="34" r="2.6" fill="#FFFFFF" />
            <rect x="23" y="38" width="4" height="9" rx="1" fill="#FFFFFF" />
            <path d="M31 47V38H35V40C37 37 43 37 43 42V47H39V42C39 40 35 40 35 43V47Z" fill="#FFFFFF" />
            {/* Dual Synergy Monitors */}
            <rect x="62" y="24" width="76" height="44" rx="5" fill="#1E293B" stroke={INK} strokeWidth="2" />
            <rect x="68" y="30" width="64" height="32" rx="2" fill="#ECFEFF" />
            <path d="M74 56L90 44L104 49L122 35" stroke="#0F766E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="94" y="68" width="12" height="10" fill="#64748B" />
            {/* Standing Desk & Oat-Latte Mug */}
            <rect x="2" y="78" width="154" height="14" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
            <rect x="18" y="92" width="10" height="44" fill="#334155" />
            <rect x="132" y="92" width="10" height="44" fill="#334155" />
            <rect x="26" y="58" width="16" height="20" rx="3" fill="#0F766E" stroke={INK} strokeWidth="1.6" />
          </g>

          {/* Right World: Drywall Timber Framing, Yellow Hard Hat & Amber Caution Sawhorse */}
          <g transform={flip ? 'translate(418, 174)' : 'translate(432, 174)'} opacity="0.95">
            {/* Stud Framing Wall */}
            <rect x="14" y="14" width="134" height="104" rx="4" fill="#FEF3C7" stroke={INK} strokeWidth="2" />
            <rect x="10" y="10" width="142" height="10" rx="2" fill="#B45309" stroke={INK} strokeWidth="1.8" />
            {[28, 60, 92, 124].map((sx) => (
              <rect key={sx} x={sx} y="20" width="9" height="96" fill="#D97706" stroke={INK} strokeWidth="1.5" />
            ))}
            {/* Caution Sawhorse & Red Toolbox */}
            <line x1="22" y1="114" x2="10" y2="148" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="126" y1="114" x2="138" y2="148" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
            <rect x="8" y="104" width="134" height="14" rx="3" fill="#F59E0B" stroke={INK} strokeWidth="2" />
            {/* Hard Hat perched cleanly */}
            <path d="M24 104C24 85 37 78 52 78C67 78 80 85 80 104Z" fill="#FACC15" stroke={INK} strokeWidth="2" />
            <rect x="49" y="76" width="6" height="18" rx="2" fill="#FEF08A" stroke={INK} strokeWidth="1.4" />
            <rect x="18" y="101" width="68" height="6" rx="3" fill="#EAB308" stroke={INK} strokeWidth="1.8" />
            {/* Toolbox & Energy Can */}
            <rect x="92" y="82" width="42" height="22" rx="4" fill="#DC2626" stroke={INK} strokeWidth="1.9" />
            <rect x="104" y="75" width="18" height="7" rx="2" fill="none" stroke={INK} strokeWidth="2" />
          </g>
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'midwest_northeast') {
    // The Ope-to-Fuggedaboutit Turnpike: Snowy Midwest pine porch left <-> Red-brick NYC bodega & taxi right
    const sky = {
      A1: { top: '#DBEAFE', mid: '#EFF6FF', bottom: '#FCE7F3' },
      A2: { top: '#BAE6FD', mid: '#F0F9FF', bottom: '#FEE2E2' },
      B1: { top: '#93C5FD', mid: '#FCA5A5', bottom: '#FEF3C7' },
      B2: { top: '#1E3A8A', mid: '#991B1B', bottom: '#FDBA74' },
      C1_C2: { top: '#1E1B4B', mid: '#7F1D1D', bottom: '#312E81' },
    }[tier];

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`mn-sky-${uid}`}
        skyTop={sky.top}
        skyMid={sky.mid}
        skyBottom={sky.bottom}
      >
        <TierAtmosphereAccents tier={tier} />
        <g data-adult-diorama="midwest_northeast">
          {/* Drifting Snowflakes Left vs Distant Suspension Bridge Towers Right */}
          {[
            [62, 126],
            [118, 94],
            [176, 142],
            [228, 108],
            [86, 174],
          ].map(([sx, sy], i) => (
            <circle key={i} cx={sx} cy={sy} r="3.2" fill="#FFFFFF" opacity="0.86" />
          ))}
          <path
            d="M342 260V146L354 146V260M508 260V146L520 146V260M300 220Q430 148 598 214"
            fill="none"
            stroke="#991B1B"
            strokeWidth="3.5"
            opacity="0.34"
          />

          {/* Ground: Crisp Snowbanks Left | Brick Sidewalk & Asphalt Turnpike Center-Right */}
          <path d="M0 278Q145 256 290 284V420H0Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
          <path d="M276 284H600V420H276Z" fill="#475569" opacity="0.65" />
          <path d="M350 284H600V334H350Z" fill="#CBD5E1" opacity="0.7" />
          {/* Dashed Turnpike Divider */}
          <path d="M294 286V418" stroke="#FACC15" strokeWidth="4" strokeDasharray="12 10" strokeLinecap="round" />

          {/* Left World: Snow-Dusted Pine & Cozy Clapboard Porch with Steaming Casserole */}
          <g transform={flip ? 'translate(26, 174)' : 'translate(14, 174)'} opacity="0.95">
            {/* Evergreen Pine with Snow Cap */}
            <rect x="26" y="100" width="10" height="32" fill="#78350F" />
            <polygon points="31,14 6,62 56,62" fill="#059669" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
            <polygon points="31,42 2,98 60,98" fill="#10B981" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
            <polygon points="31,14 19,36 43,36" fill="#FFFFFF" />
            {/* Porch Cabin & Casserole Table */}
            <rect x="64" y="42" width="90" height="86" rx="4" fill="#EFF6FF" stroke={INK} strokeWidth="2" />
            <polygon points="56,44 109,8 162,44" fill="#60A5FA" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <rect x="78" y="60" width="24" height="24" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
            <rect x="116" y="64" width="24" height="64" rx="3" fill="#92400E" stroke={INK} strokeWidth="1.8" />
            {/* Casserole Dish */}
            <rect x="70" y="108" width="38" height="16" rx="5" fill="#FB7185" stroke={INK} strokeWidth="1.8" />
            <ellipse cx="89" cy="108" rx="17" ry="5" fill="#FDE047" stroke="#D97706" strokeWidth="1.4" />
          </g>

          {/* Right World: Red-Brick NYC Bodega, Awning & Yellow Taxi */}
          <g transform={flip ? 'translate(414, 162)' : 'translate(424, 162)'} opacity="0.95">
            <rect x="14" y="16" width="136" height="128" rx="4" fill="#B91C1C" stroke={INK} strokeWidth="2" />
            <rect x="8" y="10" width="148" height="12" rx="3" fill="#7F1D1D" stroke={INK} strokeWidth="1.8" />
            {/* Glowing Upper Windows */}
            <rect x="28" y="32" width="24" height="26" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.7" />
            <rect x="68" y="32" width="24" height="26" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.7" />
            <rect x="108" y="32" width="24" height="26" rx="3" fill="#FDE68A" stroke={INK} strokeWidth="1.7" />
            {/* Striped Bodega Awning */}
            <path d="M10 72H154L160 92H4Z" fill="#FACC15" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            {[28, 62, 96, 130].map((ax) => (
              <rect key={ax} x={ax} y="73" width="16" height="18" fill="#DC2626" />
            ))}
            {/* Parked Yellow NYC Taxi */}
            <g transform="translate(-8, 108)">
              <rect x="44" y="-8" width="22" height="9" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.6" />
              <path d="M12 12L24 -1H86L98 12H112V36H4V12Z" fill="#FACC15" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <rect x="18" y="18" width="76" height="6" fill="#111827" />
              {[22, 34, 46, 58, 70, 82].map((cx) => (
                <rect key={cx} x={cx} y="18" width="6" height="6" fill="#FFFFFF" />
              ))}
              <circle cx="24" cy="36" r="9" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.8" />
              <circle cx="88" cy="36" r="9" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.8" />
            </g>
          </g>
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'south_genz') {
    // Front Porch Sweet Tea & The For-You Swamp: Magnolia porch left <-> neon ring-light creator dock right
    const sky = {
      A1: { top: '#FEF3C7', mid: '#FDE68A', bottom: '#FCE7F3' },
      A2: { top: '#FDE68A', mid: '#FED7AA', bottom: '#F5D0FE' },
      B1: { top: '#FDBA74', mid: '#F472B6', bottom: '#C084FC' },
      B2: { top: '#7E22CE', mid: '#BE185D', bottom: '#F59E0B' },
      C1_C2: { top: '#1E1B4B', mid: '#701A75', bottom: '#4C1D95' },
    }[tier];

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`sg-sky-${uid}`}
        skyTop={sky.top}
        skyMid={sky.mid}
        skyBottom={sky.bottom}
      >
        <TierAtmosphereAccents tier={tier} />
        <g data-adult-diorama="south_genz">
          {/* Golden Peach Porch Sun Left vs Neon For-You Aura Right */}
          <circle cx={flip ? 112 : 96} cy="118" r="28" fill="#FBBF24" opacity="0.7" />
          <path d="M446 112A54 54 0 0 1 554 112" fill="none" stroke="#EC4899" strokeWidth="5" opacity="0.4" />
          <path d="M466 116A34 34 0 0 1 534 116" fill="none" stroke="#22D3EE" strokeWidth="4" opacity="0.45" />

          {/* Rolling Southern Lawn Left & Bioluminescent Swamp Water Right */}
          <path d="M0 284Q150 264 300 292V420H0Z" fill="#4ADE80" opacity="0.42" />
          <path d="M270 292Q435 276 600 292V420H270Z" fill="#4C1D95" opacity="0.52" />
          <path d="M312 342Q456 332 580 348" stroke="#22D3EE" strokeWidth="2.8" strokeLinecap="round" opacity="0.55" fill="none" />

          {/* Hanging Spanish Moss & Neon Fireflies */}
          <path d="M0 78Q140 108 286 82" fill="none" stroke="#15803D" strokeWidth="4" opacity="0.45" />
          {[42, 92, 148, 210].map((mx) => (
            <path key={mx} d={`M${mx} 88C${mx - 6} 112 ${mx + 6} 124 ${mx} 144`} stroke="#86EFAC" strokeWidth="4.5" strokeLinecap="round" opacity="0.55" fill="none" />
          ))}
          {[196, 252, 344, 412].map((fx, i) => (
            <circle key={fx} cx={fx} cy={222 + (i % 2) * 24} r="4" fill={i < 2 ? '#FDE047' : '#F0ABFC'} opacity="0.82" />
          ))}

          {/* Left World: White-Column Southern Porch & Sweet Tea Mason Jar */}
          <g transform={flip ? 'translate(22, 166)' : 'translate(14, 166)'} opacity="0.95">
            <rect x="6" y="18" width="144" height="122" rx="4" fill="#FFFBEB" stroke={INK} strokeWidth="2" />
            <polygon points="0,20 78,-10 156,20" fill="#D97706" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            {/* White Fluted Porch Columns */}
            <rect x="16" y="20" width="16" height="114" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
            <rect x="124" y="20" width="16" height="114" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
            <rect x="0" y="134" width="156" height="16" rx="4" fill="#B45309" stroke={INK} strokeWidth="2" />
            {/* Sweet Tea Jar on Porch Table */}
            <rect x="52" y="108" width="52" height="26" rx="4" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
            <rect x="66" y="74" width="24" height="34" rx="5" fill="#D97706" stroke={INK} strokeWidth="1.8" />
            <circle cx="72" cy="76" r="5" fill="#FACC15" stroke={INK} strokeWidth="1.3" />
          </g>

          {/* Right World: Swamp Boardwalk & Glowing Ring-Light / Smartphone Rig */}
          <g transform={flip ? 'translate(418, 174)' : 'translate(426, 174)'} opacity="0.95">
            <rect x="4" y="122" width="152" height="18" rx="4" fill="#78350F" stroke={INK} strokeWidth="2" />
            <rect x="20" y="140" width="12" height="26" fill="#451A03" />
            <rect x="124" y="140" width="12" height="26" fill="#451A03" />
            {/* Neon Ring-Light Tripod */}
            <line x1="56" y1="68" x2="36" y2="122" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="56" y1="68" x2="76" y2="122" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="56" cy="44" r="24" fill="none" stroke="#EC4899" strokeWidth="8" opacity="0.4" />
            <circle cx="56" cy="44" r="21" fill="none" stroke="#F0ABFC" strokeWidth="5" />
            <circle cx="56" cy="44" r="21" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
            {/* Giant Glowing For-You Phone */}
            <rect x="92" y="34" width="46" height="84" rx="8" fill="#0F172A" stroke="#22D3EE" strokeWidth="2.4" />
            <rect x="98" y="42" width="34" height="66" rx="4" fill="#3B0764" />
            <polygon points="116,56 107,74 114,74 110,90 124,70 117,70" fill="#E879F9" />
          </g>
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'cali_country') {
    // The Erewhon Juice Bar & Holler Creek: Malibu matcha/surfboard left <-> cedar cabin & tailgate right
    const sky = {
      A1: { top: '#ECFDF5', mid: '#CCFBF1', bottom: '#FEF3C7' },
      A2: { top: '#A7F3D0', mid: '#FEF9C3', bottom: '#FED7AA' },
      B1: { top: '#6EE7B7', mid: '#FDBA74', bottom: '#FB923C' },
      B2: { top: '#065F46', mid: '#9A3412', bottom: '#F59E0B' },
      C1_C2: { top: '#064E3B', mid: '#1E1B4B', bottom: '#7C2D12' },
    }[tier];

    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`cc-sky-${uid}`}
        skyTop={sky.top}
        skyMid={sky.mid}
        skyBottom={sky.bottom}
      >
        <TierAtmosphereAccents tier={tier} />
        <g data-adult-diorama="cali_country">
          {/* California Sun & Palm Silhouettes Left vs Blue Ridge Peaks Right */}
          <circle cx={flip ? 114 : 92} cy="116" r="26" fill="#FDE047" opacity="0.8" />
          <path d="M276 286L364 196L448 264L526 186L600 258V310H276Z" fill="#047857" opacity="0.48" />

          {/* Center Sparkling Creek & Stepping Stones */}
          <path d="M0 296H270V420H0Z" fill="#FEF3C7" opacity="0.58" />
          <path d="M330 296H600V420H330Z" fill="#15803D" opacity="0.42" />
          <path d="M255 292Q298 340 278 420H342Q360 340 318 292Z" fill="#38BDF8" opacity="0.72" />
          {[312, 344, 378].map((sy, idx) => (
            <ellipse key={sy} cx={idx % 2 === 0 ? 296 : 316} cy={sy} rx="16" ry="7" fill="#CBD5E1" stroke={INK} strokeWidth="1.4" />
          ))}

          {/* Left World: Erewhon Juice Bar Kiosk, Surfboard & Cold-Plunge Tub */}
          <g transform={flip ? 'translate(22, 174)' : 'translate(14, 174)'} opacity="0.95">
            <rect x="20" y="34" width="118" height="96" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
            <path d="M12 36H146L152 54H6Z" fill="#059669" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            {[30, 66, 102].map((ax) => (
              <rect key={ax} x={ax} y="37" width="18" height="16" fill="#A7F3D0" />
            ))}
            {/* Matcha Blender Counter */}
            <rect x="44" y="64" width="26" height="28" rx="4" fill="#10B981" stroke={INK} strokeWidth="1.8" />
            <rect x="86" y="70" width="24" height="22" rx="4" fill="#D97706" stroke={INK} strokeWidth="1.8" />
            {/* Leaning Surfboard */}
            <g transform="translate(14, 86) rotate(-14)">
              <ellipse cx="0" cy="0" rx="11" ry="38" fill="#38BDF8" stroke={INK} strokeWidth="1.9" />
              <line x1="0" y1="-34" x2="0" y2="34" stroke="#F472B6" strokeWidth="4" />
            </g>
            {/* Copper Cold-Plunge Tub */}
            <rect x="92" y="102" width="54" height="28" rx="8" fill="#EA580C" stroke={INK} strokeWidth="1.9" />
            <ellipse cx="119" cy="102" rx="25" ry="6" fill="#BAE6FD" stroke={INK} strokeWidth="1.6" />
          </g>

          {/* Right World: Cedar Holler Cabin & Pickup Tailgate */}
          <g transform={flip ? 'translate(418, 172)' : 'translate(426, 172)'} opacity="0.95">
            <rect x="116" y="10" width="14" height="28" fill="#78350F" stroke={INK} strokeWidth="1.8" />
            <path d="M123 4C118 -4 128 -10 123 -18" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.8" />
            <rect x="20" y="40" width="124" height="84" rx="4" fill="#92400E" stroke={INK} strokeWidth="2" />
            <path d="M20 58H144M20 78H144M20 98H144" stroke="#78350F" strokeWidth="2" />
            <polygon points="8,42 82,4 156,42" fill="#B45309" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <rect x="34" y="56" width="26" height="26" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
            {/* Tailgate & Duct Tape */}
            <rect x="74" y="92" width="74" height="36" rx="5" fill="#EA580C" stroke={INK} strokeWidth="2" />
            <circle cx="96" cy="110" r="11" fill="#CBD5E1" stroke={INK} strokeWidth="1.7" />
            <circle cx="96" cy="110" r="4.5" fill="#475569" />
          </g>
        </g>
      </DioramaSvg>
    );
  }

  // stoner_tactical — The Half-Pipe Hotbox & Perimeter Cul-de-Sac
  const sky = {
    A1: { top: '#ECFCCB', mid: '#D9F99D', bottom: '#E0E7FF' },
    A2: { top: '#BEF264', mid: '#ECFCCB', bottom: '#C7D2FE' },
    B1: { top: '#A3E635', mid: '#FDE68A', bottom: '#818CF8' },
    B2: { top: '#365314', mid: '#312E81', bottom: '#4338CA' },
    C1_C2: { top: '#1A2E05', mid: '#1E1B4B', bottom: '#0F172A' },
  }[tier];

  return (
    <DioramaSvg
      unitOrder={unitOrder}
      skyId={`st-sky-${uid}`}
      skyTop={sky.top}
      skyMid={sky.mid}
      skyBottom={sky.bottom}
    >
      <TierAtmosphereAccents tier={tier} />
      <g data-adult-diorama="stoner_tactical">
        {/* Dreamy Swirling Clouds Left vs Laser Rangefinder Arc Right */}
        <g transform={`translate(${flip ? 116 : 92}, 116)`} opacity="0.88">
          <path
            d="M-36 12C-44 12 -50 4 -48 -4C-46 -12 -38 -16 -30 -14C-24 -32 -4 -38 14 -30C28 -36 48 -28 50 -12C60 -12 68 -2 66 8C64 16 56 18 48 18H-30Z"
            fill="#FFFFFF"
            stroke="#4D7C0F"
            strokeWidth="2"
          />
          <path
            d="M6 -4C6 -9 12 -11 15 -8C19 -3 15 5 7 6C-3 7 -9 -2 -6 -11"
            stroke="#84CC16"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Ground: Concrete Skate Bowl Left | Precision Bermuda Mower Stripes Right */}
        <path d="M0 286H300V420H0Z" fill="#CBD5E1" opacity="0.65" />
        <path d="M300 286H600V420H300Z" fill="#22C55E" opacity="0.84" />
        {[300, 368, 436, 504, 572].map((mx) => (
          <polygon
            key={mx}
            points={`${mx},286 ${mx + 34},286 ${mx + 12},420 ${mx - 22},420`}
            fill="#15803D"
            opacity="0.55"
          />
        ))}

        {/* Orange Perimeter Safety Cones along Center Curb */}
        {[304, 360].map((cy, idx) => (
          <g key={cy} transform={`translate(298, ${cy})`}>
            <polygon points="-9,14 0,-12 9,14" fill="#F97316" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
            <rect x="-12" y="12" width="24" height="5" rx="2" fill="#EA580C" stroke={INK} strokeWidth="1.4" />
            {idx === 0 && <line x1="-5" y1="2" x2="5" y2="2" stroke="#FFFFFF" strokeWidth="2.4" />}
          </g>
        ))}

        {/* Left World: Lime-Green Half-Pipe Ramp & Skateboard */}
        <g transform={flip ? 'translate(22, 184)' : 'translate(14, 184)'} opacity="0.95">
          <path d="M8 22C24 92 78 106 148 104V136H8Z" fill="#14B8A6" stroke={INK} strokeWidth="2.2" />
          <path d="M8 22C24 92 78 106 148 104" fill="none" stroke="#BEF264" strokeWidth="5" strokeLinecap="round" />
          {/* Skateboard on Coping */}
          <g transform="translate(88, 72) rotate(-18)">
            <rect x="-32" y="-6" width="64" height="11" rx="5.5" fill="#84CC16" stroke={INK} strokeWidth="2" />
            <circle cx="-18" cy="9" r="5" fill="#EC4899" stroke={INK} strokeWidth="1.6" />
            <circle cx="18" cy="9" r="5" fill="#EC4899" stroke={INK} strokeWidth="1.6" />
          </g>
          {/* Striped Late-Night Taco Bag */}
          <rect x="24" y="102" width="32" height="32" rx="4" fill="#FEF3C7" stroke={INK} strokeWidth="1.8" />
          <path d="M24 114H56" stroke="#C026D3" strokeWidth="4" />
        </g>

        {/* Right World: Tactical Cul-de-Sac Command Gazebo, Rangefinder Tripod & Mower */}
        <g transform={flip ? 'translate(418, 174)' : 'translate(426, 174)'} opacity="0.95">
          {/* Rangefinder Radar Shed */}
          <rect x="34" y="34" width="96" height="86" rx="5" fill="#312E81" stroke={INK} strokeWidth="2" />
          <polygon points="24,36 82,6 140,36" fill="#4338CA" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          {/* Glowing Cyan Rangefinder Reticle Window */}
          <circle cx="82" cy="70" r="20" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.2" />
          <circle cx="82" cy="70" r="11" stroke="#38BDF8" strokeWidth="1.4" strokeDasharray="4 3" />
          <line x1="82" y1="48" x2="82" y2="92" stroke="#38BDF8" strokeWidth="1.5" />
          <line x1="60" y1="70" x2="104" y2="70" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="82" cy="70" r="3" fill="#BEF264" />
          {/* Tactical Riding Lawn-Mower */}
          <rect x="4" y="102" width="52" height="24" rx="6" fill="#4D7C0F" stroke={INK} strokeWidth="2" />
          <rect x="14" y="88" width="22" height="14" rx="4" fill="#1E293B" stroke={INK} strokeWidth="1.8" />
          <circle cx="14" cy="126" r="9" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.8" />
          <circle cx="48" cy="127" r="7" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.6" />
        </g>
      </g>
    </DioramaSvg>
  );
}

export function RegionalScenery({
  language,
  unitOrder,
  proficiencyTier,
}: {
  language: LanguageCode;
  unitOrder: number;
  proficiencyTier?: ProficiencyTier;
}) {
  const uid = useId().replace(/:/g, '');
  const resolvedTier = proficiencyTier ?? resolveUnitProficiencyTier(unitOrder);

  if (isAdultLanguage(language)) {
    return (
      <AdultCulturalDiorama
        language={language}
        unitOrder={unitOrder}
        tier={resolvedTier}
        uid={uid}
      />
    );
  }

  if (unitOrder >= 9) {
    return (
      <Unit9To16Overlay
        language={language}
        unitOrder={unitOrder}
        tier={resolvedTier}
        uid={uid}
      />
    );
  }

  if (unitOrder >= 6) {
    return <Unit6To8Overlay language={language} unitOrder={unitOrder} uid={uid} />;
  }

  if (language === 'es') {
    return (
      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-unit-scenery={unitOrder}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      >
        <defs>
          <linearGradient id={`es-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="100%" stopColor="#FFEDD5" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#es-sky-${uid})`} />

        {/* Distant warm Pyrenees peaks */}
        <path d="M0 320L95 215L190 305L310 195L430 295L535 210L600 280V420H0Z" fill="#FED7AA" opacity="0.7" />
        <path d="M68 245L95 215L122 245L108 238L95 247L82 238Z" fill="#FFFBEB" opacity="0.85" />
        <path d="M282 225L310 195L338 225L324 218L310 227L296 218Z" fill="#FFFBEB" opacity="0.85" />

        {/* Warm Andalusian/Castilian Sun */}
        <circle cx={unitOrder % 2 === 0 ? 505 : 95} cy="72" r="34" fill="#FDE047" opacity="0.78" />
        <circle cx={unitOrder % 2 === 0 ? 505 : 95} cy="72" r="24" fill="#FBBF24" opacity="0.85" />

        {/* Festive Papel Picado Banners across top */}
        <path d="M0 24Q150 48 300 22T600 26" fill="none" stroke="#9A3412" strokeWidth="1.8" opacity="0.55" />
        {[35, 85, 135, 185, 415, 465, 515, 565].map((x, idx) => {
          const colors = ['#F43F5E', '#FBBF24', '#0EA5E9', '#10B981'];
          return (
            <path
              key={x}
              d={`M${x - 16} 28L${x + 16} 28L${x + 12} 54L${x} 48L${x - 12} 54Z`}
              fill={colors[idx % colors.length]}
              opacity="0.75"
              stroke={INK}
              strokeWidth="1"
            />
          );
        })}

        {/* Left Terracotta Sun Plaza Archway & Cactus */}
        <g transform="translate(18, 210)" opacity="0.88">
          <rect x="0" y="30" width="84" height="110" rx="6" fill="#FDBA74" stroke="#9A3412" strokeWidth="1.8" />
          <path d="M-4 30L42 4L88 30Z" fill="#EA580C" stroke="#9A3412" strokeWidth="1.8" />
          <path d="M24 140V84C24 68 60 68 60 84V140Z" fill="#FFF7ED" stroke="#9A3412" strokeWidth="1.8" />
          <rect x="92" y="114" width="20" height="18" rx="3" fill="#C2410C" stroke={INK} strokeWidth="1.4" />
          <rect x="98" y="88" width="8" height="27" rx="4" fill="#16A34A" stroke={INK} strokeWidth="1.4" />
          <path d="M98 102H92V95" fill="none" stroke="#16A34A" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Right Sunflower & Adobe Tower */}
        <g transform="translate(495, 225)" opacity="0.88">
          <rect x="14" y="25" width="66" height="110" rx="5" fill="#FDE68A" stroke="#9A3412" strokeWidth="1.8" />
          <path d="M10 25L47 0L84 25Z" fill="#DC2626" stroke="#9A3412" strokeWidth="1.8" />
          <circle cx="47" cy="56" r="10" fill="#FFF7ED" stroke="#9A3412" strokeWidth="1.6" />
        </g>
      </svg>
    );
  }

  if (language === 'fr') {
    return (
      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-unit-scenery={unitOrder}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      >
        <defs>
          <linearGradient id={`fr-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#EDE9FE" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#fr-sky-${uid})`} />

        {/* Rolling Provence Lavender Hills */}
        <path d="M0 295Q140 235 290 285T600 275V420H0Z" fill="#C4B5FD" opacity="0.65" />
        <path d="M0 335Q180 285 360 330T600 320V420H0Z" fill="#A78BFA" opacity="0.52" />
        {[28, 48, 68, 520, 540, 560].map((x) => (
          <ellipse key={x} cx={x} cy="365" rx="14" ry="7" fill="#7C3AED" opacity="0.35" />
        ))}

        {/* Iconic Eiffel Tower Silhouette */}
        <g transform={unitOrder % 2 === 0 ? 'translate(470, 82)' : 'translate(34, 82)'} opacity="0.82">
          <path
            d="M46 0L49 0L53 75C58 125 70 165 88 205H66C61 180 55 168 47.5 168C40 168 34 180 29 205H7C25 165 37 125 42 75Z"
            fill="#6366F1"
            stroke="#312E81"
            strokeWidth="1.8"
          />
          <rect x="33" y="96" width="29" height="6" rx="2" fill="#4338CA" />
          <rect x="26" y="136" width="43" height="7" rx="2" fill="#4338CA" />
          <circle cx="47.5" cy="14" r="7" fill="#FDE047" opacity="0.55" />
        </g>

        {/* Warm Parisian Streetlamp */}
        <g transform={unitOrder % 2 === 0 ? 'translate(38, 210)' : 'translate(515, 210)'} opacity="0.9">
          <rect x="18" y="34" width="6" height="120" rx="3" fill="#1E293B" />
          <rect x="12" y="144" width="18" height="14" rx="4" fill="#334155" />
          <circle cx="21" cy="24" r="19" fill="#FDE047" opacity="0.35" />
          <path d="M12 18H30L27 35H15Z" fill="#FEF08A" stroke={INK} strokeWidth="1.6" />
          <path d="M9 18L21 9L33 18Z" fill="#1E293B" />
        </g>
      </svg>
    );
  }

  if (language === 'de') {
    return (
      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        data-unit-scenery={unitOrder}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      >
        <defs>
          <linearGradient id={`de-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#DCFCE7" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill={`url(#de-sky-${uid})`} />

        {/* Alpine Cable Car Wire & Gondola */}
        <line x1="0" y1="74" x2="600" y2="34" stroke="#475569" strokeWidth="2.2" opacity="0.6" />
        <g transform="translate(465, 38)">
          <line x1="20" y1="3" x2="20" y2="20" stroke="#334155" strokeWidth="2.5" />
          <rect x="4" y="20" width="32" height="24" rx="6" fill="#DC2626" stroke={INK} strokeWidth="1.8" />
          <rect x="9" y="24" width="22" height="10" rx="2.5" fill="#BAE6FD" stroke={INK} strokeWidth="1.2" />
        </g>

        {/* Evergreen Black Forest Pines */}
        {[24, 62, 520, 560].map((x, idx) => (
          <g key={x} transform={`translate(${x}, ${idx % 2 === 0 ? 185 : 210})`} opacity="0.85">
            <rect x="13" y="75" width="8" height="28" fill="#78350F" />
            <path d="M17 0L34 38H0Z" fill="#15803D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M17 22L38 62H-4Z" fill="#166534" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M17 44L41 82H-7Z" fill="#14532D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        ))}

        {/* Half-Timbered Storybook Cottage */}
        <g transform={unitOrder % 2 === 0 ? 'translate(20, 290)' : 'translate(480, 290)'} opacity="0.9">
          <rect x="8" y="34" width="76" height="64" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
          <path d="M0 36L46 0L92 36Z" fill="#D97706" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 58H84M32 34V98M60 34V98M8 34L32 58M84 34L60 58" stroke="#78350F" strokeWidth="3.5" />
          <rect x="38" y="68" width="16" height="30" rx="3" fill="#92400E" stroke={INK} strokeWidth="1.4" />
        </g>
      </svg>
    );
  }

  if (language === 'pt') {
    // Portuguese (pt — A Trilha Tropical: Sugarloaf bay & palm hills)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`pt-sky-${uid}`} skyTop="#F0FDFA" skyBottom="#FEF3C7">
        {/* Tropical Sun */}
        <circle cx={flip ? 102 : 498} cy="68" r="34" fill="#FDE047" opacity="0.72" />
        <circle cx={flip ? 102 : 498} cy="68" r="22" fill="#FBBF24" opacity="0.88" />

        {/* Sugarloaf Granite Dome & Lush Coastal Morros */}
        <path
          d="M0 330Q120 278 260 320T600 300V420H0Z"
          fill="#6EE7B7"
          opacity="0.55"
        />
        <g transform={flip ? 'translate(410, 128)' : 'translate(22, 128)'} opacity="0.88">
          <path
            d="M14 205C22 120 42 18 76 16C110 18 134 115 148 205Z"
            fill="#10B981"
            stroke="#065F46"
            strokeWidth="2"
          />
          <path
            d="M52 24C64 16 88 16 100 26C86 42 74 80 76 125C62 85 52 50 52 24Z"
            fill="#A7F3D0"
            opacity="0.45"
          />
          <path d="M110 205C120 155 138 128 158 132C176 135 186 168 192 205Z" fill="#059669" />
        </g>

        {/* Sparkling Guanabara Bay */}
        <path d="M0 336Q150 322 300 336T600 330V420H0Z" fill="#2DD4BF" opacity="0.6" />
        <path
          d="M40 366Q95 358 150 366M390 374Q450 366 510 374"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.78"
        />

        {/* Swaying Coastal Palm Trees */}
        <g transform={flip ? 'translate(22, 188)' : 'translate(490, 188)'} opacity="0.92">
          <path d="M46 164Q54 102 36 52" fill="none" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
          <path d="M46 164Q54 102 36 52" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="34" cy="54" r="5" fill="#78350F" />
          <circle cx="41" cy="57" r="5" fill="#78350F" />
          <path d="M36 50Q12 36 0 54Q18 52 36 50Z" fill="#16A34A" stroke={INK} strokeWidth="1.4" />
          <path d="M36 50Q18 18 42 12Q42 32 36 50Z" fill="#22C55E" stroke={INK} strokeWidth="1.4" />
          <path d="M36 50Q66 26 78 46Q56 48 36 50Z" fill="#16A34A" stroke={INK} strokeWidth="1.4" />
          <path d="M36 50Q60 58 68 78Q48 68 36 50Z" fill="#15803D" stroke={INK} strokeWidth="1.4" />
        </g>

        {/* Sailboat on the Bay */}
        <g transform={flip ? 'translate(135, 308)' : 'translate(420, 308)'} opacity="0.9">
          <path d="M4 28H46L40 38H10Z" fill="#EA580C" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M24 28V4L41 24Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M22 28V9L8 24Z" fill="#FDE047" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'en') {
    // English (en — The Starlight Compass Isles: coastal lighthouse & clocktower harbor)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`en-sky-${uid}`} skyTop="#EFF6FF" skyBottom="#DBEAFE">
        {/* Soft Storybook Clouds & Starlight Compass Gleam */}
        <g fill="#FFFFFF" opacity="0.82">
          <ellipse cx="145" cy="58" rx="34" ry="14" />
          <ellipse cx="168" cy="52" rx="22" ry="12" />
          <ellipse cx="430" cy="64" rx="36" ry="14" />
          <ellipse cx="452" cy="57" rx="22" ry="12" />
        </g>

        {/* Rolling Green Headlands */}
        <path d="M0 308Q140 264 300 306T600 294V420H0Z" fill="#86EFAC" opacity="0.65" />
        <path d="M0 338Q180 315 360 340T600 332V420H0Z" fill="#38BDF8" opacity="0.58" />
        <path
          d="M55 368Q110 360 165 368M410 378Q465 370 520 378"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Striped Coastal Lighthouse with Golden Beam */}
        <g transform={flip ? 'translate(474, 152)' : 'translate(22, 152)'} opacity="0.92">
          <polygon
            points={flip ? '36,42 -60,12 -60,72' : '36,42 132,12 132,72'}
            fill="#FDE047"
            opacity="0.28"
          />
          <rect x="22" y="54" width="28" height="106" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
          <rect x="22" y="74" width="28" height="22" fill="#EF4444" stroke={INK} strokeWidth="1.4" />
          <rect x="22" y="116" width="28" height="22" fill="#EF4444" stroke={INK} strokeWidth="1.4" />
          <rect x="18" y="48" width="36" height="8" rx="2" fill="#1E293B" />
          <rect x="24" y="28" width="24" height="20" rx="2" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
          <path d="M18 28L36 10L54 28Z" fill="#DC2626" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>

        {/* Storybook Sandstone Clocktower Harbor */}
        <g transform={flip ? 'translate(24, 158)' : 'translate(486, 158)'} opacity="0.9">
          <rect x="18" y="46" width="52" height="122" rx="3" fill="#FDE68A" stroke="#92400E" strokeWidth="1.8" />
          <path d="M12 46L44 4L76 46Z" fill="#1D4ED8" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="44" cy="76" r="15" fill="#FFFFFF" stroke="#92400E" strokeWidth="2.2" />
          <path d="M44 76V66M44 76L52 79" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <rect x="28" y="106" width="12" height="24" rx="5" fill="#92400E" opacity="0.55" />
          <rect x="48" y="106" width="12" height="24" rx="5" fill="#92400E" opacity="0.55" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'zh') {
    // Mandarin Chinese (zh — The Lantern Cloud Peaks: karst peaks, moon-gate & glowing lanterns)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`zh-sky-${uid}`} skyTop="#FEF2F2" skyBottom="#FFEDD5">
        {/* Misty Layered Karst Peaks */}
        <path
          d="M0 320C28 210 66 155 96 225C124 140 164 145 198 255C232 185 270 190 302 275C338 170 382 175 416 260C450 135 495 140 534 235C562 175 585 195 600 265V420H0Z"
          fill="#99F6E4"
          opacity="0.55"
        />
        <path
          d="M0 340C48 255 98 250 142 315C192 245 244 255 296 320C350 245 408 255 460 315C510 245 562 250 600 310V420H0Z"
          fill="#5EEAD4"
          opacity="0.45"
        />
        <ellipse cx="220" cy="242" rx="74" ry="12" fill="#FFFFFF" opacity="0.62" />
        <ellipse cx="420" cy="222" rx="68" ry="11" fill="#FFFFFF" opacity="0.58" />

        {/* Overhead Glowing Red & Gold Festival Lanterns */}
        <path d="M0 24Q150 54 300 22T600 24" fill="none" stroke="#991B1B" strokeWidth="2" opacity="0.6" />
        {[64, 152, 448, 536].map((x) => (
          <g key={x} transform={`translate(${x}, 32)`}>
            <circle cx="0" cy="20" r="20" fill="#FDE047" opacity="0.28" />
            <rect x="-11" y="6" width="22" height="26" rx="10" fill="#DC2626" stroke={INK} strokeWidth="1.6" />
            <rect x="-7" y="3" width="14" height="4" rx="1.5" fill="#FACC15" stroke={INK} strokeWidth="1" />
            <rect x="-7" y="31" width="14" height="4" rx="1.5" fill="#FACC15" stroke={INK} strokeWidth="1" />
            <line x1="0" y1="35" x2="0" y2="44" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        ))}

        {/* Moon-Gate Pavilion Archway */}
        <g transform={flip ? 'translate(462, 232)' : 'translate(18, 232)'} opacity="0.92">
          <path d="M-4 32Q60 2 124 32L112 42H8Z" fill="#DC2626" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="8" y="42" width="104" height="94" rx="4" fill="#FEF3C7" stroke="#92400E" strokeWidth="1.8" />
          <circle cx="60" cy="94" r="32" fill="#FFF7ED" stroke="#B91C1C" strokeWidth="4" />
        </g>

        {/* Jade Bamboo Stalks */}
        <g transform={flip ? 'translate(22, 195)' : 'translate(514, 195)'} opacity="0.88">
          <line x1="16" y1="0" x2="16" y2="160" stroke="#16A34A" strokeWidth="6" strokeLinecap="round" />
          <line x1="36" y1="22" x2="36" y2="160" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" />
          <path d="M16 32L0 20L14 24Z M18 64L34 52L20 56Z M36 74L54 62L38 66Z" fill="#15803D" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'ja') {
    // Japanese (ja — Sakura Sky Trail: vermilion torii gate, sakura blossoms & Mt. Fuji)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`ja-sky-${uid}`} skyTop="#FDF2F8" skyBottom="#E0E7FF">
        {/* Snow-Capped Mt. Fuji Backdrop */}
        <path
          d="M120 355C195 275 245 190 272 136H328C355 190 405 275 480 355Z"
          fill="#818CF8"
          opacity="0.42"
        />
        <path
          d="M244 190L272 136H328L356 190L334 176L316 194L300 176L284 194L266 176Z"
          fill="#FFFFFF"
          opacity="0.92"
        />
        <path d="M0 322Q160 282 320 322T600 310V420H0Z" fill="#A7F3D0" opacity="0.48" />

        {/* Vermilion Torii Gate */}
        <g transform={flip ? 'translate(454, 214)' : 'translate(24, 214)'} opacity="0.92">
          <path d="M0 16Q60 26 120 16L114 28Q60 36 6 28Z" fill="#DC2626" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="14" y="42" width="92" height="10" rx="2" fill="#EF4444" stroke={INK} strokeWidth="1.6" />
          <rect x="26" y="28" width="12" height="114" fill="#DC2626" stroke={INK} strokeWidth="1.8" />
          <rect x="82" y="28" width="12" height="114" fill="#DC2626" stroke={INK} strokeWidth="1.8" />
          <rect x="22" y="132" width="20" height="12" rx="2" fill="#1E293B" />
          <rect x="78" y="132" width="20" height="12" rx="2" fill="#1E293B" />
        </g>

        {/* Arching Sakura Cherry Blossom Branch & Drifting Petals */}
        <g transform={flip ? 'translate(0, 12)' : 'translate(410, 12)'} opacity="0.92">
          <path
            d={flip ? 'M0 78Q68 48 134 62' : 'M190 78Q122 48 56 62'}
            fill="none"
            stroke="#78350F"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {[
            [flip ? 34 : 156, 54, 14],
            [flip ? 74 : 116, 42, 16],
            [flip ? 114 : 76, 58, 13],
            [flip ? 56 : 134, 82, 12],
          ].map(([cx, cy, r], idx) => (
            <g key={idx}>
              <circle cx={cx} cy={cy} r={r} fill="#F9A8D4" stroke="#DB2777" strokeWidth="1.2" />
              <circle cx={cx} cy={cy} r={r * 0.36} fill="#FEF08A" />
            </g>
          ))}
        </g>
        {[
          [210, 64],
          [340, 48],
          [420, 118],
          [165, 134],
        ].map(([x, y], idx) => (
          <ellipse key={idx} cx={x} cy={y} rx="5" ry="3" transform={`rotate(${idx * 35} ${x} ${y})`} fill="#F472B6" opacity="0.72" />
        ))}
      </DioramaSvg>
    );
  }

  if (language === 'hi') {
    // Hindi (hi — The Marigold Palace Trail: marigold arches & sandstone palace domes)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`hi-sky-${uid}`} skyTop="#FFF7ED" skyBottom="#FEF3C7">
        {/* Warm Rajasthan Sun */}
        <circle cx={flip ? 105 : 495} cy="72" r="34" fill="#FDE047" opacity="0.75" />
        <circle cx={flip ? 105 : 495} cy="72" r="23" fill="#FB923C" opacity="0.75" />

        {/* Draped Marigold & Mango-Leaf Garlands */}
        <path d="M0 24Q150 56 300 24T600 24" fill="none" stroke="#15803D" strokeWidth="2.4" opacity="0.7" />
        {[48, 92, 136, 464, 508, 552].map((x, idx) => (
          <circle
            key={x}
            cx={x}
            cy={idx % 2 === 0 ? 36 : 42}
            r="9"
            fill={idx % 2 === 0 ? '#F97316' : '#FACC15'}
            stroke="#9A3412"
            strokeWidth="1.2"
          />
        ))}

        {/* Sandstone Palace Pavilion Domes */}
        <g transform={flip ? 'translate(454, 198)' : 'translate(20, 198)'} opacity="0.9">
          <path d="M36 46C36 16 62 4 62 4C62 4 88 16 88 46Z" fill="#FB923C" stroke="#9A3412" strokeWidth="1.8" />
          <line x1="62" y1="0" x2="62" y2="8" stroke="#9A3412" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="14" y="46" width="96" height="104" rx="4" fill="#FDBA74" stroke="#9A3412" strokeWidth="1.8" />
          <path d="M38 150V96C38 78 62 66 62 66C62 66 86 78 86 96V150Z" fill="#FFF7ED" stroke="#9A3412" strokeWidth="1.8" />
        </g>

        {/* Secondary Chhatri Turret & Reflection Pool */}
        <g transform={flip ? 'translate(24, 240)' : 'translate(490, 240)'} opacity="0.88">
          <path d="M20 34C20 12 44 4 44 4C44 4 68 12 68 34Z" fill="#F59E0B" stroke="#9A3412" strokeWidth="1.8" />
          <rect x="14" y="34" width="60" height="84" rx="4" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.8" />
          <path d="M32 118V66C32 54 56 54 56 66V118Z" fill="#FFFBEB" stroke="#9A3412" strokeWidth="1.6" />
        </g>
        <path d="M0 346Q300 338 600 346V420H0Z" fill="#38BDF8" opacity="0.42" />
      </DioramaSvg>
    );
  }

  if (language === 'bn') {
    // Bengali (bn — The Lotus River Delta: lotus river delta & wooden country boat)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`bn-sky-${uid}`} skyTop="#ECFDF5" skyBottom="#FEF9C3">
        {/* Lush Green Delta Banks & Coconut Palms */}
        <path d="M0 296Q160 260 320 296T600 288V420H0Z" fill="#6EE7B7" opacity="0.62" />
        <g transform={flip ? 'translate(496, 178)' : 'translate(24, 178)'} opacity="0.9">
          <path d="M36 146Q46 92 28 42" fill="none" stroke="#92400E" strokeWidth="7" strokeLinecap="round" />
          <path d="M28 42Q6 30 -2 46Q14 44 28 42Z" fill="#059669" stroke={INK} strokeWidth="1.3" />
          <path d="M28 42Q20 14 42 10Q40 28 28 42Z" fill="#10B981" stroke={INK} strokeWidth="1.3" />
          <path d="M28 42Q54 24 64 42Q46 44 28 42Z" fill="#059669" stroke={INK} strokeWidth="1.3" />
        </g>

        {/* Wide Padma River Delta & Blooming Pink Lotuses */}
        <path d="M0 322Q150 310 300 324T600 318V420H0Z" fill="#38BDF8" opacity="0.56" />
        {[72, 134, 470, 535].map((x, idx) => (
          <g key={x} transform={`translate(${x}, ${idx % 2 === 0 ? 356 : 374})`}>
            <ellipse cx="0" cy="6" rx="18" ry="6" fill="#16A34A" stroke={INK} strokeWidth="1.2" />
            <path d="M-8 4C-8 -6 -2 -10 0 -10C2 -10 8 -6 8 4Z" fill="#FB7185" stroke={INK} strokeWidth="1.2" />
            <path d="M-12 5C-11 -2 -6 -5 -3 4Z" fill="#F472B6" stroke={INK} strokeWidth="1.1" />
            <path d="M12 5C11 -2 6 -5 3 4Z" fill="#F472B6" stroke={INK} strokeWidth="1.1" />
          </g>
        ))}

        {/* Wooden Country Nouka Boat with Striped Chhai Canopy */}
        <g transform={flip ? 'translate(40, 306)' : 'translate(415, 306)'} opacity="0.94">
          <path d="M4 32C28 48 104 48 134 26L118 44C92 54 40 54 18 44Z" fill="#92400E" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M42 34C42 12 90 12 90 34Z" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
          <path d="M56 34C56 14 76 14 76 34Z" fill="#047857" opacity="0.85" />
          <line x1="108" y1="22" x2="86" y2="54" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'ar') {
    // Modern Standard Arabic (ar — Oasis of Golden Stars: starlit desert oasis palms & astrolabe arch)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg
        unitOrder={unitOrder}
        skyId={`ar-sky-${uid}`}
        skyTop="#0F766E"
        skyMid="#34D399"
        skyBottom="#FEF3C7"
      >
        {/* Starlit Crescent & Golden Stars */}
        <path
          d="M505 42C490 45 480 58 482 73C484 87 497 96 512 94C499 92 493 80 493 68C493 56 499 47 505 42Z"
          fill="#FDE047"
        />
        {[
          [82, 46, 2.5],
          [164, 34, 2.1],
          [265, 58, 2.4],
          [380, 40, 2.2],
          [448, 72, 2.5],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#FEF08A" opacity="0.9" />
        ))}

        {/* Rolling Golden Desert Dunes & Turquoise Oasis Pool */}
        <path d="M0 304Q170 258 340 304T600 294V420H0Z" fill="#FDE68A" opacity="0.82" />
        <path d="M0 344Q210 312 420 348T600 336V420H0Z" fill="#FBBF24" opacity="0.6" />
        <ellipse cx={flip ? 145 : 455} cy="368" rx="92" ry="18" fill="#06B6D4" stroke="#0E7490" strokeWidth="1.6" opacity="0.85" />

        {/* Oasis Date Palms */}
        <g transform={flip ? 'translate(30, 200)' : 'translate(495, 200)'} opacity="0.94">
          <path d="M32 160Q42 104 28 50" fill="none" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
          <path d="M28 50Q2 38 -6 56Q14 54 28 50Z" fill="#15803D" stroke={INK} strokeWidth="1.4" />
          <path d="M28 50Q14 18 38 14Q38 32 28 50Z" fill="#16A34A" stroke={INK} strokeWidth="1.4" />
          <path d="M28 50Q56 30 66 50Q46 52 28 50Z" fill="#15803D" stroke={INK} strokeWidth="1.4" />
        </g>

        {/* Ornate Desert Arch with Brass Astrolabe */}
        <g transform={flip ? 'translate(474, 218)' : 'translate(22, 218)'} opacity="0.92">
          <rect x="6" y="34" width="92" height="108" rx="6" fill="#FEF3C7" stroke="#92400E" strokeWidth="1.8" />
          <path d="M22 142V76C22 50 52 38 52 38C52 38 82 50 82 76V142Z" fill="#065F46" stroke="#D97706" strokeWidth="2.4" />
          <line x1="52" y1="40" x2="52" y2="58" stroke="#FDE047" strokeWidth="1.8" />
          <circle cx="52" cy="74" r="14" fill="none" stroke="#FACC15" strokeWidth="2.4" />
          <circle cx="52" cy="74" r="7" fill="none" stroke="#FDE047" strokeWidth="1.4" />
          <circle cx="52" cy="74" r="2.2" fill="#FDE047" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'arz') {
    // Egyptian Arabic (arz — Nile Felucca Breeze: golden Nile pyramids & white-sailed felucca)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`arz-sky-${uid}`} skyTop="#E0F2FE" skyBottom="#FEF3C7">
        {/* Warm Egyptian Sun */}
        <circle cx={flip ? 95 : 505} cy="70" r="32" fill="#FDE047" opacity="0.82" />
        <circle cx={flip ? 95 : 505} cy="70" r="22" fill="#F59E0B" opacity="0.72" />

        {/* Golden Giza Pyramids on Desert Horizon */}
        <g transform={flip ? 'translate(350, 178)' : 'translate(20, 178)'} opacity="0.9">
          <polygon points="74,24 18,148 92,148" fill="#FBBF24" stroke="#92400E" strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="74,24 92,148 134,148" fill="#D97706" stroke="#92400E" strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="154,54 114,148 164,148" fill="#FDE047" stroke="#92400E" strokeWidth="1.8" strokeLinejoin="round" />
          <polygon points="154,54 164,148 196,148" fill="#D97706" stroke="#92400E" strokeWidth="1.8" strokeLinejoin="round" />
        </g>

        {/* Nile River Waterfront */}
        <path d="M0 322Q150 310 300 322T600 318V420H0Z" fill="#0EA5E9" opacity="0.56" />
        <path
          d="M35 366Q95 358 155 366M420 374Q485 366 545 374"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />

        {/* White-Sailed Nile Felucca */}
        <g transform={flip ? 'translate(48, 250)' : 'translate(428, 250)'} opacity="0.95">
          <path d="M6 86H104L90 102H18Z" fill="#92400E" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="52" y1="86" x2="52" y2="12" stroke="#78350F" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M52 10Q102 44 96 80L52 80Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'ru') {
    // Russian (ru — The Starlight Frost Express: colorful onion domes & snowy northern pines)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`ru-sky-${uid}`} skyTop="#EEF2FF" skyBottom="#E0F2FE">
        {/* Soft Aurora Ribbon & Snowflakes */}
        <path d="M40 76Q220 28 380 78T560 56" fill="none" stroke="#818CF8" strokeWidth="14" opacity="0.22" strokeLinecap="round" />
        {[
          [92, 46],
          [190, 82],
          [320, 48],
          [440, 84],
          [520, 44],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#FFFFFF" opacity="0.88" />
        ))}

        {/* Snow-Blanketed Hills */}
        <path d="M0 318Q150 282 300 318T600 312V420H0Z" fill="#F8FAFC" opacity="0.92" />

        {/* Colorful Onion-Domed Cathedral Towers */}
        <g transform={flip ? 'translate(454, 168)' : 'translate(22, 168)'} opacity="0.92">
          {/* Left Blue Dome Tower */}
          <rect x="10" y="76" width="32" height="90" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
          <path d="M26 24C10 46 8 64 14 76H38C44 64 42 46 26 24Z" fill="#2563EB" stroke={INK} strokeWidth="1.8" />
          {/* Center Crimson & Gold Striped Dome */}
          <rect x="44" y="64" width="38" height="102" fill="#FEF3C7" stroke={INK} strokeWidth="1.8" />
          <path d="M63 6C42 32 40 52 46 64H80C86 52 84 32 63 6Z" fill="#E11D48" stroke={INK} strokeWidth="1.8" />
          <path d="M63 6C56 32 56 52 63 64C70 52 70 32 63 6Z" fill="#FACC15" opacity="0.88" />
          {/* Right Emerald Dome Tower */}
          <rect x="84" y="84" width="30" height="82" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
          <path d="M99 36C85 56 83 72 88 84H110C115 72 113 56 99 36Z" fill="#10B981" stroke={INK} strokeWidth="1.8" />
        </g>

        {/* Snowy Northern Pines */}
        {(flip ? [26, 66] : [510, 550]).map((x, idx) => (
          <g key={x} transform={`translate(${x}, ${idx % 2 === 0 ? 196 : 220})`} opacity="0.9">
            <rect x="13" y="76" width="8" height="28" fill="#78350F" />
            <path d="M17 0L34 38H0Z" fill="#15803D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M17 0L25 18L17 14L9 18Z" fill="#FFFFFF" />
            <path d="M17 24L38 64H-4Z" fill="#166534" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M17 44L41 82H-7Z" fill="#14532D" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        ))}
      </DioramaSvg>
    );
  }

  if (language === 'id') {
    // Indonesian (id — Emerald Archipelago Voyage: volcanic peaks & outrigger prahu)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`id-sky-${uid}`} skyTop="#ECFEFF" skyBottom="#FEF9C3">
        {/* Tropical Sun */}
        <circle cx={flip ? 110 : 490} cy="68" r="30" fill="#FDE047" opacity="0.82" />

        {/* Twin Emerald Volcanic Island Peaks */}
        <g transform={flip ? 'translate(380, 152)' : 'translate(16, 152)'} opacity="0.9">
          <ellipse cx="66" cy="14" rx="22" ry="9" fill="#FFFFFF" opacity="0.72" />
          <path d="M60 28L74 28L124 175H10Z" fill="#059669" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M132 58L142 58L190 175H90Z" fill="#10B981" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>

        {/* Sparkling Turquoise Archipelago Sea */}
        <path d="M0 322Q150 310 300 324T600 318V420H0Z" fill="#06B6D4" opacity="0.58" />
        <path
          d="M38 364Q92 356 146 364M412 372Q470 364 528 372"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.78"
        />

        {/* Traditional Outrigger Prahu Sailboat */}
        <g transform={flip ? 'translate(38, 258)' : 'translate(435, 258)'} opacity="0.94">
          <path d="M8 78C34 92 86 92 112 72L98 88H22Z" fill="#92400E" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="18" y1="88" x2="104" y2="88" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="58" y1="78" x2="58" y2="10" stroke="#78350F" strokeWidth="3" />
          <path d="M58 10L106 68H58Z" fill="#F97316" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M58 26L88 68H58Z" fill="#FACC15" opacity="0.9" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'vi') {
    // Vietnamese (vi — Lantern Bay & Bamboo Peaks: emerald karst bay & floating silk lanterns)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`vi-sky-${uid}`} skyTop="#FFF1F2" skyBottom="#ECFDF5">
        {/* Emerald Limestone Karst Bay Peaks */}
        <path
          d="M0 326L34 222L72 246L108 175L146 258L192 232L224 326Z"
          fill="#10B981"
          opacity="0.65"
        />
        <path
          d="M382 326L416 205L458 242L494 178L538 250L572 218L600 326Z"
          fill="#059669"
          opacity="0.62"
        />

        {/* Overhead Strung Hoi An Silk Lanterns */}
        <path d="M0 24Q150 52 300 22T600 26" fill="none" stroke="#78350F" strokeWidth="1.8" opacity="0.55" />
        {[
          [56, '#E11D48'],
          [134, '#FACC15'],
          [466, '#0EA5E9'],
          [544, '#A855F7'],
        ].map(([x, color]) => (
          <g key={x as number} transform={`translate(${x}, 32)`}>
            <circle cx="0" cy="18" r="18" fill={color as string} opacity="0.22" />
            <ellipse cx="0" cy="18" rx="10" ry="13" fill={color as string} stroke={INK} strokeWidth="1.5" />
            <rect x="-5" y="4" width="10" height="3.5" rx="1" fill="#FDE047" />
            <line x1="0" y1="31" x2="0" y2="39" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {/* Jade Bay Water & Floating Lotus Silk Lanterns */}
        <path d="M0 324Q150 312 300 326T600 320V420H0Z" fill="#14B8A6" opacity="0.55" />
        {[120, 295, 480].map((x, idx) => (
          <g key={x} transform={`translate(${x}, ${idx === 1 ? 365 : 352})`}>
            <ellipse cx="0" cy="7" rx="16" ry="5" fill="#FFFFFF" opacity="0.32" />
            <path d="M-9 5L0 -8L9 5Z" fill="#FB7185" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
            <circle cx="0" cy="0" r="2.5" fill="#FEF08A" />
          </g>
        ))}

        {/* Graceful Corner Bamboo */}
        <g transform={flip ? 'translate(518, 198)' : 'translate(18, 198)'} opacity="0.88">
          <line x1="16" y1="0" x2="16" y2="145" stroke="#16A34A" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="34" y1="20" x2="34" y2="145" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M16 32L0 20L14 24Z M18 60L34 48L20 52Z" fill="#15803D" />
        </g>
      </DioramaSvg>
    );
  }

  if (language === 'sw') {
    // Swahili (sw — Savanna Sun & Dhow Coast: golden savanna acacias, Kilimanjaro & Zanzibar dhow)
    const flip = unitOrder % 2 === 0;
    return (
      <DioramaSvg unitOrder={unitOrder} skyId={`sw-sky-${uid}`} skyTop="#FFFBEB" skyBottom="#FED7AA">
        {/* Savanna Sun */}
        <circle cx={flip ? 105 : 495} cy="72" r="36" fill="#FDE047" opacity="0.82" />
        <circle cx={flip ? 105 : 495} cy="72" r="24" fill="#F59E0B" opacity="0.82" />

        {/* Distant Broad Snow-Capped Mt. Kilimanjaro */}
        <path
          d="M140 315L238 190H362L460 315Z"
          fill="#94A3B8"
          opacity="0.48"
        />
        <path
          d="M214 222L238 190H362L386 222L354 206L328 224L300 206L272 224L246 206Z"
          fill="#FFFFFF"
          opacity="0.92"
        />

        {/* Golden Savanna Plains & Turquoise Zanzibar Coast */}
        <path d="M0 312Q180 282 360 314T600 306V420H0Z" fill="#FCD34D" opacity="0.62" />
        <path d="M290 342Q440 320 600 336V420H290Z" fill="#0EA5E9" opacity="0.58" />

        {/* Flat-Topped Savanna Acacia Tree */}
        <g transform={flip ? 'translate(430, 198)' : 'translate(18, 198)'} opacity="0.92">
          <path d="M62 128V74M62 84L38 64M62 80L88 64" stroke="#78350F" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="62" cy="56" rx="54" ry="15" fill="#15803D" stroke={INK} strokeWidth="1.6" />
          <ellipse cx="42" cy="48" rx="28" ry="10" fill="#65A30D" opacity="0.85" />
          <ellipse cx="82" cy="50" rx="26" ry="9" fill="#65A30D" opacity="0.85" />
        </g>

        {/* Zanzibar White-Sailed Dhow Boat */}
        <g transform="translate(455, 290)" opacity="0.94">
          <path d="M8 52H92L80 66H18Z" fill="#92400E" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="48" y1="52" x2="48" y2="8" stroke="#78350F" strokeWidth="2.8" />
          <path d="M48 8L92 46H48Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
      </DioramaSvg>
    );
  }

  // Italian (it — La Via del Mare)
  return (
    <svg
      viewBox="0 0 600 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-unit-scenery={unitOrder}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.9,
      }}
    >
      <defs>
        <linearGradient id={`it-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill={`url(#it-sky-${uid})`} />

      {/* Venetian Canal Water Band at bottom */}
      <path d="M0 328Q150 315 300 328T600 325V420H0Z" fill="#38BDF8" opacity="0.5" />
      <path d="M25 362Q70 356 115 362M440 375Q495 368 550 375" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Venetian Stone Arch Bridge */}
      <g transform="translate(18, 252)" opacity="0.88">
        <path
          d="M0 64C35 28 95 28 130 64V92H106C98 66 32 66 24 92H0Z"
          fill="#FDE68A"
          stroke="#92400E"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M4 58C38 25 92 25 126 58" fill="none" stroke="#B45309" strokeWidth="3" />
      </g>

      {/* Slender Mediterranean Cypress Trees */}
      {[515, 550].map((x, idx) => (
        <g key={x} transform={`translate(${x}, ${idx === 0 ? 150 : 185})`} opacity="0.88">
          <rect x="9" y="96" width="5" height="24" fill="#78350F" />
          <ellipse cx="11.5" cy="54" rx="11" ry="48" fill="#15803D" stroke={INK} strokeWidth="1.6" />
        </g>
      ))}

      {/* Gliding Venetian Gondola */}
      <g transform="translate(435, 314)" opacity="0.92">
        <path
          d="M8 22C34 38 92 38 118 16L110 34C88 47 36 47 14 34Z"
          fill="#1E293B"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="52" y="18" width="22" height="11" rx="3" fill="#DC2626" stroke={INK} strokeWidth="1.4" />
        <line x1="94" y1="3" x2="72" y2="38" stroke="#92400E" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      {/* Sunlit Lemon Tree */}
      <g transform="translate(26, 86)" opacity="0.86">
        <rect x="20" y="54" width="7" height="36" rx="2" fill="#78350F" />
        <circle cx="24" cy="40" r="24" fill="#22C55E" stroke={INK} strokeWidth="1.6" />
        <circle cx="15" cy="34" r="4.5" fill="#FACC15" stroke={INK} strokeWidth="1.1" />
        <circle cx="31" cy="44" r="4.5" fill="#FACC15" stroke={INK} strokeWidth="1.1" />
        <circle cx="24" cy="24" r="4" fill="#FACC15" stroke={INK} strokeWidth="1.1" />
      </g>
    </svg>
  );
}
