import { GroundShadow, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT5_SCENES = {
  express_train: (uid) => (
    <g>
      <defs>
        <linearGradient id={`et-body-${uid}`} x1="25" y1="36" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      {/* Railway track */}
      <path d="M14 96H106" stroke="#475569" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M22 96V101M40 96V101M60 96V101M80 96V101M98 96V101" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
      {/* Steam puffs */}
      <circle cx="34" cy="26" r="8" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.6" />
      <circle cx="48" cy="22" r="10" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.6" />
      <circle cx="24" cy="34" r="6" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Smokestack */}
      <path d="M31 37H43L40 50H34Z" fill="#1E293B" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* Cab & Boiler */}
      <rect x="64" y="34" width="28" height="44" rx="5" fill="#FACC15" stroke={INK} strokeWidth="2.2" />
      <rect x="70" y="42" width="16" height="14" rx="3" fill="#BAE6FD" stroke={INK} strokeWidth="1.8" />
      <rect x="24" y="48" width="44" height="30" rx="9" fill={`url(#et-body-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Brass Headlight & Cowcatcher */}
      <circle cx="24" cy="60" r="6" fill="#FEF08A" stroke="#D97706" strokeWidth="2.2" />
      <path d="M16 78L27 78L23 89H12Z" fill="#EF4444" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* Wheels */}
      <circle cx="38" cy="84" r="9" fill="#334155" stroke={INK} strokeWidth="2.2" />
      <circle cx="38" cy="84" r="3.5" fill="#FBBF24" />
      <circle cx="62" cy="84" r="9" fill="#334155" stroke={INK} strokeWidth="2.2" />
      <circle cx="62" cy="84" r="3.5" fill="#FBBF24" />
      <circle cx="83" cy="84" r="9" fill="#334155" stroke={INK} strokeWidth="2.2" />
      <circle cx="83" cy="84" r="3.5" fill="#FBBF24" />
    </g>
  ),

  golden_ticket: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gt-card-${uid}`} x1="18" y1="36" x2="102" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={98} rx={36} ry={5} />
      <g transform="rotate(-8 60 60)">
        {/* Notched Ticket Shape */}
        <path
          d="M16 38H104V50C99 50 96 54 96 60C96 66 99 70 104 70V82H16V70C21 70 24 66 24 60C24 54 21 50 16 50Z"
          fill={`url(#gt-card-${uid})`}
          stroke={INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <rect x="24" y="45" width="72" height="30" rx="4" fill="none" stroke="#92400E" strokeWidth="1.6" />
        <line x1="78" y1="45" x2="78" y2="75" stroke="#92400E" strokeWidth="1.8" strokeDasharray="3 3" />
        {/* Starlight Emblem */}
        <Sparkle cx={48} cy={60} r={10} fill="#FFFFFF" />
        <path d="M63 54H72M63 66H72" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <Sparkle cx={89} cy={27} r={5.5} fill="#38BDF8" />
      <Sparkle cx={24} cy={88} r={4.5} fill="#FACC15" />
    </g>
  ),

  city_park: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cp-sky-${uid}`} x1="60" y1="18" x2="60" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#cp-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Park Lawn */}
      <path d="M16 74H104V100H16Z" fill="#4ADE80" stroke={INK} strokeWidth="2" />
      {/* Leafy Park Trees */}
      <rect x="25" y="57" width="6" height="20" fill="#78350F" />
      <circle cx="28" cy="48" r="12" fill="#22C55E" stroke={INK} strokeWidth="1.9" />
      <rect x="89" y="57" width="6" height="20" fill="#78350F" />
      <circle cx="92" cy="48" r="12" fill="#16A34A" stroke={INK} strokeWidth="1.9" />
      {/* Central Stone Fountain */}
      <path d="M40 81H80L75 90H45Z" fill="#CBD5E1" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="55" y="64" width="10" height="17" fill="#94A3B8" stroke={INK} strokeWidth="1.8" />
      <path d="M45 64H75L71 70H49Z" fill="#E2E8F0" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      {/* Fountain Water Arcs */}
      <path d="M60 63C60 44 45 45 45 62" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M60 63C60 44 75 45 75 62" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Sparkle cx={60} cy={38} r={4.5} fill="#38BDF8" />
    </g>
  ),

  compass_map: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cm-paper-${uid}`} x1="20" y1="26" x2="96" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Folded Explorer Map */}
      <path
        d="M20 34L44 26L74 35L98 26V82L74 91L44 82L20 91Z"
        fill={`url(#cm-paper-${uid})`}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M44 26V82M74 35V91" stroke="#D97706" strokeWidth="1.6" opacity="0.55" />
      {/* Dotted Treasure Trail & Red X */}
      <path d="M29 73C38 56 54 64 62 49C69 39 81 42 86 45" stroke="#DC2626" strokeWidth="2.6" strokeDasharray="4 4" strokeLinecap="round" fill="none" />
      <path d="M82 40L90 48M90 40L82 48" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
      {/* Brass Pocket Compass on top-left */}
      <circle cx="43" cy="68" r="17" fill="#F59E0B" stroke={INK} strokeWidth="2.2" />
      <circle cx="43" cy="68" r="12.5" fill="#1E1B4B" stroke="#FEF08A" strokeWidth="1.2" />
      <path d="M43 58L46 68L43 78L40 68Z" fill="#EF4444" />
      <path d="M43 68L46 68L43 78L40 68Z" fill="#E2E8F0" />
      <circle cx="43" cy="68" r="2.2" fill="#FACC15" />
    </g>
  ),

  bicycle_ride: (uid) => (
    <g>
      <defs>
        <linearGradient id={`br-frame-${uid}`} x1="30" y1="40" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={98} rx={38} ry={5} />
      {/* Two Spoked Wheels */}
      {[32, 88].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="77" r="17" fill="none" stroke="#1E293B" strokeWidth="4.5" />
          <circle cx={cx} cy="77" r="13.5" fill="none" stroke="#94A3B8" strokeWidth="1.8" />
          <path d={`M${cx - 12} 77H${cx + 12}M${cx} 65V89`} stroke="#CBD5E1" strokeWidth="1.5" />
          <circle cx={cx} cy="77" r="3" fill="#F59E0B" stroke={INK} strokeWidth="1.5" />
        </g>
      ))}
      {/* Teal Bicycle Frame */}
      <path
        d="M32 77L51 51H75L88 77M51 51L57 77H32M75 51L72 41H65"
        fill="none"
        stroke={`url(#br-frame-${uid})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Leather Seat & Handlebars */}
      <path d="M44 45H57" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M72 41H81" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      {/* Wicker Front Basket with Flower */}
      <rect x="78" y="45" width="16" height="13" rx="3" fill="#D97706" stroke={INK} strokeWidth="1.9" />
      <circle cx="86" cy="42" r="4" fill="#FB7185" stroke={INK} strokeWidth="1.5" />
      {/* Breeze lines */}
      <path d="M16 40H29M12 49H24" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),

  sunny_weather: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sw-sky-${uid}`} x1="60" y1="18" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#sw-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Bright Rainbow Arc */}
      <path d="M26 78A34 34 0 0 1 94 78" fill="none" stroke="#F43F5E" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 78A28 28 0 0 1 88 78" fill="none" stroke="#FACC15" strokeWidth="6" strokeLinecap="round" />
      <path d="M38 78A22 22 0 0 1 82 78" fill="none" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round" />
      {/* Bright Sun */}
      <circle cx="40" cy="40" r="14" fill="#FACC15" stroke={INK} strokeWidth="2" />
      {/* Puffy White Clouds */}
      <path d="M62 76C62 70 67 66 72 67C74 62 82 62 84 67C89 67 93 71 93 76C93 80 89 83 84 83H69C65 83 62 80 62 76Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.9" />
      <path d="M25 81C25 76 29 73 34 74C36 69 43 69 45 74C49 74 52 77 52 81C52 84 49 87 45 87H31C28 87 25 84 25 81Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.9" />
      <Sparkle cx={86} cy={34} r={5} fill="#FDE047" />
    </g>
  ),

  rainy_umbrella: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ru-canopy-${uid}`} x1="25" y1="32" x2="95" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={4.5} />
      {/* Raindrops */}
      {[
        [27, 25],
        [43, 21],
        [77, 21],
        [93, 27],
        [25, 72],
        [93, 74],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y}C${x - 4} ${y + 6} ${x - 3} ${y + 11} ${x} ${y + 11}C${x + 3} ${y + 11} ${x + 4} ${y + 6} ${x} ${y}Z`}
          fill="#38BDF8"
          stroke={INK}
          strokeWidth="1.4"
        />
      ))}
      {/* Handle Stick */}
      <path d="M60 32V87C60 95 70 95 70 87" fill="none" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
      {/* Scalloped Striped Umbrella Canopy */}
      <path
        d="M22 60C22 38 39 27 60 27C81 27 98 38 98 60C91 56 84 56 79 60C72 56 65 56 60 60C55 56 48 56 41 60C36 56 29 56 22 60Z"
        fill={`url(#ru-canopy-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M60 27C51 35 45 46 41 60C48 56 55 56 60 60C65 56 72 56 79 60C75 46 69 35 60 27Z" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      <circle cx="60" cy="25" r="3" fill="#F59E0B" stroke={INK} strokeWidth="1.6" />
    </g>
  ),

  direction_left_right: (uid) => (
    <g>
      <defs>
        <linearGradient id={`dlr-post-${uid}`} x1="56" y1="20" x2="64" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      {/* Green meadow mound */}
      <ellipse cx="60" cy="96" rx="34" ry="8" fill="#4ADE80" stroke={INK} strokeWidth="2" />
      {/* Wooden signpost */}
      <rect x="55" y="22" width="10" height="74" rx="3" fill={`url(#dlr-post-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Left Coral Arrow */}
      <path d="M20 40L32 29H74V51H32Z" fill="#FB7185" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M33 40H62M40 34L33 40L40 46" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right Teal Arrow */}
      <path d="M46 57H88L100 68L88 79H46Z" fill="#0EA5E9" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M58 68H87M80 62L87 68L80 74" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Sparkle cx={89} cy={30} r={4.5} fill="#FACC15" />
    </g>
  ),

  museum_lantern: (uid) => (
    <g>
      <defs>
        <radialGradient id={`ml-glow-${uid}`} cx="50%" cy="52%" r="48%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={24} ry={4.5} />
      <circle cx="60" cy="58" r="36" fill={`url(#ml-glow-${uid})`} />
      {/* Top Ring & Ornate Cap */}
      <circle cx="60" cy="21" r="5" fill="none" stroke="#1E293B" strokeWidth="3" />
      <path d="M35 37L60 25L85 37Z" fill="#334155" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Glowing Glass Lantern Cage */}
      <path d="M40 37H80L75 84H45Z" fill="#FEF08A" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M52 37L54 84M68 37L66 84" stroke="#334155" strokeWidth="2.2" />
      {/* Cozy Candle Flame inside */}
      <path d="M60 49C55 57 55 66 60 68C65 66 65 57 60 49Z" fill="#F97316" stroke="#EA580C" strokeWidth="1.2" />
      <ellipse cx="60" cy="61" rx="2.5" ry="4.5" fill="#FFFFFF" />
      {/* Iron Base */}
      <rect x="41" y="84" width="38" height="10" rx="4" fill="#334155" stroke={INK} strokeWidth="2.2" />
      <Sparkle cx={27} cy={45} r={4.5} fill="#FDE047" />
      <Sparkle cx={93} cy={47} r={4.5} fill="#FDE047" />
    </g>
  ),

  backpack_ready: (uid) => (
    <g>
      <defs>
        <linearGradient id={`bp-pack-${uid}`} x1="32" y1="30" x2="88" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={30} ry={5.5} />
      {/* Top Handle & Bedroll */}
      <path d="M49 28C49 19 71 19 71 28" fill="none" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="33" y="25" width="54" height="14" rx="7" fill="#F59E0B" stroke={INK} strokeWidth="2.1" />
      {/* Main Pack Body */}
      <rect x="30" y="36" width="60" height="58" rx="16" fill={`url(#bp-pack-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Top Flap */}
      <path d="M30 48C30 39 38 36 60 36C82 36 90 39 90 48V56C90 61 82 63 60 63C38 63 30 61 30 56Z" fill="#16A34A" stroke={INK} strokeWidth="2.2" />
      {/* Front Pocket */}
      <rect x="39" y="67" width="42" height="22" rx="7" fill="#D97706" stroke={INK} strokeWidth="2.1" />
      {/* Leather straps & brass buckles */}
      <rect x="41" y="45" width="7" height="23" rx="2" fill="#92400E" stroke={INK} strokeWidth="1.6" />
      <rect x="72" y="45" width="7" height="23" rx="2" fill="#92400E" stroke={INK} strokeWidth="1.6" />
      <rect x="40" y="59" width="9" height="6" rx="1.5" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
      <rect x="71" y="59" width="9" height="6" rx="1.5" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
      <Sparkle cx={60} cy={78} r={5.5} fill="#FEF08A" />
    </g>
  ),

  party_confetti: (uid) => (
    <g>
      <defs>
        <linearGradient id={`pc-cone-${uid}`} x1="25" y1="60" x2="55" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={42} cy={99} rx={20} ry={4.5} />
      {/* Popper Cone */}
      <path d="M23 93L41 53L63 75Z" fill={`url(#pc-cone-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M32 73L49 82M37 62L55 78" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
      {/* Bursting Ribbons & Confetti */}
      <path d="M54 55C60 39 74 36 80 42" stroke="#EC4899" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M62 63C74 58 84 65 92 59" stroke="#3B82F6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M46 47C45 34 54 24 62 24" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <rect x="72" y="25" width="9" height="9" rx="2" transform="rotate(25 76 29)" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      <polygon points="88,42 97,46 91,54" fill="#FB7185" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="42" cy="27" r="4.5" fill="#38BDF8" stroke={INK} strokeWidth="1.5" />
      <Sparkle cx={66} cy={43} r={6} fill="#FACC15" />
      <Sparkle cx={90} cy={77} r={5} fill="#A78BFA" />
    </g>
  ),

  starlight_trophy: (uid) => (
    <g>
      <defs>
        <linearGradient id={`st-cup-${uid}`} x1="34" y1="24" x2="86" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Handles */}
      <path d="M36 33C20 33 20 58 37 59" fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
      <path d="M36 33C20 33 20 58 37 59" fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M84 33C100 33 100 58 83 59" fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
      <path d="M84 33C100 33 100 58 83 59" fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round" />
      {/* Pedestal Base */}
      <rect x="44" y="83" width="32" height="12" rx="4" fill="#78350F" stroke={INK} strokeWidth="2.2" />
      <rect x="54" y="69" width="12" height="15" fill="#D97706" stroke={INK} strokeWidth="2.1" />
      {/* Cup Chalice */}
      <path d="M34 27H86L81 55C79 67 70 72 60 72C50 72 41 67 39 55Z" fill={`url(#st-cup-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <ellipse cx="60" cy="27" rx="26" ry="5" fill="#FEF08A" stroke={INK} strokeWidth="2" />
      {/* Sapphire Gem & Star */}
      <Sparkle cx={60} cy={50} r={9} fill="#38BDF8" />
      <Sparkle cx={27} cy={23} r={5} fill="#FDE047" />
      <Sparkle cx={94} cy={23} r={5} fill="#FDE047" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
