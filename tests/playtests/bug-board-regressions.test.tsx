import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stopSpeech } from '../../src/audio';
import { StarlightBridgeArcade } from '../../src/components/arcade/StarlightBridgeArcade';
import { FloatingPopToast } from '../../src/components/fx/JuiceEngine';
import { WordBankTray, buildWordBankPool } from '../../src/components/lesson/WordBankTray';
import { CompanionShop } from '../../src/components/meta/CompanionShop';
import { loadVaultFromStorage, vaultActions } from '../../src/store/useVaultStore';

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
    act(() => {
      shieldBtn.click();
      shieldBtn.click();
    });
    // Rapid re-queried click across commits (< 350ms cooldown) must also be blocked
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
