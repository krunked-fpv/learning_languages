import { FlagIcon } from './art/FlagIcon';
import { MascotStage } from './components/characters/MascotStage';
import { AdventureMap } from './components/map/AdventureMap';
import { getCourse } from './curriculum';
import { useVaultStore } from './store/useVaultStore';

export function App() {
  const { activeProfile, activeProgress } = useVaultStore();
  const course = getCourse(activeProfile.activeLanguage);

  return (
    <main>
      <FlagIcon language={activeProfile.activeLanguage} />
      <MascotStage companionId="pip" pose="idle" equippedCosmetics={activeProfile.equippedCosmetics} />
      <AdventureMap
        course={course}
        progress={activeProgress}
        equippedCosmetics={activeProfile.equippedCosmetics}
        onSelectNode={() => {}}
      />
    </main>
  );
}

export default App;
