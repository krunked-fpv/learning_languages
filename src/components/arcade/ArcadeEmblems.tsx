export function SkyCatcherEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-sky" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="emb-lantern" x1="32" y1="14" x2="32" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-sky)" stroke="#93C5FD" strokeWidth="2.5" />
      <path d="M12 46C18 40 26 42 32 45C39 48 48 44 54 41" stroke="#E0F2FE" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
      <rect x="25" y="11" width="14" height="5" rx="2.5" fill="#92400E" />
      <ellipse cx="32" cy="29" rx="13" ry="15" fill="url(#emb-lantern)" stroke="#78350F" strokeWidth="2.2" />
      <path d="M32 14V44M23 18C26 24 26 34 23 40M41 18C38 24 38 34 41 40" stroke="#FEF08A" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="26" y="44" width="12" height="4" rx="2" fill="#92400E" />
      <path d="M32 48V54" stroke="#FBBF24" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="15" cy="18" r="2.5" fill="#FEF08A" />
      <circle cx="50" cy="22" r="2" fill="#FFFFFF" />
    </svg>
  );
}

export function MeteorBlasterEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-space" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="100%" stopColor="#090D26" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-space)" stroke="#818CF8" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="1.8" fill="#FEF08A" />
      <circle cx="50" cy="15" r="2" fill="#38BDF8" />
      <circle cx="48" cy="48" r="1.5" fill="#F472B6" />
      {/* Laser Beams */}
      <path d="M26 42L29 24M38 42L35 24" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      {/* Glowing Word Asteroid */}
      <polygon points="32,11 42,16 40,26 28,27 22,18" fill="#A855F7" stroke="#E9D5FF" strokeWidth="2" />
      {/* Mini Starship */}
      <path d="M32 34L42 50L32 46L22 50L32 34Z" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="42" r="3" fill="#38BDF8" />
      <path d="M29 50L32 56L35 50" fill="#FB923C" />
    </svg>
  );
}

export function TowerStackEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-gelato" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDF2F8" />
          <stop offset="100%" stopColor="#FBCFE8" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-gelato)" stroke="#F472B6" strokeWidth="2.5" />
      {/* Waffle Cone */}
      <polygon points="22,38 42,38 32,56" fill="#F59E0B" stroke="#92400E" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M26 42L35 50M38 42L29 50" stroke="#B45309" strokeWidth="1.4" strokeLinecap="round" />
      {/* Scoops */}
      <circle cx="26" cy="34" r="8" fill="#34D399" stroke="#065F46" strokeWidth="2" />
      <circle cx="38" cy="34" r="8" fill="#60A5FA" stroke="#1E40AF" strokeWidth="2" />
      <circle cx="32" cy="23" r="9" fill="#FB7185" stroke="#9F1239" strokeWidth="2" />
      {/* Cherry + Sparkle */}
      <circle cx="32" cy="13" r="3.5" fill="#E11D48" stroke="#881337" strokeWidth="1.6" />
      <path d="M33 10C35 8 37 8 38 9" stroke="#15803D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ConstellationMemoryEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-const" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#3B0764" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-const)" stroke="#C084FC" strokeWidth="2.5" />
      <path d="M18 20L32 14L46 28L26 48L18 20Z" stroke="#38BDF8" strokeWidth="1.8" strokeDasharray="3 3" />
      <rect x="14" y="22" width="16" height="22" rx="4" transform="rotate(-10 22 33)" fill="#EEF2FF" stroke="#818CF8" strokeWidth="2" />
      <rect x="32" y="20" width="18" height="24" rx="4" transform="rotate(8 41 32)" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <path d="M41 25L43 30L48 31L44 35L45 40L41 37L37 40L38 35L34 31L39 30Z" fill="#F59E0B" />
      <circle cx="18" cy="16" r="2.5" fill="#FEF08A" />
      <circle cx="48" cy="14" r="2" fill="#38BDF8" />
    </svg>
  );
}

export function TrainSwitcherEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-train" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-train)" stroke="#10B981" strokeWidth="2.5" />
      {/* 3 Tracks */}
      <path d="M10 48H54M14 44L20 52M28 44L28 52M42 44L38 52" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      {/* Locomotive */}
      <rect x="16" y="24" width="28" height="16" rx="4" fill="#D97706" stroke="#78350F" strokeWidth="2.2" />
      <rect x="31" y="16" width="13" height="12" rx="3" fill="#0F766E" stroke="#134E4A" strokeWidth="2" />
      <rect x="20" y="16" width="6" height="8" rx="2" fill="#334155" />
      <circle cx="22" cy="11" r="3" fill="#FFFFFF" opacity="0.85" />
      <circle cx="28" cy="9" r="4" fill="#FFFFFF" opacity="0.7" />
      <circle cx="22" cy="41" r="4.5" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.8" />
      <circle cx="38" cy="41" r="4.5" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.8" />
    </svg>
  );
}

export function RhythmChefEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-rhythm" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-rhythm)" stroke="#EA580C" strokeWidth="2.5" />
      {/* Beat Ring */}
      <circle cx="32" cy="34" r="19" stroke="#F43F5E" strokeWidth="2" strokeDasharray="4 4" />
      {/* Copper Drum */}
      <ellipse cx="32" cy="30" rx="14" ry="7" fill="#FEF3C7" stroke="#9A3412" strokeWidth="2.2" />
      <path d="M18 30V43C18 47 24 50 32 50C40 50 46 47 46 43V30" fill="#EA580C" stroke="#9A3412" strokeWidth="2.2" />
      <ellipse cx="32" cy="30" rx="14" ry="7" fill="#FEF3C7" stroke="#9A3412" strokeWidth="2" />
      {/* Musical Note */}
      <path d="M29 22V12L40 10V20" stroke="#7C2D12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26.5" cy="22.5" r="3" fill="#7C2D12" />
      <circle cx="37.5" cy="20.5" r="3" fill="#7C2D12" />
    </svg>
  );
}

export function StarlightChoirEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="emb-choir" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#emb-choir)" stroke="#FBBF24" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="10" fill="#FDE047" fillOpacity="0.24" stroke="#FDE047" strokeWidth="2" />
      <circle cx="43" cy="38" r="11" fill="#38BDF8" fillOpacity="0.24" stroke="#38BDF8" strokeWidth="2" />
      <path d="M28 42V18L44 14V36" stroke="#FEF08A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="43" r="4.5" fill="#FDE047" />
      <circle cx="40" cy="38" r="4.5" fill="#F472B6" />
      <circle cx="15" cy="16" r="2.2" fill="#FFFFFF" />
      <circle cx="51" cy="20" r="2.2" fill="#FDE047" />
    </svg>
  );
}
