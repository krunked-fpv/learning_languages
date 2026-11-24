import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Gem,
  Lock,
  Music,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { FlagIcon } from '../../art/FlagIcon';
import { playSfx } from '../../audio';
import { getCourse } from '../../curriculum';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import {
  LANGUAGE_META,
  isDefaultKidProfileId,
  type ArcadeProficiencyTier,
  type CoopArcadeSessionParams,
  type CoopArcadeSessionSummary,
  type KidProfile,
  type LanguageCode,
  type LanguageMeta,
} from '../../types/contracts';
import { ConfettiBurst } from '../fx/JuiceEngine';
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
  ArcadePlainEnglishCallout,
  ArcadeSayItNormallyButton,
  CARD_SURFACE_STYLE,
  CoopArcadeTurnProvider,
  SOFT_BTN_STYLE,
  isAdultArcadeActive,
  resolveArcadePlainEnglish,
  resolveSafeBaseLanguage,
  useArcadeContainerMetrics,
  useArcadeDeck,
  type ArcadeCoopSettledResult,
  type CoopArcadeTurnContextValue,
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

type CoopMatchState =
  | {
      stage: 'playing_turn_1';
      gameId: Exclude<ArcadeGameMode, 'hub'>;
      p1: KidProfile;
      p2: KidProfile;
      kidQuarantined: boolean;
      p1Language: LanguageCode;
      p2Language: LanguageCode;
    }
  | {
      stage: 'handoff';
      gameId: Exclude<ArcadeGameMode, 'hub'>;
      p1: KidProfile;
      p2: KidProfile;
      kidQuarantined: boolean;
      p1Language: LanguageCode;
      p2Language: LanguageCode;
      p1Result: ArcadeCoopSettledResult;
    }
  | {
      stage: 'playing_turn_2';
      gameId: Exclude<ArcadeGameMode, 'hub'>;
      p1: KidProfile;
      p2: KidProfile;
      kidQuarantined: boolean;
      p1Language: LanguageCode;
      p2Language: LanguageCode;
      p1Result: ArcadeCoopSettledResult;
    }
  | {
      stage: 'summary';
      gameId: Exclude<ArcadeGameMode, 'hub'>;
      p1: KidProfile;
      p2: KidProfile;
      p1Result: ArcadeCoopSettledResult;
      p2Result: ArcadeCoopSettledResult;
      sessionSummary: CoopArcadeSessionSummary;
    };

function getCabinetTitle(gameId: Exclude<ArcadeGameMode, 'hub'>): string {
  if (gameId === 'starlight_choir') return 'Starlight Critter Choir';
  return STANDARD_CABINETS.find((c) => c.id === gameId)?.title ?? 'Expedition Arcade';
}

export function ArcadeHub({ initialMode = 'hub', onExitToMap }: ArcadeHubProps) {
  const { vault, activeProfile } = useVaultStore();
  const [arcadeTier, setArcadeTier] = useState<ArcadeProficiencyTier>('sprout');
  const [coopEnabled, setCoopEnabled] = useState(false);
  const [playerOneId, setPlayerOneId] = useState<string>(() => activeProfile.id);
  const [playerTwoId, setPlayerTwoId] = useState<string>(
    () => vault.profiles.find((p) => p.id !== activeProfile.id)?.id ?? activeProfile.id
  );
  const [coopMatch, setCoopMatch] = useState<CoopMatchState | null>(null);
  const [mode, setMode] = useState<ArcadeGameMode>(initialMode);
  const [page, setPage] = useState<0 | 1 | 2>(0);
  const [plainOpen, setPlainOpen] = useState(false);

  const hasMultipleProfiles = vault.profiles.length >= 2;
  const { p1, p2 } = useMemo(() => {
    if (vault.profiles.length < 2) {
      return { p1: activeProfile, p2: undefined as KidProfile | undefined };
    }
    const first =
      vault.profiles.find((p) => p.id === playerOneId) ??
      vault.profiles.find((p) => p.id === activeProfile.id) ??
      vault.profiles[0];
    const second =
      vault.profiles.find((p) => p.id === playerTwoId && p.id !== first.id) ??
      vault.profiles.find((p) => p.id !== first.id);
    return { p1: first, p2: second };
  }, [vault.profiles, activeProfile, playerOneId, playerTwoId]);

  const effectiveCoopEnabled = coopEnabled && hasMultipleProfiles && Boolean(p2);
  const isCoopKidQuarantined =
    effectiveCoopEnabled &&
    (!p1 ||
      !p2 ||
      isDefaultKidProfileId(p1.id) ||
      !p1.adultModeUnlocked ||
      isDefaultKidProfileId(p2.id) ||
      !p2.adultModeUnlocked);

  const resolveTurnLanguage = (
    player: KidProfile | undefined,
    quarantined: boolean
  ): LanguageCode => {
    if (!player) return 'es';
    if (quarantined) {
      return resolveSafeBaseLanguage(player, activeProfile);
    }
    return player.activeLanguage;
  };

  useEffect(() => {
    if (!coopEnabled) {
      setPlayerOneId(activeProfile.id);
      const distinctPartner = vault.profiles.find((p) => p.id !== activeProfile.id);
      if (distinctPartner) {
        setPlayerTwoId(distinctPartner.id);
      }
    }
  }, [coopEnabled, activeProfile.id, vault.profiles]);

  const p1HubLanguage = resolveTurnLanguage(p1, isCoopKidQuarantined);
  const hubDeckOverride = useMemo(
    () =>
      effectiveCoopEnabled
        ? {
            profile: p1,
            languageOverride: p1HubLanguage,
            kidQuarantined: isCoopKidQuarantined,
          }
        : undefined,
    [effectiveCoopEnabled, p1, p1HubLanguage, isCoopKidQuarantined]
  );

  const { language, targetLexicon, bestScoreFor, tierMeta } = useArcadeDeck(
    arcadeTier,
    hubDeckOverride
  );
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
  const hubProfile = effectiveCoopEnabled ? p1 : activeProfile;
  const showAdultDirectionBadge =
    !isCoopKidQuarantined &&
    Boolean(courseMeta.isAdultOnly && courseMeta.pairDirectionBadge) &&
    isAdultArcadeActive(language, hubProfile);

  const hubSampleItem = targetLexicon[0];
  const hubPlainResult =
    plainOpen && showAdultDirectionBadge && hubSampleItem
      ? resolveArcadePlainEnglish(hubSampleItem)
      : null;

  useEffect(() => {
    setMode(initialMode);
    setCoopMatch(null);
  }, [initialMode]);

  const handleSelectP1 = (nextId: string) => {
    playSfx('tile_tap', 0);
    if (nextId === p2?.id && p1) {
      setPlayerTwoId(p1.id);
    }
    setPlayerOneId(nextId);
  };

  const handleSelectP2 = (nextId: string) => {
    playSfx('tile_tap', 1);
    if (nextId === p1.id && p2) {
      setPlayerOneId(p2.id);
    }
    setPlayerTwoId(nextId);
  };

  const launchCabinet = (cabId: Exclude<ArcadeGameMode, 'hub'>) => {
    if (cabId === 'starlight_choir') {
      playSfx('secret_fanfare');
    } else {
      playSfx('whoosh_transition');
    }
    if (effectiveCoopEnabled && p2) {
      setCoopMatch({
        stage: 'playing_turn_1',
        gameId: cabId,
        p1,
        p2,
        kidQuarantined: isCoopKidQuarantined,
        p1Language: resolveTurnLanguage(p1, isCoopKidQuarantined),
        p2Language: resolveTurnLanguage(p2, isCoopKidQuarantined),
      });
    } else {
      setCoopMatch(null);
    }
    setMode(cabId);
  };

  const handleExitToHub = () => {
    setCoopMatch(null);
    setMode('hub');
  };

  const handleCoopRoundSettled = (result: ArcadeCoopSettledResult) => {
    if (!coopMatch) return;
    if (coopMatch.stage === 'playing_turn_1') {
      setCoopMatch({
        ...coopMatch,
        stage: 'handoff',
        p1Result: result,
      });
      return;
    }
    if (coopMatch.stage === 'playing_turn_2') {
      const coopBonusGems = Math.max(
        2,
        Math.round((coopMatch.p1Result.bonusGems + result.bonusGems) / 2)
      );
      const coopXpEarned = Math.max(
        10,
        Math.round((coopMatch.p1Result.xpEarned + result.xpEarned) / 2)
      );
      const coopVault = vaultActions as typeof vaultActions & {
        recordCoopArcadeSession?: (p: CoopArcadeSessionParams) => CoopArcadeSessionSummary | null;
      };
      const persisted =
        coopVault.recordCoopArcadeSession?.({
          gameId: coopMatch.gameId,
          playerOneId: coopMatch.p1.id,
          playerOneScore: coopMatch.p1Result.score,
          playerTwoId: coopMatch.p2.id,
          playerTwoScore: result.score,
          bonusGems: coopBonusGems,
          xpEarned: coopXpEarned,
        }) ?? null;

      const p1Won = coopMatch.p1Result.score > result.score;
      const p2Won = result.score > coopMatch.p1Result.score;
      const isTieScore = !p1Won && !p2Won;
      const sessionSummary: CoopArcadeSessionSummary = persisted ?? {
        winnerProfileId: p1Won ? coopMatch.p1.id : p2Won ? coopMatch.p2.id : 'tie',
        combinedScore: coopMatch.p1Result.score + result.score,
        playerOneGemsAwarded: coopBonusGems + (isTieScore ? 3 : p1Won ? 5 : 0),
        playerTwoGemsAwarded: coopBonusGems + (isTieScore ? 3 : p2Won ? 5 : 0),
        xpAwardedEach: coopXpEarned,
      };

      setCoopMatch({
        stage: 'summary',
        gameId: coopMatch.gameId,
        p1: coopMatch.p1,
        p2: coopMatch.p2,
        p1Result: coopMatch.p1Result,
        p2Result: result,
        sessionSummary,
      });
    }
  };

  const secretUnlocked = effectiveCoopEnabled
    ? Boolean(
        p1.secretArcadeUnlocked || p2?.secretArcadeUnlocked || activeProfile.secretArcadeUnlocked
      )
    : Boolean(activeProfile.secretArcadeUnlocked);

  if (coopMatch?.stage === 'handoff') {
    const cabinetTitle = getCabinetTitle(coopMatch.gameId);
    return (
      <section
        ref={containerRef}
        aria-label="2P Family Co-Op Handoff"
        style={{
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="arcade-coop-handoff"
          style={{
            ...CARD_SURFACE_STYLE,
            flex: 1,
            minHeight: 0,
            padding: isCompact ? 14 : 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCompact ? 10 : 14,
            textAlign: 'center',
            overflowY: 'auto',
          }}
        >
          <ConfettiBurst active intensity="medium" />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--tint-amber-bg, #fffbeb)',
              border: '1.5px solid var(--tint-amber-border, #fbbf24)',
              color: 'var(--tint-amber-ink, #92400e)',
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '0.7rem' : '0.78rem',
              fontWeight: 900,
            }}
          >
            <Sparkles size={13} />
            <span>TURN 1 COMPLETE • {cabinetTitle}</span>
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isCompact ? 10 : 16,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: isCompact ? '6px 10px' : '8px 14px',
                borderRadius: 14,
                background: 'var(--card-soft-bg, #f8fafc)',
                border: `2px solid ${coopMatch.p1.bannerColor || '#2563eb'}`,
              }}
            >
              <AvatarBadge avatarId={coopMatch.p1.avatarId} size={isCompact ? 30 : 38} />
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: isCompact ? '0.72rem' : '0.8rem',
                    fontWeight: 900,
                    color: 'var(--text-muted, #475569)',
                  }}
                >
                  {coopMatch.p1.name} (P1)
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isCompact ? '0.96rem' : '1.12rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #1e1b4b)',
                  }}
                >
                  Score: {coopMatch.p1Result.score}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 4,
                borderRadius: 999,
                background: coopMatch.p2.bannerColor || '#ec4899',
                display: 'inline-flex',
              }}
            >
              <AvatarBadge avatarId={coopMatch.p2.avatarId} size={isCompact ? 48 : 64} />
            </div>
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '1.18rem' : '1.52rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e1b4b)',
              lineHeight: 1.15,
            }}
          >
            Pass Console to {coopMatch.p2.name}!
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 440,
              fontSize: isCompact ? '0.82rem' : '0.92rem',
              fontWeight: 700,
              color: 'var(--text-muted, #475569)',
              lineHeight: 1.35,
            }}
          >
            {coopMatch.p1.name} scored {coopMatch.p1Result.score} points! Hand the screen to{' '}
            {coopMatch.p2.name} to combine scores in the Family Co-Op Finale!
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 2,
            }}
          >
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-primary"
              onClick={() => {
                playSfx('whoosh_transition');
                setCoopMatch({
                  ...coopMatch,
                  stage: 'playing_turn_2',
                });
              }}
            >
              <Play size={17} />
              <span>Start {coopMatch.p2.name}&apos;s Turn!</span>
            </button>

            <button
              type="button"
              className="tactile-btn tactile-btn-hero"
              style={SOFT_BTN_STYLE}
              onClick={() => {
                playSfx('button_click');
                handleExitToHub();
              }}
            >
              Back to Arcade Hub
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (coopMatch?.stage === 'summary') {
    const { p1: mp1, p2: mp2, p1Result, p2Result, sessionSummary } = coopMatch;
    const isTie = sessionSummary.winnerProfileId === 'tie';
    const winnerName =
      sessionSummary.winnerProfileId === mp1.id ? mp1.name : mp2.name;
    const p1HasCrown = isTie || sessionSummary.winnerProfileId === mp1.id;
    const p2HasCrown = isTie || sessionSummary.winnerProfileId === mp2.id;

    return (
      <section
        ref={containerRef}
        aria-label="Family Co-Op Finale"
        style={{
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="arcade-coop-summary"
          style={{
            ...CARD_SURFACE_STYLE,
            flex: 1,
            minHeight: 0,
            padding: isCompact ? 12 : 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCompact ? 8 : 12,
            textAlign: 'center',
            overflowY: 'auto',
          }}
        >
          <ConfettiBurst active intensity="grand" />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: isCompact ? '3px 10px' : '4px 12px',
              borderRadius: 999,
              background: 'var(--tint-amber-bg, #fffbeb)',
              border: '1.5px solid var(--tint-amber-border, #f59e0b)',
              color: 'var(--tint-amber-ink, #92400e)',
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '0.72rem' : '0.82rem',
              fontWeight: 900,
            }}
          >
            <Crown size={14} />
            <span>{isTie ? "It's a Family Tie!" : `${winnerName} Wins the Crown!`}</span>
          </span>

          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: isCompact ? '1.18rem' : '1.48rem',
              fontWeight: 900,
              color: 'var(--text-main, #1e1b4b)',
              lineHeight: 1.12,
            }}
          >
            Family Co-Op Finale!
          </h2>

          <div
            className="hud-pill hud-pill-static"
            style={{
              background: 'var(--tint-indigo-bg, #eef2ff)',
              borderColor: 'var(--tint-indigo-border, #818cf8)',
              color: 'var(--tint-indigo-ink, #312e81)',
              padding: isCompact ? '4px 12px' : '6px 16px',
              fontSize: isCompact ? '0.82rem' : '0.94rem',
            }}
          >
            <Trophy size={15} />
            <span>Combined Team Score: {sessionSummary.combinedScore}</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: isCompact ? 8 : 12,
              width: '100%',
              maxWidth: 560,
            }}
          >
            {[
              {
                label: 'Player 1',
                profile: mp1,
                score: p1Result.score,
                gems: sessionSummary.playerOneGemsAwarded,
                hasCrown: p1HasCrown,
              },
              {
                label: 'Player 2',
                profile: mp2,
                score: p2Result.score,
                gems: sessionSummary.playerTwoGemsAwarded,
                hasCrown: p2HasCrown,
              },
            ].map((entry) => (
              <div
                key={entry.profile.id}
                style={{
                  padding: isCompact ? '9px 8px' : '12px 14px',
                  borderRadius: 16,
                  background: 'var(--card-soft-bg, #f8fafc)',
                  borderTopWidth: 2,
                  borderRightWidth: 2,
                  borderLeftWidth: 2,
                  borderBottomWidth: 4,
                  borderStyle: 'solid',
                  borderColor: entry.hasCrown
                    ? '#f59e0b'
                    : entry.profile.bannerColor || 'var(--card-border, #cbd5e1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: isCompact ? 4 : 6,
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AvatarBadge
                    avatarId={entry.profile.avatarId}
                    size={isCompact ? 28 : 38}
                  />
                  {entry.hasCrown ? (
                    <Crown size={isCompact ? 15 : 18} color="#f59e0b" fill="#fde047" />
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isCompact ? '0.82rem' : '0.96rem',
                    fontWeight: 900,
                    color: 'var(--text-main, #1e1b4b)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.profile.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: isCompact ? '1.05rem' : '1.26rem',
                    fontWeight: 900,
                    color: 'var(--lang-primary, #2563eb)',
                  }}
                >
                  {entry.score} pts
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    fontSize: isCompact ? '0.68rem' : '0.76rem',
                    fontWeight: 800,
                    color: 'var(--text-muted, #475569)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Gem size={11} /> +{entry.gems}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    <Sparkles size={11} /> +{sessionSummary.xpAwardedEach} XP
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 2,
            }}
          >
            <button
              type="button"
              className="tactile-btn tactile-btn-hero tactile-btn-primary"
              onClick={() => launchCabinet(coopMatch.gameId)}
            >
              <RotateCcw size={16} />
              <span>Play Co-Op Again!</span>
            </button>

            <button
              type="button"
              className="tactile-btn tactile-btn-hero"
              style={SOFT_BTN_STYLE}
              onClick={() => {
                playSfx('button_click');
                handleExitToHub();
              }}
            >
              Back to Arcade Hub
            </button>
          </div>
        </div>
      </section>
    );
  }

  const activeCoopTurnValue: CoopArcadeTurnContextValue | null =
    coopMatch && (coopMatch.stage === 'playing_turn_1' || coopMatch.stage === 'playing_turn_2')
      ? {
          turnNumber: coopMatch.stage === 'playing_turn_1' ? 1 : 2,
          playerProfile: coopMatch.stage === 'playing_turn_1' ? coopMatch.p1 : coopMatch.p2,
          partnerProfile: coopMatch.stage === 'playing_turn_1' ? coopMatch.p2 : coopMatch.p1,
          languageOverride:
            coopMatch.stage === 'playing_turn_1'
              ? coopMatch.p1Language
              : coopMatch.p2Language,
          kidQuarantined: coopMatch.kidQuarantined,
          onRoundSettled: handleCoopRoundSettled,
        }
      : null;

  const renderCabinet = (cabinetMode: Exclude<ArcadeGameMode, 'hub'>): ReactNode => {
    const turnKey = coopMatch
      ? `coop-${coopMatch.stage}-${cabinetMode}`
      : `solo-${cabinetMode}`;
    if (cabinetMode === 'sky_catcher') {
      return <SkyCatcherArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'meteor_blaster') {
      return <MeteorBlasterArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'tower_stack') {
      return <TowerStackArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'constellation_memory') {
      return (
        <ConstellationMemoryArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />
      );
    }
    if (cabinetMode === 'train_switcher') {
      return <TrainSwitcherArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'rhythm_chef') {
      return <RhythmChefArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'cafe_order_rush') {
      return <CafeOrderRushArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'starlight_bridge') {
      return <StarlightBridgeArcade key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    if (cabinetMode === 'starlight_choir' && secretUnlocked) {
      return <StarlightSecretGame key={turnKey} arcadeTier={arcadeTier} onExit={handleExitToHub} />;
    }
    return null;
  };

  if (mode !== 'hub') {
    const cabinetNode = renderCabinet(mode);
    if (cabinetNode) {
      return activeCoopTurnValue ? (
        <CoopArcadeTurnProvider value={activeCoopTurnValue}>
          {cabinetNode}
        </CoopArcadeTurnProvider>
      ) : (
        <>{cabinetNode}</>
      );
    }
  }

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
                  {hubSampleItem ? (
                    <ArcadeSayItNormallyButton
                      item={hubSampleItem}
                      language={language}
                      isCompact={isCompact}
                      open={plainOpen}
                      onToggle={(nextOpen) => setPlainOpen(nextOpen)}
                    />
                  ) : null}
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

            {hasMultipleProfiles ? (
              <button
                type="button"
                data-testid="arcade-coop-toggle"
                aria-pressed={effectiveCoopEnabled}
                className="tactile-btn"
                onClick={() => {
                  playSfx('button_click');
                  setCoopEnabled((prev) => !prev);
                }}
                style={{
                  ...(effectiveCoopEnabled
                    ? {
                        background: 'var(--tint-indigo-bg, #eef2ff)',
                        borderTopWidth: 2,
                        borderRightWidth: 2,
                        borderLeftWidth: 2,
                        borderBottomWidth: 3,
                        borderStyle: 'solid',
                        borderColor: '#6366f1',
                        color: 'var(--tint-indigo-ink, #312e81)',
                      }
                    : {
                        ...SOFT_BTN_STYLE,
                        borderTopWidth: 2,
                        borderRightWidth: 2,
                        borderLeftWidth: 2,
                        borderBottomWidth: 3,
                        borderStyle: 'solid',
                      }),
                  padding: isCompact ? '3px 7px' : '4px 10px',
                  fontSize: isCompact ? '0.68rem' : '0.75rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                <Users size={isCompact ? 12 : 13} />
                <span>2P Family Co-Op</span>
              </button>
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
              <span>Wins: {hubProfile.stats.arcadeGamesWon}</span>
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

        {effectiveCoopEnabled && p2 ? (
          <div
            data-testid="arcade-coop-roster-bar"
            style={{
              display: 'grid',
              gridTemplateColumns: isNarrow
                ? 'minmax(0, 1fr) auto minmax(0, 1fr)'
                : 'auto auto auto 1fr',
              alignItems: 'center',
              gap: isCompact ? 5 : 8,
              padding: isCompact ? '4px 7px' : '5px 10px',
              borderRadius: 12,
              background: 'var(--tint-indigo-bg, #eef2ff)',
              border: '1.5px solid var(--tint-indigo-border, #818cf8)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
                fontSize: isCompact ? '0.66rem' : '0.74rem',
                fontWeight: 900,
                color: 'var(--tint-indigo-ink, #312e81)',
              }}
            >
              <span style={{ flexShrink: 0 }}>P1</span>
              <select
                data-testid="coop-p1-select"
                aria-label="Player 1 profile"
                value={p1.id}
                onChange={(e) => handleSelectP1(e.target.value)}
                style={{
                  minWidth: 0,
                  width: isNarrow ? '100%' : 'auto',
                  padding: isCompact ? '2px 4px' : '3px 8px',
                  borderRadius: 8,
                  border: '1.5px solid var(--card-border, #cbd5e1)',
                  background: 'var(--input-bg, #ffffff)',
                  color: 'var(--text-main, #1e1b4b)',
                  fontFamily: 'var(--font-display)',
                  fontSize: isCompact ? '0.7rem' : '0.78rem',
                  fontWeight: 800,
                }}
              >
                {vault.profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </label>

            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: isCompact ? '0.66rem' : '0.74rem',
                fontWeight: 900,
                color: 'var(--tint-indigo-ink, #312e81)',
                textAlign: 'center',
              }}
            >
              vs
            </span>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minWidth: 0,
                fontSize: isCompact ? '0.66rem' : '0.74rem',
                fontWeight: 900,
                color: 'var(--tint-indigo-ink, #312e81)',
              }}
            >
              <span style={{ flexShrink: 0 }}>P2</span>
              <select
                data-testid="coop-p2-select"
                aria-label="Player 2 profile"
                value={p2.id}
                onChange={(e) => handleSelectP2(e.target.value)}
                style={{
                  minWidth: 0,
                  width: isNarrow ? '100%' : 'auto',
                  padding: isCompact ? '2px 4px' : '3px 8px',
                  borderRadius: 8,
                  border: '1.5px solid var(--card-border, #cbd5e1)',
                  background: 'var(--input-bg, #ffffff)',
                  color: 'var(--text-main, #1e1b4b)',
                  fontFamily: 'var(--font-display)',
                  fontSize: isCompact ? '0.7rem' : '0.78rem',
                  fontWeight: 800,
                }}
              >
                {vault.profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </label>

            {!isNarrow ? (
              <span
                style={{
                  fontSize: '0.71rem',
                  fontWeight: 800,
                  color: 'var(--tint-indigo-ink, #312e81)',
                  justifySelf: 'end',
                  whiteSpace: 'nowrap',
                }}
              >
                Pass-and-play • Pick any cabinet!
              </span>
            ) : null}
          </div>
        ) : null}

        {hubPlainResult ? (
          <ArcadePlainEnglishCallout
            result={hubPlainResult}
            isCompact={isCompact}
            onClose={() => setPlainOpen(false)}
          />
        ) : null}

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
                onClick={() => launchCabinet(cab.id)}
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
                  onClick={() => launchCabinet('starlight_choir')}
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
