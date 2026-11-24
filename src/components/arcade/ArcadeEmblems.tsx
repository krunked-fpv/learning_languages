import { useId } from 'react';

function useSvgIds(prefix: string, keys: readonly string[]) {
  const uid = useId().replace(/:/g, '-');
  const map: Record<string, string> = {};
  for (const k of keys) {
    map[k] = `${prefix}-${k}-${uid}`;
  }
  return map;
}

export function SkyCatcherEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-sky', ['bg', 'lantern', 'glow']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="12" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60B8F5" />
          <stop offset="56%" stopColor="#3B82D6" />
          <stop offset="100%" stopColor="#264C96" />
        </linearGradient>
        <radialGradient id={ids.glow} cx="32" cy="29" r="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.lantern} x1="22" y1="14" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3A7" />
          <stop offset="48%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#EA6A1A" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#4A3426" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#FDE68A" strokeOpacity="0.45" strokeWidth="1.2" />
      {/* Layered gouache cloud hill */}
      <path d="M8 46C15 39 24 41 32 45C40 49 48 44 56 40V55C56 56.5 54.5 58 53 58H11C9.5 58 8 56.5 8 55V46Z" fill="#E0F2FE" fillOpacity="0.32" />
      <circle cx="32" cy="29" r="20" fill={`url(#${ids.glow})`} />
      {/* Soft cast shadow behind lantern */}
      <ellipse cx="34.5" cy="31.5" rx="12.5" ry="14" fill="#1E2B5C" fillOpacity="0.3" />
      {/* Wooden lantern cap & base */}
      <rect x="24.5" y="10.5" width="15" height="5" rx="2.5" fill="#7C4321" stroke="#4A3426" strokeWidth="1.8" />
      {/* Glowing rice-paper lantern */}
      <ellipse cx="32" cy="29" rx="13" ry="14.5" fill={`url(#${ids.lantern})`} stroke="#4A3426" strokeWidth="2.1" />
      {/* Upper-left gouache highlight */}
      <path d="M23.5 22C25 18 28.5 16.5 31.5 16.5" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      {/* Paper ribs */}
      <path d="M32 14.5V43.5M23.5 18.5C26.5 24 26.5 34 23.5 39.5M40.5 18.5C37.5 24 37.5 34 40.5 39.5" stroke="#FFF7D6" strokeWidth="1.35" strokeLinecap="round" opacity="0.85" />
      <rect x="25.5" y="43.5" width="13" height="4.5" rx="2" fill="#7C4321" stroke="#4A3426" strokeWidth="1.8" />
      <path d="M32 48V54.5" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="15" cy="17" r="2.2" fill="#FEF3C7" />
      <circle cx="49.5" cy="20" r="1.7" fill="#FFFBEB" />
    </svg>
  );
}

export function MeteorBlasterEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-meteor', ['bg', 'rock', 'ship']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B2E7A" />
          <stop offset="60%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#141132" />
        </linearGradient>
        <linearGradient id={ids.rock} x1="23" y1="11" x2="41" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9B8FF" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>
        <linearGradient id={ids.ship} x1="25" y1="34" x2="40" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="100%" stopColor="#E2D9C8" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#D9B46A" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#F6C56A" strokeOpacity="0.35" strokeWidth="1.1" />
      {/* Astrolabe arc */}
      <circle cx="32" cy="34" r="20" stroke="#D9B46A" strokeOpacity="0.22" strokeWidth="1.1" strokeDasharray="3 3" />
      <circle cx="15" cy="16" r="1.9" fill="#FEF08A" />
      <circle cx="50" cy="16" r="1.8" fill="#FDE68A" />
      <circle cx="48" cy="48" r="1.4" fill="#F9A8D4" />
      {/* Warm golden-cyan twin laser beams */}
      <path d="M26 42L29 24M38 42L35 24" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" opacity="0.92" />
      {/* Cast shadow + Faceted Asteroid */}
      <polygon points="34,13 44,18 42,28 30,29 24,20" fill="#0F0B29" fillOpacity="0.45" />
      <polygon points="32,11 42,16 40,26 28,27 22,18" fill={`url(#${ids.rock})`} stroke="#F6E1A6" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M26 17L32 13.5L36 16" stroke="#FFFBEB" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      {/* Painted tin-toy starship */}
      <path d="M33.5 36L43.5 52L33.5 48L23.5 52L33.5 36Z" fill="#0F0B29" fillOpacity="0.45" />
      <path d="M32 34L42 50L32 46L22 50L32 34Z" fill={`url(#${ids.ship})`} stroke="#4A3426" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="42" r="3.2" fill="#38BDF8" stroke="#4A3426" strokeWidth="1.4" />
      <path d="M29 50L32 56L35 50" fill="#FB923C" stroke="#9A3412" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function TowerStackEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-gelato', ['bg', 'cone']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF5F7" />
          <stop offset="55%" stopColor="#FCE7F3" />
          <stop offset="100%" stopColor="#FDE6C4" />
        </linearGradient>
        <linearGradient id={ids.cone} x1="22" y1="38" x2="40" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#4A3426" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#F472B6" strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Soft cast shadow */}
      <ellipse cx="34" cy="54" rx="12" ry="3" fill="#4A3426" fillOpacity="0.18" />
      {/* Waffle Cone */}
      <polygon points="22,38 42,38 32,56" fill={`url(#${ids.cone})`} stroke="#4A3426" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 42L35 50M38 42L29 50" stroke="#7C4321" strokeWidth="1.4" strokeLinecap="round" />
      {/* Painted Scoops with upper-left gouache highlights */}
      <circle cx="25.5" cy="34" r="8" fill="#5EEAD4" stroke="#4A3426" strokeWidth="1.9" />
      <path d="M21 31C22 29 24 28.5 25.5 28.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <circle cx="38.5" cy="34" r="8" fill="#93C5FD" stroke="#4A3426" strokeWidth="1.9" />
      <path d="M34 31C35 29 37 28.5 38.5 28.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <circle cx="32" cy="23.5" r="9" fill="#FB7185" stroke="#4A3426" strokeWidth="2" />
      <path d="M26.5 20.5C27.8 18.2 30 17.5 32 17.5" stroke="#FFF1F2" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {/* Cherry */}
      <circle cx="32" cy="13" r="3.4" fill="#E11D48" stroke="#4A3426" strokeWidth="1.6" />
      <path d="M33 10C35 8 37 8 38.5 9.2" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ConstellationMemoryEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-const', ['bg', 'cardA', 'cardB']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A205C" />
          <stop offset="60%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#3B1A5C" />
        </linearGradient>
        <linearGradient id={ids.cardA} x1="14" y1="22" x2="30" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#DDD6FE" />
        </linearGradient>
        <linearGradient id={ids.cardB} x1="32" y1="20" x2="50" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#D9B46A" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#F6C56A" strokeOpacity="0.35" strokeWidth="1.1" />
      <path d="M18 19L32 13L47 27L26 49L18 19Z" stroke="#FDE68A" strokeOpacity="0.65" strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" />
      {/* Soft tinted card shadows */}
      <rect x="16" y="24" width="16" height="22" rx="4" transform="rotate(-10 24 35)" fill="#0F0B29" fillOpacity="0.4" />
      <rect x="14" y="22" width="16" height="22" rx="4" transform="rotate(-10 22 33)" fill={`url(#${ids.cardA})`} stroke="#4A3426" strokeWidth="1.8" />
      <rect x="34" y="22" width="18" height="24" rx="4" transform="rotate(8 43 34)" fill="#0F0B29" fillOpacity="0.4" />
      <rect x="32" y="20" width="18" height="24" rx="4" transform="rotate(8 41 32)" fill={`url(#${ids.cardB})`} stroke="#B45309" strokeWidth="1.9" />
      <path d="M41 25L43 29.8L48 30.8L44.2 34.4L45.1 39.5L41 36.8L36.9 39.5L37.8 34.4L34 30.8L39 29.8Z" fill="#D97706" stroke="#78350F" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="18" cy="15" r="2.2" fill="#FEF08A" />
      <circle cx="48" cy="14" r="1.9" fill="#93C5FD" />
    </svg>
  );
}

export function TrainSwitcherEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-train', ['bg', 'body']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0FDF4" />
          <stop offset="55%" stopColor="#D1FAE5" />
          <stop offset="100%" stopColor="#A7E8C9" />
        </linearGradient>
        <linearGradient id={ids.body} x1="16" y1="24" x2="44" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#C26410" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#4A3426" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#10B981" strokeOpacity="0.35" strokeWidth="1.2" />
      {/* Wooden Ties & Brass Track */}
      <path d="M10 48H54M14 44L19 52M28 44L28 52M42 44L38 52" stroke="#6B3F22" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cast shadow */}
      <ellipse cx="32" cy="46" rx="16" ry="3.2" fill="#4A3426" fillOpacity="0.2" />
      {/* Painted Wooden Toy Locomotive */}
      <rect x="16" y="24" width="28" height="16" rx="4" fill={`url(#${ids.body})`} stroke="#4A3426" strokeWidth="2" />
      <path d="M19 27.5H30" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
      <rect x="31" y="16" width="13" height="12" rx="3" fill="#0F766E" stroke="#4A3426" strokeWidth="1.9" />
      <rect x="34" y="19" width="7" height="5" rx="1.5" fill="#FEF3C7" />
      <rect x="20" y="16" width="6" height="8" rx="2" fill="#574336" stroke="#4A3426" strokeWidth="1.5" />
      <circle cx="22" cy="11.5" r="2.8" fill="#FFFDF7" opacity="0.9" />
      <circle cx="28" cy="9.5" r="3.6" fill="#FFFDF7" opacity="0.75" />
      <circle cx="22" cy="41" r="4.4" fill="#4A3426" stroke="#FBBF24" strokeWidth="1.8" />
      <circle cx="38" cy="41" r="4.4" fill="#4A3426" stroke="#FBBF24" strokeWidth="1.8" />
    </svg>
  );
}

export function RhythmChefEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-rhythm', ['bg', 'drum']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="55%" stopColor="#FFEDD5" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
        <linearGradient id={ids.drum} x1="18" y1="30" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#4A3426" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#EA580C" strokeOpacity="0.35" strokeWidth="1.2" />
      {/* Golden Beat Ring */}
      <circle cx="32" cy="34" r="19" stroke="#E11D48" strokeOpacity="0.75" strokeWidth="1.9" strokeDasharray="4 3.5" strokeLinecap="round" />
      {/* Cast shadow */}
      <ellipse cx="33" cy="51" rx="14" ry="3.2" fill="#4A3426" fillOpacity="0.2" />
      {/* Warm Copper Kettle Drum */}
      <path d="M18 30V42.5C18 46.8 24 50 32 50C40 50 46 46.8 46 42.5V30" fill={`url(#${ids.drum})`} stroke="#4A3426" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 37C23 41 25 43 27 44" stroke="#FED7AA" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
      <ellipse cx="32" cy="30" rx="14" ry="6.8" fill="#FEF3C7" stroke="#4A3426" strokeWidth="2" />
      {/* Musical Note */}
      <path d="M29 22V12L40 10V20" stroke="#4A3426" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26.5" cy="22.5" r="3" fill="#4A3426" />
      <circle cx="37.5" cy="20.5" r="3" fill="#4A3426" />
    </svg>
  );
}

export function StarlightChoirEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-choir', ['bg', 'halo']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#433899" />
          <stop offset="55%" stopColor="#2A2066" />
          <stop offset="100%" stopColor="#1A1542" />
        </linearGradient>
        <radialGradient id={ids.halo} cx="32" cy="32" r="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#D9B46A" strokeWidth="2.3" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#F6E1A6" strokeOpacity="0.45" strokeWidth="1.1" />
      <circle cx="32" cy="32" r="22" fill={`url(#${ids.halo})`} />
      <circle cx="24" cy="24" r="9.5" fill="#FDE047" fillOpacity="0.22" stroke="#FDE047" strokeWidth="1.8" />
      <circle cx="43" cy="38" r="10.5" fill="#7DD3FC" fillOpacity="0.22" stroke="#7DD3FC" strokeWidth="1.8" />
      <path d="M28 42V18L44 14V36" stroke="#FEF08A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="43" r="4.5" fill="#FDE047" stroke="#78350F" strokeWidth="1.3" />
      <circle cx="40" cy="38" r="4.5" fill="#F472B6" stroke="#831843" strokeWidth="1.3" />
      <circle cx="15" cy="16" r="2.1" fill="#FFFBEB" />
      <circle cx="51" cy="20" r="2.1" fill="#FDE047" />
    </svg>
  );
}

export function CafeOrderRushEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-cafe', ['bg', 'cup']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFBF0" />
          <stop offset="55%" stopColor="#FFEDD5" />
          <stop offset="100%" stopColor="#FCD9B6" />
        </linearGradient>
        <linearGradient id={ids.cup} x1="16" y1="27" x2="34" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#4A3426" strokeWidth="2.2" />
      {/* Scalloped Cafe Awning */}
      <path d="M5.5 13C5.5 8 9.2 5.5 14 5.5H50C54.8 5.5 58.5 8 58.5 13V16H5.5V13Z" fill="#D95D24" />
      <rect x="13" y="5.5" width="7" height="10.5" fill="#FFFDF7" opacity="0.92" />
      <rect x="27" y="5.5" width="7" height="10.5" fill="#FFFDF7" opacity="0.92" />
      <rect x="41" y="5.5" width="7" height="10.5" fill="#FFFDF7" opacity="0.92" />
      <path d="M5.5 16H58.5" stroke="#4A3426" strokeWidth="1.4" />
      {/* Cocoa Steam */}
      <path d="M21 23C20 20 23 19 22 17" stroke="#8C5332" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
      <path d="M28 22C27 19 30 18 29 16" stroke="#8C5332" strokeWidth="1.7" strokeLinecap="round" opacity="0.7" />
      {/* Soft table shadow */}
      <ellipse cx="26" cy="49.5" rx="11" ry="2.8" fill="#4A3426" fillOpacity="0.2" />
      {/* Warm Cocoa Mug */}
      <path d="M14 27H34V40C34 45 29.5 48 24 48C18.5 48 14 45 14 40V27Z" fill={`url(#${ids.cup})`} stroke="#4A3426" strokeWidth="2" strokeLinejoin="round" />
      <path d="M34 30H37.5C39.8 30 41 31.8 41 34C41 36.2 39.8 38 37.5 38H34" stroke="#4A3426" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="24" cy="27" rx="9" ry="2.6" fill="#6B3A1E" />
      {/* Golden Croissant Platter */}
      <ellipse cx="43" cy="50" rx="13" ry="4" fill="#FDE68A" stroke="#7C4321" strokeWidth="1.7" />
      <path d="M34 48C36 42 41 39 46 41C50 42.5 52 46 50 49C46 50.5 38 50.5 34 48Z" fill="#F59E0B" stroke="#4A3426" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M40 42L41 48M46 42L45 48" stroke="#78350F" strokeWidth="1.4" strokeLinecap="round" />
      {/* Star Tip Medallion */}
      <circle cx="49" cy="24" r="6" fill="#FBBF24" stroke="#4A3426" strokeWidth="1.7" />
      <path d="M49 20.5L50 22.8L52.4 23L50.5 24.6L51.1 27L49 25.7L46.9 27L47.5 24.6L45.6 23L48 22.8Z" fill="#FFFDF7" />
    </svg>
  );
}

export function StarlightBridgeEmblem({ size = 48 }: { size?: number }) {
  const ids = useSvgIds('emb-bridge', ['bg', 'plank']);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={ids.bg} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2B2466" />
          <stop offset="60%" stopColor="#1B1F4A" />
          <stop offset="100%" stopColor="#1A2644" />
        </linearGradient>
        <linearGradient id={ids.plank} x1="20" y1="34" x2="44" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#7DD3FC" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill={`url(#${ids.bg})`} stroke="#D9B46A" strokeWidth="2.2" />
      <rect x="7" y="7" width="50" height="50" rx="12" stroke="#7DD3FC" strokeOpacity="0.35" strokeWidth="1.1" />
      {/* Crescent Moon & Stars */}
      <path d="M47 12C43.5 12.5 41 15.5 41.5 19C42 22.5 45 24.8 48.5 24.4C45.8 26.2 41.8 25.6 39.8 23C37.8 20.4 38.2 16.5 40.8 14.3C42.5 12.8 44.8 12.1 47 12Z" fill="#FDE047" />
      <circle cx="16" cy="16" r="2" fill="#FEF08A" />
      <circle cx="29" cy="13" r="1.5" fill="#7DD3FC" />
      <circle cx="51" cy="31" r="1.7" fill="#FDE047" />
      {/* Left Sky-Island */}
      <path d="M8 38H24L21 50L13 53L8 44Z" fill="#5B58B8" stroke="#1E1B4B" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="7" y="34" width="18" height="6" rx="3" fill="#22A87A" stroke="#14532D" strokeWidth="1.7" />
      {/* Right Sky-Island */}
      <path d="M40 38H56L54 47L45 52L40 44Z" fill="#5B58B8" stroke="#1E1B4B" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="39" y="34" width="18" height="6" rx="3" fill="#22A87A" stroke="#14532D" strokeWidth="1.7" />
      {/* Glowing Starlight Bridge Planks */}
      <path d="M23 36C28 31 36 31 41 36" stroke={`url(#${ids.plank})`} strokeWidth="4" strokeLinecap="round" />
      <rect x="26.5" y="29" width="11" height="5.5" rx="2.5" fill="#FDE047" stroke="#92400E" strokeWidth="1.6" />
      {/* Starry Leap Trail */}
      <path d="M16 30C21 22 27 21 32 25" stroke="#93C5FD" strokeWidth="1.8" strokeDasharray="2.5 2.5" strokeLinecap="round" />
      <circle cx="32" cy="24" r="2.6" fill="#FFFBEB" />
    </svg>
  );
}
