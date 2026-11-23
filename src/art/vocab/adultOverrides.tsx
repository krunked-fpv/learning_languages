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

export function resolveAdultSceneRenderer(
  illustrationKey: IllustrationKey,
  language: AdultLanguageCode,
  baseRenderer: SceneRenderer
): SceneRenderer {
  const overrideMap =
    language === 'ebonics' ? EBONICS_SCENE_OVERRIDES : SUBURBAN_SCENE_OVERRIDES;
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

  return (
    <g data-adult-flair="suburban" transform="translate(95, 25)">
      <circle cx="0" cy="0" r="8.5" fill="#F0F9FF" stroke="#0284C7" strokeWidth="1.6" />
      <path d="M-5 1.5H5C5 4.2 2.8 6 0 6C-2.8 6 -5 4.2 -5 1.5Z" fill="#EA580C" stroke={INK} strokeWidth="0.9" />
      <path d="M-5.2 1C-5.2 -2 -2.9 -4 0 -4C2.9 -4 5.2 -2 5.2 1Z" fill="#FB923C" stroke={INK} strokeWidth="0.9" />
      <rect x="-2" y="-5.6" width="4" height="1.6" rx="0.7" fill="#FFFFFF" stroke={INK} strokeWidth="0.7" />
    </g>
  );
}
