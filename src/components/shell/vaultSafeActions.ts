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
} from '../../types/contracts';

export interface AvatarShopMetadata {
  id: AvatarId;
  name: string;
  description: string;
  costGems: number;
  accentColor: string;
}

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
    return typeof extVault.unlockAdultMode === 'function'
      ? (extVault.unlockAdultMode(options) ?? null)
      : null;
  },
  setAdultModeActive(active: boolean): void {
    extVault.setAdultModeActive?.(active);
  },
  verifyAdultEasterEggCode(code: string): boolean {
    if (typeof extVault.verifyAdultEasterEggCode === 'function') {
      return extVault.verifyAdultEasterEggCode(code);
    }
    const normalized = code.trim().toUpperCase();
    return (ADULT_EASTER_EGG_CODES as readonly string[]).includes(normalized);
  },
};

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
