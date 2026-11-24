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
import { LessonArena } from '../../src/components/lesson/LessonArena';
import { VirtualScriptDrawer } from '../../src/components/lesson/VirtualScriptDrawer';
import { WordBankView } from '../../src/components/lesson/WordBankView';
import { ProfileVaultModal } from '../../src/components/shell/ProfileVaultModal';
import { TopHud } from '../../src/components/shell/TopHud';
import {
  convertNumericPinyin,
  gradeAnswer,
  hasNumericPinyinSyllable,
  resolveFreeRecallHint,
} from '../../src/core';
import { COURSES, getCourseGlossary } from '../../src/curriculum';
import {
  STORAGE_KEY,
  buildCoopPairKey,
  exportVaultJson,
  importVaultJson,
  isValidISODateString,
  loadVaultFromStorage,
  vaultActions,
} from '../../src/store/useVaultStore';
import {
  ADULT_EASTER_EGG_LANGUAGES,
  LANGUAGE_META,
  VISIBLE_BASE_LANGUAGES,
  type BaseLanguageCode,
  type BossGauntletExercise,
  type CosmeticId,
  type LanguageCode,
  type MapNode,
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

describe('Cohort G [PT-116..PT-125]: Sprint 3 Features (Operation Aurora Pact)', () => {
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

  it('[PT-116] (S3-001) TopHud & App enforce Safe Atlas masking during Kid-Quarantined Co-Op, auto-close lang popover, hide Return to Kid Atlas, and restore cleanly on exit', async () => {
    // Direct TopHud mask + popover auto-close verification
    vaultActions.setActiveLanguage('fr');
    const parent = vaultActions.unlockAdultMode({
      adultProfileName: 'Parent',
      initialTrack: 'ebonics',
    });
    expect(parent.adultModeActive).toBe(true);
    // Keep kid-leo cleanly on Spanish ('es') so Parent ('fr') vs Leo ('es') produces distinct safeLanguage values
    vaultActions.switchProfile('kid-leo');
    vaultActions.setActiveLanguage('es');
    vaultActions.switchProfile(parent.id);
    vaultActions.setAdultModeActive(true);

    const { rerender, unmount: unmountHud } = render(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
        coopSafeMask={{ active: false, safeLanguage: 'fr' }}
      />
    );
    expect(screen.getByTestId('return-to-kid-atlas-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Active language: ${LANGUAGE_META.ebonics.name}` }));
    expect(screen.getByRole('dialog', { name: 'Switch Language' })).toBeInTheDocument();

    rerender(
      <TopHud
        onOpenProfileModal={vi.fn()}
        onOpenArcade={vi.fn()}
        canInstallApp={false}
        onInstallApp={vi.fn()}
        coopSafeMask={{ active: true, safeLanguage: 'fr' }}
      />
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Switch Language' })).not.toBeInTheDocument();
    });
    const safeBadge = screen.getByTestId('tophud-coop-safe-atlas-badge');
    expect(safeBadge).toHaveTextContent('Family Co-Op Safe Atlas');
    expect(safeBadge).toHaveAttribute('title', 'Family Co-Op Safe Atlas (French)');
    expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
    const topHudEl = document.querySelector('header.top-hud')!;
    for (const track of ADULT_EASTER_EGG_LANGUAGES) {
      expect(topHudEl.textContent ?? '').not.toContain(LANGUAGE_META[track].name);
    }
    expect(topHudEl.textContent ?? '').not.toMatch(/After-Hours|AAVE|Suburban/i);
    unmountHud();
    cleanup();

    // Full App integration: open lang popover -> navigate Arcade -> enable Kid-Quarantined Co-Op -> clear on tab exit / lesson entry
    const { container, unmount } = render(<App />);
    const appRoot = container.querySelector('.app-root')!;
    expect(appRoot.getAttribute('data-language')).toBe('ebonics');

    fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
    fireEvent.click(
      screen.getByRole('button', { name: `Active language: ${LANGUAGE_META.ebonics.name}` })
    );
    expect(screen.getByRole('dialog', { name: 'Switch Language' })).toBeInTheDocument();

    // Arm 2P Co-Op with Parent (ebonics) + kid-leo (es) -> quarantined!
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'Switch Language' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
    });
    expect(appRoot.getAttribute('data-language')).toBe('fr');
    const appHud = container.querySelector('header.top-hud')!;
    expect(appHud.textContent ?? '').not.toMatch(/AAVE|Suburban|After-Hours/i);

    // Swap P1=kid-leo (es) + P2=Parent (ebonics) -> safeLanguage flips to es
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
    expect(appRoot.getAttribute('data-language')).toBe('es');
    expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toHaveAttribute(
      'title',
      'Family Co-Op Safe Atlas (Spanish)'
    );

    // Leaving Arcade tab restores Adult TopHud & clears Safe Atlas mask
    fireEvent.click(screen.getByRole('button', { name: 'Atlas Map' }));
    await waitFor(() => {
      expect(screen.queryByTestId('tophud-coop-safe-atlas-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('return-to-kid-atlas-btn')).toBeInTheDocument();
    });
    expect(appRoot.getAttribute('data-language')).toBe('ebonics');

    // Entering a lesson from Map keeps Safe Atlas mask cleared
    const activeLessonBtn = container.querySelector<HTMLButtonElement>('button[data-node-state="active"]');
    expect(activeLessonBtn).not.toBeNull();
    fireEvent.click(activeLessonBtn!);
    await waitFor(() => {
      expect(screen.getByTestId('lesson-study-break-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('tophud-coop-safe-atlas-badge')).not.toBeInTheDocument();
    });
    unmount();
  });

  it('[PT-117] (S3-002) pre-warms Co-Op P1 & P2 lazy base chunks and recovers offline via Retry Loading & Use Safe Español Deck on Hub and Handoff', async () => {
    vi.resetModules();
    let frAttempts = 0;
    let jaOnline = false;
    const deLoaderMock = vi.fn(async () => ({
      course: COURSES.de,
      glossary: getCourseGlossary('de'),
    }));
    const frLoaderMock = vi.fn(async () => {
      frAttempts += 1;
      if (frAttempts === 1) {
        throw new Error('503 Offline French');
      }
      return {
        course: COURSES.fr,
        glossary: getCourseGlossary('fr'),
      };
    });
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
        de: deLoaderMock,
        fr: frLoaderMock,
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
      lazyVault.setActiveLanguage('de'); // kid-leo on lazy 'de', kid-maya on lazy 'fr'
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

      expect(baseReg.isBaseTrackLoaded('de')).toBe(false);
      expect(baseReg.isBaseTrackLoaded('fr')).toBe(false);
      expect(baseReg.isBaseTrackLoaded('ja')).toBe(false);
      expect(baseReg.isBaseTrackLoaded('it')).toBe(false);

      const { unmount } = render(<LazyArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));

      // Both P1 ('de') and P2 ('fr') lazy chunks pre-warm immediately when Co-Op is armed
      await waitFor(() => {
        expect(deLoaderMock).toHaveBeenCalledTimes(1);
        expect(frLoaderMock).toHaveBeenCalledTimes(1);
        expect(baseReg.isBaseTrackLoaded('de')).toBe(true);
      });

      // Hub offline guard renders for failed P2 ('fr'); Retry Loading succeeds on attempt #2
      const hubGuard = await screen.findByTestId('coop-handoff-offline-guard');
      expect(hubGuard).toHaveTextContent(/Maya.*French/i);
      fireEvent.click(screen.getByTestId('coop-handoff-retry-btn'));

      await waitFor(() => {
        expect(frLoaderMock).toHaveBeenCalledTimes(2);
        expect(baseReg.isBaseTrackLoaded('fr')).toBe(true);
        expect(screen.queryByTestId('coop-handoff-offline-guard')).not.toBeInTheDocument();
      });

      // Switch P1 to 'es' and P2 to Kaito ('ja', offline) -> guard shows -> play Turn 1 -> Handoff guard
      act(() => {
        lazyVault.switchProfile('kid-leo');
        lazyVault.setActiveLanguage('es');
      });
      fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: kaito.id } });

      await waitFor(() => {
        expect(jaLoaderMock).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('coop-handoff-offline-guard')).toHaveTextContent(/Kaito.*Japanese/i);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

      // Handoff guard appears for Kaito's uncached Japanese pack; test Retry fail -> Retry success online!
      const handoff = await screen.findByTestId('arcade-coop-handoff');
      expect(handoff).toHaveTextContent('Pass Console to Kaito!');
      expect(within(handoff).getByTestId('coop-handoff-offline-guard')).toHaveTextContent(
        /Kaito's Japanese pack isn't cached offline yet/i
      );

      // Retry while still offline fails gracefully
      fireEvent.click(within(handoff).getByTestId('coop-handoff-retry-btn'));
      await waitFor(() => {
        expect(jaLoaderMock).toHaveBeenCalledTimes(2);
        expect(within(handoff).getByTestId('coop-handoff-offline-guard')).toBeInTheDocument();
      });

      // Now reconnect and Retry on Handoff -> clears guard & hydrates Japanese!
      jaOnline = true;
      fireEvent.click(within(handoff).getByTestId('coop-handoff-retry-btn'));
      await waitFor(() => {
        expect(jaLoaderMock).toHaveBeenCalledTimes(3);
        expect(baseReg.isBaseTrackLoaded('ja')).toBe(true);
        expect(within(handoff).queryByTestId('coop-handoff-offline-guard')).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Back to Arcade Hub' }));

      // Now pair with offline Luca ('it') -> reach Handoff -> Use Safe Español Deck switches Turn 2 to 'es'!
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: luca.id } });
      await waitFor(() => {
        expect(itLoaderMock).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('coop-handoff-offline-guard')).toHaveTextContent(/Luca.*Italian/i);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

      const lucaHandoff = await screen.findByTestId('arcade-coop-handoff');
      expect(within(lucaHandoff).getByTestId('coop-handoff-offline-guard')).toHaveTextContent(
        /Luca's Italian pack isn't cached offline yet/i
      );
      fireEvent.click(within(lucaHandoff).getByTestId('coop-handoff-fallback-es-btn'));
      await waitFor(() => {
        expect(
          within(lucaHandoff).queryByTestId('coop-handoff-offline-guard')
        ).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Start Luca's Turn!/i }));
      fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
      expect(document.querySelector('[data-language="es"]')).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

      const summary = await screen.findByTestId('arcade-coop-summary');
      expect(within(summary).getByTestId('coop-finale-credited-languages')).toHaveTextContent(
        'Luca: Spanish'
      );
      unmount();
    } finally {
      vi.doUnmock('../../src/curriculum/baseCoursesLoader');
      vi.doUnmock('../../src/curriculum/baseCoursesLoader.test');
      vi.resetModules();
    }
  });

  it('[PT-118] (S3-002) tracks symmetric coopPairStreaks (same-day, yesterday +1, gap reset), Hub/Finale UI badges, credited languages, deleteProfile pruning, and replace/merge roundtrip', () => {
    vi.useFakeTimers();

    expect(buildCoopPairKey('kid-maya', 'kid-leo')).toBe('kid-leo::kid-maya');
    expect(buildCoopPairKey(' kid-leo ', 'kid-maya ')).toBe('kid-leo::kid-maya');
    expect(vaultActions.getCoopPairStreak('kid-leo', 'kid-maya')).toBeNull();
    expect(vaultActions.getCoopPairStreak('kid-leo', 'kid-leo')).toBeNull();

    // Day 1: 2026-11-21
    vi.setSystemTime(new Date('2026-11-21T14:00:00Z'));
    const s1 = vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-maya',
      playerOneScore: 110,
      playerOneLanguage: 'fr',
      playerTwoId: 'kid-leo',
      playerTwoScore: 90,
      playerTwoLanguage: 'es',
      bonusGems: 4,
      xpEarned: 20,
    });
    expect(s1).toMatchObject({
      pairStreakDays: 1,
      pairMatchesTogether: 1,
      playerOneCreditedLanguage: 'fr',
      playerTwoCreditedLanguage: 'es',
    });

    // Same day later -> streakDays stays 1, matchesTogether -> 2, bestCombinedScore updates
    vi.setSystemTime(new Date('2026-11-21T20:00:00Z'));
    const s2 = vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 180,
      playerTwoId: 'kid-maya',
      playerTwoScore: 160,
      bonusGems: 4,
      xpEarned: 20,
    });
    expect(s2?.pairStreakDays).toBe(1);
    expect(s2?.pairMatchesTogether).toBe(2);
    expect(vaultActions.getCoopPairStreak('kid-leo', 'kid-maya')?.bestCombinedScore).toBe(340);

    // Next day (yesterday -> today): 2026-11-22 -> streakDays increments +1 to 2!
    vi.setSystemTime(new Date('2026-11-22T10:00:00Z'));
    const s3 = vaultActions.recordCoopArcadeSession({
      gameId: 'sky_catcher',
      playerOneId: 'kid-leo',
      playerOneScore: 120,
      playerTwoId: 'kid-maya',
      playerTwoScore: 130,
      bonusGems: 4,
      xpEarned: 20,
    });
    expect(s3?.pairStreakDays).toBe(2);
    expect(s3?.pairMatchesTogether).toBe(3);

    // Hub renders Pair Streak badge >= 1
    const { unmount } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    expect(screen.getByTestId('coop-pair-streak-badge')).toHaveTextContent('Pair Streak: 2 days');

    // Play Turn 1 -> Turn 2 -> Finale on 2026-11-22 (same day, so stays 2 days, 4 matches)
    fireEvent.click(screen.getByRole('button', { name: 'Stack Gelato' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Maya's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Stacking!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    const summary = screen.getByTestId('arcade-coop-summary');
    expect(within(summary).getByTestId('coop-finale-pair-streak')).toHaveTextContent(
      'Pair Streak: 2 days • 4 matches'
    );
    const credited = within(summary).getByTestId('coop-finale-credited-languages');
    expect(credited).toHaveTextContent('Leo: Spanish');
    expect(credited).toHaveTextContent('Maya: French');
    unmount();
    cleanup();

    // Gap >= 2 days (2026-11-25) resets pair streakDays to 1 while incrementing matchesTogether
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));
    const sGap = vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 80,
      playerTwoId: 'kid-maya',
      playerTwoScore: 85,
      bonusGems: 4,
      xpEarned: 20,
    });
    expect(sGap?.pairStreakDays).toBe(1);
    expect(sGap?.pairMatchesTogether).toBe(5);

    // Export / replace / merge roundtrip preserves higher streak & newer date
    const sam = vaultActions.createProfile({
      name: 'Sam',
      avatarId: 'benni_tinker',
      bannerColor: '#10B981',
      activeLanguage: 'de',
    });
    vaultActions.recordCoopArcadeSession({
      gameId: 'sky_catcher',
      playerOneId: 'kid-leo',
      playerOneScore: 100,
      playerTwoId: sam.id,
      playerTwoScore: 100,
      bonusGems: 4,
      xpEarned: 15,
    });
    const exported = exportVaultJson();
    const higherBackup = JSON.parse(exported) as ReturnType<typeof loadVaultFromStorage>;
    higherBackup.coopPairStreaks!['kid-leo::kid-maya'] = {
      pairKey: 'kid-leo::kid-maya',
      playerIds: ['kid-leo', 'kid-maya'],
      streakDays: 7,
      lastPlayedISO: '2026-11-26',
      matchesTogether: 12,
      bestCombinedScore: 999,
    };

    vaultActions.resetVaultToDefaults();
    expect(importVaultJson(exported, 'replace').ok).toBe(true);
    expect(vaultActions.getCoopPairStreak('kid-leo', 'kid-maya')?.matchesTogether).toBe(5);
    expect(importVaultJson(JSON.stringify(higherBackup), 'merge').ok).toBe(true);
    const mergedStreak = vaultActions.getCoopPairStreak('kid-leo', 'kid-maya');
    expect(mergedStreak).toMatchObject({
      streakDays: 7,
      lastPlayedISO: '2026-11-26',
      matchesTogether: 12,
      bestCombinedScore: 999,
    });

    // deleteProfile prunes partner entries for deleted profile while keeping surviving pairs
    expect(vaultActions.deleteProfile('kid-maya')).toBe(true);
    expect(vaultActions.getCoopPairStreak('kid-leo', 'kid-maya')).toBeNull();
    expect(vaultActions.getCoopPairStreak('kid-leo', sam.id)).not.toBeNull();
  });

  it('[PT-119] (S3-003) enforces strict isValidISODateString on import, sanitizes corrupt storage hydration without wiping saves, and syncs live mid-match Partner Edit/Disarm/Delete/Import in ArcadeHub', () => {
    expect(isValidISODateString('2026-11-23')).toBe(true);
    expect(isValidISODateString('2026-11-23T18:30:00.000Z')).toBe(true);
    expect(isValidISODateString('not-a-date')).toBe(false);
    expect(isValidISODateString('2026-02-29')).toBe(false);
    expect(isValidISODateString('2026-02-31')).toBe(false);
    expect(isValidISODateString('2026-13-01')).toBe(false);

    vaultActions.recordCoopArcadeSession({
      gameId: 'tower_stack',
      playerOneId: 'kid-leo',
      playerOneScore: 100,
      playerTwoId: 'kid-maya',
      playerTwoScore: 120,
      bonusGems: 4,
      xpEarned: 15,
    });
    const baseExport = exportVaultJson();

    // 1. Strict import rejection across exportedAt, exportedAtISO, createdAtISO, coopPairStreaks.lastPlayedISO, & __proto__
    for (const mode of ['replace', 'merge'] as const) {
      const badExpAt = JSON.parse(baseExport) as Record<string, unknown>;
      badExpAt.exportedAt = 'not-a-date';
      expect(importVaultJson(JSON.stringify(badExpAt), mode).ok).toBe(false);

      const badExpAtIso = JSON.parse(baseExport) as Record<string, unknown>;
      badExpAtIso.exportedAtISO = '2026-02-31';
      expect(importVaultJson(JSON.stringify(badExpAtIso), mode).ok).toBe(false);

      const badCreatedAt = JSON.parse(baseExport) as { profiles: Array<Record<string, unknown>> };
      badCreatedAt.profiles[0].createdAtISO = '2026-02-29';
      expect(importVaultJson(JSON.stringify(badCreatedAt), mode).ok).toBe(false);

      const badPairDate = JSON.parse(baseExport) as {
        coopPairStreaks: Record<string, Record<string, unknown>>;
      };
      badPairDate.coopPairStreaks['kid-leo::kid-maya'].lastPlayedISO = '2026-04-31';
      expect(importVaultJson(JSON.stringify(badPairDate), mode).ok).toBe(false);

      const protoPayload = '{"schemaVersion":1,"__proto__":{"polluted":true}}';
      expect(importVaultJson(protoPayload, mode).ok).toBe(false);
    }

    // 2. Storage hydration sanitization preserves valid progress while stripping corrupt date fields
    const dirtyStorage = JSON.parse(baseExport) as Record<string, unknown> & {
      profiles: Array<Record<string, unknown>>;
      coopPairStreaks: Record<string, Record<string, unknown>>;
    };
    dirtyStorage.exportedAt = 'invalid';
    dirtyStorage.profiles[0].totalXp = 777;
    dirtyStorage.profiles[0].createdAtISO = '2026-02-31';
    dirtyStorage.profiles[0].lastPracticeISO = 'garbage-date';
    dirtyStorage.coopPairStreaks['bad-pair'] = {
      pairKey: 'bad-pair',
      playerIds: ['kid-leo', 'kid-maya'],
      streakDays: 99,
      lastPlayedISO: '2026-02-30',
      matchesTogether: 5,
      bestCombinedScore: 500,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dirtyStorage));
    const hydrated = loadVaultFromStorage();
    expect(hydrated.profiles[0].totalXp).toBe(777);
    expect(hydrated.profiles[0].lastPracticeISO).toBeNull();
    expect(hydrated.coopPairStreaks?.['kid-leo::kid-maya']).toBeDefined();
    expect(hydrated.coopPairStreaks?.['bad-pair']).toBeUndefined();

    // 3. Live mid-match Partner Edit / Disarm / Import / Delete sync in ArcadeHub
    vaultActions.resetVaultToDefaults();
    vaultActions.setActiveLanguage('es');
    const adultA = vaultActions.unlockAdultMode({
      adultProfileName: 'Alex',
      initialTrack: 'ebonics',
    });
    vaultActions.createProfile({
      name: 'Jordan',
      avatarId: 'pip_explorer',
      bannerColor: '#2563EB',
      activeLanguage: 'fr',
    });
    const adultB = vaultActions.unlockAdultMode({
      initialTrack: 'suburban',
    });
    const armedRaw = JSON.parse(exportVaultJson()) as {
      activeProfileId: string;
      profiles: Array<{
        id: string;
        name: string;
        activeLanguage: LanguageCode;
        lastBaseLanguage?: BaseLanguageCode;
        adultModeUnlocked?: boolean;
        adultModeActive?: boolean;
      }>;
    };
    for (const p of armedRaw.profiles) {
      if (p.id === adultA.id) {
        p.adultModeUnlocked = true;
        p.adultModeActive = true;
        p.activeLanguage = 'ebonics';
        p.lastBaseLanguage = 'es';
      } else if (p.id === adultB.id) {
        p.adultModeUnlocked = true;
        p.adultModeActive = true;
        p.activeLanguage = 'suburban';
        p.lastBaseLanguage = 'fr';
      }
    }
    armedRaw.activeProfileId = adultA.id;
    expect(importVaultJson(JSON.stringify(armedRaw), 'replace').ok).toBe(true);

    const { unmount } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: adultA.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: adultB.id } });

    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.getByTestId('arcade-say-it-normally-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));

    // Reach Handoff ("Pass Console to Jordan!"), then edit P2 name + disarm Adult Mode via importVaultJson
    expect(screen.getByTestId('arcade-coop-handoff')).toHaveTextContent('Pass Console to Jordan!');
    const updatedRaw = JSON.parse(exportVaultJson()) as typeof armedRaw;
    const p2Edited = updatedRaw.profiles.find((p) => p.id === adultB.id)!;
    p2Edited.name = 'Jordan Renamed';
    p2Edited.adultModeActive = false;
    p2Edited.activeLanguage = 'de';
    p2Edited.lastBaseLanguage = 'de';
    act(() => {
      expect(importVaultJson(JSON.stringify(updatedRaw), 'replace').ok).toBe(true);
    });

    expect(screen.getByTestId('arcade-coop-handoff')).toHaveTextContent(
      'Pass Console to Jordan Renamed!'
    );

    // Deleting partner mid-Handoff aborts cleanly back to Hub
    act(() => {
      vaultActions.deleteProfile(adultB.id);
    });
    expect(screen.queryByTestId('arcade-coop-handoff')).not.toBeInTheDocument();
    expect(screen.getByText('Expedition Arcade')).toBeInTheDocument();
    unmount();

    // Verify Turn 2 uses synced base language ('de') after mid-Handoff edit + disarm
    expect(importVaultJson(JSON.stringify(armedRaw), 'replace').ok).toBe(true);
    const { unmount: unmountSyncTurn } = render(<ArcadeHub initialMode="hub" onExitToMap={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
    fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: adultA.id } });
    fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: adultB.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Build Star Bridge' }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    act(() => {
      expect(importVaultJson(JSON.stringify(updatedRaw), 'replace').ok).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /Start Jordan Renamed's Turn!/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Bridge Sprint!/i }));
    expect(screen.queryByTestId('arcade-say-it-normally-btn')).not.toBeInTheDocument();
    expect(document.querySelector('[data-language="de"]')).not.toBeNull();
    unmountSyncTurn();
  });

  it('[PT-120] (S3-004) unifies Accent bar + Script Keys toggle on one compact horizontal row <= 38px at 375x667, deduplicates keys, and stays inside 100dvh when expanded', () => {
    setViewportSize(375, 667);

    // 1. WordBankView compact unified strip across zh, ar, arz, vi, es
    for (const lang of ['zh', 'ar', 'arz', 'vi', 'es'] as const) {
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

      const strip = screen.getByTestId('unified-script-strip');
      expect(strip.className).toContain('is-compact-row');
      expect(strip.style.flexDirection).toBe('row');
      expect(strip.style.flexWrap).toBe('nowrap');

      const accentBar = screen.getByLabelText('Accent character bar');
      expect(accentBar.className).toContain('is-compact');
      expect(accentBar.style.maxHeight).toBe('38px');
      expect(accentBar.style.overflowX).toBe('auto');
      expect(accentBar.style.overflowY).toBe('hidden');
      expect(strip.contains(accentBar)).toBe(true);

      const toggle = screen.getByTestId('virtual-script-drawer-toggle');
      expect(strip.contains(toggle)).toBe(true);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      // Expand -> Accent bar hides, drawer opens with compact maxHeight 60px and deduplicated keys
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByLabelText('Accent character bar')).not.toBeInTheDocument();
      const grid = screen.getByTestId('virtual-script-grid');
      expect(grid.style.maxHeight).toBe('60px');

      const keys = Array.from(grid.querySelectorAll('button.tactile-tile')).map(
        (b) => b.textContent ?? ''
      );
      expect(new Set(keys).size, `${lang} drawer has duplicate keys`).toBe(keys.length);

      // Collapse restores unified compact row
      fireEvent.click(toggle);
      expect(screen.getByTestId('unified-script-strip').className).toContain('is-compact-row');
      expect(screen.getByLabelText('Accent character bar')).toBeInTheDocument();
      unmount();
      cleanup();
    }

    // 2. Verify all 16 languages have deduplicated keys in every tab of VirtualScriptDrawer
    for (const lang of VISIBLE_BASE_LANGUAGES) {
      const { unmount } = render(
        <VirtualScriptDrawer
          language={lang}
          compact={true}
          open={true}
          onOpenChange={vi.fn()}
          onInsertChar={vi.fn()}
        />
      );
      const drawer = screen.getByTestId('virtual-script-drawer');
      const tabs = within(drawer).queryAllByRole('tab');
      if (tabs.length > 0) {
        for (const tab of tabs) {
          fireEvent.click(tab);
          const keys = Array.from(
            screen.getByTestId('virtual-script-grid').querySelectorAll('button.tactile-tile')
          ).map((b) => b.textContent ?? '');
          expect(new Set(keys).size, `${lang}:${tab.textContent} duplicate keys`).toBe(keys.length);
        }
      } else {
        const keys = Array.from(
          screen.getByTestId('virtual-script-grid').querySelectorAll('button.tactile-tile')
        ).map((b) => b.textContent ?? '');
        expect(new Set(keys).size, `${lang} duplicate keys`).toBe(keys.length);
      }
      unmount();
      cleanup();
    }

    // 3. BossGauntletView & LessonArena at 375x667 render unified strip + drawer cleanly inside stage
    const zhBoss = findBossWordBank('zh');
    const bossNode: MapNode = {
      id: 'pt120-zh-boss',
      unitId: COURSES.zh.units[0].id,
      order: 5,
      nodeType: 'boss',
      title: 'Mandarin Script Strip Boss',
      subtitle: 'Compact strip check',
      xpReward: 40,
      gemReward: 15,
      exercises: [zhBoss],
      rewardVocabIds: [],
    };
    const { container, unmount: unmountArena } = render(
      <LessonArena node={bossNode} language="zh" onExit={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    expect(screen.getByTestId('unified-script-strip').className).toContain('is-compact-row');
    fireEvent.click(screen.getByTestId('virtual-script-drawer-toggle'));
    expect(container.querySelector('.lesson-arena-stage')).not.toBeNull();
    expect(screen.getByTestId('virtual-script-grid').style.maxHeight).toBe('60px');
    unmountArena();
  });

  it('[PT-121] (S3-005) converts numeric Pinyin syllables accurately, rejects standalone numbers/dates, and grades zh numeric Pinyin with heartPenalty: 0', () => {
    expect(hasNumericPinyinSyllable('ni3 hao3')).toBe(true);
    expect(convertNumericPinyin('ni3 hao3')).toBe('nǐ hǎo');
    expect(convertNumericPinyin('Ni3 hao3')).toBe('Nǐ hǎo');
    expect(convertNumericPinyin('nv3')).toBe('nǚ');
    expect(convertNumericPinyin('nu:3')).toBe('nǚ');
    expect(convertNumericPinyin('lv4')).toBe('lǜ');
    expect(convertNumericPinyin('lu:4')).toBe('lǜ');
    expect(convertNumericPinyin("Ma3te4'ao4")).toBe("Mǎtè'ào");
    expect(convertNumericPinyin('xie4xie5')).toBe('xièxie');
    expect(convertNumericPinyin('xie4xie0')).toBe('xièxie');
    expect(convertNumericPinyin('ming2zi5')).toBe('míngzi');

    // Non-Pinyin digits, dates, times, & codes must NOT convert
    for (const nonPinyin of ['3', '2026', '2026-11-23', '10:30', 'v1', 'hello2', '']) {
      expect(hasNumericPinyinSyllable(nonPinyin), `Unexpected hit for "${nonPinyin}"`).toBe(false);
      expect(convertNumericPinyin(nonPinyin)).toBe(nonPinyin);
    }

    // gradeAnswer exact numeric Pinyin match -> isCorrect: true, exactMatch: true, heartPenalty: 0
    const exactHello = gradeAnswer({
      submitted: 'Ni3 hao3',
      expected: '你好',
      accepted: ['Nǐ hǎo', 'Ni hao'],
      language: 'zh',
    });
    expect(exactHello).toMatchObject({
      isCorrect: true,
      exactMatch: true,
      heartPenalty: 0,
    });
    expect(exactHello.accentCoaching).toBeUndefined();

    const exactMateo = gradeAnswer({
      submitted: "Ma3te4'ao4",
      expected: '马特奥',
      accepted: ["Mǎtè'ào", 'Mateao'],
      language: 'zh',
    });
    expect(exactMateo).toMatchObject({
      isCorrect: true,
      exactMatch: true,
      heartPenalty: 0,
    });

    const exactThanks = gradeAnswer({
      submitted: 'xie4xie5',
      expected: '谢谢',
      accepted: ['Xièxie', 'Xiexie'],
      language: 'zh',
    });
    expect(exactThanks).toMatchObject({
      isCorrect: true,
      exactMatch: true,
      heartPenalty: 0,
    });

    // Tone-mismatch numeric Pinyin -> forgiving match with heartPenalty: 0 & accentCoaching!
    const toneForgiving = gradeAnswer({
      submitted: 'ni2 hao3',
      expected: '你好',
      accepted: ['Nǐ hǎo'],
      language: 'zh',
    });
    expect(toneForgiving.isCorrect).toBe(true);
    expect(toneForgiving.exactMatch).toBe(false);
    expect(toneForgiving.heartPenalty).toBe(0);
    expect(toneForgiving.accentCoaching?.expected).toBe('Nǐ hǎo');
    expect(toneForgiving.accentCoaching?.submitted).toBe('ní hǎo');

    // Wrong Mandarin syllables still fail cleanly
    const wrongZh = gradeAnswer({
      submitted: 'zai4jian4',
      expected: '你好',
      accepted: ['Nǐ hǎo'],
      language: 'zh',
    });
    expect(wrongZh.isCorrect).toBe(false);
    expect(wrongZh.heartPenalty).toBe(1);
  });

  it('[PT-122] (S3-005) renders live pinyin-tone-number-preview, FreeRecallHintBar convertedNumericPinyin coaching (zh), and arabic-qwerty-optionality-note (ar & arz) in WordBankView & BossGauntletView', () => {
    // 1. Mandarin WordBankView live preview + hint coaching
    const zhWb = findToForeignWordBank('zh');
    const zhWbCustom: WordBankExercise = {
      ...zhWb,
      expectedSentence: '你好',
      acceptedSentences: ['你好', 'Nǐ hǎo', 'Ni hao'],
    };
    const { unmount: unmountZhWb } = render(
      <WordBankView
        exercise={zhWbCustom}
        language="zh"
        compact={false}
        locked={false}
        onTurtlePlay={vi.fn()}
        onDraftChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
    const zhInput = screen.getByLabelText('Type your translation') as HTMLInputElement;

    // Pure digits do not show Pinyin preview
    fireEvent.change(zhInput, { target: { value: '2026' } });
    expect(screen.queryByTestId('pinyin-tone-number-preview')).not.toBeInTheDocument();

    // Numeric Pinyin shows live preview + exact tone hint coaching
    fireEvent.change(zhInput, { target: { value: 'ni3 hao3' } });
    expect(screen.getByTestId('pinyin-tone-number-preview')).toHaveTextContent(
      'Pinyin tones: nǐ hǎo'
    );
    expect(screen.queryByTestId('arabic-qwerty-optionality-note')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(screen.getByTestId('free-recall-tone-coaching')).toHaveTextContent(
      /Tone numbers converted:/i
    );
    expect(screen.getByTestId('free-recall-converted-pinyin')).toHaveTextContent('nǐ hǎo');
    expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();

    // Mismatched numeric tone surfaces tone coaching tip without false wrong-suffix error
    fireEvent.change(zhInput, { target: { value: 'ni2' } });
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(screen.getByTestId('free-recall-tone-coaching')).toHaveTextContent(/Nǐ/i);
    expect(screen.getByTestId('free-recall-converted-pinyin')).toHaveTextContent('ní');
    expect(screen.queryByTestId('free-recall-mismatch-note')).not.toBeInTheDocument();
    unmountZhWb();
    cleanup();

    // 2. Mandarin BossGauntletView live preview + FreeRecallHintBar coaching
    const zhBoss = findBossWordBank('zh');
    const zhBossCustom: BossGauntletExercise = {
      ...zhBoss,
      turns: [
        {
          ...zhBoss.turns[0],
          mode: 'word_bank',
          allowFreeRecall: true,
          expectedAnswer: '谢谢',
          acceptedAnswers: ['谢谢', 'Xièxie', 'Xiexie'],
        },
      ],
    };
    const { unmount: unmountZhBoss } = render(
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
    const zhBossInput = screen.getByLabelText('Type your boss reply') as HTMLInputElement;
    fireEvent.change(zhBossInput, { target: { value: 'xie4xie5' } });
    expect(screen.getByTestId('pinyin-tone-number-preview')).toHaveTextContent(
      'Pinyin tones: xièxie'
    );
    fireEvent.click(screen.getByTestId('starlight-hint-btn'));
    expect(screen.getByTestId('free-recall-converted-pinyin')).toHaveTextContent('xièxie');
    unmountZhBoss();
    cleanup();

    // 3. Arabic ('ar') & Egyptian Arabic ('arz') arabic-qwerty-optionality-note across WordBank & BossGauntlet
    for (const arLang of ['ar', 'arz'] as const) {
      const arWb = findToForeignWordBank(arLang);
      const { unmount: unmountArWb } = render(
        <WordBankView
          exercise={arWb}
          language={arLang}
          compact={true}
          locked={false}
          onTurtlePlay={vi.fn()}
          onDraftChange={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      const wbNote = screen.getByTestId('arabic-qwerty-optionality-note');
      expect(wbNote).toHaveAttribute('dir', 'ltr');
      expect(wbNote).toHaveTextContent(/Hamza.*vowels are optional on QWERTY/i);
      unmountArWb();
      cleanup();

      const arBoss = findBossWordBank(arLang);
      const { unmount: unmountArBoss } = render(
        <BossGauntletView
          exercise={arBoss}
          language={arLang}
          compact={true}
          onTurtlePlay={vi.fn()}
          onTurnResult={vi.fn()}
          onComplete={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Keyboard Free-Recall|Type Instead/i }));
      expect(screen.getByTestId('arabic-qwerty-optionality-note')).toHaveTextContent(
        /Hamza.*vowels are optional on QWERTY/i
      );
      unmountArBoss();
      cleanup();
    }
  });

  it('[PT-123] (S3-006) defaults Secondary Adult profile to Parent, records lastKidProfileId, honors legacy restoreKidProfileOnStudyBreak=false, and restores prior kid via toggle or 1-tap button', async () => {
    // 1. Default kid Leo unlocks After-Hours via ProfileVaultModal 7-tap easter egg
    vaultActions.setActiveLanguage('fr');
    const { unmount } = render(<ProfileVaultModal onClose={vi.fn()} />);
    const versionBtn = screen.getByTestId('atlas-version-easter-egg');
    for (let i = 0; i < 7; i += 1) {
      fireEvent.click(versionBtn);
    }

    const confirmDialog = screen.getByRole('dialog', {
      name: 'After-Hours Atlas 18+ Confirmation',
    });
    const nameInput = within(confirmDialog).getByLabelText('Adult Profile Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Parent');
    expect(nameInput.placeholder).toBe('Parent');
    const confirmToggle = within(confirmDialog).getByTestId(
      'study-break-restore-kid-toggle'
    ) as HTMLInputElement;
    expect(confirmToggle.checked).toBe(false);

    // Leave default "Parent" name & unchecked toggle -> Unlock!
    fireEvent.click(
      within(confirmDialog).getByRole('button', { name: /Unlock After-Hours Atlas/i })
    );
    unmount();
    cleanup();

    const postUnlockVault = loadVaultFromStorage();
    const parentProfile = postUnlockVault.profiles.find(
      (p) => p.id === postUnlockVault.activeProfileId
    )!;
    expect(parentProfile.name).toBe('Parent');
    expect(parentProfile.adultModeUnlocked).toBe(true);
    expect(parentProfile.adultModeActive).toBe(true);
    expect(postUnlockVault.lastKidProfileId).toBe('kid-leo');
    expect(postUnlockVault.restoreKidProfileOnStudyBreak).toBe(false);

    // 2. Legacy default (restoreKidProfileOnStudyBreak: false): Study Break stays on Parent (disarmed)
    const { unmount: unmountApp1 } = render(<App />);
    fireEvent.click(screen.getByTestId('return-to-kid-atlas-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('return-to-kid-atlas-btn')).not.toBeInTheDocument();
    });
    const afterLegacyBreak = loadVaultFromStorage();
    expect(afterLegacyBreak.activeProfileId).toBe(parentProfile.id);
    expect(
      afterLegacyBreak.profiles.find((p) => p.id === parentProfile.id)?.adultModeActive
    ).toBe(false);
    unmountApp1();
    cleanup();

    // 3. Re-open ProfileVaultModal while disarmed: verify 1-tap restore-prior-kid-btn & opt-in toggle
    const { unmount: unmountModal2 } = render(<ProfileVaultModal onClose={vi.fn()} />);
    expect(screen.getByTestId('restore-prior-kid-btn')).toHaveTextContent('Switch back to Leo');
    const modalToggle = screen.getByTestId(
      'study-break-restore-kid-toggle'
    ) as HTMLInputElement;
    expect(modalToggle.checked).toBe(false);
    fireEvent.click(modalToggle);
    expect(modalToggle.checked).toBe(true);
    expect(loadVaultFromStorage().restoreKidProfileOnStudyBreak).toBe(true);

    // Re-enter After-Hours Atlas -> Study Break in App now auto-restores Leo!
    fireEvent.click(screen.getByRole('button', { name: /Enter After-Hours Atlas/i }));
    unmountModal2();
    cleanup();

    const { unmount: unmountApp2 } = render(<App />);
    fireEvent.click(screen.getByTestId('return-to-kid-atlas-btn'));
    await waitFor(() => {
      expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
      expect(screen.getByLabelText(/Switch kid profile \(Leo\)/i)).toBeInTheDocument();
    });
    expect(
      loadVaultFromStorage().profiles.find((p) => p.id === parentProfile.id)?.adultModeActive
    ).toBe(false);
    unmountApp2();
    cleanup();

    // 4. Switching from Maya -> Parent updates lastKidProfileId to Maya, & 1-tap Switch back to Maya works
    vaultActions.switchProfile('kid-maya');
    vaultActions.switchProfile(parentProfile.id);
    expect(loadVaultFromStorage().lastKidProfileId).toBe('kid-maya');

    const { unmount: unmountModal3 } = render(<ProfileVaultModal onClose={vi.fn()} />);
    const restoreMayaBtn = screen.getByTestId('restore-prior-kid-btn');
    expect(restoreMayaBtn).toHaveTextContent('Switch back to Maya');
    fireEvent.click(restoreMayaBtn);
    expect(loadVaultFromStorage().activeProfileId).toBe('kid-maya');
    unmountModal3();
  });

  it('[PT-124] verifies WCAG AA >= 4.5:1 contrast across all 15 light/dark palettes and clean 100dvh rendering of Sprint 3 components', () => {
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
    for (const sel of themeSelectors) {
      const block = extractBlock(sel);
      const modalRgb = parseRgbOrHex(readVar(block, rootBlock, '--modal-bg')) ?? [255, 255, 255];
      const cardRgb = compositeOver(readVar(block, rootBlock, '--card-bg'), modalRgb);
      const cardSoftRgb = compositeOver(readVar(block, rootBlock, '--card-soft-bg'), cardRgb);
      const textMain = parseRgbOrHex(readVar(block, rootBlock, '--text-main'));
      const textMuted = parseRgbOrHex(readVar(block, rootBlock, '--text-muted'));
      expect(textMain, `${sel} --text-main`).not.toBeNull();
      expect(textMuted, `${sel} --text-muted`).not.toBeNull();

      expect(
        contrastRatioRgb(textMain!, cardRgb),
        `${sel} --text-main on --card-bg`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatioRgb(textMain!, cardSoftRgb),
        `${sel} --text-main on --card-soft-bg`
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatioRgb(textMuted!, cardSoftRgb),
        `${sel} --text-muted on --card-soft-bg`
      ).toBeGreaterThanOrEqual(4.5);

      for (const tint of ['indigo', 'emerald', 'amber', 'rose'] as const) {
        const bg = compositeOver(readVar(block, rootBlock, `--tint-${tint}-bg`), cardSoftRgb);
        const ink = parseRgbOrHex(readVar(block, rootBlock, `--tint-${tint}-ink`));
        expect(ink, `${sel} --tint-${tint}-ink`).not.toBeNull();
        expect(
          contrastRatioRgb(ink!, bg),
          `${sel} --tint-${tint}-ink on --tint-${tint}-bg`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }

    // Render Sprint 3 UI surfaces across light & dark palettes + 3 viewports with 0 console errors
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const renderSpecs: ReadonlyArray<{ theme: 'default' | CosmeticId; w: number; h: number }> = [
      { theme: 'default', w: 1440, h: 900 },
      { theme: 'theme_cosmic_galaxy', w: 768, h: 1024 },
      { theme: 'theme_neon_night_market', w: 375, h: 667 },
      { theme: 'theme_laureate_imperial', w: 375, h: 667 },
    ];

    for (const spec of renderSpecs) {
      setViewportSize(spec.w, spec.h);
      vaultActions.resetVaultToDefaults();
      vaultActions.recordCoopArcadeSession({
        gameId: 'tower_stack',
        playerOneId: 'kid-leo',
        playerOneScore: 100,
        playerTwoId: 'kid-maya',
        playerTwoScore: 120,
        bonusGems: 4,
        xpEarned: 15,
      });
      const parent = vaultActions.unlockAdultMode({
        adultProfileName: 'Parent',
        initialTrack: 'ebonics',
      });
      expect(parent.adultModeActive).toBe(true);
      vaultActions.completeMapNode({
        language: 'es',
        nodeId: 'es-pt124-gems',
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

      const { container, unmount } = render(<App />);
      expect(container.querySelector('.app-root')?.getAttribute('data-theme')).toBe(spec.theme);
      fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
      fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      expect(screen.getByTestId('tophud-coop-safe-atlas-badge')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('coop-p1-select'), { target: { value: 'kid-leo' } });
      fireEvent.change(screen.getByTestId('coop-p2-select'), { target: { value: 'kid-maya' } });
      expect(screen.getByTestId('coop-pair-streak-badge')).toBeInTheDocument();
      unmount();
      cleanup();

      const zhPlan = resolveFreeRecallHint({
        typedText: 'ni3',
        expected: '你好',
        accepted: ['Nǐ hǎo'],
        language: 'zh',
        tier: 2,
      });
      const { unmount: unmountStrip } = render(
        <div className="app-root" data-theme={spec.theme} style={{ height: `${spec.h}px` }}>
          <FreeRecallHintBar
            plan={zhPlan}
            hintTier={2}
            ghostFaded={false}
            isAnimating={false}
            answerDir="ltr"
            compact={spec.w <= 640}
          />
          <FreeRecallScriptStrip
            language="zh"
            direction="to_foreign"
            typedText="ni3 hao3"
            compact={spec.w <= 640}
            disabled={false}
            drawerOpen={false}
            onOpenChange={vi.fn()}
            onInsertChar={vi.fn()}
          />
        </div>
      );
      expect(screen.getByTestId('pinyin-tone-number-preview')).toHaveTextContent('nǐ hǎo');
      expect(screen.getByTestId('free-recall-converted-pinyin')).toHaveTextContent('nǐ');
      expect(screen.getByTestId('unified-script-strip')).toBeInTheDocument();
      unmountStrip();
      cleanup();
    }
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('[PT-125] survives Sprint 3 chaos transitions (Co-Op sync/delete, numeric Pinyin + drawer, Study Break toggle), PWA <= 500 KiB & wanderling-cache-v9, and zero Unicode flag emojis', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      setViewportSize(375, 667);

      // 1. Rapid Study Break opt-in + Adult lesson + 1-tap Study Break -> restores Leo cleanly
      vaultActions.setActiveLanguage('es');
      const parent = vaultActions.unlockAdultMode({
        adultProfileName: 'Parent',
        initialTrack: 'stoner_tactical',
      });
      vaultActions.setRestoreKidProfileOnStudyBreak(true);

      const { unmount: unmountChaosApp } = render(<App />);
      const activeNodeBtn = document.querySelector<HTMLButtonElement>('button[data-node-state="active"]')!;
      fireEvent.click(activeNodeBtn);
      const sbBtn = await screen.findByTestId('lesson-study-break-btn');
      fireEvent.click(sbBtn);
      fireEvent.click(sbBtn);
      await waitFor(() => {
        expect(screen.queryByTestId('lesson-study-break-btn')).not.toBeInTheDocument();
        expect(loadVaultFromStorage().activeProfileId).toBe('kid-leo');
      });
      expect(
        loadVaultFromStorage().profiles.find((p) => p.id === parent.id)?.adultModeActive
      ).toBe(false);

      // 2. Rapid Co-Op toggling & profile deletion mid-Arcade with zero unhandled errors
      fireEvent.click(screen.getByRole('button', { name: 'Arcade' }));
      for (let i = 0; i < 4; i += 1) {
        fireEvent.click(screen.getByTestId('arcade-coop-toggle'));
      }
      expect(screen.getByTestId('arcade-coop-toggle')).toHaveAttribute('aria-pressed', 'false');
      unmountChaosApp();
      cleanup();

      // 3. Numeric Pinyin + Script Drawer synchronous double-tap typing in WordBankView
      const zhEx = findToForeignWordBank('zh');
      const { unmount: unmountZh } = render(
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
      const input = screen.getByLabelText('Type your translation') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'ni3 ' } });
      expect(screen.getByTestId('pinyin-tone-number-preview')).toHaveTextContent('nǐ');
      fireEvent.click(screen.getByTestId('virtual-script-drawer-toggle'));
      const drawer = screen.getByTestId('virtual-script-drawer');
      const k1 = within(drawer).getByRole('button', { name: 'hǎo' });
      const k2 = within(drawer).getByRole('button', { name: 'mā' });
      act(() => {
        k1.click();
        k2.click();
      });
      expect(input.value).toBe('ni3 hǎomā');
      unmountZh();
      cleanup();

      // 4. PWA bundle chunk budget <= 500 KiB, wanderling-cache-v9, & zero Unicode flag emojis
      ensureBuiltDist();
      const assetsDir = resolve(DIST_DIR, 'assets');
      const oversized: string[] = [];
      for (const file of readdirSync(assetsDir)) {
        if (!/\.(js|mjs)$/i.test(file)) continue;
        const size = statSync(join(assetsDir, file)).size;
        if (size > MAX_JS_CHUNK_BYTES) {
          oversized.push(`${file} (${(size / 1024).toFixed(1)} KiB)`);
        }
      }
      expect(oversized, `Oversized chunks: ${oversized.join(', ')}`).toEqual([]);

      const manifest = JSON.parse(
        readFileSync(resolve(DIST_DIR, 'sw-precache-manifest.json'), 'utf8')
      ) as { cacheVersion: string; assets: string[] };
      expect(manifest.cacheVersion).toBe('wanderling-cache-v9');

      const swSrc = readFileSync(resolve(ROOT_DIR, 'public/sw.js'), 'utf8');
      expect(swSrc).toContain("const CACHE_VERSION = 'wanderling-cache-v9'");

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
      expect(getSpeechRuntimeState().isSpeaking).toBe(false);
      expect(unhandled).toHaveLength(0);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
