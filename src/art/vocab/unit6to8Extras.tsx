import { GroundShadow, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT6_TO_8_SCENES = {
  acoustic_guitar: (uid) => (
    <g>
      <defs>
        <radialGradient id={`ag-body-${uid}`} cx="42%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="65%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      <g transform="rotate(-28 60 62)">
        {/* Neck & Headstock */}
        <rect x="55" y="14" width="10" height="44" rx="3" fill="#78350F" stroke={INK} strokeWidth="2.1" />
        <rect x="52" y="10" width="16" height="12" rx="3" fill="#451A03" stroke={INK} strokeWidth="2" />
        <circle cx="50" cy="14" r="2" fill="#FACC15" />
        <circle cx="70" cy="14" r="2" fill="#FACC15" />
        {/* Upper & Lower Figure-8 Guitar Body */}
        <ellipse cx="60" cy="64" rx="18" ry="15" fill={`url(#ag-body-${uid})`} stroke={INK} strokeWidth="2.3" />
        <ellipse cx="60" cy="83" rx="23" ry="18" fill={`url(#ag-body-${uid})`} stroke={INK} strokeWidth="2.3" />
        <ellipse cx="60" cy="72" rx="16" ry="14" fill={`url(#ag-body-${uid})`} />
        {/* Rosette Soundhole & Bridge */}
        <circle cx="60" cy="66" r="8.5" fill="#451A03" stroke="#FEF08A" strokeWidth="2.2" />
        <rect x="49" y="83" width="22" height="5.5" rx="2" fill="#451A03" stroke={INK} strokeWidth="1.6" />
        {/* Strings */}
        <line x1="57" y1="22" x2="57" y2="83" stroke="#FEF9C3" strokeWidth="1.2" opacity="0.85" />
        <line x1="60" y1="22" x2="60" y2="83" stroke="#FEF9C3" strokeWidth="1.2" opacity="0.85" />
        <line x1="63" y1="22" x2="63" y2="83" stroke="#FEF9C3" strokeWidth="1.2" opacity="0.85" />
      </g>
      {/* Floating musical note */}
      <path d="M88 38V22L99 19V34" stroke="#8B5CF6" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="85.5" cy="39" r="3.4" fill="#8B5CF6" stroke={INK} strokeWidth="1.3" />
      <circle cx="96.5" cy="35" r="3.4" fill="#8B5CF6" stroke={INK} strokeWidth="1.3" />
      <Sparkle cx={27} cy={34} r={5} fill="#FACC15" />
    </g>
  ),

  soccer_ball: (uid) => (
    <g>
      <defs>
        <radialGradient id={`scb-ball-${uid}`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="72%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={28} ry={5.5} />
      {/* Green grass tuft */}
      <path d="M26 98Q32 88 38 96Q44 87 50 97" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
      {/* Classic Soccer Ball Sphere */}
      <circle cx="60" cy="58" r="33" fill={`url(#scb-ball-${uid})`} stroke={INK} strokeWidth="2.5" />
      {/* Center Pentagon */}
      <polygon points="60,44 72,53 67,67 53,67 48,53" fill="#1E293B" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Outer Edge Pentagons & Seams */}
      <polygon points="60,25 69,31 65,37 55,37 51,31" fill="#1E293B" />
      <polygon points="31,46 37,43 41,53 35,61 28,57" fill="#1E293B" />
      <polygon points="89,46 92,57 85,61 79,53 83,43" fill="#1E293B" />
      <polygon points="39,81 47,77 52,85 45,90 36,86" fill="#1E293B" />
      <polygon points="81,81 84,86 75,90 68,85 73,77" fill="#1E293B" />
      <path d="M60 37V44M41 53L48 53M79 53L72 53M47 77L53 67M73 77L67 67" stroke={INK} strokeWidth="2" />
      {/* Gloss gleam */}
      <path d="M38 39C42 33 49 29 56 29" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <Sparkle cx={92} cy={27} r={5} fill="#FACC15" />
    </g>
  ),

  paint_palette: (uid) => (
    <g>
      <defs>
        <linearGradient id={`pp-wood-${uid}`} x1="22" y1="30" x2="96" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={34} ry={5.5} />
      {/* Artist's Wooden Palette */}
      <path
        d="M58 26C35 26 20 43 20 62C20 82 37 94 58 94C71 94 78 86 74 78C70 71 78 67 87 69C96 71 101 64 100 54C98 37 80 26 58 26Z"
        fill={`url(#pp-wood-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Thumb hole */}
      <circle cx="84" cy="56" r="6" fill="#FFF7ED" stroke={INK} strokeWidth="2" />
      {/* Vibrant Glossy Paint Blobs */}
      <circle cx="38" cy="48" r="7.5" fill="#F43F5E" stroke={INK} strokeWidth="1.8" />
      <circle cx="56" cy="38" r="7.5" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      <circle cx="77" cy="39" r="7" fill="#3B82F6" stroke={INK} strokeWidth="1.8" />
      <circle cx="34" cy="68" r="7.5" fill="#22C55E" stroke={INK} strokeWidth="1.8" />
      <circle cx="53" cy="80" r="7.5" fill="#8B5CF6" stroke={INK} strokeWidth="1.8" />
      {/* Paintbrush angled across */}
      <g transform="rotate(34 75 56)">
        <rect x="69" y="18" width="7" height="58" rx="3.5" fill="#78350F" stroke={INK} strokeWidth="1.9" />
        <rect x="69" y="14" width="7" height="10" rx="1.5" fill="#CBD5E1" stroke={INK} strokeWidth="1.7" />
        <path d="M68 14C68 5 73 1 76 6C78 10 77 14 76 14Z" fill="#0EA5E9" stroke={INK} strokeWidth="1.8" />
      </g>
      <Sparkle cx={26} cy={29} r={4.5} fill="#FACC15" />
    </g>
  ),

  storybook_open: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sbo-cover-${uid}`} x1="16" y1="36" x2="104" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={38} ry={5.5} />
      {/* Book Hardcover */}
      <rect x="16" y="42" width="88" height="52" rx="7" fill={`url(#sbo-cover-${uid})`} stroke={INK} strokeWidth="2.4" />
      {/* Left & Right Curved Storybook Pages */}
      <path d="M21 40C35 35 50 38 60 46V88C50 82 35 80 21 84Z" fill="#FFFBEB" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M99 40C85 35 70 38 60 46V88C70 82 85 80 99 84Z" fill="#FEF3C7" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Text Lines & Mini Picture on Left Page */}
      <rect x="28" y="49" width="23" height="15" rx="3" fill="#BAE6FD" stroke={INK} strokeWidth="1.5" />
      <path d="M28 71H51M28 77H46" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
      {/* Text Lines on Right Page */}
      <path d="M68 51H91M68 59H91M68 67H89M68 75H83" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
      {/* Red Ribbon Bookmark */}
      <path d="M60 46V97L65 92L70 97V45Z" fill="#F43F5E" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      {/* Magical Story Sparkles rising */}
      <Sparkle cx={44} cy={25} r={6} fill="#FACC15" />
      <Sparkle cx={63} cy={19} r={7} fill="#FDE047" />
      <Sparkle cx={80} cy={27} r={5} fill="#38BDF8" />
    </g>
  ),

  cozy_bed: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cb-blanket-${uid}`} x1="20" y1="54" x2="100" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={38} ry={5} />
      {/* Wooden Headboard & Footboard */}
      <rect x="18" y="34" width="11" height="60" rx="4" fill="#92400E" stroke={INK} strokeWidth="2.2" />
      <rect x="93" y="54" width="10" height="40" rx="4" fill="#92400E" stroke={INK} strokeWidth="2.2" />
      {/* Mattress */}
      <rect x="26" y="60" width="70" height="24" rx="5" fill="#F8FAFC" stroke={INK} strokeWidth="2.1" />
      {/* Plump Pillow */}
      <rect x="28" y="48" width="23" height="14" rx="6" fill="#67E8F9" stroke={INK} strokeWidth="2" />
      {/* Cozy Quilted Blanket */}
      <path d="M44 58H96V84C96 86 94 88 91 88H44C41 88 39 85 39 81V64C39 60 41 58 44 58Z" fill={`url(#cb-blanket-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="57" cy="70" r="3" fill="#FFE4E6" />
      <circle cx="75" cy="78" r="3" fill="#FFE4E6" />
      <circle cx="84" cy="67" r="3" fill="#FFE4E6" />
      {/* Bed Frame Base */}
      <rect x="24" y="81" width="74" height="9" rx="3" fill="#B45309" stroke={INK} strokeWidth="2.1" />
      {/* Sleepy Star */}
      <Sparkle cx={72} cy={31} r={6} fill="#FDE047" />
    </g>
  ),

  explorer_boots: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eb-leather-${uid}`} x1="25" y1="32" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={38} ry={5.5} />
      {/* Back Boot */}
      <g transform="translate(-8, -6)">
        <path d="M27 37H49V69L66 74C71 76 72 86 66 88H27Z" fill="#92400E" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <rect x="25" y="84" width="44" height="8" rx="3" fill="#334155" stroke={INK} strokeWidth="2" />
        <rect x="26" y="34" width="24" height="8" rx="3" fill="#16A34A" stroke={INK} strokeWidth="1.9" />
      </g>
      {/* Front Explorer Boot */}
      <g transform="translate(16, 6)">
        <path d="M32 37H54V69L73 74C79 76 80 86 73 88H32Z" fill={`url(#eb-leather-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
        <rect x="30" y="84" width="46" height="8" rx="3" fill="#1E293B" stroke={INK} strokeWidth="2" />
        <rect x="31" y="34" width="24" height="8" rx="3" fill="#22C55E" stroke={INK} strokeWidth="2" />
        {/* Criss-cross golden laces */}
        <path d="M47 47H54M47 55H54M47 63H54" stroke="#FEF08A" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <Sparkle cx={89} cy={31} r={5.5} fill="#FACC15" />
    </g>
  ),

  winter_coat: (uid) => (
    <g>
      <defs>
        <linearGradient id={`wct-body-${uid}`} x1="32" y1="30" x2="88" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={32} ry={5} />
      {/* Fluffy Hood */}
      <path d="M40 31C40 19 80 19 80 31L75 43H45Z" fill="#FEF3C7" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Puffy Sleeves */}
      <path d="M42 36L20 67L32 74L46 53Z" fill="#0EA5E9" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M78 36L100 67L88 74L74 53Z" fill="#0EA5E9" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Main Parka Body */}
      <path d="M39 36H81L85 92C85 95 81 96 60 96C39 96 35 95 35 92Z" fill={`url(#wct-body-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      {/* Quilted puff seams */}
      <path d="M38 55H82M37 73H83" stroke="#0369A1" strokeWidth="2" opacity="0.6" />
      {/* Center zipper & cozy toggle buttons */}
      <line x1="60" y1="38" x2="60" y2="95" stroke={INK} strokeWidth="2" />
      <rect x="53" y="45" width="14" height="4.5" rx="2" fill="#D97706" stroke={INK} strokeWidth="1.4" />
      <rect x="53" y="61" width="14" height="4.5" rx="2" fill="#D97706" stroke={INK} strokeWidth="1.4" />
      <rect x="53" y="77" width="14" height="4.5" rx="2" fill="#D97706" stroke={INK} strokeWidth="1.4" />
      <Sparkle cx={24} cy={30} r={5} fill="#FFFFFF" />
      <Sparkle cx={94} cy={34} r={5} fill="#BAE6FD" />
    </g>
  ),

  sunny_window: (uid) => (
    <g>
      <defs>
        <linearGradient id={`swn-sky-${uid}`} x1="60" y1="22" x2="60" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#FEF08A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Window Glass Sky */}
      <path d="M31 86V49C31 31 44 22 60 22C76 22 89 31 89 49V86Z" fill={`url(#swn-sky-${uid})`} stroke={INK} strokeWidth="2.4" />
      {/* Sun & rays */}
      <circle cx="71" cy="41" r="10" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      <path d="M35 76L63 49M44 82L70 55" stroke="#FEF9C3" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      {/* Window Panes Cross */}
      <line x1="60" y1="22" x2="60" y2="86" stroke="#92400E" strokeWidth="4.5" />
      <line x1="31" y1="56" x2="89" y2="56" stroke="#92400E" strokeWidth="4.5" />
      {/* Outer Frame & Sill */}
      <path d="M31 86V49C31 31 44 22 60 22C76 22 89 31 89 49V86" fill="none" stroke="#78350F" strokeWidth="5.5" />
      <rect x="23" y="85" width="74" height="9" rx="3.5" fill="#B45309" stroke={INK} strokeWidth="2.1" />
      {/* Potted Plant on Sill */}
      <rect x="70" y="75" width="12" height="10" rx="2" fill="#EA580C" stroke={INK} strokeWidth="1.7" />
      <circle cx="76" cy="70" r="6" fill="#22C55E" stroke={INK} strokeWidth="1.7" />
    </g>
  ),

  crescent_moon: (uid) => (
    <g>
      <defs>
        <radialGradient id={`cm-glow-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cm-moon-${uid}`} x1="32" y1="22" x2="84" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="56" r="42" fill={`url(#cm-glow-${uid})`} />
      {/* Golden Crescent Moon */}
      <path
        d="M67 22C45 23 30 40 32 61C34 83 52 96 74 92C82 90 88 86 92 81C74 86 57 74 55 56C53 41 61 28 75 23C72 22 70 22 67 22Z"
        fill={`url(#cm-moon-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Gentle Peaceful Smile */}
      <path d="M43 55C45 57.5 49 57.5 51 55" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="43" cy="61" rx="3" ry="1.8" fill="#FB7185" opacity="0.55" />
      <path d="M47 65C50 68 55 67 57 64" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Fluffy Starlight Cloud */}
      <path d="M54 88C54 81 60 77 67 78C70 72 80 72 83 78C89 78 93 82 93 88C93 92 89 96 84 96H62C57 96 54 92 54 88Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <Sparkle cx={83} cy={38} r={6.5} fill="#FDE047" />
      <Sparkle cx={68} cy={52} r={4.5} fill="#FFFFFF" />
    </g>
  ),

  ringed_planet: (uid) => (
    <g>
      <defs>
        <radialGradient id={`rp-sphere-${uid}`} cx="38%" cy="35%" r="68%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="55%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>
      {/* Back Ring Arc */}
      <ellipse cx="60" cy="58" rx="44" ry="13" transform="rotate(-22 60 58)" fill="none" stroke="#38BDF8" strokeWidth="7" opacity="0.85" />
      {/* Planet Sphere */}
      <circle cx="60" cy="58" r="26" fill={`url(#rp-sphere-${uid})`} stroke={INK} strokeWidth="2.4" />
      {/* Stripes across planet */}
      <path d="M36 52Q60 47 84 52M35 64Q60 69 85 64" fill="none" stroke="#FEF08A" strokeWidth="3.5" opacity="0.55" />
      {/* Front Overlapping Ring Arc */}
      <path
        d="M21 74C32 82 64 73 83 61C97 51 102 42 97 38"
        fill="none"
        stroke="#FACC15"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M21 74C32 82 64 73 83 61C97 51 102 42 97 38"
        fill="none"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Sparkle cx={27} cy={30} r={5.5} fill="#FDE047" />
      <Sparkle cx={91} cy={83} r={5} fill="#38BDF8" />
    </g>
  ),

  starlight_rocket: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sr-hull-${uid}`} x1="40" y1="22" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <g transform="rotate(24 60 60)">
        {/* Exhaust Flame */}
        <path d="M50 82L60 107L70 82Z" fill="#F97316" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M54 82L60 98L66 82Z" fill="#FEF08A" />
        {/* Side Fins */}
        <path d="M43 61L28 79L43 79Z" fill="#2563EB" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M77 61L92 79L77 79Z" fill="#2563EB" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        {/* Main Rocket Hull */}
        <path
          d="M60 15C74 28 79 51 77 82H43C41 51 46 28 60 15Z"
          fill={`url(#sr-hull-${uid})`}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Crimson Nose Cone */}
        <path d="M60 15C68 23 73 32 75 41H45C47 32 52 23 60 15Z" fill="#E11D48" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
        {/* Porthole Window */}
        <circle cx="60" cy="56" r="10" fill="#38BDF8" stroke="#F59E0B" strokeWidth="3.5" />
        <path d="M55 52L58 55" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <Sparkle cx={24} cy={36} r={5.5} fill="#FACC15" />
      <Sparkle cx={94} cy={78} r={5} fill="#38BDF8" />
    </g>
  ),

  rainbow_arc: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ra-sky-${uid}`} x1="60" y1="18" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#ra-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* 5-Band Vibrant Rainbow Arch */}
      <path d="M24 79A36 36 0 0 1 96 79" fill="none" stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" />
      <path d="M30 79A30 30 0 0 1 90 79" fill="none" stroke="#FB923C" strokeWidth="7" strokeLinecap="round" />
      <path d="M36 79A24 24 0 0 1 84 79" fill="none" stroke="#FACC15" strokeWidth="7" strokeLinecap="round" />
      <path d="M42 79A18 18 0 0 1 78 79" fill="none" stroke="#22C55E" strokeWidth="7" strokeLinecap="round" />
      <path d="M48 79A12 12 0 0 1 72 79" fill="none" stroke="#3B82F6" strokeWidth="7" strokeLinecap="round" />
      {/* Fluffy Clouds at Both Ends */}
      <path d="M18 82C18 76 23 72 28 73C30 68 38 68 40 73C45 73 48 77 48 82C48 86 44 89 39 89H25C21 89 18 86 18 82Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path d="M72 82C72 76 77 72 82 73C84 68 92 68 94 73C99 73 102 77 102 82C102 86 98 89 93 89H79C75 89 72 86 72 82Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <Sparkle cx={60} cy={27} r={5.5} fill="#FDE047" />
    </g>
  ),
} satisfies Partial<Record<string, SceneRenderer>>;
