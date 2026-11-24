import { motion, useReducedMotion } from 'framer-motion';
import type { CharacterPose, CompanionId } from '../../types/contracts';
import { COMPANION_ANCHORS, MASCOT_INK } from './cosmeticsSvg';

interface PoseProps {
  companionId: CompanionId;
  pose: CharacterPose;
  uid: string;
  look: { x: number; y: number };
  isBlinking: boolean;
  hasCustomGlasses: boolean;
  hasHat?: boolean;
}

function getArmMotion(pose: CharacterPose, side: 'left' | 'right') {
  const dir = side === 'left' ? -1 : 1;
  switch (pose) {
    case 'happy':
    case 'victory_dance':
      return {
        rotate: [dir * 12, dir * 32, dir * 10, dir * 30, dir * 12],
        y: [0, -5, 0, -4, 0],
      };
    case 'streak_fire':
      return {
        rotate: [dir * 26, dir * 38, dir * 26],
        y: [-3, -7, -3],
      };
    case 'listening':
      return side === 'right'
        ? { rotate: [0, 26, 22], y: [-2, -6, -5] }
        : { rotate: [0, -4, 0], y: [0, 0, 0] };
    case 'thinking':
      return side === 'right'
        ? { rotate: [20, 24, 20], y: [-4, -5, -4] }
        : { rotate: [0, 0, 0], y: [0, 0, 0] };
    case 'boss_intro':
      return {
        rotate: [dir * 16, dir * 22, dir * 16],
        y: [-2, -4, -2],
      };
    case 'sympathetic':
      return {
        rotate: [dir * -6, dir * -2, dir * -6],
        y: [1, 2, 1],
      };
    case 'idle':
    default:
      return {
        rotate: [0, dir * 5, 0],
        y: [0, -1.5, 0],
      };
  }
}

export function TailAndBackLayer({
  companionId,
  pose,
  uid,
}: {
  companionId: CompanionId;
  pose: CharacterPose;
  uid: string;
}) {
  const isExcited = pose === 'happy' || pose === 'victory_dance' || pose === 'streak_fire';

  if (companionId === 'pip') {
    return (
      <g>
        {/* Starling tail feathers */}
        <path
          d="M96 172L76 191L89 194L98 182L108 194L120 190L106 172Z"
          fill="#1E40AF"
          stroke={MASCOT_INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (companionId === 'mateo') {
    return (
      <g>
        {/* Acoustic Guitar slung behind shoulder */}
        <g transform="rotate(-24 110 135)">
          <rect x="106" y="76" width="8" height="44" rx="3" fill="#92400E" stroke={MASCOT_INK} strokeWidth="2" />
          <rect x="104" y="71" width="12" height="9" rx="2.5" fill="#78350F" stroke={MASCOT_INK} strokeWidth="1.8" />
          <ellipse cx="110" cy="144" rx="18" ry="22" fill="#D97706" stroke={MASCOT_INK} strokeWidth="2.2" />
          <circle cx="110" cy="140" r="6" fill="#451A03" stroke="#FEF08A" strokeWidth="1.4" />
        </g>
        {/* Curving Axolotl Tail */}
        <motion.path
          d="M78 164C54 166 43 150 51 136C57 126 66 136 69 147"
          fill="#FB7185"
          stroke={MASCOT_INK}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={isExcited ? { rotate: [-4, 6, -4] } : { rotate: [-1.5, 2, -1.5] }}
          transition={{ duration: isExcited ? 0.6 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '78px', originY: '164px' }}
        />
        <defs>
          <linearGradient id={`mat-tail-fin-${uid}`} x1="46" y1="134" x2="72" y2="164" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDA4AF" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>
      </g>
    );
  }

  if (companionId === 'colette') {
    return (
      <motion.g
        animate={isExcited ? { rotate: [-5, 7, -5] } : { rotate: [-2, 3, -2] }}
        transition={{ duration: isExcited ? 0.7 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '132px', originY: '166px' }}
      >
        {/* Fluffy Russet Fox Tail with Cream Tip */}
        <path
          d="M128 172C155 174 179 156 177 129C176 115 162 110 153 121C146 131 144 148 130 158Z"
          fill="#EA580C"
          stroke={MASCOT_INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M161 116C169 113 177 119 177 130C177 137 174 143 169 148L161 139L165 131L157 127Z"
          fill="#FFF7ED"
          stroke={MASCOT_INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </motion.g>
    );
  }

  if (companionId === 'benni') {
    return (
      <g>
        {/* Short charcoal badger tail */}
        <ellipse cx="144" cy="172" rx="14" ry="9" transform="rotate(-18 144 172)" fill="#334155" stroke={MASCOT_INK} strokeWidth="2.2" />
      </g>
    );
  }

  // Luca sea-otter tail
  return (
    <motion.g
      animate={isExcited ? { rotate: [-4, 6, -4] } : { rotate: [-2, 2, -2] }}
      transition={{ duration: isExcited ? 0.75 : 2.7, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originX: '130px', originY: '170px' }}
    >
      <path
        d="M126 174C152 178 176 164 174 146C172 136 160 138 153 147C146 156 138 162 128 164Z"
        fill="#92400E"
        stroke={MASCOT_INK}
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
    </motion.g>
  );
}

export function BodyAndArmsLayer({
  companionId,
  pose,
  uid,
}: {
  companionId: CompanionId;
  pose: CharacterPose;
  uid: string;
}) {
  const reducedMotion = useReducedMotion();
  const leftAnim = reducedMotion ? undefined : getArmMotion(pose, 'left');
  const rightAnim = reducedMotion ? undefined : getArmMotion(pose, 'right');
  const dur = pose === 'happy' || pose === 'victory_dance' || pose === 'streak_fire' ? 0.9 : 3.6;

  if (companionId === 'pip') {
    return (
      <g>
        <defs>
          <radialGradient id={`pip-body-${uid}`} cx="34%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#7CC2FA" />
            <stop offset="56%" stopColor="#3476DE" />
            <stop offset="100%" stopColor="#1F4A9C" />
          </radialGradient>
          <radialGradient id={`pip-belly-${uid}`} cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFF7D6" />
            <stop offset="68%" stopColor="#FDE293" />
            <stop offset="100%" stopColor="#F2C05E" />
          </radialGradient>
        </defs>
        {/* Warm golden bird feet */}
        <path d="M87 183L81 193M87 183L88 194M87 183L94 192" stroke="#E89A25" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M133 183L126 192M133 183L133 194M133 183L139 193" stroke="#E89A25" strokeWidth="4.2" strokeLinecap="round" />
        {/* Flapping Wing Left & Right */}
        <motion.path
          d="M72 135C51 139 41 158 51 171C60 177 73 169 78 154Z"
          fill="#265CC2"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
          animate={leftAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '75px', originY: '142px' }}
        />
        <motion.path
          d="M148 135C169 139 179 158 169 171C160 177 147 169 142 154Z"
          fill="#265CC2"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          strokeLinejoin="round"
          animate={rightAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '145px', originY: '142px' }}
        />
        {/* Plump Songbird Body with gouache gradient & warm sunlit upper-left rim */}
        <ellipse cx="110" cy="154" rx="39" ry="34" fill={`url(#pip-body-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
        {/* Warm Golden Belly Patch with soft inner shading */}
        <ellipse cx="110" cy="158" rx="25" ry="23" fill={`url(#pip-belly-${uid})`} />
        <path d="M90 148C94 140 103 137 112 138" stroke="#FFFDF5" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        {/* Crimson Explorer Ribbon & Oversized Brass Starlight Compass Medallion */}
        <path d="M85 130L110 148L135 130" fill="none" stroke="#D9324A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M85 130L110 148L135 130" fill="none" stroke={MASCOT_INK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
        <g>
          <circle cx="110" cy="155" r="12.5" fill="#E8A227" stroke={MASCOT_INK} strokeWidth="2.1" />
          <circle cx="110" cy="155" r="9" fill="#2A2454" stroke="#FDE047" strokeWidth="1.2" />
          <path d="M110 147L112.4 155L110 163L107.6 155Z" fill="#EF4444" />
          <path d="M102 155L110 152.6L118 155L110 157.4Z" fill="#FEF08A" />
          <circle cx="110" cy="155" r="2" fill="#FFFDF7" />
        </g>
      </g>
    );
  }

  if (companionId === 'mateo') {
    return (
      <g>
        <defs>
          <radialGradient id={`mat-body-${uid}`} cx="44%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FDA4AF" />
            <stop offset="100%" stopColor="#F43F5E" />
          </radialGradient>
        </defs>
        {/* Feet */}
        <ellipse cx="92" cy="186" rx="11" ry="6.5" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="2.2" />
        <ellipse cx="128" cy="186" rx="11" ry="6.5" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="2.2" />
        {/* Arms */}
        <motion.path
          d="M78 139C61 144 57 161 67 167C74 170 81 161 82 152Z"
          fill="#FB7185"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={leftAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '80px', originY: '144px' }}
        />
        <motion.path
          d="M142 139C159 144 163 161 153 167C146 170 139 161 138 152Z"
          fill="#FB7185"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={rightAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '140px', originY: '144px' }}
        />
        {/* Coral Torso + Peach Belly */}
        <ellipse cx="110" cy="156" rx="34" ry="31" fill={`url(#mat-body-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
        <ellipse cx="110" cy="161" rx="22" ry="20" fill="#FFE4E6" />
        {/* Fiesta Neckerchief */}
        <path d="M81 133L110 153L139 133L129 126H91Z" fill="#FBBF24" stroke={MASCOT_INK} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M97 137L110 147L123 137" fill="none" stroke="#0EA5E9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  if (companionId === 'colette') {
    return (
      <g>
        <defs>
          <radialGradient id={`col-body-${uid}`} cx="44%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#C2410C" />
          </radialGradient>
        </defs>
        {/* Fox paws */}
        <ellipse cx="92" cy="186" rx="10" ry="6.5" fill="#1E293B" stroke={MASCOT_INK} strokeWidth="2.2" />
        <ellipse cx="128" cy="186" rx="10" ry="6.5" fill="#1E293B" stroke={MASCOT_INK} strokeWidth="2.2" />
        {/* Arms */}
        <motion.path
          d="M78 139C60 144 56 161 66 167C74 170 80 160 82 151Z"
          fill="#EA580C"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={leftAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '80px', originY: '144px' }}
        />
        <motion.path
          d="M142 139C160 144 164 161 154 167C146 170 140 160 138 151Z"
          fill="#EA580C"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={rightAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '140px', originY: '144px' }}
        />
        {/* Russet Body */}
        <ellipse cx="110" cy="156" rx="34" ry="31" fill={`url(#col-body-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
        {/* Boulangerie Ivory Apron + Crimson Neck Scarf */}
        <path d="M87 136H133L138 181C126 186 94 186 82 181Z" fill="#FFFBEB" stroke={MASCOT_INK} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M86 130Q110 142 134 130" fill="none" stroke="#E11D48" strokeWidth="7" strokeLinecap="round" />
        {/* Mini Croissant Pocket Badge */}
        <path d="M103 161C105 155 115 155 117 161C114 164 106 164 103 161Z" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="1.5" />
      </g>
    );
  }

  if (companionId === 'benni') {
    return (
      <g>
        {/* Paws */}
        <ellipse cx="91" cy="186" rx="11" ry="6.5" fill="#1E293B" stroke={MASCOT_INK} strokeWidth="2.2" />
        <ellipse cx="129" cy="186" rx="11" ry="6.5" fill="#1E293B" stroke={MASCOT_INK} strokeWidth="2.2" />
        {/* Arms */}
        <motion.path
          d="M76 139C59 144 55 162 66 167C74 170 81 160 82 151Z"
          fill="#334155"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={leftAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '79px', originY: '144px' }}
        />
        <motion.path
          d="M144 139C161 144 165 162 154 167C146 170 139 160 138 151Z"
          fill="#334155"
          stroke={MASCOT_INK}
          strokeWidth="2.3"
          animate={rightAnim}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '141px', originY: '144px' }}
        />
        {/* Charcoal & Cream Badger Body */}
        <ellipse cx="110" cy="156" rx="36" ry="31" fill="#334155" stroke={MASCOT_INK} strokeWidth="2.4" />
        <ellipse cx="110" cy="160" rx="22" ry="22" fill="#FEFCE8" />
        {/* Leather Tinkerer Belt & Rotating Brass Gear Badge */}
        <path d="M80 138L140 169" stroke="#78350F" strokeWidth="7" strokeLinecap="round" />
        <motion.g
          style={{ originX: '110px', originY: '155px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="110" cy="155" r="10.5" fill="#F59E0B" stroke={MASCOT_INK} strokeWidth="2" />
          {[0, 45, 90, 135].map((deg) => (
            <rect
              key={deg}
              x="108"
              y="141.5"
              width="4"
              height="27"
              rx="1.2"
              transform={`rotate(${deg} 110 155)`}
              fill="#FBBF24"
              stroke={MASCOT_INK}
              strokeWidth="1.2"
            />
          ))}
          <circle cx="110" cy="155" r="8" fill="#FBBF24" stroke={MASCOT_INK} strokeWidth="1.5" />
          <circle cx="110" cy="155" r="3.2" fill="#1E293B" />
        </motion.g>
      </g>
    );
  }

  // Luca Venetian Sea-Otter
  return (
    <g>
      <defs>
        <radialGradient id={`luc-body-${uid}`} cx="44%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>
      </defs>
      {/* Otter Feet */}
      <ellipse cx="91" cy="186" rx="11" ry="6.5" fill="#78350F" stroke={MASCOT_INK} strokeWidth="2.2" />
      <ellipse cx="129" cy="186" rx="11" ry="6.5" fill="#78350F" stroke={MASCOT_INK} strokeWidth="2.2" />
      {/* Arms */}
      <motion.path
        d="M78 139C60 144 56 161 66 167C74 170 80 160 82 151Z"
        fill="#B45309"
        stroke={MASCOT_INK}
        strokeWidth="2.3"
        animate={leftAnim}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '80px', originY: '144px' }}
      />
      <motion.path
        d="M142 139C160 144 164 161 154 167C146 170 140 160 138 151Z"
        fill="#B45309"
        stroke={MASCOT_INK}
        strokeWidth="2.3"
        animate={rightAnim}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '140px', originY: '144px' }}
      />
      {/* Honey-Brown Body & Cream Chest */}
      <ellipse cx="110" cy="156" rx="34" ry="31" fill={`url(#luc-body-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
      <ellipse cx="110" cy="160" rx="22" ry="21" fill="#FEF3C7" />
      {/* Venetian Blue & White Striped Scarf */}
      <path d="M80 133Q110 148 140 133L136 144Q110 158 84 144Z" fill="#0284C7" stroke={MASCOT_INK} strokeWidth="2" />
      <path d="M90 138L93 147M104 142V151M116 142V151M130 138L127 147" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      {/* Sea-Star Charm */}
      <path
        d="M110 152L112.8 158L119 158.6L114.2 162.8L115.6 169L110 165.6L104.4 169L105.8 162.8L101 158.6L107.2 158Z"
        fill="#FACC15"
        stroke={MASCOT_INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </g>
  );
}

export function HeadAndExpressionLayer({
  companionId,
  pose,
  uid,
  look,
  isBlinking,
  hasCustomGlasses,
  hasHat = false,
}: PoseProps) {
  const reducedMotion = useReducedMotion();
  const anchor = COMPANION_ANCHORS[companionId];
  const lx = 110 - anchor.eyeSpread;
  const rx = 110 + anchor.eyeSpread;
  const eyeY = anchor.eyeY;
  const mouthY = anchor.mouthY;

  const isHappyCrescent = pose === 'happy' || pose === 'victory_dance';
  const irisColor =
    companionId === 'pip'
      ? '#2C223B'
      : companionId === 'benni'
        ? '#145E5A'
        : companionId === 'colette'
          ? '#4E2A1E'
          : '#38251C';
  const irisBounce =
    companionId === 'pip'
      ? '#7DD3FC'
      : companionId === 'benni'
        ? '#6EE7B7'
        : '#FDE68A';

  return (
    <g>
      {/* 1. Companion-specific Head Base with painterly upper-left sunlit shading */}
      {companionId === 'pip' && (
        <g>
          <defs>
            <radialGradient id={`pip-head-${uid}`} cx="34%" cy="26%" r="74%">
              <stop offset="0%" stopColor="#89CBFC" />
              <stop offset="56%" stopColor="#387CE2" />
              <stop offset="100%" stopColor="#1F4A9C" />
            </radialGradient>
          </defs>
          {/* Crown Tuft Feathers */}
          <path
            d="M100 58C95 40 104 34 109 49C113 33 124 38 119 58Z"
            fill="#4B8EEB"
            stroke={MASCOT_INK}
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          {/* Plump Round Starling Head */}
          <circle cx="110" cy="94" r="41" fill={`url(#pip-head-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
          {/* Upper-left sunlit gouache rim sheen */}
          <path
            d="M78 78C83 65 96 58 111 58"
            stroke="#E0F2FE"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.48"
          />
          {/* Soft Rosy Watercolor Cheeks */}
          <ellipse cx="81" cy="105" rx="7.5" ry="4.6" fill="#FDA4AF" opacity="0.68" />
          <ellipse cx="139" cy="105" rx="7.5" ry="4.6" fill="#FDA4AF" opacity="0.68" />
        </g>
      )}

      {companionId === 'mateo' && (
        <g>
          <defs>
            <radialGradient id={`mat-head-${uid}`} cx="34%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FECDD3" />
              <stop offset="60%" stopColor="#FB7D91" />
              <stop offset="100%" stopColor="#D63B59" />
            </radialGradient>
          </defs>
          {/* Animated Feathery Axolotl Gill Frills */}
          <motion.path
            d="M69 86L44 74L58 93L41 99L59 106L47 119L71 111Z"
            fill="#E84A67"
            stroke={MASCOT_INK}
            strokeWidth="2.1"
            strokeLinejoin="round"
            animate={reducedMotion ? undefined : { rotate: [-2.5, 2.5, -2.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '70px', originY: '98px' }}
          />
          <motion.path
            d="M151 86L176 74L162 93L179 99L161 106L173 119L149 111Z"
            fill="#E84A67"
            stroke={MASCOT_INK}
            strokeWidth="2.1"
            strokeLinejoin="round"
            animate={reducedMotion ? undefined : { rotate: [2.5, -2.5, 2.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '150px', originY: '98px' }}
          />
          {/* Wide Rounded Axolotl Head */}
          <ellipse cx="110" cy="99" rx="44" ry="36" fill={`url(#mat-head-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
          <path d="M77 83C84 71 97 67 112 67" stroke="#FFF1F2" strokeWidth="3" strokeLinecap="round" opacity="0.52" />
          <ellipse cx="81" cy="108" rx="6.8" ry="4.2" fill="#E11D48" opacity="0.34" />
          <ellipse cx="139" cy="108" rx="6.8" ry="4.2" fill="#E11D48" opacity="0.34" />
        </g>
      )}

      {companionId === 'colette' && (
        <g>
          <defs>
            <radialGradient id={`col-head-${uid}`} cx="34%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FDB06A" />
              <stop offset="62%" stopColor="#E46525" />
              <stop offset="100%" stopColor="#B54414" />
            </radialGradient>
          </defs>
          {/* Pointed Fox Ears */}
          <path d="M74 82L67 43L96 66Z" fill="#C44D18" stroke={MASCOT_INK} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M77 76L73 53L91 67Z" fill="#FFF4D6" />
          <path d="M146 82L153 43L124 66Z" fill="#C44D18" stroke={MASCOT_INK} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M143 76L147 53L129 67Z" fill="#FFF4D6" />
          {/* Fox Head */}
          <path
            d="M68 98C68 72 86 61 110 61C134 61 152 72 152 98C152 120 132 133 110 133C88 133 68 120 68 98Z"
            fill={`url(#col-head-${uid})`}
            stroke={MASCOT_INK}
            strokeWidth="2.4"
          />
          <path d="M80 76C87 67 99 64 112 64" stroke="#FFEDD5" strokeWidth="2.8" strokeLinecap="round" opacity="0.48" />
          {/* Cream Cheek Ruffs */}
          <path
            d="M69 102C78 96 93 103 110 119C127 103 142 96 151 102C146 121 130 133 110 133C90 133 74 121 69 102Z"
            fill="#FFF7EB"
          />
          <ellipse cx="82" cy="111" rx="6.2" ry="3.8" fill="#FB7185" opacity="0.48" />
          <ellipse cx="138" cy="111" rx="6.2" ry="3.8" fill="#FB7185" opacity="0.48" />
        </g>
      )}

      {companionId === 'benni' && (
        <g>
          <defs>
            <radialGradient id={`ben-head-${uid}`} cx="36%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFFDF5" />
              <stop offset="68%" stopColor="#F9F1D8" />
              <stop offset="100%" stopColor="#E6D7B8" />
            </radialGradient>
          </defs>
          {/* Badger Rounded Ears */}
          <circle cx="77" cy="67" r="13" fill="#3B3338" stroke={MASCOT_INK} strokeWidth="2.2" />
          <circle cx="77" cy="67" r="6.5" fill="#EAE0CE" />
          <circle cx="143" cy="67" r="13" fill="#3B3338" stroke={MASCOT_INK} strokeWidth="2.2" />
          <circle cx="143" cy="67" r="6.5" fill="#EAE0CE" />
          {/* Warm Cream Badger Head */}
          <ellipse cx="110" cy="99" rx="43" ry="36" fill={`url(#ben-head-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
          {/* Warm Charcoal-Umber Eye-Mask Stripes */}
          <path d="M80 73C89 77 98 92 98 112C88 115 76 110 72 95Z" fill="#3B3338" />
          <path d="M140 73C131 77 122 92 122 112C132 115 144 110 148 95Z" fill="#3B3338" />
          {/* Default Brow Tinkerer Goggles (hidden when custom glasses or hat occupies brow) */}
          {!hasCustomGlasses && !hasHat && (
            <g>
              <rect x="78" y="64" width="64" height="8" rx="4" fill="#7C4724" />
              <circle cx="94" cy="69" r="10.5" fill="#5BC4F2" stroke="#D18A26" strokeWidth="3.2" />
              <circle cx="126" cy="69" r="10.5" fill="#5BC4F2" stroke="#D18A26" strokeWidth="3.2" />
              <path d="M90 65L97 72M122 65L129 72" stroke="#FFFDF7" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            </g>
          )}
        </g>
      )}

      {companionId === 'luca' && (
        <g>
          <defs>
            <radialGradient id={`luc-head-${uid}`} cx="34%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#E69A4A" />
              <stop offset="64%" stopColor="#B86622" />
              <stop offset="100%" stopColor="#7C3F14" />
            </radialGradient>
          </defs>
          {/* Rounded Otter Ears */}
          <circle cx="74" cy="76" r="11" fill="#9A501A" stroke={MASCOT_INK} strokeWidth="2.2" />
          <circle cx="146" cy="76" r="11" fill="#9A501A" stroke={MASCOT_INK} strokeWidth="2.2" />
          {/* Otter Head */}
          <ellipse cx="110" cy="99" rx="42" ry="36" fill={`url(#luc-head-${uid})`} stroke={MASCOT_INK} strokeWidth="2.4" />
          <path d="M78 82C86 70 98 66 112 66" stroke="#FDE68A" strokeWidth="2.8" strokeLinecap="round" opacity="0.38" />
          {/* Cream Muzzle & Whiskers */}
          <ellipse cx="110" cy="112" rx="25" ry="16" fill="#FFF3D6" />
          <path
            d="M84 109L66 105M84 115L65 117M136 109L154 105M136 115L155 117"
            stroke="#6E3D1C"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <ellipse cx="83" cy="107" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.46" />
          <ellipse cx="137" cy="107" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.46" />
        </g>
      )}

      {/* 2. Soulful Expressive Eyes with Rich Catchlights, Bounce Rim & Blinking */}
      {[lx, rx].map((cx, idx) => {
        const isLeft = idx === 0;
        if (isHappyCrescent) {
          return (
            <path
              key={cx}
              d={`M${cx - 8} ${eyeY + 2} C${cx - 4} ${eyeY - 7} ${cx + 4} ${eyeY - 7} ${cx + 8} ${eyeY + 2}`}
              fill="none"
              stroke={companionId === 'benni' ? '#FFFDF5' : MASCOT_INK}
              strokeWidth="3.3"
              strokeLinecap="round"
            />
          );
        }
        if (isBlinking) {
          return (
            <path
              key={cx}
              d={`M${cx - 8} ${eyeY} Q${cx} ${eyeY + 4} ${cx + 8} ${eyeY}`}
              fill="none"
              stroke={companionId === 'benni' ? '#FFFDF5' : MASCOT_INK}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        }

        const pupilShiftX = look.x;
        const pupilShiftY = look.y;
        return (
          <g key={cx}>
            {/* Warm cream sclera */}
            <ellipse
              cx={cx}
              cy={eyeY}
              rx={pose === 'listening' ? 10.6 : 9.8}
              ry={pose === 'listening' ? 11.4 : 10.6}
              fill="#FFFDF9"
              stroke={MASCOT_INK}
              strokeWidth="1.9"
            />
            {/* Soft upper-lid shading inside eye */}
            <path
              d={`M${cx - 8.2} ${eyeY - 4.2} Q${cx} ${eyeY - 10.5} ${cx + 8.2} ${eyeY - 4.2}`}
              fill="none"
              stroke={MASCOT_INK}
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.14"
            />
            {/* Deep soulful iris + subtle lower bounce-light crescent */}
            <circle cx={cx + pupilShiftX} cy={eyeY + pupilShiftY} r="6.1" fill={irisColor} />
            <path
              d={`M${cx + pupilShiftX - 3.6} ${eyeY + pupilShiftY + 2.4} Q${cx + pupilShiftX} ${eyeY + pupilShiftY + 5.8} ${cx + pupilShiftX + 3.6} ${eyeY + pupilShiftY + 2.4}`}
              fill="none"
              stroke={irisBounce}
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity="0.62"
            />
            {/* Dual pearl catchlights (primary upper-left + secondary sparkle) */}
            <circle cx={cx + pupilShiftX - 2.1} cy={eyeY + pupilShiftY - 2.4} r="2.35" fill="#FFFDF9" />
            <circle cx={cx + pupilShiftX + 2.1} cy={eyeY + pupilShiftY + 1.8} r="1.05" fill="#FFFDF9" opacity="0.88" />
            {/* Pose-specific Eyebrows */}
            {pose === 'sympathetic' && (
              <path
                d={isLeft ? `M${cx - 7} ${eyeY - 11} L${cx + 6} ${eyeY - 14}` : `M${cx - 6} ${eyeY - 14} L${cx + 7} ${eyeY - 11}`}
                stroke={companionId === 'benni' ? '#FEF08A' : MASCOT_INK}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            )}
            {(pose === 'streak_fire' || pose === 'boss_intro') && (
              <path
                d={isLeft ? `M${cx - 8} ${eyeY - 14} L${cx + 7} ${eyeY - 10}` : `M${cx - 7} ${eyeY - 10} L${cx + 8} ${eyeY - 14}`}
                stroke={companionId === 'benni' ? '#FACC15' : MASCOT_INK}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}
            {pose === 'thinking' && isLeft && (
              <path
                d={`M${cx - 7} ${eyeY - 14} Q${cx} ${eyeY - 17} ${cx + 7} ${eyeY - 13}`}
                fill="none"
                stroke={companionId === 'benni' ? '#FEF08A' : MASCOT_INK}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      {/* 3. Beaks / Noses & Mouths reacting to Pose */}
      {companionId === 'pip' ? (
        <g>
          {/* Pip's Warm Golden-Orange Beak */}
          <path
            d={`M100 ${mouthY - 2} C105 ${mouthY - 6} 115 ${mouthY - 6} 120 ${mouthY - 2} L110 ${mouthY + 11} Z`}
            fill="#FBBF24"
            stroke={MASCOT_INK}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {(pose === 'happy' || pose === 'victory_dance' || pose === 'streak_fire' || pose === 'listening') && (
            <path
              d={`M104 ${mouthY + 1} L116 ${mouthY + 1} L110 ${mouthY + 9} Z`}
              fill="#FB7185"
              stroke={MASCOT_INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          )}
        </g>
      ) : (
        <g>
          {/* Nose for Colette, Benni, Luca */}
          {companionId !== 'mateo' && (
            <ellipse
              cx="110"
              cy={mouthY - 6}
              rx={companionId === 'benni' ? 7 : 5.5}
              ry="4.2"
              fill={MASCOT_INK}
            />
          )}
          {/* Mouth expression */}
          {pose === 'thinking' ? (
            <path
              d={`M105 ${mouthY + 3} Q110 ${mouthY + 1} 115 ${mouthY + 4}`}
              fill="none"
              stroke={MASCOT_INK}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : pose === 'listening' ? (
            <ellipse cx="110" cy={mouthY + 4} rx="4.5" ry="5" fill="#FB7185" stroke={MASCOT_INK} strokeWidth="2" />
          ) : pose === 'happy' || pose === 'victory_dance' || pose === 'streak_fire' ? (
            <path
              d={`M99 ${mouthY} C103 ${mouthY + 12} 117 ${mouthY + 12} 121 ${mouthY} Z`}
              fill="#FB7185"
              stroke={MASCOT_INK}
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d={`M100 ${mouthY + 1} C104 ${mouthY + 7} 116 ${mouthY + 7} 120 ${mouthY + 1}`}
              fill="none"
              stroke={MASCOT_INK}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          )}
        </g>
      )}
    </g>
  );
}
