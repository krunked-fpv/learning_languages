import { useSyncExternalStore } from 'react';
import type {
  AvatarId,
  CosmeticId,
  CosmeticSlot,
  ImportVaultResult,
  KidProfile,
  LanguageCode,
  LanguageProgressState,
  SaveVault,
} from '../types/contracts';

export const STORAGE_KEY = 'wanderling.vault.v1';

function emptyLangProgress(): LanguageProgressState {
  return {
    completedNodeIds: [],
    nodeStars: {},
    unlockedVocabIds: [],
    claimedChestIds: [],
    currentUnitIndex: 0,
    xpEarned: 0,
  };
}

export function createDefaultVault(): SaveVault {
  const leo: KidProfile = {
    id: 'kid-leo',
    name: 'Leo',
    avatarId: 'pip_explorer',
    bannerColor: '#2563EB',
    activeLanguage: 'es',
    gems: 80,
    hearts: 5,
    maxHearts: 5,
    streakDays: 1,
    lastPracticeISO: null,
    streakShields: 1,
    equippedCosmetics: {},
    unlockedCosmetics: [],
    badges: [],
    weeklyXp: 0,
    totalXp: 0,
    leagueTier: 'bronze_acorn',
    stats: {
      lessonsCompleted: 0,
      storiesCompleted: 0,
      bossesCleared: 0,
      arcadeGamesWon: 0,
      turtlePlaysCount: 0,
      bestComboStreak: 0,
      accentSpotlightsSeen: 0,
    },
    languageProgress: {
      es: emptyLangProgress(),
      fr: emptyLangProgress(),
      de: emptyLangProgress(),
      it: emptyLangProgress(),
    },
  };
  return {
    schemaVersion: 1,
    activeProfileId: leo.id,
    profiles: [leo],
    audioSettings: { volume: 0.85, muted: false },
  };
}

let memoryVault: SaveVault = createDefaultVault();
const listeners = new Set<() => void>();

export function loadVaultFromStorage(): SaveVault {
  return memoryVault;
}

export function exportVaultJson(vault: SaveVault = memoryVault): string {
  return JSON.stringify(vault, null, 2);
}

export function importVaultJson(
  _rawJson: string,
  _mode: 'replace' | 'merge' = 'replace'
): ImportVaultResult {
  return { ok: false, error: 'Baseline stub' };
}

export const vaultActions = {
  switchProfile(_profileId: string): void {},
  createProfile(_input: { name: string; avatarId: AvatarId; bannerColor: string }): KidProfile {
    return memoryVault.profiles[0];
  },
  deleteProfile(_profileId: string): boolean {
    return false;
  },
  setActiveLanguage(_lang: LanguageCode): void {},
  setCurrentUnitIndex(_lang: LanguageCode, _unitIndex: number): void {},
  recordAnswerOutcome(_params: {
    isCorrect: boolean;
    comboCount: number;
    usedAccentCoaching?: boolean;
  }): void {},
  recordTurtlePlay(): void {},
  completeMapNode(_params: {
    language: LanguageCode;
    nodeId: string;
    stars: 1 | 2 | 3;
    xpEarned: number;
    gemsEarned: number;
    unlockedVocabIds: string[];
    maxCombo: number;
    isStory?: boolean;
    isBoss?: boolean;
    isChest?: boolean;
  }): void {},
  restoreHeartsFromArcade(_params: { heartsWon: number; bonusGems: number }): void {},
  buyAndEquipCosmetic(_cosmeticId: CosmeticId): boolean {
    return false;
  },
  equipCosmetic(_slot: CosmeticSlot, _cosmeticId?: CosmeticId): void {},
  buyStreakShield(): boolean {
    return false;
  },
  setAudioSettings(_partial: Partial<{ volume: number; muted: boolean }>): void {},
  resetVaultToDefaults(): void {
    memoryVault = createDefaultVault();
    listeners.forEach((l) => l());
  },
};

export function useVaultStore(): {
  vault: SaveVault;
  activeProfile: KidProfile;
  activeProgress: LanguageProgressState;
} {
  const vault = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => memoryVault,
    () => memoryVault
  );
  const activeProfile = vault.profiles.find((p) => p.id === vault.activeProfileId) ?? vault.profiles[0];
  const activeProgress = activeProfile.languageProgress[activeProfile.activeLanguage];
  return { vault, activeProfile, activeProgress };
}
