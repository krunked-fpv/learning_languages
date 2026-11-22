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
import { playSfx } from '../../audio';
import { useVaultStore } from '../../store/useVaultStore';
import {
  ConstellationMemoryEmblem,
  MeteorBlasterEmblem,
  RhythmChefEmblem,
  SkyCatcherEmblem,
  StarlightChoirEmblem,
  TowerStackEmblem,
  TrainSwitcherEmblem,
} from './ArcadeEmblems';
import {
  CARD_SURFACE_STYLE,
  SOFT_BTN_STYLE,
  useArcadeContainerMetrics,
  useArcadeDeck,
} from './arcadeShared';
import { ConstellationMemoryArcade } from './ConstellationMemoryArcade';
import { MeteorBlasterArcade } from './MeteorBlasterArcade';
import { RhythmChefArcade } from './RhythmChefArcade';
import { SkyCatcherArcade } from './SkyCatcherArcade';
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
];

export function ArcadeHub({ initialMode = 'hub', onExitToMap }: ArcadeHubProps) {
  const { activeProfile } = useVaultStore();
  const { bestScoreFor } = useArcadeDeck();
  const { containerRef, width, isNarrow, isCompact } = useArcadeContainerMetrics();
  const [mode, setMode] = useState<ArcadeGameMode>(initialMode);
  const [page, setPage] = useState<0 | 1>(0);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (mode === 'sky_catcher') {
    return <SkyCatcherArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'meteor_blaster') {
    return <MeteorBlasterArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'tower_stack') {
    return <TowerStackArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'constellation_memory') {
    return <ConstellationMemoryArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'train_switcher') {
    return <TrainSwitcherArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'rhythm_chef') {
    return <RhythmChefArcade onExit={() => setMode('hub')} />;
  }
  if (mode === 'starlight_choir' && activeProfile.secretArcadeUnlocked) {
    return <StarlightSecretGame onExit={() => setMode('hub')} />;
  }

  const secretUnlocked = Boolean(activeProfile.secretArcadeUnlocked);
  const isWideDesktop = width >= 960;
  const visibleStandard = isNarrow
    ? page === 0
      ? STANDARD_CABINETS.slice(0, 4)
      : STANDARD_CABINETS.slice(4, 6)
    : STANDARD_CABINETS;
  const showSecretCabinet = !isNarrow || page === 1;

  const emblemSize = isNarrow ? 38 : isWideDesktop ? 46 : 42;

  return (
    <section
      ref={containerRef}
      aria-label="Wanderling Arcade Hub"
      style={{
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        width: '100%',
        maxWidth: 1140,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isCompact ? 8 : 10,
        overflow: 'hidden',
      }}
    >
      {/* Compact Arcade Plaza Header */}
      <div
        style={{
          ...CARD_SURFACE_STYLE,
          flexShrink: 0,
          padding: isCompact ? '8px 12px' : '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          borderRadius: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: isCompact ? 34 : 42,
              height: isCompact ? 34 : 42,
              borderRadius: 14,
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
            <Gamepad2 size={isCompact ? 18 : 22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: isCompact ? '1.05rem' : '1.26rem',
                fontWeight: 900,
                color: 'var(--text-main, #1e1b4b)',
                lineHeight: 1.15,
              }}
            >
              Expedition Arcade
            </h1>
            {!isCompact ? (
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted, #475569)',
                }}
              >
                7 tactile mini-games • Recharge Hearts, earn Gems & beat High Scores!
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: isCompact ? '4px 8px' : '5px 10px',
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
              fontSize: isCompact ? '0.74rem' : '0.8rem',
              fontWeight: 900,
            }}
          >
            <Trophy size={13} />
            <span>Wins: {activeProfile.stats.arcadeGamesWon}</span>
          </span>

          <button
            type="button"
            className="tactile-btn"
            style={{
              ...SOFT_BTN_STYLE,
              padding: isCompact ? '5px 10px' : '7px 14px',
              fontSize: isCompact ? '0.78rem' : '0.86rem',
              borderRadius: 14,
            }}
            onClick={onExitToMap}
          >
            Back to Atlas Map
          </button>
        </div>
      </div>

      {/* 7-Cabinet Console Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isNarrow
            ? 'repeat(2, minmax(0, 1fr))'
            : isWideDesktop
              ? 'repeat(4, minmax(0, 1fr))'
              : 'repeat(3, minmax(0, 1fr))',
          gridTemplateRows: isNarrow
            ? 'repeat(2, minmax(0, 1fr))'
            : isWideDesktop
              ? 'repeat(2, minmax(0, 1fr))'
              : 'repeat(3, minmax(0, 1fr))',
          gap: isCompact ? 8 : 10,
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
                padding: isNarrow ? 10 : 13,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: isNarrow ? 5 : 8,
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
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'var(--card-soft-bg, #f1f5f9)',
                      color: 'var(--text-muted, #475569)',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {cab.tag}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
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
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Best: {best}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div style={{ minHeight: 0 }}>
                <h2
                  style={{
                    margin: '0 0 2px',
                    fontFamily: 'var(--font-display)',
                    fontSize: isNarrow ? '0.88rem' : '1.02rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #1e1b4b)',
                    lineHeight: 1.15,
                  }}
                >
                  {cab.title}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: isNarrow ? '0.68rem' : '0.76rem',
                    fontWeight: 700,
                    color: 'var(--text-muted, #475569)',
                    lineHeight: 1.28,
                    display: '-webkit-box',
                    WebkitLineClamp: isNarrow ? 2 : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {cab.description}
                </p>
              </div>

              {/* Launch Button */}
              <button
                type="button"
                className={`tactile-btn ${cab.btnClass}`}
                style={{
                  width: '100%',
                  padding: isNarrow ? '6px 8px' : '8px 12px',
                  fontSize: isNarrow ? '0.76rem' : '0.86rem',
                  borderRadius: 13,
                }}
                onClick={() => {
                  playSfx('whoosh_transition');
                  setMode(cab.id);
                }}
              >
                <Play size={14} />
                <span>{cab.cta}</span>
              </button>
            </div>
          );
        })}

        {/* Cabinet #7: Secret Unlockable — Starlight Critter Choir */}
        {showSecretCabinet ? (
          <div
            style={{
              ...CARD_SURFACE_STYLE,
              gridColumn: isNarrow || isWideDesktop ? 'span 2' : '1 / -1',
              padding: isNarrow ? 10 : 14,
              display: 'flex',
              flexDirection: isNarrow ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: isNarrow ? 6 : 14,
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
                    alignItems: 'center',
                    gap: isNarrow ? 10 : 14,
                    minWidth: 0,
                    width: isNarrow ? '100%' : 'auto',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <StarlightChoirEmblem size={isNarrow ? 44 : 58} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#fef3c7',
                          color: '#b45309',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                        }}
                      >
                        <Sparkles size={11} /> SECRET UNLOCKED!
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#eef2ff',
                          color: '#3730a3',
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.7rem',
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
                        fontSize: isNarrow ? '0.95rem' : '1.1rem',
                        fontWeight: 900,
                        color: 'var(--text-main, #1e1b4b)',
                      }}
                    >
                      Starlight Critter Choir
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isNarrow ? '0.72rem' : '0.8rem',
                        fontWeight: 700,
                        color: 'var(--text-muted, #475569)',
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
                    width: isNarrow ? '100%' : 'auto',
                    padding: isNarrow ? '8px 12px' : '11px 18px',
                    fontSize: isNarrow ? '0.82rem' : '0.9rem',
                  }}
                  onClick={() => {
                    playSfx('secret_fanfare');
                    setMode('starlight_choir');
                  }}
                >
                  <Music size={16} />
                  <span>Play Starlight Critter Choir!</span>
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isNarrow ? 10 : 14,
                    minWidth: 0,
                    width: isNarrow ? '100%' : 'auto',
                  }}
                >
                  <div
                    style={{
                      width: isNarrow ? 44 : 58,
                      height: isNarrow ? 44 : 58,
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderTopWidth: 2.5,
                      borderRightWidth: 2.5,
                      borderLeftWidth: 2.5,
                      borderBottomWidth: 2.5,
                      borderStyle: 'dashed',
                      borderColor: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fde047',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={isNarrow ? 20 : 26} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(251, 191, 36, 0.22)',
                        color: '#fde047',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        marginBottom: 3,
                      }}
                    >
                      <Star size={11} /> MYSTERY VAULT
                    </div>
                    <h2
                      style={{
                        margin: '0 0 2px',
                        fontFamily: 'var(--font-display)',
                        fontSize: isNarrow ? '0.95rem' : '1.1rem',
                        fontWeight: 900,
                        color: '#f8fafc',
                      }}
                    >
                      ??? Starlight Critter Choir
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isNarrow ? '0.7rem' : '0.78rem',
                        fontWeight: 700,
                        color: '#e0e7ff',
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
                    width: isNarrow ? '100%' : 'auto',
                    background: 'rgba(255, 255, 255, 0.14)',
                    borderTopWidth: 2,
                    borderRightWidth: 2,
                    borderLeftWidth: 2,
                    borderBottomWidth: 4,
                    borderStyle: 'solid',
                    borderColor: '#818cf8',
                    color: '#e0e7ff',
                    padding: isNarrow ? '7px 12px' : '10px 16px',
                    fontSize: isNarrow ? '0.8rem' : '0.86rem',
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

      {/* Narrow Screen Page 1 / 2 Cabinet Pager */}
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
              setPage(0);
            }}
            style={{
              ...SOFT_BTN_STYLE,
              padding: '5px 12px',
              fontSize: '0.78rem',
              borderRadius: 12,
            }}
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '0.82rem',
              color: 'var(--text-main, #1e1b4b)',
            }}
          >
            Page {page + 1} / 2
          </span>

          <button
            type="button"
            className="tactile-btn"
            aria-label="Next arcade page"
            disabled={page === 1}
            onClick={() => {
              playSfx('tile_tap', 1);
              setPage(1);
            }}
            style={{
              ...SOFT_BTN_STYLE,
              padding: '5px 12px',
              fontSize: '0.78rem',
              borderRadius: 12,
            }}
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
