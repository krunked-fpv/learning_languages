import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ArcadeHub } from '../src/components/arcade/ArcadeHub';
import { CafeOrderRushArcade } from '../src/components/arcade/CafeOrderRushArcade';
import { StarlightBridgeArcade } from '../src/components/arcade/StarlightBridgeArcade';
import { FALLBACK_ARCADE_LEXICON } from '../src/components/arcade/arcadeShared';
import { AdventureMap } from '../src/components/map/AdventureMap';
import { getCourse } from '../src/curriculum';
import { createDefaultVault, loadVaultFromStorage, vaultActions } from '../src/store/useVaultStore';
import { LANGUAGE_LIST, LANGUAGE_META, PROFICIENCY_TIERS } from '../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '..');

describe('Wave 3 Adversarial UI: Zero-Scroll 100dvh Shell, 16-Unit 5-Tier Map, 15 UI Palettes & All 9 Proficiency-Scaled Arcade Games', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it('enforces zero-scroll 100dvh game console shell and all 15 UI palettes (default + 14 theme_*) in src/styles/theme.css', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');

    // Global root lock: no outer page scrollbars
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;[^}]*overscroll-behavior:\s*none;/s);
    expect(css).toMatch(/\.app-root\s*\{[^}]*height:\s*100dvh;[^}]*max-height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.app-main-column\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
    expect(css).toMatch(/\.app-main-content\s*\{[^}]*flex:\s*1\s+1\s+auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);

    expect(css).toContain(':root');
    // Every unlockable palette theme (14 themes + default = 15 total palettes) must define CSS variables
    const themeSelectors = [
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
    expect(themeSelectors).toHaveLength(14);
    for (const id of themeSelectors) {
      expect(css, `Missing CSS variables block for ${id}`).toContain(`[data-theme='${id}']`);
    }
  });

  it('switches Chapters 1..16 cleanly with 5-tier CEFR Atlas Ribbon and placement checkpoint trigger across all 16 languages without console errors/warnings', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    for (const lang of LANGUAGE_LIST) {
      const course = getCourse(lang);
      expect(course.units).toHaveLength(16);
      const profile = createDefaultVault().profiles[0];
      const onSelectUnit = vi.fn();
      const onStartTierCheckpoint = vi.fn();

      const { unmount } = render(
        <AdventureMap
          course={course}
          progress={profile.languageProgress[lang]}
          equippedCosmetics={profile.equippedCosmetics}
          onSelectNode={vi.fn()}
          onSelectUnit={onSelectUnit}
          onStartTierCheckpoint={onStartTierCheckpoint}
        />
      );

      expect(document.querySelector(`svg[data-flag="${lang}"]`)).toBeInTheDocument();

      // 5-tier CEFR Atlas Ribbon present
      const ribbon = screen.getByRole('navigation', { name: 'CEFR proficiency tiers' });
      for (const tier of PROFICIENCY_TIERS) {
        expect(ribbon.querySelector(`[data-tier-pill="${tier}"]`), `Missing tier pill ${tier}`).toBeInTheDocument();
      }

      const tabList = screen.getByRole('tablist', { name: 'Unit quick-jump tabs' });
      const tabs = within(tabList).getAllByRole('tab');
      expect(tabs).toHaveLength(16);

      // Step forward using Next chapter arrow (0 -> 1)
      fireEvent.click(screen.getByRole('button', { name: 'Next chapter' }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(1);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${course.units[1].id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(course.units[1].title)).toBeInTheDocument();

      // Jump via B1 tier pill -> Unit 9 and trigger "Test into B1" checkpoint
      fireEvent.click(ribbon.querySelector('[data-tier-pill="B1"]')!);
      expect(onSelectUnit).toHaveBeenLastCalledWith(8);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${course.units[8].id}"]`)).toBeInTheDocument();
      });
      const checkpointBtn = screen.getByRole('button', { name: 'Test into B1' });
      fireEvent.click(checkpointBtn);
      expect(onStartTierCheckpoint).toHaveBeenLastCalledWith('B1');

      // Jump straight to Chapter 16 (C1+)
      const unit16 = course.units[15];
      fireEvent.click(within(tabList).getByRole('tab', { name: `Chapter 16: ${unit16.title}` }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(15);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${unit16.id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(unit16.title)).toBeInTheDocument();
      for (const node of unit16.nodes) {
        expect(document.querySelector(`[data-node-id="${node.id}"]`)).toBeInTheDocument();
      }

      // Return via Previous chapter arrow (15 -> 14)
      fireEvent.click(screen.getByRole('button', { name: 'Previous chapter' }));
      expect(onSelectUnit).toHaveBeenLastCalledWith(14);
      await waitFor(() => {
        expect(document.querySelector(`[data-unit-id="${course.units[14].id}"]`)).toBeInTheDocument();
      });
      expect(screen.getByText(course.units[14].title)).toBeInTheDocument();

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

  it('launches, plays interactive turns, scales Sprout/Voyager/Master XP, records high scores, and exits all 9 Arcade mini-games cleanly via ArcadeHub', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Unlock the 9th secret game so all 9 cabinets are playable in ArcadeHub
    expect(vaultActions.unlockSecretArcade()).toBe(true);
    const onExitToMap = vi.fn();

    render(<ArcadeHub onExitToMap={onExitToMap} />);
    expect(screen.getByRole('region', { name: 'Wanderling Arcade Hub' })).toBeInTheDocument();

    // All 9 games visible on hub
    expect(screen.getByText('Sky-Catcher Fiesta')).toBeInTheDocument();
    expect(screen.getByText('Cosmic Meteor Blaster')).toBeInTheDocument();
    expect(screen.getByText('Gelato & Pastry Tower')).toBeInTheDocument();
    expect(screen.getByText('Constellation Memory Twins')).toBeInTheDocument();
    expect(screen.getByText('Alpine Express Switcher')).toBeInTheDocument();
    expect(screen.getByText('Beat Kitchen Rhythm')).toBeInTheDocument();
    expect(screen.getByText('Polyglot Café Order Rush')).toBeInTheDocument();
    expect(screen.getByText('Starlight Bridge Cloze Builder')).toBeInTheDocument();
    expect(screen.getByText('Starlight Critter Choir')).toBeInTheDocument();

    // Selectable Sprout / Voyager / Master tier buttons
    const tierGroup = screen.getByRole('group', { name: 'Arcade proficiency tier' });
    expect(within(tierGroup).getByRole('button', { name: /Sprout/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(tierGroup).getByRole('button', { name: /Voyager/i }));
    expect(within(tierGroup).getByRole('button', { name: /Voyager/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(tierGroup).getByRole('button', { name: /Master/i }));
    expect(within(tierGroup).getByRole('button', { name: /Master/i })).toHaveAttribute('aria-pressed', 'true');

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

    // 7. Polyglot Café Order Rush (cafe_order_rush)
    fireEvent.click(screen.getByRole('button', { name: 'Serve Café Rush' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Café Rush!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Platter 1/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Polyglot Café Order Rush Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 8. Starlight Bridge Cloze Builder (starlight_bridge)
    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Plank 1/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('Starlight Bridge Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // 9. Starlight Critter Choir (starlight_choir)
    fireEvent.click(screen.getByRole('button', { name: /Play Starlight Critter Choir!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Critter Choir!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Claim Rewards' }));
    expect(screen.getByText('Encore! Starlight Critter Choir Complete!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

    // All 9 game IDs must now exist in activeProfile.arcadeHighScores and Master tier XP scaled cleanly
    const profileAfter = loadVaultFromStorage().profiles[0];
    expect(profileAfter.totalXp).toBeGreaterThanOrEqual(500);
    for (const gameId of [
      'sky_catcher',
      'meteor_blaster',
      'tower_stack',
      'constellation_memory',
      'train_switcher',
      'rhythm_chef',
      'cafe_order_rush',
      'starlight_bridge',
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

  it('supports RTL/romanized rendering in CafeOrderRushArcade and StarlightBridgeArcade and switches new UI palettes (Kyoto Matcha & Laureate Imperial)', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    for (const lang of ['ar', 'arz', 'zh', 'ja'] as const) {
      vaultActions.setActiveLanguage(lang);

      const { container: cafeCont, unmount: unmountCafe } = render(
        <CafeOrderRushArcade arcadeTier="voyager" onExit={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Start Café Rush!/i }));
      if (LANGUAGE_META[lang].dir === 'rtl') {
        expect(cafeCont.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      expect(screen.getByText('Polyglot Café Order Rush Complete!')).toBeInTheDocument();
      unmountCafe();
      cleanup();

      const { container: bridgeCont, unmount: unmountBridge } = render(
        <StarlightBridgeArcade arcadeTier="master" onExit={vi.fn()} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
      if (LANGUAGE_META[lang].dir === 'rtl') {
        expect(bridgeCont.querySelectorAll('[dir="rtl"]').length).toBeGreaterThan(0);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      expect(screen.getByText('Starlight Bridge Complete!')).toBeInTheDocument();
      unmountBridge();
      cleanup();
    }

    // Unlock and equip the 6 new UI palettes via CompanionShop -> TopHud
    vaultActions.completeMapNode({
      language: 'ja',
      nodeId: 'ja-seed',
      stars: 3,
      xpEarned: 30,
      gemsEarned: 500,
      unlockedVocabIds: [],
      maxCombo: 0,
    });
    render(<App />);
    const appRoot = document.querySelector('.app-root');
    fireEvent.click(screen.getByRole('button', { name: /Gem Shop/i }));
    fireEvent.click(screen.getByRole('button', { name: 'UI Themes' }));
    expect(screen.getByText('Kyoto Matcha Courtyard')).toBeInTheDocument();
    expect(screen.getByText('Sahara Starlight Mirage')).toBeInTheDocument();
    expect(screen.getByText('Emerald Canopy Mist')).toBeInTheDocument();
    expect(screen.getByText('Lantern Night Market')).toBeInTheDocument();
    expect(screen.getByText('Nordic Fjord Frost')).toBeInTheDocument();
    expect(screen.getByText('Grand Laureate Imperial')).toBeInTheDocument();
    const matchaRow = screen.getByRole('button', { name: 'Preview Kyoto Matcha Courtyard' }).parentElement!;
    fireEvent.click(within(matchaRow).getByRole('button', { name: /Buy & Equip/i }));
    expect(appRoot?.getAttribute('data-theme')).toBe('theme_kyoto_matcha');
    const imperialRow = screen.getByRole('button', { name: 'Preview Grand Laureate Imperial' }).parentElement!;
    fireEvent.click(within(imperialRow).getByRole('button', { name: /Buy & Equip/i }));
    expect(appRoot?.getAttribute('data-theme')).toBe('theme_laureate_imperial');

    act(() => {
      vi.runOnlyPendingTimers();
    });
  });
});
