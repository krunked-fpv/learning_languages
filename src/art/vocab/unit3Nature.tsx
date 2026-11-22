import { GroundShadow, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT3_SCENES = {
  playful_dog: (uid) => (
    <g>
      <defs>
        <radialGradient id={`pd-fur-${uid}`} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={30} ry={5.5} />
      {/* Wagging tail */}
      <path d="M84 78C96 72 99 57 92 50" stroke="#D97706" strokeWidth="7.5" strokeLinecap="round" fill="none" />
      <path d="M84 78C96 72 99 57 92 50" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Sitting puppy body */}
      <path d="M40 64C35 76 34 94 45 96H77C87 94 86 74 79 64Z" fill={`url(#pd-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="60" cy="81" rx="11" ry="13" fill="#FEF3C7" />
      {/* Collar + golden tag */}
      <path d="M44 63Q60 70 76 63" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="70" r="4" fill="#FACC15" stroke={INK} strokeWidth="1.5" />
      {/* Floppy brown ears */}
      <ellipse cx="33" cy="48" rx="9" ry="17" transform="rotate(18 33 48)" fill="#92400E" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="87" cy="48" rx="9" ry="17" transform="rotate(-18 87 48)" fill="#92400E" stroke={INK} strokeWidth="2.2" />
      {/* Puppy head */}
      <circle cx="60" cy="43" r="21" fill={`url(#pd-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="60" cy="50" rx="12" ry="9" fill="#FEF3C7" />
      {/* Eyes, nose & happy tongue */}
      <circle cx="51" cy="39" r="3.4" fill={INK} />
      <circle cx="69" cy="39" r="3.4" fill={INK} />
      <circle cx="52.2" cy="37.8" r="1.3" fill="#FFFFFF" />
      <circle cx="70.2" cy="37.8" r="1.3" fill="#FFFFFF" />
      <ellipse cx="60" cy="46" rx="4.5" ry="3.2" fill={INK} />
      <path d="M55 51C57 54 63 54 65 51" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M57 53C57 60 63 60 63 53Z" fill="#FB7185" stroke={INK} strokeWidth="1.5" />
    </g>
  ),

  cozy_cat: (uid) => (
    <g>
      <defs>
        <radialGradient id={`cc-fur-${uid}`} cx="45%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#EA580C" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={31} ry={5.5} />
      {/* Curled tail */}
      <path d="M84 85C99 84 102 64 90 58" stroke="#EA580C" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M84 85C99 84 102 64 90 58" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Kitty body */}
      <ellipse cx="62" cy="79" rx="23" ry="16" fill={`url(#cc-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="60" cy="83" rx="12" ry="9" fill="#FFF7ED" />
      {/* Pointed cat ears */}
      <path d="M36 44L34 22L50 32Z" fill="#EA580C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M38 40L37 27L46 33Z" fill="#FDA4AF" />
      <path d="M84 44L86 22L70 32Z" fill="#EA580C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M82 40L83 27L74 33Z" fill="#FDA4AF" />
      {/* Head */}
      <ellipse cx="60" cy="46" rx="23" ry="19" fill={`url(#cc-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Tabby forehead stripes */}
      <path d="M55 29V35M60 28V36M65 29V35" stroke="#9A3412" strokeWidth="2.4" strokeLinecap="round" />
      {/* Eyes & whiskers */}
      <circle cx="50" cy="45" r="3.4" fill={INK} />
      <circle cx="70" cy="45" r="3.4" fill={INK} />
      <circle cx="51" cy="43.8" r="1.3" fill="#FFFFFF" />
      <circle cx="71" cy="43.8" r="1.3" fill="#FFFFFF" />
      <path d="M57 50H63L60 53.5Z" fill="#FB7185" />
      <path d="M53 55C56 57.5 60 56 60 54C60 56 64 57.5 67 55" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M40 48L26 45M40 52L26 53M80 48L94 45M80 52L94 53" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),

  songbird_branch: (uid) => (
    <g>
      <defs>
        <radialGradient id={`sb-body-${uid}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
      </defs>
      {/* Mossy branch */}
      <path d="M16 84Q56 76 104 82" stroke="#78350F" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M16 84Q56 76 104 82" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Leaves & flower on branch */}
      <path d="M84 80C89 70 100 70 102 78C95 84 88 83 84 80Z" fill="#22C55E" stroke={INK} strokeWidth="1.8" />
      <circle cx="26" cy="76" r="5" fill="#F9A8D4" stroke={INK} strokeWidth="1.6" />
      {/* Tail & Songbird body */}
      <path d="M35 66L17 55L23 73Z" fill="#0369A1" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="56" cy="61" rx="22" ry="18" fill={`url(#sb-body-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Golden chest */}
      <path d="M48 62C51 74 67 77 75 66C70 57 54 55 48 62Z" fill="#FDE047" />
      {/* Wing */}
      <path d="M39 58C45 50 61 52 63 63C55 69 43 66 39 58Z" fill="#0EA5E9" stroke={INK} strokeWidth="2" />
      {/* Head & beak */}
      <circle cx="67" cy="43" r="14" fill={`url(#sb-body-${uid})`} stroke={INK} strokeWidth="2.2" />
      <path d="M79 40L91 44L79 48Z" fill="#F59E0B" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="71" cy="40" r="2.8" fill={INK} />
      <circle cx="72" cy="39" r="1.1" fill="#FFFFFF" />
      {/* Floating musical notes */}
      <path d="M87 28V17L97 14V25" stroke="#8B5CF6" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="84.5" cy="28" r="3" fill="#8B5CF6" />
      <circle cx="94.5" cy="25" r="3" fill="#8B5CF6" />
    </g>
  ),

  jumping_fish: (uid) => (
    <g>
      <defs>
        <linearGradient id={`jf-fish-${uid}`} x1="34" y1="26" x2="86" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      {/* Splashing ocean waves */}
      <path d="M16 84Q30 74 44 84T74 84T104 84V102H16Z" fill="#0EA5E9" stroke={INK} strokeWidth="2" />
      <path d="M18 92Q38 85 58 92T102 92V102H18Z" fill="#0284C7" />
      {/* Jumping curved tropical fish */}
      <g transform="rotate(-18 60 52)">
        <path d="M26 52L14 40V64Z" fill="#FACC15" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M54 34L62 21L70 35Z" fill="#FDE047" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="58" cy="52" rx="28" ry="18" fill={`url(#jf-fish-${uid})`} stroke={INK} strokeWidth="2.3" />
        {/* Turquoise stripes */}
        <path d="M46 37C49 45 49 59 46 67" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
        <path d="M62 35C65 44 65 60 62 69" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
        <circle cx="74" cy="47" r="3.4" fill="#FFFFFF" stroke={INK} strokeWidth="1.5" />
        <circle cx="75" cy="47" r="1.8" fill={INK} />
        <path d="M77 56C74 59 70 59 68 57" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
      {/* Splash droplets */}
      <circle cx="34" cy="70" r="3.2" fill="#7DD3FC" stroke={INK} strokeWidth="1.3" />
      <circle cx="88" cy="68" r="3" fill="#7DD3FC" stroke={INK} strokeWidth="1.3" />
      <Sparkle cx={90} cy={30} r={5} fill="#FACC15" />
    </g>
  ),

  gentle_horse: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gh-coat-${uid}`} x1="36" y1="24" x2="88" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* Flowing golden-caramel mane */}
      <path d="M36 27C22 36 22 68 31 87L47 78L43 32Z" fill="#78350F" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Neck & Ears */}
      <path d="M40 50L33 95H71L66 56Z" fill={`url(#gh-coat-${uid})`} stroke={INK} strokeWidth="2.2" />
      <path d="M47 30L44 15L57 25Z" fill="#B45309" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M68 29L74 15L79 29Z" fill="#B45309" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Friendly Horse Head & Snout */}
      <path
        d="M44 30C47 22 72 22 76 31L89 58C92 65 86 74 77 73L58 67C50 64 43 52 44 30Z"
        fill={`url(#gh-coat-${uid})`}
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Cream blaze & soft muzzle */}
      <path d="M62 29L73 53L65 55L57 31Z" fill="#FEF3C7" />
      <ellipse cx="81" cy="64" rx="10" ry="9" fill="#FDE68A" stroke={INK} strokeWidth="2" />
      <circle cx="84" cy="62" r="2" fill={INK} />
      <path d="M77 68C80 70 84 70 86 68" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Warm eye */}
      <circle cx="60" cy="40" r="3.4" fill={INK} />
      <circle cx="61" cy="39" r="1.2" fill="#FFFFFF" />
      <Sparkle cx={27} cy={27} r={4.5} fill="#FACC15" />
    </g>
  ),

  wise_turtle: (uid) => (
    <g>
      <defs>
        <radialGradient id={`wt-shell-${uid}`} cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#15803D" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={97} rx={34} ry={5.5} />
      {/* Turtle Flippers/Legs */}
      <ellipse cx="38" cy="86" rx="8" ry="6" fill="#86EFAC" stroke={INK} strokeWidth="2" />
      <ellipse cx="72" cy="86" rx="8" ry="6" fill="#86EFAC" stroke={INK} strokeWidth="2" />
      {/* Friendly Head */}
      <path d="M75 64C84 54 98 54 99 66C100 75 91 80 77 76Z" fill="#86EFAC" stroke={INK} strokeWidth="2.2" />
      <circle cx="90" cy="62" r="2.7" fill={INK} />
      <circle cx="90.8" cy="61" r="1" fill="#FFFFFF" />
      <path d="M87 69C90 71 94 70 96 68" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Domed Hexagon Shell */}
      <path d="M23 76C23 47 40 35 57 35C75 35 86 48 86 76Z" fill={`url(#wt-shell-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Shell Rim */}
      <rect x="20" y="73" width="68" height="9" rx="4.5" fill="#FBBF24" stroke={INK} strokeWidth="2.1" />
      {/* Geometric Shell Plates */}
      <path d="M46 47H64L70 59L61 70H49L40 59Z" fill="#FDE047" stroke="#166534" strokeWidth="2" opacity="0.85" />
      <path d="M35 55L40 59M74 54L70 59M55 37V47" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
      <Sparkle cx={28} cy={35} r={5} fill="#FACC15" />
    </g>
  ),

  colorful_butterfly: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cb-wing-${uid}`} x1="20" y1="26" x2="60" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="55%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={24} ry={4.5} />
      {/* Upper Wings */}
      <path d="M58 55C40 24 14 26 19 48C23 64 43 65 58 60Z" fill={`url(#cb-wing-${uid})`} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M62 55C80 24 106 26 101 48C97 64 77 65 62 60Z" fill={`url(#cb-wing-${uid})`} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Lower Wings */}
      <path d="M58 61C40 64 23 76 31 89C39 98 53 86 58 69Z" fill="#38BDF8" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M62 61C80 64 97 76 89 89C81 98 67 86 62 69Z" fill="#38BDF8" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Wing spots */}
      <circle cx="33" cy="43" r="5.5" fill="#FEF08A" stroke={INK} strokeWidth="1.5" />
      <circle cx="87" cy="43" r="5.5" fill="#FEF08A" stroke={INK} strokeWidth="1.5" />
      <circle cx="40" cy="79" r="4" fill="#FDE047" />
      <circle cx="80" cy="79" r="4" fill="#FDE047" />
      {/* Body & Antennae */}
      <path d="M57 38C50 26 44 24 41 26" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M63 38C70 26 76 24 79 26" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="60" rx="5.5" ry="20" fill="#1E293B" stroke={INK} strokeWidth="1.8" />
      <circle cx="60" cy="40" r="6" fill="#334155" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={60} cy={20} r={5} fill="#FACC15" />
    </g>
  ),

  clever_rabbit: (uid) => (
    <g>
      <defs>
        <radialGradient id={`cr-fur-${uid}`} cx="45%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* Tall Bunny Ears */}
      <ellipse cx="47" cy="30" rx="7.5" ry="18" transform="rotate(-10 47 30)" fill="#F8FAFC" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="47" cy="31" rx="3.8" ry="12" transform="rotate(-10 47 31)" fill="#FDA4AF" />
      <ellipse cx="71" cy="30" rx="7.5" ry="18" transform="rotate(10 71 30)" fill="#F8FAFC" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="71" cy="31" rx="3.8" ry="12" transform="rotate(10 71 31)" fill="#FDA4AF" />
      {/* Bunny Body & Fluffy Tail */}
      <circle cx="34" cy="84" r="7" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <ellipse cx="58" cy="78" rx="19" ry="17" fill={`url(#cr-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Bunny Head */}
      <ellipse cx="59" cy="54" rx="20" ry="16" fill={`url(#cr-fur-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="51" cy="51" r="2.9" fill={INK} />
      <circle cx="67" cy="51" r="2.9" fill={INK} />
      <circle cx="52" cy="50" r="1" fill="#FFFFFF" />
      <circle cx="68" cy="50" r="1" fill="#FFFFFF" />
      <ellipse cx="59" cy="56" rx="3" ry="2.2" fill="#FB7185" />
      <path d="M55 60C57 62 61 62 63 60" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Bright orange carrot */}
      <path d="M77 65L99 81L86 92Z" fill="#F97316" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M75 64C70 57 76 52 80 58C84 52 90 57 83 64Z" fill="#22C55E" stroke={INK} strokeWidth="1.7" />
    </g>
  ),

  tall_oak_tree: (uid) => (
    <g>
      <defs>
        <radialGradient id={`to-leaf-${uid}`} cx="42%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#15803D" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={32} ry={5.5} />
      {/* Sturdy Oak Trunk */}
      <path d="M50 62L47 98H73L70 62Z" fill="#92400E" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <ellipse cx="60" cy="80" rx="4.5" ry="6" fill="#451A03" />
      {/* Lush Tiered Canopy */}
      <circle cx="38" cy="54" r="19" fill="#16A34A" stroke={INK} strokeWidth="2.2" />
      <circle cx="82" cy="54" r="19" fill="#16A34A" stroke={INK} strokeWidth="2.2" />
      <circle cx="60" cy="40" r="24" fill={`url(#to-leaf-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="52" cy="56" r="18" fill="#22C55E" />
      <circle cx="70" cy="55" r="17" fill="#22C55E" />
      {/* Acorn + leaf details */}
      <ellipse cx="83" cy="94" rx="5" ry="6" fill="#B45309" stroke={INK} strokeWidth="1.7" />
      <path d="M77 90C77 86 89 86 89 90Z" fill="#78350F" stroke={INK} strokeWidth="1.6" />
      <Sparkle cx={26} cy={27} r={4.5} fill="#FACC15" />
    </g>
  ),

  blooming_flower: (uid) => (
    <g>
      <defs>
        <radialGradient id={`bf-center-${uid}`} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={22} ry={4.5} />
      {/* Stem & Leaves */}
      <path d="M60 56C58 72 62 84 60 99" stroke="#16A34A" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M58 81C44 80 39 70 46 65C52 67 57 74 58 81Z" fill="#22C55E" stroke={INK} strokeWidth="2" />
      <path d="M62 76C76 75 81 65 74 60C68 62 63 69 62 76Z" fill="#22C55E" stroke={INK} strokeWidth="2" />
      {/* Petals */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx={60 + Math.cos((deg * Math.PI) / 180) * 18}
          cy={42 + Math.sin((deg * Math.PI) / 180) * 18}
          rx="11"
          ry="11"
          fill="#FB7185"
          stroke={INK}
          strokeWidth="2"
        />
      ))}
      {/* Sunny Golden Center */}
      <circle cx="60" cy="42" r="12" fill={`url(#bf-center-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="56" cy="40" r="1.8" fill={INK} />
      <circle cx="64" cy="40" r="1.8" fill={INK} />
      <path d="M56.5 45C58.5 47 61.5 47 63.5 45" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <Sparkle cx={91} cy={27} r={5} fill="#FDE047" />
    </g>
  ),

  sunny_mountain: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sm-sky-${uid}`} x1="60" y1="16" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#sm-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Sun */}
      <circle cx="84" cy="34" r="10" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      {/* Twin Alpine Peaks */}
      <path d="M18 92L46 41L74 92Z" fill="#64748B" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M50 92L75 49L102 92Z" fill="#475569" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Snow Caps */}
      <path d="M36 59L46 41L56 59L50 56L46 61L42 56Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M67 63L75 49L84 63L79 60L75 64L71 60Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Pine trees & meadow */}
      <path d="M16 86H104V100H16Z" fill="#16A34A" stroke={INK} strokeWidth="2" />
      <path d="M32 88L38 71L44 88Z" fill="#14532D" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M84 88L90 73L96 88Z" fill="#14532D" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  ),

  sparkling_sea: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ss-sky-${uid}`} x1="60" y1="18" x2="60" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#ss-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Distant Sailboat */}
      <path d="M66 56L74 37L82 56Z" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M63 57H85L81 63H67Z" fill="#F97316" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Layered Turquoise & Cobalt Waves */}
      <path d="M16 68Q34 58 52 68T88 68T104 68V100H16Z" fill="#0EA5E9" stroke={INK} strokeWidth="2" />
      <path d="M16 80Q36 72 56 80T96 80T104 80V100H16Z" fill="#0284C7" stroke={INK} strokeWidth="1.8" />
      {/* White foam glint */}
      <path d="M28 74Q36 70 44 74M64 87Q74 83 84 87" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <Sparkle cx={36} cy={40} r={5.5} fill="#FDE047" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
