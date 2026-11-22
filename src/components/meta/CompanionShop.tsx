import { useMemo, useState } from 'react';
import { Check, Eye, Gem, Shield, ShoppingBag, Sparkles } from 'lucide-react';
import { COSMETIC_CATALOG, STREAK_SHIELD_COST_GEMS } from '../../core';
import { playSfx } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import type {
  CharacterPose,
  CosmeticItem,
  CosmeticSlot,
  EquippedCosmetics,
} from '../../types/contracts';

const SLOT_FILTERS: readonly { id: 'all' | CosmeticSlot; label: string }[] = [
  { id: 'all', label: 'All Gear' },
  { id: 'hat', label: 'Hats' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'cape', label: 'Capes' },
  { id: 'aura', label: 'Auras' },
  { id: 'theme', label: 'UI Themes' },
];

export function CompanionShop() {
  const { activeProfile } = useVaultStore();
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
    <section aria-label="Companion Gem Shop" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live Preview Stage + Streak Shield Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        {/* Live Mascot Preview */}
        <div
          className="tactile-card"
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
            background: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, color: '#1e1b4b' }}>
              <ShoppingBag size={18} /> Pip’s Wardrobe Preview
            </span>
            <span
              className="hud-pill hud-pill-static"
              style={{ background: '#eff6ff', borderColor: '#60a5fa', color: '#1d4ed8' }}
            >
              <Gem size={15} /> {activeProfile.gems} Gems
            </span>
          </div>

          <MascotStage
            companionId="pip"
            pose={pose}
            equippedCosmetics={previewCosmetics}
            size={172}
            badgeText={previewItem ? `Trying: ${previewItem.name}` : 'Live Outfit'}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="tactile-btn tactile-btn-soft"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              onClick={() => {
                playSfx('button_click');
                setPose((p) => (p === 'victory_dance' ? 'happy' : 'victory_dance'));
              }}
            >
              <Sparkles size={15} /> Dance Pose
            </button>
            {previewItem ? (
              <button
                type="button"
                className="tactile-btn tactile-btn-soft"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setPreviewItem(null)}
              >
                Reset Preview
              </button>
            ) : null}
          </div>
        </div>

        {/* Streak Freeze Shield Power-Up */}
        <div
          className="tactile-card"
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                }}
              >
                <Shield size={14} /> Expedition Power-Up
              </span>
              <span style={{ fontWeight: 900, color: '#0369a1', fontSize: '0.88rem' }}>
                Owned: {activeProfile.streakShields}
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
              Streak Freeze Shield
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>
              Automatically protects your daily learning streak if you miss 1 calendar day!
            </p>
          </div>

          <button
            type="button"
            className="tactile-btn tactile-btn-hero tactile-btn-primary"
            disabled={activeProfile.gems < STREAK_SHIELD_COST_GEMS}
            onClick={handleBuyShield}
          >
            <Shield size={18} />
            <span>Buy Shield ({STREAK_SHIELD_COST_GEMS} Gems)</span>
          </button>
        </div>
      </div>

      {shopNotice ? (
        <div
          role="status"
          className="tactile-card"
          style={{
            padding: '10px 14px',
            background: '#ecfdf5',
            borderColor: '#34d399',
            color: '#065f46',
            fontWeight: 900,
            fontSize: '0.9rem',
          }}
        >
          {shopNotice}
        </div>
      ) : null}

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SLOT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`tactile-tile ${slotFilter === f.id ? 'is-selected' : ''}`}
            onClick={() => {
              playSfx('tile_tap');
              setSlotFilter(f.id);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cosmetics Catalog Grid */}
      {filteredItems.length === 0 ? (
        <div className="tactile-card" style={{ padding: 22, fontWeight: 700, color: '#64748b' }}>
          No cosmetic items available in this category yet.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
            gap: 12,
          }}
        >
          {filteredItems.map((item) => {
            const isEquipped = activeProfile.equippedCosmetics[item.slot] === item.id;
            const isUnlocked = unlockedSet.has(item.id);
            const canAfford = activeProfile.gems >= item.costGems;
            const isPreviewing = previewItem?.id === item.id;

            return (
              <div
                key={item.id}
                className="tactile-card"
                style={{
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 10,
                  borderColor: isEquipped ? '#10b981' : isPreviewing ? '#4f46e5' : 'var(--card-border)',
                  background: isEquipped ? '#ecfdf5' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: '#475569',
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: item.accentColor,
                          border: '2px solid #1e1b4b',
                        }}
                      />
                      {item.slot}
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
                          fontSize: '0.72rem',
                          fontWeight: 900,
                        }}
                      >
                        <Check size={12} /> Equipped
                      </span>
                    ) : isUnlocked ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#e0e7ff',
                          color: '#3730a3',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                        }}
                      >
                        Owned
                      </span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: '1.04rem', fontWeight: 900, color: '#1e1b4b' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                    {item.description}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '7px 10px', fontSize: '0.8rem' }}
                    aria-label={`Preview ${item.name}`}
                    onClick={() => {
                      playSfx('tile_tap');
                      setPreviewItem((cur) => (cur?.id === item.id ? null : item));
                      if (item.slot === 'theme') {
                        setShopNotice(`Previewing ${item.name} on Pip! Buy & equip to apply theme.`);
                      }
                    }}
                  >
                    <Eye size={15} />
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
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.84rem' }}
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
    </section>
  );
}
