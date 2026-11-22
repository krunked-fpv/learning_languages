import type { CosmeticId } from '../../types/contracts';

export const THEME_SWATCH_TRIPLES: Record<CosmeticId | 'default', readonly [string, string, string]> = {
  default: ['#FEF6E4', '#2563EB', '#FBBF24'],
  theme_sunset_plaza: ['#FFEDD5', '#EA580C', '#FBBF24'],
  theme_starlight_indigo: ['#1E1B4B', '#4F46E5', '#FDE047'],
  theme_alpine_meadow: ['#DCFCE7', '#059669', '#38BDF8'],
  theme_cosmic_galaxy: ['#0B0726', '#C084FC', '#38BDF8'],
  theme_aurora_borealis: ['#041F27', '#34D399', '#A78BFA'],
  theme_candy_sakura: ['#FFE4E6', '#F472B6', '#FB7185'],
  theme_ocean_lagoon: ['#CFFAFE', '#06B6D4', '#FB7185'],
  theme_royal_velvet: ['#2B0940', '#A855F7', '#FBBF24'],
  hat_explorer_beret: ['#2563EB', '#FBBF24', '#EFF6FF'],
  hat_fiesta_sombrero: ['#EA580C', '#FBBF24', '#FFF7ED'],
  hat_alpine_tyrolean: ['#15803D', '#D97706', '#ECFDF5'],
  hat_gondolier_boater: ['#DC2626', '#FDE047', '#EFF6FF'],
  hat_starlight_wizard: ['#6D28D9', '#FDE047', '#1E1B4B'],
  glasses_brass_aviator: ['#D97706', '#38BDF8', '#FEF3C7'],
  cape_rainbow_wings: ['#F43F5E', '#FBBF24', '#3B82F6'],
  aura_golden_compass: ['#FBBF24', '#F59E0B', '#FEF3C7'],
  aura_fireflies: ['#10B981', '#FDE047', '#065F46'],
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
