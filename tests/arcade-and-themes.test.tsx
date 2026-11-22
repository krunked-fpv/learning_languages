import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ArcadeHub } from '../src/components/arcade/ArcadeHub';
import { FALLBACK_ARCADE_LEXICON } from '../src/components/arcade/arcadeShared';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { getCourse } from '../src/curriculum';
import { createDefaultVault, loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import { LANGUAGE_LIST, LANGUAGE_META } from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');

describe('Wave 3 Adversarial UI: Zero-Scroll 100dvh Shell, 8-Chapter Map, Cosmic Galaxy Themes & All 7 Arcade Games', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it('enforces zero-scroll 100dvh game console shell and all 8 theme palettes in src/styles/theme.css', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');

    // Global root lock: no outer page scrollbars
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;[^}]*overscroll-behavior:\s*none;/s);
    expect(css).toMatch(/\.app-root\s*\{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.app-main-column\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.app-main-content\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);

    // Every unlockable palette theme must define CSS variables
    const themeSelectors = [
      'theme_sunset_plaza',
      'theme_starlight_indigo',
      'theme_alpine_meadow',
      'theme_cosmic_galaxy',
      'theme_aurora_borealis',
      'theme_candy_sakura',
      'theme_ocean_lagoon',
      'theme_royal_velvet',
    ];
    for (const id of themeSelectors) {
      expect(css, `Missing CSS variables block for ${id}`).toContain(`[data-theme='${id}']`);
    }
  });

  it('switches Chapters 1..8 cleanly on AdventureMap across all 16 languages without console errors/warnings', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (const lang of LANGUAGE_LIST) {
      const course = getCourse(lang);
      expect(course.units).toHaveLength(8);
      const profile = createDefaultVault().profiles[0];
      const onSelectUnit = vi.fn();

      const { unmount } = render(
        <AdventureMap
          course={course}
          progress={profile.languageProgress[lang]}
          equippedCosmetics={profile.equippedCosmetics}
          onSelectNode={vi.fn()}
          onSelectUnit={onSelectUnit}
        />
      );

      expect(document.querySelector(`svg[data-flag="${lang}"]`)).toBeInTheDocument();

      const tabList = screen.getByRole('tablist', { name: 'Unit quick-jump tabs' });
      const tabs = within(tabList).getAllByRole('tab');
      expect(tabs).toHaveLength(8);

      // Step forward using Next chapter arrow (0 -> 1)
      fireEvent.click(screen.getByRole('button', { name: 'Next chapter' }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(1);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${course.units[1].id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(course.units[1].title)).toBeInTheDocument();

      // Jump straight to Chapter 8
      const unit8 = course.units[7];
      fireEvent.click(within(tabList).getByRole('tab', { name: `Chapter 8: ${unit8.title}` }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(7);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${unit8.id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(unit8.title)).toBeInTheDocument();
      for (const node of unit8.nodes) {
        expect(document.querySelector(`[data-node-id="${node.id}"]`)).toBeInTheDocument();
      }

      // Return via Previous chapter arrow (7 -> 6)
      fireEvent.click(screen.getByRole('button', { name: 'Previous chapter' }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(6);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${course.units[6].id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(course.units[6].title)).toBeInTheDocument();

      unmount();
      cleanup();
    }

    expect(errSpy, `Unexpected console.error calls: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
    expect(warnSpy, `Unexpected console.warn calls: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
  }, 60_000);

  it('unlocks and equips theme_cosmic_galaxy in CompanionShop and switches palettes via TopHud Color palettes popover', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<App />);

    const appRoot = document.querySelector('.app-root');
    expect(appRoot?.getAttribute('data-theme')).toBe('default');

    // Open TopHud "Color palettes" quick-switcher and click CTA to jump to Gem Shop
    fireEvent.click(screen.getByRole('button', { name: 'Color palettes' }));
    const paletteDialog = screen.getByRole('dialog', { name: 'Color Palettes' });
    expect(within(paletteDialog).getByRole('button', { name: /Storybook Parchment/i })).toBeInTheDocument();
    fireEvent.click(within(paletteDialog).getByRole('button', { name: /Get Cosmic Galaxy & Palettes in Gem Shop/i }));

    // Filter to UI Themes, unlock & equip Cosmic Galaxy Nebula (40 Gems)
    expect(screen.getByRole('region', { name: 'Companion Gem Shop' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'UI Themes' }));
    expect(screen.getByText('Cosmic Galaxy Nebula')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buy & Equip \(40\)/i }));
    expect(screen.getByText('Unlocked & equipped Cosmic Galaxy Nebula!')).toBeInTheDocument();
    expect(appRoot?.getAttribute('data-theme')).toBe('theme_cosmic_galaxy');

    // Toggle back to Storybook Parchment & re-select Cosmic Galaxy Nebula via TopHud popover
    fireEvent.click(screen.getByRole('button', { name: 'Color palettes' }));
    const openedDialog = screen.getByRole('dialog', { name: 'Color Palettes' });
    expect(within(openedDialog).getByRole('button', { name: /Cosmic Galaxy Nebula/i })).toBeInTheDocument();
    fireEvent.click(within(openedDialog).getByRole('button', { name: /Storybook Parchment/i }));
    expect(appRoot?.getAttribute('data-theme')).toBe('default');

    fireEvent.click(screen.getByRole('button', { name: 'Color palettes' }));
    const reopenDialog = screen.getByRole('dialog', { name: 'Color Palettes' });
    fireEvent.click(within(reopenDialog).getByRole('button', { name: /Cosmic Galaxy Nebula/i }));
    expect(appRoot?.getAttribute('data-theme')).toBe('theme_cosmic_galaxy');

    // Navigate back to Atlas Map via BottomNav
    fireEvent.click(screen.getByRole('button', { name: /Atlas Map/i }));
    expect(screen.getByRole('tablist', { name: 'Unit quick-jump tabs' })).toBeInTheDocument();

    expect(errSpy, `Unexpected console.error calls: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
    expect(warnSpy, `Unexpected console.warn calls: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
  });

  it('launches, plays interactive turns, records high scores, and exits all 7 Arcade mini-games cleanly via ArcadeHub', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Unlock the 7th secret game so all 7 cabinets are playable in ArcadeHub
    expect(vaultActions.unlockSecretArcade()).toBe(true);
    const onExitToMap = vi.fn();

    render(<ArcadeHub onExitToMap={onExitToMap} />);
    expect(screen.getByRole('region', { name: 'Wanderling Arcade Hub' })).toBeInTheDocument();

    // All 7 games visible on hub
    expect(screen.getByText('Sky-Catcher Fiesta')).toBeInTheDocument();
    expect(screen.getByText('Cosmic Meteor Blaster')).toBeInTheDocument();
    expect(screen.getByText('Gelato & Pastry Tower')).toBeInTheDocument();
    expect(screen.getByText('Constellation Memory Twins')).toBeInTheDocument();
    expect(screen.getByText('Alpine Express Switcher')).toBeInTheDocument();
    expect(screen.getByText('Beat Kitchen Rhythm')).toBeInTheDocument();
    expect(screen.getByText('Starlight Critter Choir')).toBeInTheDocument();

    // 1. Sky-Catcher Fiesta (sky_catcher)
    fireEvent.click(screen.getByRole('button', { name: 'Play Sky-Catcher' }));
    fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Pip right' }));
    fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
    expect(screen.getByText('Sky-Catcher Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Atlas Map' }));

    // 2. Cosmic Meteor Blaster (meteor_blaster)
    fireEvent.click(screen.getByRole('button', { name: 'Launch Blaster' }));
    fireEvent.click(screen.getByRole('button', { name: /Launch Starfighter!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lane 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lane 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lane 3/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Cosmic Meteor Blaster Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 3. Gelato & Pastry Tower (tower_stack)
    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Drop Scoop!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Gelato & Pastry Tower Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 4. Constellation Memory Twins (constellation_memory)
    fireEvent.click(screen.getByRole('button', { name: 'Chart Stars' }));
    fireEvent.click(screen.getByRole('button', { name: /Chart the Stars!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Star card 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Star card 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
    expect(screen.getByText('Constellation Memory Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 5. Alpine Express Switcher (train_switcher)
    fireEvent.click(screen.getByRole('button', { name: 'Switch Tracks' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Express Shift!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Track 2/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Alpine Express Switcher Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 6. Beat Kitchen Rhythm (rhythm_chef)
    fireEvent.click(screen.getByRole('button', { name: 'Play Rhythm' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Kitchen Beat!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pad 1/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Beat Kitchen Rhythm Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 7. Starlight Critter Choir (starlight_choir)
    fireEvent.click(screen.getByRole('button', { name: /Play Starlight Critter Choir!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Critter Choir!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
    expect(screen.getByText('Encore! Starlight Critter Choir Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // All 7 game IDs must now exist in activeProfile.arcadeHighScores
    const profileAfter = loadVaultFromStorage().profiles[0];
    for (const gameId of [
      'sky_catcher',
      'meteor_blaster',
      'tower_stack',
      'constellation_memory',
      'train_switcher',
      'rhythm_chef',
      'starlight_choir',
    ]) {
      expect(
        typeof profileAfter.arcadeHighScores?.[gameId],
        `Missing high score entry for "${gameId}"`
      ).toBe('number');
    }

    // Exit ArcadeHub to Atlas Map
    fireEvent.click(screen.getByRole('button', { name: 'Back to Atlas Map' }));
    expect(onExitToMap).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(errSpy, `Unexpected console.error calls: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
    expect(warnSpy, `Unexpected console.warn calls: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
  });

  it('supports all 16 languages in FALLBACK_ARCADE_LEXICON and renders RTL dir="rtl" and romanized badges in ArcadeHub & mini-games', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (const lang of LANGUAGE_LIST) {
      const items = FALLBACK_ARCADE_LEXICON[lang];
      expect(items, `Missing FALLBACK_ARCADE_LEXICON for ${lang}`).toHaveLength(8);
      for (const item of items) {
        expect(item.language).toBe(lang);
        expect(item.foreign.trim()).not.toBe('');
        expect(item.english.trim()).not.toBe('');
        expect(item.phonetic.trim()).not.toBe('');
        if (lang === 'en') {
          expect(item.foreign.toLowerCase()).not.toBe(item.english.toLowerCase());
        }
        if (['zh', 'ja', 'hi', 'bn', 'ar', 'arz', 'ru'].includes(lang)) {
          expect(item.romanized?.trim(), `Missing romanized in fallback arcade ${lang}:${item.id}`).toBeTruthy();
        }
      }
    }

    const arSet = new Set(FALLBACK_ARCADE_LEXICON.ar.map((i) => i.foreign));
    const arzDistinct = FALLBACK_ARCADE_LEXICON.arz.filter((i) => !arSet.has(i.foreign)).length;
    expect(arzDistinct).toBeGreaterThanOrEqual(6);

    vaultActions.unlockSecretArcade();

    // Spot-check RTL (arz, ar), CJK (zh, ja), Indic (hi), and Latin (vi) in ArcadeHub + SkyCatcher + StarlightCritterChoir
    for (const lang of ['arz', 'ar', 'zh', 'ja', 'hi', 'vi'] as const) {
      vaultActions.setActiveLanguage(lang);
      const { container, unmount } = render(<ArcadeHub onExitToMap={vi.fn()} />);

      expect(container.querySelector(`svg[data-flag="${lang}"]`)).toBeInTheDocument();
      expect(screen.getByText(LANGUAGE_META[lang].nativeName)).toBeInTheDocument();

      // Launch Sky-Catcher Fiesta and verify TargetPromptBar data-language/data-dir + RTL/LTR rendering
      fireEvent.click(screen.getByRole('button', { name: 'Play Sky-Catcher' }));
      fireEvent.click(screen.getByRole('button', { name: /Start 45s Fiesta!/i }));

      const promptBar = container.querySelector(`[data-language="${lang}"][data-dir="${LANGUAGE_META[lang].dir}"]`);
      expect(promptBar, `Missing TargetPromptBar metadata for ${lang}`).toBeInTheDocument();
      if (LANGUAGE_META[lang].dir === 'rtl') {
        expect(container.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
      }

      fireEvent.click(screen.getByRole('button', { name: /Claim \+\d+ Hearts/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to Atlas Map' }));

      // Launch Starlight Critter Choir and verify RTL Song-Bubbles / exit cleanly
      fireEvent.click(screen.getByRole('button', { name: /Play Starlight Critter Choir!/i }));
      fireEvent.click(screen.getByRole('button', { name: /Start Critter Choir!/i }));
      if (LANGUAGE_META[lang].dir === 'rtl') {
        expect(container.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

      act(() => {
        vi.runOnlyPendingTimers();
      });
      unmount();
      cleanup();
    }

    expect(errSpy, `Unexpected console.error calls: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
    expect(warnSpy, `Unexpected console.warn calls: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
  });
});
