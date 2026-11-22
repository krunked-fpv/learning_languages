import type { IllustrationKey } from '../../types/contracts';
import { GroundShadow, HeartMotif, INK, Sparkle, type SceneRenderer } from './shared';

export const UNIT9_TO_12_SCENES = {
  // Unit 9 (B1): Past Adventures & Storytelling
  hourglass_memory: (uid) => (
    <g>
      <defs>
        <linearGradient id={`hg-wood-${uid}`} x1="32" y1="20" x2="88" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id={`hg-sand-${uid}`} x1="60" y1="34" x2="60" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={102} rx={28} ry={5} />
      {/* Side Brass Pillars */}
      <rect x="35" y="25" width="5" height="69" rx="2.5" fill="#FBBF24" stroke={INK} strokeWidth="1.8" />
      <rect x="80" y="25" width="5" height="69" rx="2.5" fill="#FBBF24" stroke={INK} strokeWidth="1.8" />
      {/* Glass Bulbs */}
      <path
        d="M42 26H78C78 44 65 55 62 59C65 63 78 74 78 92H42C42 74 55 63 58 59C55 55 42 44 42 26Z"
        fill="#E0F2FE"
        fillOpacity="0.72"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Top & Bottom Golden Sand */}
      <path d="M47 40C51 48 58 53 60 56C62 53 69 48 73 40Z" fill={`url(#hg-sand-${uid})`} />
      <path d="M44 91C45 80 54 75 60 75C66 75 75 80 76 91Z" fill={`url(#hg-sand-${uid})`} />
      <line x1="60" y1="58" x2="60" y2="76" stroke="#F59E0B" strokeWidth="2.6" strokeLinecap="round" />
      {/* Top & Bottom Wooden Caps */}
      <rect x="30" y="19" width="60" height="8" rx="4" fill={`url(#hg-wood-${uid})`} stroke={INK} strokeWidth="2.2" />
      <rect x="30" y="91" width="60" height="8" rx="4" fill={`url(#hg-wood-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Glass Glint */}
      <path d="M47 32C47 39 50 44 53 48" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <Sparkle cx={24} cy={40} r={4.5} fill="#FDE047" />
      <Sparkle cx={94} cy={72} r={5} fill="#38BDF8" />
    </g>
  ),

  travel_journal: (uid) => (
    <g>
      <defs>
        <linearGradient id={`tj-cov-${uid}`} x1="26" y1="22" x2="88" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={32} ry={5.5} />
      {/* Pages Thickness */}
      <rect x="32" y="25" width="58" height="72" rx="8" fill="#FEF3C7" stroke={INK} strokeWidth="2.2" />
      {/* Leather Hardcover */}
      <rect x="28" y="21" width="58" height="72" rx="8" fill={`url(#tj-cov-${uid})`} stroke={INK} strokeWidth="2.4" />
      {/* Spine Ridge */}
      <rect x="28" y="21" width="11" height="72" rx="4" fill="#9A3412" stroke={INK} strokeWidth="2.1" />
      {/* Brass Clasp Strap */}
      <rect x="74" y="49" width="18" height="14" rx="4" fill="#FBBF24" stroke={INK} strokeWidth="2" />
      <circle cx="80" cy="56" r="2.2" fill={INK} />
      {/* Compass Rose Emblem on Cover */}
      <circle cx="60" cy="56" r="14" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2.4" />
      <path
        d="M60 44L63 53L72 56L63 59L60 68L57 59L48 56L57 53Z"
        fill="#EA580C"
        stroke={INK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Red Ribbon Bookmark */}
      <path d="M51 93V103L55.5 99L60 103V93Z" fill="#E11D48" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      {/* Tucked Pencil */}
      <g transform="rotate(18 88 32)">
        <rect x="82" y="16" width="7" height="32" rx="2" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
        <polygon points="82,16 89,16 85.5,9" fill="#FED7AA" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
      <Sparkle cx={24} cy={30} r={4.5} fill="#FDE047" />
    </g>
  ),

  campfire_story: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cf-sky-${uid}`} x1="60" y1="16" x2="60" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <radialGradient id={`cf-glow-${uid}`} cx="50%" cy="62%" r="48%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#cf-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      <circle cx="60" cy="64" r="36" fill={`url(#cf-glow-${uid})`} />
      {/* Night Stars */}
      <circle cx="30" cy="34" r="1.8" fill="#FEF08A" />
      <circle cx="88" cy="30" r="2" fill="#FEF08A" />
      <circle cx="74" cy="40" r="1.4" fill="#FFFFFF" />
      {/* Crossed Firewood Logs */}
      <rect x="33" y="76" width="54" height="9" rx="4.5" transform="rotate(-14 60 80)" fill="#92400E" stroke={INK} strokeWidth="2" />
      <rect x="33" y="76" width="54" height="9" rx="4.5" transform="rotate(14 60 80)" fill="#78350F" stroke={INK} strokeWidth="2" />
      {/* Outer & Inner Flames */}
      <path
        d="M60 32C70 46 80 56 76 72C73 80 47 80 44 72C40 57 50 47 54 42C55 47 57 48 60 32Z"
        fill="#F97316"
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M60 46C66 55 70 62 67 72C65 76 55 76 53 72C50 62 55 56 60 46Z"
        fill="#FDE047"
      />
      {/* Stone Ring */}
      {[34, 46, 60, 74, 86].map((cx, i) => (
        <ellipse key={cx} cx={cx} cy={i % 2 === 0 ? 87 : 90} rx="7.5" ry="5" fill="#94A3B8" stroke={INK} strokeWidth="1.8" />
      ))}
      <Sparkle cx={43} cy={36} r={4} fill="#FACC15" />
    </g>
  ),

  ancient_ruins: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ar-sky-${uid}`} x1="60" y1="18" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id={`ar-stone-${uid}`} x1="30" y1="30" x2="90" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#ar-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Ground Meadow */}
      <path d="M16 84Q60 76 104 84V100H16Z" fill="#4ADE80" stroke={INK} strokeWidth="1.9" />
      {/* Stone Pediment / Broken Architrave */}
      <path d="M27 36L60 22L93 36Z" fill={`url(#ar-stone-${uid})`} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <rect x="26" y="36" width="68" height="7" rx="2" fill="#FDE68A" stroke={INK} strokeWidth="2" />
      {/* Three Classical Columns */}
      {[34, 60, 86].map((cx, idx) => (
        <g key={cx}>
          <rect
            x={cx - 6}
            y={idx === 2 ? 50 : 43}
            width="12"
            height={idx === 2 ? 36 : 43}
            rx="2"
            fill="#FFFBEB"
            stroke={INK}
            strokeWidth="2"
          />
          <line x1={cx - 2} y1={idx === 2 ? 53 : 46} x2={cx - 2} y2="83" stroke="#D97706" strokeWidth="1.2" opacity="0.6" />
          <line x1={cx + 2} y1={idx === 2 ? 53 : 46} x2={cx + 2} y2="83" stroke="#D97706" strokeWidth="1.2" opacity="0.6" />
          <rect x={cx - 8} y="83" width="16" height="5" rx="1.5" fill="#FDE68A" stroke={INK} strokeWidth="1.7" />
        </g>
      ))}
      {/* Trailing Ivy Vine */}
      <path d="M28 44C36 50 32 60 40 66" fill="none" stroke="#16A34A" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="38" cy="54" r="3" fill="#22C55E" stroke={INK} strokeWidth="1.1" />
      <circle cx="33" cy="64" r="3" fill="#22C55E" stroke={INK} strokeWidth="1.1" />
      <Sparkle cx={89} cy={27} r={4.5} fill="#FDE047" />
    </g>
  ),

  vintage_postcard: (uid) => (
    <g>
      <defs>
        <linearGradient id={`vp-art-${uid}`} x1="26" y1="36" x2="58" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={97} rx={36} ry={5} />
      <g transform="rotate(-6 60 60)">
        {/* Postcard Card Base */}
        <rect x="18" y="30" width="84" height="58" rx="7" fill="#FFFBEB" stroke={INK} strokeWidth="2.3" />
        {/* Airmail Striped Border Accent */}
        <rect x="22" y="34" width="76" height="50" rx="4" fill="none" stroke="#F43F5E" strokeWidth="1.8" strokeDasharray="6 4" />
        {/* Mini Landscape Picture on Left */}
        <rect x="26" y="40" width="32" height="38" rx="4" fill={`url(#vp-art-${uid})`} stroke={INK} strokeWidth="1.8" />
        <circle cx="48" cy="49" r="5" fill="#FACC15" />
        <path d="M26 70L38 56L48 66L58 58V78H26Z" fill="#0D9488" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        {/* Postage Stamp & Postmark Waves on Right */}
        <rect x="76" y="39" width="16" height="18" rx="2" fill="#BAE6FD" stroke={INK} strokeWidth="1.6" />
        <circle cx="84" cy="48" r="4" fill="#F43F5E" />
        <path d="M64 46Q70 42 75 46M64 52Q70 48 75 52" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
        {/* Address Lines */}
        <path d="M64 65H92M64 72H88M64 79H82" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <Sparkle cx={94} cy={27} r={5} fill="#FACC15" />
    </g>
  ),

  // Unit 10 (B1): Future Dreams & Plans
  architect_blueprint: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ab-paper-${uid}`} x1="24" y1="24" x2="96" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={36} ry={5} />
      {/* Unrolled Blueprint Sheet */}
      <rect x="22" y="26" width="76" height="62" rx="6" fill={`url(#ab-paper-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Rolled Left Edge Cylinder */}
      <rect x="18" y="23" width="12" height="68" rx="6" fill="#60A5FA" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="24" cy="26" rx="4" ry="2.2" fill="#1E40AF" />
      {/* Grid & White Architectural Sketch */}
      <path d="M36 34V80M52 34V80M68 34V80M84 34V80M34 44H90M34 60H90M34 76H90" stroke="#93C5FD" strokeWidth="0.9" opacity="0.45" />
      <path d="M40 73V48L62 35L84 48V73Z" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="55" y="57" width="14" height="16" fill="none" stroke="#FEF08A" strokeWidth="2" />
      {/* Wooden Triangle Ruler */}
      <path d="M62 88L96 58V88Z" fill="#FBBF24" fillOpacity="0.9" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M74 83L90 69V83Z" fill="#1E3A8A" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <Sparkle cx={94} cy={27} r={4.5} fill="#FDE047" />
    </g>
  ),

  horizon_telescope: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ht-tube-${uid}`} x1="32" y1="30" x2="88" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="65%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <GroundShadow cx={58} cy={101} rx={30} ry={5} />
      {/* Tripod Legs */}
      <path d="M56 58L35 97M56 58L56 99M56 58L77 97" stroke="#78350F" strokeWidth="4.8" strokeLinecap="round" />
      <path d="M56 58L35 97M56 58L56 99M56 58L77 97" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      <circle cx="56" cy="58" r="5.5" fill="#475569" stroke={INK} strokeWidth="2" />
      {/* Angled Brass Telescope Barrel */}
      <g transform="rotate(-24 58 48)">
        <rect x="26" y="43" width="22" height="10" rx="3" fill="#334155" stroke={INK} strokeWidth="2" />
        <rect x="44" y="40" width="44" height="16" rx="4" fill={`url(#ht-tube-${uid})`} stroke={INK} strokeWidth="2.2" />
        <rect x="82" y="38" width="10" height="20" rx="3" fill="#0EA5E9" stroke={INK} strokeWidth="2.1" />
        <line x1="56" y1="40" x2="56" y2="56" stroke="#92400E" strokeWidth="2.5" />
      </g>
      {/* Horizon Guiding Star */}
      <Sparkle cx={94} cy={26} r={7.5} fill="#FACC15" />
      <Sparkle cx={24} cy={32} r={4.5} fill="#38BDF8" />
    </g>
  ),

  graduation_cap: (uid) => (
    <g>
      <defs>
        <linearGradient id={`gc-cap-${uid}`} x1="22" y1="24" x2="98" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={34} ry={5.5} />
      {/* Rolled Diploma Underneath */}
      <rect x="28" y="75" width="64" height="17" rx="8.5" fill="#FFFBEB" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="32" cy="83.5" rx="4" ry="7.5" fill="#FDE68A" stroke={INK} strokeWidth="1.6" />
      <rect x="54" y="74" width="12" height="19" rx="2" fill="#E11D48" stroke={INK} strokeWidth="1.8" />
      {/* Cap Skull Bowl */}
      <path d="M36 47V64C36 72 84 72 84 64V47Z" fill="#312E81" stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      {/* Mortarboard Diamond Top */}
      <polygon points="60,22 100,40 60,57 20,40" fill={`url(#gc-cap-${uid})`} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      {/* Golden Center Button & Tassel */}
      <circle cx="60" cy="39" r="3.5" fill="#FACC15" stroke={INK} strokeWidth="1.5" />
      <path d="M60 39L88 45V66" fill="none" stroke="#F59E0B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 65H92L94 76H82Z" fill="#FACC15" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <Sparkle cx={26} cy={26} r={5} fill="#FDE047" />
    </g>
  ),

  sprouting_seedling: (uid) => (
    <g>
      <defs>
        <linearGradient id={`ss-pot-${uid}`} x1="36" y1="62" x2="84" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={26} ry={5} />
      {/* Terracotta Flower Pot */}
      <path d="M38 66H82L76 96H44Z" fill={`url(#ss-pot-${uid})`} stroke={INK} strokeWidth="2.3" strokeLinejoin="round" />
      <rect x="34" y="59" width="52" height="10" rx="4" fill="#F97316" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="60" cy="59" rx="18" ry="3" fill="#78350F" />
      {/* Vibrant Green Stem & Twin Leaves */}
      <path d="M60 59C60 44 60 36 60 30" stroke="#16A34A" strokeWidth="4.2" strokeLinecap="round" />
      <path
        d="M60 44C45 43 34 32 39 24C48 22 57 31 60 44Z"
        fill="#4ADE80"
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M60 39C75 37 86 25 81 18C72 17 63 26 60 39Z"
        fill="#22C55E"
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Sparkling Water Droplet */}
      <path d="M87 40C87 40 93 47 93 51C93 54 90 57 87 57C84 57 81 54 81 51C81 47 87 40 87 40Z" fill="#38BDF8" stroke={INK} strokeWidth="1.7" />
      <Sparkle cx={29} cy={27} r={5} fill="#FACC15" />
    </g>
  ),

  calendar_milestone: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cal-top-${uid}`} x1="26" y1="24" x2="94" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={34} ry={5} />
      {/* Calendar Body */}
      <rect x="24" y="28" width="72" height="66" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
      {/* Crimson Header */}
      <path d="M24 38C24 32 28 28 34 28H86C92 28 96 32 96 38V46H24Z" fill={`url(#cal-top-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Binding Rings */}
      {[38, 60, 82].map((cx) => (
        <rect key={cx} x={cx - 3} y="20" width="6" height="14" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="1.9" />
      ))}
      {/* Subtle Grid Squares */}
      {[34, 52, 70].map((x) =>
        [54, 71].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="14" height="12" rx="3" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" />
        ))
      )}
      {/* Highlighted Milestone Star Date */}
      <rect x="52" y="54" width="14" height="12" rx="3" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
      <Sparkle cx={59} cy={60} r={5} fill="#F59E0B" />
      {/* Celebration Sparkles */}
      <Sparkle cx={92} cy={24} r={5} fill="#FACC15" />
      <Sparkle cx={24} cy={88} r={4} fill="#38BDF8" />
    </g>
  ),

  // Unit 11 (B1): Wellness, Feelings & Empathy
  warm_teacup: (uid) => (
    <g>
      <defs>
        <linearGradient id={`wt-cup-${uid}`} x1="30" y1="48" x2="84" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={32} ry={5} />
      {/* Swirling Warm Steam */}
      <path d="M46 42C42 35 50 30 46 23" stroke="#94A3B8" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M60 39C56 31 64 26 60 18" stroke="#64748B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M74 42C70 35 78 30 74 23" stroke="#94A3B8" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      {/* Saucer */}
      <ellipse cx="58" cy="91" rx="33" ry="7" fill="#F1F5F9" stroke={INK} strokeWidth="2.2" />
      {/* Mug Handle */}
      <path d="M80 56C93 56 95 76 80 78" fill="none" stroke="#0D9488" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M80 56C93 56 95 76 80 78" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      {/* Cup Body */}
      <path d="M32 50H84V71C84 85 72 90 58 90C44 90 32 85 32 71Z" fill={`url(#wt-cup-${uid})`} stroke={INK} strokeWidth="2.3" />
      {/* Warm Tea Surface */}
      <ellipse cx="58" cy="50" rx="26" ry="6.5" fill="#FDE68A" stroke={INK} strokeWidth="2" />
      <ellipse cx="58" cy="50" rx="20" ry="4" fill="#D97706" />
      {/* Comfort Heart Emblem */}
      <HeartMotif cx={58} cy={70} scale={0.78} fill="#FB7185" />
    </g>
  ),

  helping_hands: (uid) => (
    <g>
      <defs>
        <radialGradient id={`hh-glow-${uid}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="48" r="34" fill={`url(#hh-glow-${uid})`} />
      <GroundShadow cx={60} cy={99} rx={32} ry={5} />
      {/* Left Supporting Hand */}
      <path
        d="M20 75L34 55C38 49 45 52 43 59L38 69L54 67C60 67 60 75 54 77L42 81L26 93Z"
        fill="#FDBA74"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Right Supporting Hand */}
      <path
        d="M100 75L86 55C82 49 75 52 77 59L82 69L66 67C60 67 60 75 66 77L78 81L94 93Z"
        fill="#FED7AA"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Central Glowing Heart Held Above */}
      <HeartMotif cx={60} cy={43} scale={1.45} fill="#F43F5E" />
      <Sparkle cx={32} cy={32} r={5} fill="#FACC15" />
      <Sparkle cx={89} cy={34} r={5} fill="#38BDF8" />
    </g>
  ),

  calm_lotus: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cl-petal-${uid}`} x1="60" y1="26" x2="60" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Peaceful Water Ripples */}
      <ellipse cx="60" cy="87" rx="41" ry="10" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.6" />
      {/* Jade Lily Pad */}
      <path d="M22 83C22 75 40 71 60 71C80 71 98 75 98 83C98 90 80 94 60 94C40 94 22 90 22 83Z" fill="#22C55E" stroke={INK} strokeWidth="2.1" />
      {/* Outer Petals */}
      <path d="M60 78C42 78 24 68 24 50C38 51 50 61 60 78Z" fill="#F472B6" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M60 78C78 78 96 68 96 50C82 51 70 61 60 78Z" fill="#F472B6" stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Mid Petals */}
      <path d="M60 78C44 74 35 55 41 36C51 42 58 57 60 78Z" fill={`url(#cl-petal-${uid})`} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M60 78C76 74 85 55 79 36C69 42 62 57 60 78Z" fill={`url(#cl-petal-${uid})`} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
      {/* Center Crown Petal */}
      <path d="M60 25C71 39 72 62 60 79C48 62 49 39 60 25Z" fill="#FCE7F3" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="60" cy="60" r="4" fill="#FACC15" />
      <Sparkle cx={27} cy={31} r={4.5} fill="#FDE047" />
      <Sparkle cx={91} cy={32} r={4.5} fill="#38BDF8" />
    </g>
  ),

  bandaid_care: (uid) => (
    <g>
      <defs>
        <linearGradient id={`bc-strip-${uid}`} x1="25" y1="32" x2="95" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={99} rx={30} ry={5} />
      {/* Diagonal Criss-Cross Plaster */}
      <g transform="rotate(42 60 58)">
        <rect x="20" y="44" width="80" height="28" rx="14" fill="#FDE68A" stroke={INK} strokeWidth="2.2" />
      </g>
      <g transform="rotate(-42 60 58)">
        <rect x="18" y="43" width="84" height="30" rx="15" fill={`url(#bc-strip-${uid})`} stroke={INK} strokeWidth="2.3" />
        <rect x="44" y="45" width="32" height="26" rx="4" fill="#FFFBEB" stroke={INK} strokeWidth="1.8" />
        {/* Tiny Perforation Dots */}
        {[28, 34, 86, 92].map((x) => (
          <g key={x}>
            <circle cx={x} cy="52" r="1.5" fill="#9A3412" opacity="0.5" />
            <circle cx={x} cy="64" r="1.5" fill="#9A3412" opacity="0.5" />
          </g>
        ))}
      </g>
      <HeartMotif cx={60} cy={58} scale={0.9} fill="#FB7185" />
      <Sparkle cx={28} cy={27} r={5} fill="#38BDF8" />
      <Sparkle cx={93} cy={83} r={5} fill="#FACC15" />
    </g>
  ),

  feelings_weather: (uid) => (
    <g>
      <defs>
        <linearGradient id={`fw-sky-${uid}`} x1="20" y1="20" x2="100" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#FEF9C3" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#fw-sky-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Mini Rainbow Connecting Sun & Cloud */}
      <path d="M36 62A24 24 0 0 1 84 62" fill="none" stroke="#FB7185" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M40 62A20 20 0 0 1 80 62" fill="none" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M44 62A16 16 0 0 1 76 62" fill="none" stroke="#38BDF8" strokeWidth="4.5" strokeLinecap="round" />
      {/* Happy Sun Left */}
      <circle cx="38" cy="48" r="15" fill="#FACC15" stroke={INK} strokeWidth="2.1" />
      <circle cx="34" cy="46" r="1.6" fill={INK} />
      <circle cx="42" cy="46" r="1.6" fill={INK} />
      <path d="M34 51C36 53.5 40 53.5 42 51" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Gentle Rain Cloud Right */}
      <path
        d="M54 70C54 63 60 58 67 59C70 53 81 53 84 59C90 59 95 64 95 70C95 75 91 79 85 79H62C57 79 54 75 54 70Z"
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth="2.1"
      />
      {/* Gentle Raindrops */}
      <path d="M64 85L62 91M74 85L72 91M84 85L82 91" stroke="#0EA5E9" strokeWidth="2.8" strokeLinecap="round" />
      <Sparkle cx={82} cy={31} r={4.5} fill="#FDE047" />
    </g>
  ),

  // Unit 12 (B2): Science, Curiosity & Nature
  science_microscope: (uid) => (
    <g>
      <defs>
        <linearGradient id={`sm-arm-${uid}`} x1="34" y1="22" x2="86" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={32} ry={5} />
      {/* Heavy Base */}
      <rect x="29" y="86" width="62" height="11" rx="5" fill="#334155" stroke={INK} strokeWidth="2.2" />
      {/* Curved C-Arm */}
      <path d="M68 38C86 38 92 66 74 86H61C75 68 73 48 63 48Z" fill={`url(#sm-arm-${uid})`} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Stage & Glowing Glass Slide */}
      <rect x="33" y="69" width="36" height="6" rx="2" fill="#1E293B" stroke={INK} strokeWidth="1.8" />
      <rect x="38" y="65" width="24" height="4" rx="1" fill="#BAE6FD" stroke={INK} strokeWidth="1.2" />
      {/* Tilted Optical Barrel & Brass Lens */}
      <g transform="rotate(24 52 44)">
        <rect x="44" y="18" width="14" height="38" rx="3" fill="#E2E8F0" stroke={INK} strokeWidth="2.2" />
        <rect x="42" y="14" width="18" height="7" rx="2" fill="#F59E0B" stroke={INK} strokeWidth="1.9" />
        <rect x="46" y="54" width="10" height="8" rx="2" fill="#FACC15" stroke={INK} strokeWidth="1.8" />
      </g>
      <circle cx="74" cy="60" r="6" fill="#FBBF24" stroke={INK} strokeWidth="1.8" />
      <Sparkle cx={28} cy={36} r={5} fill="#38BDF8" />
      <Sparkle cx={91} cy={27} r={4.5} fill="#FDE047" />
    </g>
  ),

  crystal_beaker: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cbk-liq-${uid}`} x1="34" y1="54" x2="86" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <GroundShadow cx={60} cy={100} rx={30} ry={5} />
      {/* Bubbling Emitted Spheres */}
      <circle cx="56" cy="22" r="4" fill="#67E8F9" stroke={INK} strokeWidth="1.5" />
      <circle cx="67" cy="17" r="3" fill="#A7F3D0" stroke={INK} strokeWidth="1.4" />
      {/* Flask Glass Body */}
      <path
        d="M49 27H71V45L89 82C92 89 87 95 79 95H41C33 95 28 89 31 82L49 45Z"
        fill="#E0F2FE"
        fillOpacity="0.72"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Luminous Emerald-Cyan Liquid Inside */}
      <path d="M40 65H80L87 82C89 87 85 92 78 92H42C35 92 31 87 33 82Z" fill={`url(#cbk-liq-${uid})`} />
      {/* Flask Rim */}
      <rect x="45" y="23" width="30" height="6" rx="3" fill="#CBD5E1" stroke={INK} strokeWidth="2" />
      {/* Measurement Marks */}
      <path d="M53 48H61M51 56H59" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      {/* Bubbles inside liquid */}
      <circle cx="52" cy="79" r="3.5" fill="#FEF08A" opacity="0.9" />
      <circle cx="67" cy="83" r="4.5" fill="#FFFFFF" opacity="0.85" />
      <Sparkle cx={26} cy={42} r={5} fill="#FACC15" />
      <Sparkle cx={94} cy={46} r={5} fill="#34D399" />
    </g>
  ),

  magnifying_discovery: (uid) => (
    <g>
      <defs>
        <radialGradient id={`md-lens-${uid}`} cx="36%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="65%" stopColor="#BAE6FD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.65" />
        </radialGradient>
      </defs>
      <GroundShadow cx={60} cy={101} rx={28} ry={5} />
      {/* Discovered Golden Crystal Gem / Leaf Underneath */}
      <polygon points="52,33 65,45 55,66 41,54" fill="#F43F5E" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <polygon points="52,33 65,45 52,51" fill="#FDA4AF" />
      {/* Wooden Handle */}
      <g transform="rotate(-38 66 64)">
        <rect x="64" y="70" width="11" height="32" rx="5.5" fill="#92400E" stroke={INK} strokeWidth="2.3" />
        <rect x="65" y="64" width="9" height="8" rx="2" fill="#F59E0B" stroke={INK} strokeWidth="1.9" />
      </g>
      {/* Brass Rim & Glass Lens */}
      <circle cx="51" cy="50" r="27" fill={`url(#md-lens-${uid})`} stroke="#D97706" strokeWidth="5.5" />
      <circle cx="51" cy="50" r="29.5" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="51" cy="50" r="24" fill="none" stroke={INK} strokeWidth="1.5" />
      {/* Lens Specular Arc */}
      <path d="M35 42C37 35 44 31 51 31" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
      <Sparkle cx={89} cy={31} r={5.5} fill="#FACC15" />
      <Sparkle cx={24} cy={80} r={4.5} fill="#38BDF8" />
    </g>
  ),

  solar_wind_planet: (uid) => (
    <g>
      <defs>
        <radialGradient id={`swp-orb-${uid}`} cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="65%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill="#0F172A" stroke={INK} strokeWidth="2.2" />
      {/* Solar Flare Arc Left */}
      <circle cx="22" cy="58" r="14" fill="#F97316" opacity="0.88" />
      <circle cx="19" cy="58" r="9" fill="#FDE047" />
      {/* Magnetosphere Solar Wind Ribbons */}
      <path d="M29 44C46 28 78 28 96 42" fill="none" stroke="#34D399" strokeWidth="3.4" strokeLinecap="round" opacity="0.85" />
      <path d="M29 74C46 90 78 90 96 76" fill="none" stroke="#22D3EE" strokeWidth="3.4" strokeLinecap="round" opacity="0.85" />
      <path d="M32 58H98" fill="none" stroke="#FDE047" strokeWidth="2.4" strokeDasharray="5 5" opacity="0.7" />
      {/* Blue Planet with Lush Continents */}
      <circle cx="64" cy="59" r="21" fill={`url(#swp-orb-${uid})`} stroke="#93C5FD" strokeWidth="2" />
      <path d="M55 48C61 46 67 51 64 58C60 64 53 60 55 48Z" fill="#4ADE80" />
      <path d="M70 60C76 58 80 65 75 72C69 75 66 66 70 60Z" fill="#22C55E" />
      <Sparkle cx={89} cy={29} r={4.5} fill="#FDE047" />
    </g>
  ),

  coral_reef_ecosystem: (uid) => (
    <g>
      <defs>
        <linearGradient id={`cr-sea-${uid}`} x1="60" y1="18" x2="60" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      <rect x="16" y="18" width="88" height="82" rx="22" fill={`url(#cr-sea-${uid})`} stroke={INK} strokeWidth="2.2" />
      {/* Sandy Reef Floor */}
      <path d="M16 84Q60 76 104 84V100H16Z" fill="#FDE68A" stroke={INK} strokeWidth="1.8" />
      {/* Swaying Seaweed */}
      <path d="M29 86C25 74 33 65 28 53" fill="none" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M89 86C93 74 85 62 90 50" fill="none" stroke="#10B981" strokeWidth="4.5" strokeLinecap="round" />
      {/* Branching Pink Coral */}
      <path d="M47 85V66M47 72L38 61M47 68L57 57" fill="none" stroke="#FB7185" strokeWidth="6" strokeLinecap="round" />
      <path d="M47 85V66M47 72L38 61M47 68L57 57" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      {/* Cute Reef Clownfish */}
      <g transform="translate(69, 46)">
        <polygon points="10,0 18,-6 18,6" fill="#F97316" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="0" cy="0" rx="11" ry="7.5" fill="#FB923C" stroke={INK} strokeWidth="1.8" />
        <rect x="-3" y="-6.5" width="4" height="13" fill="#FFFFFF" />
        <circle cx="-6" cy="-1.5" r="1.6" fill={INK} />
      </g>
      {/* Rising Oxygen Bubbles */}
      <circle cx="43" cy="40" r="3" fill="#E0F2FE" stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="49" cy="30" r="2.2" fill="#E0F2FE" stroke="#FFFFFF" strokeWidth="1.1" />
      <Sparkle cx={86} cy={29} r={4} fill="#FEF08A" />
    </g>
  ),
} satisfies Partial<Record<IllustrationKey, SceneRenderer>>;
