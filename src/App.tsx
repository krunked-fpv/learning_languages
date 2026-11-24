import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
} from 'react';
import { motion } from 'framer-motion';
import { Music, Sparkles } from 'lucide-react';
import { FlagIcon } from './art/FlagIcon';
import { playSfx, setAudioPreferences } from './audio';
import { ArcadeHub, type ArcadeGameMode } from './components/arcade/ArcadeHub';
import { MascotStage } from './components/characters/MascotStage';
import { AmbientBackdrop } from './components/fx/AmbientBackdrop';
import { ConfettiBurst } from './components/fx/JuiceEngine';
import { LessonArena } from './components/lesson/LessonArena';
import { AdventureMap, type AdventureMapProps } from './components/map/AdventureMap';
import { CompanionShop } from './components/meta/CompanionShop';
import { LeagueAndBadges } from './components/meta/LeagueAndBadges';
import { PhrasebookVault } from './components/meta/PhrasebookVault';
import { BottomNav, type NavTabId } from './components/shell/BottomNav';
import { ProfileVaultModal } from './components/shell/ProfileVaultModal';
import { TopHud } from './components/shell/TopHud';
import {
  retryAdultCourseLoad,
  retryBaseCourseLoad,
  useAdultLoadError,
  useBaseLoadError,
  useEnsureAdultCurriculum,
  useEnsureBaseCurriculum,
} from './components/shell/adultCurriculumSync';
import { safeVaultActions } from './components/shell/vaultSafeActions';
import { ensureAccessibleButtonBg } from './components/lesson/lessonHelpers';
import * as curriculum from './curriculum';
import { getCourse } from './curriculum';
import { useVaultStore, vaultActions } from './store/useVaultStore';
import {
  LANGUAGE_META,
  isAdultLanguage,
  type CoopSafeAtlasMask,
  type LanguageCode,
  type MapNode,
  type ProficiencyTier,
  type VocabMasteryEntry,
} from './types/contracts';

const DARK_UI_THEMES = new Set<string>([
  'theme_cosmic_galaxy',
  'theme_aurora_borealis',
  'theme_starlight_indigo',
  'theme_royal_velvet',
  'theme_emerald_rainforest',
  'theme_neon_night_market',
  'theme_laureate_imperial',
]);

const AdaptiveAdventureMap = AdventureMap as ComponentType<
  AdventureMapProps & {
    onStartTierCheckpoint?: (targetTier: Exclude<ProficiencyTier, 'A1'>) => void;
    onStartSrsQuest?: () => void;
  }
>;

type ArcadeHubWithMaskProps = ComponentProps<typeof ArcadeHub> & {
  onCoopSafeMaskChange?: (mask: CoopSafeAtlasMask) => void;
};
const ArcadeHubComponent = ArcadeHub as ComponentType<ArcadeHubWithMaskProps>;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function TrackLoadingCardShell({
  testId,
  language,
  badgeText,
  subtitle,
  loadError,
  bodyText,
  onRetry,
  secondaryLabel,
  onSecondaryAction,
}: {
  testId: string;
  language: LanguageCode;
  badgeText: string;
  subtitle?: string;
  loadError: string | null;
  bodyText: string;
  onRetry: () => void;
  secondaryLabel: string;
  onSecondaryAction: () => void;
}) {
  const meta = LANGUAGE_META[language];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      style={{
        height: '100%',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        overflow: 'hidden',
      }}
    >
      <div
        className="tactile-card"
        style={{
          maxWidth: 460,
          width: '100%',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          textAlign: 'center',
          background: 'var(--card-bg)',
          color: 'var(--text-main)',
          borderColor: loadError ? 'var(--tint-amber-border)' : 'var(--lang-primary)',
        }}
      >
        <FlagIcon language={language} size={44} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 999,
            background: loadError ? 'var(--tint-amber-bg)' : 'var(--tint-indigo-bg)',
            border: `1.5px solid ${loadError ? 'var(--tint-amber-border)' : 'var(--tint-indigo-border)'}`,
            color: loadError ? 'var(--tint-amber-ink)' : 'var(--tint-indigo-ink)',
            fontSize: '0.72rem',
            fontWeight: 900,
          }}
        >
          <Sparkles size={13} />
          <span>{badgeText}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 900, color: 'var(--text-main)' }}>
          {meta.landTitle}
        </h2>
        {subtitle ? (
          <div
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--card-soft-bg)',
              border: '1.5px solid var(--card-border)',
              fontSize: '0.76rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              maxWidth: '100%',
              overflowWrap: 'break-word',
            }}
          >
            {subtitle}
          </div>
        ) : null}
        {loadError ? (
          <>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1.45 }}>
              {bodyText}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-primary"
                onClick={onRetry}
              >
                Retry Loading
              </button>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                onClick={onSecondaryAction}
              >
                {secondaryLabel}
              </button>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {bodyText}
          </p>
        )}
      </div>
    </div>
  );
}

function AdultTrackLoadingCard({
  language,
  onReturnToKidAtlas,
}: {
  language: LanguageCode;
  onReturnToKidAtlas?: () => void;
}) {
  const meta = LANGUAGE_META[language];
  const loadError = useAdultLoadError(language);

  return (
    <TrackLoadingCardShell
      testId="adult-track-loading-card"
      language={language}
      badgeText={loadError ? 'OFFLINE FALLBACK' : 'AFTER-HOURS ATLAS'}
      subtitle={meta.pairDirectionBadge}
      loadError={loadError}
      bodyText={
        loadError
          ? `You're offline right now and ${meta.name} with ${meta.companionName} hasn't been cached yet. Reconnect to download this track, or hop back to the Kid Atlas anytime!`
          : `Loading ${meta.name} track with ${meta.companionName}...`
      }
      onRetry={() => {
        playSfx('button_click');
        retryAdultCourseLoad(language);
      }}
      secondaryLabel="Return to Kid Atlas"
      onSecondaryAction={() => {
        playSfx('whoosh_transition');
        safeVaultActions.setAdultModeActive(false);
        onReturnToKidAtlas?.();
      }}
    />
  );
}

function BaseTrackLoadingCard({
  language,
  onSwitchToSpanish,
}: {
  language: LanguageCode;
  onSwitchToSpanish?: () => void;
}) {
  const meta = LANGUAGE_META[language];
  const loadError = useBaseLoadError(language);

  return (
    <TrackLoadingCardShell
      testId="base-track-loading-card"
      language={language}
      badgeText={loadError ? 'OFFLINE FALLBACK' : 'STARLIGHT ATLAS'}
      subtitle={`${meta.name} · ${meta.nativeName}`}
      loadError={loadError}
      bodyText={
        loadError
          ? `You're offline right now and ${meta.name} with ${meta.companionName} hasn't been cached yet. Reconnect to download this track, or switch to Español anytime!`
          : `Loading ${meta.name} trail with ${meta.companionName}...`
      }
      onRetry={() => {
        playSfx('button_click');
        retryBaseCourseLoad(language);
      }}
      secondaryLabel="Switch to Español"
      onSecondaryAction={() => {
        playSfx('whoosh_transition');
        vaultActions.setActiveLanguage('es');
        onSwitchToSpanish?.();
      }}
    />
  );
}

export function App() {
  const { vault, activeProfile, activeProgress } = useVaultStore();
  const [activeTab, setActiveTab] = useState<NavTabId>('map');
  const [arcadeInitialMode, setArcadeInitialMode] = useState<ArcadeGameMode>('hub');
  const [coopSafeMask, setCoopSafeMask] = useState<CoopSafeAtlasMask>({
    active: false,
    safeLanguage: 'es',
  });
  const [activeNode, setActiveNode] = useState<MapNode | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [secretUnlockedModalOpen, setSecretUnlockedModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  const prevProfileIdRef = useRef<string>(activeProfile.id);
  const prevSecretUnlockedRef = useRef<boolean>(Boolean(activeProfile.secretArcadeUnlocked));
  const prevLessonProfileRef = useRef<string>(activeProfile.id);
  const prevLessonLanguageRef = useRef<LanguageCode>(activeProfile.activeLanguage);
  const prevAdultActiveRef = useRef<boolean>(Boolean(activeProfile.adultModeActive));

  // Sync persisted audio volume & mute preferences into Web Audio + Speech engines
  useEffect(() => {
    setAudioPreferences(vault.audioSettings);
  }, [vault.audioSettings]);

  // Clear Co-Op Safe Atlas masking whenever leaving the Arcade tab or entering a lesson
  useEffect(() => {
    if (activeTab !== 'arcade' || activeNode) {
      setCoopSafeMask((prev) => (prev.active ? { ...prev, active: false } : prev));
    }
  }, [activeTab, activeNode]);

  // Automatically close an active lesson when switching profiles, languages, or exiting Adult Mode
  useEffect(() => {
    const profileChanged = prevLessonProfileRef.current !== activeProfile.id;
    const languageChanged = prevLessonLanguageRef.current !== activeProfile.activeLanguage;
    const adultModeDisabled =
      prevAdultActiveRef.current && !Boolean(activeProfile.adultModeActive);

    prevLessonProfileRef.current = activeProfile.id;
    prevLessonLanguageRef.current = activeProfile.activeLanguage;
    prevAdultActiveRef.current = Boolean(activeProfile.adultModeActive);

    if (profileChanged || languageChanged || adultModeDisabled) {
      setActiveNode((current) => (current ? null : current));
    }
  }, [activeProfile.id, activeProfile.activeLanguage, activeProfile.adultModeActive]);

  // Detect secretArcadeUnlocked flipping false -> true for the same profile (Compass, 3 lessons, or Boss!)
  useEffect(() => {
    const isUnlockedNow = Boolean(activeProfile.secretArcadeUnlocked);
    if (prevProfileIdRef.current !== activeProfile.id) {
      prevProfileIdRef.current = activeProfile.id;
      prevSecretUnlockedRef.current = isUnlockedNow;
      return;
    }
    if (!prevSecretUnlockedRef.current && isUnlockedNow) {
      playSfx('secret_fanfare');
      setSecretUnlockedModalOpen(true);
    }
    prevSecretUnlockedRef.current = isUnlockedNow;
  }, [activeProfile.id, activeProfile.secretArcadeUnlocked]);

  // Listen for PWA install prompt & standalone display mode changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    mediaQuery?.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      mediaQuery?.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const isAdultModeActive = Boolean(activeProfile.adultModeActive);
  const effectiveLanguage: LanguageCode =
    !isAdultModeActive && isAdultLanguage(activeProfile.activeLanguage)
      ? (activeProfile.lastBaseLanguage ?? 'en')
      : activeProfile.activeLanguage;

  const adultRegistryVersion = useEnsureAdultCurriculum(isAdultModeActive, effectiveLanguage);
  const baseRegistryVersion = useEnsureBaseCurriculum(effectiveLanguage);

  const course = useMemo(
    () => getCourse(effectiveLanguage),
    [effectiveLanguage, adultRegistryVersion, baseRegistryVersion]
  );
  const isAdultCourseHydrating =
    isAdultLanguage(effectiveLanguage) && (course?.units?.length ?? 0) === 0;
  const isBaseCourseHydrating =
    !isAdultLanguage(effectiveLanguage) && (course?.units?.length ?? 0) === 0;

  const readOptionalCurriculumFn = <T,>(key: string): T | undefined => {
    try {
      if (!(key in curriculum)) return undefined;
      return (curriculum as Record<string, unknown>)[key] as T | undefined;
    } catch {
      return undefined;
    }
  };

  const handleStartTierCheckpoint = (targetTier: Exclude<ProficiencyTier, 'A1'>) => {
    if (isAdultCourseHydrating || isBaseCourseHydrating) return;
    const buildCheckpoint = readOptionalCurriculumFn<
      (lang: LanguageCode, tier: Exclude<ProficiencyTier, 'A1'>) => MapNode
    >('buildTierCheckpointNode');
    if (typeof buildCheckpoint === 'function') {
      const checkpointNode = buildCheckpoint(effectiveLanguage, targetTier);
      setActiveNode(checkpointNode);
    }
  };

  const handleStartSrsQuest = () => {
    if (isAdultCourseHydrating || isBaseCourseHydrating) return;
    const buildSrsQuest = readOptionalCurriculumFn<
      (
        lang: LanguageCode,
        unlockedVocabIds: readonly string[],
        vocabMastery?: Readonly<Record<string, VocabMasteryEntry>>,
        dateSeed?: string
      ) => MapNode | null
    >('buildSrsReviewQuestNode');
    if (typeof buildSrsQuest !== 'function') return;
    const questNode = buildSrsQuest(
      effectiveLanguage,
      activeProgress.unlockedVocabIds,
      activeProgress.vocabMastery
    );
    if (questNode) {
      setActiveNode(questNode);
    }
  };

  const effectiveDisplayLanguage: LanguageCode =
    activeTab === 'arcade' && coopSafeMask.active ? coopSafeMask.safeLanguage : effectiveLanguage;
  const palette = LANGUAGE_META[effectiveDisplayLanguage].accentPalette;
  const equippedTheme = activeProfile.equippedCosmetics.theme ?? 'default';

  const rootStyle = {
    '--lang-primary': palette.primary,
    '--lang-btn-bg': ensureAccessibleButtonBg(palette.primary),
    '--lang-secondary': palette.secondary,
    '--lang-glow': palette.glow,
    '--lang-bevel': palette.bevel,
    ...(DARK_UI_THEMES.has(equippedTheme) ? {} : { '--lang-tint': palette.surfaceTint }),
  } as CSSProperties;

  useEffect(() => {
    if (!secretUnlockedModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSecretUnlockedModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [secretUnlockedModalOpen]);

  return (
    <div
      className={`app-root ${activeNode ? 'is-lesson-active' : ''}`}
      data-theme={equippedTheme}
      data-language={effectiveDisplayLanguage}
      style={rootStyle}
    >
      <AmbientBackdrop theme={equippedTheme} />

      {activeNode ? (
        isAdultCourseHydrating ? (
          <div className="lesson-arena-shell" style={{ zIndex: 45 }}>
            <div className="lesson-arena-stage">
              <div className="lesson-arena-stage-inner">
                <AdultTrackLoadingCard
                  language={effectiveLanguage}
                  onReturnToKidAtlas={() => setActiveNode(null)}
                />
              </div>
            </div>
          </div>
        ) : isBaseCourseHydrating ? (
          <div className="lesson-arena-shell" style={{ zIndex: 45 }}>
            <div className="lesson-arena-stage">
              <div className="lesson-arena-stage-inner">
                <BaseTrackLoadingCard
                  language={effectiveLanguage}
                  onSwitchToSpanish={() => setActiveNode(null)}
                />
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            key={`arena-${activeNode.id}`}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, duration: 0.21 }}
            style={{ position: 'relative', zIndex: 45 }}
          >
            <LessonArena
              node={activeNode}
              language={effectiveLanguage}
              onExit={() => setActiveNode(null)}
            />
          </motion.div>
        )
      ) : (
        <div className="app-shell-body">
          <TopHud
            onOpenProfileModal={() => setProfileModalOpen(true)}
            onOpenArcade={() => {
              setArcadeInitialMode('sky_catcher');
              setActiveTab('arcade');
            }}
            onOpenShop={() => setActiveTab('shop')}
            canInstallApp={Boolean(installPrompt) && !isStandalone}
            onInstallApp={() => {
              void handleInstallClick();
            }}
            coopSafeMask={activeTab === 'arcade' ? coopSafeMask : undefined}
          />

          <div className="app-main-column">
            <main className="app-main-content">
              <motion.div
                key={`${activeTab}-${effectiveLanguage}`}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30, duration: 0.21 }}
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {activeTab === 'map' ? (
                  isAdultCourseHydrating ? (
                    <AdultTrackLoadingCard language={effectiveLanguage} />
                  ) : isBaseCourseHydrating ? (
                    <BaseTrackLoadingCard language={effectiveLanguage} />
                  ) : (
                    <AdaptiveAdventureMap
                      course={course}
                      progress={activeProgress}
                      equippedCosmetics={activeProfile.equippedCosmetics}
                      onSelectNode={(node) => setActiveNode(node)}
                      onSelectUnit={(unitIndex) =>
                        vaultActions.setCurrentUnitIndex(effectiveLanguage, unitIndex)
                      }
                      onStartTierCheckpoint={handleStartTierCheckpoint}
                      onStartSrsQuest={handleStartSrsQuest}
                    />
                  )
                ) : null}

                {activeTab === 'phrasebook' ? (
                  isAdultCourseHydrating ? (
                    <AdultTrackLoadingCard language={effectiveLanguage} />
                  ) : isBaseCourseHydrating ? (
                    <BaseTrackLoadingCard language={effectiveLanguage} />
                  ) : (
                    <PhrasebookVault />
                  )
                ) : null}

                {activeTab === 'arcade' ? (
                  isAdultCourseHydrating ? (
                    <AdultTrackLoadingCard language={effectiveLanguage} />
                  ) : isBaseCourseHydrating ? (
                    <BaseTrackLoadingCard language={effectiveLanguage} />
                  ) : (
                    <ArcadeHubComponent
                      initialMode={arcadeInitialMode}
                      onExitToMap={() => setActiveTab('map')}
                      onCoopSafeMaskChange={setCoopSafeMask}
                    />
                  )
                ) : null}

                {activeTab === 'leagues' ? <LeagueAndBadges /> : null}

                {activeTab === 'shop' ? <CompanionShop /> : null}
              </motion.div>
            </main>
          </div>

          <BottomNav
            activeTab={activeTab}
            unlockedPhraseCount={activeProgress.unlockedVocabIds.length}
            activeLanguage={effectiveDisplayLanguage}
            onSelectTab={(tab) => {
              if (tab === 'arcade') {
                setArcadeInitialMode('hub');
              }
              setActiveTab(tab);
            }}
          />
        </div>
      )}

      {profileModalOpen ? (
        <ProfileVaultModal
          coopSafeMask={activeTab === 'arcade' ? coopSafeMask : undefined}
          onClose={() => setProfileModalOpen(false)}
        />
      ) : null}

      {/* Secret Mini-Game Unlock Celebration Modal */}
      {secretUnlockedModalOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Secret Unlocked: Starlight Critter Choir"
        >
          <ConfettiBurst active intensity="grand" />
          <div className="modal-card" style={{ maxWidth: 470, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MascotStage
                companionId="pip"
                pose="victory_dance"
                equippedCosmetics={activeProfile.equippedCosmetics}
                comboCount={6}
                size={136}
                badgeText="SECRET UNLOCKED!"
              />
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: 'var(--tint-amber-bg)',
                color: 'var(--tint-amber-ink)',
                fontWeight: 900,
                fontSize: '0.8rem',
                marginBottom: 8,
              }}
            >
              <Sparkles size={14} /> GOLDEN DISCOVERY!
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)' }}>
              SECRET UNLOCKED: Starlight Critter Choir!
            </h2>
            <p style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-muted)' }}>
              You awakened the musical Starlight Critter Choir mini-game! Pop singing word
              bubbles with all 5 companions and hit Disco Fever!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="tactile-btn tactile-btn-hero tactile-btn-indigo"
                onClick={() => {
                  playSfx('whoosh_transition');
                  setSecretUnlockedModalOpen(false);
                  setActiveNode(null);
                  setArcadeInitialMode('starlight_choir');
                  setActiveTab('arcade');
                }}
              >
                <Music size={18} />
                <span>Play Secret Game Now!</span>
              </button>
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                onClick={() => {
                  playSfx('button_click');
                  setSecretUnlockedModalOpen(false);
                }}
              >
                Keep Exploring
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
