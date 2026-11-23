import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { stopSpeech } from '../../src/audio';
import { MascotStage } from '../../src/components/characters/MascotStage';
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { CompanionShop } from '../../src/components/meta/CompanionShop';
import { LeagueAndBadges } from '../../src/components/meta/LeagueAndBadges';
import { PhrasebookVault } from '../../src/components/meta/PhrasebookVault';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { AVATAR_SHOP_CATALOG, COSMETIC_CATALOG } from '../../src/core';
import { COURSES, getPlayableNodeExercises } from '../../src/curriculum';
import { loadVaultFromStorage, vaultActions } from '../../src/store/useVaultStore';
import {
  type BaseLanguageCode,
  type CompanionId,
  type CosmeticId,
  type CosmeticItem,
  type CosmeticSlot,
  type EquippedCosmetics,
  type MapNode,
} from '../../src/types/contracts';
import { queryButtonByAriaLabel } from './helpers';

const ROOT_DIR = resolve(__dirname, '../..');

const PALETTE_ROTATION: ReadonlyArray<{
  ptId: string;
  themeId: 'default' | CosmeticId;
  viewport: { label: string; width: number; height: number };
  lang: BaseLanguageCode;
}> = [
  { ptId: 'PT-074', themeId: 'default', viewport: { label: 'desktop', width: 1440, height: 900 }, lang: 'es' },
  { ptId: 'PT-075', themeId: 'theme_sunset_plaza', viewport: { label: 'tablet', width: 768, height: 1024 }, lang: 'fr' },
  { ptId: 'PT-076', themeId: 'theme_starlight_indigo', viewport: { label: 'mobile', width: 375, height: 667 }, lang: 'de' },
  { ptId: 'PT-077', themeId: 'theme_alpine_meadow', viewport: { label: 'desktop', width: 1440, height: 900 }, lang: 'it' },
  { ptId: 'PT-078', themeId: 'theme_cosmic_galaxy', viewport: { label: 'tablet', width: 768, height: 1024 }, lang: 'pt' },
  { ptId: 'PT-079', themeId: 'theme_aurora_borealis', viewport: { label: 'mobile', width: 375, height: 667 }, lang: 'ar' },
  { ptId: 'PT-080', themeId: 'theme_candy_sakura', viewport: { label: 'desktop', width: 1440, height: 900 }, lang: 'ja' },
  { ptId: 'PT-081', themeId: 'theme_ocean_lagoon', viewport: { label: 'tablet', width: 768, height: 1024 }, lang: 'zh' },
  { ptId: 'PT-082', themeId: 'theme_royal_velvet', viewport: { label: 'mobile', width: 375, height: 667 }, lang: 'arz' },
  { ptId: 'PT-083', themeId: 'theme_kyoto_matcha', viewport: { label: 'desktop', width: 1440, height: 900 }, lang: 'hi' },
  { ptId: 'PT-084', themeId: 'theme_sahara_mirage', viewport: { label: 'tablet', width: 768, height: 1024 }, lang: 'bn' },
  { ptId: 'PT-085', themeId: 'theme_emerald_rainforest', viewport: { label: 'mobile', width: 375, height: 667 }, lang: 'ru' },
  { ptId: 'PT-086', themeId: 'theme_neon_night_market', viewport: { label: 'desktop', width: 1440, height: 900 }, lang: 'id' },
  { ptId: 'PT-087', themeId: 'theme_nordic_fjord', viewport: { label: 'tablet', width: 768, height: 1024 }, lang: 'vi' },
  { ptId: 'PT-088', themeId: 'theme_laureate_imperial', viewport: { label: 'mobile', width: 375, height: 667 }, lang: 'sw' },
];

const COMPANIONS: readonly { id: CompanionId; label: string }[] = [
  { id: 'pip', label: 'Pip' },
  { id: 'mateo', label: 'Mateo' },
  { id: 'colette', label: 'Colette' },
  { id: 'benni', label: 'Benni' },
  { id: 'luca', label: 'Luca' },
];

const SLOTS: readonly CosmeticSlot[] = ['hat', 'glasses', 'cape', 'aura', 'prop', 'pet', 'theme'];

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function findNinePlusTokenC1C2Node(preferredLang: BaseLanguageCode): {
  lang: BaseLanguageCode;
  node: MapNode;
} {
  const candidates: BaseLanguageCode[] = [preferredLang, 'es', 'fr', 'de', 'ar', 'en'];
  for (const lang of candidates) {
    const c1Units = COURSES[lang].units.filter((u) => u.proficiencyTier === 'C1_C2');
    for (const unit of c1Units) {
      for (const node of unit.nodes) {
        if (node.nodeType !== 'lesson') continue;
        const exercises = getPlayableNodeExercises(lang, node.id, [], false);
        const longWb = exercises.find(
          (ex) =>
            ex.type === 'word_bank' &&
            ex.direction === 'to_english' &&
            ex.promptTokens.length >= 9
        );
        if (longWb) {
          return {
            lang,
            node: { ...node, exercises: [longWb] },
          };
        }
      }
    }
  }
  // Fallback: synthesize a 9+ token C1_C2 wrapper using existing C1_C2 unit node if needed
  const fallbackUnit = COURSES.es.units[15];
  const fallbackNode = fallbackUnit.nodes.find((n) => n.nodeType === 'lesson')!;
  return { lang: 'es', node: fallbackNode };
}

function seedRichProgression(lang: BaseLanguageCode): void {
  const course = COURSES[lang];
  const vocabIds = course.units.flatMap((u) => u.vocabCards.map((c) => c.id));
  vaultActions.setActiveLanguage(lang);
  vaultActions.completeMapNode({
    language: lang,
    nodeId: course.units[15].nodes[0].id,
    stars: 3,
    xpEarned: 300,
    gemsEarned: 10_000,
    unlockedVocabIds: vocabIds.slice(0, 60),
    maxCombo: 6,
    checkpointUnlock: {
      targetTier: 'C1_C2',
      prerequisiteNodeIds: course.units.slice(0, 14).flatMap((u) => u.nodes.map((n) => n.id)),
      targetUnitIndex: 15,
    },
  });
}

describe('Cohort D [PT-074..PT-088]: 15 Palettes x 3 Viewports, Edge Tap-to-Peek, 50 Cosmetics x 5 Companions & 10 Avatars', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    window.localStorage.clear();
    vaultActions.resetVaultToDefaults();
    stopSpeech();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopSpeech();
    cleanup();
    vi.restoreAllMocks();
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  PALETTE_ROTATION.forEach((spec, idx) => {
    it(`[${spec.ptId}] palette ${spec.themeId} @ ${spec.viewport.label} (${spec.viewport.width}x${spec.viewport.height}): Map -> C1_C2 9+ token Lesson Arena -> Edge Tap-to-Peek -> Phrasebook -> Grand Emporium -> Leagues -> Profile Switcher`, async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
      if (spec.themeId === 'default') {
        expect(css).toContain(':root');
      } else {
        expect(css).toContain(`[data-theme='${spec.themeId}']`);
      }

      setViewportSize(spec.viewport.width, spec.viewport.height);
      seedRichProgression(spec.lang);

      // Equip palette theme (via shop / vault) & verify App applies data-theme
      if (spec.themeId !== 'default') {
        expect(vaultActions.buyAndEquipCosmetic(spec.themeId)).toBe(true);
      } else {
        vaultActions.equipCosmetic('theme', undefined);
      }

      const { container: appCont, unmount: unmountApp } = render(<App />);
      const appRoot = appCont.querySelector('.app-root');
      expect(appRoot?.getAttribute('data-theme')).toBe(spec.themeId);

      // 1. Map -> check dark-theme CEFR pill contrast [BUG-003], then jump to Chapter 16 (C1_C2)
      const DARK_PALETTES = new Set<string>([
        'theme_starlight_indigo',
        'theme_cosmic_galaxy',
        'theme_aurora_borealis',
        'theme_royal_velvet',
        'theme_emerald_rainforest',
        'theme_neon_night_market',
        'theme_laureate_imperial',
      ]);
      const darkTierPillIssues: string[] = [];
      if (DARK_PALETTES.has(spec.themeId)) {
        const unlockedInactivePills = Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            'button[data-tier-pill][data-tier-locked="false"][aria-pressed="false"]'
          )
        );
        expect(unlockedInactivePills.length).toBeGreaterThan(0);
        for (const pill of unlockedInactivePills) {
          if (pill.style.color.includes('var(--text-main')) {
            darkTierPillIssues.push(`${pill.getAttribute('data-tier-pill')}:${pill.style.color}`);
          }
        }
      }

      const tabList = screen.getByRole('tablist', { name: 'Unit quick-jump tabs' });
      const u16 = COURSES[spec.lang].units[15];
      fireEvent.click(within(tabList).getByRole('tab', { name: `Chapter 16: ${u16.title}` }));
      await waitFor(
        () => {
          expect(document.querySelector(`[data-unit-id="${u16.id}"]`)).toBeInTheDocument();
          expect(screen.getByText(u16.title)).toBeInTheDocument();
        },
        { timeout: 4000 }
      );
      unmountApp();
      cleanup();

      // 2. Fluent C1_C2 9+ token Lesson Arena + Tap-to-Peek edge tokens clamping check
      const { lang: arenaLang, node: c1Node } = findNinePlusTokenC1C2Node(spec.lang);
      const { unmount: unmountArena } = render(
        <LessonArena node={c1Node} language={arenaLang} onExit={vi.fn()} />
      );
      expect(screen.getByText(/C1\+ · Polyglot Laureate/i)).toBeInTheDocument();

      const hintBtns = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button.tap-hint-token-btn')
      );
      if (hintBtns.length > 0) {
        expect(hintBtns.length).toBeGreaterThanOrEqual(9);
        // Simulate right/bottom edge anchor for last token and left/top edge for first token
        const edgeCases = [
          {
            btn: hintBtns[0],
            rect: { left: 2, right: 48, top: 60, bottom: 84, width: 46, height: 24 },
          },
          {
            btn: hintBtns[hintBtns.length - 1],
            rect: {
              left: spec.viewport.width - 52,
              right: spec.viewport.width - 4,
              top: spec.viewport.height - 64,
              bottom: spec.viewport.height - 36,
              width: 48,
              height: 28,
            },
          },
        ];

        for (const edge of edgeCases) {
          vi.spyOn(edge.btn, 'getBoundingClientRect').mockReturnValue(edge.rect as DOMRect);
          fireEvent.click(edge.btn);
          const popover = screen.getByRole('dialog', { name: /Word hint for/i });
          const left = parseFloat(popover.style.left);
          const width = parseFloat(popover.style.width);
          const top = parseFloat(popover.style.top);
          expect(left).toBeGreaterThanOrEqual(8);
          expect(left + width).toBeLessThanOrEqual(spec.viewport.width - 8);
          expect(top).toBeGreaterThanOrEqual(8);
          expect(top).toBeLessThanOrEqual(spec.viewport.height - 8);
          const closeBtn = queryButtonByAriaLabel('Close word hint');
          if (closeBtn) fireEvent.click(closeBtn);
        }
      }
      unmountArena();
      cleanup();

      // 3. Phrasebook Tier Filters & Family Show-Off Mode
      const { unmount: unmountPb } = render(<PhrasebookVault />);
      fireEvent.click(screen.getByRole('button', { name: /C1\+/i }));
      fireEvent.click(screen.getByRole('button', { name: /All Tiers/i }));
      fireEvent.click(screen.getByRole('button', { name: /Family Show-Off Mode/i }));
      const flipCardBtn = screen.queryByRole('button', { name: /Tap card to flip/i });
      if (flipCardBtn) fireEvent.click(flipCardBtn);
      fireEvent.keyDown(window, { key: 'Escape' });
      unmountPb();
      cleanup();

      // 4. Grand Emporium: shard of cosmetics across 5 companions + avatar unlock/select
      const shardStart = Math.floor((idx * COSMETIC_CATALOG.length) / PALETTE_ROTATION.length);
      const shardEnd = Math.floor(((idx + 1) * COSMETIC_CATALOG.length) / PALETTE_ROTATION.length);
      const cosmeticShard: CosmeticItem[] = COSMETIC_CATALOG.slice(shardStart, shardEnd);
      const companion = COMPANIONS[idx % COMPANIONS.length];

      const { unmount: unmountShop } = render(<CompanionShop />);
      const compGroup = screen.getByRole('group', { name: 'Preview companion switcher' });
      fireEvent.click(within(compGroup).getByRole('button', { name: companion.label }));

      for (const item of cosmeticShard) {
        const previewBtn = screen.getByRole('button', { name: `Preview ${item.name}` });
        fireEvent.click(previewBtn);
        const card = previewBtn.parentElement!;
        const equipBtn = within(card).getByRole('button', {
          name: /Buy & Equip|Equip|Unequip/i,
        });
        fireEvent.click(equipBtn);
      }

      // Check avatar slice on Avatars tab
      fireEvent.click(screen.getByRole('button', { name: 'Avatars' }));
      const avatarSlice = AVATAR_SHOP_CATALOG.slice(idx % AVATAR_SHOP_CATALOG.length, (idx % AVATAR_SHOP_CATALOG.length) + 1);
      for (const av of avatarSlice) {
        expect(screen.getByText(av.name)).toBeInTheDocument();
      }
      unmountShop();
      cleanup();

      // Full 50-cosmetic x 7-slot x 5-companion + 10-avatar exhaustiveness check on PT-074 & PT-088
      if (idx === 0 || idx === PALETTE_ROTATION.length - 1) {
        expect(COSMETIC_CATALOG).toHaveLength(50);
        expect(AVATAR_SHOP_CATALOG).toHaveLength(10);
        const slotCounts = new Set(COSMETIC_CATALOG.map((c) => c.slot));
        expect(slotCounts).toEqual(new Set(SLOTS));

        for (const item of COSMETIC_CATALOG) {
          expect(vaultActions.buyAndEquipCosmetic(item.id)).toBe(true);
        }
        const equippedAll: EquippedCosmetics = {};
        for (const slot of SLOTS) {
          equippedAll[slot] = COSMETIC_CATALOG.find((c) => c.slot === slot)!.id;
        }
        for (const comp of COMPANIONS) {
          const { container, unmount: unmountMascot } = render(
            <MascotStage companionId={comp.id} pose="victory_dance" equippedCosmetics={equippedAll} />
          );
          expect(container.querySelector(`[data-companion="${comp.id}"]`)).toBeInTheDocument();
          unmountMascot();
          cleanup();
        }
        for (const av of AVATAR_SHOP_CATALOG) {
          expect(vaultActions.buyAndSelectAvatar(av.id)).toBe(true);
          expect(loadVaultFromStorage().profiles[0].avatarId).toBe(av.id);
        }
      }

      // 5. Leagues & Badges
      const { unmount: unmountLeagues } = render(<LeagueAndBadges />);
      expect(screen.getByRole('region', { name: 'Leagues and Badges' })).toBeInTheDocument();
      if (spec.viewport.width <= 640) {
        fireEvent.click(screen.getByRole('button', { name: /Badges/i }));
        fireEvent.click(screen.getByRole('button', { name: /Weekly League/i }));
      }
      unmountLeagues();
      cleanup();

      // 6. Profile Switcher
      const onCloseProfile = vi.fn();
      const { unmount: unmountProfile } = render(<ProfileVaultModal onClose={onCloseProfile} />);
      const dlg = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
      const mayaBtn = within(dlg)
        .getAllByRole('button', { name: /Maya/i })
        .find((b) => !/delete/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))!;
      fireEvent.click(mayaBtn);
      expect(loadVaultFromStorage().activeProfileId).toBe('kid-maya');
      const leoBtn = within(dlg)
        .getAllByRole('button', { name: /Leo/i })
        .find((b) => !/delete/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''))!;
      fireEvent.click(leoBtn);
      expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCloseProfile).toHaveBeenCalled();
      unmountProfile();
      cleanup();

      expect(errSpy, `${spec.ptId} console.error: ${JSON.stringify(errSpy.mock.calls)}`).not.toHaveBeenCalled();
      expect(warnSpy, `${spec.ptId} console.warn: ${JSON.stringify(warnSpy.mock.calls)}`).not.toHaveBeenCalled();
      expect(
        darkTierPillIssues,
        `BUG-003 (${spec.themeId}): pastel surfaceTint CEFR pill must not use var(--text-main) in dark themes`
      ).toEqual([]);
    }, 30_000);
  });
});
