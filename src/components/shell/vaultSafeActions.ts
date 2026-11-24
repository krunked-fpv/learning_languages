import * as core from '../../core';
import { vaultActions } from '../../store/useVaultStore';
import {
  ADULT_EASTER_EGG_CODES,
  UNLOCKABLE_AVATAR_COSTS,
  type AdultLanguageCode,
  type AvatarId,
  type KidProfile,
  type LanguageCode,
  type ProficiencyTier,
  type SaveVault,
} from '../../types/contracts';

export interface AvatarShopMetadata {
  id: AvatarId;
  name: string;
  description: string;
  costGems: number;
  accentColor: string;
}

export type CompleteMapNodeExtendedParams = Parameters<typeof vaultActions.completeMapNode>[0] & {
  isSrsQuest?: boolean;
  practicedVocabIds?: readonly string[];
};

interface ExtendedVaultActions {
  buyHeartElixir?: () => boolean;
  useHeartElixir?: () => boolean;
  buyHeartCrystal?: () => boolean;
  buyXpBooster?: () => boolean;
  buyAndSelectAvatar?: (avatarId: AvatarId) => boolean;
  recordFluentPlay?: () => void;
  recordFreeRecallSolve?: () => void;
  recordClozeSolve?: () => void;
  recordHintUsed?: () => void;
  completeMapNode?: (params: CompleteMapNodeExtendedParams) => void;
  unlockProficiencyTier?: (params: {
    language: LanguageCode;
    targetTier: Exclude<ProficiencyTier, 'A1'>;
    prerequisiteNodeIds: readonly string[];
    targetUnitIndex: number;
  }) => void;
  unlockAdultMode?: (options?: {
    adultProfileName?: string;
    initialTrack?: AdultLanguageCode;
  }) => KidProfile | null;
  setAdultModeActive?: (active: boolean) => void;
  setRestoreKidProfileOnStudyBreak?: (enabled: boolean) => void;
  returnToPriorKidProfile?: () => boolean | KidProfile | null | void;
  verifyAdultEasterEggCode?: (code: string) => boolean;
}

const extVault = vaultActions as typeof vaultActions & ExtendedVaultActions;

export const safeVaultActions = {
  buyHeartElixir(): boolean {
    return typeof extVault.buyHeartElixir === 'function' ? extVault.buyHeartElixir() : false;
  },
  useHeartElixir(): boolean {
    return typeof extVault.useHeartElixir === 'function' ? extVault.useHeartElixir() : false;
  },
  buyHeartCrystal(): boolean {
    return typeof extVault.buyHeartCrystal === 'function' ? extVault.buyHeartCrystal() : false;
  },
  buyXpBooster(): boolean {
    return typeof extVault.buyXpBooster === 'function' ? extVault.buyXpBooster() : false;
  },
  buyAndSelectAvatar(avatarId: AvatarId): boolean {
    return typeof extVault.buyAndSelectAvatar === 'function'
      ? extVault.buyAndSelectAvatar(avatarId)
      : false;
  },
  recordFluentPlay(): void {
    extVault.recordFluentPlay?.();
  },
  recordFreeRecallSolve(): void {
    extVault.recordFreeRecallSolve?.();
  },
  recordClozeSolve(): void {
    extVault.recordClozeSolve?.();
  },
  recordHintUsed(): void {
    extVault.recordHintUsed?.();
  },
  completeMapNode(params: CompleteMapNodeExtendedParams): void {
    vaultActions.completeMapNode(params as Parameters<typeof vaultActions.completeMapNode>[0]);
  },
  unlockProficiencyTier(params: {
    language: LanguageCode;
    targetTier: Exclude<ProficiencyTier, 'A1'>;
    prerequisiteNodeIds: readonly string[];
    targetUnitIndex: number;
  }): void {
    extVault.unlockProficiencyTier?.(params);
  },
  unlockAdultMode(options?: {
    adultProfileName?: string;
    initialTrack?: AdultLanguageCode;
  }): KidProfile | null {
    if (!('unlockAdultMode' in vaultActions) || typeof extVault.unlockAdultMode !== 'function') {
      return null;
    }
    const normalizedOptions = {
      ...options,
      adultProfileName: options?.adultProfileName?.trim() || 'Parent',
    };
    return extVault.unlockAdultMode(normalizedOptions) ?? null;
  },
  setAdultModeActive(active: boolean): void {
    if ('setAdultModeActive' in vaultActions && typeof extVault.setAdultModeActive === 'function') {
      extVault.setAdultModeActive(active);
    }
  },
  setRestoreKidProfileOnStudyBreak(enabled: boolean): void {
    if (
      'setRestoreKidProfileOnStudyBreak' in vaultActions &&
      typeof extVault.setRestoreKidProfileOnStudyBreak === 'function'
    ) {
      extVault.setRestoreKidProfileOnStudyBreak(enabled);
    }
  },
  returnToPriorKidProfile(fallbackKidId?: string | null): boolean {
    if (
      'returnToPriorKidProfile' in vaultActions &&
      typeof extVault.returnToPriorKidProfile === 'function'
    ) {
      const result = extVault.returnToPriorKidProfile();
      return result === undefined ? true : Boolean(result);
    }
    if (fallbackKidId) {
      vaultActions.switchProfile(fallbackKidId);
      return true;
    }
    return false;
  },
  verifyAdultEasterEggCode(code: string): boolean {
    if (
      'verifyAdultEasterEggCode' in vaultActions &&
      typeof extVault.verifyAdultEasterEggCode === 'function'
    ) {
      return extVault.verifyAdultEasterEggCode(code);
    }
    const normalized = code.trim().toUpperCase();
    return (ADULT_EASTER_EGG_CODES as readonly string[]).includes(normalized);
  },
};

/** Resolves the most recent non-adult kid profile available in the vault for 1-tap restore. */
export function resolvePriorKidProfile(
  vault: Pick<SaveVault, 'profiles' | 'lastKidProfileId'>,
  activeProfileId: string
): KidProfile | null {
  const candidates = vault.profiles.filter(
    (p) => p.id !== activeProfileId && !p.adultModeUnlocked
  );
  if (candidates.length === 0) return null;
  if (vault.lastKidProfileId) {
    const exact = candidates.find((p) => p.id === vault.lastKidProfileId);
    if (exact) return exact;
  }
  return candidates[0];
}

/** Disarms Adult Mode on Study Break and restores the prior kid profile when opted in. */
export function performStudyBreakExit(
  vault: Pick<SaveVault, 'profiles' | 'lastKidProfileId' | 'restoreKidProfileOnStudyBreak'>,
  activeProfileId: string
): void {
  if (vault.restoreKidProfileOnStudyBreak) {
    const priorKid = resolvePriorKidProfile(vault, activeProfileId);
    if (safeVaultActions.returnToPriorKidProfile(priorKid?.id)) {
      return;
    }
  }
  safeVaultActions.setAdultModeActive(false);
}

const FALLBACK_AVATAR_SHOP_CATALOG: readonly AvatarShopMetadata[] = [
  {
    id: 'pip_explorer',
    name: 'Pip the Explorer',
    description: 'Your loyal sky-blue songbird explorer crest.',
    costGems: UNLOCKABLE_AVATAR_COSTS.pip_explorer,
    accentColor: '#2563EB',
  },
  {
    id: 'mateo_chef',
    name: 'Mateo the Chef',
    description: 'Fiesta axolotl chef & guitarist crest.',
    costGems: UNLOCKABLE_AVATAR_COSTS.mateo_chef,
    accentColor: '#EA580C',
  },
  {
    id: 'colette_baker',
    name: 'Colette the Baker',
    description: 'Boulangerie fox adventurer crest.',
    costGems: UNLOCKABLE_AVATAR_COSTS.colette_baker,
    accentColor: '#9333EA',
  },
  {
    id: 'benni_tinker',
    name: 'Benni the Tinkerer',
    description: 'Clockwork alpine badger inventor crest.',
    costGems: UNLOCKABLE_AVATAR_COSTS.benni_tinker,
    accentColor: '#059669',
  },
  {
    id: 'luca_captain',
    name: 'Luca the Captain',
    description: 'Harbor sea-otter gondolier crest.',
    costGems: UNLOCKABLE_AVATAR_COSTS.luca_captain,
    accentColor: '#0284C7',
  },
  {
    id: 'star_compass',
    name: 'Starlight Compass',
    description: 'Classic brass starlight compass emblem.',
    costGems: UNLOCKABLE_AVATAR_COSTS.star_compass,
    accentColor: '#4F46E5',
  },
  {
    id: 'origami_crane_crest',
    name: 'Origami Crane Crest',
    description: 'Folded gold-leaf crane crest celebrating B1 Storyweavers.',
    costGems: UNLOCKABLE_AVATAR_COSTS.origami_crane_crest,
    accentColor: '#EC4899',
  },
  {
    id: 'clockwork_owl_crest',
    name: 'Clockwork Owl Crest',
    description: 'Brass gears & nocturnal wisdom for curious polyglots.',
    costGems: UNLOCKABLE_AVATAR_COSTS.clockwork_owl_crest,
    accentColor: '#D97706',
  },
  {
    id: 'fennec_voyager',
    name: 'Fennec Voyager',
    description: 'Starlit desert fennec navigator medal.',
    costGems: UNLOCKABLE_AVATAR_COSTS.fennec_voyager,
    accentColor: '#F59E0B',
  },
  {
    id: 'grand_laureate_crest',
    name: 'Grand Laureate Crest',
    description: 'Imperial C1+ polyglot crest crowned in emerald & gold.',
    costGems: UNLOCKABLE_AVATAR_COSTS.grand_laureate_crest,
    accentColor: '#10B981',
  },
];

export function getAvatarShopCatalog(): readonly AvatarShopMetadata[] {
  const fromCore = (core as { AVATAR_SHOP_CATALOG?: readonly AvatarShopMetadata[] })
    .AVATAR_SHOP_CATALOG;
  return Array.isArray(fromCore) && fromCore.length > 0
    ? fromCore
    : FALLBACK_AVATAR_SHOP_CATALOG;
}
