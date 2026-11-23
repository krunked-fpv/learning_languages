import type { ReactNode } from 'react';
import type { AdultLanguageCode, IllustrationKey } from '../../types/contracts';
import { GroundShadow, INK, Sparkle, type SceneRenderer } from './shared';

const EBONICS_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  acoustic_guitar: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eb-bb-${uid}`} x1="20" y1="36" x2="100" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={36} ry={5.5} />
      {/* Carry handle */}
      <path
        d="M40 42V31C40 28 42.5 26 45.5 26H74.5C77.5 26 80 28 80 31V42"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M40 42V31C40 28 42.5 26 45.5 26H74.5C77.5 26 80 28 80 31V42"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Boombox body */}
      <rect x="20" y="42" width="80" height="50" rx="10" fill={`url(#eb-bb-${uid})`} stroke={INK} strokeWidth="2.4" />
      <rect x="26" y="47" width="68" height="8.5" rx="3" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      {/* Speaker cones */}
      <circle cx="37" cy="72" r="13.5" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.4" />
      <circle cx="37" cy="72" r="5.5" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
      <circle cx="83" cy="72" r="13.5" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.4" />
      <circle cx="83" cy="72" r="5.5" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
      {/* Cassette deck */}
      <rect x="52" y="62" width="16" height="20" rx="3" fill="#7C3AED" stroke="#FEF08A" strokeWidth="1.6" />
      <circle cx="60" cy="72" r="3.2" fill="#FEF08A" />
      {/* Musical notes */}
      <path d="M88 29V16L99 13V26" stroke="#7C3AED" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="85.5" cy="30" r="3.4" fill="#7C3AED" stroke={INK} strokeWidth="1.3" />
      <circle cx="96.5" cy="27" r="3.4" fill="#7C3AED" stroke={INK} strokeWidth="1.3" />
      <Sparkle cx={24} cy={28} r={5} fill="#FACC15" />
    </g>
  ),

  party_confetti: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eb-gr-${uid}`} x1="30" y1="52" x2="90" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      {/* String lights arc */}
      <path d="M16 24Q60 38 104 24" fill="none" stroke={INK} strokeWidth="2" />
      {[28, 49, 71, 92].map((bx, i) => (
        <circle
          key={bx}
          cx={bx}
          cy={i === 1 || i === 2 ? 31 : 28}
          r="4.2"
          fill={i % 2 === 0 ? '#FACC15' : '#A78BFA'}
          stroke={INK}
          strokeWidth="1.4"
        />
      ))}
      {/* Smoke wisps */}
      <path d="M46 46C42 40 49 35 45 29" stroke="#C4B5FD" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M62 44C58 38 65 33 61 27" stroke="#FDE047" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M76 46C72 40 79 35 75 29" stroke="#C4B5FD" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* Cookout grill legs & drum */}
      <line x1="38" y1="78" x2="33" y2="98" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="82" y1="78" x2="87" y2="98" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <rect x="28" y="54" width="64" height="27" rx="11" fill={`url(#eb-gr-${uid})`} stroke={INK} strokeWidth="2.4" />
      <line x1="30" y1="58" x2="90" y2="58" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" />
      {/* Sizzling skewers */}
      <circle cx="46" cy="54" r="5" fill="#F97316" stroke={INK} strokeWidth="1.6" />
      <circle cx="60" cy="53" r="5.5" fill="#EF4444" stroke={INK} strokeWidth="1.6" />
      <circle cx="74" cy="54" r="5" fill="#F59E0B" stroke={INK} strokeWidth="1.6" />
      <Sparkle cx={94} cy={46} r={5} fill="#FACC15" />
    </g>
  ),

  cozy_home: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eb-br-${uid}`} x1="24" y1="22" x2="96" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={38} ry={5} />
      {/* Brownstone facade */}
      <rect x="24" y="24" width="72" height="72" rx="5" fill={`url(#eb-br-${uid})`} stroke={INK} strokeWidth="2.3" />
      <rect x="20" y="19" width="80" height="9" rx="3" fill="#78350F" stroke={INK} strokeWidth="2.1" />
      {/* Glowing twilight windows */}
      <rect x="33" y="36" width="16" height="20" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
      <rect x="71" y="36" width="16" height="20" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
      {/* Stoop steps & arched door */}
      <path d="M51 74V52C51 45 69 45 69 52V74Z" fill="#4C1D95" stroke={INK} strokeWidth="2" />
      <rect x="42" y="74" width="36" height="8" rx="2" fill="#CBD5E1" stroke={INK} strokeWidth="1.8" />
      <rect x="38" y="82" width="44" height="8" rx="2" fill="#94A3B8" stroke={INK} strokeWidth="1.8" />
      <rect x="34" y="90" width="52" height="8" rx="2" fill="#64748B" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={94} cy={28} r={4.8} fill="#FACC15" />
    </g>
  ),

  city_park: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Twilight block court sky */}
      <rect x="16" y="18" width="88" height="80" rx="20" fill="#4C1D95" stroke={INK} strokeWidth="2.2" />
      <path d="M16 74H104V98H16Z" fill="#334155" stroke={INK} strokeWidth="2" />
      {/* Hoop post & backboard */}
      <line x1="78" y1="36" x2="78" y2="84" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
      <rect x="54" y="30" width="28" height="20" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <rect x="62" y="36" width="12" height="9" fill="none" stroke="#EA580C" strokeWidth="1.8" />
      <path d="M58 47H72" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 48L62 58H68L70 48" fill="none" stroke="#F8FAFC" strokeWidth="1.8" />
      {/* Basketball */}
      <circle cx="38" cy="70" r="11" fill="#EA580C" stroke={INK} strokeWidth="2" />
      <path d="M27 70H49M38 59V81" stroke={INK} strokeWidth="1.4" />
      <Sparkle cx={32} cy={32} r={5} fill="#FDE047" />
    </g>
  ),

  water_carafe: (uid) => (
    <g>
      <defs>
        <linearGradient id={`eb-lem-${uid}`} x1="36" y1="42" x2="80" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Pitcher */}
      <path d="M72 44C86 44 86 72 72 72" fill="none" stroke="#BAE6FD" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M72 44C86 44 86 72 72 72" fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M36 30H72L68 86C68 91 62 94 54 94C46 94 40 91 40 86Z"
        fill="#E0F2FE"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M40 50H68L66 85C66 89 61 91 54 91C47 91 42 89 42 85Z" fill={`url(#eb-lem-${uid})`} />
      <circle cx="53" cy="66" r="7" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />
      {/* Red party cup beside pitcher */}
      <path d="M72 64H96L92 94H76Z" fill="#EF4444" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="84" cy="64" rx="12" ry="3" fill="#FFFFFF" stroke={INK} strokeWidth="1.6" />
      <Sparkle cx={27} cy={34} r={4.5} fill="#FACC15" />
    </g>
  ),

  hot_chocolate: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={24} ry={5} />
      {/* Striped straw */}
      <path d="M68 42L79 18" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
      <path d="M68 42L79 18" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      {/* Mason jar sweet iced tea */}
      <rect x="38" y="38" width="44" height="54" rx="10" fill="#D97706" stroke={INK} strokeWidth="2.3" />
      <rect x="42" y="30" width="36" height="9" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <rect x="44" y="48" width="12" height="12" rx="3" transform="rotate(-10 50 54)" fill="#FEF3C7" opacity="0.72" />
      <rect x="60" y="54" width="12" height="12" rx="3" transform="rotate(12 66 60)" fill="#FEF3C7" opacity="0.72" />
      <circle cx="48" cy="40" r="6.5" fill="#FB923C" stroke={INK} strokeWidth="1.6" />
      <path d="M58 32C64 23 73 24 72 32C67 35 61 35 58 32Z" fill="#22C55E" stroke={INK} strokeWidth="1.5" />
    </g>
  ),

  warm_bread: () => (
    <g>
      <GroundShadow cx={60} cy={98} rx={36} ry={5.5} />
      {/* Cast-iron skillet */}
      <path d="M84 64H106" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <circle cx="56" cy="64" r="32" fill="#1E293B" stroke={INK} strokeWidth="2.4" />
      {/* Golden cornbread */}
      <circle cx="56" cy="64" r="25" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
      <path d="M35 64H77M56 43V85M41 49L71 79M71 49L41 79" stroke="#D97706" strokeWidth="1.6" opacity="0.7" />
      {/* Honey butter pat */}
      <rect x="49" y="57" width="14" height="14" rx="3" transform="rotate(14 56 64)" fill="#FEF08A" stroke={INK} strokeWidth="1.6" />
      <Sparkle cx={26} cy={28} r={5} fill="#FACC15" />
    </g>
  ),

  explorer_boots: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* High-top sneaker */}
      <path
        d="M24 84V40C24 35 28 32 34 32H48L54 56L84 64C92 66 96 72 96 80V84Z"
        fill="#7C3AED"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <rect x="22" y="81" width="76" height="10" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
      <path d="M74 63C85 65 94 71 95 81H72Z" fill="#F8FAFC" stroke={INK} strokeWidth="1.8" />
      <path d="M42 46H52M44 54H54M46 62H56" stroke="#FACC15" strokeWidth="2.8" strokeLinecap="round" />
      <Sparkle cx={84} cy={36} r={5.5} fill="#FACC15" />
    </g>
  ),

  friendly_handshake: () => (
    <g>
      <GroundShadow cx={60} cy={97} rx={32} ry={5} />
      {/* Left & Right fists bumping */}
      <rect x="18" y="48" width="38" height="28" rx="11" fill="#92400E" stroke={INK} strokeWidth="2.3" />
      <rect x="64" y="48" width="38" height="28" rx="11" fill="#FDBA74" stroke={INK} strokeWidth="2.3" />
      <path d="M51 54H55M51 62H55M51 70H55M65 54H69M65 62H69M65 70H69" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* Impact starburst */}
      <Sparkle cx={60} cy={30} r={7.5} fill="#FACC15" />
      <Sparkle cx={60} cy={88} r={6} fill="#A78BFA" />
    </g>
  ),

  starlight_trophy: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Chrome mic & gold crown trophy */}
      <rect x="44" y="88" width="32" height="10" rx="4" fill="#7C3AED" stroke={INK} strokeWidth="2.2" />
      <rect x="56" y="60" width="8" height="29" fill="#334155" stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="46" r="16" fill="#FACC15" stroke={INK} strokeWidth="2.3" />
      <path d="M46 46H74M49 38H71M49 54H71" stroke="#92400E" strokeWidth="1.6" />
      <path d="M46 29L51 17L60 24L69 17L74 29Z" fill="#FDE047" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Sparkle cx={26} cy={40} r={5} fill="#FACC15" />
      <Sparkle cx={94} cy={40} r={5} fill="#A78BFA" />
    </g>
  ),

  wave_hello: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={28} ry={5} />
      {/* Twilight purple cuff & peace-sign hand */}
      <path d="M45 84L42 100H74L71 84Z" fill="#7C3AED" stroke={INK} strokeWidth="2.2" />
      <path
        d="M44 82C38 74 37 61 44 54L41 29C40 23 47 22 49 28L55 50L63 26C65 20 72 22 70 29L64 52C73 53 78 60 76 69C75 77 69 83 61 83Z"
        fill="#FDBA74"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <Sparkle cx={86} cy={34} r={6} fill="#FACC15" />
      <Sparkle cx={28} cy={44} r={4.8} fill="#A78BFA" />
    </g>
  ),

  golden_ticket: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Vinyl disc peeking out of gold VIP sleeve */}
      <circle cx="72" cy="56" r="28" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.2" />
      <circle cx="72" cy="56" r="19" stroke="#475569" strokeWidth="1.4" />
      <circle cx="72" cy="56" r="9" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      <circle cx="72" cy="56" r="2.6" fill="#0F172A" />
      <rect x="20" y="30" width="52" height="58" rx="6" fill="#7C3AED" stroke={INK} strokeWidth="2.3" />
      <Sparkle cx={46} cy={59} r={10} fill="#FDE047" />
    </g>
  ),
};

const SUBURBAN_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  party_confetti: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      {/* Backyard festive bunting */}
      <path d="M14 22Q60 36 106 22" fill="none" stroke={INK} strokeWidth="1.8" />
      <polygon points="28,25 40,25 34,37" fill="#0284C7" stroke={INK} strokeWidth="1.3" />
      <polygon points="54,28 66,28 60,40" fill="#FB923C" stroke={INK} strokeWidth="1.3" />
      <polygon points="80,25 92,25 86,37" fill="#22C55E" stroke={INK} strokeWidth="1.3" />
      {/* Kettle grill smoke */}
      <path d="M68 42C63 35 72 30 67 23" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Kettle grill */}
      <line x1="46" y1="74" x2="39" y2="98" stroke="#64748B" strokeWidth="3.2" strokeLinecap="round" />
      <line x1="74" y1="74" x2="81" y2="98" stroke="#64748B" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="38" cy="97" r="4.5" fill="#1E293B" />
      <path d="M34 58H86C86 73 74 81 60 81C46 81 34 73 34 58Z" fill="#EA580C" stroke={INK} strokeWidth="2.3" />
      <path d="M33 56C33 41 45 34 60 34C75 34 87 41 87 56Z" fill="#F97316" stroke={INK} strokeWidth="2.3" />
      <rect x="53" y="28" width="14" height="6" rx="2.5" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={24} cy={46} r={4.8} fill="#FACC15" />
    </g>
  ),

  city_park: () => (
    <g>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#BAE6FD" stroke={INK} strokeWidth="2.2" />
      {/* Striped front lawn */}
      <path d="M16 66H104V100H16Z" fill="#22C55E" stroke={INK} strokeWidth="2" />
      <polygon points="28,66 44,66 36,100 20,100" fill="#16A34A" />
      <polygon points="60,66 76,66 68,100 52,100" fill="#16A34A" />
      {/* White picket fence */}
      <rect x="16" y="54" width="88" height="5" fill="#FFFFFF" stroke={INK} strokeWidth="1.4" />
      {[24, 40, 56, 72, 88].map((x) => (
        <path
          key={x}
          d={`M${x} 68V45L${x + 4.5} 39L${x + 9} 45V68Z`}
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="1.6"
        />
      ))}
      {/* Mailbox with red flag */}
      <rect x="76" y="62" width="6" height="28" fill="#78350F" stroke={INK} strokeWidth="1.5" />
      <rect x="66" y="48" width="24" height="15" rx="7" fill="#0284C7" stroke={INK} strokeWidth="1.8" />
      <path d="M84 52V40H91" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),

  cozy_home: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Backyard pergola & string lights */}
      <rect x="26" y="34" width="8" height="62" fill="#92400E" stroke={INK} strokeWidth="2" />
      <rect x="86" y="34" width="8" height="62" fill="#92400E" stroke={INK} strokeWidth="2" />
      <rect x="18" y="28" width="84" height="10" rx="3" fill="#B45309" stroke={INK} strokeWidth="2.1" />
      <path d="M32 39Q60 52 88 39" fill="none" stroke={INK} strokeWidth="1.8" />
      {[42, 60, 78].map((x) => (
        <circle key={x} cx={x} cy={45} r="4" fill="#FDE047" stroke={INK} strokeWidth="1.3" />
      ))}
      {/* Adirondack patio chair */}
      <path d="M40 58L47 82H73L80 58" fill="#0284C7" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="38" y="76" width="44" height="9" rx="3" fill="#38BDF8" stroke={INK} strokeWidth="1.8" />
      <line x1="44" y1="85" x2="42" y2="96" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      <line x1="76" y1="85" x2="78" y2="96" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),

  water_carafe: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Cold-brew iced coffee cup */}
      <path d="M28 42H58L54 94H32Z" fill="#78350F" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M30 48H56L54 64C46 61 38 66 31 61Z" fill="#FEF3C7" />
      <path d="M26 42C26 34 60 34 60 42Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <line x1="43" y1="34" x2="49" y2="18" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      {/* Sparkling seltzer can */}
      <rect x="66" y="48" width="28" height="46" rx="6" fill="#0EA5E9" stroke={INK} strokeWidth="2.2" />
      <rect x="66" y="61" width="28" height="16" fill="#FFFFFF" stroke={INK} strokeWidth="1.5" />
      <circle cx="80" cy="69" r="5" fill="#FB923C" />
      <Sparkle cx={94} cy={36} r={4.5} fill="#38BDF8" />
    </g>
  ),

  hot_chocolate: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={24} ry={5} />
      {/* Insulated mega-tumbler with handle & straw */}
      <line x1="60" y1="30" x2="66" y2="15" stroke="#EA580C" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M77 45C91 45 91 74 76 74" fill="none" stroke="#0284C7" strokeWidth="6" strokeLinecap="round" />
      <path d="M77 45C91 45 91 74 76 74" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M38 36H80L74 70H44Z" fill="#38BDF8" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M44 70H74L71 94H47Z" fill="#0284C7" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="36" y="29" width="46" height="8" rx="3.5" fill="#F8FAFC" stroke={INK} strokeWidth="2" />
      <Sparkle cx={27} cy={40} r={4.5} fill="#FB923C" />
    </g>
  ),

  explorer_boots: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Crew sock cuff */}
      <rect x="28" y="28" width="24" height="22" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path d="M29 36H51M29 42H51" stroke="#0284C7" strokeWidth="2.5" />
      {/* Classic crisp white dad sneaker */}
      <path
        d="M24 82V50H48L58 62L86 67C94 69 97 75 96 82Z"
        fill="#F8FAFC"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <rect x="22" y="80" width="76" height="10" rx="4" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <path d="M24 84C42 82 54 88 70 84" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 58L58 56M52 64L62 62" stroke="#0284C7" strokeWidth="2.6" strokeLinecap="round" />
      <Sparkle cx={84} cy={38} r={5} fill="#22C55E" />
    </g>
  ),

  friendly_handshake: () => (
    <g>
      <GroundShadow cx={60} cy={98} rx={32} ry={5} />
      {/* Enthusiastic thumbs-up */}
      <rect x="26" y="54" width="16" height="34" rx="4" fill="#0284C7" stroke={INK} strokeWidth="2.2" />
      <path
        d="M42 56H54L56 32C56 26 64 26 65 32L66 50H84C90 50 92 56 89 61C92 65 90 71 86 74C88 79 84 85 78 85H42Z"
        fill="#FED7AA"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <Sparkle cx={82} cy={32} r={6} fill="#FACC15" />
      <Sparkle cx={24} cy={36} r={5} fill="#FB923C" />
    </g>
  ),

  starlight_trophy: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Gold Grill-Master Spatula Trophy */}
      <rect x="42" y="88" width="36" height="10" rx="4" fill="#0284C7" stroke={INK} strokeWidth="2.2" />
      <rect x="56" y="58" width="8" height="30" fill="#78350F" stroke={INK} strokeWidth="2" />
      <rect x="40" y="22" width="40" height="36" rx="6" fill="#FACC15" stroke={INK} strokeWidth="2.3" />
      <line x1="50" y1="30" x2="50" y2="50" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="30" x2="60" y2="50" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      <line x1="70" y1="30" x2="70" y2="50" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      <Sparkle cx={25} cy={34} r={5} fill="#FB923C" />
      <Sparkle cx={95} cy={34} r={5} fill="#38BDF8" />
    </g>
  ),

  wave_hello: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={34} ry={5} />
      {/* White picket fence foreground + friendly waving hand */}
      <path
        d="M46 72C40 62 35 50 41 44L47 52L46 30C46 25 52 25 54 30L56 49L61 28C62 23 68 24 68 29L66 50L74 37C77 33 82 36 80 42L72 68Z"
        fill="#FED7AA"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <rect x="20" y="72" width="80" height="22" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      {[28, 46, 64, 82].map((x) => (
        <path
          key={x}
          d={`M${x} 94V68L${x + 5} 61L${x + 10} 68V94Z`}
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="1.8"
        />
      ))}
      <Sparkle cx={90} cy={28} r={5.5} fill="#FB923C" />
    </g>
  ),

  golden_ticket: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Warehouse club gold card + receipt */}
      <rect x="26" y="24" width="42" height="66" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path d="M34 36H58M34 45H54M34 54H58M34 63H50" stroke="#94A3B8" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="44" y="48" width="54" height="36" rx="7" fill="#0284C7" stroke={INK} strokeWidth="2.2" />
      <rect x="52" y="56" width="16" height="10" rx="2" fill="#FACC15" stroke={INK} strokeWidth="1.4" />
      <Sparkle cx={86} cy={40} r={5} fill="#FB923C" />
    </g>
  ),
};

const CORP_TRADES_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  friendly_handshake: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Corporate navy suit cuff fist-bumping amber-gloved drywall hand */}
      <rect x="16" y="54" width="14" height="22" rx="3" fill="#0F766E" stroke={INK} strokeWidth="2" />
      <rect x="28" y="50" width="26" height="28" rx="10" fill="#FDBA74" stroke={INK} strokeWidth="2.2" />
      <rect x="90" y="54" width="14" height="22" rx="3" fill="#1E293B" stroke={INK} strokeWidth="2" />
      <rect x="66" y="50" width="26" height="28" rx="10" fill="#F59E0B" stroke={INK} strokeWidth="2.2" />
      <path d="M51 56H55M51 64H55M51 72H55M65 56H69M65 64H69M65 72H69" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <Sparkle cx={60} cy={30} r={7.5} fill="#FACC15" />
      <Sparkle cx={60} cy={89} r={5.5} fill="#5EEAD4" />
    </g>
  ),

  hot_chocolate: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ct-can-${uid}`} x1="66" y1="42" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Iced Corporate Matcha/Oat Latte */}
      <line x1="42" y1="36" x2="48" y2="18" stroke="#0F766E" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 44H58L53 94H31Z" fill="#FEF3C7" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M27 52H57L55 68C48 64 38 70 29 66Z" fill="#B45309" opacity="0.7" />
      <path d="M24 44C24 35 60 35 60 44Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      {/* High-Vis Jobsite Energy Can */}
      <rect x="66" y="42" width="28" height="52" rx="6" fill={`url(#ct-can-${uid})`} stroke={INK} strokeWidth="2.2" />
      <path d="M78 52L72 67H79L75 82L88 64H80Z" fill="#84CC16" stroke="#FEF08A" strokeWidth="1" strokeLinejoin="round" />
      <Sparkle cx={24} cy={28} r={4.5} fill="#5EEAD4" />
    </g>
  ),

  cozy_home: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Left: Synergy Cubicle Monitor */}
      <rect x="18" y="34" width="38" height="30" rx="4" fill="#0F766E" stroke={INK} strokeWidth="2.1" />
      <rect x="23" y="39" width="28" height="20" rx="2" fill="#ECFEFF" />
      <path d="M26 54L34 47L41 50L48 42" stroke="#0284C7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="33" y="64" width="8" height="10" fill="#64748B" stroke={INK} strokeWidth="1.6" />
      <rect x="16" y="74" width="44" height="20" rx="3" fill="#E2E8F0" stroke={INK} strokeWidth="2" />
      {/* Right: Drywall Stud Frame & Caution Sawhorse */}
      <rect x="64" y="26" width="38" height="68" rx="3" fill="#FEF3C7" stroke={INK} strokeWidth="2.1" />
      <line x1="76" y1="26" x2="76" y2="94" stroke="#D97706" strokeWidth="5" />
      <line x1="90" y1="26" x2="90" y2="94" stroke="#D97706" strokeWidth="5" />
      <rect x="62" y="24" width="42" height="8" rx="2" fill="#B45309" stroke={INK} strokeWidth="1.8" />
      <rect x="62" y="88" width="42" height="8" rx="2" fill="#B45309" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={58} cy={22} r={4.5} fill="#FACC15" />
    </g>
  ),

  architect_blueprint: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Split Jobsite Blueprint & Spreadsheet */}
      <rect x="18" y="26" width="84" height="64" rx="8" fill="#1E3A8A" stroke={INK} strokeWidth="2.3" />
      <path d="M60 26V90" stroke="#FFFFFF" strokeWidth="2.4" />
      {/* Left: Spreadsheet grid & KPI bar */}
      <path d="M24 44H54M24 58H54M24 72H54M36 34V82" stroke="#5EEAD4" strokeWidth="1.4" opacity="0.55" />
      <rect x="26" y="62" width="6" height="16" fill="#34D399" />
      <rect x="39" y="50" width="6" height="28" fill="#38BDF8" />
      {/* Right: Framing plan + Yellow Hard Hat */}
      <rect x="67" y="42" width="28" height="36" fill="none" stroke="#93C5FD" strokeWidth="1.8" strokeDasharray="3 3" />
      <path d="M67 64L81 42L95 64" fill="none" stroke="#FACC15" strokeWidth="2.2" />
      <path d="M67 80C67 72 73 68 81 68C89 68 95 72 95 80Z" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      <rect x="64" y="79" width="34" height="5" rx="2.5" fill="#EAB308" stroke={INK} strokeWidth="1.6" />
    </g>
  ),

  explorer_boots: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Corporate Dress Shoe (Left) */}
      <path d="M18 82V58H34L42 68L54 71C57 72 58 77 56 82Z" fill="#0F172A" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <rect x="18" y="81" width="38" height="6" rx="2" fill="#78350F" stroke={INK} strokeWidth="1.8" />
      {/* Steel-Toe Work Boot (Right) */}
      <path d="M62 82V42H80L84 62L98 67C102 69 103 75 102 82Z" fill="#D97706" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="61" y="80" width="42" height="9" rx="3" fill="#1E293B" stroke={INK} strokeWidth="2" />
      <path d="M74 52H81M75 58H82" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" />
      <Sparkle cx={60} cy={30} r={5} fill="#FACC15" />
    </g>
  ),

  party_confetti: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* "Mandatory Fun" Pizza Box + Toolbox */}
      <rect x="20" y="54" width="80" height="36" rx="6" fill="#F8FAFC" stroke={INK} strokeWidth="2.2" />
      <rect x="20" y="42" width="80" height="16" rx="4" fill="#E2E8F0" stroke={INK} strokeWidth="2.2" />
      {/* Single Pizza Slice inside */}
      <polygon points="44,58 76,58 60,84" fill="#FACC15" stroke="#B45309" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M43 58H77" stroke="#D97706" strokeWidth="5" strokeLinecap="round" />
      <circle cx="57" cy="67" r="3" fill="#DC2626" />
      <circle cx="64" cy="72" r="2.8" fill="#DC2626" />
      {/* Caution Sparkles */}
      <Sparkle cx={26} cy={28} r={5} fill="#0F766E" />
      <Sparkle cx={94} cy={28} r={5} fill="#F59E0B" />
    </g>
  ),

  calendar_milestone: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* 4:45 PM Friday Sync Calendar + Hard Hat */}
      <rect x="22" y="30" width="76" height="64" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth="2.3" />
      <path d="M22 40C22 34 26 30 32 30H88C94 30 98 34 98 40V48H22Z" fill="#0F766E" stroke={INK} strokeWidth="2.2" />
      <circle cx="40" cy="30" r="4.5" fill="#F8FAFC" stroke={INK} strokeWidth="1.8" />
      <circle cx="80" cy="30" r="4.5" fill="#F8FAFC" stroke={INK} strokeWidth="1.8" />
      {/* Clock Face showing 4:45 */}
      <circle cx="60" cy="70" r="18" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.2" />
      <path d="M60 70L60 58M60 70L48 70" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="60" cy="70" r="2.6" fill={INK} />
      <Sparkle cx={94} cy={24} r={5} fill="#FACC15" />
    </g>
  ),

  starlight_trophy: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={28} ry={5} />
      {/* Golden Wrench & Synergy Gear Trophy */}
      <rect x="40" y="88" width="40" height="10" rx="4" fill="#0F766E" stroke={INK} strokeWidth="2.2" />
      <rect x="55" y="58" width="10" height="30" fill="#E2E8F0" stroke={INK} strokeWidth="2" />
      <path d="M44 36C44 24 76 24 76 36C76 47 68 55 60 58C52 55 44 47 44 36Z" fill="#FACC15" stroke={INK} strokeWidth="2.3" />
      <circle cx="60" cy="38" r="7" fill="#0F766E" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={26} cy={36} r={5} fill="#5EEAD4" />
      <Sparkle cx={94} cy={36} r={5} fill="#F59E0B" />
    </g>
  ),
};

const MIDWEST_NORTHEAST_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  warm_bread: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Left: Midwest Bubbly Casserole Dish */}
      <rect x="16" y="54" width="48" height="32" rx="7" fill="#FB7185" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="40" cy="54" rx="22" ry="7" fill="#FDE047" stroke="#D97706" strokeWidth="1.8" />
      <circle cx="30" cy="53" r="3" fill="#F59E0B" />
      <circle cx="40" cy="52" r="3.2" fill="#F59E0B" />
      <circle cx="50" cy="53" r="3" fill="#F59E0B" />
      <path d="M32 39C29 33 35 28 32 22M46 39C43 33 49 28 46 22" stroke="#93C5FD" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* Right: NYC Everything Bagel */}
      <circle cx="82" cy="64" r="22" fill="#D97706" stroke={INK} strokeWidth="2.3" />
      <circle cx="82" cy="64" r="7.5" fill="#EFF6FF" stroke={INK} strokeWidth="2" />
      {[
        [72, 52],
        [92, 54],
        [70, 74],
        [92, 74],
        [82, 47],
      ].map(([sx, sy], i) => (
        <circle key={i} cx={sx} cy={sy} r="1.8" fill="#FEF3C7" />
      ))}
    </g>
  ),

  hot_chocolate: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Classic NYC Blue & Gold Bodega Coffee Cup */}
      <path d="M36 40H84L77 92H43Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="39" y="54" width="42" height="24" fill="#1D4ED8" stroke={INK} strokeWidth="1.5" />
      <line x1="38" y1="51" x2="82" y2="51" stroke="#FACC15" strokeWidth="3" />
      <line x1="41" y1="81" x2="79" y2="81" stroke="#FACC15" strokeWidth="3" />
      <rect x="32" y="31" width="56" height="10" rx="4" fill="#F8FAFC" stroke={INK} strokeWidth="2" />
      <path d="M52 25C49 18 55 14 52 8M68 25C65 18 71 14 68 8" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Sparkle cx={92} cy={42} r={4.5} fill="#FACC15" />
    </g>
  ),

  express_train: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={38} ry={5} />
      {/* Bright Yellow NYC Taxi Cab */}
      <rect x="48" y="34" width="24" height="10" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="2" />
      <path d="M24 58L35 42H85L96 58H102V82H18V58Z" fill="#FACC15" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <polygon points="37,46 58,46 58,58 29,58" fill="#BAE6FD" stroke={INK} strokeWidth="1.6" />
      <polygon points="62,46 83,46 91,58 62,58" fill="#BAE6FD" stroke={INK} strokeWidth="1.6" />
      {/* Checkerboard Taxi Stripe */}
      <rect x="24" y="64" width="72" height="7" fill="#111827" />
      {[28, 38, 48, 58, 68, 78, 88].map((cx) => (
        <rect key={cx} x={cx} y="64" width="5" height="7" fill="#FFFFFF" />
      ))}
      <circle cx="35" cy="83" r="10" fill="#1E293B" stroke="#E2E8F0" strokeWidth="2.2" />
      <circle cx="85" cy="83" r="10" fill="#1E293B" stroke="#E2E8F0" strokeWidth="2.2" />
    </g>
  ),

  direction_left_right: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* 4-Way Stop Standoff Octagon & Honking Arrows */}
      <rect x="56" y="62" width="8" height="36" fill="#64748B" stroke={INK} strokeWidth="2" />
      <polygon
        points="47,20 73,20 88,35 88,57 73,72 47,72 32,57 32,35"
        fill="#DC2626"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M40 46H54M40 46L46 40M40 46L46 52" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80 46H66M80 46L74 40M80 46L74 52" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle cx={24} cy={30} r={5} fill="#93C5FD" />
      <Sparkle cx={96} cy={30} r={5} fill="#FACC15" />
    </g>
  ),

  wave_hello: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={30} ry={5} />
      {/* Cozy Snow Mitten Waving "Ope!" */}
      <path d="M42 84H74V98H42Z" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      <path
        d="M42 84V52C42 36 50 26 60 26C70 26 74 36 74 52V62L84 53C89 49 95 54 91 61L74 84Z"
        fill="#EF4444"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path d="M44 76H72" stroke="#60A5FA" strokeWidth="3" />
      <Sparkle cx={30} cy={38} r={5} fill="#93C5FD" />
      <Sparkle cx={90} cy={30} r={5} fill="#FACC15" />
    </g>
  ),

  city_park: () => (
    <g>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#DBEAFE" stroke={INK} strokeWidth="2.2" />
      {/* Left Snow Pine vs Right Red Brick Bodega */}
      <path d="M16 74H104V100H16Z" fill="#F8FAFC" stroke={INK} strokeWidth="1.8" />
      <polygon points="36,30 22,60 50,60" fill="#059669" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points="36,44 20,76 52,76" fill="#10B981" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points="36,30 29,44 43,44" fill="#FFFFFF" />
      <rect x="60" y="34" width="38" height="46" rx="3" fill="#B91C1C" stroke={INK} strokeWidth="2" />
      <rect x="58" y="48" width="42" height="10" rx="2" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      <rect x="70" y="62" width="18" height="18" fill="#FEF08A" stroke={INK} strokeWidth="1.6" />
    </g>
  ),

  rainy_umbrella: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Red Snow Shovel + Gold Subway Token */}
      <path d="M38 22H52M45 22V56" stroke="#DC2626" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="30" y="56" width="30" height="32" rx="5" fill="#CBD5E1" stroke={INK} strokeWidth="2.2" />
      <circle cx="80" cy="64" r="22" fill="#FACC15" stroke="#92400E" strokeWidth="2.3" />
      <circle cx="80" cy="64" r="14" fill="#F59E0B" />
      <path d="M73 57L80 65L87 57M80 65V75" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),

  golden_ticket: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={34} ry={5} />
      {/* NYC MetroCard Gold Pass */}
      <rect x="18" y="34" width="84" height="54" rx="8" fill="#FACC15" stroke={INK} strokeWidth="2.4" />
      <rect x="18" y="44" width="84" height="12" fill="#1D4ED8" />
      <rect x="26" y="64" width="38" height="7" rx="3" fill="#FFFFFF" />
      <rect x="26" y="75" width="26" height="5" rx="2" fill="#B91C1C" />
      <Sparkle cx={84} cy={72} r={6} fill="#FFFFFF" />
    </g>
  ),
};

const SOUTH_GENZ_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  hot_chocolate: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={26} ry={5} />
      {/* Golden Porch Sweet Tea Mason Jar + Neon Glow Straw */}
      <line x1="68" y1="42" x2="82" y2="16" stroke="#C026D3" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="68" y1="42" x2="82" y2="16" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      <rect x="36" y="36" width="48" height="56" rx="11" fill="#D97706" stroke={INK} strokeWidth="2.4" />
      <rect x="41" y="27" width="38" height="10" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <rect x="44" y="48" width="13" height="13" rx="3" transform="rotate(-10 50 54)" fill="#FEF08A" opacity="0.78" />
      <rect x="61" y="56" width="13" height="13" rx="3" transform="rotate(14 67 62)" fill="#FEF08A" opacity="0.78" />
      <circle cx="44" cy="39" r="7" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      <Sparkle cx={26} cy={36} r={5} fill="#C026D3" />
    </g>
  ),

  cozy_home: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Split Porch Column & Neon Ring-Light Creator Desk */}
      <rect x="18" y="24" width="38" height="70" rx="4" fill="#FEF3C7" stroke={INK} strokeWidth="2.1" />
      <rect x="22" y="28" width="10" height="62" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.4" />
      <rect x="42" y="28" width="10" height="62" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.4" />
      <rect x="64" y="24" width="38" height="70" rx="6" fill="#1E1B4B" stroke={INK} strokeWidth="2.1" />
      <circle cx="83" cy="52" r="14" fill="none" stroke="#F0ABFC" strokeWidth="4" />
      <circle cx="83" cy="52" r="14" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
      <line x1="83" y1="66" x2="83" y2="88" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      <Sparkle cx={83} cy={22} r={4.5} fill="#22D3EE" />
    </g>
  ),

  warm_bread: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Cast-Iron Skillet Biscuits */}
      <path d="M84 64H106" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <circle cx="56" cy="64" r="32" fill="#1E293B" stroke={INK} strokeWidth="2.4" />
      <circle cx="46" cy="56" r="11" fill="#FDE68A" stroke="#B45309" strokeWidth="1.8" />
      <circle cx="67" cy="56" r="11" fill="#FDE68A" stroke="#B45309" strokeWidth="1.8" />
      <circle cx="56" cy="74" r="11" fill="#FBBF24" stroke="#B45309" strokeWidth="1.8" />
      <Sparkle cx={24} cy={28} r={5} fill="#C026D3" />
    </g>
  ),

  lightning_wit: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Neon Magenta/Cyan For-You Lightning + Porch Fan */}
      <circle cx="60" cy="56" r="34" fill="#3B0764" stroke="#C026D3" strokeWidth="2.5" />
      <polygon points="65,24 44,58 58,58 51,88 77,51 63,51" fill="#22D3EE" transform="translate(3, 2)" />
      <polygon points="65,24 44,58 58,58 51,88 77,51 63,51" fill="#E879F9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
      <Sparkle cx={26} cy={30} r={5} fill="#FACC15" />
      <Sparkle cx={94} cy={82} r={5} fill="#22D3EE" />
    </g>
  ),

  happy_smile: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Vector Glossy Laugh-Skull + Flame Sticker (zero Unicode!) */}
      <circle cx="50" cy="56" r="24" fill="#F8FAFC" stroke={INK} strokeWidth="2.4" />
      <rect x="38" y="72" width="24" height="12" rx="4" fill="#F8FAFC" stroke={INK} strokeWidth="2.2" />
      <circle cx="42" cy="54" r="5" fill={INK} />
      <circle cx="58" cy="54" r="5" fill={INK} />
      <path d="M44 74V84M50 74V84M56 74V84" stroke={INK} strokeWidth="1.6" />
      {/* Neon Flame */}
      <path d="M84 36C94 46 98 56 96 68C94 78 86 84 78 84C70 84 65 77 65 67C65 56 73 48 77 42C80 49 84 50 84 36Z" fill="#EC4899" stroke={INK} strokeWidth="2" />
      <path d="M82 54C88 61 90 69 87 75C85 79 81 80 78 80C74 80 71 76 71 70C71 64 76 59 82 54Z" fill="#FEF08A" />
    </g>
  ),

  starlight_trophy: () => (
    <g>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Ring-Light Crown Trophy */}
      <rect x="42" y="88" width="36" height="10" rx="4" fill="#C026D3" stroke={INK} strokeWidth="2.2" />
      <rect x="56" y="64" width="8" height="24" fill="#334155" stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="44" r="20" fill="none" stroke="#F0ABFC" strokeWidth="7" />
      <circle cx="60" cy="44" r="20" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
      <path d="M46 23L52 14L60 20L68 14L74 23Z" fill="#FACC15" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <Sparkle cx={24} cy={42} r={5} fill="#FACC15" />
    </g>
  ),

  theater_comedy_masks: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Southern Lace Fan & Gen-Z RGB Headphones */}
      <path d="M22 68A24 24 0 0 1 68 68Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.2" />
      <line x1="45" y1="68" x2="45" y2="88" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M56 58C56 36 96 36 96 58" fill="none" stroke="#C026D3" strokeWidth="5" strokeLinecap="round" />
      <rect x="51" y="56" width="11" height="20" rx="5" fill="#22D3EE" stroke={INK} strokeWidth="2" />
      <rect x="90" y="56" width="11" height="20" rx="5" fill="#E879F9" stroke={INK} strokeWidth="2" />
    </g>
  ),

  wave_hello: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={28} ry={5} />
      {/* Glowing Smartphone Recording For-You Clip */}
      <rect x="36" y="22" width="48" height="74" rx="10" fill="#0F172A" stroke="#C026D3" strokeWidth="2.6" />
      <rect x="41" y="29" width="38" height="58" rx="5" fill="#3B0764" />
      <circle cx="60" cy="54" r="12" fill="none" stroke="#22D3EE" strokeWidth="3.5" />
      <polygon points="56,48 67,54 56,60" fill="#FEF08A" />
      <Sparkle cx={90} cy={30} r={5.5} fill="#FACC15" />
    </g>
  ),
};

const CALI_COUNTRY_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  orange_juice: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={28} ry={5} />
      {/* $22 Emerald Matcha Smoothie */}
      <line x1="60" y1="36" x2="69" y2="16" stroke="#D97706" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M38 42H82L75 94H45Z" fill="#10B981" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M36 42C36 28 84 28 84 42Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.1" />
      <path d="M48 62C54 52 68 52 72 62C66 68 54 68 48 62Z" fill="#6EE7B7" />
      <Sparkle cx={26} cy={38} r={5} fill="#FACC15" />
    </g>
  ),

  cozy_home: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Warm Cedar Holler Cabin */}
      <rect x="74" y="24" width="11" height="22" fill="#78350F" stroke={INK} strokeWidth="1.8" />
      <path d="M79 18C76 12 83 8 80 3" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="24" y="48" width="72" height="46" rx="4" fill="#92400E" stroke={INK} strokeWidth="2.3" />
      <path d="M24 58H96M24 70H96M24 82H96" stroke="#78350F" strokeWidth="2" />
      <polygon points="16,50 60,20 104,50" fill="#B45309" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="33" y="60" width="18" height="18" rx="3" fill="#FEF08A" stroke={INK} strokeWidth="1.8" />
      <rect x="65" y="62" width="18" height="32" rx="3" fill="#451A03" stroke={INK} strokeWidth="1.8" />
    </g>
  ),

  sunny_mountain: () => (
    <g>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#ECFDF5" stroke={INK} strokeWidth="2.2" />
      {/* Surfboard + Blue Ridge Mountains */}
      <circle cx="34" cy="36" r="9" fill="#FACC15" />
      <path d="M16 80L46 48L70 72L86 52L104 76V100H16Z" fill="#15803D" stroke={INK} strokeWidth="1.8" />
      <g transform="translate(36, 70) rotate(-18)">
        <ellipse cx="0" cy="0" rx="8" ry="22" fill="#38BDF8" stroke={INK} strokeWidth="2" />
        <line x1="0" y1="-20" x2="0" y2="20" stroke="#F472B6" strokeWidth="3.5" />
      </g>
    </g>
  ),

  express_train: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Pickup Tailgate with Duct Tape & Cooler */}
      <rect x="20" y="42" width="80" height="46" rx="7" fill="#EA580C" stroke={INK} strokeWidth="2.4" />
      <rect x="46" y="48" width="28" height="8" rx="2.5" fill="#E2E8F0" stroke={INK} strokeWidth="1.8" />
      <circle cx="32" cy="84" r="10" fill="#1E293B" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="88" cy="84" r="10" fill="#1E293B" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="78" cy="68" r="12" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <circle cx="78" cy="68" r="5" fill="#475569" stroke={INK} strokeWidth="1.6" />
    </g>
  ),

  bandaid_care: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={32} ry={5} />
      {/* Duct Tape Roll + Wrench Fix-All */}
      <g transform="translate(46, 58) rotate(-32)">
        <rect x="-26" y="-5" width="46" height="10" rx="4" fill="#E2E8F0" stroke={INK} strokeWidth="2.1" />
        <path d="M16 -9A9 9 0 1 1 16 9L23 4H14V-4H23Z" fill="#F8FAFC" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      </g>
      <circle cx="76" cy="70" r="20" fill="#CBD5E1" stroke={INK} strokeWidth="2.3" />
      <circle cx="76" cy="70" r="8" fill="#475569" stroke={INK} strokeWidth="2" />
      <Sparkle cx={26} cy={30} r={5} fill="#10B981" />
    </g>
  ),

  calm_lotus: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Brass Singing Bowl + Lavender */}
      <path d="M26 56H94C92 78 78 90 60 90C42 90 28 78 26 56Z" fill="#F59E0B" stroke={INK} strokeWidth="2.3" />
      <ellipse cx="60" cy="56" rx="34" ry="7" fill="#FEF08A" stroke={INK} strokeWidth="2" />
      <path d="M28 40Q60 22 92 40" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
      <Sparkle cx={60} cy={24} r={6} fill="#6EE7B7" />
    </g>
  ),

  explorer_boots: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={34} ry={5} />
      {/* Muddy Appalachian Work/Cowboy Boot */}
      <path d="M32 82V26H58V60L84 67C92 69 95 75 94 82Z" fill="#92400E" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="30" y="80" width="66" height="9" rx="3" fill="#451A03" stroke={INK} strokeWidth="2" />
      <path d="M36 40H54M36 50H54" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" />
      <Sparkle cx={84} cy={34} r={5} fill="#10B981" />
    </g>
  ),

  campfire_story: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Holler Creek Pellet Smoker */}
      <path d="M52 36C48 28 56 22 52 14M68 38C64 30 72 24 68 16" stroke="#CBD5E1" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <line x1="36" y1="74" x2="30" y2="96" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="84" y1="74" x2="90" y2="96" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <rect x="26" y="44" width="68" height="32" rx="12" fill="#1E293B" stroke={INK} strokeWidth="2.3" />
      <rect x="78" y="28" width="8" height="18" rx="2" fill="#334155" stroke={INK} strokeWidth="1.8" />
      <path d="M34 56H86" stroke="#EA580C" strokeWidth="3.2" strokeLinecap="round" />
    </g>
  ),
};

const STONER_TACTICAL_SCENE_OVERRIDES: Partial<Record<IllustrationKey, SceneRenderer>> = {
  bicycle_ride: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={38} ry={5} />
      {/* Lime-Green Skateboard angled over Half-Pipe */}
      <path d="M18 76C28 92 92 92 102 76V94H18Z" fill="#14B8A6" stroke={INK} strokeWidth="2.2" />
      <g transform="translate(60, 56) rotate(-14)">
        <rect x="-36" y="-8" width="72" height="14" rx="7" fill="#84CC16" stroke={INK} strokeWidth="2.3" />
        <circle cx="-20" cy="11" r="6" fill="#EC4899" stroke={INK} strokeWidth="1.8" />
        <circle cx="20" cy="11" r="6" fill="#EC4899" stroke={INK} strokeWidth="1.8" />
      </g>
      <Sparkle cx={86} cy={28} r={5} fill="#BEF264" />
    </g>
  ),

  cozy_home: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Tactical Lawn-Ops Clipboard + Chill Lava Glow */}
      <rect x="30" y="24" width="60" height="72" rx="7" fill="#D97706" stroke={INK} strokeWidth="2.3" />
      <rect x="37" y="34" width="46" height="54" rx="3" fill="#FFFFFF" stroke={INK} strokeWidth="1.5" />
      <rect x="48" y="18" width="24" height="10" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <path d="M44 48L48 52L55 44M44 64L48 68L55 60M44 80L48 84L55 76" stroke="#22C55E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M60 48H77M60 64H77M60 80H74" stroke="#4338CA" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),

  compass_map: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Indigo Tactical Laser Rangefinder Reticle */}
      <circle cx="60" cy="58" r="34" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2.8" />
      <circle cx="60" cy="58" r="22" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" />
      <line x1="60" y1="20" x2="60" y2="44" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="60" y1="72" x2="60" y2="96" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="22" y1="58" x2="46" y2="58" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="74" y1="58" x2="98" y2="58" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="60" cy="58" r="5" fill="#BEF264" stroke={INK} strokeWidth="1.5" />
    </g>
  ),

  night_stars: () => (
    <g>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#1E1B4B" stroke={INK} strokeWidth="2.2" />
      {/* 1:30 AM Drive-Thru Neon Taco/Moon Sign */}
      <path d="M44 30C32 33 26 45 28 57C30 68 41 76 52 74C42 71 38 62 39 51C40 41 43 34 44 30Z" fill="#BEF264" />
      <rect x="52" y="42" width="44" height="34" rx="6" fill="#4338CA" stroke="#38BDF8" strokeWidth="2.2" />
      <path d="M58 55H90M58 65H82" stroke="#FACC15" strokeWidth="3.2" strokeLinecap="round" />
      <Sparkle cx={84} cy={30} r={4.5} fill="#FDE047" />
    </g>
  ),

  crispy_treat: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Nacho-Cheese Tortilla Chips Stack */}
      <polygon points="32,80 60,26 88,80" fill="#F97316" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <polygon points="22,86 48,44 68,86" fill="#FACC15" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="56,88 78,46 98,88" fill="#FB923C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <Sparkle cx={32} cy={32} r={5} fill="#84CC16" />
    </g>
  ),

  feelings_weather: () => (
    <g>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Chill Swirl Cloud */}
      <path
        d="M24 72C18 72 14 66 15 60C16 54 22 50 28 52C32 36 48 30 62 36C72 32 88 38 90 52C98 52 104 59 102 67C101 73 95 76 88 76H28Z"
        fill="#FFFFFF"
        stroke="#4D7C0F"
        strokeWidth="2.4"
      />
      <path
        d="M60 58C60 53 66 51 69 54C73 59 69 67 61 68C51 69 45 60 48 51C52 41 65 39 73 45"
        stroke="#84CC16"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <Sparkle cx={86} cy={28} r={4.5} fill="#6366F1" />
    </g>
  ),

  explorer_boots: () => (
    <g>
      <GroundShadow cx={60} cy={99} rx={36} ry={5} />
      {/* Checker Slip-On Skate Shoe */}
      <path d="M22 82V50H46L58 62L86 67C94 69 96 76 95 82Z" fill="#1E293B" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="20" y="80" width="76" height="10" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
      <rect x="28" y="60" width="12" height="12" fill="#84CC16" />
      <rect x="40" y="60" width="12" height="12" fill="#FFFFFF" />
      <Sparkle cx={84} cy={36} r={5} fill="#84CC16" />
    </g>
  ),

  city_park: () => (
    <g>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#E0E7FF" stroke={INK} strokeWidth="2.2" />
      {/* Precision Bermuda Mower Stripes + Orange Cone */}
      <path d="M16 64H104V100H16Z" fill="#22C55E" stroke={INK} strokeWidth="2" />
      <polygon points="28,64 44,64 36,100 20,100" fill="#15803D" />
      <polygon points="60,64 76,64 68,100 52,100" fill="#15803D" />
      <polygon points="50,76 60,40 70,76" fill="#F97316" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="45" y="74" width="30" height="6" rx="2" fill="#EA580C" stroke={INK} strokeWidth="1.8" />
      <path d="M55 58H65" stroke="#FFFFFF" strokeWidth="3.2" />
    </g>
  ),
};

const SCENE_OVERRIDES_BY_LANGUAGE: Record<
  AdultLanguageCode,
  Partial<Record<IllustrationKey, SceneRenderer>>
> = {
  ebonics: EBONICS_SCENE_OVERRIDES,
  suburban: SUBURBAN_SCENE_OVERRIDES,
  corp_trades: CORP_TRADES_SCENE_OVERRIDES,
  midwest_northeast: MIDWEST_NORTHEAST_SCENE_OVERRIDES,
  south_genz: SOUTH_GENZ_SCENE_OVERRIDES,
  cali_country: CALI_COUNTRY_SCENE_OVERRIDES,
  stoner_tactical: STONER_TACTICAL_SCENE_OVERRIDES,
};

export function resolveAdultSceneRenderer(
  illustrationKey: IllustrationKey,
  language: AdultLanguageCode,
  baseRenderer: SceneRenderer
): SceneRenderer {
  const overrideMap = SCENE_OVERRIDES_BY_LANGUAGE[language];
  const customScene = overrideMap[illustrationKey];

  if (customScene) {
    return (uid: string) => <g data-adult-override={language}>{customScene(uid)}</g>;
  }

  return (uid: string) => (
    <>
      {baseRenderer(uid)}
      {renderAdultCornerFlair(language)}
    </>
  );
}

function renderAdultCornerFlair(language: AdultLanguageCode): ReactNode {
  if (language === 'ebonics') {
    return (
      <g data-adult-flair="ebonics" transform="translate(95, 25)">
        <circle cx="0" cy="0" r="8.5" fill="#1E1B4B" stroke="#F59E0B" strokeWidth="1.6" />
        <circle cx="0" cy="0" r="5.6" stroke="#7C3AED" strokeWidth="0.9" />
        <circle cx="0" cy="0" r="2.8" fill="#FACC15" stroke={INK} strokeWidth="0.8" />
        <circle cx="0" cy="0" r="0.9" fill="#0F172A" />
      </g>
    );
  }

  if (language === 'suburban') {
    return (
      <g data-adult-flair="suburban" transform="translate(95, 25)">
        <circle cx="0" cy="0" r="8.5" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.6" />
        <path d="M-5 1.5H5C5 4.2 2.8 6 0 6C-2.8 6 -5 4.2 -5 1.5Z" fill="#EA580C" stroke={INK} strokeWidth="0.9" />
        <path d="M-5.2 1C-5.2 -2 -2.9 -4 0 -4C2.9 -4 5.2 -2 5.2 1Z" fill="#FB923C" stroke={INK} strokeWidth="0.9" />
        <rect x="-2" y="-5.6" width="4" height="1.6" rx="0.7" fill="#FFFFFF" stroke={INK} strokeWidth="0.7" />
      </g>
    );
  }

  if (language === 'corp_trades') {
    return (
      <g data-adult-flair="corp_trades" transform="translate(95, 25)">
        <path d="M0 -8.5A8.5 8.5 0 0 0 0 8.5Z" fill="#0F766E" />
        <path d="M0 -8.5A8.5 8.5 0 0 1 0 8.5Z" fill="#F59E0B" />
        <circle cx="0" cy="0" r="8.5" fill="none" stroke={INK} strokeWidth="1.5" />
        <rect x="-5.5" y="-3.2" width="4.2" height="6.2" rx="1" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />
        <path d="M1.2 1.2C1.2 -1.6 3 -3 4.8 -3C6.6 -3 7.5 -1.6 7.5 1.2Z" fill="#FACC15" stroke={INK} strokeWidth="0.7" />
      </g>
    );
  }

  if (language === 'midwest_northeast') {
    return (
      <g data-adult-flair="midwest_northeast" transform="translate(95, 25)">
        <path d="M0 -8.5A8.5 8.5 0 0 0 0 8.5Z" fill="#DBEAFE" />
        <path d="M0 -8.5A8.5 8.5 0 0 1 0 8.5Z" fill="#B91C1C" />
        <circle cx="0" cy="0" r="8.5" fill="none" stroke={INK} strokeWidth="1.5" />
        <polygon points="-3.6,-4.8 -6.2,1.6 -1,1.6" fill="#059669" />
        <rect x="1.5" y="-2.2" width="5.2" height="4.4" rx="1" fill="#FACC15" stroke={INK} strokeWidth="0.6" />
      </g>
    );
  }

  if (language === 'south_genz') {
    return (
      <g data-adult-flair="south_genz" transform="translate(95, 25)">
        <path d="M0 -8.5A8.5 8.5 0 0 0 0 8.5Z" fill="#FEF3C7" />
        <path d="M0 -8.5A8.5 8.5 0 0 1 0 8.5Z" fill="#3B0764" />
        <circle cx="0" cy="0" r="8.5" fill="none" stroke="#C026D3" strokeWidth="1.5" />
        <rect x="-5.5" y="-3.5" width="4" height="7" rx="1.2" fill="#D97706" stroke={INK} strokeWidth="0.6" />
        <polygon points="3.5,-5 1,0.5 3.4,0.5 2.2,5 6.2,-0.8 3.8,-0.8" fill="#E879F9" />
      </g>
    );
  }

  if (language === 'cali_country') {
    return (
      <g data-adult-flair="cali_country" transform="translate(95, 25)">
        <path d="M0 -8.5A8.5 8.5 0 0 0 0 8.5Z" fill="#ECFDF5" />
        <path d="M0 -8.5A8.5 8.5 0 0 1 0 8.5Z" fill="#9A3412" />
        <circle cx="0" cy="0" r="8.5" fill="none" stroke="#059669" strokeWidth="1.5" />
        <path d="M-5.2 -2H-1.2L-1.8 4.8H-4.6Z" fill="#10B981" stroke={INK} strokeWidth="0.6" />
        <polygon points="1,3.5 4,-3.5 7,3.5" fill="#FDBA74" stroke={INK} strokeWidth="0.6" />
      </g>
    );
  }

  return (
    <g data-adult-flair="stoner_tactical" transform="translate(95, 25)">
      <path d="M0 -8.5A8.5 8.5 0 0 0 0 8.5Z" fill="#ECFCCB" />
      <path d="M0 -8.5A8.5 8.5 0 0 1 0 8.5Z" fill="#1E1B4B" />
      <circle cx="0" cy="0" r="8.5" fill="none" stroke="#4D7C0F" strokeWidth="1.5" />
      <circle cx="-3.6" cy="0" r="2.8" fill="#84CC16" stroke={INK} strokeWidth="0.6" />
      <circle cx="3.6" cy="0" r="3" fill="none" stroke="#38BDF8" strokeWidth="0.9" />
      <circle cx="3.6" cy="0" r="0.9" fill="#FACC15" />
    </g>
  );
}
