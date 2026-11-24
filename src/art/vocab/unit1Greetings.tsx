import { GroundShadow, HeartMotif, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT1_SCENES = {
  wave_hello: (uid) => (
    <g>
      <defs>
        <radialGradient id={`wh-bg-${uid}`} cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#FFF5C2" />
          <stop offset="60%" stopColor="#FDE29B" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F5B841" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`wh-hand-${uid}`} x1="34" y1="26" x2="82" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE6C7" />
          <stop offset="58%" stopColor="#F9C592" />
          <stop offset="100%" stopColor="#E69E67" />
        </linearGradient>
        <linearGradient id={`wh-sleeve-${uid}`} x1="42" y1="84" x2="72" y2="103" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A86D9" />
          <stop offset="100%" stopColor="#26509A" />
        </linearGradient>
      </defs>
      {/* Warm sunlit lantern halo + subtle botanical sprigs */}
      <circle cx="58" cy="58" r="44" fill={`url(#wh-bg-${uid})`} />
      <path d="M22 86C26 78 33 75 40 76C35 83 28 87 22 86Z" fill="#7FB069" stroke={INK} strokeWidth="1.2" opacity="0.72" />
      <path d="M98 84C93 77 86 75 80 77C85 83 92 86 98 84Z" fill="#7FB069" stroke={INK} strokeWidth="1.2" opacity="0.72" />
      <GroundShadow cx={60} cy={101} rx={24} ry={5} />
      {/* Warm storybook wave motion arcs */}
      <path d="M24 44C20 36 22 27 28 22" stroke="#D96B27" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 48C13 38 15 26 23 18" stroke="#E89A4B" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      <path d="M94 36C99 44 98 53 92 60" stroke="#D96B27" strokeWidth="3" strokeLinecap="round" />
      {/* Explorer coat sleeve + stitched parchment cuff + brass button */}
      <path d="M46 86L42 103H72L70 86Z" fill={`url(#wh-sleeve-${uid})`} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <rect x="44" y="81" width="28" height="8" rx="4" fill="#FFF9EB" stroke={INK} strokeWidth="1.9" />
      <circle cx="65" cy="95" r="2.5" fill="#F4C44E" stroke={INK} strokeWidth="1.1" />
      {/* Friendly waving hand with warm gouache shading */}
      <path
        d="M46 82C41 75 36 66 31 58C29 54 33 50 37 53L45 61L41 37C40 32 46 31 48 36L53 54L54 30C54 25 60 25 61 30L62 53L67 32C68 27 74 28 74 33L70 55L77 41C79 36 85 38 83 44L74 72C72 78 68 82 62 82Z"
        fill={`url(#wh-hand-${uid})`}
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Upper-left sunlit palm highlight + warm inner palm crease */}
      <path d="M46 66C51 62 59 62 64 67" stroke="#B85B2A" strokeWidth="1.9" strokeLinecap="round" opacity="0.52" />
      <ellipse cx="53" cy="60" rx="5.5" ry="3.2" fill="#FFF5E6" opacity="0.48" />
      <Sparkle cx={89} cy={26} r={6} fill="#F5C443" />
      <Sparkle cx={27} cy={67} r={4.5} fill="#5BB5E5" />
    </g>
  ),

  morning_sun: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ms-sky-${uid}`} x1="60" y1="16" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9EDAF5" />
          <stop offset="58%" stopColor="#FDECC8" />
          <stop offset="100%" stopColor="#FCD49B" />
        </linearGradient>
        <radialGradient id={`ms-sun-${uid}`} cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#FFF7C2" />
          <stop offset="55%" stopColor="#F8C64A" />
          <stop offset="100%" stopColor="#DE8B26" />
        </radialGradient>
      </defs>
      <rect x="16" y="18" width="88" height="80" rx="20" fill={`url(#ms-sky-${uid})`} stroke={INK} strokeWidth="1.9" />
      {/* Sun rays */}
      {[0, 30, 60, 90, 120, 150, 180].map((deg) => (
        <line
          key={deg}
          x1="60"
          y1="62"
          x2={60 + Math.cos(((deg - 180) * Math.PI) / 180) * 34}
          y2={62 + Math.sin(((deg - 180) * Math.PI) / 180) * 34}
          stroke="#E59B2C"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ))}
      {/* Smiling rising sun */}
      <circle cx="60" cy="62" r="22" fill={`url(#ms-sun-${uid})`} stroke={INK} strokeWidth="2.1" />
      <path d="M51 58C52.5 55.5 55 55.5 56.5 58" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M63.5 58C65 55.5 67.5 55.5 69 58" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
      <ellipse cx="48" cy="63" rx="3.2" ry="1.9" fill="#E87488" opacity="0.55" />
      <ellipse cx="72" cy="63" rx="3.2" ry="1.9" fill="#E87488" opacity="0.55" />
      <path d="M55 64C57.5 67.5 62.5 67.5 65 64" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
      {/* Layered gouache morning hills */}
      <path d="M16 80C32 68 50 70 65 82C77 72 91 71 104 79V98H16Z" fill="#5EA862" stroke={INK} strokeWidth="1.9" />
      <path d="M16 86C36 78 60 80 104 88V98H16Z" fill="#3D8247" />
      {/* Puffy sunlit cloud */}
      <path
        d="M25 40C25 36 29 33 33 34C35 30 41 30 43 34C46 34 49 36 49 40C49 43 46 45 43 45H30C27 45 25 43 25 40Z"
        fill="#FFFDF7"
        stroke={INK}
        strokeWidth="1.6"
      />
    </g>
  ),

  night_stars: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ns-sky-${uid}`} x1="20" y1="16" x2="96" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D1A47" />
          <stop offset="60%" stopColor="#352E7A" />
          <stop offset="100%" stopColor="#4C3E99" />
        </linearGradient>
        <linearGradient id={`ns-moon-${uid}`} x1="34" y1="28" x2="72" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7C2" />
          <stop offset="100%" stopColor="#E6A12E" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="84" rx="22" fill={`url(#ns-sky-${uid})`} stroke={INK} strokeWidth="2.1" />
      {/* Soft lunar halo */}
      <circle cx="54" cy="58" r="28" fill="#FEF08A" opacity="0.16" />
      {/* Crescent Moon */}
      <path
        d="M58 31C42 32 32 46 34 62C36 78 51 89 67 86C73 85 78 82 81 78C68 81 55 72 53 58C51 47 56 36 66 32C63 31 61 31 58 31Z"
        fill={`url(#ns-moon-${uid})`}
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Sleepy smile on moon */}
      <path d="M43 56C45 58 48 58 50 56" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M46 65C49 67 53 66 55 64" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      {/* Subtle constellation filigree + twinkling stars */}
      <path d="M66 49L79 40L86 61" stroke="#FEF08A" strokeWidth="0.9" strokeDasharray="2 2.5" opacity="0.5" fill="none" />
      <Sparkle cx={79} cy={40} r={7.5} fill="#FDE047" />
      <Sparkle cx={86} cy={61} r={5} fill="#F5C443" />
      <Sparkle cx={66} cy={49} r={4.5} fill="#FFF5C2" />
      <circle cx="29" cy="36" r="2" fill="#E0E7FF" />
      <circle cx="31" cy="86" r="1.8" fill="#FDE047" />
      <circle cx="88" cy="27" r="1.6" fill="#FFFDF7" />
    </g>
  ),

  see_you_soon: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sy-sky-${uid}`} x1="60" y1="16" x2="60" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="84" rx="22" fill={`url(#sy-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Horizon sun */}
      <circle cx="76" cy="54" r="13" fill="#FBBF24" stroke={INK} strokeWidth="1.8" />
      {/* Rolling ground */}
      <path d="M16 68C38 60 72 62 104 68V102H16Z" fill="#4ADE80" stroke={INK} strokeWidth="2" />
      {/* Winding road */}
      <path
        d="M52 102C49 88 68 82 66 72C65 67 60 65 56 64C64 64 73 66 75 72C79 84 62 91 74 102Z"
        fill="#FDE68A"
        stroke={INK}
        strokeWidth="1.8"
      />
      {/* Friendly wooden signpost */}
      <rect x="33" y="42" width="5" height="44" rx="2" fill="#92400E" stroke={INK} strokeWidth="1.8" />
      <path d="M24 44H53L59 50L53 56H24Z" fill="#F97316" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M32 50H48M44 47L48 50L44 53" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Cute waving little bird flying onward */}
      <path d="M72 34C76 29 82 29 85 34C88 29 94 29 97 34" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Sparkle cx={29} cy={30} r={4.5} fill="#FDE047" />
    </g>
  ),

  magic_please: (uid) => (
    <g>
      <defs>
        <linearGradient id={`mp-wand-${uid}`} x1="30" y1="88" x2="78" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={26} ry={5} />
      {/* Magic swirl trail */}
      <path
        d="M32 45C27 32 42 19 60 24C76 28 91 22 93 38C95 52 80 62 70 55"
        stroke="#FACC15"
        strokeWidth="3.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Wand shaft */}
      <path
        d="M27 89L71 45L77 51L33 95C30 97 25 92 27 89Z"
        fill={`url(#mp-wand-${uid})`}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M63 53L69 59" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
      {/* Big radiant magic star tip */}
      <path
        d="M78 24L83 35L95 36L86 44L89 56L78 49L67 56L70 44L61 36L73 35Z"
        fill="#FACC15"
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <circle cx="78" cy="41" r="4" fill="#FEF08A" />
      <Sparkle cx={37} cy={34} r={6} fill="#38BDF8" />
      <Sparkle cx={94} cy={62} r={5} fill="#FB7185" />
      <Sparkle cx={48} cy={52} r={4} fill="#FDE047" />
    </g>
  ),

  thank_you_gift: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ty-box-${uid}`} x1="30" y1="45" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={29} ry={6} />
      {/* Gift Box Base */}
      <rect x="28" y="48" width="64" height="47" rx="8" fill={`url(#ty-box-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Gold vertical ribbon */}
      <rect x="53" y="48" width="14" height="47" fill="#FBBF24" stroke={INK} strokeWidth="1.8" />
      {/* Tilted Lid */}
      <g transform="rotate(-7 60 44)">
        <rect x="24" y="38" width="72" height="14" rx="5" fill="#F43F5E" stroke={INK} strokeWidth="2.2" />
        <rect x="53" y="38" width="14" height="14" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
        {/* Big Satin Bow */}
        <path d="M58 38C45 25 35 33 44 40L58 38Z" fill="#FDE047" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M62 38C75 25 85 33 76 40L62 38Z" fill="#FDE047" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="60" cy="38" r="5" fill="#F59E0B" stroke={INK} strokeWidth="1.8" />
      </g>
      <HeartMotif cx={88} cy={28} scale={0.78} fill="#FB7185" />
      <Sparkle cx={27} cy={28} r={5.5} fill="#FACC15" />
      <Sparkle cx={96} cy={52} r={4.5} fill="#38BDF8" />
    </g>
  ),

  youre_welcome: (uid) => (
    <g>
      <defs>
        <radialGradient id={`yw-sun-${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={27} ry={5} />
      {/* Scalloped golden badge */}
      <circle cx="60" cy="58" r="34" fill="#FDE047" stroke={INK} strokeWidth="2.2" />
      <circle cx="60" cy="58" r="27" fill={`url(#yw-sun-${uid})`} stroke="#D97706" strokeWidth="1.6" />
      {/* Warm welcoming heart in center */}
      <HeartMotif cx={60} cy={58} scale={1.85} fill="#FB7185" />
      {/* Little welcoming sparkles around */}
      <Sparkle cx={26} cy={30} r={5.5} fill="#38BDF8" />
      <Sparkle cx={94} cy={32} r={5.5} fill="#4ADE80" />
      <Sparkle cx={92} cy={84} r={4.5} fill="#FACC15" />
      <Sparkle cx={26} cy={84} r={4.5} fill="#A78BFA" />
    </g>
  ),

  happy_smile: (uid) => (
    <g>
      <defs>
        <radialGradient id={`hs-face-${uid}`} cx="40%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="65%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={28} ry={5.5} />
      {/* Starburst rays behind */}
      <circle cx="60" cy="58" r="36" fill="#FEF9C3" />
      {/* Plush round smiley medallion */}
      <circle cx="60" cy="58" r="31" fill={`url(#hs-face-${uid})`} stroke={INK} strokeWidth="2.4" />
      {/* Specular shine */}
      <path d="M40 39C45 33 54 31 61 32" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" opacity="0.7" />
      {/* Happy crescent eyes */}
      <path d="M43 52C45 47 50 47 52 52" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M68 52C70 47 75 47 77 52" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Rosy cheeks */}
      <ellipse cx="40" cy="60" rx="5" ry="3.2" fill="#FB7185" opacity="0.55" />
      <ellipse cx="80" cy="60" rx="5" ry="3.2" fill="#FB7185" opacity="0.55" />
      {/* Big cheerful open smile */}
      <path
        d="M46 63C49 75 71 75 74 63Z"
        fill="#E11D48"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M52 70C56 67 64 67 68 70C64 73 56 73 52 70Z" fill="#FDA4AF" />
      <Sparkle cx={24} cy={30} r={5} fill="#38BDF8" />
      <Sparkle cx={94} cy={34} r={5.5} fill="#FB7185" />
    </g>
  ),

  name_tag: (uid) => (
    <g>
      <defs>
        <linearGradient id={`nt-top-${uid}`} x1="25" y1="34" x2="95" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Lanyard Ribbon */}
      <path d="M42 18L55 38M78 18L65 38" stroke="#F43F5E" strokeWidth="6" strokeLinecap="round" />
      <path d="M42 18L55 38M78 18L65 38" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Tag Card */}
      <rect x="22" y="36" width="76" height="54" rx="12" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
      <path d="M22 48C22 41.4 27.4 36 34 36H86C92.6 36 98 41.4 98 48V54H22Z" fill={`url(#nt-top-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Lanyard slot clip */}
      <rect x="52" y="31" width="16" height="9" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="1.8" />
      {/* Star badge & scribble name line */}
      <Sparkle cx={36} cy={70} r={7.5} fill="#FACC15" />
      <path d="M49 66H86" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M49 76C54 71 60 79 66 73C71 69 77 77 84 74" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),

  thumbs_yes: (uid) => (
    <g>
      <defs>
        <radialGradient id={`th-bg-${uid}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#16A34A" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={27} ry={5.5} />
      {/* Green Victory Medallion */}
      <circle cx="60" cy="58" r="35" fill={`url(#th-bg-${uid})`} stroke={INK} strokeWidth="2.4" />
      <circle cx="60" cy="58" r="29" fill="none" stroke="#BBF7D0" strokeWidth="2" strokeDasharray="6 4" />
      {/* Chunky Thumb Up */}
      <path
        d="M36 56H46V80H36C34 80 33 78 33 76V60C33 57 34 56 36 56Z"
        fill="#2563EB"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M46 56L54 37C56 32 62 33 62 39L60 51H75C79 51 81 55 79 59C81 61 81 65 78 67C80 69 79 73 76 74C77 77 75 80 71 80H46Z"
        fill="#FEF08A"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <Sparkle cx={86} cy={31} r={6} fill="#FDE047" />
      <Sparkle cx={27} cy={33} r={4.5} fill="#FFFFFF" />
    </g>
  ),

  gentle_no: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gn-palm-${uid}`} x1="40" y1="30" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={25} ry={5} />
      {/* Warm gentle peach halo (non-punitive) */}
      <circle cx="60" cy="57" r="34" fill="#FFEDD5" stroke="#FB923C" strokeWidth="2.4" />
      {/* Friendly upright pause palm */}
      <path
        d="M43 82V52C43 48 48 48 48 52V62H50V36C50 32 56 32 56 36V58H58V32C58 28 64 28 64 32V58H66V37C66 33 72 33 72 37V61H74V48C74 44 79 45 79 49V71C79 81 71 88 61 88C50 88 43 85 43 82Z"
        fill={`url(#gn-palm-${uid})`}
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Gentle shake arcs */}
      <path d="M23 48C20 55 20 63 23 70" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M97 48C100 55 100 63 97 70" stroke="#F97316" strokeWidth="2.6" strokeLinecap="round" />
      <Sparkle cx={88} cy={27} r={4.5} fill="#FDBA74" />
    </g>
  ),

  friendly_handshake: (uid) => (
    <g>
      <defs>
        <radialGradient id={`fh-glow-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#fh-glow-${uid})`} />
      <GroundShadow cx={60} cy={98} rx={32} ry={5} />
      {/* Left sleeve & arm */}
      <path d="M14 54L38 46L44 64L18 72Z" fill="#0EA5E9" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Right sleeve & arm */}
      <path d="M106 54L82 46L76 64L102 72Z" fill="#F97316" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Clasped hands */}
      <path
        d="M39 50C47 44 58 45 64 51L78 49C82 49 84 55 79 58L66 63L74 68C77 71 73 76 69 74L60 69L66 75C69 78 65 82 61 79L52 72C47 76 41 72 43 66L38 61Z"
        fill="#FDBA74"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Finger clasp seams */}
      <path d="M47 68L52 63M52 72L57 66" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <HeartMotif cx={60} cy={31} scale={0.95} fill="#FB7185" />
      <Sparkle cx={30} cy={33} r={5} fill="#FACC15" />
      <Sparkle cx={90} cy={33} r={5} fill="#FACC15" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
