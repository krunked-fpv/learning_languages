import { useId } from 'react';
import type { LanguageCode } from '../../types/contracts';

const INK = '#1E293B';

function Unit6To8Overlay({
  language,
  unitOrder,
  uid,
}: {
  language: LanguageCode;
  unitOrder: number;
  uid: string;
}) {
  const accentMap: Record<LanguageCode, { roof: string; glow: string; hill: string }> = {
    es: { roof: '#EA580C', glow: '#FBBF24', hill: '#FED7AA' },
    fr: { roof: '#4F46E5', glow: '#C4B5FD', hill: '#DDD6FE' },
    de: { roof: '#D97706', glow: '#6EE7B7', hill: '#BBF7D0' },
    it: { roof: '#059669', glow: '#67E8F9', hill: '#BAE6FD' },
  };
  const tint = accentMap[language];

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

export function RegionalScenery({
  language,
  unitOrder,
}: {
  language: LanguageCode;
  unitOrder: number;
}) {
  const uid = useId().replace(/:/g, '');

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
