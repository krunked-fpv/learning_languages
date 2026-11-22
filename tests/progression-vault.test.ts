import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BADGE_CATALOG,
  COSMETIC_CATALOG,
  LEAGUE_TIER_META,
  STREAK_SHIELD_COST_GEMS,
  applyDailyPracticeStreak,
  buildWeeklyLeaderboard,
  calculateComboMultiplier,
  calculateLessonRewards,
  evaluateUnlockedBadges,
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
  type BadgeId,
  type CosmeticId,
  type KidProfile,
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
];

const ALL_COSMETIC_IDS: readonly CosmeticId[] = [
  'hat_explorer_beret',
  'hat_fiesta_sombrero',
  'hat_alpine_tyrolean',
  'hat_gondolier_boater',
  'hat_starlight_wizard',
  'glasses_brass_aviator',
  'cape_rainbow_wings',
  'aura_golden_compass',
  'aura_fireflies',
  'theme_sunset_plaza',
  'theme_starlight_indigo',
  'theme_alpine_meadow',
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

  it('defines all 12 BADGE_CATALOG badges and unlocks each one when its condition is met', () => {
    expect(BADGE_CATALOG.length).toBe(12);
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
    p.languageProgress.es.xpEarned = 30;
    p.languageProgress.fr.xpEarned = 25;
    p.stats.turtlePlaysCount = 5;
    p.stats.bestComboStreak = 5;
    p.languageProgress.es.unlockedVocabIds = Array.from({ length: 15 }, (_, i) => `es-u1-c${i}`);
    p.stats.arcadeGamesWon = 3;
    p.stats.bossesCleared = 1;
    p.stats.accentSpotlightsSeen = 3;
    p.streakDays = 3;
    p.languageProgress.es.claimedChestIds = ['c1', 'c2'];
    p.stats.storiesCompleted = 2;
    p.totalXp = 300;

    const unlocked = evaluateUnlockedBadges(p);
    expect(unlocked).toHaveLength(12);
    expect(new Set(unlocked)).toEqual(new Set(ALL_BADGE_IDS));
  });

  it('builds smooth weekly leaderboards across all 5 league tiers', () => {
    const tiers: LeagueTier[] = [
      'bronze_acorn',
      'silver_compass',
      'gold_feather',
      'sapphire_sky',
      'starlight_legend',
    ];
    for (const tier of tiers) {
      expect(LEAGUE_TIER_META[tier]).toBeDefined();
    }

    const p = cloneDefaultLeo();
    p.weeklyXp = 140;
    const board = buildWeeklyLeaderboard(p);
    expect(board.length).toBeGreaterThanOrEqual(6);
    const playerRows = board.filter((e) => e.isPlayer);
    expect(playerRows).toHaveLength(1);
    expect(playerRows[0].weeklyXp).toBe(140);
    for (let i = 0; i < board.length; i++) {
      expect(board[i].rank).toBe(i + 1);
      if (i > 0) {
        expect(board[i - 1].weeklyXp).toBeGreaterThanOrEqual(board[i].weeklyXp);
      }
    }
  });

  it('defines all 12 cosmetics and supports purchasing, equipping, Streak Shields, and multi-kid isolation', () => {
    expect(COSMETIC_CATALOG.length).toBe(12);
    expect(STREAK_SHIELD_COST_GEMS).toBe(45);
    const cosIds = new Set(COSMETIC_CATALOG.map((c) => c.id));
    for (const id of ALL_COSMETIC_IDS) {
      expect(cosIds.has(id), `Missing cosmetic ${id}`).toBe(true);
    }

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
});
