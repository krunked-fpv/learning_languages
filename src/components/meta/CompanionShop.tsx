import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Gem,
  Heart,
  Shield,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import { AvatarBadge } from '../../art/AvatarBadge';
import { COSMETIC_CATALOG, STREAK_SHIELD_COST_GEMS } from '../../core';
import { playSfx } from '../../audio';
import { useVaultStore, vaultActions } from '../../store/useVaultStore';
import { MascotStage } from '../characters/MascotStage';
import { useCompactViewport } from '../lesson/lessonHelpers';
import { getAvatarShopCatalog, safeVaultActions } from '../shell/vaultSafeActions';
import {
  HEART_CRYSTAL_COST_GEMS,
  HEART_ELIXIR_COST_GEMS,
  MAX_HEART_CONTAINERS,
  PROFICIENCY_TIER_META,
  STARTER_AVATAR_IDS,
  XP_BOOSTER_CHARGES_PER_BUY,
  XP_BOOSTER_COST_GEMS,
  type CharacterPose,
  type CompanionId,
  type CosmeticItem,
  type CosmeticSlot,
  type EquippedCosmetics,
} from '../../types/contracts';
import { PaletteOrbSwatches, THEME_SWATCH_TRIPLES } from './paletteSwatches';

type ShopCategory = 'all' | CosmeticSlot | 'powerups' | 'avatars';

const SLOT_FILTERS: readonly { id: ShopCategory; label: string }[] = [
  { id: 'all', label: 'All Gear' },
  { id: 'theme', label: 'UI Themes' },
  { id: 'hat', label: 'Hats' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'cape', label: 'Capes' },
  { id: 'aura', label: 'Auras' },
  { id: 'prop', label: 'Props' },
  { id: 'pet', label: 'Pets' },
  { id: 'powerups', label: 'Power-Ups' },
  { id: 'avatars', label: 'Avatars' },
];

const COMPANION_SWITCHERS: readonly { id: CompanionId; label: string }[] = [
  { id: 'pip', label: 'Pip' },
  { id: 'mateo', label: 'Mateo' },
  { id: 'colette', label: 'Colette' },
  { id: 'benni', label: 'Benni' },
  { id: 'luca', label: 'Luca' },
];

export function CompanionShop() {
  const { activeProfile } = useVaultStore();
  const compact = useCompactViewport();
  const [slotFilter, setSlotFilter] = useState<ShopCategory>('all');
  const [previewCompanion, setPreviewCompanion] = useState<CompanionId>('pip');
  const [previewItem, setPreviewItem] = useState<CosmeticItem | null>(null);
  const [pose, setPose] = useState<CharacterPose>('happy');
  const [shopNotice, setShopNotice] = useState<string | null>(null);
  const [txNonce, setTxNonce] = useState(0);
  const actionLockRef = useRef(false);

  useEffect(() => {
    actionLockRef.current = false;
  }, [txNonce, activeProfile]);

  const acquireShopActionLock = () => {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    setTxNonce((n) => n + 1);
    return true;
  };

  const unlockedSet = useMemo(
    () => new Set(activeProfile.unlockedCosmetics),
    [activeProfile.unlockedCosmetics]
  );

  const unlockedAvatarSet = useMemo(
    () => new Set(activeProfile.unlockedAvatars ?? STARTER_AVATAR_IDS),
    [activeProfile.unlockedAvatars]
  );

  const avatarCatalog = useMemo(() => getAvatarShopCatalog(), []);
  const displayedAvatars = useMemo(
    () =>
      slotFilter === 'avatars'
        ? avatarCatalog
        : avatarCatalog.filter((av) => av.costGems > 0),
    [avatarCatalog, slotFilter]
  );

  const previewCosmetics: EquippedCosmetics = useMemo(() => {
    if (!previewItem) return activeProfile.equippedCosmetics;
    return {
      ...activeProfile.equippedCosmetics,
      [previewItem.slot]: previewItem.id,
    };
  }, [activeProfile.equippedCosmetics, previewItem]);

  const filteredCosmetics = useMemo(() => {
    if (slotFilter === 'powerups' || slotFilter === 'avatars') return [];
    return slotFilter === 'all'
      ? COSMETIC_CATALOG
      : COSMETIC_CATALOG.filter((item) => item.slot === slotFilter);
  }, [slotFilter]);

  const showCosmeticsSection = slotFilter !== 'powerups' && slotFilter !== 'avatars';
  const showPowerUpsSection = slotFilter === 'all' || slotFilter === 'powerups';
  const showAvatarsSection = slotFilter === 'all' || slotFilter === 'avatars';

  const handleBuyShield = () => {
    if (!acquireShopActionLock()) return;
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

  const handleBuyHeartElixir = () => {
    if (!acquireShopActionLock()) return;
    const neededRefill = activeProfile.hearts < activeProfile.maxHearts;
    const ok = safeVaultActions.buyHeartElixir();
    if (ok) {
      playSfx('heart_win');
      setPose('victory_dance');
      setShopNotice(
        neededRefill
          ? 'Heart Refill Elixir restored all your Hearts!'
          : 'Heart Refill Elixir added to your pack!'
      );
    } else {
      playSfx('gentle_nudge');
      setShopNotice(`Need ${HEART_ELIXIR_COST_GEMS} Gems for a Heart Refill Elixir.`);
    }
  };

  const handleUseHeartElixir = () => {
    if (!acquireShopActionLock()) return;
    const ok = safeVaultActions.useHeartElixir();
    if (ok) {
      playSfx('heart_win');
      setPose('victory_dance');
      setShopNotice('Used Heart Refill Elixir — Hearts are full!');
    } else {
      playSfx('gentle_nudge');
      setShopNotice('Hearts are already full!');
    }
  };

  const handleBuyHeartCrystal = () => {
    if (!acquireShopActionLock()) return;
    const ok = safeVaultActions.buyHeartCrystal();
    if (ok) {
      playSfx('tier_unlock');
      setPose('victory_dance');
      setShopNotice(
        `Heart Container Crystal upgraded! Max Hearts: ${Math.min(MAX_HEART_CONTAINERS, activeProfile.maxHearts + 1)}!`
      );
    } else {
      playSfx('gentle_nudge');
      setShopNotice(
        activeProfile.maxHearts >= MAX_HEART_CONTAINERS
          ? `Already at max ${MAX_HEART_CONTAINERS} Heart Containers!`
          : `Need ${HEART_CRYSTAL_COST_GEMS} Gems for a Heart Container Crystal.`
      );
    }
  };

  const handleBuyXpBooster = () => {
    if (!acquireShopActionLock()) return;
    const ok = safeVaultActions.buyXpBooster();
    if (ok) {
      playSfx('booster_spark');
      setPose('victory_dance');
      setShopNotice(
        `2x XP Starlight Booster charged (+${XP_BOOSTER_CHARGES_PER_BUY} charges)!`
      );
    } else {
      playSfx('gentle_nudge');
      setShopNotice(`Need ${XP_BOOSTER_COST_GEMS} Gems for a 2x XP Starlight Booster.`);
    }
  };

  const handleSelectOrBuyAvatar = (avatarId: (typeof avatarCatalog)[number]) => {
    if (!acquireShopActionLock()) return;
    const alreadyUnlocked =
      unlockedAvatarSet.has(avatarId.id) || STARTER_AVATAR_IDS.includes(avatarId.id);
    const ok = safeVaultActions.buyAndSelectAvatar(avatarId.id);
    if (ok) {
      playSfx(alreadyUnlocked ? 'tile_tap' : 'chest_open');
      setPose('victory_dance');
      setShopNotice(
        alreadyUnlocked
          ? `Selected ${avatarId.name} avatar!`
          : `Unlocked & equipped ${avatarId.name} avatar!`
      );
    } else {
      playSfx('gentle_nudge');
      setShopNotice(
        `Collect ${Math.max(1, avatarId.costGems - activeProfile.gems)} more Gems for ${avatarId.name}!`
      );
    }
  };

  const handleBuyOrEquip = (item: CosmeticItem) => {
    if (!acquireShopActionLock()) return;
    const isEquipped = activeProfile.equippedCosmetics[item.slot] === item.id;
    const isUnlocked = unlockedSet.has(item.id);
    const isPropOrPet = item.slot === 'prop' || item.slot === 'pet';

    if (isEquipped) {
      playSfx('button_click');
      vaultActions.equipCosmetic(item.slot, undefined);
      setPreviewItem(null);
      setShopNotice(`Unequipped ${item.name}.`);
      return;
    }

    if (isUnlocked) {
      playSfx(isPropOrPet ? 'equip_prop_pet' : 'tile_tap');
      vaultActions.equipCosmetic(item.slot, item.id);
      setPreviewItem(null);
      setPose('happy');
      setShopNotice(`Equipped ${item.name}!`);
      return;
    }

    const ok = vaultActions.buyAndEquipCosmetic(item.id);
    if (ok) {
      playSfx(isPropOrPet ? 'equip_prop_pet' : 'chest_open');
      setPreviewItem(null);
      setPose('victory_dance');
      setShopNotice(`Unlocked & equipped ${item.name}!`);
    } else {
      playSfx('gentle_nudge');
      setShopNotice(`Collect ${item.costGems - activeProfile.gems} more Gems for ${item.name}!`);
    }
  };

  const activeCompanionName =
    COMPANION_SWITCHERS.find((c) => c.id === previewCompanion)?.label ?? 'Pip';

  return (
    <section aria-label="Companion Gem Shop" className="shop-console-grid">
      {/* Left Console Pedestal: Live Companion Wardrobe + Switcher + Streak Freeze Shield */}
      <div className="shop-pedestal-col">
        <div
          className="tactile-card shop-wardrobe-card"
          style={{
            padding: compact ? '9px 10px' : 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: compact ? 6 : 8,
            textAlign: 'center',
            background: 'var(--card-bg)',
            flexShrink: 0,
            minWidth: 0,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: compact ? '0.84rem' : '0.9rem' }}>
              <ShoppingBag size={compact ? 14 : 16} /> {activeCompanionName}’s Wardrobe
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

          {compact ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0 }}>
              <div style={{ flex: '0 0 auto' }}>
                <MascotStage
                  companionId={previewCompanion}
                  pose={pose}
                  equippedCosmetics={previewCosmetics}
                  size={74}
                  badgeText={previewItem ? `Trying: ${previewItem.name}` : 'Live Outfit'}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <div
                  role="group"
                  aria-label="Preview companion switcher"
                  style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}
                >
                  {COMPANION_SWITCHERS.map((comp) => {
                    const isSelected = previewCompanion === comp.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        aria-pressed={isSelected}
                        className={`tactile-tile ${isSelected ? 'is-selected' : ''}`}
                        style={{ padding: '3px 7px', fontSize: '0.68rem', borderRadius: 10 }}
                        onClick={() => {
                          playSfx('tile_tap');
                          setPreviewCompanion(comp.id);
                        }}
                      >
                        {comp.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                    onClick={() => {
                      playSfx('button_click');
                      setPose((p) => (p === 'victory_dance' ? 'happy' : 'victory_dance'));
                    }}
                  >
                    <Sparkles size={12} /> Dance
                  </button>
                  {previewItem ? (
                    <button
                      type="button"
                      className="tactile-btn tactile-btn-soft"
                      style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                      onClick={() => setPreviewItem(null)}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Companion Pedestal Switcher */}
              <div
                role="group"
                aria-label="Preview companion switcher"
                style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}
              >
                {COMPANION_SWITCHERS.map((comp) => {
                  const isSelected = previewCompanion === comp.id;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      aria-pressed={isSelected}
                      className={`tactile-tile ${isSelected ? 'is-selected' : ''}`}
                      style={{ padding: '3px 7px', fontSize: '0.7rem', borderRadius: 10 }}
                      onClick={() => {
                        playSfx('tile_tap');
                        setPreviewCompanion(comp.id);
                      }}
                    >
                      {comp.label}
                    </button>
                  );
                })}
              </div>

              <MascotStage
                companionId={previewCompanion}
                pose={pose}
                equippedCosmetics={previewCosmetics}
                size={142}
                badgeText={previewItem ? `Trying: ${previewItem.name}` : 'Live Outfit'}
              />

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="tactile-btn tactile-btn-soft"
                  style={{ padding: '4px 9px', fontSize: '0.76rem' }}
                  onClick={() => {
                    playSfx('button_click');
                    setPose((p) => (p === 'victory_dance' ? 'happy' : 'victory_dance'));
                  }}
                >
                  <Sparkles size={13} /> Dance
                </button>
                {previewItem ? (
                  <button
                    type="button"
                    className="tactile-btn tactile-btn-soft"
                    style={{ padding: '4px 9px', fontSize: '0.76rem' }}
                    onClick={() => setPreviewItem(null)}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Compact Streak Freeze Shield Power-Up */}
        <div
          className="tactile-card shop-shield-card"
          style={{
            padding: compact ? '8px 10px' : 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: compact ? 6 : 8,
            minWidth: 0,
            width: '100%',
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
                fontSize: '0.72rem',
              }}
            >
              <Shield size={12} /> Power-Up
            </span>
            <span style={{ fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.76rem' }}>
              Owned: {activeProfile.streakShields}
            </span>
          </div>

          <div
            style={
              compact
                ? {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }
                : { display: 'flex', flexDirection: 'column', gap: 8 }
            }
          >
            <div style={{ minWidth: 0, flex: compact ? '1 1 140px' : undefined }}>
              <h2 style={{ margin: 0, fontSize: compact ? '0.92rem' : '1.02rem', fontWeight: 900 }}>
                Streak Freeze Shield
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: compact ? '0.72rem' : '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Protects your daily streak if you miss 1 day!
              </p>
            </div>

            <button
              type="button"
              className="tactile-btn tactile-btn-primary"
              style={{
                width: compact ? 'auto' : '100%',
                flex: compact ? '0 0 auto' : undefined,
                padding: compact ? '6px 10px' : '8px 12px',
                fontSize: compact ? '0.76rem' : '0.82rem',
              }}
              disabled={activeProfile.gems < STREAK_SHIELD_COST_GEMS}
              onClick={handleBuyShield}
            >
              <Shield size={compact ? 14 : 16} />
              <span>Buy Shield ({STREAK_SHIELD_COST_GEMS} Gems)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Console Cabinet: Category Tabs + Bounded Scroll Grid */}
      <div className="shop-cabinet-col">
        {shopNotice ? (
          <div
            role="status"
            className="tactile-card"
            style={{
              padding: '7px 12px',
              background: 'var(--tint-emerald-bg)',
              borderColor: 'var(--tint-emerald-border)',
              color: 'var(--tint-emerald-ink)',
              fontWeight: 900,
              fontSize: '0.84rem',
              flexShrink: 0,
            }}
          >
            {shopNotice}
          </div>
        ) : null}

        {/* Category Pills */}
        <div
          className={compact ? 'console-scroll-pane-x' : undefined}
          style={{
            display: 'flex',
            gap: 5,
            flexWrap: compact ? 'nowrap' : 'wrap',
            flexShrink: 0,
            paddingBottom: compact ? 2 : 0,
          }}
        >
          {SLOT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`tactile-tile ${slotFilter === f.id ? 'is-selected' : ''}`}
              style={{
                padding: compact ? '5px 9px' : '6px 11px',
                fontSize: compact ? '0.76rem' : '0.8rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {/* Cosmetics Grid (50 items across 7 slots) */}
            {showCosmeticsSection ? (
              filteredCosmetics.length === 0 ? (
                <div className="tactile-card" style={{ padding: 20, fontWeight: 700, color: 'var(--text-muted)' }}>
                  No cosmetic items available in this category yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(215px, 100%), 1fr))',
                    gap: 10,
                  }}
                >
                  {filteredCosmetics.map((item) => {
                    const isEquipped = activeProfile.equippedCosmetics[item.slot] === item.id;
                    const isUnlocked = unlockedSet.has(item.id);
                    const canAfford = activeProfile.gems >= item.costGems;
                    const isPreviewing = previewItem?.id === item.id;
                    const swatches = THEME_SWATCH_TRIPLES[item.id] ?? [
                      item.accentColor,
                      '#FBBF24',
                      '#38BDF8',
                    ];
                    const tierMeta = item.tierHint ? PROFICIENCY_TIER_META[item.tierHint] : null;

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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <PaletteOrbSwatches colors={swatches} size={item.slot === 'theme' ? 13 : 10} />
                              <span>{item.slot === 'theme' ? 'Palette' : item.slot}</span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {tierMeta ? (
                                <span
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: 999,
                                    background: tierMeta.surfaceTint,
                                    color: '#0f172a',
                                    border: `1px solid ${tierMeta.badgeColor}`,
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                  }}
                                >
                                  {tierMeta.cefrLabel}
                                </span>
                              ) : null}

                              {isEquipped ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: '#047857',
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
                          </div>

                          <div style={{ fontSize: '0.98rem', fontWeight: 900, color: 'var(--text-main)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-muted)' }}>
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
                                setShopNotice(
                                  `Previewing ${item.name} on ${activeCompanionName}! Buy & equip to apply theme.`
                                );
                              }
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            key={`shop-cosmetic-btn-${item.id}-${isEquipped ? 'eq' : isUnlocked ? 'un' : 'buy'}`}
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
              )
            ) : null}

            {/* Power-Ups & Upgrades Shelf */}
            {showPowerUpsSection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
                  <Zap size={16} color="#f59e0b" />
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Power-Ups & Upgrades
                  </h2>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(225px, 100%), 1fr))',
                    gap: 10,
                  }}
                >
                  {/* Heart Refill Elixir */}
                  <div
                    className="tactile-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--tint-rose-ink)' }}>
                          ELIXIR
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          Pack: {activeProfile.heartElixirs ?? 0}
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>Heart Refill Elixir</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
                        Instantly refills all Hearts when empty, or packs 1 Elixir for lessons!
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(activeProfile.heartElixirs ?? 0) > 0 && activeProfile.hearts < activeProfile.maxHearts ? (
                        <button
                          type="button"
                          className="tactile-btn tactile-btn-success"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                          onClick={handleUseHeartElixir}
                        >
                          <Heart size={13} />
                          <span>Use Elixir</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="tactile-btn tactile-btn-rose"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                        disabled={activeProfile.gems < HEART_ELIXIR_COST_GEMS}
                        onClick={handleBuyHeartElixir}
                      >
                        <Heart size={14} />
                        <span>
                          {activeProfile.hearts < activeProfile.maxHearts
                            ? `Refill (${HEART_ELIXIR_COST_GEMS}g)`
                            : `Buy Elixir (${HEART_ELIXIR_COST_GEMS} Gems)`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Heart Container Crystal */}
                  <div
                    className="tactile-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--tint-emerald-ink)' }}>
                          UPGRADE
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          {activeProfile.maxHearts} / {MAX_HEART_CONTAINERS} Hearts
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>Heart Container Crystal</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
                        Permanently adds +1 Max Heart Container (up to {MAX_HEART_CONTAINERS} Hearts)!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tactile-btn tactile-btn-success"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem' }}
                      disabled={
                        activeProfile.maxHearts >= MAX_HEART_CONTAINERS ||
                        activeProfile.gems < HEART_CRYSTAL_COST_GEMS
                      }
                      onClick={handleBuyHeartCrystal}
                    >
                      <Heart size={14} fill="#ffffff" />
                      <span>
                        {activeProfile.maxHearts >= MAX_HEART_CONTAINERS
                          ? `Maxed (${MAX_HEART_CONTAINERS}/${MAX_HEART_CONTAINERS})`
                          : `Upgrade Heart (${HEART_CRYSTAL_COST_GEMS} Gems)`}
                      </span>
                    </button>
                  </div>

                  {/* 2x XP Starlight Booster */}
                  <div
                    className="tactile-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--tint-amber-ink)' }}>
                          2X BOOSTER
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          Charges: {activeProfile.xpBoosterCharges ?? 0}
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '0.96rem' }}>2x XP Starlight Booster</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
                        Doubles XP on your next {XP_BOOSTER_CHARGES_PER_BUY} lesson or arcade wins!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tactile-btn tactile-btn-indigo"
                      style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem' }}
                      disabled={activeProfile.gems < XP_BOOSTER_COST_GEMS}
                      onClick={handleBuyXpBooster}
                    >
                      <Zap size={14} />
                      <span>
                        Buy +{XP_BOOSTER_CHARGES_PER_BUY} Charges ({XP_BOOSTER_COST_GEMS} Gems)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Profile Avatars Unlock Shelf */}
            {showAvatarsSection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
                  <UserCheck size={16} color="#6366f1" />
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    Profile Avatars
                  </h2>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(215px, 100%), 1fr))',
                    gap: 10,
                  }}
                >
                  {displayedAvatars.map((av) => {
                    const isUnlocked =
                      unlockedAvatarSet.has(av.id) || STARTER_AVATAR_IDS.includes(av.id);
                    const isActive = activeProfile.avatarId === av.id;
                    const canAfford = activeProfile.gems >= av.costGems;

                    return (
                      <div
                        key={av.id}
                        className="tactile-card"
                        style={{
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 8,
                          borderColor: isActive ? 'var(--tint-emerald-border)' : 'var(--card-border)',
                          background: isActive ? 'var(--tint-emerald-bg)' : 'var(--card-bg)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <AvatarBadge avatarId={av.id} size={42} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: '0.94rem', color: 'var(--text-main)' }}>
                              {av.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              {av.description}
                            </div>
                          </div>
                        </div>

                        <button
                          key={`shop-avatar-btn-${av.id}-${isActive ? 'active' : isUnlocked ? 'sel' : 'buy'}`}
                          type="button"
                          className={`tactile-btn ${
                            isActive
                              ? 'tactile-btn-soft'
                              : isUnlocked
                                ? 'tactile-btn-success'
                                : 'tactile-btn-amber'
                          }`}
                          style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem' }}
                          disabled={isActive || (!isUnlocked && !canAfford)}
                          onClick={() => handleSelectOrBuyAvatar(av)}
                        >
                          {isActive ? (
                            <>
                              <Check size={14} />
                              <span>Active Avatar</span>
                            </>
                          ) : isUnlocked ? (
                            <span>Select Avatar</span>
                          ) : (
                            <>
                              <Gem size={14} />
                              <span>Unlock Crest ({av.costGems} Gems)</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
