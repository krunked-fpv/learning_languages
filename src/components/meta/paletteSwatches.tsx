import type { CosmeticId } from '../../types/contracts';

export const THEME_SWATCH_TRIPLES: Record<CosmeticId | 'default', readonly [string, string, string]> = {
  default: ['#FEF6E4', '#2563EB', '#FBBF24'],

  // UI Themes (14)
  theme_sunset_plaza: ['#FFEDD5', '#EA580C', '#FBBF24'],
  theme_starlight_indigo: ['#1E1B4B', '#4F46E5', '#FDE047'],
  theme_alpine_meadow: ['#DCFCE7', '#059669', '#38BDF8'],
  theme_cosmic_galaxy: ['#0B0726', '#C084FC', '#38BDF8'],
  theme_aurora_borealis: ['#041F27', '#34D399', '#A78BFA'],
  theme_candy_sakura: ['#FFE4E6', '#F472B6', '#FB7185'],
  theme_ocean_lagoon: ['#CFFAFE', '#06B6D4', '#FB7185'],
  theme_royal_velvet: ['#2B0940', '#A855F7', '#FBBF24'],
  theme_kyoto_matcha: ['#ECFCCB', '#15803D', '#D97706'],
  theme_sahara_mirage: ['#FEF3C7', '#D97706', '#0E7490'],
  theme_emerald_rainforest: ['#052E16', '#34D399', '#FBBF24'],
  theme_neon_night_market: ['#0F172A', '#EC4899', '#22D3EE'],
  theme_nordic_fjord: ['#E0F2FE', '#0284C7', '#334155'],
  theme_laureate_imperial: ['#090D24', '#F59E0B', '#F43F5E'],

  // Hats (9)
  hat_explorer_beret: ['#2563EB', '#FBBF24', '#EFF6FF'],
  hat_fiesta_sombrero: ['#EA580C', '#FBBF24', '#FFF7ED'],
  hat_alpine_tyrolean: ['#15803D', '#D97706', '#ECFDF5'],
  hat_gondolier_boater: ['#DC2626', '#FDE047', '#EFF6FF'],
  hat_starlight_wizard: ['#6D28D9', '#FDE047', '#1E1B4B'],
  hat_sakura_crown: ['#F472B6', '#FDE047', '#FDF2F8'],
  hat_desert_turban_star: ['#D97706', '#0E7490', '#FEF3C7'],
  hat_astronomer_mitre: ['#312E81', '#38BDF8', '#FDE047'],
  hat_laureate_wreath: ['#10B981', '#F59E0B', '#FEFCE8'],

  // Glasses (5)
  glasses_brass_aviator: ['#D97706', '#38BDF8', '#FEF3C7'],
  glasses_starlight_frames: ['#6366F1', '#FDE047', '#EEF2FF'],
  glasses_scholar_monocle: ['#B45309', '#FBBF24', '#FFFBEB'],
  glasses_pixel_visor: ['#EC4899', '#22D3EE', '#0F172A'],
  glasses_constellation_shades: ['#4338CA', '#A855F7', '#7DD3FC'],

  // Capes (4)
  cape_rainbow_wings: ['#F43F5E', '#FBBF24', '#3B82F6'],
  cape_traveler_cloak: ['#047857', '#D97706', '#ECFDF5'],
  cape_aurora_mantle: ['#0D9488', '#34D399', '#A78BFA'],
  cape_velvet_laureate: ['#7E22CE', '#F59E0B', '#FEF08A'],

  // Auras (5)
  aura_golden_compass: ['#FBBF24', '#F59E0B', '#FEF3C7'],
  aura_fireflies: ['#10B981', '#FDE047', '#065F46'],
  aura_sakura_breeze: ['#FB7185', '#FBCFE8', '#FFF1F2'],
  aura_polyglot_glyphs: ['#38BDF8', '#818CF8', '#FDE047'],
  aura_laureate_supernova: ['#F59E0B', '#EC4899', '#38BDF8'],

  // Handheld Props (7)
  prop_explorer_ukulele: ['#D97706', '#FBBF24', '#FFF7ED'],
  prop_starlight_telescope: ['#1D4ED8', '#F59E0B', '#E0F2FE'],
  prop_golden_quill: ['#CA8A04', '#FEF08A', '#78350F'],
  prop_festival_lantern: ['#EF4444', '#FBBF24', '#FFF1F2'],
  prop_boulangerie_whisk: ['#EA580C', '#E2E8F0', '#FFFBEB'],
  prop_compass_astrolabe: ['#0E7490', '#F59E0B', '#ECFEFF'],
  prop_laureate_scroll: ['#7C3AED', '#FBBF24', '#FEFCE8'],

  // Mini Sidekick Pets (6)
  pet_origami_crane: ['#F43F5E', '#FDE047', '#FFF1F2'],
  pet_clockwork_owl: ['#D97706', '#38BDF8', '#FEF3C7'],
  pet_axolotl_sprite: ['#FB7185', '#FBBF24', '#FFE4E6'],
  pet_desert_fennec: ['#F59E0B', '#FDE68A', '#0E7490'],
  pet_starlight_seahorse: ['#06B6D4', '#A78BFA', '#E0F2FE'],
  pet_phoenix_chick: ['#EA580C', '#FDE047', '#F43F5E'],
};

export function PaletteOrbSwatches({
  colors,
  size = 14,
}: {
  colors: readonly [string, string, string];
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
    >
      {colors.map((hex, i) => (
        <span
          key={`${hex}-${i}`}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: hex,
            border: '1.5px solid rgba(148, 163, 184, 0.7)',
            boxShadow: `0 0 6px ${hex}55`,
          }}
        />
      ))}
    </span>
  );
}
