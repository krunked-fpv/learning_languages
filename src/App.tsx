import { useEffect, useState, type CSSProperties } from 'react';
import { setAudioPreferences } from './audio';
import { SkyCatcherArcade } from './components/arcade/SkyCatcherArcade';
import { LessonArena } from './components/lesson/LessonArena';
import { AdventureMap } from './components/map/AdventureMap';
import { CompanionShop } from './components/meta/CompanionShop';
import { LeagueAndBadges } from './components/meta/LeagueAndBadges';
import { PhrasebookVault } from './components/meta/PhrasebookVault';
import { BottomNav, type NavTabId } from './components/shell/BottomNav';
import { ProfileVaultModal } from './components/shell/ProfileVaultModal';
import { TopHud } from './components/shell/TopHud';
import { getCourse } from './curriculum';
import { useVaultStore, vaultActions } from './store/useVaultStore';
import { LANGUAGE_META, type MapNode } from './types/contracts';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function App() {
  const { vault, activeProfile, activeProgress } = useVaultStore();
  const [activeTab, setActiveTab] = useState<NavTabId>('map');
  const [activeNode, setActiveNode] = useState<MapNode | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  // Sync persisted audio volume & mute preferences into Web Audio + Speech engines
  useEffect(() => {
    setAudioPreferences(vault.audioSettings);
  }, [vault.audioSettings]);

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
      {activeNode ? (
        <LessonArena
          node={activeNode}
          language={activeProfile.activeLanguage}
          onExit={() => setActiveNode(null)}
        />
      ) : (
        <div className="app-shell-body">
          <BottomNav
            activeTab={activeTab}
            unlockedPhraseCount={activeProgress.unlockedVocabIds.length}
            activeLanguage={activeProfile.activeLanguage}
            onSelectTab={setActiveTab}
          />

          <div className="app-main-column">
            <TopHud
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onOpenArcade={() => setActiveTab('arcade')}
              canInstallApp={Boolean(installPrompt) && !isStandalone}
              onInstallApp={() => {
                void handleInstallClick();
              }}
            />

            <main className="app-main-content">
              {activeTab === 'map' ? (
                <AdventureMap
                  course={course}
                  progress={activeProgress}
                  equippedCosmetics={activeProfile.equippedCosmetics}
                  onSelectNode={(node) => setActiveNode(node)}
                  onSelectUnit={(unitIndex) =>
                    vaultActions.setCurrentUnitIndex(activeProfile.activeLanguage, unitIndex)
                  }
                />
              ) : null}

              {activeTab === 'phrasebook' ? <PhrasebookVault /> : null}

              {activeTab === 'arcade' ? (
                <SkyCatcherArcade onExit={() => setActiveTab('map')} />
              ) : null}

              {activeTab === 'leagues' ? <LeagueAndBadges /> : null}

              {activeTab === 'shop' ? <CompanionShop /> : null}
            </main>
          </div>
        </div>
      )}

      {profileModalOpen ? (
        <ProfileVaultModal onClose={() => setProfileModalOpen(false)} />
      ) : null}
    </div>
  );
}

export default App;
