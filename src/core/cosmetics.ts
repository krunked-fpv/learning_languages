import type { CosmeticId, CosmeticItem } from '../types/contracts';

export const STREAK_SHIELD_COST_GEMS = 45;

export const COSMETIC_CATALOG: readonly CosmeticItem[] = [
  {
    id: 'hat_explorer_beret',
    slot: 'hat',
    name: 'Montmartre Explorer Beret',
    description: 'A velvety cobalt beret with a golden compass pin for storybook strolls.',
    costGems: 35,
    accentColor: '#2563EB',
  },
  {
    id: 'hat_fiesta_sombrero',
    slot: 'hat',
    name: 'Sunlit Fiesta Sombrero',
    description: 'Hand-woven fiesta brim trimmed with bright marigold and terracotta ribbons.',
    costGems: 45,
    accentColor: '#EA580C',
  },
  {
    id: 'hat_alpine_tyrolean',
    slot: 'hat',
    name: 'Black Forest Tyrolean Cap',
    description: 'Cozy emerald felt trail hat sporting a crisp alpine feather.',
    costGems: 45,
    accentColor: '#15803D',
  },
  {
    id: 'hat_gondolier_boater',
    slot: 'hat',
    name: 'Venetian Gondolier Boater',
    description: 'Classic straw canal hat wrapped with a bold crimson silk ribbon.',
    costGems: 50,
    accentColor: '#DC2626',
  },
  {
    id: 'hat_starlight_wizard',
    slot: 'hat',
    name: 'Starlight Wizard Hat',
    description: 'Twinkling midnight-indigo pointed hat dusted with golden constellation stars.',
    costGems: 75,
    accentColor: '#6D28D9',
  },
  {
    id: 'glasses_brass_aviator',
    slot: 'glasses',
    name: 'Brass Aviator Goggles',
    description: 'Polished clockwork sky-explorer goggles built for windy mountain flights.',
    costGems: 40,
    accentColor: '#D97706',
  },
  {
    id: 'cape_rainbow_wings',
    slot: 'cape',
    name: 'Rainbow Wing Cape',
    description: 'Breezy prism-feathered explorer cape that shimmers on every combo streak.',
    costGems: 65,
    accentColor: '#F43F5E',
  },
  {
    id: 'aura_golden_compass',
    slot: 'aura',
    name: 'Golden Compass Halo',
    description: 'Orbiting starlight compass rings that softly chime around your companion.',
    costGems: 60,
    accentColor: '#FBBF24',
  },
  {
    id: 'aura_fireflies',
    slot: 'aura',
    name: 'Twilight Fireflies',
    description: 'Gentle glowing meadow fireflies dancing beside your expedition mascot.',
    costGems: 55,
    accentColor: '#10B981',
  },
  {
    id: 'theme_sunset_plaza',
    slot: 'theme',
    name: 'Sunset Plaza Theme',
    description: 'Warm terracotta, golden amber, and cheerful fiesta lantern accents across the UI.',
    costGems: 50,
    accentColor: '#EA580C',
  },
  {
    id: 'theme_starlight_indigo',
    slot: 'theme',
    name: 'Starlight Indigo Theme',
    description: 'Dreamy twilight indigo skies and luminous gold accents for evening explorers.',
    costGems: 60,
    accentColor: '#4F46E5',
  },
  {
    id: 'theme_alpine_meadow',
    slot: 'theme',
    name: 'Alpine Meadow Theme',
    description: 'Crisp pine greens, wildflower sky blues, and sunny meadow card borders.',
    costGems: 50,
    accentColor: '#059669',
  },
] as const;

export function getCosmeticById(id: CosmeticId): CosmeticItem | undefined {
  return COSMETIC_CATALOG.find((item) => item.id === id);
}
