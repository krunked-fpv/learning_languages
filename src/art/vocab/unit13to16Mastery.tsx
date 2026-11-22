import type { IllustrationKey } from '../../types/contracts';
import { GroundShadow, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT13_TO_16_SCENES = {
  // Unit 13 (B2): Festivals, Folklore & Register
  festival_lanterns: (uid) => (
    <g>
      <defs>
        <radialGradient id={`fl-glow-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#1E1B4B" stroke={INK} strokeWidth="2.2" />
      {/* Festoon Wire */}
      <path d="M16 32Q60 44 104 32" fill="none" stroke="#FDE68A" strokeWidth="2.2" />
      {/* Left Crimson Lantern */}
      <g transform="translate(34, 54)">
        <circle cx="0" cy="0" r="16" fill={`url(#fl-glow-${uid})`} />
        <line x1="0" y1="-19" x2="0" y2="-11" stroke="#FDE047" strokeWidth="1.8" />
        <ellipse cx="0" cy="0" rx="10" ry="13" fill="#E11D48" stroke={INK} strokeWidth="1.8" />
        <ellipse cx="0" cy="0" rx="4" ry="13" fill="none" stroke="#FDA4AF" strokeWidth="1.2" opacity="0.65" />
        <rect x="-5" y="-14" width="10" height="3.5" rx="1" fill="#FACC15" stroke={INK} strokeWidth="1.2" />
        <rect x="-5" y="10.5" width="10" height="3.5" rx="1" fill="#FACC15" stroke={INK} strokeWidth="1.2" />
        <line x1="0" y1="14" x2="0" y2="22" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {/* Center Tall Golden Lantern */}
      <g transform="translate(60, 62)">
        <circle cx="0" cy="0" r="20" fill={`url(#fl-glow-${uid})`} />
        <line x1="0" y1="-25" x2="0" y2="-14" stroke="#FDE047" strokeWidth="1.8" />
        <rect x="-12" y="-15" width="24" height="30" rx="10" fill="#F59E0B" stroke={INK} strokeWidth="2" />
        <path d="M-11 -4H11M-11 4H11" stroke="#FEF08A" strokeWidth="1.4" opacity="0.7" />
        <rect x="-7" y="-17" width="14" height="4" rx="1.5" fill="#DC2626" stroke={INK} strokeWidth="1.3" />
        <rect x="-7" y="13" width="14" height="4" rx="1.5" fill="#DC2626" stroke={INK} strokeWidth="1.3" />
        <line x1="0" y1="17" x2="0" y2="27" stroke="#FDE047" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* Right Teal Lantern */}
      <g transform="translate(86, 54)">
        <circle cx="0" cy="0" r="16" fill={`url(#fl-glow-${uid})`} />
        <line x1="0" y1="-19" x2="0" y2="-11" stroke="#FDE047" strokeWidth="1.8" />
        <ellipse cx="0" cy="0" rx="10" ry="13" fill="#0EA5E9" stroke={INK} strokeWidth="1.8" />
        <rect x="-5" y="-14" width="10" height="3.5" rx="1" fill="#FACC15" stroke={INK} strokeWidth="1.2" />
        <rect x="-5" y="10.5" width="10" height="3.5" rx="1" fill="#FACC15" stroke={INK} strokeWidth="1.2" />
        <line x1="0" y1="14" x2="0" y2="22" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <Sparkle cx={26} cy={27} r={3.5} fill="#FEF08A" />
      <Sparkle cx={94} cy={27} r={3.5} fill="#FEF08A" />
    </g>
  ),

  folklore_mask: (uid) => (
    <g>
      <defs>
        <linearGradient id={`fm-face-${uid}`} x1="32" y1="28" x2="88" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Crown Plume Feathers */}
      <path d="M60 32C54 17 44 15 41 24C45 27 52 31 60 32Z" fill="#FB7185" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M60 32C66 17 76 15 79 24C75 27 68 31 60 32Z" fill="#FB7185" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M60 32C55 12 65 12 60 32Z" fill="#FACC15" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {/* Carved Wooden Folklore Mask */}
      <path
        d="M34 43C34 31 86 31 86 43C86 67 76 91 60 95C44 91 34 67 34 43Z"
        fill={`url(#fm-face-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Golden Ornamental Forehead & Cheek Swirls */}
      <path d="M44 43Q60 35 76 43" fill="none" stroke="#FDE047" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="60" cy="40" r="3.2" fill="#F43F5E" stroke={INK} strokeWidth="1.3" />
      {/* Expressive Eye Slits */}
      <path d="M41 56C44 50 51 50 54 56C51 60 44 60 41 56Z" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
      <path d="M66 56C69 50 76 50 79 56C76 60 69 60 66 56Z" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
      <circle cx="47.5" cy="56" r="2.2" fill={INK} />
      <circle cx="72.5" cy="56" r="2.2" fill={INK} />
      {/* Cheerful Painted Cheek Dots & Grin */}
      <circle cx="43" cy="68" r="4" fill="#F43F5E" opacity="0.85" />
      <circle cx="77" cy="68" r="4" fill="#F43F5E" opacity="0.85" />
      <path d="M49 77C54 83 66 83 71 77" fill="none" stroke="#FEF08A" strokeWidth="3.2" strokeLinecap="round" />
      <Sparkle cx={24} cy={40} r={4.5} fill="#FACC15" />
      <Sparkle cx={96} cy={40} r={4.5} fill="#FACC15" />
    </g>
  ),

  ceremonial_tea_set: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cts-pot-${uid}`} x1="28" y1="44" x2="72" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={38} ry={5} />
      {/* Bamboo Serving Tray */}
      <rect x="20" y="88" width="80" height="9" rx="4.5" fill="#D97706" stroke={INK} strokeWidth="2.1" />
      {/* Fragrant Tea Steam */}
      <path d="M51 36C48 30 54 26 51 20" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M85 60C82 54 88 50 85 44" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Overhead Bamboo Pot Handle */}
      <path d="M36 53C36 28 66 28 66 53" fill="none" stroke="#92400E" strokeWidth="4.5" strokeLinecap="round" />
      {/* Spout */}
      <path d="M32 68C22 65 20 56 23 50L31 54L36 62Z" fill="#10B981" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Jade Glazed Teapot */}
      <ellipse cx="51" cy="70" rx="21" ry="18" fill={`url(#cts-pot-${uid})`} stroke={INK} strokeWidth="2.3" />
      <path d="M40 53C43 47 59 47 62 53Z" fill="#34D399" stroke={INK} strokeWidth="2" />
      <circle cx="51" cy="46" r="3.2" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      {/* Tiny Gold Blossom Accent on Pot */}
      <circle cx="51" cy="71" r="4" fill="#FEF08A" />
      {/* Matching Ceramic Cup */}
      <path d="M74 71H96V80C96 86 91 88 85 88C79 88 74 86 74 80Z" fill="#A7F3D0" stroke={INK} strokeWidth="2.1" />
      <ellipse cx="85" cy="71" rx="11" ry="2.8" fill="#FDE68A" stroke={INK} strokeWidth="1.5" />
      <Sparkle cx={26} cy={31} r={4.5} fill="#FACC15" />
    </g>
  ),

  woven_tapestry: (uid) => (
    <g>
      <defs>
        <linearGradient id={`wt-cloth-${uid}`} x1="32" y1="28" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={102} rx={26} ry={4.5} />
      {/* Hanging Cord & Wooden Dowel */}
      <path d="M36 28L60 15L84 28" fill="none" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="60" cy="15" r="2.8" fill="#F59E0B" stroke={INK} strokeWidth="1.4" />
      <rect x="26" y="25" width="68" height="6" rx="3" fill="#B45309" stroke={INK} strokeWidth="2" />
      {/* Woven Tapestry Banner */}
      <rect x="32" y="31" width="56" height="58" rx="3" fill={`url(#wt-cloth-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Geometric Folk Patterns */}
      <path d="M32 42H88M32 78H88" stroke="#FDE047" strokeWidth="3.5" />
      <polygon points="60,46 77,60 60,74 43,60" fill="#0EA5E9" stroke="#FEF08A" strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="60,52 68,60 60,68 52,60" fill="#FACC15" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Fringed Tassels along Bottom */}
      {[36, 44, 52, 60, 68, 76, 84].map((x) => (
        <line key={x} x1={x} y1="89" x2={x} y2="98" stroke="#FDE68A" strokeWidth="2.6" strokeLinecap="round" />
      ))}
      <Sparkle cx={22} cy={46} r={4.5} fill="#FACC15" />
    </g>
  ),

  royal_bow_greeting: (uid) => (
    <g>
      <defs>
        <linearGradient id={`rbg-rib-${uid}`} x1="24" y1="30" x2="96" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Twin Polite Ribbon Tails */}
      <path d="M52 60L31 94L45 89L52 96L59 64Z" fill="#7C3AED" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M68 60L89 94L75 89L68 96L61 64Z" fill="#7C3AED" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Velvet Formal Bow Loops */}
      <path d="M56 54C35 38 22 47 24 62C26 76 42 74 56 60Z" fill={`url(#rbg-rib-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M64 54C85 38 98 47 96 62C94 76 78 74 64 60Z" fill={`url(#rbg-rib-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      {/* Polite Golden Crown Crest Center */}
      <circle cx="60" cy="57" r="11" fill="#FBBF24" stroke={INK} strokeWidth="2.2" />
      <path d="M53 59L54 51L58 55L60 49L62 55L66 51L67 59Z" fill="#FFFBEB" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Top Floating Golden Crown */}
      <path d="M44 33L41 21L52 27L60 17L68 27L79 21L76 33Z" fill="#FACC15" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <Sparkle cx={27} cy={27} r={5} fill="#FDE047" />
      <Sparkle cx={93} cy={27} r={5} fill="#FDE047" />
    </g>
  ),

  // Unit 14 (B2): Perspectives & Persuasion
  balance_scales: (uid) => (
    <g>
      <defs>
        <linearGradient id={`bs-gold-${uid}`} x1="30" y1="22" x2="90" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      {/* Pedestal & Pillar */}
      <rect x="38" y="88" width="44" height="9" rx="4" fill="#92400E" stroke={INK} strokeWidth="2.1" />
      <rect x="57" y="28" width="6" height="60" rx="3" fill={`url(#bs-gold-${uid})`} stroke={INK} strokeWidth="2" />
      <circle cx="60" cy="27" r="5" fill="#FACC15" stroke={INK} strokeWidth="1.9" />
      {/* Crossbeam */}
      <path d="M27 37Q60 31 93 37" fill="none" stroke={`url(#bs-gold-${uid})`} strokeWidth="4.8" strokeLinecap="round" />
      <path d="M27 37Q60 31 93 37" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      {/* Left Scale Pan */}
      <path d="M29 38L19 67M29 38L39 67" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 67H41C40 75 34 78 29 78C24 78 18 75 17 67Z" fill="#FBBF24" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="29" cy="63" r="5.5" fill="#38BDF8" stroke={INK} strokeWidth="1.5" />
      {/* Right Scale Pan */}
      <path d="M91 38L81 67M91 38L101 67" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M79 67H103C102 75 96 78 91 78C86 78 80 75 79 67Z" fill="#FBBF24" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="91" cy="63" r="5.5" fill="#FB7185" stroke={INK} strokeWidth="1.5" />
      <Sparkle cx={60} cy={17} r={5} fill="#FDE047" />
    </g>
  ),

  debate_podium: (uid) => (
    <g>
      <defs>
        <linearGradient id={`dp-wood-${uid}`} x1="34" y1="46" x2="86" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      {/* Two Friendly Perspective Speech Bubbles Above */}
      <rect x="20" y="21" width="32" height="20" rx="8" fill="#38BDF8" stroke={INK} strokeWidth="2" />
      <path d="M36 41L41 47L43 41Z" fill="#38BDF8" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M27 29H45M27 34H40" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="68" y="21" width="32" height="20" rx="8" fill="#A78BFA" stroke={INK} strokeWidth="2" />
      <path d="M77 41L79 47L84 41Z" fill="#A78BFA" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M75 29H93M75 34H88" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      {/* Twin Podium Microphones */}
      <path d="M49 56L52 46M71 56L68 46" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="52" cy="45" r="2.6" fill="#0F172A" />
      <circle cx="68" cy="45" r="2.6" fill="#0F172A" />
      {/* Lectern / Podium */}
      <path d="M39 58H81L75 92H45Z" fill={`url(#dp-wood-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="33" y="53" width="54" height="8" rx="3" fill="#D97706" stroke={INK} strokeWidth="2.1" />
      <rect x="36" y="90" width="48" height="7" rx="3" fill="#92400E" stroke={INK} strokeWidth="2" />
      {/* Star Seal on Lectern */}
      <Sparkle cx={60} cy={74} r={7} fill="#FACC15" />
    </g>
  ),

  lightbulb_idea: (uid) => (
    <g>
      <defs>
        <radialGradient id={`li-bulb-${uid}`} cx="44%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={22} ry={4.5} />
      {/* Warm Idea Rays */}
      {[
        [60, 14, 60, 21],
        [31, 25, 36, 30],
        [89, 25, 84, 30],
        [21, 51, 28, 51],
        [99, 51, 92, 51],
      ].map(([x1, y1, x2, y2], idx) => (
        <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
      ))}
      {/* Glowing Glass Bulb */}
      <path
        d="M60 27C44 27 35 38 35 51C35 61 42 66 46 74H74C78 66 85 61 85 51C85 38 76 27 60 27Z"
        fill={`url(#li-bulb-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Filament Spark */}
      <path d="M53 68V54L57 50L60 55L63 50L67 54V68" fill="none" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Glossy Highlight */}
      <path d="M43 44C44 37 49 33 55 33" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.88" />
      {/* Screw Base */}
      <rect x="48" y="74" width="24" height="6" rx="2.5" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      <rect x="49" y="80" width="22" height="6" rx="2.5" fill="#94A3B8" stroke={INK} strokeWidth="2" />
      <path d="M53 86H67L64 92H56Z" fill="#475569" stroke={INK} strokeWidth="2" />
      <Sparkle cx={27} cy={72} r={4.5} fill="#38BDF8" />
      <Sparkle cx={92} cy={70} r={5} fill="#FDE047" />
    </g>
  ),

  bridge_connection: (uid) => (
    <g>
      <defs>
        <linearGradient id={`brc-sky-${uid}`} x1="60" y1="18" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#brc-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Shimmering Turquoise River */}
      <path d="M16 74H104V100H16Z" fill="#0EA5E9" />
      <path d="M36 86Q60 82 84 86M44 93Q60 90 76 93" stroke="#BAE6FD" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Left & Right Green Shores */}
      <path d="M16 66L34 68L29 100H16Z" fill="#22C55E" stroke={INK} strokeWidth="1.9" />
      <path d="M104 66L86 68L91 100H104Z" fill="#22C55E" stroke={INK} strokeWidth="1.9" />
      {/* Coral-Red Golden Gate / Arch Bridge */}
      <path d="M24 66Q60 32 96 66" fill="none" stroke="#E11D48" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M24 66Q60 32 96 66" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      {/* Deck & Vertical Cables */}
      <rect x="20" y="64" width="80" height="7" rx="3" fill="#F59E0B" stroke={INK} strokeWidth="2" />
      {[36, 48, 60, 72, 84].map((x) => (
        <line key={x} x1={x} y1="50" x2={x} y2="64" stroke="#E11D48" strokeWidth="2.2" />
      ))}
      <Sparkle cx={60} cy={30} r={5.5} fill="#FDE047" />
    </g>
  ),

  peace_olive_dove: (uid) => (
    <g>
      <defs>
        <radialGradient id={`pod-halo-${uid}`} cx="50%" cy="48%" r="50%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill={`url(#pod-halo-${uid})`} />
      <GroundShadow cx={60} cy={100} rx={28} ry={4.5} />
      {/* Back Wing */}
      <path d="M56 54C49 30 33 20 22 25C28 40 39 50 51 58Z" fill="#E2E8F0" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Dove Body & Tail */}
      <path
        d="M34 74L21 79L29 66C36 60 46 57 56 57C64 57 70 48 75 43C80 39 87 42 86 48C85 52 80 54 78 58C76 68 65 78 50 78C43 78 38 76 34 74Z"
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      {/* Front Sweeping Wing */}
      <path d="M57 59C55 37 44 24 31 24C35 38 43 52 54 62Z" fill="#F8FAFC" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Eye & Golden Beak */}
      <circle cx="80" cy="46.5" r="1.7" fill={INK} />
      <polygon points="85,46 93,48 85,51" fill="#F59E0B" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Emerald Olive Branch */}
      <path d="M88 49C94 52 98 58 99 65" fill="none" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="95" cy="52" rx="4" ry="2.2" transform="rotate(-25 95 52)" fill="#22C55E" stroke={INK} strokeWidth="1.2" />
      <ellipse cx="98" cy="59" rx="4" ry="2.2" transform="rotate(15 98 59)" fill="#4ADE80" stroke={INK} strokeWidth="1.2" />
      <Sparkle cx={28} cy={38} r={4.5} fill="#FACC15" />
    </g>
  ),

  // Unit 15 (C1–C2): Idiomatic Wit & Proverbs
  idiom_scroll: (uid) => (
    <g>
      <defs>
        <linearGradient id={`is-parch-${uid}`} x1="26" y1="26" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Unrolled Parchment Body */}
      <rect x="29" y="27" width="62" height="64" rx="5" fill={`url(#is-parch-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Top & Bottom Scroll Rollers */}
      <rect x="22" y="22" width="76" height="12" rx="6" fill="#F59E0B" stroke={INK} strokeWidth="2.2" />
      <rect x="22" y="84" width="76" height="12" rx="6" fill="#F59E0B" stroke={INK} strokeWidth="2.2" />
      {/* Wavy Poetic Calligraphy Strokes */}
      <path d="M40 44H74M40 53H78M40 62H68" stroke="#92400E" strokeWidth="2.8" strokeLinecap="round" />
      {/* Red Wax Seal */}
      <circle cx="72" cy="73" r="8" fill="#E11D48" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={72} cy={73} r={3.5} fill="#FEF08A" />
      <Sparkle cx={26} cy={52} r={4.5} fill="#38BDF8" />
      <Sparkle cx={94} cy={46} r={5} fill="#FACC15" />
    </g>
  ),

  golden_key_proverb: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gkp-gold-${uid}`} x1="24" y1="24" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      <g transform="rotate(-35 60 58)">
        {/* Ornate Clover/Heart Key Bow */}
        <circle cx="34" cy="58" r="16" fill={`url(#gkp-gold-${uid})`} stroke={INK} strokeWidth="2.4" />
        <circle cx="34" cy="58" r="7.5" fill="#FFFBEB" stroke={INK} strokeWidth="2" />
        <circle cx="34" cy="58" r="3" fill="#0EA5E9" />
        {/* Shaft */}
        <rect x="48" y="53" width="46" height="10" rx="4" fill={`url(#gkp-gold-${uid})`} stroke={INK} strokeWidth="2.3" />
        {/* Key Teeth */}
        <path d="M74 63V76H82V69H87V76H93V63Z" fill="#F59E0B" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
      <Sparkle cx={33} cy={31} r={5.5} fill="#38BDF8" />
      <Sparkle cx={88} cy={34} r={6.5} fill="#FACC15" />
      <Sparkle cx={82} cy={83} r={4.5} fill="#FB7185" />
    </g>
  ),

  theater_comedy_masks: (uid) => (
    <g>
      <defs>
        <linearGradient id={`tcm-happy-${uid}`} x1="22" y1="26" x2="64" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={`tcm-drama-${uid}`} x1="56" y1="36" x2="98" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Back Pensive Violet Mask */}
      <g transform="rotate(10 76 62)">
        <path d="M56 36C56 31 96 31 96 36C96 63 87 86 76 89C65 86 56 63 56 36Z" fill={`url(#tcm-drama-${uid})`} stroke={INK} strokeWidth="2.3" />
        <path d="M64 52Q68 48 72 52M80 52Q84 48 88 52" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M68 72Q76 65 84 72" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* Front Joyful Golden Comedy Mask */}
      <g transform="rotate(-10 44 54)">
        <path d="M24 28C24 23 64 23 64 28C64 55 55 78 44 81C33 78 24 55 24 28Z" fill={`url(#tcm-happy-${uid})`} stroke={INK} strokeWidth="2.4" />
        <path d="M32 45Q36 40 40 45M48 45Q52 40 56 45" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M34 57C38 68 50 68 54 57Z" fill="#E11D48" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      </g>
      <Sparkle cx={24} cy={83} r={4.5} fill="#38BDF8" />
      <Sparkle cx={94} cy={27} r={5} fill="#FDE047" />
    </g>
  ),

  clever_fox_lantern: (uid) => (
    <g>
      <defs>
        <radialGradient id={`cfl-glow-${uid}`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="42" fill={`url(#cfl-glow-${uid})`} />
      <GroundShadow cx={60} cy={101} rx={26} ry={4.5} />
      {/* Hanging Handle Cord */}
      <line x1="60" y1="14" x2="60" y2="27" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="60" cy="14" r="3" fill="#FACC15" stroke={INK} strokeWidth="1.5" />
      {/* Fox Lantern Ears */}
      <polygon points="36,42 30,20 49,33" fill="#EA580C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="84,42 90,20 71,33" fill="#EA580C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Glowing Amber-Coral Lantern Body */}
      <rect x="31" y="31" width="58" height="52" rx="22" fill="#FB923C" stroke={INK} strokeWidth="2.4" />
      {/* Cream Fox Cheek Glow */}
      <path d="M33 59C43 55 51 61 60 72C69 61 77 55 87 59C83 75 73 83 60 83C47 83 37 75 33 59Z" fill="#FEF3C7" />
      {/* Playful Clever Fox Eyes & Nose */}
      <path d="M43 51Q48 46 53 51M67 51Q72 46 77 51" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="56,63 64,63 60,68" fill={INK} />
      {/* Golden Tassel */}
      <rect x="52" y="83" width="16" height="5" rx="2" fill="#FACC15" stroke={INK} strokeWidth="1.7" />
      <path d="M56 88L54 98M60 88V99M64 88L66 98" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" />
      <Sparkle cx={23} cy={38} r={4.5} fill="#FACC15" />
      <Sparkle cx={96} cy={40} r={4.5} fill="#FACC15" />
    </g>
  ),

  lightning_wit: (uid) => (
    <g>
      <defs>
        <linearGradient id={`lw-bolt-${uid}`} x1="40" y1="22" x2="78" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={4.5} />
      {/* Electric Indigo Aura Ring */}
      <circle cx="60" cy="56" r="34" fill="#6366F1" opacity="0.16" />
      <circle cx="60" cy="56" r="30" fill="none" stroke="#38BDF8" strokeWidth="2.4" strokeDasharray="8 6" />
      {/* Bold Golden Lightning Bolt */}
      <polygon
        points="66,18 37,61 57,61 48,96 84,50 63,50"
        fill={`url(#lw-bolt-${uid})`}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M62 28L47 55" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      <Sparkle cx={27} cy={35} r={5.5} fill="#38BDF8" />
      <Sparkle cx={92} cy={76} r={5.5} fill="#FACC15" />
    </g>
  ),

  // Unit 16 (C1–C2): Grand Polyglot Symposium
  laureate_wreath: (uid) => (
    <g>
      <defs>
        <linearGradient id={`law-gold-${uid}`} x1="24" y1="24" x2="96" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={30} ry={5} />
      {/* Left Laurel Branch Leaves */}
      {[
        [33, 69, -45],
        [27, 56, -20],
        [29, 42, 10],
        [37, 30, 35],
        [48, 22, 60],
      ].map(([cx, cy, rot], i) => (
        <ellipse
          key={`l-${i}`}
          cx={cx}
          cy={cy}
          rx="10"
          ry="5.5"
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill={`url(#law-gold-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
        />
      ))}
      {/* Right Laurel Branch Leaves */}
      {[
        [87, 69, 45],
        [93, 56, 20],
        [91, 42, -10],
        [83, 30, -35],
        [72, 22, -60],
      ].map(([cx, cy, rot], i) => (
        <ellipse
          key={`r-${i}`}
          cx={cx}
          cy={cy}
          rx="10"
          ry="5.5"
          transform={`rotate(${rot} ${cx} ${cy})`}
          fill={`url(#law-gold-${uid})`}
          stroke={INK}
          strokeWidth="1.9"
        />
      ))}
      {/* Royal Crimson Ribbon Bow at Base */}
      <path d="M47 80L38 96L51 91L60 83Z" fill="#E11D48" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M73 80L82 96L69 91L60 83Z" fill="#E11D48" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="60" cy="81" r="6.5" fill="#F43F5E" stroke={INK} strokeWidth="2" />
      {/* Radiant Diamond Crest Inside Wreath */}
      <polygon points="60,34 74,52 60,69 46,52" fill="#38BDF8" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="60,34 74,52 60,52" fill="#BAE6FD" />
      <Sparkle cx={60} cy={20} r={5.5} fill="#FDE047" />
    </g>
  ),

  grand_symposium_globe: (uid) => (
    <g>
      <defs>
        <radialGradient id={`gsg-sea-${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Walnut Pedestal */}
      <rect x="41" y="88" width="38" height="9" rx="4" fill="#92400E" stroke={INK} strokeWidth="2.1" />
      <rect x="57" y="79" width="6" height="10" fill="#B45309" stroke={INK} strokeWidth="1.8" />
      {/* Brass Meridian Ring */}
      <path d="M60 20A31 31 0 1 1 60 82" fill="none" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="60" cy="19" r="3.5" fill="#FACC15" stroke={INK} strokeWidth="1.6" />
      {/* Globe Sphere */}
      <circle cx="58" cy="51" r="26" fill={`url(#gsg-sea-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Lush Emerald Continents */}
      <path d="M44 37C51 35 56 41 53 48C49 54 41 53 39 45Z" fill="#4ADE80" stroke={INK} strokeWidth="1.4" />
      <path d="M62 41C71 39 78 46 74 56C70 64 59 61 60 51Z" fill="#22C55E" stroke={INK} strokeWidth="1.4" />
      <path d="M46 58C52 57 57 64 52 70C46 71 42 63 46 58Z" fill="#34D399" stroke={INK} strokeWidth="1.3" />
      {/* Gloss Arc */}
      <path d="M40 37C44 31 50 28 56 28" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <Sparkle cx={24} cy={31} r={5} fill="#FACC15" />
      <Sparkle cx={94} cy={70} r={5} fill="#FDE047" />
    </g>
  ),

  quill_inkwell: (uid) => (
    <g>
      <defs>
        <linearGradient id={`qi-plume-${uid}`} x1="48" y1="16" x2="94" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <GroundShadow cx={58} cy={101} rx={30} ry={5} />
      {/* Faceted Glass Inkwell */}
      <path d="M31 66H61L66 93H26Z" fill="#312E81" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="37" y="57" width="18" height="9" rx="2.5" fill="#F59E0B" stroke={INK} strokeWidth="2" />
      <path d="M35 74L33 88" stroke="#93C5FD" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      {/* Sweeping Sapphire Feather Quill */}
      <path
        d="M46 62C53 38 72 21 94 18C90 36 78 52 54 63Z"
        fill={`url(#qi-plume-${uid})`}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Golden Quill Spine & Nib */}
      <path d="M46 63C58 46 73 32 91 21" fill="none" stroke="#FDE047" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M68 41L74 34M76 33L82 28" stroke="#E0E7FF" strokeWidth="1.6" strokeLinecap="round" />
      <Sparkle cx={30} cy={35} r={5} fill="#FACC15" />
      <Sparkle cx={89} cy={72} r={5} fill="#38BDF8" />
    </g>
  ),

  symphony_conductor: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sc-arc-${uid}`} x1="22" y1="24" x2="96" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={32} ry={5} />
      {/* Sweeping Harmonic Wave Ribbon */}
      <path d="M22 76C32 48 54 44 68 58C80 70 92 54 96 34" fill="none" stroke={`url(#sc-arc-${uid})`} strokeWidth="4.5" strokeLinecap="round" opacity="0.72" />
      {/* Conductor's Baton */}
      <g transform="rotate(-36 52 62)">
        <rect x="24" y="59" width="20" height="8" rx="4" fill="#92400E" stroke={INK} strokeWidth="2" />
        <path d="M44 61L92 62L44 65Z" fill="#FFFBEB" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
      </g>
      {/* Floating Musical Notes */}
      <g transform="translate(30, 26)">
        <path d="M0 16V2L12 0V14" stroke="#7C3AED" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="-2.5" cy="17" r="3.4" fill="#7C3AED" stroke={INK} strokeWidth="1.3" />
        <circle cx="9.5" cy="15" r="3.4" fill="#7C3AED" stroke={INK} strokeWidth="1.3" />
      </g>
      <g transform="translate(80, 62)">
        <path d="M0 15V0L8 3" stroke="#E11D48" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="-2.5" cy="16" r="3.5" fill="#E11D48" stroke={INK} strokeWidth="1.3" />
      </g>
      <Sparkle cx={84} cy={25} r={5.5} fill="#FACC15" />
    </g>
  ),

  crystal_owl_crest: (uid) => (
    <g>
      <defs>
        <linearGradient id={`coc-body-${uid}`} x1="34" y1="24" x2="86" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Ear Tufts */}
      <polygon points="38,38 31,20 49,30" fill="#60A5FA" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <polygon points="82,38 89,20 71,30" fill="#60A5FA" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Faceted Crystal Owl Body */}
      <polygon
        points="60,26 84,38 88,68 74,94 46,94 32,68 36,38"
        fill={`url(#coc-body-${uid})`}
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Crystalline Belly Facet */}
      <polygon points="60,57 74,72 60,92 46,72" fill="#BAE6FD" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      {/* Golden Brow Crest & Luminous Eyes */}
      <circle cx="48" cy="46" r="8.5" fill="#FEF08A" stroke={INK} strokeWidth="2" />
      <circle cx="72" cy="46" r="8.5" fill="#FEF08A" stroke={INK} strokeWidth="2" />
      <circle cx="48" cy="46" r="4.2" fill="#0F172A" />
      <circle cx="72" cy="46" r="4.2" fill="#0F172A" />
      <circle cx="49.5" cy="44.5" r="1.5" fill="#FFFFFF" />
      <circle cx="73.5" cy="44.5" r="1.5" fill="#FFFFFF" />
      {/* Golden Beak */}
      <polygon points="56,50 64,50 60,58" fill="#F59E0B" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <Sparkle cx={24} cy={46} r={4.5} fill="#FDE047" />
      <Sparkle cx={96} cy={46} r={4.5} fill="#FDE047" />
    </g>
  ),
} satisfies Partial<Record<IllustrationKey, SceneRenderer>>;
