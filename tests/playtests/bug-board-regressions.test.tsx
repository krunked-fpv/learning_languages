import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { stopSpeech } from '../../src/audio';
import { ArcadeHub } from '../../src/components/arcade/ArcadeHub';
import { StarlightBridgeArcade } from '../../src/components/arcade/StarlightBridgeArcade';
import { FloatingPopToast } from '../../src/components/fx/JuiceEngine';
import { BossGauntletView } from '../../src/components/lesson/BossGauntletView';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { WordBankTray, buildWordBankPool } from '../../src/components/lesson/WordBankTray';
import { WordBankView } from '../../src/components/lesson/WordBankView';
import {
  buildFreeRecallPlaceholder,
  getPinyinTonePreview,
  resolveFreeRecallTextAlign,
} from '../../src/components/lesson/useFreeRecallInput';
import { CompanionShop } from '../../src/components/meta/CompanionShop';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { gradeAnswer } from '../../src/core';
import {
  COURSES,
  getArcadeLexicon,
  getCourse,
  getCourseGlossary,
} from '../../src/curriculum';
import { lookupGlossaryEntry } from '../../src/curriculum/helpers';
import {
  STORAGE_KEY,
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  vaultActions,
} from '../../src/store/useVaultStore';
import {
  LANGUAGE_META,
  VISIBLE_BASE_LANGUAGES,
  type BaseLanguageCode,
  type BossGauntletExercise,
  type LanguageCode,
  type MapNode,
  type WordBankExercise,
} from '../../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '../..');

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('Sprint 1 Bug Board Targeted Regression Gates (BUG-005, BUG-006, BUG-010, BUG-013, BUG-014)', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  it('[BUG-005] StarlightBridgeArcade applies compact responsive height caps & un-ellipsized sub-bar at 375x667 on Master RTL & CJK', () => {
    setViewportSize(375, 667);

    for (const lang of ['ar', 'zh'] as const) {
      vaultActions.resetVaultToDefaults();
      vaultActions.setActiveLanguage(lang);
      const { container, unmount } = render(
        <StarlightBridgeArcade arcadeTier="master" onExit={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));

      // Sub-bar prompt instruction wraps instead of ellipsizing on compact screens
      const subBarPrompt = screen.getByText(/Tap the matching bridge plank to carry Pip across/i);
      expect(subBarPrompt.style.whiteSpace).toBe('normal');
      expect(subBarPrompt.style.textOverflow).toBe('clip');

      // Cloze challenge card caps height & allows internal vertical scroll instead of pushing planks offscreen
      const clozeContainer = Array.from(container.querySelectorAll<HTMLDivElement>('div')).find(
        (d) => d.style.maxHeight === '43%'
      );
      expect(clozeContainer, `${lang}: missing compact maxHeight 43% Cloze card`).toBeDefined();
      expect(clozeContainer!.style.overflowY).toBe('auto');

      // All 3-4 plank choice buttons render cleanly
      const planks = container.querySelectorAll('button.starlight-choice-tile');
      expect(planks.length).toBeGreaterThanOrEqual(3);

      unmount();
      cleanup();
    }
  });

  it('[BUG-010] FloatingPopToast anchors compact single-toast slot at top: 10px on 375x667 mobile without overlapping card controls', () => {
    const items = [
      { id: 't1', label: 'Sticker Collected!', tone: 'bonus' as const },
      { id: 't2', label: 'Sticker Collected!', tone: 'bonus' as const },
      { id: 't3', label: '3x Combo!', tone: 'combo' as const },
    ];

    setViewportSize(375, 667);
    const mobileRender = render(<FloatingPopToast items={items} />);
    const mobileStack = mobileRender.container.querySelector<HTMLDivElement>('.floating-pop-toast-stack');
    expect(mobileStack).not.toBeNull();
    expect(mobileStack!.classList.contains('is-compact')).toBe(true);
    expect(mobileStack!.style.top).toBe('10px');
    expect(mobileRender.container.querySelectorAll('.floating-pop-toast-pill')).toHaveLength(1);
    expect(mobileRender.container.textContent).toContain('3x Combo!');
    mobileRender.unmount();
    cleanup();

    setViewportSize(1440, 900);
    const desktopRender = render(<FloatingPopToast items={items} />);
    const desktopStack = desktopRender.container.querySelector<HTMLDivElement>('.floating-pop-toast-stack');
    expect(desktopStack!.classList.contains('is-compact')).toBe(false);
    expect(desktopStack!.style.top).toBe('66px');
    expect(desktopRender.container.querySelectorAll('.floating-pop-toast-pill')).toHaveLength(3);
    desktopRender.unmount();
  });

  it('[BUG-013] WordBankTray RTL preview row preserves dir="rtl" and isolates "Preview:" in <bdi dir="ltr"> at RTL start', () => {
    const tokens = ['مرحبا', 'بك', 'يا', 'صديقي'];
    const pool = buildWordBankPool('bug013-rtl-seed', tokens);
    const { container } = render(
      <WordBankTray
        seed="bug013-rtl-seed"
        targetTokens={tokens}
        selectedTileUids={pool.slice(0, 2).map((p) => p.uid)}
        dir="rtl"
        onChangeSelected={vi.fn()}
      />
    );

    const previewLabelBdi = Array.from(container.querySelectorAll('bdi')).find(
      (b) => b.textContent?.trim() === 'Preview:'
    );
    expect(previewLabelBdi).toBeDefined();
    expect(previewLabelBdi!.getAttribute('dir')).toBe('ltr');

    const previewRow = previewLabelBdi!.parentElement!;
    expect(previewRow.getAttribute('dir')).toBe('rtl');
    expect(previewRow.style.textAlign).toBe('right');
    const childrenBdi = Array.from(previewRow.querySelectorAll('bdi'));
    expect(childrenBdi.length).toBeGreaterThanOrEqual(2);
    expect(childrenBdi[1].getAttribute('dir')).toBe('rtl');
  });

  it('[BUG-014] Mobile Shop pedestal stacks cleanly without horizontal slicing and CTA pills pass WCAG AA >= 4.5:1 contrast', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    // No overflow-x: auto horizontal slicing on .shop-pedestal-col in mobile/tablet rules
    expect(css).toMatch(/@media\s*\(max-width:\s*859px\)[\s\S]*?\.shop-pedestal-col\s*\{[\s\S]*?overflow:\s*visible/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.shop-pedestal-col\s*\{[\s\S]*?flex-direction:\s*column/);
    expect(css).not.toMatch(/\.shop-pedestal-col\s*\{[^}]*overflow-x:\s*auto/);

    // Verify CTA pill contrast thresholds (>= 4.5:1 WCAG AA)
    expect(contrastRatio('#ffffff', '#047857')).toBeGreaterThanOrEqual(4.5); // .tactile-btn-success
    expect(contrastRatio('#0f172a', '#f59e0b')).toBeGreaterThanOrEqual(4.5); // .tactile-btn-amber
    expect(contrastRatio('#ffffff', '#4f46e5')).toBeGreaterThanOrEqual(4.5); // .tactile-btn-indigo
    expect(contrastRatio('#ffffff', '#be123c')).toBeGreaterThanOrEqual(4.5); // .tactile-btn-rose

    // Verify Streak Freeze Shield & shop double-click buy idempotency on 375x667
    setViewportSize(375, 667);
    vaultActions.completeMapNode({
      language: 'es',
      nodeId: 'es-bug014-seed',
      stars: 3,
      xpEarned: 10,
      gemsEarned: 200,
      unlockedVocabIds: [],
      maxCombo: 0,
    });
    const initialProfile = loadVaultFromStorage().profiles[0];
    const shieldsBefore = initialProfile.streakShields;
    const elixirsBefore = initialProfile.heartElixirs ?? 0;
    const gemsBefore = initialProfile.gems;
    const { container, unmount } = render(<CompanionShop />);
    expect(container.querySelector('.shop-pedestal-col')).toBeInTheDocument();
    const shieldBtn = screen.getByRole('button', { name: /Buy Shield \(45 Gems\)/i });
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      act(() => {
        shieldBtn.click();
        shieldBtn.click();
      });
      // Rapid re-queried click across commits (< 350ms cooldown) must also be blocked even under parallel CPU contention
      act(() => {
        screen.getByRole('button', { name: /Buy Shield \(45 Gems\)/i }).click();
      });
      expect(loadVaultFromStorage().profiles[0].streakShields).toBe(shieldsBefore + 1);
      expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBefore - 45);

      // Distinct consumable immediately succeeds, while rapid re-queried double-click is blocked by 350ms actionKey cooldown
      act(() => {
        screen.getByRole('button', { name: /Buy Elixir \(35 Gems\)/i }).click();
      });
      act(() => {
        screen.getByRole('button', { name: /Buy Elixir \(35 Gems\)/i }).click();
      });
      expect(loadVaultFromStorage().profiles[0].heartElixirs ?? 0).toBe(elixirsBefore + 1);
      expect(loadVaultFromStorage().profiles[0].gems).toBe(gemsBefore - 80);
    } finally {
      nowSpy.mockRestore();
    }
    unmount();
  });

  it('[BUG-006] AdultTrackLoadingCard catches rejected offline chunk import cleanly and allows Retry + Return to Kid Atlas', async () => {
    vi.resetModules();
    const actualCurriculum = await vi.importActual<typeof import('../../src/curriculum')>(
      '../../src/curriculum'
    );
    const ensureMock = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockRejectedValueOnce(new Error('503 Service Unavailable'));

    vi.doMock('../../src/curriculum', () => ({
      ...actualCurriculum,
      getCourse: vi.fn((lang: string) => {
        const c = actualCurriculum.getCourse(lang as never);
        return lang === 'stoner_tactical' ? { ...c, units: [] } : c;
      }),
      isAdultTrackLoaded: vi.fn((lang: string) =>
        lang === 'stoner_tactical' ? false : actualCurriculum.isAdultTrackLoaded(lang as never)
      ),
      ensureAdultCourseLoaded: ensureMock,
      ensureAllAdultCoursesLoaded: vi.fn(() => Promise.reject(new Error('503 Service Unavailable'))),
    }));

    try {
      const { App: MockedApp } = await import('../../src/App');
      const { vaultActions: mockVaultActions, loadVaultFromStorage: mockLoadVault } = await import(
        '../../src/store/useVaultStore'
      );
      window.localStorage.clear();
      mockVaultActions.resetVaultToDefaults();
      mockVaultActions.unlockAdultMode({
        adultProfileName: 'Offline Scout',
        initialTrack: 'stoner_tactical',
      });

      const { unmount } = render(<MockedApp />);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const card = screen.getByTestId('adult-track-loading-card');
      expect(card).toHaveTextContent('OFFLINE FALLBACK');
      expect(card).toHaveTextContent(/offline right now/i);

      const retryBtn = screen.getByRole('button', { name: 'Retry Loading' });
      fireEvent.click(retryBtn);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(ensureMock.mock.calls.length).toBeGreaterThanOrEqual(2);

      const returnBtn = screen.getByTestId('adult-track-loading-card').querySelector('button:last-of-type') ??
        Array.from(card.querySelectorAll('button')).find((b) => /Return to Kid Atlas/i.test(b.textContent ?? ''))!;
      fireEvent.click(returnBtn);
      const afterReturn = mockLoadVault();
      const activeProf = afterReturn.profiles.find((p) => p.id === afterReturn.activeProfileId)!;
      expect(activeProf.adultModeActive).toBe(false);
      unmount();
    } finally {
      vi.doUnmock('../../src/curriculum');
      vi.resetModules();
    }
  });
});

function findToForeignWordBank(language: LanguageCode): WordBankExercise {
  const found = getCourse(language).units
    .flatMap((u) => u.nodes)
    .flatMap((n) => n.exercises)
    .find(
      (ex): ex is WordBankExercise =>
        ex.type === 'word_bank' && ex.direction === 'to_foreign'
    );
  if (!found) {
    throw new Error(`Expected a to_foreign word_bank exercise for ${language}`);
  }
  return { ...found, allowFreeRecall: true };
}

function findBossWordBank(language: LanguageCode): BossGauntletExercise {
  const rawBoss = getCourse(language).units
    .flatMap((u) => u.nodes)
    .flatMap((n) => n.exercises)
    .find((ex): ex is BossGauntletExercise => ex.type === 'boss_gauntlet');
  if (!rawBoss) {
    throw new Error(`Expected boss_gauntlet exercise for ${language}`);
  }
  const wbTurn = rawBoss.turns.find((t) => t.mode === 'word_bank') ?? rawBoss.turns[0];
  return {
    ...rawBoss,
    turns: [{ ...wbTurn, mode: 'word_bank', allowFreeRecall: true }],
  };
}

describe('Sprint 2 Bug Board Targeted Regression Gates (BUG-S2-001..BUG-S2-011)', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  afterEach(() => {
    cleanup();
    stopSpeech();
    setViewportSize(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
  });

  it('[BUG-S2-002] aborts ghost coopMatch if a partner profile is deleted mid-Handoff or recordCoopArcadeSession returns null', () => {
    // 1. Mid-Handoff partner deletion immediately aborts back to Hub
    const { unmount } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: 'kid-maya' } });

    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    expect(screen.getByTestId('arcade-coop-handoff')).toHaveTextContent('Pass Console to Maya!');
    act(() => {
      vaultActions.deleteProfile('kid-maya');
    });
    expect(screen.queryByTestId('arcade-coop-handoff')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stack Gelato' })).toBeInTheDocument();
    unmount();
    cleanup();

    // 2. recordCoopArcadeSession returning null on Turn 2 completion suppresses fake Finale summary
    vaultActions.resetVaultToDefaults();
    const recordSpy = vi.spyOn(vaultActions, 'recordCoopArcadeSession').mockReturnValueOnce(null);
    const { unmount: unmountNull } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Maya's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('arcade-coop-summary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stack Gelato' })).toBeInTheDocument();
    unmountNull();
  });

  it('[BUG-S2-003] validates strict ISO dates on import, sanitizes corrupt storage dates, and keeps newer valid dates on merge', () => {
    const exportedJson = exportVaultJson();
    const invalidDateSamples = ['not-a-date', '2026-02-31', '9999-99-99'];

    for (const badIso of invalidDateSamples) {
      // Corrupt vocabMastery.lastReviewedISO -> rejected in both replace & merge
      const badVocab = JSON.parse(exportedJson);
      badVocab.profiles[0].languageProgress.es.vocabMastery = {
        es_u1_01: { strength: 2, lastReviewedISO: badIso, reviewCount: 1 },
      };
      expect(importVaultJson(JSON.stringify(badVocab), 'replace').ok).toBe(false);
      expect(importVaultJson(JSON.stringify(badVocab), 'merge').ok).toBe(false);

      // Corrupt lastSrsQuestCompletedISO -> rejected in both replace & merge
      const badSrs = JSON.parse(exportedJson);
      badSrs.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = badIso;
      expect(importVaultJson(JSON.stringify(badSrs), 'replace').ok).toBe(false);
      expect(importVaultJson(JSON.stringify(badSrs), 'merge').ok).toBe(false);

      // Corrupt lastPracticeISO -> rejected
      const badPractice = JSON.parse(exportedJson);
      badPractice.profiles[0].lastPracticeISO = badIso;
      expect(importVaultJson(JSON.stringify(badPractice), 'replace').ok).toBe(false);
    }

    // Corrupt timestamps persisted directly in localStorage sanitize gracefully without wiping profile
    const corruptedStored = JSON.parse(exportedJson);
    corruptedStored.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = 'not-a-date';
    corruptedStored.profiles[0].languageProgress.es.vocabMastery = {
      es_u1_01: { strength: 3, lastReviewedISO: '2026-02-31', reviewCount: 2 },
      es_u1_02: { strength: 4, lastReviewedISO: '2026-11-23', reviewCount: 5 },
    };
    window.localStorage.setItem('wanderling.vault.v1', JSON.stringify(corruptedStored));
    const hydrated = loadVaultFromStorage();
    expect(hydrated.profiles[0].languageProgress.es.lastSrsQuestCompletedISO).toBeUndefined();
    expect(hydrated.profiles[0].languageProgress.es.vocabMastery?.es_u1_01).toBeUndefined();
    expect(hydrated.profiles[0].languageProgress.es.vocabMastery?.es_u1_02.lastReviewedISO).toBe(
      '2026-11-23'
    );

    // Merge import keeps the newer chronological valid ISO date across older vs newer saves
    const baseValid = JSON.parse(exportedJson);
    baseValid.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = '2026-11-23';
    baseValid.profiles[0].languageProgress.es.vocabMastery = {
      es_u1_02: { strength: 4, lastReviewedISO: '2026-11-23', reviewCount: 3 },
    };
    expect(importVaultJson(JSON.stringify(baseValid), 'replace').ok).toBe(true);

    const olderValid = JSON.parse(exportedJson);
    olderValid.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = '2026-11-20';
    olderValid.profiles[0].languageProgress.es.vocabMastery = {
      es_u1_02: { strength: 2, lastReviewedISO: '2026-11-20', reviewCount: 1 },
    };
    expect(importVaultJson(JSON.stringify(olderValid), 'merge').ok).toBe(true);
    const mergedOlder = loadVaultFromStorage().profiles[0].languageProgress.es;
    expect(mergedOlder.lastSrsQuestCompletedISO).toBe('2026-11-23');
    expect(mergedOlder.vocabMastery?.es_u1_02.lastReviewedISO).toBe('2026-11-23');

    const newerValid = JSON.parse(exportedJson);
    newerValid.profiles[0].languageProgress.es.lastSrsQuestCompletedISO = '2026-11-25';
    expect(importVaultJson(JSON.stringify(newerValid), 'merge').ok).toBe(true);
    expect(loadVaultFromStorage().profiles[0].languageProgress.es.lastSrsQuestCompletedISO).toBe(
      '2026-11-25'
    );
  });

  it('[BUG-S2-004] credits Kid-Quarantined Co-Op XP to the played safe base language instead of Adult activeLanguage', () => {
    vaultActions.setActiveLanguage('fr');
    const adult = vaultActions.unlockAdultMode({
      adultProfileName: 'Alex',
      initialTrack: 'ebonics',
    });
    expect(adult.activeLanguage).toBe('ebonics');
    expect(adult.lastBaseLanguage).toBe('fr');

    const summary = vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: adult.id,
      playerOneScore: 160,
      playerOneLanguage: 'ebonics',
      playerTwoId: 'kid-leo',
      playerTwoScore: 120,
      playerTwoLanguage: 'es',
      bonusGems: 4,
      xpEarned: 25,
    });
    expect(summary).not.toBeNull();

    const after = loadVaultFromStorage();
    const alexAfter = after.profiles.find((p) => p.id === adult.id)!;
    const leoAfter = after.profiles.find((p) => p.id === 'kid-leo')!;
    expect(alexAfter.languageProgress.fr.xpEarned).toBe(25);
    expect(alexAfter.languageProgress.ebonics?.xpEarned ?? 0).toBe(0);
    expect(leoAfter.languageProgress.es.xpEarned).toBe(25);

    // When BOTH players are Adult unlocked & active, create distinct second adult profile so both settle cleanly
    vaultActions.createProfile({
      name: 'Jordan',
      avatarId: 'colette_baker',
      bannerColor: '#0EA5E9',
      activeLanguage: 'es',
    });
    const adultTwo = vaultActions.unlockAdultMode({
      initialTrack: 'suburban',
    });
    expect(adultTwo.id).not.toBe(adult.id);
    const rawVault = JSON.parse(exportVaultJson()) as {
      activeProfileId: string;
      profiles: Array<{ id: string; adultModeUnlocked?: boolean; adultModeActive?: boolean; activeLanguage: string }>;
    };
    const p1 = rawVault.profiles.find((p) => p.id === adult.id)!;
    const p2 = rawVault.profiles.find((p) => p.id === adultTwo.id)!;
    p1.adultModeUnlocked = true;
    p1.adultModeActive = true;
    p1.activeLanguage = 'ebonics';
    p2.adultModeUnlocked = true;
    p2.adultModeActive = true;
    p2.activeLanguage = 'suburban';
    importVaultJson(JSON.stringify(rawVault), 'replace');

    vaultActions.recordCoopArcadeSession({
      gameId: 'starlight_bridge',
      playerOneId: adult.id,
      playerOneScore: 140,
      playerOneLanguage: 'ebonics',
      playerTwoId: adultTwo.id,
      playerTwoScore: 140,
      playerTwoLanguage: 'suburban',
      bonusGems: 5,
      xpEarned: 30,
    });
    const bothAdultAfter = loadVaultFromStorage();
    expect(
      bothAdultAfter.profiles.find((p) => p.id === adult.id)!.languageProgress.ebonics?.xpEarned
    ).toBe(30);
    expect(
      bothAdultAfter.profiles.find((p) => p.id === adultTwo.id)!.languageProgress.suburban?.xpEarned
    ).toBe(30);
  });

  it('[BUG-S2-005] wraps LessonArena mobile header pills into secondary row while preserving progress-track min-width >= 64px', () => {
    const themeCss = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    const mobileHeaderCssMatch = themeCss.match(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.lesson-arena-header\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?\.lesson-progress-track\s*\{[\s\S]*?min-width:\s*64px;[\s\S]*?\.lesson-header-secondary\s*\{[\s\S]*?flex:\s*1\s+0\s+100%;/
    );
    expect(mobileHeaderCssMatch).not.toBeNull();

    setViewportSize(375, 667);
    vaultActions.unlockAdultMode({ adultProfileName: 'Parent', initialTrack: 'ebonics' });
    const ebonicsNode = getCourse('ebonics').units[0].nodes[0];
    const { container, unmount } = render(
      <LessonArena node={ebonicsNode} language="ebonics" onExit={vi.fn()} />
    );
    const header = container.querySelector('.lesson-arena-header')!;
    expect(header.querySelector('.lesson-header-exit')).not.toBeNull();
    expect(header.querySelector('.lesson-progress-track')).not.toBeNull();
    expect(header.querySelector('.lesson-header-hearts')).toHaveTextContent('5/5');
    const secondary = header.querySelector('.lesson-header-secondary')!;
    expect(secondary).not.toBeNull();
    expect(within(secondary as HTMLElement).getByTestId('lesson-study-break-btn')).toBeInTheDocument();
    unmount();
  });

  it('[BUG-S2-006] keeps empty RTL Free-Recall placeholders left-aligned and concise on 375px ar/arz/vi', () => {
    expect(resolveFreeRecallTextAlign('rtl', '')).toBe('left');
    expect(resolveFreeRecallTextAlign('rtl', 'marhaban')).toBe('left');
    expect(resolveFreeRecallTextAlign('rtl', 'مرحبا')).toBe('right');
    expect(
      buildFreeRecallPlaceholder({
        language: 'ar',
        direction: 'to_foreign',
        compact: true,
        variant: 'word_bank',
      })
    ).toBe('Type in Arabic or romanized');
    expect(
      buildFreeRecallPlaceholder({
        language: 'arz',
        direction: 'to_foreign',
        compact: true,
        variant: 'word_bank',
      })
    ).toBe('Type in Egyptian or romanized');
    expect(
      buildFreeRecallPlaceholder({
        language: 'vi',
        direction: 'to_foreign',
        compact: true,
        variant: 'word_bank',
      })
    ).toBe('Type in Vietnamese...');

    const themeCss = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    expect(themeCss).toMatch(/\.free-recall-input:placeholder-shown[\s\S]*?direction:\s*ltr;[\s\S]*?text-align:\s*left;/);
    expect(themeCss).toMatch(/\.free-recall-input::placeholder[\s\S]*?direction:\s*ltr;[\s\S]*?unicode-bidi:\s*isolate;[\s\S]*?text-align:\s*left;/);

    setViewportSize(375, 667);
    for (const lang of ['ar', 'arz'] as const) {
      const ex = findToForeignWordBank(lang);
      const { unmount } = render(
        <WordBankView
          exercise={ex}
          language={lang}
          compact={true}
          locked={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      const input = screen.getByLabelText('Type your translation') as HTMLInputElement;
      expect(input.getAttribute('dir')).toBe('rtl');
      expect(input.style.textAlign).toBe('left');
      fireEvent.change(input, { target: { value: 'مرحبا' } });
      expect(input.style.textAlign).toBe('right');
      unmount();
      cleanup();
    }
  });

  it('[BUG-S2-007] appends synchronous rapid VirtualScriptDrawer clicks sequentially without dropping characters', () => {
    setViewportSize(375, 667);

    // 1. WordBankView synchronous double tap
    const zhEx = findToForeignWordBank('zh');
    const { unmount: unmountWb } = render(
      <WordBankView
        exercise={zhEx}
        language="zh"
        compact={true}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const wbInput = screen.getByLabelText('Type your translation') as HTMLInputElement;
    fireEvent.change(wbInput, { target: { value: 'ab' } });
    wbInput.setSelectionRange(1, 1);
    fireEvent.select(wbInput);

    fireEvent.click(screen.getByTestId('virtual-script-drawer-toggle'));
    const wbDrawer = screen.getByTestId('virtual-script-drawer');
    const wbKey1 = within(wbDrawer).getByRole('button', { name: 'nǐ' });
    const wbKey2 = within(wbDrawer).getByRole('button', { name: 'hǎo' });
    act(() => {
      wbKey1.click();
      wbKey2.click();
    });
    expect(wbInput.value).toBe('anǐhǎob');
    expect(wbInput.selectionStart).toBe(6);
    unmountWb();
    cleanup();

    // 2. BossGauntletView synchronous double tap
    const zhBoss = findBossWordBank('zh');
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={zhBoss}
        language="zh"
        compact={true}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const bossInput = screen.getByLabelText('Type your boss reply') as HTMLInputElement;
    fireEvent.change(bossInput, { target: { value: 'ab' } });
    bossInput.setSelectionRange(1, 1);
    fireEvent.select(bossInput);

    fireEvent.click(screen.getByTestId('virtual-script-drawer-toggle'));
    const bossDrawer = screen.getByTestId('virtual-script-drawer');
    const bossKey1 = within(bossDrawer).getByRole('button', { name: 'nǐ' });
    const bossKey2 = within(bossDrawer).getByRole('button', { name: 'hǎo' });
    act(() => {
      bossKey1.click();
      bossKey2.click();
    });
    expect(bossInput.value).toBe('anǐhǎob');
    expect(bossInput.selectionStart).toBe(6);
    unmountBoss();
  });

  it('[BUG-S2-008] resolves Italian gl, bell, anch, and ch elision prefixes across straight and curly apostrophes', () => {
    const itGlossary = getCourseGlossary('it');
    const italianWithUomo = {
      ...itGlossary,
      uomo: { translation: 'man', phonetic: 'WOH-moh' },
    };

    const gliRes = lookupGlossaryEntry("gl'amici", itGlossary);
    expect(gliRes?.translation).toContain('the (masc. pl.)');
    expect(gliRes?.translation).toContain('friends');
    expect(lookupGlossaryEntry('Gl’amici!', itGlossary)?.translation).toContain(
      'the (masc. pl.)'
    );

    const anchRes = lookupGlossaryEntry("anch'io", itGlossary);
    expect(anchRes?.translation).toContain('also / even');
    expect(lookupGlossaryEntry('anch’io', itGlossary)?.translation).toContain(
      'also / even'
    );

    const cheRes = lookupGlossaryEntry("ch'è", itGlossary);
    expect(cheRes?.translation).toContain('that / what');
    expect(lookupGlossaryEntry('CH’È?', itGlossary)?.translation).toContain('that / what');

    expect(lookupGlossaryEntry("bell'albero", itGlossary)?.translation).toContain(
      'lovely / handsome'
    );
    const bellUomo = lookupGlossaryEntry("bell'uomo", italianWithUomo);
    expect(bellUomo?.translation).toContain('lovely / handsome');
    expect(bellUomo?.translation).toContain('man');
  });

  it('[BUG-S2-009] hides duplicate Accent character bar while VirtualScriptDrawer is open and restores it on collapse', () => {
    setViewportSize(375, 667);

    // 1. WordBankView toggle deduplication
    const zhEx = findToForeignWordBank('zh');
    const { unmount: unmountWb } = render(
      <WordBankView
        exercise={zhEx}
        language="zh"
        compact={true}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    expect(screen.getByLabelText('Accent character bar')).toBeInTheDocument();

    const wbToggle = screen.getByTestId('virtual-script-drawer-toggle');
    fireEvent.click(wbToggle);
    expect(wbToggle).toHaveAttribute('aria-expanded', 'true');
    const wbDrawer = screen.getByTestId('virtual-script-drawer');
    expect(wbDrawer.querySelector('.console-scroll-pane')).not.toBeNull();
    expect(screen.queryByLabelText('Accent character bar')).not.toBeInTheDocument();

    fireEvent.click(wbToggle);
    expect(wbToggle).toHaveAttribute('aria-expanded', 'false');
    expect(wbDrawer.querySelector('.console-scroll-pane')).toBeNull();
    expect(screen.getByLabelText('Accent character bar')).toBeInTheDocument();
    unmountWb();
    cleanup();

    // 2. BossGauntletView toggle deduplication
    const zhBoss = findBossWordBank('zh');
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={zhBoss}
        language="zh"
        compact={true}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    expect(screen.getByLabelText('Accent character bar')).toBeInTheDocument();

    const bossToggle = screen.getByTestId('virtual-script-drawer-toggle');
    fireEvent.click(bossToggle);
    expect(screen.queryByLabelText('Accent character bar')).not.toBeInTheDocument();
    fireEvent.click(bossToggle);
    expect(screen.getByLabelText('Accent character bar')).toBeInTheDocument();
    unmountBoss();
  });

  it('[BUG-S2-010] restricts Vitest include globs to tests/ so baseCoursesLoader.test.ts shim never fails unfiltered runs', () => {
    const viteCfg = readFileSync(resolve(ROOT_DIR, 'vite.config.ts'), 'utf8');
    expect(viteCfg).toMatch(/include:\s*\[\s*'tests\/\*\*\/\*\.\{test,spec\}\.\{ts,tsx\}'\s*\]/);
  });

  it('[BUG-S2-011] enforces 2P Co-Op Kid-Safety Quarantine whenever an Adult-unlocked partner is in Kid Atlas (adultModeActive: false)', () => {
    vaultActions.setActiveLanguage('fr');
    const adultP1 = vaultActions.unlockAdultMode({
      adultProfileName: 'Morgan',
      initialTrack: 'ebonics',
    });
    vaultActions.setAdultModeActive(false);
    vaultActions.createProfile({
      name: 'Taylor',
      avatarId: 'pip_explorer',
      bannerColor: '#2563EB',
      activeLanguage: 'es',
    });
    const adultP2 = vaultActions.unlockAdultMode({
      initialTrack: 'suburban',
    });
    expect(adultP2.id).not.toBe(adultP1.id);

    const vaultRaw = JSON.parse(exportVaultJson()) as {
      activeProfileId: string;
      profiles: Array<{
        id: string;
        adultModeUnlocked?: boolean;
        adultModeActive?: boolean;
        activeLanguage: string;
        lastBaseLanguage?: string;
      }>;
    };
    const p1 = vaultRaw.profiles.find((p) => p.id === adultP1.id)!;
    const p2 = vaultRaw.profiles.find((p) => p.id === adultP2.id)!;
    p1.adultModeUnlocked = true;
    p1.adultModeActive = false;
    p1.activeLanguage = 'fr';
    p1.lastBaseLanguage = 'fr';
    p2.adultModeUnlocked = true;
    p2.adultModeActive = true;
    p2.activeLanguage = 'suburban';
    p2.lastBaseLanguage = 'es';
    vaultRaw.activeProfileId = adultP1.id;
    expect(importVaultJson(JSON.stringify(vaultRaw), 'replace').ok).toBe(true);

    const { unmount } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: adultP1.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: adultP2.id } });

    // Hub hides Adult badge immediately under Kid-Atlas quarantine
    expect(screen.queryByText(LANGUAGE_META.ebonics.pairDirectionBadge!)).not.toBeInTheDocument();
    expect(screen.queryByText(LANGUAGE_META.suburban.pairDirectionBadge!)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    // Turn 2 (even though P2 has adultModeUnlocked: true && adultModeActive: true) stays strictly quarantined
    fireEvent.click(screen.getByRole('button', { name: /Start Taylor's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.getByTestId('arcade-coop-turn-pill')).toHaveTextContent('P2: Taylor');
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    const suburbanSamples = Object.values(getCourse('suburban').vocabById)
      .slice(0, 8);
    for (const card of suburbanSamples) {
      expect(screen.queryByText(card.foreignWithArticle)).not.toBeInTheDocument();
    }
    unmount();
  });

  it('[BUG-S2-001] lazily hydrates unvisited base languages in useArcadeDeck during Co-Op Turn 2 and Quarantined fallback', async () => {
    vi.resetModules();
    const actualCurriculum = await vi.importActual<typeof import('../../src/curriculum')>(
      '../../src/curriculum'
    );
    const actualFr = actualCurriculum.COURSES.fr;
    const expectedFrWords = new Set([
      ...actualCurriculum.getArcadeLexicon('fr', [], 0, 'sprout').map((c) => c.foreign),
      ...Object.values(actualFr.vocabById).map((c) => c.foreignWithArticle),
    ]);
    let frLoaded = false;
    let baseRev = 0;
    const baseListeners = new Set<() => void>();
    const ensureBaseSpy = vi.fn(async (lang: string) => {
      if (lang === 'fr' && !frLoaded) {
        await Promise.resolve();
        frLoaded = true;
        baseRev += 1;
        for (const l of baseListeners) l();
      }
      return actualCurriculum.COURSES[lang as keyof typeof actualCurriculum.COURSES];
    });

    vi.doMock('../../src/curriculum', () => ({
      ...actualCurriculum,
      COURSES: new Proxy(actualCurriculum.COURSES, {
        get(target, prop, receiver) {
          if (prop === 'fr' && !frLoaded) {
            return { ...actualFr, units: [] };
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
      getCourse: vi.fn((lang: string) => {
        if (lang === 'fr' && !frLoaded) {
          return { ...actualFr, units: [] };
        }
        return actualCurriculum.getCourse(lang as never);
      }),
      isBaseTrackLoaded: vi.fn((lang: string) => (lang === 'fr' ? frLoaded : true)),
      isBaseCourseLoaded: vi.fn((lang: string) => (lang === 'fr' ? frLoaded : true)),
      ensureBaseCourseLoaded: ensureBaseSpy,
      subscribeBaseRegistry: vi.fn((listener: () => void) => {
        baseListeners.add(listener);
        return () => baseListeners.delete(listener);
      }),
      getBaseRegistryVersion: vi.fn(() => baseRev),
    }));

    try {
      const { vaultActions: mockVaultActions } = await import('../../src/store/useVaultStore');
      const { ArcadeHub: MockedArcadeHub } = await import('../../src/components/arcade/ArcadeHub');
      const { useArcadeDeck: mockUseArcadeDeck } = await import(
        '../../src/components/arcade/arcadeShared'
      );
      window.localStorage.clear();
      mockVaultActions.resetVaultToDefaults();
      mockVaultActions.switchProfile('kid-maya');
      mockVaultActions.setActiveLanguage('fr');
      mockVaultActions.switchProfile('kid-leo');

      const { unmount } = render(<MockedArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));

      await waitFor(() => {
        expect(ensureBaseSpy).toHaveBeenCalledWith('fr');
        expect(frLoaded).toBe(true);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Maya's Turn!/i }));
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));

      await waitFor(() => {
        const pageText = document.body.textContent ?? '';
        const matchedRealFr = Array.from(expectedFrWords).some((w) => pageText.includes(w));
        expect(matchedRealFr).toBe(true);
      });
      unmount();
      cleanup();

      // Also verify direct useArcadeDeck quarantined Adult->base fallback triggers ensureBaseCourseLoaded('fr')
      frLoaded = false;
      ensureBaseSpy.mockClear();
      mockVaultActions.resetVaultToDefaults();
      mockVaultActions.setActiveLanguage('fr');
      const quarantinedAdult = mockVaultActions.unlockAdultMode({
        adultProfileName: 'QuarantinedParent',
        initialTrack: 'ebonics',
      });
      function QuarantinedDeckProbe() {
        const deck = mockUseArcadeDeck('sprout', {
          profile: quarantinedAdult,
          kidQuarantined: true,
        });
        return (
          <div data-testid="deck-probe" data-lang={deck.language}>
            {deck.lexicon.map((item) => item.foreign).join('|')}
          </div>
        );
      }
      const { unmount: unmountProbe } = render(<QuarantinedDeckProbe />);
      await waitFor(() => {
        expect(ensureBaseSpy).toHaveBeenCalledWith('fr');
        expect(frLoaded).toBe(true);
      });
      const probe = screen.getByTestId('deck-probe');
      expect(probe.getAttribute('data-lang')).toBe('fr');
      await waitFor(() => {
        const probeText = probe.textContent ?? '';
        expect(Array.from(expectedFrWords).some((w) => probeText.includes(w))).toBe(true);
      });
      unmountProbe();
    } finally {
      vi.doUnmock('../../src/curriculum');
      vi.resetModules();
    }
  });
});

function parseHexToRgbTuple(raw: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(raw.trim());
  if (!m) return null;
  const h = m[1];
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function compositeCssOver(
  fgRaw: string,
  bgRgb: [number, number, number]
): [number, number, number] {
  const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i.exec(
    fgRaw.trim()
  );
  if (!rgba) {
    return parseHexToRgbTuple(fgRaw) ?? bgRgb;
  }
  const alpha = Number(rgba[4]);
  return [
    Math.round(Number(rgba[1]) * alpha + bgRgb[0] * (1 - alpha)),
    Math.round(Number(rgba[2]) * alpha + bgRgb[1] * (1 - alpha)),
    Math.round(Number(rgba[3]) * alpha + bgRgb[2] * (1 - alpha)),
  ];
}

function rgbTupleContrast(a: [number, number, number], b: [number, number, number]): number {
  const toHex = ([r, g, bCh]: [number, number, number]) =>
    `#${[r, g, bCh].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return contrastRatio(toHex(a), toHex(b));
}

describe('Sprint 3 Bug Board Targeted Regression Gates (BUG-S3-001..BUG-S3-004)', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  });

  afterEach(() => {
    cleanup();
    stopSpeech();
    setViewportSize(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
  });

  it('[BUG-S3-001] remounts active Arcade cabinet via turnKey on mid-Turn-1 Kid-Safety Quarantine with zero stale Adult slang lingering', () => {
    vaultActions.switchProfile('kid-leo');
    vaultActions.setActiveLanguage('es');
    const parent = vaultActions.unlockAdultMode({
      adultProfileName: 'Parent',
      initialTrack: 'ebonics',
    });

    vaultActions.createProfile({
      name: 'Auntie',
      avatarId: 'pip_explorer',
      bannerColor: '#2563EB',
      activeLanguage: 'es',
    });
    const auntie = vaultActions.unlockAdultMode({
      adultProfileName: 'Auntie',
      initialTrack: 'suburban',
    });
    expect(auntie.id).not.toBe(parent.id);
    vaultActions.switchProfile(parent.id);

    const safeMaskSpy = vi.fn();
    const { unmount } = render(
      <ArcadeHub
        initialMode="hub"
        onExitToMap={vi.fn()}
        onCoopSafeMaskChange={safeMaskSpy}
      />
    );

    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: parent.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: auntie.id } });

    expect(safeMaskSpy).toHaveBeenLastCalledWith({ active: false, safeLanguage: 'es' });

    // Launch Stack Gelato into active Turn 1 under Adult 'ebonics'
    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    expect(screen.getByRole('button', { name: /Drop Scoop!/i })).toBeInTheDocument();
    expect(screen.getByText(LANGUAGE_META.ebonics.nativeName)).toBeInTheDocument();
    expect(document.querySelector('[data-language="ebonics"]')).not.toBeNull();

    // Disarm Auntie mid-Turn-1 via vault import while Parent remains on 'ebonics'
    const armedVault = JSON.parse(exportVaultJson()) as {
      profiles: Array<{
        id: string;
        adultModeActive?: boolean;
        activeLanguage: string;
        lastBaseLanguage?: string;
      }>;
    };
    const auntieEntry = armedVault.profiles.find((p) => p.id === auntie.id)!;
    auntieEntry.adultModeActive = false;
    auntieEntry.activeLanguage = 'es';
    auntieEntry.lastBaseLanguage = 'es';

    act(() => {
      expect(importVaultJson(JSON.stringify(armedVault), 'replace').ok).toBe(true);
    });

    // Safe Atlas Mask activates immediately and updated turnKey remounts the stale cabinet cleanly onto 'ready'
    expect(safeMaskSpy).toHaveBeenLastCalledWith({ active: true, safeLanguage: 'es' });
    expect(screen.queryByRole('button', { name: /Drop Scoop!/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Stacking!/i })).toBeInTheDocument();
    expect(screen.queryByText(LANGUAGE_META.ebonics.nativeName)).not.toBeInTheDocument();

    // Starting the freshly remounted cabinet deals only safe Spanish items with zero ebonics bleed
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    expect(screen.getByText(LANGUAGE_META.es.nativeName)).toBeInTheDocument();
    expect(document.querySelector('[data-language="es"]')).not.toBeNull();
    expect(document.querySelector('[data-language="ebonics"]')).toBeNull();
    const ebonicsTerms = new Set(
      getArcadeLexicon('ebonics', [], 0, 'sprout').map((c) => c.foreign)
    );
    const bodyText = document.body.textContent ?? '';
    for (const slang of ebonicsTerms) {
      expect(bodyText).not.toContain(slang);
    }

    // Complete Turn 1 -> Turn 2 -> Finale and verify Build Star Bridge also resets Adult state on mid-Turn-1 quarantine
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Auntie's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByTestId('arcade-coop-summary')).toBeInTheDocument();
    expect(screen.getByTestId('coop-finale-credited-languages')).toHaveTextContent(/Parent:\s*Spanish.*Auntie:\s*Spanish/i);
    unmount();
  });

  it('[BUG-S3-002] rejects orphaned coopPairStreaks profile IDs on replace/merge import while pruning them cleanly on storage hydration', () => {
    const validVault = JSON.parse(exportVaultJson()) as {
      coopPairStreaks?: Record<string, unknown>;
      profiles: Array<{ id: string }>;
    };
    const orphanStreak = {
      pairKey: 'kid-ghost::kid-leo',
      playerIds: ['kid-ghost', 'kid-leo'],
      streakDays: 3,
      lastPlayedISO: '2026-11-23',
      matchesTogether: 3,
      bestCombinedScore: 240,
    };
    const legitStreak = {
      pairKey: 'kid-leo::kid-maya',
      playerIds: ['kid-leo', 'kid-maya'],
      streakDays: 2,
      lastPlayedISO: '2026-11-23',
      matchesTogether: 2,
      bestCombinedScore: 210,
    };

    const orphanOnlyPayload = JSON.stringify({
      ...validVault,
      coopPairStreaks: {
        'kid-ghost::kid-leo': orphanStreak,
      },
    });
    const replaceRes = importVaultJson(orphanOnlyPayload, 'replace');
    expect(replaceRes.ok).toBe(false);
    expect(replaceRes.error).toMatch(/unknown profile ID/i);

    const mergeRes = importVaultJson(orphanOnlyPayload, 'merge');
    expect(mergeRes.ok).toBe(false);
    expect(mergeRes.error).toMatch(/unknown profile ID/i);

    const committedAfterRejection = JSON.parse(exportVaultJson()) as {
      coopPairStreaks?: Record<string, unknown>;
    };
    expect(committedAfterRejection.coopPairStreaks).toEqual({});

    // Storage hydration prunes orphaned pair streaks cleanly without wiping valid explorer profiles or valid streaks
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...validVault,
        coopPairStreaks: {
          'kid-ghost::kid-leo': orphanStreak,
          'kid-leo::kid-maya': legitStreak,
        },
      })
    );
    const hydrated = loadVaultFromStorage();
    expect(hydrated.profiles.map((p) => p.id)).toEqual(['kid-leo', 'kid-maya']);
    expect(hydrated.coopPairStreaks?.['kid-ghost::kid-leo']).toBeUndefined();
    expect(hydrated.coopPairStreaks?.['kid-leo::kid-maya']?.streakDays).toBe(2);
  });

  it('[BUG-S3-003] grades apostrophe-exact Mandarin numeric Pinyin (Ma3te4\'ao4) cleanly and never renders literal () when highlightedChars is empty', async () => {
    const zhCourse = getCourse('zh');
    const mateoEx = zhCourse.units
      .flatMap((u) => u.nodes)
      .flatMap((n) => n.exercises)
      .find((ex): ex is WordBankExercise => ex.id === 'zh-u1-n3-e7');
    expect(mateoEx).toBeDefined();

    // 1. Grader exactMatch parity with optional Pinyin syllable apostrophe
    const numericMateo = gradeAnswer({
      submitted: "Wo3 de5 ming2zi5 jiao4 Ma3te4'ao4",
      expected: mateoEx!.expectedSentence,
      accepted: mateoEx!.acceptedSentences,
      language: 'zh',
    });
    expect(numericMateo.isCorrect).toBe(true);
    expect(numericMateo.exactMatch).toBe(true);
    expect(numericMateo.heartPenalty).toBe(0);
    expect(numericMateo.accentCoaching).toBeUndefined();

    const accentedMateo = gradeAnswer({
      submitted: "Wǒ de míngzi jiào Mǎtè'ào.",
      expected: mateoEx!.expectedSentence,
      accepted: mateoEx!.acceptedSentences,
      language: 'zh',
    });
    expect(accentedMateo.isCorrect).toBe(true);
    expect(accentedMateo.exactMatch).toBe(true);
    expect(accentedMateo.accentCoaching).toBeUndefined();

    const wanAn = gradeAnswer({
      submitted: 'Wan3an1',
      expected: '晚安',
      accepted: ["Wǎn'ān"],
      language: 'zh',
    });
    expect(wanAn.isCorrect).toBe(true);
    expect(wanAn.exactMatch).toBe(true);
    expect(wanAn.accentCoaching).toBeUndefined();

    // 2. Real LessonArena submission on zh-u1-n3-e7 passes cleanly with zero empty () spotlight
    const zhNode3 = zhCourse.units[0].nodes.find((n) => n.id === 'zh-u1-n3')!;
    const isolatedMateoNode: MapNode = {
      ...zhNode3,
      id: 'zh-u1-n3-mateo-probe',
      rewardVocabIds: [],
      exercises: [mateoEx!],
    };
    const { container, unmount } = render(
      <LessonArena node={isolatedMateoNode} language="zh" onExit={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    fireEvent.change(screen.getByLabelText('Type your translation'), {
      target: { value: "Wo3 de5 ming2zi5 jiao4 Ma3te4'ao4" },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Check$/i }));
    expect(container.textContent).not.toContain('()');
    expect(container.textContent).not.toContain('Spell with accents:');
    expect(container.querySelector('.lesson-header-hearts')).toHaveTextContent('5/5');
    unmount();
    cleanup();

    // 3. Even if accentCoaching.highlightedChars is empty/whitespace, LessonArena never renders literal ()
    vi.resetModules();
    const actualGrader = await vi.importActual<typeof import('../../src/core/grader')>(
      '../../src/core/grader'
    );
    vi.doMock('../../src/core/grader', () => ({
      ...actualGrader,
      gradeAnswer: vi.fn(() => ({
        isCorrect: true,
        exactMatch: false,
        normalizedSubmitted: 'wo de mingzi jiao mateao',
        normalizedExpected: 'wo de mingzi jiao mateao',
        heartPenalty: 0,
        accentCoaching: {
          expected: 'Wǒ de míngzi jiào Mǎtèào.',
          submitted: "Wǒ de míngzi jiào Mǎtè'ào",
          highlightedChars: [' ', ''],
          friendlyTip: 'Pinyin syllables matched with an optional apostrophe.',
        },
      })),
    }));

    try {
      const { LessonArena: MockedLessonArena } = await import(
        '../../src/components/lesson/LessonArena'
      );
      const { container: mockedContainer, unmount: unmountMocked } = render(
        <MockedLessonArena node={isolatedMateoNode} language="zh" onExit={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      fireEvent.change(screen.getByLabelText('Type your translation'), {
        target: { value: "Wo3 de5 ming2zi5 jiao4 Ma3te4'ao4" },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Check$/i }));
      expect(mockedContainer.textContent).toContain('Spell with accents:');
      expect(mockedContainer.textContent).toContain('Wǒ de míngzi jiào Mǎtèào.');
      expect(mockedContainer.textContent).not.toContain('()');
      unmountMocked();
    } finally {
      vi.doUnmock('../../src/core/grader');
      vi.resetModules();
    }
  });

  it('[BUG-S3-004] passes WCAG AA >= 4.5:1 contrast for selected tiles/cards in theme_emerald_rainforest and across all 15 palettes', () => {
    const themeCss = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    const selectors = [
      ':root',
      ".app-root[data-theme='theme_cosmic_galaxy']",
      ".app-root[data-theme='theme_aurora_borealis']",
      ".app-root[data-theme='theme_starlight_indigo']",
      ".app-root[data-theme='theme_royal_velvet']",
      ".app-root[data-theme='theme_sunset_plaza']",
      ".app-root[data-theme='theme_candy_sakura']",
      ".app-root[data-theme='theme_ocean_lagoon']",
      ".app-root[data-theme='theme_alpine_meadow']",
      ".app-root[data-theme='theme_kyoto_matcha']",
      ".app-root[data-theme='theme_sahara_mirage']",
      ".app-root[data-theme='theme_emerald_rainforest']",
      ".app-root[data-theme='theme_neon_night_market']",
      ".app-root[data-theme='theme_nordic_fjord']",
      ".app-root[data-theme='theme_laureate_imperial']",
    ] as const;
    expect(selectors).toHaveLength(15);

    const getBlock = (selector: string): string => {
      const idx = themeCss.indexOf(selector);
      expect(idx, `Missing CSS block ${selector}`).toBeGreaterThanOrEqual(0);
      const braceStart = themeCss.indexOf('{', idx);
      const braceEnd = themeCss.indexOf('}', braceStart);
      return themeCss.slice(braceStart, braceEnd + 1);
    };
    const readVar = (block: string, fallback: string, varName: string): string => {
      const m = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(block);
      if (m) return m[1].trim();
      const mf = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(fallback);
      return mf ? mf[1].trim() : '';
    };

    const rootBlock = getBlock(':root');
    for (const sel of selectors) {
      const block = getBlock(sel);
      const modalRgb = parseHexToRgbTuple(readVar(block, rootBlock, '--modal-bg')) ?? [255, 255, 255];
      const cardRgb = compositeCssOver(readVar(block, rootBlock, '--card-bg'), modalRgb);
      const selectedBgRaw = readVar(block, rootBlock, '--tile-selected-bg');
      const selectedBgRgb = compositeCssOver(selectedBgRaw, cardRgb);

      if (sel.includes('theme_emerald_rainforest')) {
        expect(selectedBgRaw).toBe('#065f46');
      }

      for (const fgVar of ['--text-main', '--text-muted', '--tile-selected-ink'] as const) {
        const fgRgb = parseHexToRgbTuple(readVar(block, rootBlock, fgVar));
        expect(fgRgb, `${sel} ${fgVar}`).not.toBeNull();
        expect(
          rgbTupleContrast(fgRgb!, selectedBgRgb),
          `${sel} ${fgVar} on --tile-selected-bg`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

function getProfileCardButton(container: HTMLElement, profileName: string): HTMLButtonElement {
  return within(container).getByRole('button', {
    name: new RegExp(`\\b${profileName}\\b.*\\d+\\s*XP`, 'i'),
  }) as HTMLButtonElement;
}

function buildOfflineBaseLoaderPayload(
  failingLanguages: Partial<Record<BaseLanguageCode, () => Promise<unknown>>>
) {
  return {
    EAGER_BASE_COURSES: {
      es: { course: COURSES.es, glossary: getCourseGlossary('es') },
    },
    BASE_COURSE_LOADERS: {
      ...Object.fromEntries(
        VISIBLE_BASE_LANGUAGES.map((lang) => [
          lang,
          async () => ({ course: COURSES[lang], glossary: getCourseGlossary(lang) }),
        ])
      ),
      ...failingLanguages,
    },
  };
}

describe('Sprint 4 Bug Board Targeted Regression Gates (BUG-S4-001..BUG-S4-006)', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
    vi.doUnmock('../../src/curriculum/baseCoursesLoader');
    vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  it('[BUG-S4-001] gates masked Adult profile switching and replace/merge JSON imports behind Parent Controls (18+) during Quarantined Co-Op without breaking kid switches or disarmed imports', async () => {
    vaultActions.setActiveLanguage('fr');
    const dad = vaultActions.unlockAdultMode({
      adultProfileName: 'Dad',
      initialTrack: 'ebonics',
    });
    expect(dad.adultModeActive).toBe(true);
    const armedVault = JSON.parse(exportVaultJson()) as { activeProfileId: string };
    armedVault.activeProfileId = 'kid-leo';
    expect(importVaultJson(JSON.stringify(armedVault), 'replace').ok).toBe(true);

    const switchSpy = vi.spyOn(vaultActions, 'switchProfile');
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile \(Leo\)/i }));
    const dialog = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    expect(within(dialog).getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
    expect(dialog.textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);

    // 1. Clicking masked adultModeActive: true Explorer card is blocked and opens Parent Gate with kid-safe feedback
    const dadCardBtn = getProfileCardButton(dialog, 'Dad');
    fireEvent.click(dadCardBtn);

    expect(switchSpy).not.toHaveBeenCalled();
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
    expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
    expect(within(dialog).getByTestId('profile-modal-parent-gate')).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /Confirm Parent Controls \(18\+\) before switching into this profile during Family Co-Op\./i
    );
    expect(dialog.textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);

    // Dismiss Parent Gate and verify switching between kid profiles still works cleanly
    fireEvent.click(within(within(dialog).getByTestId('profile-modal-parent-gate')).getByRole('button', { name: 'Cancel' }));
    expect(within(dialog).queryByTestId('profile-modal-parent-gate')).not.toBeInTheDocument();
    fireEvent.click(getProfileCardButton(dialog, 'Maya'));
    expect(switchSpy).toHaveBeenCalledWith('kid-maya');
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-maya');
    expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
    expect(within(dialog).getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();

    // 2. Replace JSON import targeting adultModeActive: true active profile is blocked without mutating vault
    const baselineVault = JSON.parse(exportVaultJson()) as {
      activeProfileId: string;
      profiles: Array<{
        id: string;
        gems?: number;
        adultModeUnlocked?: boolean;
        adultModeActive?: boolean;
        activeLanguage: string;
      }>;
    };
    const replaceAdultPayload = JSON.stringify({
      ...baselineVault,
      activeProfileId: dad.id,
      profiles: baselineVault.profiles.map((p) =>
        p.id === dad.id
          ? { ...p, adultModeUnlocked: true, adultModeActive: true, activeLanguage: 'ebonics' }
          : p
      ),
    });
    const mergeElevatePayload = JSON.stringify({
      ...baselineVault,
      profiles: baselineVault.profiles.map((p) =>
        p.id === 'kid-maya'
          ? { ...p, adultModeUnlocked: true, adultModeActive: true, activeLanguage: 'ebonics' }
          : p
      ),
    });
    const disarmedReplacePayload = JSON.stringify({
      ...baselineVault,
      activeProfileId: 'kid-maya',
      profiles: baselineVault.profiles.map((p) => {
        if (p.id === 'kid-maya') return { ...p, gems: 777, adultModeActive: false };
        if (p.id === dad.id) return { ...p, adultModeActive: false, activeLanguage: 'fr' };
        return p;
      }),
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Paste JSON' }));
    const pasteBox = within(dialog).getByLabelText('Paste save JSON');
    const importBtn = within(dialog).getByRole('button', { name: 'Import Pasted JSON' });

    fireEvent.click(within(dialog).getByLabelText('Replace'));
    fireEvent.change(pasteBox, { target: { value: replaceAdultPayload } });
    fireEvent.click(importBtn);
    expect(within(dialog).getByTestId('profile-modal-parent-gate')).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /Confirm Parent Controls \(18\+\) before replacing with this active explorer during Family Co-Op\./i
    );
    expect(within(dialog).getByRole('status').textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    expect(within(dialog).getByTestId('profile-modal-parent-gate').textContent ?? '').not.toMatch(
      /After-Hours|AAVE|Suburban/i
    );
    expect(getProfileCardButton(dialog, 'Dad').textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-maya');

    // 3. Merge JSON import elevating active profile to adultModeActive: true is blocked without mutating vault
    fireEvent.click(within(dialog).getByLabelText('Merge'));
    fireEvent.change(pasteBox, { target: { value: mergeElevatePayload } });
    fireEvent.click(importBtn);
    expect(within(dialog).getByTestId('profile-modal-parent-gate')).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /Confirm Parent Controls \(18\+\) before merging this active explorer during Family Co-Op\./i
    );
    expect(within(dialog).getByRole('status').textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    expect(within(dialog).getByTestId('profile-modal-parent-gate').textContent ?? '').not.toMatch(
      /After-Hours|AAVE|Suburban/i
    );
    expect(getProfileCardButton(dialog, 'Dad').textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    expect(
      loadVaultFromStorage().profiles.find((p) => p.id === 'kid-maya')?.adultModeActive
    ).toBeFalsy();

    // 4. Disarmed (adultModeActive: false) replace import succeeds cleanly while masked
    fireEvent.click(within(dialog).getByLabelText('Replace'));
    fireEvent.change(pasteBox, { target: { value: disarmedReplacePayload } });
    fireEvent.click(importBtn);
    expect(within(dialog).getByRole('status')).toHaveTextContent(/Imported .* explorer profile/i);
    expect(loadVaultFromStorage().profiles.find((p) => p.id === 'kid-maya')?.gems).toBe(777);
    expect(loadVaultFromStorage().profiles.find((p) => p.id === dad.id)?.adultModeActive).toBe(false);

    // Confirm the open Parent Gate -> unlocks both importing AND switching
    fireEvent.click(within(dialog).getByTestId('profile-modal-confirm-parent-btn'));
    expect(within(dialog).queryByTestId('profile-modal-coop-safe-mask')).not.toBeInTheDocument();

    // Unlocked Parent can now merge/replace-import adultModeActive: true AND switch directly into an adult profile
    fireEvent.click(within(dialog).getByRole('button', { name: 'Paste JSON' }));
    fireEvent.click(within(dialog).getByLabelText('Replace'));
    fireEvent.change(within(dialog).getByLabelText('Paste save JSON'), {
      target: { value: replaceAdultPayload },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Import Pasted JSON' }));
    expect(loadVaultFromStorage().activeProfileId).toBe(dad.id);
    unmount();
    cleanup();

    // Also verify confirming profile-modal-confirm-parent-btn unlocks clicking the masked Adult card directly
    vaultActions.resetVaultToDefaults();
    vaultActions.setActiveLanguage('fr');
    const dadTwo = vaultActions.unlockAdultMode({
      adultProfileName: 'Dad',
      initialTrack: 'ebonics',
    });
    const armedVaultTwo = JSON.parse(exportVaultJson()) as { activeProfileId: string };
    armedVaultTwo.activeProfileId = 'kid-leo';
    expect(importVaultJson(JSON.stringify(armedVaultTwo), 'replace').ok).toBe(true);
    const { unmount: unmountModal } = render(
      <ProfileVaultModal onClose={vi.fn()} coopSafeMask={{ active: true, safeLanguage: 'es' }} />
    );
    const modalEl = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    fireEvent.click(getProfileCardButton(modalEl, 'Dad'));
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
    fireEvent.click(screen.getByTestId('profile-modal-confirm-parent-btn'));
    fireEvent.click(getProfileCardButton(modalEl, 'Dad'));
    expect(loadVaultFromStorage().activeProfileId).toBe(dadTwo.id);
    unmountModal();
  });

  it('[BUG-S4-002] allows solo navigation into ArcadeHub with cabinet-mini-offline-deck-pill when base language fails offline while Map and Phrasebook still show base-track-loading-card', async () => {
    for (const lang of ['ja', 'ru'] as const) {
      vi.resetModules();
      const offlinePayload = buildOfflineBaseLoaderPayload({
        [lang]: vi.fn(async () => {
          throw new Error(`503 Offline ${lang}`);
        }),
      });
      vi.doMock('../../src/curriculum/baseCoursesLoader', () => offlinePayload);
      vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => offlinePayload);

      const { App: LazyApp } = await import('../../src/App');
      const { vaultActions: lazyVault } = await import('../../src/store/useVaultStore');

      window.localStorage.clear();
      lazyVault.resetVaultToDefaults();
      lazyVault.setActiveLanguage(lang);

      const { unmount } = render(<LazyApp />);

      // 1. Map tab preserves BaseTrackLoadingCard (PT-101 intact)
      expect(await screen.findByTestId('base-track-loading-card')).toBeInTheDocument();

      // 2. Phrasebook tab preserves BaseTrackLoadingCard (PT-101 intact)
      fireEvent.click(screen.getByRole('button', { name: 'Phrasebook' }));
      expect(screen.getByTestId('base-track-loading-card')).toBeInTheDocument();

      // 3. Arcade tab opens ArcadeHub (NOT BaseTrackLoadingCard) and surfaces Mini Offline Deck pill in cabinet ready screen
      fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
      expect(screen.queryByTestId('base-track-loading-card')).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Wanderling Arcade Hub' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Play Sky-Catcher' }));
      const pill = await screen.findByTestId('cabinet-mini-offline-deck-pill');
      expect(pill).toHaveTextContent('Mini Offline Deck · 8 Starter Cards');

      unmount();
      cleanup();
      vi.doUnmock('../../src/curriculum/baseCoursesLoader');
      vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
      vi.resetModules();
    }
  });

  it('[BUG-S4-003] renders cabinet-mini-offline-deck-pill on StarlightSecretGame ready screen when offline course load fails and hides it once loaded', async () => {
    vi.resetModules();
    let jaOnline = false;
    const offlinePayload = buildOfflineBaseLoaderPayload({
      ja: vi.fn(async () => {
        if (!jaOnline) {
          throw new Error('503 Offline Japanese');
        }
        return { course: COURSES.ja, glossary: getCourseGlossary('ja') };
      }),
    });
    vi.doMock('../../src/curriculum/baseCoursesLoader', () => offlinePayload);
    vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => offlinePayload);

    const baseReg = await import('../../src/curriculum/baseRegistry');
    const { ArcadeHub: LazyArcadeHub } = await import('../../src/components/arcade/ArcadeHub');
    const { vaultActions: lazyVault } = await import('../../src/store/useVaultStore');

    window.localStorage.clear();
    lazyVault.resetVaultToDefaults();
    lazyVault.setActiveLanguage('ja');
    // Unlock Secret Cabinet #9
    expect(lazyVault.unlockSecretArcade()).toBe(true);

    let unmount = () => {};
    await act(async () => {
      const rendered = render(
        <LazyArcadeHub initialMode="starlight_choir" onExitToMap={vi.fn()} />
      );
      unmount = rendered.unmount;
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('region', { name: 'Starlight Critter Choir' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Start Critter Choir!/i })
    ).toBeInTheDocument();
    const pill = await screen.findByTestId('cabinet-mini-offline-deck-pill');
    expect(pill).toHaveTextContent('Mini Offline Deck · 8 Starter Cards');

    // Reconnect online and load 'ja' -> pill disappears
    jaOnline = true;
    await act(async () => {
      await baseReg.ensureBaseCourseLoaded('ja');
    });
    await waitFor(() => {
      expect(screen.queryByTestId('cabinet-mini-offline-deck-pill')).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Start Critter Choir!/i })
    ).toBeInTheDocument();

    unmount();
  });

  it('[BUG-S4-004] keeps 375x667 Co-Op Hub gridAutoRows minmax(118px, auto) and unclipped Constellation Memory Twins heading with and without CoopOfflineRecoveryGuard', async () => {
    setViewportSize(375, 667);

    // 1. Offline partner ('ja') + Pair Streak at 375x667
    vi.resetModules();
    const offlinePayload = buildOfflineBaseLoaderPayload({
      ja: vi.fn(async () => {
        throw new Error('503 Offline Japanese');
      }),
    });
    vi.doMock('../../src/curriculum/baseCoursesLoader', () => offlinePayload);
    vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => offlinePayload);

    const { ArcadeHub: LazyArcadeHub } = await import('../../src/components/arcade/ArcadeHub');
    const { vaultActions: lazyVault } = await import('../../src/store/useVaultStore');

    window.localStorage.clear();
    lazyVault.resetVaultToDefaults();
    lazyVault.setActiveLanguage('es');
    const kaito = lazyVault.createProfile({
      name: 'Kaito',
      avatarId: 'benni_tinker',
      bannerColor: '#0EA5E9',
      activeLanguage: 'ja',
    });
    lazyVault.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 100,
      playerTwoId: kaito.id,
      playerTwoScore: 120,
      bonusGems: 4,
      xpEarned: 15,
    });
    lazyVault.switchProfile('kid-leo');

    const { unmount: unmountOffline } = render(
      <LazyArcadeHub initialMode="hub" onExitToMap={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: kaito.id } });

    await waitFor(() => {
      expect(screen.getByTestId('coop-mini-offline-deck-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('coop-pair-streak-badge')).toBeInTheDocument();

    const memoryHeading = screen.getByRole('heading', { name: 'Constellation Memory Twins' });
    expect(memoryHeading.style.lineHeight).toBe('1.18');
    expect(memoryHeading.style.paddingBottom).toBe('1px');
    const grid = memoryHeading.closest('.console-scroll-pane') as HTMLElement | null;
    expect(grid).not.toBeNull();
    expect(grid!.style.gridAutoRows).toBe('minmax(118px, auto)');
    expect(grid!.style.overflowY).toBe('auto');
    expect(screen.getByRole('button', { name: 'Chart Stars' })).toBeInTheDocument();

    unmountOffline();
    cleanup();
    vi.doUnmock('../../src/curriculum/baseCoursesLoader');
    vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
    vi.resetModules();

    // 2. Without offline guard (both partners on eager 'es' + Pair Streak at 375x667)
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 110,
      playerTwoId: 'kid-maya',
      playerTwoScore: 130,
      bonusGems: 4,
      xpEarned: 15,
    });
    const { unmount: unmountClean } = render(
      <ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    expect(screen.queryByTestId('coop-mini-offline-deck-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('coop-pair-streak-badge')).toBeInTheDocument();
    for (const cta of ['Play Sky-Catcher', 'Launch Blaster', 'Stack Gelato', 'Chart Stars']) {
      expect(screen.getByRole('button', { name: cta })).toBeInTheDocument();
    }
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
    unmountClean();
  });

  it('[BUG-S4-005] retains live getPinyinTonePreview across partial trailing consonants, rejects non-Pinyin codes, and continues cleanly after Tap to apply in WordBankView', () => {
    // 1. Partial trailing consonant retention
    expect(getPinyinTonePreview('zh', 'to_foreign', 'ni3h')).toBe('nǐh');
    expect(getPinyinTonePreview('zh', 'to_foreign', 'wo3de5m')).toBe('wǒdem');
    expect(getPinyinTonePreview('zh', 'to_foreign', 'ni3hao3h')).toBe('nǐhǎoh');
    expect(getPinyinTonePreview('zh', 'to_foreign', 'wan3a')).toBe('wǎna');

    // 2. Non-Pinyin codes & other languages/directions return null
    expect(getPinyinTonePreview('zh', 'to_foreign', 'v1')).toBeNull();
    expect(getPinyinTonePreview('zh', 'to_foreign', 'b2b')).toBeNull();
    expect(getPinyinTonePreview('zh', 'to_foreign', '2026')).toBeNull();
    expect(getPinyinTonePreview('zh', 'to_english', 'ni3h')).toBeNull();
    expect(getPinyinTonePreview('es', 'to_foreign', 'ni3h')).toBeNull();

    // 3. WordBankView seamless Tap to apply ("ni3h" -> "nǐh", then typing "ao3" -> "nǐhǎo")
    const zhWb = findToForeignWordBank('zh');
    const zhWbCustom: WordBankExercise = {
      ...zhWb,
      expectedSentence: '你好',
      acceptedSentences: ['你好', 'Nǐ hǎo!'],
    };
    const { unmount } = render(
      <WordBankView
        exercise={zhWbCustom}
        language="zh"
        compact={true}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const input = screen.getByLabelText('Type your translation') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'ni3h' } });
    const previewOne = screen.getByTestId('pinyin-tone-number-preview');
    expect(previewOne).toHaveTextContent('Pinyin tones: nǐh');
    fireEvent.click(within(previewOne).getByTestId('pinyin-preview-apply-btn'));
    expect(input.value).toBe('nǐh');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(3);
    expect(screen.queryByTestId('pinyin-tone-number-preview')).not.toBeInTheDocument();

    // Continue typing "ao3" immediately after applying partial preview
    fireEvent.change(input, { target: { value: `${input.value}ao3` } });
    const previewTwo = screen.getByTestId('pinyin-tone-number-preview');
    expect(previewTwo).toHaveTextContent('Pinyin tones: nǐhǎo');
    fireEvent.click(within(previewTwo).getByTestId('pinyin-preview-apply-btn'));
    expect(input.value).toBe('nǐhǎo');
    unmount();
  });

  it('[BUG-S4-006] hides BossGauntletView introLine with hud-hide-xs on <640px and sets marginLeft: auto on Send Reply! and Next Turn in compact mode', () => {
    const themeCss = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    expect(themeCss).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.hud-hide-xs\s*\{\s*display:\s*none;/);

    const zhCourse = getCourse('zh');
    const bossNode = zhCourse.units[0].nodes.find((n) => n.id === 'zh-u1-n7');
    expect(bossNode).toBeDefined();
    const fullBossEx = bossNode!.exercises.find(
      (ex): ex is BossGauntletExercise => ex.type === 'boss_gauntlet'
    )!;
    const turn2OnlyBoss: BossGauntletExercise = {
      ...fullBossEx,
      turns: [
        { ...fullBossEx.turns[1], allowFreeRecall: true },
        fullBossEx.turns[2],
      ],
    };

    // 1. Compact (<640px) viewport at 375x667 with Hint + multi-line tone coaching + Tap to apply active
    setViewportSize(375, 667);
    const { unmount: unmountCompact } = render(
      <BossGauntletView
        exercise={turn2OnlyBoss}
        language="zh"
        compact={true}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const introEl = screen.getByText(turn2OnlyBoss.introLine);
    expect(introEl).toHaveClass('hud-hide-xs');

    const sendBtnCompact = screen.getByRole('button', { name: 'Send Reply!' }) as HTMLButtonElement;
    expect(sendBtnCompact.style.marginLeft).toBe('auto');

    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    const bossInput = screen.getByLabelText('Type your boss reply') as HTMLInputElement;
    fireEvent.change(bossInput, { target: { value: 'wo3de5ming2zi5jiao4Pi2pu4' } });

    expect(screen.getByTestId('free-recall-tone-coaching')).toBeInTheDocument();
    expect(screen.getByTestId('pinyin-preview-apply-btn')).toBeInTheDocument();
    expect(sendBtnCompact.style.marginLeft).toBe('auto');

    fireEvent.click(sendBtnCompact);
    const nextBtnCompact = screen.getByRole('button', { name: 'Next Turn' }) as HTMLButtonElement;
    expect(nextBtnCompact.style.marginLeft).toBe('auto');
    unmountCompact();
    cleanup();

    // 2. Non-compact desktop (1440x900) leaves marginLeft unset
    setViewportSize(1440, 900);
    const { unmount: unmountDesktop } = render(
      <BossGauntletView
        exercise={turn2OnlyBoss}
        language="zh"
        compact={false}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    const sendBtnDesktop = screen.getByRole('button', { name: 'Send Reply!' }) as HTMLButtonElement;
    expect(sendBtnDesktop.style.marginLeft).toBe('');
    unmountDesktop();
  });
});
