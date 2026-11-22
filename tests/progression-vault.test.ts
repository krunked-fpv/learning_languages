import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AVATAR_SHOP_CATALOG,
  BADGE_CATALOG,
  COSMETIC_CATALOG,
  FREE_RECALL_BONUS_GEMS,
  FREE_RECALL_BONUS_XP,
  HEART_CRYSTAL_COST_GEMS,
  HEART_ELIXIR_COST_GEMS,
  LEAGUE_TIER_META,
  MAX_HEART_CONTAINERS,
  STARTER_AVATAR_IDS,
  STREAK_SHIELD_COST_GEMS,
  TIER_ORDER,
  UNLOCKABLE_AVATAR_COSTS,
  XP_BOOSTER_CHARGES_PER_BUY,
  XP_BOOSTER_COST_GEMS,
  applyDailyPracticeStreak,
  buildWeeklyLeaderboard,
  calculateComboMultiplier,
  calculateLessonRewards,
  evaluateUnlockedBadges,
  getAvatarById,
  getBadgeProgress,
  resolveLeagueTierForXp,
} from '../src/core';
import {
  STORAGE_KEY,
  createDefaultVault,
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  useVaultStore,
  vaultActions,
} from '../src/store/useVaultStore';
import {
  ILLUSTRATION_KEYS,
  LANGUAGE_LIST,
  type AvatarId,
  type BadgeId,
  type CosmeticId,
  type KidProfile,
  type LanguageCode,
  type LeagueTier,
} from '../src/types/contracts';

const ALL_BADGE_IDS: readonly BadgeId[] = [
  'first_hello',
  'polyglot_explorer',
  'turtle_listener',
  'combo_comet',
  'phrasebook_collector',
  'arcade_ace',
  'boss_befriender',
  'accent_scholar',
  'streak_spark',
  'chest_hunter',
  'story_reader',
  'starlight_master',
  'globe_trotter_5',
  'grand_atlas_10',
  'storyweaver_b1',
  'diplomat_b2',
  'polyglot_laureate_c2',
  'free_recall_virtuoso',
  'nuance_detective',
  'fluent_listener',
  'wardrobe_stylist',
  'crystal_heart_guardian',
  'arcade_champion',
  'laureate_legend_xp',
];

const ALL_COSMETIC_IDS: readonly CosmeticId[] = [
  // Hats (9)
  'hat_explorer_beret',
  'hat_fiesta_sombrero',
  'hat_alpine_tyrolean',
  'hat_gondolier_boater',
  'hat_starlight_wizard',
  'hat_sakura_crown',
  'hat_desert_turban_star',
  'hat_astronomer_mitre',
  'hat_laureate_wreath',
  // Glasses (5)
  'glasses_brass_aviator',
  'glasses_starlight_frames',
  'glasses_scholar_monocle',
  'glasses_pixel_visor',
  'glasses_constellation_shades',
  // Capes (4)
  'cape_rainbow_wings',
  'cape_traveler_cloak',
  'cape_aurora_mantle',
  'cape_velvet_laureate',
  // Auras (5)
  'aura_golden_compass',
  'aura_fireflies',
  'aura_sakura_breeze',
  'aura_polyglot_glyphs',
  'aura_laureate_supernova',
  // Handheld Props (7)
  'prop_explorer_ukulele',
  'prop_starlight_telescope',
  'prop_golden_quill',
  'prop_festival_lantern',
  'prop_boulangerie_whisk',
  'prop_compass_astrolabe',
  'prop_laureate_scroll',
  // Mini Sidekick Pets (6)
  'pet_origami_crane',
  'pet_clockwork_owl',
  'pet_axolotl_sprite',
  'pet_desert_fennec',
  'pet_starlight_seahorse',
  'pet_phoenix_chick',
  // UI Themes (14)
  'theme_sunset_plaza',
  'theme_starlight_indigo',
  'theme_alpine_meadow',
  'theme_cosmic_galaxy',
  'theme_aurora_borealis',
  'theme_candy_sakura',
  'theme_ocean_lagoon',
  'theme_royal_velvet',
  'theme_kyoto_matcha',
  'theme_sahara_mirage',
  'theme_emerald_rainforest',
  'theme_neon_night_market',
  'theme_nordic_fjord',
  'theme_laureate_imperial',
];

const ALL_AVATAR_IDS: readonly AvatarId[] = [
  'pip_explorer',
  'mateo_chef',
  'colette_baker',
  'benni_tinker',
  'luca_captain',
  'star_compass',
  'origami_crane_crest',
  'clockwork_owl_crest',
  'fennec_voyager',
  'grand_laureate_crest',
];

function cloneDefaultLeo(): KidProfile {
  return structuredClone(createDefaultVault().profiles[0]);
}

describe('Challenge 3-vault: Progression, Streaks, Badges, Leagues & Multi-Kid Vault', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
  });

  it('computes combo XP multipliers (3x, 5x, ON FIRE!) and lesson star ratings accurately', () => {
    expect(calculateComboMultiplier(0)).toEqual({ multiplier: 1, label: '', bonusGems: 0 });
    expect(calculateComboMultiplier(2)).toEqual({ multiplier: 1, label: '2x', bonusGems: 0 });
    expect(calculateComboMultiplier(3)).toEqual({ multiplier: 1.25, label: '3x', bonusGems: 1 });
    expect(calculateComboMultiplier(4)).toEqual({ multiplier: 1.25, label: '4x', bonusGems: 1 });
    expect(calculateComboMultiplier(5)).toEqual({ multiplier: 1.5, label: '5x', bonusGems: 2 });
    expect(calculateComboMultiplier(6)).toEqual({ multiplier: 2.0, label: 'ON FIRE!', bonusGems: 3 });
    expect(calculateComboMultiplier(12)).toEqual({ multiplier: 2.0, label: 'ON FIRE!', bonusGems: 3 });

    expect(
      calculateLessonRewards({ baseXp: 20, baseGems: 5, maxCombo: 6, mistakesCount: 0 })
    ).toEqual({
      xpEarned: 45, // 20 * 2.0 + 5 star bonus
      gemsEarned: 10, // 5 + 3 combo + 2 three-star bonus
      stars: 3,
    });

    expect(
      calculateLessonRewards({ baseXp: 20, baseGems: 5, maxCombo: 3, mistakesCount: 2 })
    ).toEqual({
      xpEarned: 27, // 20 * 1.25 + 2
      gemsEarned: 6, // 5 + 1
      stars: 2,
    });

    expect(
      calculateLessonRewards({ baseXp: 20, baseGems: 5, maxCombo: 1, mistakesCount: 4 })
    ).toEqual({
      xpEarned: 20,
      gemsEarned: 5,
      stars: 1,
    });

    // Optional freeRecallCount adds +FREE_RECALL_BONUS_XP and +FREE_RECALL_BONUS_GEMS per solve
    expect(
      calculateLessonRewards({
        baseXp: 50,
        baseGems: 25,
        maxCombo: 6,
        mistakesCount: 0,
        freeRecallCount: 2,
      })
    ).toEqual({
      xpEarned: 105 + 2 * FREE_RECALL_BONUS_XP,
      gemsEarned: 30 + 2 * FREE_RECALL_BONUS_GEMS,
      stars: 3,
    });
  });

  it('tracks daily practice streaks and automatically consumes a Streak Shield when 1 calendar day is missed', () => {
    let profile = cloneDefaultLeo();
    profile.streakShields = 1;
    profile.streakDays = 1;
    profile.lastPracticeISO = null;

    // First practice
    profile = applyDailyPracticeStreak(profile, '2026-11-10');
    expect(profile.streakDays).toBe(1);
    expect(profile.lastPracticeISO).toBe('2026-11-10');
    expect(profile.streakShields).toBe(1);

    // Same day repeat does not inflate streak
    profile = applyDailyPracticeStreak(profile, '2026-11-10');
    expect(profile.streakDays).toBe(1);

    // Next consecutive day increments streak
    profile = applyDailyPracticeStreak(profile, '2026-11-11');
    expect(profile.streakDays).toBe(2);
    expect(profile.streakShields).toBe(1);

    // Miss exactly 1 calendar day (skip 2026-11-12, return 2026-11-13 -> diffDays = 2)
    // Shield should protect streak and decrement by 1
    profile = applyDailyPracticeStreak(profile, '2026-11-13');
    expect(profile.streakDays).toBe(3);
    expect(profile.streakShields).toBe(0);
    expect(profile.lastPracticeISO).toBe('2026-11-13');

    // Miss 1 day again with 0 shields -> streak resets to 1
    profile = applyDailyPracticeStreak(profile, '2026-11-15');
    expect(profile.streakDays).toBe(1);
    expect(profile.streakShields).toBe(0);

    // Missing 2+ calendar days resets even when holding a shield, without burning shield
    profile.streakDays = 5;
    profile.streakShields = 2;
    profile = applyDailyPracticeStreak(profile, '2026-11-18');
    expect(profile.streakDays).toBe(1);
    expect(profile.streakShields).toBe(2);
  });

  it('defines all 24 BADGE_CATALOG badges and unlocks each one when its condition is met', () => {
    expect(BADGE_CATALOG.length).toBe(24);
    const catalogIds = new Set(BADGE_CATALOG.map((b) => b.id));
    for (const id of ALL_BADGE_IDS) {
      expect(catalogIds.has(id), `Missing badge ${id}`).toBe(true);
    }
    for (const badge of BADGE_CATALOG) {
      expect(ILLUSTRATION_KEYS).toContain(badge.iconKey);
    }

    const p = cloneDefaultLeo();
    expect(evaluateUnlockedBadges(p)).toEqual([]);

    p.stats.lessonsCompleted = 1;
    for (const lang of LANGUAGE_LIST.slice(0, 10)) {
      p.languageProgress[lang].xpEarned = 30;
    }
    p.stats.turtlePlaysCount = 5;
    p.stats.bestComboStreak = 5;
    p.languageProgress.es.unlockedVocabIds = Array.from({ length: 15 }, (_, i) => `es-u1-c${i}`);
    p.stats.arcadeGamesWon = 10;
    p.stats.bossesCleared = 1;
    p.stats.accentSpotlightsSeen = 3;
    p.streakDays = 3;
    p.languageProgress.es.claimedChestIds = ['c1', 'c2'];
    p.stats.storiesCompleted = 2;
    p.totalXp = 1500;
    p.stats.freeRecallSolved = 5;
    p.stats.clozeSolved = 5;
    p.stats.fluentPlaysCount = 5;
    p.unlockedCosmetics = [
      'hat_explorer_beret',
      'prop_explorer_ukulele',
      'pet_origami_crane',
      'theme_cosmic_galaxy',
      'theme_kyoto_matcha',
    ];
    p.maxHearts = MAX_HEART_CONTAINERS;
    p.languageProgress.es.unlockedTiers = ['A2', 'B1', 'B2', 'C1_C2'];

    const unlocked = evaluateUnlockedBadges(p);
    expect(unlocked).toHaveLength(24);
    expect(new Set(unlocked)).toEqual(new Set(ALL_BADGE_IDS));

    // Also verify storyweaver_b1 / diplomat_b2 / polyglot_laureate_c2 trigger via completed unit node IDs (>=9 / >=12 / >=15)
    const unitPathProfile = cloneDefaultLeo();
    unitPathProfile.languageProgress.fr.completedNodeIds = ['fr-u9-n1'];
    expect(evaluateUnlockedBadges(unitPathProfile)).toContain('storyweaver_b1');
    expect(evaluateUnlockedBadges(unitPathProfile)).not.toContain('diplomat_b2');
    unitPathProfile.languageProgress.fr.completedNodeIds.push('fr-u12-n1');
    expect(evaluateUnlockedBadges(unitPathProfile)).toContain('diplomat_b2');
    unitPathProfile.languageProgress.fr.completedNodeIds.push('fr-u15-n1');
    expect(evaluateUnlockedBadges(unitPathProfile)).toContain('polyglot_laureate_c2');
  });

  it('builds smooth weekly leaderboards across all 8 league tiers', () => {
    const tiers: LeagueTier[] = [
      'bronze_acorn',
      'silver_compass',
      'gold_feather',
      'sapphire_sky',
      'starlight_legend',
      'emerald_diplomat',
      'amethyst_symposium',
      'grand_polyglot_laureate',
    ];
    expect(TIER_ORDER).toEqual(tiers);
    for (const tier of tiers) {
      expect(LEAGUE_TIER_META[tier]).toBeDefined();
    }
    expect(resolveLeagueTierForXp(0)).toBe('bronze_acorn');
    expect(resolveLeagueTierForXp(1400)).toBe('starlight_legend');
    expect(resolveLeagueTierForXp(2200)).toBe('emerald_diplomat');
    expect(resolveLeagueTierForXp(3200)).toBe('amethyst_symposium');
    expect(resolveLeagueTierForXp(4500)).toBe('grand_polyglot_laureate');

    const p = cloneDefaultLeo();
    p.weeklyXp = 3350;
    p.leagueTier = resolveLeagueTierForXp(p.weeklyXp);
    expect(p.leagueTier).toBe('amethyst_symposium');
    const board = buildWeeklyLeaderboard(p);
    expect(board.length).toBeGreaterThanOrEqual(8);
    expect(board.some((e) => !e.isPlayer && e.avatarId === 'grand_laureate_crest')).toBe(true);
    const playerRows = board.filter((e) => e.isPlayer);
    expect(playerRows).toHaveLength(1);
    expect(playerRows[0].weeklyXp).toBe(3350);
    for (let i = 0; i < board.length; i++) {
      expect(board[i].rank).toBe(i + 1);
      if (i > 0) {
        expect(board[i - 1].weeklyXp).toBeGreaterThanOrEqual(board[i].weeklyXp);
      }
    }
  });

  it('defines all 50 cosmetics (all 7 slots incl. prop & pet + 14 UI themes) and all 10 avatars, and supports purchasing, equipping, Streak Shields, and multi-kid isolation', () => {
    expect(COSMETIC_CATALOG.length).toBe(50);
    expect(AVATAR_SHOP_CATALOG.length).toBe(10);
    expect(STREAK_SHIELD_COST_GEMS).toBe(45);
    const cosIds = new Set(COSMETIC_CATALOG.map((c) => c.id));
    for (const id of ALL_COSMETIC_IDS) {
      expect(cosIds.has(id), `Missing cosmetic ${id}`).toBe(true);
    }
    for (const avId of ALL_AVATAR_IDS) {
      expect(getAvatarById(avId), `Missing avatar metadata ${avId}`).toBeDefined();
    }
    expect(COSMETIC_CATALOG.filter((c) => c.slot === 'prop')).toHaveLength(7);
    expect(COSMETIC_CATALOG.filter((c) => c.slot === 'pet')).toHaveLength(6);
    const themeCatalogIds = COSMETIC_CATALOG.filter((c) => c.slot === 'theme').map((c) => c.id);
    expect(themeCatalogIds).toEqual([
      'theme_sunset_plaza',
      'theme_starlight_indigo',
      'theme_alpine_meadow',
      'theme_cosmic_galaxy',
      'theme_aurora_borealis',
      'theme_candy_sakura',
      'theme_ocean_lagoon',
      'theme_royal_velvet',
      'theme_kyoto_matcha',
      'theme_sahara_mirage',
      'theme_emerald_rainforest',
      'theme_neon_night_market',
      'theme_nordic_fjord',
      'theme_laureate_imperial',
    ]);
    const cosmicTheme = COSMETIC_CATALOG.find((c) => c.id === 'theme_cosmic_galaxy');
    expect(cosmicTheme).toBeDefined();
    expect(cosmicTheme?.costGems).toBe(40);

    const { result } = renderHook(() => useVaultStore());
    expect(result.current.vault.profiles.map((p) => p.name)).toEqual(['Leo', 'Maya']);

    // Leo buys and equips beret (35 gems out of 80 -> 45 left)
    act(() => {
      const ok = vaultActions.buyAndEquipCosmetic('hat_explorer_beret');
      expect(ok).toBe(true);
    });
    expect(result.current.activeProfile.gems).toBe(45);
    expect(result.current.activeProfile.equippedCosmetics.hat).toBe('hat_explorer_beret');
    expect(result.current.activeProfile.unlockedCosmetics).toContain('hat_explorer_beret');

    // Buying Streak Shield (45 gems -> 0 left)
    act(() => {
      const ok = vaultActions.buyStreakShield();
      expect(ok).toBe(true);
    });
    expect(result.current.activeProfile.gems).toBe(0);
    expect(result.current.activeProfile.streakShields).toBe(2);

    // Insufficient gems fails cleanly
    act(() => {
      expect(vaultActions.buyStreakShield()).toBe(false);
      expect(vaultActions.buyAndEquipCosmetic('hat_starlight_wizard')).toBe(false);
    });

    // Unequipping and re-equipping owned cosmetic costs 0 gems
    act(() => {
      vaultActions.equipCosmetic('hat', undefined);
    });
    expect(result.current.activeProfile.equippedCosmetics.hat).toBeUndefined();
    act(() => {
      expect(vaultActions.buyAndEquipCosmetic('hat_explorer_beret')).toBe(true);
    });
    expect(result.current.activeProfile.equippedCosmetics.hat).toBe('hat_explorer_beret');
    expect(result.current.activeProfile.gems).toBe(0);

    // Award gems and verify prop & pet slot equipping + unequipping
    act(() => {
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: 'es-u1-n1',
        stars: 3,
        xpEarned: 30,
        gemsEarned: 200,
        unlockedVocabIds: [],
        maxCombo: 3,
      });
      expect(vaultActions.buyAndEquipCosmetic('prop_explorer_ukulele')).toBe(true);
      expect(vaultActions.buyAndEquipCosmetic('pet_origami_crane')).toBe(true);
    });
    expect(result.current.activeProfile.equippedCosmetics.prop).toBe('prop_explorer_ukulele');
    expect(result.current.activeProfile.equippedCosmetics.pet).toBe('pet_origami_crane');
    act(() => {
      vaultActions.equipCosmetic('prop', undefined);
      vaultActions.equipCosmetic('pet', undefined);
    });
    expect(result.current.activeProfile.equippedCosmetics.prop).toBeUndefined();
    expect(result.current.activeProfile.equippedCosmetics.pet).toBeUndefined();

    // Create 3rd kid profile and verify isolation from Leo & Maya
    let samId = '';
    act(() => {
      const sam = vaultActions.createProfile({
        name: 'Sam',
        avatarId: 'luca_captain',
        bannerColor: '#059669',
      });
      samId = sam.id;
    });
    expect(result.current.activeProfile.id).toBe(samId);
    expect(result.current.activeProfile.gems).toBe(80);
    expect(result.current.activeProfile.equippedCosmetics).toEqual({});

    // Independent 4-language progress on Sam
    act(() => {
      vaultActions.setActiveLanguage('de');
      vaultActions.setCurrentUnitIndex('de', 2);
      vaultActions.completeMapNode({
        language: 'de',
        nodeId: 'de-u1-n1',
        stars: 3,
        xpEarned: 35,
        gemsEarned: 12,
        unlockedVocabIds: ['de-u1-c1', 'de-u1-c2'],
        maxCombo: 4,
      });
      vaultActions.setActiveLanguage('it');
    });
    expect(result.current.activeProfile.languageProgress.de.completedNodeIds).toEqual(['de-u1-n1']);
    expect(result.current.activeProfile.languageProgress.de.currentUnitIndex).toBe(2);
    expect(result.current.activeProfile.languageProgress.it.completedNodeIds).toEqual([]);
    expect(result.current.activeProfile.languageProgress.es.xpEarned).toBe(0);

    // Switch back to Maya: her progress is untouched
    act(() => {
      vaultActions.switchProfile('kid-maya');
    });
    expect(result.current.activeProfile.name).toBe('Maya');
    expect(result.current.activeProfile.activeLanguage).toBe('fr');
    expect(result.current.activeProfile.totalXp).toBe(0);

    // Last-profile deletion guard
    act(() => {
      expect(vaultActions.deleteProfile(samId)).toBe(true);
      expect(vaultActions.deleteProfile('kid-maya')).toBe(true);
      expect(vaultActions.deleteProfile('kid-leo')).toBe(false);
    });
    expect(result.current.vault.profiles).toHaveLength(1);
    expect(result.current.activeProfile.id).toBe('kid-leo');

    // Persisted in localStorage under STORAGE_KEY
    const rawSaved = window.localStorage.getItem(STORAGE_KEY);
    expect(rawSaved).toBeTruthy();
    const reloaded = loadVaultFromStorage();
    expect(reloaded.profiles).toHaveLength(1);
    expect(reloaded.profiles[0].equippedCosmetics.hat).toBe('hat_explorer_beret');
  });

  it('prevents double-claiming Chest gems on replay and restores hearts cleanly from Arcade', () => {
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-chest',
      stars: 3,
      xpEarned: 20,
      gemsEarned: 25,
      unlockedVocabIds: ['es-u1-c13'],
      maxCombo: 0,
      isChest: true,
    });
    const afterFirst = loadVaultFromStorage().profiles[0];
    expect(afterFirst.gems).toBe(105);

    // Replay same chest node -> gems must not double-grant
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-chest',
      stars: 3,
      xpEarned: 20,
      gemsEarned: 25,
      unlockedVocabIds: ['es-u1-c13'],
      maxCombo: 0,
      isChest: true,
    });
    const afterSecond = loadVaultFromStorage().profiles[0];
    expect(afterSecond.gems).toBe(105);

    // Drain hearts to 0 and restore via Arcade
    for (let i = 0; i < 6; i++) {
      vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    }
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(0);

    vaultActions.restoreHeartsFromArcade({ heartsWon: 99, bonusGems: 15 });
    const afterArcade = loadVaultFromStorage().profiles[0];
    expect(afterArcade.hearts).toBe(5); // clamped to maxHearts
    expect(afterArcade.gems).toBe(120);
    expect(afterArcade.stats.arcadeGamesWon).toBe(1);
  });

  it('supports exportVaultJson + importVaultJson (replace, merge) and rejects corrupt JSON safely', () => {
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 2,
      xpEarned: 30,
      gemsEarned: 10,
      unlockedVocabIds: ['es-u1-c1'],
      maxCombo: 3,
    });
    const exportedLeoProgress = exportVaultJson();

    // Reset to clean vault, then add progress on Maya & test replace vs merge
    vaultActions.resetVaultToDefaults();
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(0);

    // Replace restores Leo's progress
    const replaceRes = importVaultJson(exportedLeoProgress, 'replace');
    expect(replaceRes.ok).toBe(true);
    expect(replaceRes.importedProfilesCount).toBe(2);
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(30);

    // Merge combines higher stars, unlocked vocab, and new profiles without discarding local work
    const incomingVault = createDefaultVault();
    incomingVault.profiles[0].languageProgress.es.completedNodeIds = ['es-u1-n1', 'es-u1-n2'];
    incomingVault.profiles[0].languageProgress.es.nodeStars = { 'es-u1-n1': 3, 'es-u1-n2': 3 };
    incomingVault.profiles[0].languageProgress.es.unlockedVocabIds = ['es-u1-c2'];
    incomingVault.profiles[0].totalXp = 90;
    incomingVault.profiles.push({
      ...cloneDefaultLeo(),
      id: 'kid-elena',
      name: 'Elena',
      avatarId: 'star_compass',
    });

    const mergeRes = importVaultJson(JSON.stringify(incomingVault), 'merge');
    expect(mergeRes.ok).toBe(true);
    const mergedVault = loadVaultFromStorage();
    expect(mergedVault.profiles.map((p) => p.id)).toContain('kid-elena');
    const mergedLeo = mergedVault.profiles.find((p) => p.id === 'kid-leo')!;
    expect(mergedLeo.languageProgress.es.completedNodeIds).toEqual(
      expect.arrayContaining(['es-u1-n1', 'es-u1-n2'])
    );
    expect(mergedLeo.languageProgress.es.nodeStars['es-u1-n1']).toBe(3);
    expect(mergedLeo.languageProgress.es.unlockedVocabIds).toEqual(
      expect.arrayContaining(['es-u1-c1', 'es-u1-c2'])
    );

    // Corrupt / invalid JSON payloads must fail cleanly without altering current vault
    const invalidPayloads = [
      '',
      '{not-json',
      '{"schemaVersion": 99}',
      JSON.stringify({ ...incomingVault, profiles: [] }),
      JSON.stringify({ ...incomingVault, activeProfileId: 'missing-id' }),
      JSON.stringify({
        ...incomingVault,
        profiles: [{ ...incomingVault.profiles[0], avatarId: 'bad_avatar' }],
      }),
      JSON.stringify({
        ...incomingVault,
        profiles: [
          {
            ...incomingVault.profiles[0],
            equippedCosmetics: { hat: 'cape_rainbow_wings' },
          },
        ],
      }),
      JSON.stringify({
        ...incomingVault,
        profiles: [
          {
            ...incomingVault.profiles[0],
            languageProgress: {
              ...incomingVault.profiles[0].languageProgress,
              es: {
                ...incomingVault.profiles[0].languageProgress.es,
                nodeStars: { 'es-u1-n1': 99 },
              },
            },
          },
        ],
      }),
    ];

    const snapshotBeforeBadImports = exportVaultJson();
    for (const bad of invalidPayloads) {
      const res = importVaultJson(bad, 'replace');
      expect(res.ok, `Expected rejection for payload: ${bad.slice(0, 60)}`).toBe(false);
      expect(res.error).toBeTruthy();
      expect(exportVaultJson()).toBe(snapshotBeforeBadImports);
    }

    // Corrupt localStorage recovers cleanly to default vault
    window.localStorage.setItem(STORAGE_KEY, '{corrupt');
    const fallback = loadVaultFromStorage();
    expect(fallback.profiles.map((p) => p.name)).toEqual(['Leo', 'Maya']);
  });

  it('supports getBadgeProgress, 600-entry ring buffer recordSeenExercises, secret arcade vault actions, and legacy save imports', () => {
    const profile = cloneDefaultLeo();
    profile.stats.storiesCompleted = 1;
    profile.languageProgress.es.completedNodeIds = ['es-u1-n5'];
    profile.languageProgress.fr.xpEarned = 20;

    expect(getBadgeProgress(profile, 'first_hello')).toEqual({
      current: 1,
      target: 1,
      unlocked: true,
    });
    expect(getBadgeProgress(profile, 'polyglot_explorer')).toEqual({
      current: 2,
      target: 2,
      unlocked: true,
    });

    // Ring buffer caps at 1500 exercise IDs per language
    const batch1 = Array.from({ length: 1000 }, (_, i) => `ex-${i}`);
    const batch2 = Array.from({ length: 700 }, (_, i) => `ex-${1000 + i}`);
    vaultActions.recordSeenExercises('es', batch1);
    vaultActions.recordSeenExercises('es', batch2);
    const seen = loadVaultFromStorage().profiles[0].languageProgress.es.seenExerciseIds ?? [];
    expect(seen).toHaveLength(1500);
    expect(seen[0]).toBe('ex-200');
    expect(seen[1499]).toBe('ex-1699');

    // unlockSecretArcade awards +15 gems once
    expect(vaultActions.unlockSecretArcade()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(95);
    expect(vaultActions.unlockSecretArcade()).toBe(false);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(95);

    // completeSecretArcadeRun updates best score & restores hearts
    vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    vaultActions.completeSecretArcadeRun({ score: 80, heartsWon: 3, bonusGems: 12 });
    vaultActions.completeSecretArcadeRun({ score: 50, heartsWon: 1, bonusGems: 4 });
    const afterSecret = loadVaultFromStorage().profiles[0];
    expect(afterSecret.secretArcadeBestScore).toBe(80);
    expect(afterSecret.hearts).toBe(5);
    expect(afterSecret.gems).toBe(111);

    // Legacy v1 save without Wave 2A optional fields imports cleanly
    const legacy = createDefaultVault() as unknown as Record<string, unknown>;
    const legacyProfiles = (legacy.profiles as Array<Record<string, unknown>>).map((p) => {
      const copy = { ...p };
      delete copy.secretArcadeUnlocked;
      delete copy.secretArcadeBestScore;
      return copy;
    });
    legacy.profiles = legacyProfiles;
    const legacyRes = importVaultJson(JSON.stringify(legacy), 'replace');
    expect(legacyRes.ok).toBe(true);
  });

  it('records high scores, gems, and clamped hearts across all 9 arcade game IDs and preserves them across vault export/import', () => {
    const ALL_ARCADE_GAME_IDS = [
      'sky_catcher',
      'meteor_blaster',
      'tower_stack',
      'constellation_memory',
      'train_switcher',
      'rhythm_chef',
      'cafe_order_rush',
      'starlight_bridge',
      'starlight_choir',
    ] as const;

    // Drain hearts down to 1 before playing
    for (let i = 0; i < 4; i++) {
      vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    }
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(1);

    ALL_ARCADE_GAME_IDS.forEach((gameId, idx) => {
      const firstScore = 100 + idx * 25;
      vaultActions.recordArcadeGameResult({
        gameId,
        score: firstScore,
        heartsWon: 1,
        bonusGems: 5,
      });
      // Lower replay score must NOT overwrite existing best score
      vaultActions.recordArcadeGameResult({
        gameId,
        score: 20,
        heartsWon: 2,
        bonusGems: 2,
      });
    });

    const afterGames = loadVaultFromStorage().profiles[0];
    expect(afterGames.hearts).toBe(5); // clamped to maxHearts
    expect(afterGames.gems).toBe(80 + ALL_ARCADE_GAME_IDS.length * 7);
    expect(afterGames.stats.arcadeGamesWon).toBe(ALL_ARCADE_GAME_IDS.length * 2);
    expect(afterGames.secretArcadeBestScore).toBe(300);
    ALL_ARCADE_GAME_IDS.forEach((gameId, idx) => {
      expect(afterGames.arcadeHighScores?.[gameId]).toBe(100 + idx * 25);
    });

    // Save/import preserves arcadeHighScores
    const savedJson = exportVaultJson();
    vaultActions.resetVaultToDefaults();
    expect(loadVaultFromStorage().profiles[0].arcadeHighScores ?? {}).toEqual({});
    const reimported = importVaultJson(savedJson, 'replace');
    expect(reimported.ok).toBe(true);
    const restored = loadVaultFromStorage().profiles[0];
    expect(restored.arcadeHighScores).toEqual(afterGames.arcadeHighScores);
  });

  it('hydrates legacy 4-language (es, fr, de, it only) wanderling.vault.v1 saves into all 16 LANGUAGE_LIST entries across loadVaultFromStorage() and importVaultJson(replace & merge) without losing progress', () => {
    const legacyFourLangVault = {
      schemaVersion: 1,
      activeProfileId: 'kid-leo',
      audioSettings: { volume: 0.72, muted: false },
      profiles: [
        {
          id: 'kid-leo',
          name: 'Leo',
          avatarId: 'pip_explorer',
          bannerColor: '#2563EB',
          activeLanguage: 'es',
          gems: 145,
          hearts: 4,
          maxHearts: 5,
          streakDays: 6,
          lastPracticeISO: '2026-11-20',
          streakShields: 2,
          equippedCosmetics: { hat: 'hat_explorer_beret', theme: 'theme_cosmic_galaxy' },
          unlockedCosmetics: ['hat_explorer_beret', 'theme_cosmic_galaxy'],
          badges: ['first_hello', 'polyglot_explorer', 'streak_spark'],
          weeklyXp: 190,
          totalXp: 340,
          leagueTier: 'silver_compass',
          secretArcadeUnlocked: true,
          secretArcadeBestScore: 180,
          arcadeHighScores: { sky_catcher: 210, starlight_choir: 180 },
          stats: {
            lessonsCompleted: 5,
            storiesCompleted: 1,
            bossesCleared: 1,
            arcadeGamesWon: 4,
            turtlePlaysCount: 7,
            bestComboStreak: 6,
            accentSpotlightsSeen: 3,
          },
          languageProgress: {
            es: {
              completedNodeIds: ['es-u1-n1', 'es-u1-n2'],
              nodeStars: { 'es-u1-n1': 3, 'es-u1-n2': 2 },
              unlockedVocabIds: ['es-u1-c1', 'es-u1-c2', 'es-u1-c3'],
              claimedChestIds: ['es-u1-n6'],
              currentUnitIndex: 1,
              xpEarned: 220,
              seenExerciseIds: ['es-u1-n1-e1', 'es-u1-n1-e2'],
            },
            fr: {
              completedNodeIds: ['fr-u1-n1'],
              nodeStars: { 'fr-u1-n1': 3 },
              unlockedVocabIds: ['fr-u1-c1'],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 120,
              seenExerciseIds: ['fr-u1-n1-e1'],
            },
            de: {
              completedNodeIds: [],
              nodeStars: {},
              unlockedVocabIds: [],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 0,
            },
            it: {
              completedNodeIds: [],
              nodeStars: {},
              unlockedVocabIds: [],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 0,
            },
          },
        },
        {
          id: 'kid-maya',
          name: 'Maya',
          avatarId: 'colette_baker',
          bannerColor: '#EC4899',
          activeLanguage: 'fr',
          gems: 95,
          hearts: 5,
          maxHearts: 5,
          streakDays: 2,
          lastPracticeISO: '2026-11-20',
          streakShields: 1,
          equippedCosmetics: {},
          unlockedCosmetics: [],
          badges: ['first_hello'],
          weeklyXp: 60,
          totalXp: 60,
          leagueTier: 'bronze_acorn',
          stats: {
            lessonsCompleted: 1,
            storiesCompleted: 0,
            bossesCleared: 0,
            arcadeGamesWon: 0,
            turtlePlaysCount: 1,
            bestComboStreak: 3,
            accentSpotlightsSeen: 0,
          },
          languageProgress: {
            es: { completedNodeIds: [], nodeStars: {}, unlockedVocabIds: [], claimedChestIds: [], currentUnitIndex: 0, xpEarned: 0 },
            fr: {
              completedNodeIds: ['fr-u1-n1'],
              nodeStars: { 'fr-u1-n1': 3 },
              unlockedVocabIds: ['fr-u1-c1', 'fr-u1-c2'],
              claimedChestIds: [],
              currentUnitIndex: 0,
              xpEarned: 60,
            },
            de: { completedNodeIds: [], nodeStars: {}, unlockedVocabIds: [], claimedChestIds: [], currentUnitIndex: 0, xpEarned: 0 },
            it: { completedNodeIds: [], nodeStars: {}, unlockedVocabIds: [], claimedChestIds: [], currentUnitIndex: 0, xpEarned: 0 },
          },
        },
      ],
    };

    const legacyJson = JSON.stringify(legacyFourLangVault);

    // 1. Direct localStorage hydration via loadVaultFromStorage()
    window.localStorage.setItem(STORAGE_KEY, legacyJson);
    const loaded = loadVaultFromStorage();
    expect(loaded.profiles).toHaveLength(2);
    for (const profile of loaded.profiles) {
      expect(Object.keys(profile.languageProgress).sort()).toEqual([...LANGUAGE_LIST].sort());
      for (const lang of LANGUAGE_LIST) {
        expect(profile.languageProgress[lang]).toBeDefined();
        expect(Array.isArray(profile.languageProgress[lang].completedNodeIds)).toBe(true);
      }
    }
    const loadedLeo = loaded.profiles[0];
    expect(loadedLeo.totalXp).toBe(340);
    expect(loadedLeo.gems).toBe(145);
    expect(loadedLeo.streakDays).toBe(6);
    expect(loadedLeo.hearts).toBe(4);
    expect(loadedLeo.equippedCosmetics).toEqual({ hat: 'hat_explorer_beret', theme: 'theme_cosmic_galaxy' });
    expect(loadedLeo.unlockedCosmetics).toEqual(['hat_explorer_beret', 'theme_cosmic_galaxy']);
    expect(loadedLeo.languageProgress.es.unlockedVocabIds).toEqual(['es-u1-c1', 'es-u1-c2', 'es-u1-c3']);
    expect(loadedLeo.languageProgress.es.seenExerciseIds).toEqual(['es-u1-n1-e1', 'es-u1-n1-e2']);
    expect(loadedLeo.languageProgress.ja.xpEarned).toBe(0);
    expect(loadedLeo.languageProgress.arz.completedNodeIds).toEqual([]);

    // 2. importVaultJson(..., 'replace') hydrates all 16 languages and allows immediate progress on new languages
    vaultActions.resetVaultToDefaults();
    const replaceRes = importVaultJson(legacyJson, 'replace');
    expect(replaceRes.ok).toBe(true);
    expect(replaceRes.importedProfilesCount).toBe(2);

    vaultActions.setActiveLanguage('arz');
    vaultActions.completeMapNode({
      language: 'arz',
      nodeId: 'arz-u1-n1',
      stars: 3,
      xpEarned: 35,
      gemsEarned: 10,
      unlockedVocabIds: ['arz-u1-c1'],
      maxCombo: 4,
    });
    const afterArz = loadVaultFromStorage().profiles[0];
    expect(afterArz.totalXp).toBe(375);
    expect(afterArz.gems).toBe(155);
    expect(afterArz.languageProgress.arz.completedNodeIds).toEqual(['arz-u1-n1']);
    expect(afterArz.languageProgress.es.unlockedVocabIds).toEqual(['es-u1-c1', 'es-u1-c2', 'es-u1-c3']);

    // 3. importVaultJson(..., 'merge') preserves local new-language progress AND merges higher legacy 4-lang stats
    vaultActions.resetVaultToDefaults();
    vaultActions.setActiveLanguage('ja');
    vaultActions.completeMapNode({
      language: 'ja',
      nodeId: 'ja-u1-n1',
      stars: 3,
      xpEarned: 40,
      gemsEarned: 15,
      unlockedVocabIds: ['ja-u1-c1'],
      maxCombo: 3,
    });
    const mergeRes = importVaultJson(legacyJson, 'merge');
    expect(mergeRes.ok).toBe(true);
    const mergedLeo = loadVaultFromStorage().profiles.find((p) => p.id === 'kid-leo')!;
    expect(Object.keys(mergedLeo.languageProgress).sort()).toEqual([...LANGUAGE_LIST].sort());
    expect(mergedLeo.languageProgress.ja.completedNodeIds).toEqual(['ja-u1-n1']);
    expect(mergedLeo.languageProgress.ja.unlockedVocabIds).toEqual(['ja-u1-c1']);
    expect(mergedLeo.languageProgress.es.completedNodeIds).toEqual(['es-u1-n1', 'es-u1-n2']);
    expect(mergedLeo.languageProgress.es.unlockedVocabIds).toEqual(['es-u1-c1', 'es-u1-c2', 'es-u1-c3']);
    expect(mergedLeo.gems).toBe(145);
    expect(mergedLeo.streakDays).toBe(6);
    expect(mergedLeo.totalXp).toBe(340);

    // 4. Reject empty {} languageProgress and corrupt partial languageProgress
    const emptyLangProgressSave = structuredClone(legacyFourLangVault);
    emptyLangProgressSave.profiles[0].languageProgress = {} as typeof legacyFourLangVault.profiles[0]['languageProgress'];
    expect(importVaultJson(JSON.stringify(emptyLangProgressSave), 'replace').ok).toBe(false);

    const corruptPartialSave = structuredClone(legacyFourLangVault);
    (corruptPartialSave.profiles[0].languageProgress.es.nodeStars as Record<string, number>)['es-u1-n1'] = 99;
    expect(importVaultJson(JSON.stringify(corruptPartialSave), 'replace').ok).toBe(false);

    // Confirm createDefaultVault initializes all 16 languages
    const freshVault = createDefaultVault();
    for (const lang of LANGUAGE_LIST) {
      expect(freshVault.profiles[0].languageProgress[lang as LanguageCode]).toBeDefined();
    }
    expect(loadedLeo.heartElixirs).toBe(0);
    expect(loadedLeo.xpBoosterCharges).toBe(0);
    expect(loadedLeo.unlockedAvatars).toEqual(expect.arrayContaining([...STARTER_AVATAR_IDS]));
    expect(loadedLeo.stats.freeRecallSolved).toBe(0);
    expect(loadedLeo.stats.fluentPlaysCount).toBe(0);
    expect(loadedLeo.stats.checkpointsPassed).toBe(0);
    expect(loadedLeo.stats.clozeSolved).toBe(0);
  });

  it('supports Heart Elixirs, Heart Crystals (up to 8), 2x XP Boosters (1 charge per XP event), unlockable Avatars, unlockProficiencyTier, and stat recorders', () => {
    // Seed plenty of gems for power-up & avatar tests
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-seed',
      stars: 3,
      xpEarned: 10,
      gemsEarned: 1000,
      unlockedVocabIds: [],
      maxCombo: 0,
    });
    const startGems = loadVaultFromStorage().profiles[0].gems;

    // 1. Heart Elixir when full adds to pack; when < maxHearts refills immediately; useHeartElixir consumes pack elixir
    expect(vaultActions.useHeartElixir()).toBe(false); // 0 in pack & full hearts
    expect(vaultActions.buyHeartElixir()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].heartElixirs).toBe(1);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(startGems - HEART_ELIXIR_COST_GEMS);

    vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(4);
    expect(vaultActions.useHeartElixir()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(5);
    expect(loadVaultFromStorage().profiles[0].heartElixirs).toBe(0);

    // Buying when < maxHearts refills immediately without incrementing pack
    vaultActions.recordAnswerOutcome({ isCorrect: false, comboCount: 0 });
    expect(vaultActions.buyHeartElixir()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].hearts).toBe(5);
    expect(loadVaultFromStorage().profiles[0].heartElixirs).toBe(0);

    // 2. Heart Crystal upgrades maxHearts + hearts up to MAX_HEART_CONTAINERS = 8
    expect(vaultActions.buyHeartCrystal()).toBe(true); // 5 -> 6
    expect(vaultActions.buyHeartCrystal()).toBe(true); // 6 -> 7
    expect(vaultActions.buyHeartCrystal()).toBe(true); // 7 -> 8
    expect(vaultActions.buyHeartCrystal()).toBe(false); // capped at 8!
    const afterCrystals = loadVaultFromStorage().profiles[0];
    expect(afterCrystals.maxHearts).toBe(MAX_HEART_CONTAINERS);
    expect(afterCrystals.hearts).toBe(MAX_HEART_CONTAINERS);
    expect(afterCrystals.badges).toContain('crystal_heart_guardian');

    // 3. 2x XP Booster buys 3 charges and consumes 1 charge per XP event across map nodes & arcade
    expect(vaultActions.buyXpBooster()).toBe(true);
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(XP_BOOSTER_CHARGES_PER_BUY);
    const xpBeforeBoost = loadVaultFromStorage().profiles[0].totalXp;

    // Charge 1 consumed by completeMapNode (30 * 2 = 60 XP)
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-u1-n1',
      stars: 3,
      xpEarned: 30,
      gemsEarned: 10,
      unlockedVocabIds: [],
      maxCombo: 2,
    });
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(xpBeforeBoost + 60);
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(2);

    // Charge 2 consumed by recordArcadeGameResult (25 * 2 = 50 XP)
    vaultActions.recordArcadeGameResult({
      gameId: 'cafe_order_rush',
      score: 120,
      heartsWon: 0,
      bonusGems: 5,
      xpEarned: 25,
    });
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(xpBeforeBoost + 60 + 50);
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(1);

    // Charge 3 consumed by completeSecretArcadeRun (20 * 2 = 40 XP)
    vaultActions.completeSecretArcadeRun({
      score: 90,
      heartsWon: 0,
      bonusGems: 5,
      xpEarned: 20,
    });
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(xpBeforeBoost + 60 + 50 + 40);
    expect(loadVaultFromStorage().profiles[0].xpBoosterCharges).toBe(0);

    // Subsequent XP event with 0 charges awards normal 1x XP
    vaultActions.recordArcadeGameResult({
      gameId: 'starlight_bridge',
      score: 100,
      heartsWon: 0,
      bonusGems: 5,
      xpEarned: 20,
    });
    expect(loadVaultFromStorage().profiles[0].totalXp).toBe(xpBeforeBoost + 60 + 50 + 40 + 20);

    // 4. Unlockable Avatars
    expect(vaultActions.buyAndSelectAvatar('origami_crane_crest')).toBe(true);
    const afterAvatar = loadVaultFromStorage().profiles[0];
    expect(afterAvatar.avatarId).toBe('origami_crane_crest');
    expect(afterAvatar.unlockedAvatars).toContain('origami_crane_crest');
    // Re-selecting already unlocked or starter avatar is free
    const gemsBeforeSwitch = afterAvatar.gems;
    expect(vaultActions.buyAndSelectAvatar('pip_explorer')).toBe(true);
    expect(vaultActions.buyAndSelectAvatar('origami_crane_crest')).toBe(true);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBeforeSwitch);

    // Check exact unlock cost deduction on fresh unlockable avatar
    expect(vaultActions.buyAndSelectAvatar('clockwork_owl_crest')).toBe(true);
    expect(loadVaultFromStorage().profiles[0].gems).toBe(
      gemsBeforeSwitch - UNLOCKABLE_AVATAR_COSTS.clockwork_owl_crest
    );

    // 5. Stat recorders & unlockProficiencyTier
    for (let i = 0; i < 5; i++) {
      vaultActions.recordFluentPlay();
      vaultActions.recordFreeRecallSolve();
      vaultActions.recordClozeSolve();
    }
    vaultActions.unlockProficiencyTier({
      language: 'es',
      targetTier: 'B1',
      prerequisiteNodeIds: ['es-u1-n1', 'es-u1-n2', 'es-u2-n1'],
      targetUnitIndex: 8,
    });
    const afterUnlock = loadVaultFromStorage().profiles[0];
    expect(afterUnlock.stats.fluentPlaysCount).toBe(5);
    expect(afterUnlock.stats.freeRecallSolved).toBe(5);
    expect(afterUnlock.stats.clozeSolved).toBe(5);
    expect(afterUnlock.stats.checkpointsPassed).toBe(1);
    expect(afterUnlock.languageProgress.es.unlockedTiers).toContain('B1');
    expect(afterUnlock.languageProgress.es.currentUnitIndex).toBe(8);
    expect(afterUnlock.languageProgress.es.completedNodeIds).toEqual(
      expect.arrayContaining(['es-u1-n1', 'es-u1-n2', 'es-u2-n1'])
    );
    // Preserves existing 3 stars on es-u1-n1 and assigns 2 stars to skipped prerequisites
    expect(afterUnlock.languageProgress.es.nodeStars['es-u1-n1']).toBe(3);
    expect(afterUnlock.languageProgress.es.nodeStars['es-u1-n2']).toBe(2);
    expect(afterUnlock.badges).toEqual(
      expect.arrayContaining([
        'fluent_listener',
        'free_recall_virtuoso',
        'nuance_detective',
        'storyweaver_b1',
      ])
    );

    // Reject insufficient gems on Heart Crystal / XP Booster / Avatar cleanly
    vaultActions.createProfile({
      name: 'BrokeExplorer',
      avatarId: 'pip_explorer',
      bannerColor: '#2563EB',
    });
    expect(vaultActions.buyHeartCrystal()).toBe(false); // 80 < 110
    expect(vaultActions.buyAndSelectAvatar('grand_laureate_crest')).toBe(false); // 80 < 220
    expect(vaultActions.buyXpBooster()).toBe(true); // 80 >= 65 -> 15 left
    expect(vaultActions.buyHeartElixir()).toBe(false); // 15 < 35
    void HEART_CRYSTAL_COST_GEMS;
    void XP_BOOSTER_COST_GEMS;
  });
});
