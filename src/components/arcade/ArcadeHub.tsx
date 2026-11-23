import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Lock,
  Music,
  Play,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { FlagIcon } from '../../art/FlagIcon';
import { playSfx } from '../../audio';
import { getCourse } from '../../curriculum';
import { useVaultStore } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  isDefaultKidProfileId,
  type ArcadeProficiencyTier,
  type LanguageMeta,
} from '../../types/contracts';
import {
  CafeOrderRushEmblem,
  ConstellationMemoryEmblem,
  MeteorBlasterEmblem,
  RhythmChefEmblem,
  SkyCatcherEmblem,
  StarlightBridgeEmblem,
  StarlightChoirEmblem,
  TowerStackEmblem,
  TrainSwitcherEmblem,
} from './ArcadeEmblems';
import {
  ARCADE_TIER_LIST,
  ARCADE_TIER_META,
  CARD_SURFACE_STYLE,
  SOFT_BTN_STYLE,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';
import { CafeOrderRushArcade } from './CafeOrderRushArcade';
import { ConstellationMemoryArcade } from './ConstellationMemoryArcade';
import { MeteorBlasterArcade } from './MeteorBlasterArcade';
import { RhythmChefArcade } from './RhythmChefArcade';
import { SkyCatcherArcade } from './SkyCatcherArcade';
import { StarlightBridgeArcade } from './StarlightBridgeArcade';
import { StarlightSecretGame } from './StarlightSecretGame';
import { TowerStackArcade } from './TowerStackArcade';
import { TrainSwitcherArcade } from './TrainSwitcherArcade';

export type ArcadeGameMode =
  | 'hub'
  | 'sky_catcher'
  | 'meteor_blaster'
  | 'tower_stack'
  | 'constellation_memory'
  | 'train_switcher'
  | 'rhythm_chef'
  | 'cafe_order_rush'
  | 'starlight_bridge'
  | 'starlight_choir';

export interface ArcadeHubProps {
  initialMode?: ArcadeGameMode;
  onExitToMap: () => void;
}

interface CabinetSpec {
  id: Exclude<ArcadeGameMode, 'hub'>;
  title: string;
  tag: string;
  description: string;
  cta: string;
  btnClass: string;
  accentBorder: string;
  emblem: (size: number) => ReactNode;
}

const STANDARD_CABINETS: readonly CabinetSpec[] = [
  {
    id: 'sky_catcher',
    title: 'Sky-Catcher Fiesta',
    tag: 'Sky Glide',
    description: 'Glide Pip under floating word lanterns, dodge storm clouds, and recharge Hearts!',
    cta: 'Play Sky-Catcher',
    btnClass: 'tactile-btn-primary',
    accentBorder: '#60a5fa',
    emblem: (s) => <SkyCatcherEmblem size={s} />,
  },
  {
    id: 'meteor_blaster',
    title: 'Cosmic Meteor Blaster',
    tag: 'Space Lasers',
    description: 'Fire twin neon starship lasers at glowing word-asteroids across 3 cosmic lanes!',
    cta: 'Launch Blaster',
    btnClass: 'tactile-btn-indigo',
    accentBorder: '#818cf8',
    emblem: (s) => <MeteorBlasterEmblem size={s} />,
  },
  {
    id: 'tower_stack',
    title: 'Gelato & Pastry Tower',
    tag: 'Timing Stack',
    description: 'Drop matching treat scoops onto the cone with golden drizzle precision!',
    cta: 'Stack Gelato',
    btnClass: 'tactile-btn-rose',
    accentBorder: '#f472b6',
    emblem: (s) => <TowerStackEmblem size={s} />,
  },
  {
    id: 'constellation_memory',
    title: 'Constellation Memory Twins',
    tag: 'Star Chart',
    description: 'Flip 3D cosmic cards to pair pictures with foreign phrases & connect constellations!',
    cta: 'Chart Stars',
    btnClass: 'tactile-btn-indigo',
    accentBorder: '#c084fc',
    emblem: (s) => <ConstellationMemoryEmblem size={s} />,
  },
  {
    id: 'train_switcher',
    title: 'Alpine Express Switcher',
    tag: 'Railway',
    description: "Switch Benni's 3 clockwork tracks to route trains & couple golden carriages!",
    cta: 'Switch Tracks',
    btnClass: 'tactile-btn-success',
    accentBorder: '#10b981',
    emblem: (s) => <TrainSwitcherEmblem size={s} />,
  },
  {
    id: 'rhythm_chef',
    title: 'Beat Kitchen Rhythm',
    tag: 'Music Pads',
    description: 'Tap 4 colorful drum pads inside the golden beat ring for pentatonic harmonies!',
    cta: 'Play Rhythm',
    btnClass: 'tactile-btn-amber',
    accentBorder: '#f59e0b',
    emblem: (s) => <RhythmChefEmblem size={s} />,
  },
  {
    id: 'cafe_order_rush',
    title: 'Polyglot Café Order Rush',
    tag: 'Café Rush',
    description: 'Serve companions warm cocoa & treats before their patience rings empty for Speed Tips!',
    cta: 'Serve Café Rush',
    btnClass: 'tactile-btn-amber',
    accentBorder: '#f97316',
    emblem: (s) => <CafeOrderRushEmblem size={s} />,
  },
  {
    id: 'starlight_bridge',
    title: 'Starlight Bridge Cloze Builder',
    tag: 'Sky Cloze',
    description: 'Snap glowing phrase planks into starry sky-island bridges while Pip sprints across!',
    cta: 'Build Star Bridge',
    btnClass: 'tactile-btn-indigo',
    accentBorder: '#38bdf8',
    emblem: (s) => <StarlightBridgeEmblem size={s} />,
  },
];

export function ArcadeHub({ initialMode = 'hub', onExitToMap }: ArcadeHubProps) {
  const { activeProfile } = useVaultStore();
  const [arcadeTier, setArcadeTier] = useState<ArcadeProficiencyTier>('sprout');
  const { language, bestScoreFor, tierMeta } = useArcadeDeck(arcadeTier);
  const { containerRef, width, height, isNarrow, isCompact } = useArcadeContainerMetrics();
  const langMeta = LANGUAGE_META[language];
  let courseMeta: LanguageMeta = langMeta;
  try {
    const activeCourse = getCourse(language);
    if (activeCourse?.meta) {
      courseMeta = activeCourse.meta;
    }
  } catch {
    courseMeta = langMeta;
  }
  const showAdultDirectionBadge =
    Boolean(courseMeta.isAdultOnly && courseMeta.pairDirectionBadge) &&
    Boolean(activeProfile.adultModeUnlocked) &&
    Boolean(activeProfile.adultModeActive) &&
    !isDefaultKidProfileId(activeProfile.id);
  const [mode, setMode] = useState<ArcadeGameMode>(initialMode);
  const [page, setPage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (mode === 'sky_catcher') {
    return <SkyCatcherArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'meteor_blaster') {
    return <MeteorBlasterArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'tower_stack') {
    return <TowerStackArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'constellation_memory') {
    return <ConstellationMemoryArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'train_switcher') {
    return <TrainSwitcherArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'rhythm_chef') {
    return <RhythmChefArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'cafe_order_rush') {
    return <CafeOrderRushArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'starlight_bridge') {
    return <StarlightBridgeArcade arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }
  if (mode === 'starlight_choir' && activeProfile.secretArcadeUnlocked) {
    return <StarlightSecretGame arcadeTier={arcadeTier} onExit={() => setMode('hub')} />;
  }

  const secretUnlocked = Boolean(activeProfile.secretArcadeUnlocked);
  const isWideDesktop = width >= 960;
  const isTightHeight = height < 680;

  const visibleStandard = isNarrow
    ? page === 0
      ? STANDARD_CABINETS.slice(0, 4)
      : page === 1
        ? STANDARD_CABINETS.slice(4, 8)
        : []
    : STANDARD_CABINETS;

  const showSecretCabinet = !isNarrow || page === 2;
  const isSecretCardLayout = isNarrow || !isWideDesktop;
  const emblemSize = isNarrow ? 34 : isWideDesktop ? (isTightHeight ? 38 : 42) : 40;

  return (
    <section
      ref={containerRef}
      aria-label="Wanderling Arcade Hub"
      style={{
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        width: '100%',
        maxWidth: 1160,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? 6 : 8,
        overflow: 'hidden',
      }}
    >
      {/* Compact Arcade Plaza Header + Selectable Proficiency Tiers */}
      <div
        style={{
          ...CARD_SURFACE_STYLE,
          flexShrink: 0,
          padding: isCompact ? '7px 10px' : '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? 6 : 7,
          borderRadius: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 180px' }}>
            <div
              style={{
                width: isCompact ? 32 : 38,
                height: isCompact ? 32 : 38,
                borderRadius: 12,
                background: 'var(--card-soft-bg, #eff6ff)',
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: 3,
                borderStyle: 'solid',
                borderColor: 'var(--lang-primary, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--lang-primary, #2563eb)',
                flexShrink: 0,
              }}
            >
              <Gamepad2 size={isCompact ? 17 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: isCompact ? '0.98rem' : '1.16rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #1e1b4b)',
                    lineHeight: 1.15,
                  }}
                >
                  Expedition Arcade
                </h1>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: isCompact ? '1px 6px' : '2px 8px',
                    borderRadius: 999,
                    background: 'var(--card-soft-bg, #f8fafc)',
                    border: '1px solid var(--card-border, #cbd5e1)',
                    color: 'var(--text-main, #1e1b4b)',
                    fontSize: isCompact ? 'clamp(0.58rem, 1.9vw, 0.66rem)' : '0.72rem',
                    fontWeight: 800,
                    lineHeight: 1.3,
                    maxWidth: '100%',
                    minWidth: 0,
                  }}
                >
                  <FlagIcon language={language} size={isCompact ? 14 : 17} />
                  <span
                    dir={courseMeta.dir}
                    style={{ lineHeight: 1.28, whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                  >
                    {courseMeta.nativeName}
                  </span>
                </span>
              </div>
              {showAdultDirectionBadge ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginTop: isCompact ? 2 : 1,
                  }}
                >
                  <span
                    data-testid="arcade-direction-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: isCompact ? '1px 7px' : '2px 8px',
                      borderRadius: 999,
                      background: 'var(--tint-indigo-bg, #eef2ff)',
                      border: '1px solid var(--lang-primary, #7c3aed)',
                      color: 'var(--tint-indigo-ink, #312e81)',
                      fontSize: isCompact ? 'clamp(0.56rem, 1.85vw, 0.64rem)' : 'clamp(0.66rem, 1.1vw, 0.72rem)',
                      fontWeight: 900,
                      lineHeight: 1.24,
                      maxWidth: '100%',
                      minWidth: 0,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {courseMeta.pairDirectionBadge}
                  </span>
                  {!isCompact ? (
                    <span
                      style={{
                        fontSize: '0.71rem',
                        fontWeight: 700,
                        color: 'var(--text-muted, #475569)',
                      }}
                    >
                      {courseMeta.landTitle} • {tierMeta.label} ({tierMeta.cefrLabel}):{' '}
                      {tierMeta.paceLabel} pace & {tierMeta.rewardLabel} XP/Gems
                    </span>
                  ) : null}
                </div>
              ) : !isCompact ? (
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-muted, #475569)',
                  }}
                >
                  9 tactile mini-games • {tierMeta.label} ({tierMeta.cefrLabel}): {tierMeta.paceLabel} pace & {tierMeta.rewardLabel} XP/Gems!
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {!isNarrow ? (
              <div
                role="group"
                aria-label="Arcade proficiency tier"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 3,
                  borderRadius: 14,
                  background: 'var(--card-soft-bg, #f1f5f9)',
                  border: '1.5px solid var(--card-border, #cbd5e1)',
                }}
              >
                {ARCADE_TIER_LIST.map((tierId) => {
                  const meta = ARCADE_TIER_META[tierId];
                  const active = arcadeTier === tierId;
                  return (
                    <button
                      key={tierId}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        playSfx('tile_tap', ARCADE_TIER_LIST.indexOf(tierId));
                        setArcadeTier(tierId);
                      }}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 10,
                        border: active
                          ? `1.5px solid ${meta.borderColor}`
                          : '1.5px solid transparent',
                        background: active ? meta.bgColor : 'transparent',
                        color: active ? meta.textColor : 'var(--text-muted, #475569)',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {meta.label} {meta.cefrLabel}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: isCompact ? '3px 7px' : '4px 9px',
                borderRadius: 999,
                background: '#fffbeb',
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderLeftWidth: 2,
                borderBottomWidth: 3,
                borderStyle: 'solid',
                borderColor: '#f59e0b',
                color: '#b45309',
                fontFamily: 'var(--font-display)',
                fontSize: isCompact ? '0.7rem' : '0.76rem',
                fontWeight: 900,
              }}
            >
              <Trophy size={12} />
              <span>Wins: {activeProfile.stats.arcadeGamesWon}</span>
            </span>

            <button
              type="button"
              className="tactile-btn"
              style={{
                ...SOFT_BTN_STYLE,
                padding: isCompact ? '4px 8px' : '6px 12px',
                fontSize: isCompact ? '0.72rem' : '0.82rem',
                borderRadius: 12,
              }}
              onClick={onExitToMap}
            >
              Back to Atlas Map
            </button>
          </div>
        </div>

        {/* Narrow Mobile Tier Selector Strip */}
        {isNarrow ? (
          <div
            role="group"
            aria-label="Arcade proficiency tier"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 5,
            }}
          >
            {ARCADE_TIER_LIST.map((tierId) => {
              const meta = ARCADE_TIER_META[tierId];
              const active = arcadeTier === tierId;
              return (
                <button
                  key={tierId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    playSfx('tile_tap', ARCADE_TIER_LIST.indexOf(tierId));
                    setArcadeTier(tierId);
                  }}
                  style={{
                    padding: '4px 4px',
                    borderRadius: 10,
                    borderTopWidth: 1.5,
                    borderRightWidth: 1.5,
                    borderLeftWidth: 1.5,
                    borderBottomWidth: 2.5,
                    borderStyle: 'solid',
                    borderColor: active ? meta.borderColor : 'var(--card-border, #cbd5e1)',
                    background: active ? meta.bgColor : 'var(--card-soft-bg, #f8fafc)',
                    color: active ? meta.textColor : 'var(--text-muted, #475569)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {meta.label} {meta.cefrLabel}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* 9-Cabinet Console Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isNarrow
            ? page === 2
              ? 'minmax(0, 1fr)'
              : 'repeat(2, minmax(0, 1fr))'
            : isWideDesktop
              ? 'repeat(4, minmax(0, 1fr))'
              : 'repeat(3, minmax(0, 1fr))',
          gridTemplateRows: isNarrow
            ? page === 2
              ? 'minmax(0, 1fr)'
              : 'repeat(2, minmax(0, 1fr))'
            : isWideDesktop
              ? 'minmax(0, 1fr) minmax(0, 1fr) auto'
              : 'repeat(3, minmax(0, 1fr))',
          gap: isCompact ? 7 : 9,
          overflow: 'hidden',
        }}
      >
        {visibleStandard.map((cab) => {
          const best = bestScoreFor(cab.id);
          return (
            <div
              key={cab.id}
              style={{
                ...CARD_SURFACE_STYLE,
                borderColor: cab.accentBorder,
                padding: isNarrow ? 9 : isTightHeight ? 10 : 12,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: isNarrow ? 4 : 6,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {/* Top Row: Emblem + Tag + Best Score */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ flexShrink: 0 }}>{cab.emblem(emblemSize)}</div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 3,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--card-soft-bg, #f1f5f9)',
                      color: 'var(--text-muted, #475569)',
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {cab.tag}
                  </span>
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: '#fffbeb',
                      borderTopWidth: 1,
                      borderRightWidth: 1,
                      borderLeftWidth: 1,
                      borderBottomWidth: 2,
                      borderStyle: 'solid',
                      borderColor: '#f59e0b',
                      color: '#b45309',
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Best: {best}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: isNarrow ? '0.84rem' : isTightHeight ? '0.92rem' : '0.98rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #1e1b4b)',
                    lineHeight: 1.15,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {cab.title}
                </h2>
                {!isNarrow ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted, #475569)',
                      lineHeight: 1.24,
                      display: '-webkit-box',
                      WebkitLineClamp: isTightHeight ? 2 : 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {cab.description}
                  </p>
                ) : null}
              </div>

              {/* Launch Button */}
              <button
                type="button"
                className={`tactile-btn ${cab.btnClass}`}
                style={{
                  width: '100%',
                  marginTop: isNarrow ? 2 : 0,
                  padding: isNarrow ? '5px 7px' : isTightHeight ? '6px 10px' : '7px 12px',
                  fontSize: isNarrow ? '0.72rem' : '0.82rem',
                  borderRadius: 12,
                  flexShrink: 0,
                }}
                onClick={() => {
                  playSfx('whoosh_transition');
                  setMode(cab.id);
                }}
              >
                <Play size={13} />
                <span>{cab.cta}</span>
              </button>
            </div>
          );
        })}

        {/* Cabinet #9: Secret Unlockable — Starlight Critter Choir */}
        {showSecretCabinet ? (
          <div
            style={{
              ...CARD_SURFACE_STYLE,
              gridColumn: isWideDesktop ? '1 / -1' : 'span 1',
              padding: isNarrow ? 12 : isWideDesktop ? '9px 14px' : 12,
              display: 'flex',
              flexDirection: isSecretCardLayout ? 'column' : 'row',
              alignItems: isSecretCardLayout ? 'stretch' : 'center',
              justifyContent: isNarrow ? 'center' : 'space-between',
              gap: isNarrow ? 14 : isSecretCardLayout ? 8 : 14,
              minHeight: 0,
              overflow: 'hidden',
              background: secretUnlocked
                ? 'var(--card-bg, #ffffff)'
                : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              borderColor: secretUnlocked ? '#818cf8' : '#fbbf24',
              color: secretUnlocked ? 'var(--text-main, #1e1b4b)' : '#f8fafc',
            }}
          >
            {secretUnlocked ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: isSecretCardLayout ? 'flex-start' : 'center',
                    gap: isNarrow ? 10 : 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <StarlightChoirEmblem size={isNarrow ? 44 : isWideDesktop ? 48 : 42} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: '#fef3c7',
                          color: '#b45309',
                          fontSize: '0.64rem',
                          fontWeight: 900,
                        }}
                      >
                        <Sparkles size={10} /> SECRET UNLOCKED!
                      </span>
                      <span
                        style={{
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: '#eef2ff',
                          color: '#3730a3',
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.66rem',
                          fontWeight: 900,
                        }}
                      >
                        Best: {bestScoreFor('starlight_choir')}
                      </span>
                    </div>
                    <h2
                      style={{
                        margin: '0 0 2px',
                        fontFamily: 'var(--font-display)',
                        fontSize: isNarrow ? '0.95rem' : '1.02rem',
                        fontWeight: 900,
                        color: 'var(--text-main, #1e1b4b)',
                        lineHeight: 1.15,
                      }}
                    >
                      Starlight Critter Choir
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isNarrow ? '0.76rem' : '0.74rem',
                        fontWeight: 700,
                        color: 'var(--text-muted, #475569)',
                        lineHeight: 1.24,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      Pop musical Song-Bubbles with all 5 companions, trigger 5x Disco Fever, and
                      catch Golden Star Notes!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="tactile-btn tactile-btn-indigo"
                  style={{
                    flexShrink: 0,
                    width: isSecretCardLayout ? '100%' : 'auto',
                    padding: isNarrow ? '8px 12px' : isWideDesktop ? '9px 16px' : '7px 10px',
                    fontSize: isNarrow ? '0.82rem' : '0.84rem',
                    borderRadius: 12,
                  }}
                  onClick={() => {
                    playSfx('secret_fanfare');
                    setMode('starlight_choir');
                  }}
                >
                  <Music size={15} />
                  <span>Play Starlight Critter Choir!</span>
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: isSecretCardLayout ? 'flex-start' : 'center',
                    gap: isNarrow ? 10 : 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: isNarrow ? 44 : isWideDesktop ? 48 : 42,
                      height: isNarrow ? 44 : isWideDesktop ? 48 : 42,
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderTopWidth: 2,
                      borderRightWidth: 2,
                      borderLeftWidth: 2,
                      borderBottomWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fde047',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={isNarrow ? 20 : 22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: 'rgba(251, 191, 36, 0.22)',
                        color: '#fde047',
                        fontSize: '0.64rem',
                        fontWeight: 900,
                        marginBottom: 2,
                      }}
                    >
                      <Star size={10} /> MYSTERY VAULT
                    </div>
                    <h2
                      style={{
                        margin: '0 0 2px',
                        fontFamily: 'var(--font-display)',
                        fontSize: isNarrow ? '0.95rem' : '1.02rem',
                        fontWeight: 900,
                        color: '#f8fafc',
                        lineHeight: 1.15,
                      }}
                    >
                      ??? Starlight Critter Choir
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isNarrow ? '0.74rem' : '0.73rem',
                        fontWeight: 700,
                        color: '#e0e7ff',
                        lineHeight: 1.24,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      Clear any Unit Boss, finish 3 lessons, OR tap the Golden Compass 5 times in
                      the top bar to unlock!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="tactile-btn"
                  style={{
                    flexShrink: 0,
                    width: isSecretCardLayout ? '100%' : 'auto',
                    background: 'rgba(255, 255, 255, 0.14)',
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: '#818cf8',
                    color: '#e0e7ff',
                    padding: isNarrow ? '7px 12px' : isWideDesktop ? '8px 14px' : '7px 10px',
                    fontSize: isNarrow ? '0.8rem' : '0.82rem',
                    borderRadius: 12,
                  }}
                >
                  <Lock size={14} />
                  <span>Locked Mystery Game</span>
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Narrow Screen Page 1 / 3 Cabinet Pager */}
      {isNarrow ? (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '4px 8px',
            borderRadius: 16,
            background: 'var(--card-bg, #ffffff)',
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderLeftWidth: 2,
            borderBottomWidth: 3,
            borderStyle: 'solid',
            borderColor: 'var(--card-border, #cbd5e1)',
          }}
        >
          <button
            type="button"
            className="tactile-btn"
            aria-label="Previous arcade page"
            disabled={page === 0}
            onClick={() => {
              playSfx('tile_tap', 0);
              setPage((p) => (p > 0 ? ((p - 1) as 0 | 1 | 2) : p));
            }}
            style={{
              ...SOFT_BTN_STYLE,
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderRadius: 12,
            }}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '0.78rem',
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            Page {page + 1} / 3
          </span>

          <button
            type="button"
            className="tactile-btn"
            aria-label="Next arcade page"
            disabled={page === 2}
            onClick={() => {
              playSfx('tile_tap', 1);
              setPage((p) => (p < 2 ? ((p + 1) as 0 | 1 | 2) : p));
            }}
            style={{
              ...SOFT_BTN_STYLE,
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderRadius: 12,
            }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
