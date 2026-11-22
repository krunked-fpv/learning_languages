import { GroundShadow, HeartMotif, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT2_SCENES = {
  water_carafe: (uid) => (
    <g>
      <defs>
        <linearGradient id={`wc-water-${uid}`} x1="40" y1="50" x2="80" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={24} ry={5} />
      {/* Handle */}
      <path d="M77 45C92 45 92 78 78 78" fill="none" stroke="#BAE6FD" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M77 45C92 45 92 78 78 78" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* Glass Carafe Outer */}
      <path
        d="M44 26H76L72 42C80 50 84 64 81 84C80 91 72 95 60 95C48 95 40 91 39 84C36 64 40 50 48 42Z"
        fill="#E0F2FE"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Shimmering Water Fill */}
      <path
        d="M41 58C48 54 68 62 79 57C81 66 80 76 78 84C77 89 70 92 60 92C50 92 43 89 42 84C40 76 39 66 41 58Z"
        fill={`url(#wc-water-${uid})`}
      />
      {/* Ice cubes & lemon slice */}
      <rect x="48" y="61" width="11" height="11" rx="2.5" transform="rotate(-12 53 66)" fill="#FFFFFF" opacity="0.65" stroke="#BAE6FD" strokeWidth="1.2" />
      <circle cx="67" cy="69" r="7" fill="#FDE047" stroke="#EAB308" strokeWidth="1.5" />
      {/* Glass Rim & Shine */}
      <ellipse cx="60" cy="26" rx="16" ry="3.5" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path d="M47 52C44 62 44 74 47 83" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <Sparkle cx={86} cy={30} r={5} fill="#38BDF8" />
    </g>
  ),

  warm_bread: (uid) => (
    <g>
      <defs>
        <linearGradient id={`wb-loaf-${uid}`} x1="28" y1="36" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="55%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={98} rx={36} ry={6} />
      {/* Wooden board */}
      <ellipse cx="60" cy="87" rx="40" ry="9" fill="#B45309" stroke={INK} strokeWidth="2.1" />
      {/* Crusty artisan loaf */}
      <path
        d="M22 76C22 50 40 38 62 38C82 38 96 52 96 76C96 82 88 85 60 85C32 85 22 82 22 76Z"
        fill={`url(#wb-loaf-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
      />
      {/* Scored golden slashes */}
      <path d="M40 48C46 53 50 58 51 64" stroke="#FEF3C7" strokeWidth="4" strokeLinecap="round" />
      <path d="M56 44C63 50 67 56 68 63" stroke="#FEF3C7" strokeWidth="4" strokeLinecap="round" />
      <path d="M72 48C78 53 81 59 82 64" stroke="#FEF3C7" strokeWidth="4" strokeLinecap="round" />
      {/* Warm rising steam */}
      <path d="M44 31C41 26 46 21 43 16" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M62 29C59 24 64 19 61 14" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M78 32C75 27 80 22 77 17" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </g>
  ),

  golden_cheese: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gc-top-${uid}`} x1="25" y1="36" x2="90" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
        <linearGradient id={`gc-front-${uid}`} x1="25" y1="62" x2="92" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={97} rx={36} ry={6} />
      {/* Ceramic plate */}
      <ellipse cx="60" cy="87" rx="40" ry="9" fill="#F8FAFC" stroke={INK} strokeWidth="2.1" />
      <ellipse cx="60" cy="85" rx="30" ry="5.5" fill="#E2E8F0" />
      {/* Cheese Wedge Top */}
      <path d="M24 60L75 34C85 40 93 48 94 58L24 60Z" fill={`url(#gc-top-${uid})`} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Cheese Wedge Front Face */}
      <path d="M24 60L94 58V81L24 83Z" fill={`url(#gc-front-${uid})`} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Swiss cheese holes */}
      <ellipse cx="42" cy="70" rx="5.5" ry="4.5" fill="#B45309" opacity="0.65" />
      <ellipse cx="63" cy="74" rx="4.2" ry="3.5" fill="#B45309" opacity="0.65" />
      <ellipse cx="78" cy="66" rx="5" ry="4.2" fill="#B45309" opacity="0.65" />
      <ellipse cx="65" cy="49" rx="4.5" ry="2.5" fill="#D97706" opacity="0.6" />
      <Sparkle cx={84} cy={27} r={5} fill="#FACC15" />
    </g>
  ),

  flaky_pastry: (uid) => (
    <g>
      <defs>
        <linearGradient id={`fp-crois-${uid}`} x1="24" y1="40" x2="96" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={97} rx={34} ry={6} />
      {/* Croissant crescent */}
      <path
        d="M20 77C18 65 29 52 44 46C55 41 65 41 76 46C91 52 102 65 100 77C94 82 84 79 80 71C74 66 46 66 40 71C36 79 26 82 20 77Z"
        fill={`url(#fp-crois-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Center plump crown fold */}
      <path
        d="M42 46C46 34 74 34 78 46C73 61 47 61 42 46Z"
        fill="#FBBF24"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Flaky pastry ridge folds */}
      <path d="M32 56C35 61 36 67 34 73" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M88 56C85 61 84 67 86 73" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* Glossy butter highlight */}
      <path d="M51 42C56 39 64 39 69 42" stroke="#FEF9C3" strokeWidth="3" strokeLinecap="round" />
      {/* Warm steam + sparkle */}
      <path d="M50 28C48 23 52 19 49 14" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M68 27C66 22 70 18 67 13" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Sparkle cx={89} cy={31} r={5} fill="#FDE047" />
    </g>
  ),

  hot_chocolate: (uid) => (
    <g>
      <defs>
        <linearGradient id={`hc-mug-${uid}`} x1="30" y1="48" x2="86" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <GroundShadow cx={58} cy={99} rx={30} ry={5.5} />
      {/* Handle */}
      <path d="M80 56C95 56 95 82 80 82" fill="none" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" />
      <path d="M80 56C95 56 95 82 80 82" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {/* Mug body */}
      <path
        d="M32 50H82V80C82 90 73 96 57 96C41 96 32 90 32 80Z"
        fill={`url(#hc-mug-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Cute polka dots */}
      <circle cx="43" cy="68" r="3.2" fill="#FFE4E6" />
      <circle cx="57" cy="79" r="3.2" fill="#FFE4E6" />
      <circle cx="71" cy="67" r="3.2" fill="#FFE4E6" />
      {/* Cocoa rim & velvety chocolate */}
      <ellipse cx="57" cy="50" rx="25" ry="6.5" fill="#78350F" stroke={INK} strokeWidth="2.1" />
      {/* Fluffy floating marshmallows */}
      <rect x="40" y="42" width="11" height="9" rx="3" transform="rotate(-8 45 46)" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
      <rect x="52" y="40" width="11" height="9" rx="3" transform="rotate(6 57 44)" fill="#FFFBEB" stroke={INK} strokeWidth="1.6" />
      <rect x="64" y="43" width="10" height="8" rx="3" transform="rotate(-5 69 47)" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
      {/* Heart steam */}
      <HeartMotif cx={57} cy={26} scale={0.75} fill="#FDA4AF" />
    </g>
  ),

  orange_juice: (uid) => (
    <g>
      <defs>
        <linearGradient id={`oj-liq-${uid}`} x1="42" y1="44" x2="78" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={24} ry={5} />
      {/* Striped bendy straw */}
      <path d="M68 46L78 20L90 22" fill="none" stroke="#F43F5E" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 46L78 20L90 22" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
      {/* Orange slice wheel on rim */}
      <circle cx="38" cy="40" r="13" fill="#FB923C" stroke={INK} strokeWidth="2" />
      <circle cx="38" cy="40" r="9.5" fill="#FDE047" />
      <path d="M38 30.5V49.5M28.5 40H47.5M31.5 33.5L44.5 46.5M44.5 33.5L31.5 46.5" stroke="#FB923C" strokeWidth="1.5" />
      {/* Glass body */}
      <path d="M38 38H82L76 94C76 96 70 97 60 97C50 97 44 96 44 94Z" fill="#FFF7ED" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      {/* Bright tangerine juice */}
      <path d="M40 49C50 47 68 51 80 49L75 93C75 94 69 95 60 95C51 95 45 94 45 93Z" fill={`url(#oj-liq-${uid})`} />
      {/* Shine */}
      <path d="M45 55L48 86" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" opacity="0.65" />
      <Sparkle cx={89} cy={42} r={4.5} fill="#FACC15" />
    </g>
  ),

  sweet_gelato: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sg-cone-${uid}`} x1="42" y1="62" x2="78" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={104} rx={18} ry={4} />
      {/* Wafer roll */}
      <rect x="66" y="21" width="7" height="26" rx="3" transform="rotate(24 69 34)" fill="#D97706" stroke={INK} strokeWidth="1.8" />
      {/* Waffle cone */}
      <path d="M41 60H79L60 103Z" fill={`url(#sg-cone-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M48 68L67 84M53 82L63 70M69 68L52 84" stroke="#92400E" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      {/* Mango & Strawberry Gelato Scoops */}
      <circle cx="48" cy="52" r="14" fill="#FDE047" stroke={INK} strokeWidth="2.1" />
      <circle cx="72" cy="52" r="14" fill="#FB7185" stroke={INK} strokeWidth="2.1" />
      <circle cx="60" cy="39" r="15" fill="#6EE7B7" stroke={INK} strokeWidth="2.2" />
      {/* Glossy scoops highlights & cherry */}
      <path d="M51 34C54 29 61 28 65 30" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <circle cx="60" cy="23" r="5" fill="#E11D48" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={26} cy={38} r={5} fill="#FACC15" />
    </g>
  ),

  crispy_treat: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ct-pretz-${uid}`} x1="25" y1="30" x2="95" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={98} rx={32} ry={5.5} />
      {/* Bakery gingham napkin */}
      <rect x="26" y="72" width="68" height="22" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path d="M34 72V94M48 72V94M62 72V94M76 72V94" stroke="#FCA5A5" strokeWidth="4" opacity="0.6" />
      {/* Golden twisted pretzel / churro loop */}
      <path
        d="M35 68C22 57 25 34 44 33C55 33 60 44 60 52C60 44 65 33 76 33C95 34 98 57 85 68C75 77 62 77 60 66C58 77 45 77 35 68Z"
        fill="none"
        stroke={INK}
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 68C22 57 25 34 44 33C55 33 60 44 60 52C60 44 65 33 76 33C95 34 98 57 85 68C75 77 62 77 60 66C58 77 45 77 35 68Z"
        fill="none"
        stroke={`url(#ct-pretz-${uid})`}
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sugar/salt crystals */}
      <rect x="34" y="42" width="3.5" height="3.5" rx="1" fill="#FFFFFF" />
      <rect x="78" y="41" width="3.5" height="3.5" rx="1" fill="#FFFFFF" />
      <rect x="58" y="64" width="3.5" height="3.5" rx="1" fill="#FFFFFF" />
      <rect x="44" y="69" width="3.5" height="3.5" rx="1" fill="#FFFFFF" />
      <Sparkle cx={88} cy={26} r={5} fill="#FDE047" />
    </g>
  ),

  fresh_apple: (uid) => (
    <g>
      <defs>
        <radialGradient id={`fa-body-${uid}`} cx="38%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="55%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={24} ry={5} />
      {/* Stem & Leaf */}
      <path d="M60 39C60 30 63 23 67 20" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M62 32C72 20 87 22 88 32C79 38 69 37 62 32Z" fill="#22C55E" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* Glossy Red Apple */}
      <path
        d="M60 39C48 33 27 38 27 60C27 80 41 94 52 94C56 94 58 92 60 92C62 92 64 94 68 94C79 94 93 80 93 60C93 38 72 33 60 39Z"
        fill={`url(#fa-body-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Specular gleam */}
      <path d="M37 49C34 55 34 64 37 70" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <circle cx="40" cy="44" r="2.2" fill="#FFFFFF" opacity="0.8" />
      <Sparkle cx={91} cy={43} r={4.5} fill="#FDE047" />
    </g>
  ),

  ripe_strawberry: (uid) => (
    <g>
      <defs>
        <radialGradient id={`rs-body-${uid}`} cx="40%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="60%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={22} ry={5} />
      {/* Plump Berry */}
      <path
        d="M60 95C42 95 29 70 31 50C33 36 45 33 60 33C75 33 87 36 89 50C91 70 78 95 60 95Z"
        fill={`url(#rs-body-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Leafy crown calyx */}
      <path
        d="M36 37L46 27L55 34L60 22L65 34L74 27L84 37L71 42L60 36L49 42Z"
        fill="#22C55E"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Golden seeds */}
      {[
        [45, 50],
        [60, 48],
        [75, 50],
        [52, 62],
        [68, 62],
        [44, 71],
        [60, 74],
        [74, 71],
        [60, 85],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.8" ry="2.7" fill="#FEF08A" />
      ))}
      <path d="M38 51C37 58 39 65 41 69" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Sparkle cx={89} cy={29} r={5} fill="#FACC15" />
    </g>
  ),

  polite_order: (uid) => (
    <g>
      <defs>
        <linearGradient id={`po-dome-${uid}`} x1="30" y1="36" x2="88" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={98} rx={36} ry={5.5} />
      {/* Handle knob */}
      <circle cx="60" cy="36" r="6" fill="#FBBF24" stroke={INK} strokeWidth="2.2" />
      {/* Silver Serving Cloche Dome */}
      <path
        d="M25 76C25 51 40 40 60 40C80 40 95 51 95 76Z"
        fill={`url(#po-dome-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M36 64C39 51 47 46 57 45" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* Platter Tray */}
      <rect x="18" y="75" width="84" height="10" rx="5" fill="#F59E0B" stroke={INK} strokeWidth="2.2" />
      {/* Tiny Order Note Card */}
      <rect x="72" y="21" width="22" height="18" rx="4" transform="rotate(10 83 30)" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
      <HeartMotif cx={83} cy={30} scale={0.5} fill="#FB7185" />
      <Sparkle cx={28} cy={34} r={5} fill="#FACC15" />
    </g>
  ),

  delicious_sparkles: (uid) => (
    <g>
      <defs>
        <radialGradient id={`ds-plate-${uid}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={34} ry={5.5} />
      {/* Fork & Spoon flanking plate */}
      <path d="M22 36V82M18 36V49C18 52 26 52 26 49V36M22 36V49" stroke="#64748B" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="98" cy="43" rx="6" ry="9" fill="#94A3B8" stroke={INK} strokeWidth="1.8" />
      <path d="M98 52V82" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      {/* Center Plate */}
      <circle cx="60" cy="60" r="30" fill={`url(#ds-plate-${uid})`} stroke={INK} strokeWidth="2.3" />
      <circle cx="60" cy="60" r="21" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.8" />
      {/* Joyful star & swirl inside plate */}
      <Sparkle cx={60} cy={60} r={11} fill="#FACC15" />
      <Sparkle cx={33} cy={27} r={6} fill="#FB7185" />
      <Sparkle cx={87} cy={26} r={5.5} fill="#38BDF8" />
      <Sparkle cx={60} cy={21} r={4.5} fill="#4ADE80" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
