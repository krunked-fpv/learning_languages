import { GroundShadow, HeartMotif, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT4_SCENES = {
  loving_mother: (uid) => (
    <g>
      <defs>
        <radialGradient id={`lm-bg-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FCE7F3" />
          <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#lm-bg-${uid})`} />
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* Warm wavy hair back */}
      <path d="M35 45C33 27 45 20 60 20C75 20 87 27 85 45C87 57 83 68 77 70H43C37 68 33 57 35 45Z" fill="#78350F" stroke={INK} strokeWidth="2.1" />
      {/* Warm coral cardigan shoulders */}
      <path d="M31 95C33 77 44 70 60 70C76 70 87 77 89 95Z" fill="#FB7185" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M51 71L60 80L69 71" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
      {/* Neck & Smiling Face */}
      <rect x="54" y="61" width="12" height="12" rx="4" fill="#FDBA74" />
      <circle cx="60" cy="47" r="18" fill="#FED7AA" stroke={INK} strokeWidth="2.2" />
      <path d="M42 44C46 31 58 29 66 34C71 37 76 41 78 44C75 30 67 24 58 24C48 24 41 33 42 44Z" fill="#78350F" stroke={INK} strokeWidth="1.8" />
      <circle cx="53" cy="47" r="2.6" fill={INK} />
      <circle cx="67" cy="47" r="2.6" fill={INK} />
      <ellipse cx="48" cy="52" rx="3" ry="1.8" fill="#FB7185" opacity="0.55" />
      <ellipse cx="72" cy="52" rx="3" ry="1.8" fill="#FB7185" opacity="0.55" />
      <path d="M54 54C57 57.5 63 57.5 66 54" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <HeartMotif cx={88} cy={32} scale={0.75} fill="#F43F5E" />
    </g>
  ),

  caring_father: (uid) => (
    <g>
      <defs>
        <radialGradient id={`cf-bg-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#cf-bg-${uid})`} />
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* Cozy teal sweater */}
      <path d="M29 95C32 76 44 69 60 69C76 69 88 76 91 95Z" fill="#0284C7" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M51 70L60 78L69 70" stroke="#F8FAFC" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Neck & Face */}
      <rect x="54" y="61" width="12" height="12" rx="4" fill="#FDBA74" />
      <circle cx="60" cy="46" r="18.5" fill="#FED7AA" stroke={INK} strokeWidth="2.2" />
      {/* Friendly curly hair */}
      <path d="M41 42C41 29 50 22 62 22C73 22 80 31 79 42C75 35 66 32 58 33C50 34 45 37 41 42Z" fill="#451A03" stroke={INK} strokeWidth="2" />
      {/* Round friendly glasses */}
      <circle cx="52" cy="46" r="5.5" fill="#FFFFFF" fillOpacity="0.35" stroke="#1E293B" strokeWidth="2" />
      <circle cx="68" cy="46" r="5.5" fill="#FFFFFF" fillOpacity="0.35" stroke="#1E293B" strokeWidth="2" />
      <line x1="57.5" y1="46" x2="62.5" y2="46" stroke="#1E293B" strokeWidth="2" />
      <circle cx="52" cy="46" r="2.1" fill={INK} />
      <circle cx="68" cy="46" r="2.1" fill={INK} />
      <path d="M54 55C57 58.5 63 58.5 66 55" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
      <Sparkle cx={89} cy={31} r={5} fill="#FACC15" />
    </g>
  ),

  happy_sibling: (uid) => (
    <g>
      <defs>
        <radialGradient id={`hsb-bg-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#hsb-bg-${uid})`} />
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Left sibling (purple top + pigtails/bow) */}
      <path d="M23 94C25 79 34 74 44 74C54 74 61 79 62 94Z" fill="#8B5CF6" stroke={INK} strokeWidth="2.1" />
      <circle cx="43" cy="55" r="14.5" fill="#FED7AA" stroke={INK} strokeWidth="2.1" />
      <path d="M29 52C30 40 38 36 46 37C54 38 57 45 57 52C52 46 35 45 29 52Z" fill="#92400E" stroke={INK} strokeWidth="1.8" />
      <circle cx="38" cy="55" r="2.2" fill={INK} />
      <circle cx="48" cy="55" r="2.2" fill={INK} />
      <path d="M39 60C41 63 45 63 47 60" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Right sibling (amber top + sporty cap) */}
      <path d="M58 94C60 79 68 74 77 74C87 74 95 79 97 94Z" fill="#F97316" stroke={INK} strokeWidth="2.1" />
      <circle cx="77" cy="53" r="14.5" fill="#FDBA74" stroke={INK} strokeWidth="2.1" />
      <path d="M63 48C64 38 72 35 80 35C87 35 92 41 92 48Z" fill="#0EA5E9" stroke={INK} strokeWidth="1.9" />
      <path d="M62 48H96" stroke="#0284C7" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="72" cy="53" r="2.2" fill={INK} />
      <circle cx="82" cy="53" r="2.2" fill={INK} />
      <path d="M73 59C75 62 79 62 81 59" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <Sparkle cx={60} cy={26} r={5.5} fill="#FACC15" />
    </g>
  ),

  wise_grandparent: (uid) => (
    <g>
      <defs>
        <radialGradient id={`wg-bg-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#EDE9FE" />
          <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#wg-bg-${uid})`} />
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* Cozy knitted sweater */}
      <path d="M30 95C33 76 44 69 60 69C76 69 87 76 90 95Z" fill="#10B981" stroke={INK} strokeWidth="2.2" />
      {/* Silver hair bun & soft waves */}
      <circle cx="60" cy="24" r="9" fill="#E2E8F0" stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="48" r="19" fill="#FED7AA" stroke={INK} strokeWidth="2.2" />
      <path d="M41 44C42 30 51 25 60 25C69 25 78 30 79 44C74 37 66 36 60 39C54 36 46 37 41 44Z" fill="#E2E8F0" stroke={INK} strokeWidth="2" />
      {/* Gold wire spectacles */}
      <circle cx="52" cy="48" r="5" fill="#FFFFFF" fillOpacity="0.45" stroke="#D97706" strokeWidth="1.8" />
      <circle cx="68" cy="48" r="5" fill="#FFFFFF" fillOpacity="0.45" stroke="#D97706" strokeWidth="1.8" />
      <line x1="57" y1="48" x2="63" y2="48" stroke="#D97706" strokeWidth="1.8" />
      <circle cx="52" cy="48" r="2" fill={INK} />
      <circle cx="68" cy="48" r="2" fill={INK} />
      <path d="M54 56C57 59.5 63 59.5 66 56" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <HeartMotif cx={31} cy={31} scale={0.68} fill="#FB7185" />
    </g>
  ),

  best_friends: (uid) => (
    <g>
      <defs>
        <linearGradient id={`bf-arc-${uid}`} x1="20" y1="40" x2="100" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Rainbow arch behind buddies */}
      <path d="M22 65A38 38 0 0 1 98 65" fill="none" stroke={`url(#bf-arc-${uid})`} strokeWidth="8" strokeLinecap="round" />
      {/* Two cheerful buddies waving arms together */}
      <path d="M24 94C26 78 34 73 43 73C52 73 58 78 59 94Z" fill="#0EA5E9" stroke={INK} strokeWidth="2.1" />
      <path d="M61 94C62 78 69 73 77 73C86 73 94 78 96 94Z" fill="#FB7185" stroke={INK} strokeWidth="2.1" />
      {/* High-five arms */}
      <path d="M52 76L60 59L68 76" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="42" cy="56" r="13.5" fill="#FED7AA" stroke={INK} strokeWidth="2.1" />
      <circle cx="78" cy="56" r="13.5" fill="#FDBA74" stroke={INK} strokeWidth="2.1" />
      <circle cx="38" cy="55" r="2" fill={INK} />
      <circle cx="46" cy="55" r="2" fill={INK} />
      <path d="M39 60C41 62.5 44 62.5 46 60" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="74" cy="55" r="2" fill={INK} />
      <circle cx="82" cy="55" r="2" fill={INK} />
      <path d="M75 60C77 62.5 80 62.5 82 60" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <Sparkle cx={60} cy={51} r={6} fill="#FACC15" />
    </g>
  ),

  cozy_home: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ch-roof-${uid}`} x1="20" y1="26" x2="100" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={5.5} />
      {/* Chimney & heart smoke */}
      <rect x="74" y="25" width="11" height="22" rx="2" fill="#9A3412" stroke={INK} strokeWidth="2" />
      <HeartMotif cx={81} cy={18} scale={0.5} fill="#CBD5E1" />
      {/* Cottage walls */}
      <rect x="28" y="52" width="64" height="44" rx="4" fill="#FFFBEB" stroke={INK} strokeWidth="2.2" />
      {/* Pitched terracotta roof */}
      <path d="M18 55L60 23L102 55Z" fill={`url(#ch-roof-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      {/* Arched wooden front door */}
      <path d="M51 96V72C51 67 69 67 69 72V96Z" fill="#B45309" stroke={INK} strokeWidth="2.1" />
      <circle cx="64" cy="83" r="2" fill="#FDE047" />
      {/* Glowing warm windows */}
      <rect x="34" y="64" width="12" height="12" rx="2.5" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
      <rect x="74" y="64" width="12" height="12" rx="2.5" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
      {/* Green garden bushes */}
      <circle cx="29" cy="92" r="7" fill="#22C55E" stroke={INK} strokeWidth="1.8" />
      <circle cx="91" cy="92" r="7" fill="#22C55E" stroke={INK} strokeWidth="1.8" />
    </g>
  ),

  ruby_red: (uid) => (
    <g>
      <defs>
        <linearGradient id={`rr-gem-${uid}`} x1="30" y1="22" x2="90" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={5} />
      {/* Crimson paint splash behind */}
      <circle cx="60" cy="58" r="34" fill="#FEE2E2" />
      {/* Faceted Ruby Gem */}
      <path d="M37 33H83L96 52L60 95L24 52Z" fill={`url(#rr-gem-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M37 33L46 52H74L83 33M46 52L60 95L74 52M24 52H96" stroke="#FECDD3" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
      <Sparkle cx={88} cy={27} r={6} fill="#FDE047" />
      <Sparkle cx={27} cy={35} r={4.5} fill="#FFFFFF" />
    </g>
  ),

  sapphire_blue: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sb-gem-${uid}`} x1="30" y1="22" x2="90" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={5} />
      <circle cx="60" cy="58" r="34" fill="#DBEAFE" />
      {/* Octagonal / Teardrop Sapphire Jewel */}
      <path d="M60 22L88 46L76 92H44L32 46Z" fill={`url(#sb-gem-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60 36L74 50L67 79H53L46 50Z" fill="#93C5FD" fillOpacity="0.45" stroke="#EFF6FF" strokeWidth="1.6" />
      <path d="M60 22V36M88 46L74 50M32 46L46 50" stroke="#DBEAFE" strokeWidth="1.5" />
      <Sparkle cx={91} cy={30} r={6} fill="#38BDF8" />
      <Sparkle cx={28} cy={72} r={4.5} fill="#FDE047" />
    </g>
  ),

  sunflower_yellow: (uid) => (
    <g>
      <defs>
        <radialGradient id={`sy-gem-${uid}`} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={5} />
      <circle cx="60" cy="58" r="35" fill="#FEF9C3" />
      {/* Sunflower Petals framing glowing yellow topaz */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <ellipse
          key={deg}
          cx={60 + Math.cos((deg * Math.PI) / 180) * 26}
          cy={58 + Math.sin((deg * Math.PI) / 180) * 26}
          rx="8"
          ry="8"
          fill="#FACC15"
          stroke={INK}
          strokeWidth="1.8"
        />
      ))}
      <circle cx="60" cy="58" r="20" fill={`url(#sy-gem-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="60" cy="58" r="11" fill="#FEF08A" stroke="#D97706" strokeWidth="1.5" />
      <Sparkle cx={89} cy={27} r={5.5} fill="#FDE047" />
    </g>
  ),

  emerald_green: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eg-gem-${uid}`} x1="30" y1="24" x2="90" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#065F46" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={5} />
      <circle cx="60" cy="58" r="34" fill="#D1FAE5" />
      {/* Emerald-Cut Gemstone */}
      <path d="M40 25H80L91 37V81L80 93H40L29 81V37Z" fill={`url(#eg-gem-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M46 37H74L79 44V74L74 81H46L41 74V44Z" fill="#34D399" fillOpacity="0.45" stroke="#ECFDF5" strokeWidth="1.7" />
      <path d="M40 25L46 37M80 25L74 37M91 37L79 44M29 37L41 44" stroke="#D1FAE5" strokeWidth="1.5" />
      <Sparkle cx={90} cy={28} r={6} fill="#FDE047" />
      <Sparkle cx={27} cy={78} r={4.5} fill="#6EE7B7" />
    </g>
  ),

  treasure_count_three: (uid) => (
    <g>
      <defs>
        <radialGradient id={`tc3-coin-${uid}`} cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={36} ry={5.5} />
      {/* Velvet cushion */}
      <path d="M18 82C22 69 98 69 102 82C102 93 90 97 60 97C30 97 18 93 18 82Z" fill="#7C3AED" stroke={INK} strokeWidth="2.2" />
      {/* Three distinct gleaming gold star coins */}
      {[
        { cx: 34, cy: 62 },
        { cx: 60, cy: 48 },
        { cx: 86, cy: 62 },
      ].map((c, idx) => (
        <g key={idx}>
          <circle cx={c.cx} cy={c.cy} r="15" fill={`url(#tc3-coin-${uid})`} stroke={INK} strokeWidth="2.2" />
          <circle cx={c.cx} cy={c.cy} r="10.5" fill="#FDE047" stroke="#B45309" strokeWidth="1.4" />
          <Sparkle cx={c.cx} cy={c.cy} r={5.5} fill="#F59E0B" />
        </g>
      ))}
      <Sparkle cx={60} cy={21} r={5} fill="#FDE047" />
    </g>
  ),

  treasure_count_ten: (uid) => (
    <g>
      <defs>
        <linearGradient id={`tc10-chest-${uid}`} x1="25" y1="50" x2="95" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={6} />
      {/* Overflowing pile of golden coins */}
      <rect x="24" y="58" width="72" height="36" rx="7" fill={`url(#tc10-chest-${uid})`} stroke={INK} strokeWidth="2.3" />
      <path d="M24 58C24 41 38 34 60 34C82 34 96 41 96 58Z" fill="#D97706" stroke={INK} strokeWidth="2.2" />
      {/* Shimmering gold coin pile & gems */}
      {[
        [36, 56],
        [48, 52],
        [60, 50],
        [72, 52],
        [84, 56],
      ].map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r="7.5" fill="#FDE047" stroke={INK} strokeWidth="1.8" />
      ))}
      {/* Brass lock clasp */}
      <rect x="53" y="55" width="14" height="16" rx="3.5" fill="#FACC15" stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="63" r="2.2" fill={INK} />
      {/* Floating star medallion showing 10 sparkles */}
      <circle cx="91" cy="30" r="12" fill="#FACC15" stroke={INK} strokeWidth="2" />
      <text x="91" y="34.5" textAnchor="middle" fontSize="12" fontWeight="900" fill={INK} fontFamily="sans-serif">
        10
      </text>
      <Sparkle cx={27} cy={31} r={5.5} fill="#38BDF8" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
