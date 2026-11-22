import { useMemo, useState } from 'react';
import { Check, Eye, Gem, Shield, ShoppingBag, Sparkles } from 'lucide-react';
import { COSMETIC_CATALOG, STREAK_SHIELD_COST_GEMS } from '../../core';
import { playSfx } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { useCompactViewport } from '../lesson/lessonHelpers';
import type {
  CharacterPose,
  CosmeticItem,
  CosmeticSlot,
  EquippedCosmetics,
} from '../../types/contracts';
import { PaletteOrbSwatches, THEME_SWATCH_TRIPLES } from './paletteSwatches';

const SLOT_FILTERS: readonly { id: 'all' | CosmeticSlot; label: string }[] = [
  { id: 'all', label: 'All Gear' },
  { id: 'theme', label: 'UI Themes' },
  { id: 'hat', label: 'Hats' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'cape', label: 'Capes' },
  { id: 'aura', label: 'Auras' },
];

export function CompanionShop() {
  const { activeProfile } = useVaultStore();
  const compact = useCompactViewport();
  const [slotFilter, setSlotFilter] = useState<'all' | CosmeticSlot>('all');
  const [previewItem, setPreviewItem] = useState<CosmeticItem | null>(null);
  const [pose, setPose] = useState<CharacterPose>('happy');
  const [shopNotice, setShopNotice] = useState<string | null>(null);

  const unlockedSet = useMemo(
    () => new Set(activeProfile.unlockedCosmetics),
    [activeProfile.unlockedCosmetics]
  );

  const previewCosmetics: EquippedCosmetics = useMemo(() => {
    if (!previewItem) return activeProfile.equippedCosmetics;
    return {
      ...activeProfile.equippedCosmetics,
      [previewItem.slot]: previewItem.id,
    };
  }, [activeProfile.equippedCosmetics, previewItem]);

  const filteredItems = useMemo(
    () =>
      slotFilter === 'all'
        ? COSMETIC_CATALOG
        : COSMETIC_CATALOG.filter((item) => item.slot === slotFilter),
    [slotFilter]
  );

  const handleBuyShield = () => {
    const ok = vaultActions.buyStreakShield();
    if (ok) {
      playSfx('heart_win');
      setPose('victory_dance');
      setShopNotice('Streak Freeze Shield added to your pack!');
    } else {
      playSfx('gentle_nudge');
      setShopNotice(`Need ${STREAK_SHIELD_COST_GEMS} Gems for a Streak Shield.`);
    }
  };

  const handleBuyOrEquip = (item: CosmeticItem) => {
    const isEquipped = activeProfile.equippedCosmetics[item.slot] === item.id;
    const isUnlocked = unlockedSet.has(item.id);

    if (isEquipped) {
      playSfx('button_click');
      vaultActions.equipCosmetic(item.slot, undefined);
      setPreviewItem(null);
      setShopNotice(`Unequipped ${item.name}.`);
      return;
    }

    if (isUnlocked) {
      playSfx('tile_tap');
      vaultActions.equipCosmetic(item.slot, item.id);
      setPreviewItem(null);
      setPose('happy');
      setShopNotice(`Equipped ${item.name}!`);
      return;
    }

    const ok = vaultActions.buyAndEquipCosmetic(item.id);
    if (ok) {
      playSfx('chest_open');
      setPreviewItem(null);
      setPose('victory_dance');
      setShopNotice(`Unlocked & equipped ${item.name}!`);
    } else {
      playSfx('gentle_nudge');
      setShopNotice(`Collect ${item.costGems - activeProfile.gems} more Gems for ${item.name}!`);
    }
  };

  return (
    <section aria-label="Companion Gem Shop" className="shop-console-grid">
      {/* Left Console Pedestal: Live Mascot + Streak Freeze Shield */}
      <div className="shop-pedestal-col">
        <div
          className="tactile-card"
          style={{
            padding: compact ? 12 : 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
            background: 'var(--card-bg)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: '0.92rem' }}>
              <ShoppingBag size={16} /> Pip’s Wardrobe
            </span>
            <span
              className="hud-pill hud-pill-static"
              style={{
                background: 'var(--tint-indigo-bg)',
                borderColor: 'var(--tint-indigo-border)',
                color: 'var(--tint-indigo-ink)',
                padding: '3px 9px',
              }}
            >
              <Gem size={14} /> {activeProfile.gems}
            </span>
          </div>

          <MascotStage
            companionId="pip"
            pose={pose}
            equippedCosmetics={previewCosmetics}
            size={compact ? 104 : 152}
            badgeText={previewItem ? `Trying: ${previewItem.name}` : 'Live Outfit'}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                playSfx('button_click');
                setPose((p) => (p === 'victory_dance' ? 'happy' : 'victory_dance'));
              }}
            >
              <Sparkles size={14} /> Dance
            </button>
            {previewItem ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                onClick={() => setPreviewItem(null)}
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        {/* Compact Streak Freeze Shield Power-Up */}
        <div
          className="tactile-card"
          style={{
            padding: compact ? 12 : 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
            minWidth: compact ? 220 : 'auto',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--tint-indigo-bg)',
                color: 'var(--tint-indigo-ink)',
                fontWeight: 900,
                fontSize: '0.74rem',
              }}
            >
              <Shield size={13} /> Power-Up
            </span>
            <span style={{ fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Owned: {activeProfile.streakShields}
            </span>
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 900 }}>
              Streak Freeze Shield
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Protects your daily streak if you miss 1 day!
            </p>
          </div>

          <button
            type="button"
            className="tactile-btn tactile-btn-primary"
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.84rem' }}
            disabled={activeProfile.gems < STREAK_SHIELD_COST_GEMS}
            onClick={handleBuyShield}
          >
            <Shield size={16} />
            <span>Buy Shield ({STREAK_SHIELD_COST_GEMS} Gems)</span>
          </button>
        </div>
      </div>

      {/* Right Console Cabinet: Category Tabs + Bounded Scroll Grid */}
      <div className="shop-cabinet-col">
        {shopNotice ? (
          <div
            role="status"
            className="tactile-card"
            style={{
              padding: '8px 12px',
              background: 'var(--tint-emerald-bg)',
              borderColor: 'var(--tint-emerald-border)',
              color: 'var(--tint-emerald-ink)',
              fontWeight: 900,
              fontSize: '0.86rem',
              flexShrink: 0,
            }}
          >
            {shopNotice}
          </div>
        ) : null}

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
          {SLOT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`tactile-tile ${slotFilter === f.id ? 'is-selected' : ''}`}
              style={{ padding: '6px 11px', fontSize: '0.82rem' }}
              onClick={() => {
                playSfx('tile_tap');
                setSlotFilter(f.id);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Internally Scrollable Cabinet Grid */}
        <div className="console-scroll-pane" style={{ flex: '1 1 auto', paddingRight: 4 }}>
          {filteredItems.length === 0 ? (
            <div className="tactile-card" style={{ padding: 20, fontWeight: 700, color: 'var(--text-muted)' }}>
              No cosmetic items available in this category yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
                paddingBottom: 6,
              }}
            >
              {filteredItems.map((item) => {
                const isEquipped = activeProfile.equippedCosmetics[item.slot] === item.id;
                const isUnlocked = unlockedSet.has(item.id);
                const canAfford = activeProfile.gems >= item.costGems;
                const isPreviewing = previewItem?.id === item.id;
                const swatches = THEME_SWATCH_TRIPLES[item.id] ?? [
                  item.accentColor,
                  '#FBBF24',
                  '#38BDF8',
                ];

                return (
                  <div
                    key={item.id}
                    className="tactile-card"
                    style={{
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                      borderColor: isEquipped
                        ? 'var(--tint-emerald-border)'
                        : isPreviewing
                          ? 'var(--lang-primary)'
                          : 'var(--card-border)',
                      background: isEquipped ? 'var(--tint-emerald-bg)' : 'var(--card-bg)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <PaletteOrbSwatches colors={swatches} size={item.slot === 'theme' ? 13 : 10} />
                          <span>{item.slot === 'theme' ? 'Palette' : item.slot}</span>
                        </span>

                        {isEquipped ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: '#10b981',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 900,
                            }}
                          >
                            <Check size={11} /> Equipped
                          </span>
                        ) : isUnlocked ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: 'var(--tint-indigo-bg)',
                              color: 'var(--tint-indigo-ink)',
                              fontSize: '0.7rem',
                              fontWeight: 900,
                            }}
                          >
                            Owned
                          </span>
                        ) : null}
                      </div>

                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {item.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="tactile-btn tactile-btn-soft"
                        style={{ padding: '7px 10px', fontSize: '0.78rem' }}
                        aria-label={`Preview ${item.name}`}
                        onClick={() => {
                          playSfx('tile_tap');
                          setPreviewItem((cur) => (cur?.id === item.id ? null : item));
                          if (item.slot === 'theme') {
                            setShopNotice(`Previewing ${item.name} on Pip! Buy & equip to apply theme.`);
                          }
                        }}
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        className={`tactile-btn ${
                          isEquipped
                            ? 'tactile-btn-soft'
                            : isUnlocked
                              ? 'tactile-btn-success'
                              : 'tactile-btn-amber'
                        }`}
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }}
                        disabled={!isUnlocked && !canAfford}
                        onClick={() => handleBuyOrEquip(item)}
                      >
                        {isEquipped ? (
                          'Unequip'
                        ) : isUnlocked ? (
                          'Equip'
                        ) : (
                          <>
                            <Gem size={14} />
                            <span>Buy & Equip ({item.costGems})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
