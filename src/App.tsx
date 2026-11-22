import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Music, Sparkles } from 'lucide-react';
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
import * as curriculum from './curriculum';
import { getCourse } from './curriculum';
import { useVaultStore, vaultActions } from './store/useVaultStore';
import {
  LANGUAGE_META,
  type LanguageCode,
  type MapNode,
  type ProficiencyTier,
} from './types/contracts';

const AdaptiveAdventureMap = AdventureMap as ComponentType<
  AdventureMapProps & {
    onStartTierCheckpoint?: (targetTier: Exclude<ProficiencyTier, 'A1'>) => void;
  }
>;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function App() {
  const { vault, activeProfile, activeProgress } = useVaultStore();
  const [activeTab, setActiveTab] = useState<NavTabId>('map');
  const [arcadeInitialMode, setArcadeInitialMode] = useState<ArcadeGameMode>('hub');
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

  // Sync persisted audio volume & mute preferences into Web Audio + Speech engines
  useEffect(() => {
    setAudioPreferences(vault.audioSettings);
  }, [vault.audioSettings]);

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

  const handleStartTierCheckpoint = (targetTier: Exclude<ProficiencyTier, 'A1'>) => {
    const buildCheckpoint = (
      curriculum as {
        buildTierCheckpointNode?: (
          lang: LanguageCode,
          tier: Exclude<ProficiencyTier, 'A1'>
        ) => MapNode;
      }
    ).buildTierCheckpointNode;
    if (typeof buildCheckpoint === 'function') {
      const checkpointNode = buildCheckpoint(activeProfile.activeLanguage, targetTier);
      setActiveNode(checkpointNode);
    }
  };

  const course = getCourse(activeProfile.activeLanguage);
  const palette = LANGUAGE_META[activeProfile.activeLanguage].accentPalette;
  const equippedTheme = activeProfile.equippedCosmetics.theme ?? 'default';

  const rootStyle = {
    '--lang-primary': palette.primary,
    '--lang-secondary': palette.secondary,
    '--lang-glow': palette.glow,
    '--lang-bevel': palette.bevel,
    '--lang-tint': palette.surfaceTint,
  } as CSSProperties;

  return (
    <div
      className={`app-root ${activeNode ? 'is-lesson-active' : ''}`}
      data-theme={equippedTheme}
      data-language={activeProfile.activeLanguage}
      style={rootStyle}
    >
      <AmbientBackdrop theme={equippedTheme} />

      {activeNode ? (
        <motion.div
          key={`arena-${activeNode.id}`}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30, duration: 0.21 }}
          style={{ position: 'relative', zIndex: 45 }}
        >
          <LessonArena
            node={activeNode}
            language={activeProfile.activeLanguage}
            onExit={() => setActiveNode(null)}
          />
        </motion.div>
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
          />

          <div className="app-main-column">
            <main className="app-main-content">
              <motion.div
                key={`${activeTab}-${activeProfile.activeLanguage}`}
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
                  <AdaptiveAdventureMap
                    course={course}
                    progress={activeProgress}
                    equippedCosmetics={activeProfile.equippedCosmetics}
                    onSelectNode={(node) => setActiveNode(node)}
                    onSelectUnit={(unitIndex) =>
                      vaultActions.setCurrentUnitIndex(activeProfile.activeLanguage, unitIndex)
                    }
                    onStartTierCheckpoint={handleStartTierCheckpoint}
                  />
                ) : null}

                {activeTab === 'phrasebook' ? <PhrasebookVault /> : null}

                {activeTab === 'arcade' ? (
                  <ArcadeHub
                    initialMode={arcadeInitialMode}
                    onExitToMap={() => setActiveTab('map')}
                  />
                ) : null}

                {activeTab === 'leagues' ? <LeagueAndBadges /> : null}

                {activeTab === 'shop' ? <CompanionShop /> : null}
              </motion.div>
            </main>
          </div>

          <BottomNav
            activeTab={activeTab}
            unlockedPhraseCount={activeProgress.unlockedVocabIds.length}
            activeLanguage={activeProfile.activeLanguage}
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
        <ProfileVaultModal onClose={() => setProfileModalOpen(false)} />
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
