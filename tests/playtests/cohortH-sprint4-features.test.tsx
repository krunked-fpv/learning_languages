import '@testing-library/jest-dom/vitest';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { getSpeechRuntimeState, stopSpeech } from '../../src/audio';
import { ArcadeHub } from '../../src/components/arcade/ArcadeHub';
import { BossGauntletView } from '../../src/components/lesson/BossGauntletView';
import { FreeRecallHintBar } from '../../src/components/lesson/FreeRecallHintBar';
import { FreeRecallScriptStrip } from '../../src/components/lesson/FreeRecallScriptStrip';
import { WordBankView } from '../../src/components/lesson/WordBankView';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { TopHud } from '../../src/components/shell/TopHud';
import {
  convertNumericPinyin,
  gradeAnswer,
  resolveFreeRecallHint,
} from '../../src/core';
import { COURSES, getCourseGlossary } from '../../src/curriculum';
import {
  exportVaultJson,
  importVaultJson,
  loadVaultFromStorage,
  vaultActions,
} from '../../src/store/useVaultStore';
import {
  ADULT_EASTER_EGG_CODES,
  ADULT_EASTER_EGG_TAP_COUNT,
  LANGUAGE_META,
  VISIBLE_BASE_LANGUAGES,
  type BaseLanguageCode,
  type BossGauntletExercise,
  type CosmeticId,
  type LanguageCode,
  type WordBankExercise,
} from '../../src/types/contracts';

const ROOT_DIR = resolve(__dirname, '../..');
const DIST_DIR = resolve(ROOT_DIR, 'dist');
const UNICODE_FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const MAX_JS_CHUNK_BYTES = 500 * 1024;

function ensureBuiltDist(): void {
  const manifestPath = resolve(DIST_DIR, 'sw-precache-manifest.json');
  const distSwPath = resolve(DIST_DIR, 'sw.js');
  if (
    existsSync(manifestPath) &&
    existsSync(distSwPath) &&
    existsSync(resolve(DIST_DIR, 'index.html'))
  ) {
    return;
  }
  const nodeBinDir = dirname(process.execPath);
  const pathSep = process.platform === 'win32' ? ';' : ':';
  execSync('npm run build', {
    cwd: ROOT_DIR,
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PATH: `${nodeBinDir}${pathSep}${process.env.PATH ?? ''}`,
    },
  });
}

function walkFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      out.push(...walkFilesRecursive(fullPath));
    } else if (st.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function parseRgbOrHex(raw: string): [number, number, number] | null {
  const trimmed = raw.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed)) {
    return parseHexColor(trimmed);
  }
  const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i.exec(
    trimmed
  );
  if (!rgbaMatch) return null;
  return [Number(rgbaMatch[1]), Number(rgbaMatch[2]), Number(rgbaMatch[3])];
}

function compositeOver(
  fgRgba: string,
  bgRgb: [number, number, number]
): [number, number, number] {
  const rgbaMatch = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i.exec(
    fgRgba.trim()
  );
  if (!rgbaMatch) {
    return parseRgbOrHex(fgRgba) ?? bgRgb;
  }
  const alpha = Number(rgbaMatch[4]);
  return [
    Math.round(Number(rgbaMatch[1]) * alpha + bgRgb[0] * (1 - alpha)),
    Math.round(Number(rgbaMatch[2]) * alpha + bgRgb[1] * (1 - alpha)),
    Math.round(Number(rgbaMatch[3]) * alpha + bgRgb[2] * (1 - alpha)),
  ];
}

function contrastRatioRgb(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function findToForeignWordBank(lang: BaseLanguageCode): WordBankExercise {
  for (const unit of COURSES[lang].units) {
    for (const node of unit.nodes) {
      for (const ex of node.exercises) {
        if (ex.type === 'word_bank' && ex.direction === 'to_foreign' && ex.allowFreeRecall) {
          return ex;
        }
      }
    }
  }
  throw new Error(`No to_foreign WordBankExercise found for ${lang}`);
}

function findBossWordBank(lang: BaseLanguageCode): BossGauntletExercise {
  for (const unit of COURSES[lang].units) {
    for (const node of unit.nodes) {
      for (const ex of node.exercises) {
        if (ex.type === 'boss_gauntlet') {
          const wbTurn = ex.turns.find((t) => t.mode === 'word_bank' && t.allowFreeRecall);
          if (wbTurn) {
            return { ...ex, turns: [wbTurn] };
          }
          const anyWbTurn = ex.turns.find((t) => t.mode === 'word_bank');
          if (anyWbTurn) {
            return { ...ex, turns: [{ ...anyWbTurn, allowFreeRecall: true }] };
          }
          return { ...ex, turns: [{ ...ex.turns[0], mode: 'word_bank', allowFreeRecall: true }] };
        }
      }
    }
  }
  throw new Error(`No BossGauntletExercise found for ${lang}`);
}

describe('Cohort H [PT-126..PT-135]: Sprint 4 Features (Operation Celestial Summit)', () => {
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
    vi.doUnmock('../../src/curriculum');
    setViewportSize(originalInnerWidth, originalInnerHeight);
  });

  it('[PT-126] (S4-001) ProfileVaultModal + App enforce Co-Op Safe Atlas masking, suppress 7-tap/keycode/new-explorer triggers, unlock via 18+ Parent Gate, and reset lock on toggle or reopen', async () => {
    // 1. Setup Parent unlocked on 'ebonics' (lastBaseLanguage: 'fr') + disarmed, plus Auntie on 'suburban'
    vaultActions.setActiveLanguage('fr');
    const parent = vaultActions.unlockAdultMode({
      adultProfileName: 'Parent',
      initialTrack: 'ebonics',
    });
    expect(parent.adultModeActive).toBe(true);
    vaultActions.setAdultModeActive(false); // disarmed so re-entry, restore-prior-kid, & study-break toggle are all eligible

    // 2. Standalone ProfileVaultModal with coopSafeMask.active === true
    const { rerender, unmount: unmountModal } = render(
      <ProfileVaultModal onClose={vi.fn()} coopSafeMask={{ active: true, safeLanguage: 'fr' }} />
    );

    const dialog = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    expect(screen.getByTestId('profile-modal-coop-safe-mask')).toHaveTextContent(
      'Family Co-Op Safe Atlas Active'
    );
    expect(screen.getByTestId('profile-modal-unlock-parent-controls-btn')).toBeInTheDocument();

    // Explorer card for Parent masks 'ebonics' -> 'French' (safe lastBaseLanguage) & hides Adult controls
    expect(dialog.textContent ?? '').not.toContain(LANGUAGE_META.ebonics.name);
    expect(dialog.textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    expect(screen.queryByTestId('profile-modal-adult-controls')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enter After-Hours Atlas/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('restore-prior-kid-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('study-break-restore-kid-toggle')).not.toBeInTheDocument();

    // Suppress 7-tap version pill
    const versionPill = screen.getByTestId('atlas-version-easter-egg');
    for (let i = 0; i < ADULT_EASTER_EGG_TAP_COUNT + 2; i += 1) {
      fireEvent.click(versionPill);
    }
    expect(
      screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).not.toBeInTheDocument();

    // Suppress Atlas Keycode adult unlock
    fireEvent.click(screen.getByRole('button', { name: /Atlas Keycode/i }));
    fireEvent.change(screen.getByLabelText('Atlas Keycode'), {
      target: { value: ADULT_EASTER_EGG_CODES[0] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(dialog).toHaveTextContent(
      'Atlas keycodes are paused while Family Co-Op Safe Atlas is active.'
    );
    expect(
      screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).not.toBeInTheDocument();

    // Suppress New Kid Explorer secret adult code trigger
    fireEvent.click(screen.getByRole('button', { name: /\+ New Kid Explorer/i }));
    fireEvent.change(screen.getByLabelText('New explorer name'), {
      target: { value: ADULT_EASTER_EGG_CODES[0] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Explorer' }));
    expect(dialog).toHaveTextContent(
      'Special atlas codes are paused while Family Co-Op Safe Atlas is active.'
    );
    expect(
      screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).not.toBeInTheDocument();

    // Parent Gate Cancel preserves lock
    fireEvent.click(screen.getByTestId('profile-modal-unlock-parent-controls-btn'));
    const parentGate = screen.getByTestId('profile-modal-parent-gate');
    fireEvent.click(within(parentGate).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('profile-modal-parent-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-modal-adult-controls')).not.toBeInTheDocument();

    // Unlock via Parent Gate -> Confirm button reveals Adult track + Adult controls
    fireEvent.click(screen.getByTestId('profile-modal-unlock-parent-controls-btn'));
    fireEvent.click(screen.getByTestId('profile-modal-confirm-parent-btn'));
    expect(screen.queryByTestId('profile-modal-coop-safe-mask')).not.toBeInTheDocument();
    const adultControls = screen.getByTestId('profile-modal-adult-controls');
    expect(adultControls).toBeInTheDocument();
    expect(within(adultControls).getByRole('button', { name: /Enter After-Hours Atlas/i })).toBeInTheDocument();
    expect(within(adultControls).getByTestId('restore-prior-kid-btn')).toBeInTheDocument();
    expect(within(adultControls).getByTestId('study-break-restore-kid-toggle')).toBeInTheDocument();

    // Verify 7-tap works once unlocked, then toggling coopSafeMask.active false -> true resets lock & closes confirm modal
    for (let i = 0; i < ADULT_EASTER_EGG_TAP_COUNT; i += 1) {
      fireEvent.click(screen.getByTestId('atlas-version-easter-egg'));
    }
    expect(
      screen.getByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).toBeInTheDocument();

    rerender(
      <ProfileVaultModal onClose={vi.fn()} coopSafeMask={{ active: false, safeLanguage: 'fr' }} />
    );
    rerender(
      <ProfileVaultModal onClose={vi.fn()} coopSafeMask={{ active: true, safeLanguage: 'fr' }} />
    );

    expect(
      screen.queryByRole('dialog', { name: 'After-Hours Atlas 18+ Confirmation' })
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-modal-adult-controls')).not.toBeInTheDocument();
    unmountModal();
    cleanup();

    // 3. Full App integration: Quarantined Co-Op masks Explorer with adult activeLanguage & no safe base to 'es',
    // unlocks via Parent Gate, and closing + reopening modal resets lock state!
    vaultActions.setAdultModeActive(true);
    const exportPre = JSON.parse(exportVaultJson()) as {
      activeProfileId: string;
      profiles: Array<{
        id: string;
        activeLanguage: LanguageCode;
        lastBaseLanguage?: BaseLanguageCode;
        adultModeActive?: boolean;
      }>;
    };
    const parentExported = exportPre.profiles.find((p) => p.id === parent.id)!;
    // Force missing/adult lastBaseLanguage edge case to verify 'es' fallback
    delete parentExported.lastBaseLanguage;
    expect(importVaultJson(JSON.stringify(exportPre), 'replace').ok).toBe(true);

    const { unmount: unmountApp } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile \(Parent\)/i }));
    const appDialog = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    expect(within(appDialog).getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
    expect(appDialog.textContent ?? '').toContain('Spanish');
    expect(appDialog.textContent ?? '').not.toContain(LANGUAGE_META.ebonics.name);
    expect(within(appDialog).queryByTestId('profile-modal-adult-controls')).not.toBeInTheDocument();

    // Unlock Parent Controls in App modal -> reveals Adult track & controls
    fireEvent.click(within(appDialog).getByTestId('profile-modal-unlock-parent-controls-btn'));
    fireEvent.click(within(appDialog).getByTestId('profile-modal-confirm-parent-btn'));
    expect(within(appDialog).getByTestId('profile-modal-adult-controls')).toBeInTheDocument();
    expect(appDialog.textContent ?? '').toContain(LANGUAGE_META.ebonics.name);

    // Close and reopen modal -> lock state MUST reset to masked!
    fireEvent.click(within(appDialog).getByRole('button', { name: 'Close profiles modal' }));
    expect(
      screen.queryByRole('dialog', { name: 'Explorer Profiles and Save Vault' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Switch kid profile \(Parent\)/i }));
    const reopenedDialog = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    expect(within(reopenedDialog).getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
    expect(
      within(reopenedDialog).queryByTestId('profile-modal-adult-controls')
    ).not.toBeInTheDocument();
    expect(reopenedDialog.textContent ?? '').not.toContain(LANGUAGE_META.ebonics.name);
    unmountApp();
  });

  it('[PT-127] (S4-002) TopHud preserves Family Co-Op Safe Atlas label/title while exposing Safe Atlas short label & Install App aria-label, and ArcadeHub renders compact 375x667 Co-Op Page-1 structure', () => {
    setViewportSize(375, 667);

    // 1. TopHud Safe Atlas + Install App
    const { unmount: unmountHud } = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={true}
        onInstallApp={vi.fn()}
        coopSafeMask={{ active: true, safeLanguage: 'es' }}
      />
    );
    const badge = screen.getByTestId('tophud-coop-safe-atlas-badge');
    expect(badge).toHaveTextContent('Family Co-Op Safe Atlas');
    expect(badge).toHaveAttribute('title', 'Family Co-Op Safe Atlas (Spanish)');
    expect(badge).toHaveAttribute('aria-label', 'Family Co-Op Safe Atlas');
    const shortLabel = screen.getByTestId('tophud-coop-safe-short-label');
    expect(shortLabel).toHaveTextContent('Safe Atlas');
    expect(badge.contains(shortLabel)).toBe(true);

    const installBtn = screen.getByRole('button', { name: 'Install App' });
    expect(installBtn).toHaveAttribute('aria-label', 'Install App');
    expect(installBtn).toHaveTextContent('Install App');
    unmountHud();
    cleanup();

    // 2. ArcadeHub Co-Op roster + Pair Streak + Page-1 compact structure at 375x667
    vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 100,
      playerTwoId: 'kid-maya',
      playerTwoScore: 110,
      bonusGems: 4,
      xpEarned: 15,
    });
    const { unmount: unmountHub } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));

    const rosterBar = screen.getByTestId('arcade-coop-roster-bar');
    expect(rosterBar).toBeInTheDocument();
    expect(within(rosterBar).getByTestId('coop-p1-select')).toBeInTheDocument();
    expect(within(rosterBar).getByTestId('coop-p2-select')).toBeInTheDocument();
    const pairStreakBadge = within(rosterBar).getByTestId('coop-pair-streak-badge');
    expect(pairStreakBadge).toHaveTextContent('Pair Streak: 1 day');

    // Page-1 compact grid shows first 4 cabinets and their launch CTAs cleanly
    for (const ctaLabel of ['Play Sky-Catcher', 'Launch Blaster', 'Stack Gelato', 'Chart Stars']) {
      expect(screen.getByRole('button', { name: ctaLabel })).toBeInTheDocument();
    }
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous arcade page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next arcade page' })).toBeEnabled();
    unmountHub();
  });

  it('[PT-128] (S4-003 Grader) grades unspaced multi-syllable Mandarin numeric & romanized Pinyin cleanly while flagging wrong/missing tones and preserving spacing checks in other languages & Hanzi', () => {
    const exactCases: Array<{
      submitted: string;
      expected: string;
      accepted: string[];
    }> = [
      { submitted: 'ni3hao3', expected: '你好', accepted: ['Nǐ hǎo!', 'Ni hao!'] },
      { submitted: 'wan3an1', expected: '晚安', accepted: ["Wǎn'ān!", 'Wanan!'] },
      {
        submitted: "wo3de5ming2zi5jiao4Ma3te4'ao4",
        expected: '我的名字叫马特奥。',
        accepted: ['Wǒ de míngzi jiào Mǎtèào.', 'Wo de mingzi jiao Mateao.'],
      },
      { submitted: 'xi1an1', expected: '西安', accepted: ["Xī'ān"] },
      { submitted: 'xian1', expected: '先', accepted: ['xiān'] },
    ];

    for (const c of exactCases) {
      expect(convertNumericPinyin(c.submitted)).not.toBe('');
      const res = gradeAnswer({
        submitted: c.submitted,
        expected: c.expected,
        accepted: c.accepted,
        language: 'zh',
      });
      expect(res, `Expected exact match for "${c.submitted}"`).toMatchObject({
        isCorrect: true,
        exactMatch: true,
        heartPenalty: 0,
      });
      expect(res.accentCoaching).toBeUndefined();
    }

    // Wrong or missing tones -> forgiving match (isCorrect: true, exactMatch: false, heartPenalty: 0) with populated highlightedChars
    const wrongToneCases: Array<{
      submitted: string;
      expected: string;
      accepted: string[];
    }> = [
      { submitted: 'ni2hao3', expected: '你好', accepted: ['Nǐ hǎo!'] },
      { submitted: 'nihao', expected: '你好', accepted: ['Nǐ hǎo!'] },
      { submitted: 'xie5xie4', expected: '谢谢', accepted: ['Xièxie'] },
    ];

    for (const wc of wrongToneCases) {
      const res = gradeAnswer({
        submitted: wc.submitted,
        expected: wc.expected,
        accepted: wc.accepted,
        language: 'zh',
      });
      expect(res, `Expected forgiving match for "${wc.submitted}"`).toMatchObject({
        isCorrect: true,
        exactMatch: false,
        heartPenalty: 0,
      });
      expect(res.accentCoaching).toBeDefined();
      expect(res.accentCoaching!.highlightedChars.length).toBeGreaterThan(0);
    }

    // Also verify xi1an1 vs xiān and xian1 vs Xī'ān are NOT confused as exact matches
    const xianVsXiAn = gradeAnswer({
      submitted: 'xian1',
      expected: '西安',
      accepted: ["Xī'ān"],
      language: 'zh',
    });
    expect(xianVsXiAn.exactMatch).toBe(false);
    expect(xianVsXiAn.accentCoaching?.highlightedChars.length).toBeGreaterThan(0);

    // Non-'zh' languages STILL reject missing word spaces
    const spaceSensitiveCases: Array<{
      language: LanguageCode;
      submitted: string;
      expected: string;
      accepted?: string[];
    }> = [
      { language: 'es', submitted: 'buenosdias', expected: 'Buenos días' },
      { language: 'fr', submitted: 'bonjourmonsieur', expected: 'Bonjour monsieur' },
      { language: 'en', submitted: 'goodmorning', expected: 'Good morning' },
      {
        language: 'ebonics',
        submitted: 'saylessfam',
        expected: 'Say less, fam',
        accepted: ['Say less fam'],
      },
    ];
    for (const sc of spaceSensitiveCases) {
      const res = gradeAnswer({
        submitted: sc.submitted,
        expected: sc.expected,
        accepted: sc.accepted,
        language: sc.language,
      });
      expect(res.isCorrect, `${sc.language} must reject missing space "${sc.submitted}"`).toBe(false);
      expect(res.heartPenalty).toBe(1);
    }

    // Pure Hanzi mode remains intact
    expect(
      gradeAnswer({
        submitted: '你好',
        expected: '你好',
        accepted: ['Nǐ hǎo!'],
        language: 'zh',
      })
    ).toMatchObject({ isCorrect: true, exactMatch: true, heartPenalty: 0 });
    expect(
      gradeAnswer({
        submitted: '谢谢',
        expected: '你好',
        accepted: ['Nǐ hǎo!'],
        language: 'zh',
      })
    ).toMatchObject({ isCorrect: false, exactMatch: false, heartPenalty: 1 });
  });

  it('[PT-129] (S4-003 Hint Engine) resolveFreeRecallHint & toneCoaching align unspaced multi-word Mandarin Pinyin prefixes cleanly without false hasWrongSuffix', () => {
    const niHaoCases: Array<{
      typed: string;
      expectedWrongSuffix: boolean;
      expectedPrefix: number;
      expectedToneMismatch: boolean;
      expectedConverted: string;
      expectedComplete?: boolean;
    }> = [
      {
        typed: 'ni3hao3',
        expectedWrongSuffix: false,
        expectedPrefix: 2,
        expectedToneMismatch: false,
        expectedConverted: 'nǐhǎo',
        expectedComplete: true,
      },
      {
        typed: 'ni3ha',
        expectedWrongSuffix: false,
        expectedPrefix: 1,
        expectedToneMismatch: false,
        expectedConverted: 'nǐha',
      },
      {
        typed: 'ni2hao3',
        expectedWrongSuffix: false,
        expectedPrefix: 2,
        expectedToneMismatch: true,
        expectedConverted: 'níhǎo',
      },
    ];

    for (const tc of niHaoCases) {
      const plan = resolveFreeRecallHint({
        typedText: tc.typed,
        expected: '你好！',
        accepted: ['Nǐ hǎo!', 'Ni hao!'],
        language: 'zh',
        tier: 2,
      });
      expect(plan.hasWrongSuffix, `niHao case "${tc.typed}" wrongSuffix`).toBe(
        tc.expectedWrongSuffix
      );
      expect(plan.validWordPrefixCount, `niHao case "${tc.typed}" prefix`).toBe(
        tc.expectedPrefix
      );
      expect(plan.toneCoaching?.hasToneMismatch, `niHao case "${tc.typed}" toneMismatch`).toBe(
        tc.expectedToneMismatch
      );
      expect(
        plan.toneCoaching?.convertedNumericPinyin,
        `niHao case "${tc.typed}" convertedNumericPinyin`
      ).toBe(tc.expectedConverted);
      if (tc.expectedComplete !== undefined) {
        expect(plan.alreadyComplete).toBe(tc.expectedComplete);
      }
    }

    const mateoCases: Array<{
      typed: string;
      expectedPrefix: number;
      expectedConverted: string;
    }> = [
      {
        typed: 'wo3de5ming2zi5',
        expectedPrefix: 3,
        expectedConverted: 'wǒdemíngzi',
      },
      {
        typed: 'wo3de5m',
        expectedPrefix: 2,
        expectedConverted: 'wǒdem',
      },
    ];

    for (const mc of mateoCases) {
      const plan = resolveFreeRecallHint({
        typedText: mc.typed,
        expected: '我的名字叫马特奥。',
        accepted: ['Wǒ de míngzi jiào Mǎtèào.', 'Wo de mingzi jiao Mateao.'],
        language: 'zh',
        tier: 2,
      });
      expect(plan.hasWrongSuffix, `mateo case "${mc.typed}"`).toBe(false);
      expect(plan.validWordPrefixCount, `mateo case "${mc.typed}" prefix`).toBe(mc.expectedPrefix);
      expect(plan.toneCoaching?.hasToneMismatch).toBe(false);
      expect(plan.toneCoaching?.convertedNumericPinyin).toBe(mc.expectedConverted);
    }

    // Actual wrong trailing syllable still triggers hasWrongSuffix: true
    const badSuffixPlan = resolveFreeRecallHint({
      typedText: 'wo3de5xyz',
      expected: '我的名字叫马特奥。',
      accepted: ['Wǒ de míngzi jiào Mǎtèào.'],
      language: 'zh',
      tier: 2,
    });
    expect(badSuffixPlan.hasWrongSuffix).toBe(true);
  });

  it('[PT-130] (S4-004) surfaces coop-mini-offline-deck-badge & Handoff CTA warning only during P2 offline fallback, restores on Safe Español or Retry, and renders cabinet-mini-offline-deck-pill in solo ArcadeReadyCard', async () => {
    vi.resetModules();
    let jaOnline = false;
    const jaLoaderMock = vi.fn(async () => {
      if (!jaOnline) {
        throw new Error('503 Offline Japanese');
      }
      return {
        course: COURSES.ja,
        glossary: getCourseGlossary('ja'),
      };
    });
    const itLoaderMock = vi.fn(async () => {
      throw new Error('503 Offline Italian');
    });

    const mockLoaderPayload = {
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
        ja: jaLoaderMock,
        it: itLoaderMock,
      },
    };
    vi.doMock('../../src/curriculum/baseCoursesLoader', () => mockLoaderPayload);
    vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => mockLoaderPayload);

    try {
      const baseReg = await import('../../src/curriculum/baseRegistry');
      const { ArcadeHub: LazyArcadeHub } = await import('../../src/components/arcade/ArcadeHub');
      const { vaultActions: lazyVault } = await import('../../src/store/useVaultStore');

      window.localStorage.clear();
      lazyVault.resetVaultToDefaults();
      lazyVault.setActiveLanguage('es'); // kid-leo on eager 'es'
      const kaito = lazyVault.createProfile({
        name: 'Kaito',
        avatarId: 'benni_tinker',
        bannerColor: '#0EA5E9',
        activeLanguage: 'ja',
      });
      const luca = lazyVault.createProfile({
        name: 'Luca',
        avatarId: 'luca_captain',
        bannerColor: '#059669',
        activeLanguage: 'it',
      });
      lazyVault.switchProfile('kid-leo');
      expect(baseReg.isBaseTrackLoaded('ja')).toBe(false);
      expect(baseReg.isBaseTrackLoaded('it')).toBe(false);

      // 1. Solo mode on uncached offline 'ja' renders cabinet-mini-offline-deck-pill in ArcadeReadyCard
      act(() => {
        lazyVault.switchProfile(kaito.id);
      });
      const { unmount: unmountSolo } = render(
        <LazyArcadeHub initialMode="starlight_bridge" onExitToMap={vi.fn()} />
      );
      const readyPill = await screen.findByTestId('cabinet-mini-offline-deck-pill');
      expect(readyPill).toHaveTextContent('Mini Offline Deck · 8 Starter Cards');
      unmountSolo();
      cleanup();

      // 2. Co-Op Handoff: P1='es' + P2=Kaito('ja', offline) -> Retry recovery clears badge & restores CTA
      act(() => {
        lazyVault.switchProfile('kid-leo');
      });
      const { unmount } = render(<LazyArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: kaito.id } });

      await waitFor(() => {
        expect(screen.getByTestId('coop-mini-offline-deck-badge')).toHaveTextContent(
          'Mini Offline Deck (8 Starter Cards)'
        );
      });

      fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

      const handoff = await screen.findByTestId('arcade-coop-handoff');
      expect(within(handoff).getByTestId('coop-mini-offline-deck-badge')).toHaveTextContent(
        'Mini Offline Deck (8 Starter Cards)'
      );
      expect(
        within(handoff).getByRole('button', { name: "Start Kaito's Turn (Mini Offline Deck)!" })
      ).toBeInTheDocument();

      // Reconnect online + Retry Loading -> clears badge & restores exact CTA without "(Mini Offline Deck)"
      jaOnline = true;
      fireEvent.click(within(handoff).getByTestId('coop-handoff-retry-btn'));
      await waitFor(() => {
        expect(within(handoff).queryByTestId('coop-mini-offline-deck-badge')).not.toBeInTheDocument();
        expect(
          within(handoff).getByRole('button', { name: "Start Kaito's Turn!" })
        ).toBeInTheDocument();
      });
      expect(
        within(handoff).queryByRole('button', { name: /Mini Offline Deck/i })
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

      // 3. Co-Op Handoff: P2=Luca('it', offline) -> Use Safe Español Deck clears badge & restores exact CTA
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: luca.id } });
      await waitFor(() => {
        expect(screen.getByTestId('coop-mini-offline-deck-badge')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

      const lucaHandoff = await screen.findByTestId('arcade-coop-handoff');
      expect(within(lucaHandoff).getByTestId('coop-mini-offline-deck-badge')).toHaveTextContent(
        'Mini Offline Deck (8 Starter Cards)'
      );
      expect(
        within(lucaHandoff).getByRole('button', { name: "Start Luca's Turn (Mini Offline Deck)!" })
      ).toBeInTheDocument();

      fireEvent.click(within(lucaHandoff).getByTestId('coop-handoff-fallback-es-btn'));
      await waitFor(() => {
        expect(
          within(lucaHandoff).queryByTestId('coop-mini-offline-deck-badge')
        ).not.toBeInTheDocument();
        expect(
          within(lucaHandoff).getByRole('button', { name: "Start Luca's Turn!" })
        ).toBeInTheDocument();
      });
      unmount();
    } finally {
      vi.doUnmock('../../src/curriculum/baseCoursesLoader');
      vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
      vi.resetModules();
    }
  });

  it('[PT-131] (S4-005) FreeRecallHintBar tone coaching uses borderRadius: 12 and Tap-to-Apply replaces numeric Pinyin across WordBankView & BossGauntletView, disables, and preserves focus + end caret', () => {
    setViewportSize(375, 667);

    // 1. FreeRecallHintBar borderRadius === 12px (not 999)
    const zhPlan = resolveFreeRecallHint({
      typedText: 'ni2',
      expected: '你好',
      accepted: ['Nǐ hǎo!'],
      language: 'zh',
      tier: 2,
    });
    const { unmount: unmountHintBar } = render(
      <FreeRecallHintBar
        plan={zhPlan}
        hintTier={2}
        ghostFaded={false}
        isAnimating={false}
        answerDir="ltr"
        compact={true}
      />
    );
    const toneBox = screen.getByTestId('free-recall-tone-coaching');
    expect(toneBox.style.borderRadius).toBe('12px');
    unmountHintBar();
    cleanup();

    // 2. WordBankView Tap-to-Apply across "ni3 hao3", "ni3hao3", "wan3an1"
    const zhWb = findToForeignWordBank('zh');
    const zhWbCustom: WordBankExercise = {
      ...zhWb,
      expectedSentence: '你好',
      acceptedSentences: ['你好', 'Nǐ hǎo!', "Wǎn'ān!"],
    };
    const { unmount: unmountWb } = render(
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
    const wbInput = screen.getByLabelText('Type your translation') as HTMLInputElement;

    for (const sample of [
      { raw: 'ni3 hao3', expected: 'nǐ hǎo' },
      { raw: 'ni3hao3', expected: 'nǐhǎo' },
      { raw: 'wan3an1', expected: 'wǎnān' },
    ]) {
      fireEvent.change(wbInput, { target: { value: sample.raw } });
      const preview = screen.getByTestId('pinyin-tone-number-preview');
      expect(preview).toHaveTextContent(`Pinyin tones: ${sample.expected}`);
      const applyBtn = within(preview).getByTestId('pinyin-preview-apply-btn') as HTMLButtonElement;
      expect(applyBtn).toHaveTextContent('Tap to apply');
      expect(applyBtn.disabled).toBe(false);

      fireEvent.click(applyBtn);
      expect(wbInput.value).toBe(sample.expected);
      expect(document.activeElement).toBe(wbInput);
      expect(wbInput.selectionStart).toBe(sample.expected.length);
      expect(wbInput.selectionEnd).toBe(sample.expected.length);
      expect(screen.queryByTestId('pinyin-tone-number-preview')).not.toBeInTheDocument();
    }
    unmountWb();
    cleanup();

    // Locked WordBankView disables pinyin-preview-apply-btn while numeric Pinyin preview is visible
    const { unmount: unmountWbLocked } = render(
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
    fireEvent.change(screen.getByLabelText('Type your translation'), { target: { value: 'ni3hao3' } });
    expect(screen.getByTestId('pinyin-preview-apply-btn')).toBeEnabled();
    unmountWbLocked();
    cleanup();
    const { unmount: unmountStripDisabled } = render(
      <FreeRecallScriptStrip
        language="zh"
        direction="to_foreign"
        typedText="ni3hao3"
        compact={true}
        disabled={true}
        drawerOpen={false}
        onOpenChange={vi.fn()}
        onInsertChar={vi.fn()}
        onApplyPinyinPreview={vi.fn()}
      />
    );
    expect(screen.getByTestId('pinyin-preview-apply-btn')).toBeDisabled();
    unmountStripDisabled();
    cleanup();

    // 3. BossGauntletView Tap-to-Apply across "ni3 hao3", "ni3hao3", "wan3an1"
    const zhBoss = findBossWordBank('zh');
    const zhBossCustom: BossGauntletExercise = {
      ...zhBoss,
      turns: [
        {
          ...zhBoss.turns[0],
          mode: 'word_bank',
          allowFreeRecall: true,
          expectedAnswer: '晚安',
          acceptedAnswers: ['晚安', "Wǎn'ān!", 'Nǐ hǎo!'],
        },
      ],
    };
    const { unmount: unmountBoss } = render(
      <BossGauntletView
        exercise={zhBossCustom}
        language="zh"
        compact={true}
        onTurtlePlay={vi.fn()}
        onTurnResult={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const bossInput = screen.getByLabelText('Type your boss reply') as HTMLInputElement;

    for (const sample of [
      { raw: 'ni3 hao3', expected: 'nǐ hǎo' },
      { raw: 'ni3hao3', expected: 'nǐhǎo' },
      { raw: 'wan3an1', expected: 'wǎnān' },
    ]) {
      fireEvent.change(bossInput, { target: { value: sample.raw } });
      const preview = screen.getByTestId('pinyin-tone-number-preview');
      const applyBtn = within(preview).getByTestId('pinyin-preview-apply-btn') as HTMLButtonElement;
      expect(applyBtn.disabled).toBe(false);

      fireEvent.click(applyBtn);
      expect(bossInput.value).toBe(sample.expected);
      expect(document.activeElement).toBe(bossInput);
      expect(bossInput.selectionStart).toBe(sample.expected.length);
      expect(bossInput.selectionEnd).toBe(sample.expected.length);
      expect(screen.queryByTestId('pinyin-tone-number-preview')).not.toBeInTheDocument();
    }
    unmountBoss();
  });

  it('[PT-132] (S4-006) renders unlocked profile-modal-adult-controls inside .console-scroll-pane below Offline Atlas Pack while preserving all Sprint-3 Kid restore flows', () => {
    setViewportSize(375, 667);

    vaultActions.setActiveLanguage('fr');
    const parent = vaultActions.unlockAdultMode({
      adultProfileName: 'Parent',
      initialTrack: 'ebonics',
    });
    vaultActions.setAdultModeActive(false);

    const onClose = vi.fn();
    const { unmount } = render(<ProfileVaultModal onClose={onClose} />);
    const modal = screen.getByRole('dialog', { name: 'Explorer Profiles and Save Vault' });
    const scrollPane = modal.querySelector('.console-scroll-pane');
    expect(scrollPane).not.toBeNull();

    const offlinePackSection = screen.getByTestId('offline-pack-section');
    const adultControls = screen.getByTestId('profile-modal-adult-controls');
    expect(scrollPane!.contains(offlinePackSection)).toBe(true);
    expect(scrollPane!.contains(adultControls)).toBe(true);

    // Adult controls appear strictly below Offline Atlas Pack in DOM order
    const positionMask = offlinePackSection.compareDocumentPosition(adultControls);
    expect(positionMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Preserves all Sprint-3 controls & testids
    expect(within(adultControls).getByRole('button', { name: 'Enter After-Hours Atlas (18+)' })).toBeInTheDocument();
    const restoreKidBtn = within(adultControls).getByTestId('restore-prior-kid-btn');
    expect(restoreKidBtn).toHaveTextContent('Switch back to Leo');
    const studyBreakToggle = within(adultControls).getByTestId(
      'study-break-restore-kid-toggle'
    ) as HTMLInputElement;
    expect(studyBreakToggle.checked).toBe(false);

    // Toggle Study Break restore + test Re-entry -> Adult active
    fireEvent.click(studyBreakToggle);
    expect(loadVaultFromStorage().restoreKidProfileOnStudyBreak).toBe(true);
    fireEvent.click(within(adultControls).getByRole('button', { name: 'Enter After-Hours Atlas (18+)' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      loadVaultFromStorage().profiles.find((p) => p.id === parent.id)?.adultModeActive
    ).toBe(true);
    unmount();
    cleanup();

    // Disarm (keeping restore-on-study-break off) and test 1-tap restore back to Leo
    vaultActions.setRestoreKidProfileOnStudyBreak(false);
    vaultActions.setAdultModeActive(false);
    const onClose2 = vi.fn();
    const { unmount: unmount2 } = render(<ProfileVaultModal onClose={onClose2} />);
    fireEvent.click(screen.getByTestId('restore-prior-kid-btn'));
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
    unmount2();
  });

  it('[PT-133] verifies WCAG AA >= 4.5:1 contrast across ALL 15 light/dark palettes for Sprint 4 UI badges & buttons and clean rendering', () => {
    const css = readFileSync(resolve(ROOT_DIR, 'src/styles/theme.css'), 'utf8');
    const themeSelectors = [
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
    expect(themeSelectors).toHaveLength(15);

    const extractBlock = (selector: string): string => {
      const idx = css.indexOf(selector);
      expect(idx, `Missing CSS block ${selector}`).toBeGreaterThanOrEqual(0);
      const braceStart = css.indexOf('{', idx);
      const braceEnd = css.indexOf('}', braceStart);
      return css.slice(braceStart, braceEnd + 1);
    };
    const readVar = (block: string, fallback: string, varName: string): string => {
      const m = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(block);
      if (m) return m[1].trim();
      const mf = new RegExp(`${varName}\\s*:\\s*([^;]+);`).exec(fallback);
      return mf ? mf[1].trim() : '';
    };

    const rootBlock = extractBlock(':root');
    const applyBtnEnabledBg = parseHexColor('#047857');
    const applyBtnEnabledFg = parseHexColor('#ffffff');
    expect(contrastRatioRgb(applyBtnEnabledFg, applyBtnEnabledBg)).toBeGreaterThanOrEqual(4.5);

    for (const sel of themeSelectors) {
      const block = extractBlock(sel);
      const modalRgb = parseRgbOrHex(readVar(block, rootBlock, '--modal-bg')) ?? [255, 255, 255];
      const cardRgb = compositeOver(readVar(block, rootBlock, '--card-bg'), modalRgb);
      const cardSoftRgb = compositeOver(readVar(block, rootBlock, '--card-soft-bg'), cardRgb);
      const tileRgb = parseRgbOrHex(readVar(block, rootBlock, '--tile-bg'))!;
      const textMain = parseRgbOrHex(readVar(block, rootBlock, '--text-main'))!;
      const textMuted = parseRgbOrHex(readVar(block, rootBlock, '--text-muted'))!;

      const emeraldBg = compositeOver(readVar(block, rootBlock, '--tint-emerald-bg'), cardSoftRgb);
      const emeraldInk = parseRgbOrHex(readVar(block, rootBlock, '--tint-emerald-ink'))!;
      const amberBg = compositeOver(readVar(block, rootBlock, '--tint-amber-bg'), cardRgb);
      const amberInk = parseRgbOrHex(readVar(block, rootBlock, '--tint-amber-ink'))!;

      // 1. profile-modal-coop-safe-mask: --tint-emerald-ink on --tint-emerald-bg
      expect(
        contrastRatioRgb(emeraldInk, emeraldBg),
        `${sel} profile-modal-coop-safe-mask`
      ).toBeGreaterThanOrEqual(4.5);

      // 2. profile-modal-unlock-parent-controls-btn (.tactile-btn-soft): --text-main on --card-soft-bg
      expect(
        contrastRatioRgb(textMain, cardSoftRgb),
        `${sel} profile-modal-unlock-parent-controls-btn`
      ).toBeGreaterThanOrEqual(4.5);

      // 3. coop-mini-offline-deck-badge: --tint-amber-ink on --tile-bg
      expect(
        contrastRatioRgb(amberInk, tileRgb),
        `${sel} coop-mini-offline-deck-badge`
      ).toBeGreaterThanOrEqual(4.5);

      // 4. cabinet-mini-offline-deck-pill: --tint-amber-ink on --tint-amber-bg
      expect(
        contrastRatioRgb(amberInk, amberBg),
        `${sel} cabinet-mini-offline-deck-pill`
      ).toBeGreaterThanOrEqual(4.5);

      // 5. pinyin-preview-apply-btn disabled state: --text-muted on --card-soft-bg
      expect(
        contrastRatioRgb(textMuted, cardSoftRgb),
        `${sel} pinyin-preview-apply-btn disabled`
      ).toBeGreaterThanOrEqual(4.5);
    }

    // Render Sprint 4 surfaces across dark/light themes cleanly with zero console errors
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderSpecs: ReadonlyArray<{ theme: 'default' | CosmeticId; w: number; h: number }> = [
      { theme: 'default', w: 1440, h: 900 },
      { theme: 'theme_cosmic_galaxy', w: 768, h: 1024 },
      { theme: 'theme_emerald_rainforest', w: 375, h: 667 },
      { theme: 'theme_laureate_imperial', w: 375, h: 667 },
    ];

    for (const spec of renderSpecs) {
      setViewportSize(spec.w, spec.h);
      vaultActions.resetVaultToDefaults();
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: 'es-pt133-gems',
        stars: 3,
        xpEarned: 10,
        gemsEarned: 5000,
        unlockedVocabIds: [],
        maxCombo: 0,
        isChest: true,
      });
      if (spec.theme !== 'default') {
        expect(vaultActions.buyAndEquipCosmetic(spec.theme)).toBe(true);
      }

      const { unmount } = render(
        <div className="app-root" data-theme={spec.theme}>
          <ProfileVaultModal onClose={vi.fn()} coopSafeMask={{ active: true, safeLanguage: 'es' }} />
          <FreeRecallScriptStrip
            language="zh"
            direction="to_foreign"
            typedText="ni3hao3"
            compact={spec.w <= 640}
            disabled={false}
            drawerOpen={false}
            onOpenChange={vi.fn()}
            onInsertChar={vi.fn()}
            onApplyPinyinPreview={vi.fn()}
          />
        </div>
      );
      expect(screen.getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
      expect(screen.getByTestId('profile-modal-unlock-parent-controls-btn')).toBeInTheDocument();
      expect(screen.getByTestId('pinyin-preview-apply-btn')).toBeInTheDocument();
      unmount();
      cleanup();
    }
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('[PT-134] survives multi-step Sprint 4 chaos scenario (Quarantined Co-Op -> Parent Gate -> Offline Mini Deck -> Safe Español recovery -> Mandarin unspaced Pinyin + Tap-to-Apply -> vault export/import)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      setViewportSize(375, 667);

      // Step 1: Quarantined Co-Op + Modal Parent Gate in App
      vaultActions.setActiveLanguage('fr');
      const parent = vaultActions.unlockAdultMode({
        adultProfileName: 'Parent',
        initialTrack: 'ebonics',
      });
      expect(parent.adultModeActive).toBe(true);

      const { unmount: unmountApp } = render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      await waitFor(() => {
        expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Switch kid profile \(Parent\)/i }));
      expect(screen.getByTestId('profile-modal-coop-safe-mask')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('profile-modal-unlock-parent-controls-btn'));
      fireEvent.click(screen.getByTestId('profile-modal-confirm-parent-btn'));
      expect(screen.getByTestId('profile-modal-adult-controls')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Close profiles modal' }));
      unmountApp();
      cleanup();

      // Step 2: Offline Handoff Mini Deck -> Safe Español recovery
      vi.resetModules();
      const itOfflineMock = vi.fn(async () => {
        throw new Error('503 Offline Italian');
      });
      const mockLoaderPayload = {
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
          it: itOfflineMock,
        },
      };
      vi.doMock('../../src/curriculum/baseCoursesLoader', () => mockLoaderPayload);
      vi.doMock('../../src/curriculum/baseCoursesLoader.test', () => mockLoaderPayload);

      const { ArcadeHub: LazyArcadeHub } = await import('../../src/components/arcade/ArcadeHub');
      const { vaultActions: lazyVault } = await import('../../src/store/useVaultStore');
      window.localStorage.clear();
      lazyVault.resetVaultToDefaults();
      lazyVault.setActiveLanguage('es');
      const luca = lazyVault.createProfile({
        name: 'Luca',
        avatarId: 'luca_captain',
        bannerColor: '#059669',
        activeLanguage: 'it',
      });
      lazyVault.switchProfile('kid-leo');

      const { unmount: unmountArcade } = render(
        <LazyArcadeHub initialMode="hub" onExitToMap={vi.fn()} />
      );
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: luca.id } });
      await waitFor(() => {
        expect(screen.getByTestId('coop-mini-offline-deck-badge')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      const handoff = await screen.findByTestId('arcade-coop-handoff');
      expect(within(handoff).getByTestId('coop-mini-offline-deck-badge')).toBeInTheDocument();
      expect(
        within(handoff).getByRole('button', { name: "Start Luca's Turn (Mini Offline Deck)!" })
      ).toBeInTheDocument();

      fireEvent.click(within(handoff).getByTestId('coop-handoff-fallback-es-btn'));
      await waitFor(() => {
        expect(
          within(handoff).queryByTestId('coop-mini-offline-deck-badge')
        ).not.toBeInTheDocument();
        expect(
          within(handoff).getByRole('button', { name: "Start Luca's Turn!" })
        ).toBeInTheDocument();
      });
      unmountArcade();
      cleanup();
      vi.doUnmock('../../src/curriculum/baseCoursesLoader');
      vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
      vi.resetModules();

      // Step 3: Mandarin Free-Recall unspaced Pinyin + Tap-to-Apply + Grade
      const zhWb = findToForeignWordBank('zh');
      const zhWbCustom: WordBankExercise = {
        ...zhWb,
        expectedSentence: '我的名字叫马特奥。',
        acceptedSentences: ['我的名字叫马特奥。', 'Wǒ de míngzi jiào Mǎtèào.'],
      };
      const { unmount: unmountZh } = render(
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
      fireEvent.change(input, { target: { value: "wo3de5ming2zi5jiao4Ma3te4'ao4" } });
      fireEvent.click(screen.getByTestId('pinyin-preview-apply-btn'));
      expect(input.value).toBe("wǒdemíngzijiàoMǎtè'ào");
      const graded = gradeAnswer({
        submitted: input.value,
        expected: zhWbCustom.expectedSentence,
        accepted: zhWbCustom.acceptedSentences,
        language: 'zh',
      });
      expect(graded).toMatchObject({ isCorrect: true, exactMatch: true, heartPenalty: 0 });
      unmountZh();
      cleanup();

      // Step 4: .wanderling-save.json export/import roundtrip
      vaultActions.resetVaultToDefaults();
      const chaosKid = vaultActions.createProfile({
        name: 'Celestial',
        avatarId: 'star_compass',
        bannerColor: '#2563EB',
        activeLanguage: 'zh',
      });
      vaultActions.completeMapNode({
        language: 'zh',
        nodeId: 'zh-u1-n1',
        stars: 3,
        xpEarned: 65,
        gemsEarned: 18,
        unlockedVocabIds: ['zh-u1-c1'],
        maxCombo: 4,
      });
      const exported = exportVaultJson();
      vaultActions.resetVaultToDefaults();
      expect(loadVaultFromStorage().profiles.some((p) => p.id === chaosKid.id)).toBe(false);
      expect(importVaultJson(exported, 'replace').ok).toBe(true);
      const restored = loadVaultFromStorage().profiles.find((p) => p.id === chaosKid.id);
      expect(restored?.totalXp).toBe(65);
      expect(restored?.activeLanguage).toBe('zh');
      expect(getSpeechRuntimeState().isSpeaking).toBe(false);
      expect(unhandled).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('[PT-135] enforces subpath ./ build, <= 500 KiB offline chunks, wanderling-cache-v8, and zero Unicode country flag emojis across Sprint 4 files', () => {
    const viteCfg = readFileSync(resolve(ROOT_DIR, 'vite.config.ts'), 'utf8');
    expect(viteCfg).toContain("base: './'");

    ensureBuiltDist();
    const distHtml = readFileSync(resolve(DIST_DIR, 'index.html'), 'utf8');
    expect(distHtml).toMatch(/(src|href)="\.\/assets\//);
    expect(distHtml).not.toMatch(/(src|href)="\/assets\//);

    const assetsDir = resolve(DIST_DIR, 'assets');
    const oversized: string[] = [];
    for (const file of readdirSync(assetsDir)) {
      if (!/\.(js|mjs)$/i.test(file)) continue;
      const size = statSync(join(assetsDir, file)).size;
      if (size > MAX_JS_CHUNK_BYTES) {
        oversized.push(`${file} (${(size / 1024).toFixed(1)} KiB)`);
      }
    }
    expect(oversized, `Oversized JS chunks: ${oversized.join(', ')}`).toEqual([]);

    const manifest = JSON.parse(
      readFileSync(resolve(DIST_DIR, 'sw-precache-manifest.json'), 'utf8')
    ) as { cacheVersion: string; assets: string[] };
    expect(manifest.cacheVersion).toBe('wanderling-cache-v8');
    expect(manifest.assets.length).toBeGreaterThan(10);

    const swSrc = readFileSync(resolve(ROOT_DIR, 'public/sw.js'), 'utf8');
    expect(swSrc).toContain("const CACHE_VERSION = 'wanderling-cache-v8'");

    const filesToScan = [
      ...walkFilesRecursive(resolve(ROOT_DIR, 'src')),
      ...walkFilesRecursive(resolve(ROOT_DIR, 'public')),
      ...walkFilesRecursive(resolve(ROOT_DIR, 'tests')),
      ...walkFilesRecursive(resolve(ROOT_DIR, 'plans')),
      resolve(ROOT_DIR, 'README.md'),
    ];
    const flagHits: string[] = [];
    for (const filePath of filesToScan) {
      if (!existsSync(filePath)) continue;
      if (UNICODE_FLAG_RE.test(readFileSync(filePath, 'utf8'))) {
        flagHits.push(relative(ROOT_DIR, filePath));
      }
    }
    expect(flagHits, `Unicode flag emojis found in: ${flagHits.join(', ')}`).toEqual([]);
  });
});
